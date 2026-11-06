const http=require('http');
const fs=require('fs');
const path=require('path');
const base=__dirname;
try{process.loadEnvFile(path.join(base,'.env'))}catch(e){if(e.code!=='ENOENT')console.error('No se pudo leer .env:',e.message)}
const runTask=require('./ai/tasks.cjs');
const {MODEL}=require('./ai/gemini.cjs');
const {run}=require('./server/db.cjs');
const {readSession}=require('./server/auth.cjs');
const {match,need}=require('./server/routes.cjs');
const {HttpError,sendJson,readJson,limiter}=require('./server/http.cjs');
const port=Number(process.env.TUTOKI_PORT||4173);
const host=process.env.TUTOKI_HOST||'127.0.0.1';
const MAX_AI_BODY=28*1024*1024; // 20 MB file as base64 plus prompt fields.
const MAX_BODY=1024*1024;
const aiLimit=limiter(40,10*60*1000); // protects the shared free Gemini quota
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.jpeg':'image/jpeg','.png':'image/png','.txt':'text/plain; charset=utf-8','.woff2':'font/woff2'};
run('DELETE FROM sessions WHERE expires_at < ?',Date.now());

async function api(req,res,url){
  try{
    const session=readSession(req);
    const ip=req.socket.remoteAddress||'';
    if(url==='/api/status')return sendJson(res,200,{ai:Boolean(process.env.GEMINI_API_KEY),model:MODEL});
    if(url==='/api/ai'&&req.method==='POST'){
      const s=need(session);
      const body=await readJson(req,MAX_AI_BODY);
      if(body.task==='generate'&&s.role!=='teacher')throw new HttpError(403,'Solo el docente puede generar actividades.','forbidden');
      aiLimit(s.role==='teacher'?s.teacher.id:s.student.id);
      return sendJson(res,200,await runTask(body));
    }
    const route=match(req.method,url);
    if(!route)throw new HttpError(404,'Ruta no encontrada.','not-found');
    const body=['POST','PATCH'].includes(req.method)?await readJson(req,MAX_BODY):{};
    sendJson(res,200,await route.handler({req,res,session,body,params:route.params,ip}));
  }catch(e){
    if(!e.status)console.error(e);
    sendJson(res,e.status||500,{error:e.status?e.message:'Error interno.',code:e.code||'internal'});
  }
}

const server=http.createServer((req,res)=>{
  let url;try{url=decodeURIComponent(new URL(req.url,'http://localhost').pathname)}catch{res.writeHead(400);return res.end('Bad request')}
  if(url.startsWith('/api/'))return api(req,res,url);
  // Never serve dotfiles (.env holds the API key), server code, the database or tests.
  if(url.split('/').some(s=>s.startsWith('.'))||url.endsWith('.cjs')||/^\/(data|server|tests|ai)\//.test(url)){res.writeHead(404);return res.end('Not found')}
  const file=path.resolve(base,'.'+(url==='/'?'/index.html':url));
  if(!file.startsWith(base+path.sep)&&file!==path.join(base,'index.html')){res.writeHead(403);return res.end('Forbidden')}
  fs.readFile(file,(err,data)=>{if(err){res.writeHead(404);return res.end('Not found')}res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});res.end(data)});
});
server.listen(port,host,()=>console.log(`Tutoki listo en http://localhost:${port} · IA: ${process.env.GEMINI_API_KEY?MODEL:'modo demostración (sin GEMINI_API_KEY)'}`));
server.on('error',e=>{console.error(e.message);process.exit(1)});
