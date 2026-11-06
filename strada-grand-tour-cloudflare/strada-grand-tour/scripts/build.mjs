import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
const types={html:'text/html; charset=utf-8',js:'text/javascript; charset=utf-8',css:'text/css; charset=utf-8',svg:'image/svg+xml',webmanifest:'application/manifest+json'};
const names=['index.html','style.css','data.js','art.js','render.js','game.js','icon.svg','manifest.webmanifest'];
const assets=Object.fromEntries(names.map(n=>['/'+n,{body:readFileSync('web/'+n,'utf8'),type:types[n.split('.').at(-1)]}]));
const backend=readFileSync('worker/backend.js','utf8').replaceAll('export async function','async function').replaceAll('export function','function');
const bundle=backend+'\nconst ASSETS='+JSON.stringify(assets)+';\nexport default {async fetch(request,env){if(new URL(request.url).pathname.startsWith("/api/"))return handleAPI(request,env);if(request.method!=="GET"&&request.method!=="HEAD")return new Response("Method not allowed",{status:405});return serveAsset(request,ASSETS)}};\n';
writeFileSync('worker/index.js',bundle);mkdirSync('dist/server',{recursive:true});writeFileSync('dist/server/index.js',bundle);console.log('Built Strada: '+names.length+' embedded assets, '+Math.round(bundle.length/1024)+' kB');
