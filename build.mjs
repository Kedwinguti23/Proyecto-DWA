import {build} from 'esbuild';
import {cpSync,rmSync,mkdirSync} from 'node:fs';
rmSync('dist',{recursive:true,force:true});mkdirSync('dist',{recursive:true});
await build({entryPoints:{'css/main':'css/main.css','js/main':'js/main.js'},outdir:'dist',bundle:true,minify:true,target:['es2020'],format:'esm',external:['*.woff2'],legalComments:'none'});
for(const f of ['index.html','data','assets','robots.txt','sitemap.xml','_headers'])cpSync(f,'dist/'+f,{recursive:true});
console.log('Build listo en dist/');
