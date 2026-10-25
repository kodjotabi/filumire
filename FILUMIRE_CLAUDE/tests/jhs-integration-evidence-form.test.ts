import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
Object.assign(globalThis,{React});
const {PerformanceEvidenceForm}=await import('../apps/learner/components/filumire/PerformanceEvidenceForm');
for(const language of ['en','fr'] as const){
 const html=renderToStaticMarkup(React.createElement(PerformanceEvidenceForm,{language,busy:false,requirements:{observation:true,originalWriting:true,artefact:true},onReview:async()=>{}}));
 assert.match(html,/<fieldset/);assert.match(html,/<legend>/);assert.match(html,/name="artefacts"[^>]*type="file"|type="file"[^>]*name="artefacts"/);
 assert.match(html,/type="datetime-local"/);assert.match(html,/minLength="24"|minlength="24"/i);
 assert.match(html,language==='fr'?/Les fichiers restent sur cet appareil/:/Files stay on this device/);
 assert.match(html,language==='fr'?/travail original/:/original work/);
 assert.match(html,/<option value="partial" selected="">/,'Partial is the safe default, not success');
 const labels=[...html.matchAll(/<label for="([^"]+)"/g)].map(m=>m[1]);assert(labels.length>=6);for(const id of labels)assert(html.includes(`id="${id}"`));
 const disabled=renderToStaticMarkup(React.createElement(PerformanceEvidenceForm,{language,busy:true,requirements:{observation:true,originalWriting:true,artefact:true},onReview:async()=>{}}));assert.match(disabled,/<fieldset disabled=""/);
}
console.log('PASS bilingual, labelled evidence form; local-only artefacts, partial default, accessible dates/notes and disabled submission.');
