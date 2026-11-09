'use strict';
const http=require('node:http');
const {WebSocketServer,WebSocket}=require('ws');
const {RoomHub}=require('./rooms');
const isObject=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);

function createFillCupServer({port=3002,host='127.0.0.1',allowedOrigins=[],server:externalServer,hub=new RoomHub(),createLimit=20,createWindowMs=600000}={}){
  const origins=new Set(allowedOrigins);
  const createAttempts=new Map();
  const server=externalServer||http.createServer((req,res)=>{
    res.writeHead(req.url==='/health'?200:404,{'Content-Type':'application/json','Cache-Control':'no-store'});
    res.end(JSON.stringify(req.url==='/health'?{ok:true}: {error:'not_found'}));
  });
  const wss=new WebSocketServer({noServer:true,maxPayload:4096,perMessageDeflate:false});
  const upgrade=(req,socket,head)=>{
    if(req.url!=='/fillcup-ws/'||!origins.has(req.headers.origin)||wss.clients.size>=1000){socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');return;}
    wss.handleUpgrade(req,socket,head,ws=>wss.emit('connection',ws,req));
  };
  server.on('upgrade',upgrade);
  wss.on('connection',(ws,req)=>{
    ws.alive=true;ws.createdAt=Date.now();let count=0,windowStart=Date.now();
    const address=req.socket.remoteAddress||'unknown';
    const client={send:raw=>{if(ws.readyState===WebSocket.OPEN){if(ws.bufferedAmount>65536)ws.terminate();else ws.send(raw);}},close:(code,reason)=>ws.close(code,reason)};
    ws.on('pong',()=>{ws.alive=true;});
    ws.on('message',(raw,binary)=>{
      const now=Date.now();if(now-windowStart>10000){windowStart=now;count=0;}
      if(++count>80){ws.close(1008,'rate_limit');return;}
      let message;try{message=binary?null:JSON.parse(raw.toString());}catch(_){message=null;}
      if(isObject(message)&&message.type==='create'){
        let bucket=createAttempts.get(address);
        if(!bucket||now-bucket.windowStart>=createWindowMs){bucket={count:0,windowStart:now};createAttempts.set(address,bucket);}
        if(++bucket.count>createLimit){client.send(JSON.stringify({type:'error',code:'rate_limit'}));return;}
      }
      hub.message(client,message);
    });
    ws.on('close',()=>hub.disconnect(client));ws.on('error',()=>{});ws.member=client;
  });
  const cleanup=setInterval(()=>{
    hub.sweep();
    const cutoff=Date.now()-createWindowMs;
    for(const [address,bucket] of createAttempts) if(bucket.windowStart<cutoff) createAttempts.delete(address);
  },1000);cleanup.unref();
  const heartbeat=setInterval(()=>{
    for(const ws of wss.clients){
      if(!ws.alive||!hub.members.has(ws.member)&&Date.now()-ws.createdAt>30000){ws.terminate();continue;}
      ws.alive=false;ws.ping();
    }
  },15000);heartbeat.unref();
  const ready=externalServer?Promise.resolve():new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,host,resolve);});
  const close=async()=>{
    clearInterval(cleanup);clearInterval(heartbeat);server.off('upgrade',upgrade);
    for(const ws of wss.clients)ws.terminate();
    await new Promise(resolve=>wss.close(resolve));
    if(!externalServer)await new Promise(resolve=>server.close(resolve));
  };
  return {server,wss,hub,ready,close};
}
if(require.main===module){
  const port=Number(process.env.PORT||3002);
  const allowedOrigins=(process.env.ALLOWED_ORIGINS||'http://localhost:8080,http://127.0.0.1:8080').split(',').map(s=>s.trim()).filter(Boolean);
  const instance=createFillCupServer({port,host:process.env.HOST||'127.0.0.1',allowedOrigins});
  instance.ready.then(()=>console.log(`[fillcup-ws] listening on ${process.env.HOST||'127.0.0.1'}:${instance.server.address().port}`)).catch(error=>{console.error(error.message);process.exitCode=1;});
  let closing=false;const stop=()=>{if(closing)return;closing=true;instance.close().then(()=>process.exit(0));};
  process.on('SIGTERM',stop);process.on('SIGINT',stop);
}
module.exports={createFillCupServer};
