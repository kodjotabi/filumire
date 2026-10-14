import fs from 'node:fs';
const file='C:/Users/tabi/Desktop/filumire/FILUMIRE_WEBSITE/src/components/layout/Navbar.tsx';
const source=fs.readFileSync(file,'utf8');
const needle='{item.label}';if(!source.includes(needle))throw Error('Unexpected navigation source');
fs.writeFileSync(file,source.replace(needle,'{item.href === "/pricing" ? (french ? "S’abonner" : "Subscribe") : item.label}'));
console.log('Existing pricing navigation now explicitly labels the Subscribe entry in both languages.');
