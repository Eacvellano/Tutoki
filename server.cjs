const http=require('http');
const fs=require('fs');
const path=require('path');
const base=__dirname;
const port=Number(process.env.TUTOKI_PORT||4173);
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.jpeg':'image/jpeg','.png':'image/png','.txt':'text/plain; charset=utf-8','.woff2':'font/woff2'};
const server=http.createServer((req,res)=>{
  let url;try{url=decodeURIComponent(new URL(req.url,'http://localhost').pathname)}catch{res.writeHead(400);return res.end('Bad request')}
  const file=path.resolve(base,'.'+(url==='/'?'/index.html':url));
  if(!file.startsWith(base+path.sep)&&file!==path.join(base,'index.html')){res.writeHead(403);return res.end('Forbidden')}
  fs.readFile(file,(err,data)=>{if(err){res.writeHead(404);return res.end('Not found')}res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});res.end(data)});
});
server.listen(port,'127.0.0.1',()=>console.log(`Tutoki listo en http://localhost:${port}`));
server.on('error',e=>{console.error(e.message);process.exit(1)});
