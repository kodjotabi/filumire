import { readFile } from 'node:fs/promises';
import nextEnv from '@next/env';
import ts from 'typescript';

// Load the same local files as Next.js without printing their contents.
nextEnv.loadEnvConfig(process.cwd(), process.argv.includes('--development'));
const source = await readFile(new URL('../src/lib/server/smtp.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: {
  target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022,
} });
const { smtpConfigurationIssues } = await import('data:text/javascript;base64,' + Buffer.from(outputText).toString('base64'));
const issues = smtpConfigurationIssues(process.env);
console.log(JSON.stringify({
  recipient: 'info@filumire.com',
  configurationReady: issues.length === 0,
  issues,
  deliveryVerified: false,
  note: 'Configuration check only. No SMTP connection or email is sent.',
}, null, 2));
if (issues.length) process.exitCode = 1;
