import test from 'node:test';
import assert from 'node:assert/strict';
import {loadTs} from './load-ts.mjs';
const {handleContact,issueContactToken,validContactToken,consumeContactLimit}=await import(await loadTs(new URL('../src/lib/server/contact.ts',import.meta.url)));
const {smtpConfiguration,smtpConfigurationIssues,encodeMail}=await import(await loadTs(new URL('../src/lib/server/smtp.ts',import.meta.url)));
const env={FILUMIRE_CONTACT_ENABLED:'true',FILUMIRE_SMTP_HOST:'smtp.zoho.com',FILUMIRE_SMTP_PORT:'465',FILUMIRE_SMTP_USER:'info@filumire.com',FILUMIRE_SMTP_PASSWORD:'unit-test-only-password',FILUMIRE_SMTP_FROM:'info@filumire.com',VERCEL:'1'};
const fields={name:'Ama',email:'ama@example.org',phone:'',organization:'',country:'Ghana',message:'Please explain the learning options.'};
function request(body,extra={}){const token=body.token||issueContactToken(env.FILUMIRE_SMTP_PASSWORD,Date.now()-3000);return new Request('https://filumire.com/api/contact',{method:'POST',headers:{origin:'https://filumire.com','content-type':'application/json',cookie:'filumire_contact='+token,'x-vercel-forwarded-for':fields.email,...extra},body:JSON.stringify({...body,token})});}
test('unconfigured messaging refuses delivery and reveals no credentials',async()=>{let called=false;const response=await handleContact(request({category:'general',fields,locale:'fr'}),{},async()=>{called=true;});assert.equal(response.status,503);assert.match((await response.json()).message,/Aucun message/);assert.equal(called,false);const setup=await handleContact(new Request('https://filumire.com/api/contact'),{});assert.equal(setup.status,503);assert.equal(setup.headers.get('set-cookie'),null);});
test('server rejects cross-origin requests, invalid categories, injection and oversize bodies',async()=>{for(const [body,headers,status] of [[{category:'general',fields},{origin:'https://other.example'},403],[{category:'toString',fields},{},400],[{category:'general',fields:{...fields,email:'a@example.org\nBcc: x@example.org'}},{},400],[{category:'general',fields:{...fields,message:'x'.repeat(20001)}},{},413]])assert.equal((await handleContact(request(body,headers),env,async()=>assert.fail('must not deliver'))).status,status);});
test('signed cookie token rejects missing, tampered, rapid and expired submissions',()=>{const secret='test';const now=Date.now();const token=issueContactToken(secret,now-3000);assert.ok(validContactToken(token,token,secret,now));assert.equal(validContactToken(token,token,'wrong',now),false);assert.equal(validContactToken(token,undefined,secret,now),false);const rapid=issueContactToken(secret,now);assert.equal(validContactToken(rapid,rapid,secret,now),false);assert.equal(validContactToken(token,token,secret,now+3600001),false);});
test('honeypot and absent verification token block transmission',async()=>{assert.equal((await handleContact(request({category:'general',fields,website:'spam'}),env,async()=>assert.fail())).status,403);assert.equal((await handleContact(request({category:'general',fields},{cookie:''}),env,async()=>assert.fail())).status,403);});
test('all enquiries route to info server-side in both languages',async()=>{let index=0;for(const locale of ['en','fr'])for(const [category,to] of [['general','info@filumire.com'],['learner-access','info@filumire.com'],['family','info@filumire.com'],['teacher','info@filumire.com'],['school-pilot','info@filumire.com'],['curriculum','info@filumire.com'],['partnership','info@filumire.com']]){const email='routing'+index+++'@example.org';let sent;const response=await handleContact(request({category,fields:{...fields,email},locale,to:'attacker@example.org'},{'x-vercel-forwarded-for':email}),env,async(_,mail)=>{sent=mail;});assert.equal(response.status,200);assert.equal(sent.to,to);assert.equal(sent.from,'info@filumire.com');assert.equal(sent.replyTo,email);const result=await response.json();assert.equal(result.accepted,true);assert.match(result.message,locale==='fr'?/accepté/:/accepted/);assert.match(result.message,locale==='fr'?/pas encore confirmés/:/not yet confirmed/);}});
test('transport failure never reports accepted or delivered',async()=>{const email='failure@example.org';const response=await handleContact(request({category:'general',fields:{...fields,email},locale:'fr'},{'x-vercel-forwarded-for':email}),env,async()=>{throw new Error('rejected');});assert.equal(response.status,502);assert.equal((await response.json()).accepted,undefined);});
test('submission limit resets after expiry and bounds repeated attempts',()=>{assert.ok(consumeContactLimit('limit-test',0));assert.ok(consumeContactLimit('limit-test',1));assert.ok(consumeContactLimit('limit-test',2));assert.equal(consumeContactLimit('limit-test',3),false);assert.ok(consumeContactLimit('limit-test',900001));});
test('SMTP requires approved Zoho TLS host and sender; MIME preserves French text',()=>{assert.ok(smtpConfiguration(env));for(const change of [{FILUMIRE_SMTP_HOST:'attacker.example'},{FILUMIRE_SMTP_PORT:'25'},{FILUMIRE_SMTP_FROM:'attacker@example.org'},{FILUMIRE_SMTP_PASSWORD:''},{FILUMIRE_CONTACT_ENABLED:'false'}])assert.equal(smtpConfiguration({...env,...change}),null);const body='Une question : fractions et décimales.';const message=encodeMail({from:'info@filumire.com',to:'hello@filumire.com',replyTo:'ama@example.org',subject:'Demande française',body});assert.ok(message.includes(Buffer.from('Demande française').toString('base64')));assert.ok(message.includes(Buffer.from(body).toString('base64')));assert.throws(()=>encodeMail({from:'info@filumire.com',to:'hello@filumire.com',replyTo:'a@example.org\r\nBcc: x@example.org',subject:'test',body}));});

test('Next.js loopback normalisation accepts the exact local host and port only',async()=>{const local=(origin,host)=>new Request('http://localhost:3147/api/contact',{method:'POST',headers:{origin,host,'content-type':'application/json'},body:JSON.stringify({category:'general',fields,locale:'fr'})});assert.equal((await handleContact(local('http://127.0.0.1:3147','127.0.0.1:3147'),{})).status,503);assert.equal((await handleContact(local('https://attacker.example','attacker.example'),{})).status,403);assert.equal((await handleContact(local('http://127.0.0.1:9999','127.0.0.1:9999'),{})).status,403);});

test('the simplified three-field payload validates in both languages and routes only to info',async()=>{for(const locale of ['en','fr']){const email='simple-'+locale+'@example.org';const simple={name:'Ama Mensah',email,message:'Une question sur les fractions.'};let sent;const response=await handleContact(request({fields:simple,locale,to:'attacker@example.org'},{'x-vercel-forwarded-for':email}),env,async(_,mail)=>{sent=mail;});assert.equal(response.status,200);assert.equal(sent.to,'info@filumire.com');assert.equal(sent.replyTo,email);assert.ok(sent.body.includes(simple.message));assert.ok(!sent.body.includes('Not provided'));for(const [field,value] of [['name',''],['email','invalid'],['message','short']]){const invalid=await handleContact(request({fields:{...simple,[field]:value},locale}),env,async()=>assert.fail('invalid fields must not send'));assert.equal(invalid.status,400);const result=await invalid.json();assert.equal(result.field,field);assert.match(result.message,locale==='fr'?/Indiquez|Rédigez/:/Please/);}}});

test('configuration diagnostics identify missing settings without exposing values',()=>{
  assert.equal(smtpConfigurationIssues({}).length,6);
  assert.deepEqual(smtpConfigurationIssues(env),[]);
  const wrong={...env,FILUMIRE_SMTP_HOST:'private-host-value',FILUMIRE_SMTP_PORT:'private-port-value',FILUMIRE_SMTP_FROM:'private-sender-value'};
  const issues=smtpConfigurationIssues(wrong).join(' ');
  for(const value of [wrong.FILUMIRE_SMTP_HOST,wrong.FILUMIRE_SMTP_PORT,wrong.FILUMIRE_SMTP_FROM,env.FILUMIRE_SMTP_PASSWORD,env.FILUMIRE_SMTP_USER])assert.ok(!issues.includes(value));
  for(const key of Object.keys(env).filter(key=>key.startsWith('FILUMIRE_'))){const incomplete={...env};delete incomplete[key];assert.ok(smtpConfigurationIssues(incomplete).some(issue=>issue.includes(key)));assert.equal(smtpConfiguration(incomplete),null);}
});
test('ready configuration supplies the signed cookie token but no SMTP credentials',async()=>{
  const response=await handleContact(new Request('https://filumire.com/api/contact'),env);
  assert.equal(response.status,200);const payload=await response.json();assert.equal(payload.available,true);
  assert.equal(typeof payload.token,'string');const cookie=response.headers.get('set-cookie');
  assert.ok(cookie.startsWith('filumire_contact='+payload.token+';'));
  for(const attribute of ['HttpOnly','SameSite=Strict','Secure','Path=/api/contact'])assert.ok(cookie.includes(attribute));
  assert.ok(validContactToken(payload.token,payload.token,env.FILUMIRE_SMTP_PASSWORD,Date.now()+3000));
  const serialized=JSON.stringify(payload);for(const value of [env.FILUMIRE_SMTP_PASSWORD,env.FILUMIRE_SMTP_USER,env.FILUMIRE_SMTP_HOST])assert.ok(!serialized.includes(value));
});
test('SMTP failure returns a clear error in both languages without a success flag',async()=>{
  for(const locale of ['en','fr']){const email='smtp-failure-'+locale+'@example.org';const response=await handleContact(request({fields:{...fields,email},locale},{'x-vercel-forwarded-for':email}),env,async()=>{throw new Error('private provider details');});
  assert.equal(response.status,502);const result=await response.json();assert.equal(result.accepted,undefined);
  assert.match(result.message,locale==='fr'?/Réessayez plus tard/:/Please try again later/);assert.ok(!JSON.stringify(result).includes('private provider details'));}
});
test('success is returned only after the SMTP transport confirms acceptance',async()=>{
  const email='await-smtp@example.org';let release;let entered;let completed=false;
  const transportEntered=new Promise(resolve=>{entered=resolve;});
  const gate=new Promise(resolve=>{release=resolve;});
  const pending=handleContact(request({fields:{...fields,email},locale:'en'},{'x-vercel-forwarded-for':email}),env,async(_,mail)=>{assert.equal(mail.to,'info@filumire.com');entered();await gate;}).then(response=>{completed=true;return response;});
  await transportEntered;assert.equal(completed,false);release();const response=await pending;
  assert.equal(response.status,200);const result=await response.json();assert.equal(result.accepted,true);assert.match(result.message,/Inbox receipt.*not yet confirmed/);
});

test('the exact Production variable names enable contact and preserve legacy sender compatibility',async()=>{
  const production={FILUMIRE_CONTACT_ENABLED:'true',FILUMIRE_SMTP_HOST:'smtppro.zoho.com',FILUMIRE_SMTP_PORT:'465',FILUMIRE_SMTP_USER:'info@filumire.com',FILUMIRE_SMTP_PASSWORD:env.FILUMIRE_SMTP_PASSWORD,FILUMIRE_CONTACT_FROM:'info@filumire.com',VERCEL:'1'};
  assert.deepEqual(smtpConfigurationIssues(production),[]);
  const config=smtpConfiguration(production);assert.equal(config.host,'smtppro.zoho.com');assert.equal(config.port,465);assert.equal(config.from,'info@filumire.com');
  assert.equal(smtpConfiguration({...production,FILUMIRE_SMTP_FROM:'schools@filumire.com'}).from,'info@filumire.com');
  for(const from of ['', 'attacker@example.org'])assert.equal(smtpConfiguration({...production,FILUMIRE_CONTACT_FROM:from,FILUMIRE_SMTP_FROM:'info@filumire.com'}),null);
  assert.equal(smtpConfiguration(env).from,'info@filumire.com');
  const ready=await handleContact(new Request('https://filumire.com/api/contact'),production);assert.equal(ready.status,200);assert.equal((await ready.json()).available,true);
  const email='production-variable-names@example.org';let sent;
  const response=await handleContact(request({fields:{name:'Ama',email,message:'Please explain the learning options.'},locale:'fr'},{'x-vercel-forwarded-for':email}),production,async(config,mail)=>{assert.equal(config.host,'smtppro.zoho.com');sent=mail;});
  assert.equal(response.status,200);assert.equal(sent.to,'info@filumire.com');assert.equal(sent.from,'info@filumire.com');assert.equal(sent.replyTo,email);
  const confirmation=await response.json();assert.equal(confirmation.accepted,true);assert.match(confirmation.message,/pas encore confirmés/);
});
