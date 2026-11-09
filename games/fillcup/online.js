/* 联网只消费权威快照，不调用本地倒水引擎。 */
class FillCupOnline {
  constructor(onChange) {
    this.onChange=onChange;this.game=null;this.phase='menu';this.active=false;this.suspended=false;
    this.room='';this.token='';this.seat=0;this.state=null;this.preview=null;this.problem='';this.fatal=false;
    this.connected=false;this.synced=false;this.pending=null;this.socket=null;this.generation=0;this.offset=0;this.retry=0;
    this.retryTimer=0;this.deadlineTimer=0;this.phaseTimer=0;this.away=false;this.joinNonce=null;
  }
  serverNow(){return Date.now()+this.offset;}
  savedToken(room){try{return sessionStorage.getItem(`fillcup-room:${room}`)||'';}catch(_){return '';}}
  remember(){try{sessionStorage.setItem(`fillcup-room:${this.room}`,this.token);}catch(_){this.problem='浏览器不允许保存身份，刷新后将无法恢复席位';}}
  setURL(){const url=new URL(location.href);url.searchParams.set('room',this.room);history.replaceState(null,'',url);}
  begin(config,room='') {
    this.stop();this.active=true;this.config=config;this.room=room;this.token=this.savedToken(room);this.joinRequested=false;this.joinNonce=null;
    this.seat=0;this.game=null;this.state=null;this.preview=null;this.phase='menu';this.fatal=false;this.problem='';this.retry=0;this.connect();
  }
  notify(event='network'){this.onChange(event);}
  send(message){if(this.socket?.readyState!==WebSocket.OPEN)return false;this.socket.send(JSON.stringify(message));return true;}
  connect(){
    if(!this.active||this.away||this.fatal)return;
    clearTimeout(this.retryTimer);clearTimeout(this.deadlineTimer);
    const generation=++this.generation;this.connected=false;this.synced=false;this.problem='连接中…';
    const socket=new WebSocket(`${location.protocol==='https:'?'wss':'ws'}://${location.host}/fillcup-ws/`);this.socket=socket;
    const current=()=>this.active&&generation===this.generation;
    this.deadlineTimer=setTimeout(()=>{if(current())socket.close();},8000);
    socket.onopen=()=>{
      if(!current()){socket.close();return;}
      this.connected=true;
      this.send(this.token?{type:'resume',room:this.room,token:this.token}:this.room?(this.joinRequested?{type:'join',room:this.room,nonce:this.joinNonce}:{type:'peek',room:this.room}):{type:'create',config:this.config});
    };
    socket.onmessage=event=>{
      if(!current())return;
      let message;try{message=JSON.parse(event.data);}catch(_){return;}
      if(!message||typeof message!=='object')return;
      this.receive(message);
    };
    socket.onerror=()=>{};
    socket.onclose=()=>{
      if(!current())return;
      clearTimeout(this.deadlineTimer);clearTimeout(this.phaseTimer);
      this.connected=false;this.synced=false;this.pending=null;
      if(!this.fatal){this.problem='连接中断，正在重连…';if(!this.away)this.retryTimer=setTimeout(()=>this.connect(),Math.min(8000,1000*2**Math.min(this.retry++,3)));}
      this.notify();
    };
    this.notify();
  }
  receive(message){
    const errors={not_found:'房间已失效，请重新创建',expired:'房间已过期，请重新创建',full:'房间已满，无法加入',identity:'无法恢复原席位，请返回重新创建房间',replaced:'此席位已在另一页面恢复，本页停止连接',busy:'服务器房间已满，请稍后再试',invalid_config:'杯子配置无效',closed:'房间已关闭',offline:'对方已断线，等待恢复',stale:'局面已更新，正在同步',cooldown:'倒水动画尚未结束，请稍候',turn:'还没有轮到你',invalid_move:'倒水操作无效',phase:'本局状态已变化',not_joined:'尚未加入房间',invalid_message:'操作未被接受'};
    if(message.type==='error'){
      clearTimeout(this.deadlineTimer);this.pending=null;this.problem=errors[message.code]||'连接异常，请重新尝试';
      if(['not_found','expired','full','identity','replaced','busy','invalid_config','already_joined'].includes(message.code)||message.code==='closed'&&!this.seat){
        this.fatal=true;this.synced=false;this.socket?.close();
      }else if(this.seat){this.synced=false;this.requestSync();}
      this.notify();return;
    }
    if(message.type==='preview'){
      clearTimeout(this.deadlineTimer);this.preview=message;this.problem=message.closed?'房间已关闭':message.full?'房间已满，无法加入':'好友邀请你加入装杯对战';this.retry=0;this.notify();return;
    }
    if(message.type!=='state'||!Array.isArray(message.levels)||!message.config||!Number.isInteger(message.revision))return;
    if(message.token){this.token=message.token;this.room=message.room;this.remember();this.setURL();}
    if(this.state&&message.room===this.state.room&&message.revision<this.state.revision)return;
    const previous=this.state,wasSynced=this.synced;
    this.seat=message.seat;this.room=message.room;this.state=message;this.offset=message.serverNow-Date.now();
    this.synced=true;this.retry=0;this.problem='';
    if(message.requestId===this.pending?.requestId||this.pending?.type==='rematch'||!wasSynced)this.pending=null;
    clearTimeout(this.deadlineTimer);
    if(this.pending)this.armDeadline();
    if(message.status!=='waiting'){
      if(!this.game||this.game.matchId!==message.matchId){
        this.game={matchId:message.matchId,options:{...message.config,mode:'online'},capacities:message.config.cupMode==='single'?[message.config.capacity]:[message.config.capA,message.config.capB]};
      }
      Object.assign(this.game,{levels:message.levels,previous:message.previous,currentPlayer:message.currentPlayer,round:message.round,loser:message.loser,lastMove:message.lastMove,startedAt:message.startedAt,gameOver:['finished','aborted'].includes(message.status),aborted:message.status==='aborted'});
      this.game.elapsed=()=>message.startedAt===null?0:Math.max(0,Math.floor(((message.endedAt??this.serverNow())-message.startedAt)/1000));
    }
    const newMove=wasSynced&&previous?.matchId===message.matchId&&message.lastMove?.at!==previous?.lastMove?.at;
    this.skipAnimation=!newMove;
    this.updatePhase();
    this.notify(newMove?'pour':'snapshot');
  }
  updatePhase(){
    clearTimeout(this.phaseTimer);const state=this.state;if(!state)return;
    const remaining=state.nextMoveAt-this.serverNow();
    if(state.status==='waiting')this.phase='menu';
    else if(state.status==='aborted')this.phase='finished';
    else if(state.status==='finished'){
      this.phase=this.skipAnimation||remaining<=-500?'finished':remaining>0?'pouring':'overflow';
      if(this.phase!=='finished')this.phaseTimer=setTimeout(()=>{this.updatePhase();this.notify(this.phase==='overflow'?'overflow':'phase');},Math.max(20,remaining>0?remaining:remaining+500));
    }else{
      this.phase=remaining>0?'pouring':'playing';
      if(remaining>0)this.phaseTimer=setTimeout(()=>{this.updatePhase();this.notify('phase');},remaining+20);
    }
  }
  canPour(){return this.active&&!document.hidden&&this.connected&&this.synced&&!this.pending&&!this.fatal&&!this.away&&this.state?.status==='playing'&&!this.state.paused&&this.state.currentPlayer===this.seat&&this.serverNow()>=this.state.nextMoveAt;}
  armDeadline(){clearTimeout(this.deadlineTimer);this.deadlineTimer=setTimeout(()=>{if(this.active){this.synced=false;this.problem='等待服务器确认，重新同步…';this.socket?.close();this.notify();}},6000);}
  requestSync(){if(this.send({type:'sync'}))this.armDeadline();}
  pour(amount,cup){
    if(!this.canPour())return null;
    const message={type:'pour',amount,cup,matchId:this.state.matchId,revision:this.state.revision,requestId:crypto.randomUUID?crypto.randomUUID():`${Date.now()}-${Math.random()}`};
    this.pending=message;this.send(message);this.armDeadline();this.notify();return message;
  }
  join(){
    if(!this.connected||this.seat||!this.preview||this.preview.full||this.preview.closed||this.joinRequested)return;
    if(!this.joinNonce)this.joinNonce=crypto.randomUUID?crypto.randomUUID():`${Date.now()}-${Math.random()}`;
    this.joinRequested=true;this.send({type:'join',room:this.room,nonce:this.joinNonce});this.armDeadline();this.notify();
  }
  rematch(){
    if(!this.connected||!this.synced||this.pending||this.state?.status!=='finished'||this.state.closed||this.state.online.some(p=>!p))return;
    this.pending={type:'rematch'};this.send({type:'rematch',matchId:this.state.matchId});this.armDeadline();this.notify();
  }
  statusText(){
    if(this.problem)return this.problem;
    if(!this.connected||!this.synced)return '连接恢复中…';
    if(this.state?.paused){const seconds=Math.max(0,Math.ceil((this.state.reconnectUntil-this.serverNow())/1000));return `对方断线，等待重连（${seconds}秒）`;}
    if(this.state?.status==='waiting')return '等待对手加入 · 你是玩家1，先手';
    if(this.state?.status==='aborted')return '本局已中止，不计胜负';
    if(this.state?.closed)return '对方已离开，房间已关闭';
    if(this.pending)return '等待服务器确认…';
    return `你是玩家${this.seat} · ${this.state?.status==='finished'?'本局结束':'双方已连接'}`;
  }
  inviteURL(){const url=new URL('./',location.href);url.searchParams.set('room',this.room);return url.href;}
  leave(){
    if(this.seat)this.send({type:'leave'});
    try{sessionStorage.removeItem(`fillcup-room:${this.room}`);}catch(_){}
    this.stop();this.active=false;this.game=null;this.state=null;
    const url=new URL(location.href);url.searchParams.delete('room');history.replaceState(null,'',url);
  }
  stop(){this.generation++;clearTimeout(this.retryTimer);clearTimeout(this.deadlineTimer);clearTimeout(this.phaseTimer);this.socket?.close();this.socket=null;this.connected=false;this.synced=false;this.pending=null;this.away=false;}
  suspend(){this.away=true;clearTimeout(this.retryTimer);clearTimeout(this.deadlineTimer);clearTimeout(this.phaseTimer);this.synced=false;this.socket?.close();}
  resume(){if(!this.active||this.fatal)return;this.away=false;if(this.socket?.readyState===WebSocket.OPEN){this.synced=false;this.requestSync();}else this.connect();}
}
window.FillCupOnline=FillCupOnline;
