import {build} from 'esbuild';
import {copyFile,mkdir,readFile,writeFile} from 'node:fs/promises';

const app = await build({entryPoints:['client/app.jsx'],bundle:true,write:false,minify:true,jsx:'automatic',jsxImportSource:'preact',format:'esm'});
const assets = {'/app.js':app.outputFiles[0].text};
for (const [route,file] of [['/','index.html'],['/mark.svg','mark.svg'],['/style.css','style.css']]) {
  assets[route] = await readFile('public/'+file,'utf8');
}
await mkdir('dist/server',{recursive:true});
await mkdir('dist/.openai/drizzle',{recursive:true});
await copyFile('.openai/hosting.json','dist/.openai/hosting.json');
await copyFile('migrations/0001_bookings.sql','dist/.openai/drizzle/0001_bookings.sql');
await writeFile('dist/server/assets.js','export default '+JSON.stringify(assets));
await build({entryPoints:['server/worker.js'],outfile:'dist/server/index.js',bundle:true,format:'esm',platform:'browser',minify:true});
await (await import('node:fs/promises')).unlink('dist/server/assets.js');
