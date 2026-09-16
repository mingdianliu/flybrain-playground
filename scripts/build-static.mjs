import './build-english.mjs';
import {cpSync,existsSync,mkdirSync,readFileSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
const source='work/full';
if(!existsSync(join(source,'manifest.json')))throw Error('Model missing. Run python scripts/prepare-data.py or install a prepared model ZIP first.');
const manifest=JSON.parse(readFileSync(join(source,'manifest.json')));
const specs=[manifest.nodes,manifest.offsets,...manifest.parts.flatMap(p=>[p.targets,p.weights])];
const names=new Set(['manifest.json']);
for(const spec of specs){const files=spec.files||[spec.file];const bytes=Buffer.concat(files.map(f=>{if(!/^[a-z0-9.-]+$/.test(f))throw Error('Invalid model filename');names.add(f);return readFileSync(join(source,f));}));if(bytes.length!==spec.bytes||createHash('sha256').update(bytes).digest('hex')!==spec.sha256)throw Error('Model file checksum mismatch: '+spec.file);}
rmSync('dist',{recursive:true,force:true});cpSync('web','dist',{recursive:true});mkdirSync('dist/full');
for(const name of names)cpSync(join(source,name),join('dist/full',name));
cpSync('LICENSE','dist/LICENSE.txt');cpSync('THIRD_PARTY_NOTICES.md','dist/THIRD_PARTY_NOTICES.md');
console.log(`Portable static build ready in dist/ (${names.size} model files). Run npm run preview.`);
