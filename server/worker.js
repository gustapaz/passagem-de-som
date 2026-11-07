import {api} from './api.js';
import assets from '../dist/server/assets.js';

const types = {'/':'text/html; charset=utf-8','/app.js':'text/javascript; charset=utf-8','/style.css':'text/css; charset=utf-8','/mark.svg':'image/svg+xml'};
export default {
  fetch(request,env) {
    const path = new URL(request.url).pathname;
    if (path.startsWith('/api/')) return api(request,env.DB);
    if (!['GET','HEAD'].includes(request.method) || !Object.hasOwn(assets,path)) return new Response('Página não encontrada.',{status:404});
    return new Response(request.method==='HEAD'?null:assets[path],{headers:{
      'Content-Type':types[path],'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer',
      'Content-Security-Policy':"default-src 'self'; style-src 'self'; style-src-attr 'unsafe-inline'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'",
    }});
  },
};
