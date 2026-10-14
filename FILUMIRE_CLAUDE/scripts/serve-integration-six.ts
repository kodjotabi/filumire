import next from 'next';
import {createServer} from 'node:http';
import {writeFile} from 'node:fs/promises';
import {fixture} from '../tests/login-filu-corrections.test';
const app=next({dev:false,dir:'apps/learner',hostname:'127.0.0.1',port:3201});
await app.prepare();
await writeFile('.vercel/integration-six-2026-10-13/fixture.json',JSON.stringify(fixture));
// No reset/idle endpoint: Home -> sidebar verification must use untouched history.
createServer(app.getRequestHandler()).listen(3201,'127.0.0.1',()=>console.log('Isolated learner ready'));
