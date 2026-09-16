// Generate a complete English view from the same model/UI source, keeping logic identical.
import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
const dictionary=JSON.parse(readFileSync('data/english.json','utf8'));
const escape=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const pattern=new RegExp(Object.keys(dictionary).sort((a,b)=>b.length-a.length).map(escape).join('|'),'g');
const translate=s=>s.replace(pattern,key=>dictionary[key]);
const modules=readdirSync('web').filter(f=>f.endsWith('.mjs')&&!f.endsWith('.en.mjs'));
function moduleLinks(s){for(const f of modules)s=s.replaceAll('./'+f,'./'+f.replace('.mjs','.en.mjs'));return s;}
for(const f of modules)writeFileSync('web/'+f.replace('.mjs','.en.mjs'),moduleLinks(translate(readFileSync('web/'+f,'utf8'))));
for(const [source,target] of [['index.html','en.html'],['lab.html','lab-en.html']]){
 let html=translate(readFileSync('web/'+source,'utf8')).replace('lang="zh-CN"','lang="en"');
 html=html.replaceAll('href="lab.html"','href="lab-en.html"').replaceAll('href="/"','href="en.html"').replaceAll('href="index.html"','href="en.html"').replaceAll('href="./"','href="en.html"');
 html=html.replace('href="en.html" class="language-switch"','href="index.html" class="language-switch"').replace('href="lab-en.html" class="language-switch"','href="lab.html" class="language-switch"').replace('>EN</a>','>中文</a>').replace('lang="en" aria-label="English version"','lang="zh-CN" aria-label="Chinese version"');
 for(const f of modules)html=html.replaceAll('src="'+f+'"','src="'+f.replace('.mjs','.en.mjs')+'"');
 writeFileSync('web/'+target,html);
}
console.log('Generated English room, stimulus lab and shared modules from canonical source.');
