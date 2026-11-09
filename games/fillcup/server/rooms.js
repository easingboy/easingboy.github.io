'use strict';
const {randomBytes}=require('node:crypto');
const id=()=>randomBytes(16).toString('hex');
const isObject=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);

class RoomHub {
  constructor({now=Date.now,maxRooms=500,graceMs=60000,waitMs=600000,finishedMs=1800000,moveMs=520}={}) {
    Object.assign(this,{now,maxRooms,graceMs,waitMs,finishedMs,moveMs});
    this.rooms=new Map();this.members=new Map();
  }
  send(client,message){client.send(JSON.stringify(message));}
  error(client,code,requestId){this.send(client,{type:'error',code,requestId});}
  config(value){
    if(!isObject(value)||!['single','dual'].includes(value.cupMode)) return null;
    const result={cupMode:value.cupMode,capacity:value.capacity??7,capA:value.capA??5,capB:value.capB??7};
    return [7,11,15,19].includes(result.capacity)&&[5,7,9,11,13].includes(result.capA)&&[5,7,9,11,13].includes(result.capB)?result:null;
  }
  snapshot(room,seat,requestId){
    return {type:'state',room:room.id,seat:seat+1,config:room.config,status:room.status,reason:room.reason,
      revision:room.revision,matchId:room.matchId,levels:room.levels,previous:room.previous,currentPlayer:room.currentPlayer,
      round:room.round,lastMove:room.lastMove,loser:room.loser,startedAt:room.startedAt,endedAt:room.endedAt,
      nextMoveAt:room.nextMoveAt,serverNow:this.now(),scores:room.scores,ready:room.ready,closed:room.closed,
      online:room.players.map(p=>!!p?.client),paused:room.status==='playing'&&room.players.some(p=>!p?.client),
      reconnectUntil:room.players.reduce((min,p)=>p?.offlineAt!==null&&p?.offlineAt!==undefined?Math.min(min,p.offlineAt+this.graceMs):min,Infinity)===Infinity?null:Math.min(...room.players.filter(p=>p&&p.offlineAt!==null).map(p=>p.offlineAt+this.graceMs)),requestId};
  }
  state(client,room,seat,requestId,token){this.send(client,{...this.snapshot(room,seat,requestId),...(token?{token}: {})});}
  broadcast(room){room.players.forEach((p,i)=>{if(p?.client)this.state(p.client,room,i);});}
  broadcastExcept(room,excludeSeat){room.players.forEach((p,i)=>{if(i!==excludeSeat&&p?.client)this.state(p.client,room,i);});}
  attach(client,room,seat){
    const player=room.players[seat],old=player.client;
    if(old&&old!==client){this.members.delete(old);this.error(old,'replaced');old.close(4001,'replaced');}
    player.client=client;player.offlineAt=null;this.members.set(client,{room,seat});room.revision++;
  }
  start(room){
    room.matchId=id();room.revision++;room.status='playing';room.ready=[false,false];room.seen.clear();room.reason=null;
    room.levels=room.config.cupMode==='single'?[0]:[0,0];room.previous=room.levels.slice();room.currentPlayer=1;room.round=1;
    room.loser=0;room.lastMove=null;room.startedAt=this.now();room.endedAt=null;room.nextMoveAt=this.now();room.activityAt=this.now();
  }
  /** 房间不再有意义时立即回收，避免仅靠30分钟终局TTL造成的资源占用 */
  reclaim(room){if(room.matchId===null)this.rooms.delete(room.id);}
  abort(room,reason){
    room.closed=true;room.ready=[false,false];room.reason=reason;room.revision++;room.activityAt=this.now();
    if(room.status==='playing'||room.status==='waiting'){room.status='aborted';room.endedAt=this.now();}
    this.broadcast(room);this.reclaim(room);
  }
  message(client,msg){
    this.sweep();
    if(!isObject(msg)||typeof msg.type!=='string')return this.error(client,'invalid_message');
    const requestId=typeof msg.requestId==='string'&&msg.requestId.length<=100?msg.requestId:undefined;
    let member=this.members.get(client);
    if(msg.type==='create'){
      if(member)return this.state(client,member.room,member.seat,requestId,member.room.players[member.seat].token);
      const config=this.config(msg.config);if(!config)return this.error(client,'invalid_config');
      if(this.rooms.size>=this.maxRooms)return this.error(client,'busy');
      const room={id:id(),config,players:[{token:id()+id(),client:null,offlineAt:null},null],status:'waiting',closed:false,reason:null,
        matchId:null,revision:0,levels:config.cupMode==='single'?[0]:[0,0],previous:config.cupMode==='single'?[0]:[0,0],round:1,currentPlayer:1,
        lastMove:null,loser:0,startedAt:null,endedAt:null,nextMoveAt:0,scores:[0,0],ready:[false,false],seen:new Map(),createdAt:this.now(),activityAt:this.now()};
      this.rooms.set(room.id,room);this.attach(client,room,0);return this.state(client,room,0,requestId,room.players[0].token);
    }
    if(['peek','join','resume'].includes(msg.type)){
      const room=typeof msg.room==='string'&&msg.room.length<=64?this.rooms.get(msg.room):null;
      if(!room)return this.error(client,'not_found');
      if(msg.type==='peek')return this.send(client,{type:'preview',room:room.id,config:room.config,status:room.status,closed:room.closed,full:!!room.players[1]});
      if(member){if(member.room!==room)return this.error(client,'already_joined');return this.state(client,room,member.seat,requestId,room.players[member.seat].token);}
      if(msg.type==='resume'){
        const seat=typeof msg.token==='string'&&msg.token?room.players.findIndex(p=>p&&p.token===msg.token):-1;
        if(seat<0)return this.error(client,'identity');
        this.attach(client,room,seat);
        if(room.status==='waiting'&&room.players.every(p=>p?.client))this.start(room);
        this.state(client,room,seat,requestId,room.players[seat].token);this.broadcastExcept(room,seat);return;
      }
      if(room.closed)return this.error(client,'closed');
      const nonce=typeof msg.nonce==='string'&&msg.nonce?msg.nonce:null;
      if(room.players[1]){
        // 首次加入的确认在到达客户端前若断线，允许持同一 nonce 的重连接管本席位，避免误判房间已满。
        if(nonce&&nonce===room.players[1].nonce&&!room.players[1].client){
          this.attach(client,room,1);this.state(client,room,1,requestId,room.players[1].token);this.broadcastExcept(room,1);return;
        }
        return this.error(client,'full');
      }
      if(room.status!=='waiting')return this.error(client,'full');
      room.players[1]={token:id()+id(),client:null,offlineAt:null,nonce};this.attach(client,room,1);
      if(room.players.every(p=>p?.client))this.start(room);
      this.state(client,room,1,requestId,room.players[1].token);this.broadcastExcept(room,1);return;
    }
    if(!member)return this.error(client,'not_joined',requestId);
    const {room,seat}=member;
    if(msg.type==='sync')return this.state(client,room,seat,requestId);
    if(msg.type==='leave'){
      this.members.delete(client);room.players[seat].client=null;room.players[seat].token=null;room.players[seat].offlineAt=null;
      this.abort(room,'left');return this.send(client,{type:'left'});
    }
    if(!['pour','rematch'].includes(msg.type))return this.error(client,'invalid_message',requestId);
    if(msg.matchId!==room.matchId)return this.error(client,'stale',requestId);
    if(room.closed)return this.error(client,'closed',requestId);
    if(msg.type==='rematch'){
      if(room.status!=='finished')return this.error(client,'phase',requestId);
      if(room.players.some(p=>!p?.client))return this.error(client,'offline',requestId);
      if(room.ready[seat])return this.state(client,room,seat,requestId);
      room.ready[seat]=true;room.revision++;room.activityAt=this.now();
      if(room.ready.every(Boolean))this.start(room);
      this.broadcast(room);return;
    }
    if(!requestId)return this.error(client,'invalid_message');
    const key=`${seat}:${requestId}`;
    if(room.seen.has(key))return this.state(client,room,seat,requestId);
    if(msg.revision!==room.revision)return this.error(client,'stale',requestId);
    if(room.status!=='playing')return this.error(client,'phase',requestId);
    if(room.players.some(p=>!p?.client))return this.error(client,'offline',requestId);
    if(room.currentPlayer!==seat+1)return this.error(client,'turn',requestId);
    if(![1,2].includes(msg.amount)||!Number.isInteger(msg.cup)||msg.cup<0||msg.cup>=room.levels.length)return this.error(client,'invalid_move',requestId);
    if(this.now()<room.nextMoveAt)return this.error(client,'cooldown',requestId);
    const capacities=room.config.cupMode==='single'?[room.config.capacity]:[room.config.capA,room.config.capB];
    room.previous=room.levels.slice();const value=room.levels[msg.cup]+msg.amount,overflow=value>capacities[msg.cup];
    room.levels[msg.cup]=Math.min(value,capacities[msg.cup]);room.lastMove={cup:msg.cup,amount:msg.amount,player:seat+1,overflow,at:this.now()};
    room.revision++;room.nextMoveAt=this.now()+this.moveMs;room.activityAt=this.now();room.seen.set(key,true);
    if(room.seen.size>256)room.seen.delete(room.seen.keys().next().value);
    if(overflow){room.status='finished';room.loser=seat+1;room.endedAt=this.now();room.scores[1-seat]++;}
    else{room.currentPlayer=2-seat;room.round++;}
    this.state(client,room,seat,requestId);this.broadcastExcept(room,seat);
  }
  disconnect(client){
    const member=this.members.get(client);if(!member)return;
    this.members.delete(client);const {room,seat}=member;
    if(room.players[seat].client!==client)return;
    room.players[seat].client=null;room.players[seat].offlineAt=this.now();room.revision++;
    room.ready=[false,false];this.broadcast(room);
  }
  sweep(){
    const now=this.now();
    for(const room of this.rooms.values()){
      if(room.status==='waiting'&&now-room.createdAt>=this.waitMs || ['finished','aborted'].includes(room.status)&&now-room.activityAt>=this.finishedMs){
        room.players.forEach(p=>{if(p?.client){this.error(p.client,'expired');this.members.delete(p.client);}});this.rooms.delete(room.id);continue;
      }
      if(!room.closed&&room.players.some(p=>p&&p.offlineAt!==null&&now-p.offlineAt>=this.graceMs))this.abort(room,'disconnect_timeout');
    }
  }
}
module.exports={RoomHub};
