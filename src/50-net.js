/* ============ 在线对战（P2P WebRTC + 手动信令） ============ */
let pc = null;
function openMenu(){ document.getElementById("modeMenu").style.display="flex"; }
function hideMenu(){ document.getElementById("modeMenu").style.display="none"; }
function startPvp(role){
  // 预创建对局骨架（数据在建立连接后才真正开局）
  const sd = role==="p1" ? Math.floor(Math.random()*1e9) : 0;
  G = {
    turn: 1, active: "player", ended: false, winner: null,
    mode: "pvp", role: role, seed: sd,
    peer: null, waitingPeer: false,
    player: null, ai: null,
    stats: {breaks:0, counterAttacks:0, attacks:0, raged:0, sealed:0, skills:0, mulligan:0},
    log: [], eventSeq: 0,
  };
  setupPeer();
  const panel=document.getElementById("pvpPanel"); panel.style.display="block";
  const step=document.getElementById("pvpStep");
  document.getElementById("offerOut").style.display="none";
  document.getElementById("offerIn").style.display="none";
  document.getElementById("answerOut").style.display="none";
  document.getElementById("answerIn").style.display="none";
  const btns=document.getElementById("pvpBtns"); btns.innerHTML="";
  if(role==="p1"){
    step.innerHTML="<b>第 1 步：</b>点「复制连接码」发给朋友（微信/QQ 均可）。<br><b>第 2 步：</b>朋友把应答码发回后，粘贴到下方并点「建立连接」。";
    document.getElementById("offerOut").style.display="block";
    document.getElementById("answerIn").style.display="block";
    const b1=document.createElement("button"); b1.className="btn small"; b1.textContent="复制连接码";
    b1.onclick=()=>{ document.getElementById("offerOut").select(); document.execCommand("copy"); step.innerHTML="<b>已复制！</b>把连接码发给朋友，等朋友发回应答码后粘贴下方并点「建立连接」。"; };
    const b2=document.createElement("button"); b2.className="btn small"; b2.textContent="建立连接";
    b2.onclick=()=>{
      try{
        const a=JSON.parse(document.getElementById("answerIn").value);
        pc.setRemoteDescription(a).then(()=>logMsg("信令交换完成，等待 P2P 握手…","g")).catch(e=>logMsg("应答码无效："+e.message,"e"));
      }catch(e){ logMsg("应答码无效，请完整复制后粘贴。","e"); }
    };
    btns.appendChild(b1); btns.appendChild(b2);
    pc.createOffer().then(o=>pc.setLocalDescription(o)).catch(e=>logMsg("创建连接失败："+e.message,"e"));
  } else {
    step.innerHTML="<b>粘贴发起方（1P）发来的连接码</b>，然后点「下一步」，再把生成的应答码发回给 1P。";
    document.getElementById("offerIn").style.display="block";
    document.getElementById("answerOut").style.display="block";
    const b1=document.createElement("button"); b1.className="btn small"; b1.textContent="下一步";
    b1.onclick=()=>{
      try{
        const o=JSON.parse(document.getElementById("offerIn").value);
        pc.setRemoteDescription(o).then(()=>pc.createAnswer().then(a=>pc.setLocalDescription(a))).then(()=>{
          step.innerHTML="<b>已生成应答码！</b>复制发回给发起方，等待对方连接后自动开局。";
        }).catch(e=>logMsg("连接码无效："+e.message,"e"));
      }catch(e){ logMsg("连接码无效，请完整复制后粘贴。","e"); }
    };
    const b2=document.createElement("button"); b2.className="btn small"; b2.textContent="复制应答码";
    b2.onclick=()=>{ document.getElementById("answerOut").select(); document.execCommand("copy"); };
    btns.appendChild(b1); btns.appendChild(b2);
  }
}
function setupPeer(){
  pc = new RTCPeerConnection({iceServers:[
    {urls:["stun:stun.l.google.com:19302","stun:stun1.l.google.com:19302","stun:stun.qq.com:3478","stun:stun.miwifi.com:3478"]}
  ]});
  let dc = null;
  // 仅发起方创建数据通道；应答方通过 ondatachannel 接收对方通道（避免双通道协商错乱）
  if(G.role==="p1"){
    dc = pc.createDataChannel("shp", {ordered:true});
    dc.onopen = ()=>{ onP2POpen(dc); };
    dc.onmessage = onPeerMsg;
  }
  pc.ondatachannel = (ev)=>{ dc=ev.channel; dc.onopen=()=>{ onP2POpen(dc); }; dc.onmessage=onPeerMsg; };
  pc.onconnectionstatechange = ()=>{
    if(pc.connectionState==="failed"||pc.connectionState==="disconnected"){ logMsg("P2P 连接已断开。","e"); G.peer=null; G.waitingPeer=false; }
    else if(pc.connectionState==="connected"){ logMsg("P2P 通道已连通。","g"); }
  };
  pc.onicecandidate = (ev)=>{
    if(pc.localDescription){
      const s = JSON.stringify(pc.localDescription);
      if(G && G.role==="p1"){ document.getElementById("offerOut").value=s; }
      else if(G && G.role==="p2"){ document.getElementById("answerOut").value=s; }
    }
  };
  // 兜底：4 秒后无论是否完成收集都写入当前信令（host 直连可用）
  setTimeout(()=>{ if(pc && pc.localDescription){
      const s = JSON.stringify(pc.localDescription);
      if(G && G.role==="p1"){ document.getElementById("offerOut").value=s; }
      else if(G && G.role==="p2"){ document.getElementById("answerOut").value=s; }
  } }, 4000);
}
function onP2POpen(dc){
  if(G.role==="p1"){
    newGame("pvp","p1", G.seed);
  }
  G.peer = dc;
  logMsg("P2P 连接已建立，正在开局…","g");
  if(G.role==="p1"){
    pvpSend({t:"init", seed:G.seed, name:(typeof UserSys!=="undefined"&&UserSys.profile)?UserSys.profile.nickname:""});
  }
}
function __trace(ev){ try{ (window.__msgLog=window.__msgLog||[]).push({d:Date.now()%1000000, r:G&&G.role, t:G?G.turn:null, a:G?G.active:null, w:G?!!G.waitingPeer:null, ev:ev}); }catch(e){} }
function onPeerMsg(ev){
  let m; try{ m=JSON.parse(ev.data); }catch(e){ return; }
  if(!m || !m.t) return;
  if(m.t!=="init"){ __trace("recv:"+JSON.stringify(m).slice(0,90)); }
  if(m.t==="hello"){ // 对手昵称（2P→1P 回礼；旧版客户端收到未知消息自然忽略，向后兼容）
    if(typeof UserSys!=="undefined" && m.name){ UserSys.oppName = String(m.name).slice(0,12); logMsg(`对方「${UserSys.oppName}」已就位。`,"s"); renderMeters(); }
    return;
  }
  if(m.t==="init" && G.role==="p2"){
    newGame("pvp","p2", m.seed); // newGame 置 active="player"（G.player 恒为 1P 方，1P 先手）；不得改为 "ai"，否则双方回合交叉（TDD-17 根因）
    if(typeof UserSys!=="undefined"){
      if(m.name){ UserSys.oppName = String(m.name).slice(0,12); }
      pvpSend({t:"hello", name: UserSys.profile ? UserSys.profile.nickname : ""}); // 回礼昵称
    }
    renderAll();
    logMsg(`连接成功，对局开始！${UserSys.oppName?`对手「${UserSys.oppName}」，`:""}1P 先手。`,"g");
    return;
  }
  if(m.t==="act" && m.a && G.mode==="pvp" && G.player && G.ai){
    executeAct(m.a);
  }
}
function executeAct(a){
  if(!G.player || !G.ai) return;
  const me = localSide(a.role), opp = me===G.player?G.ai:G.player;
  switch(a.t){
    case "deploy": {
      const card = CARDS.find(c=>c.id===a.cardId);
      if(card && me.mana>=card.cost && !me.field[a.slotIdx]){ playCreature(me, card, a.slotIdx); }
      break;
    }
    case "atk": {
      const s = me.field[a.attIdx];
      if(s && !s.attacked && !s.defended && !s.frozen && !s.sick && opp.field[a.defIdx]){ attackExec(me, s, opp, a.defIdx, effAtk(s, me)); }
      break;
    }
    case "skill": {
      const s = me.field[a.casterIdx];
      if(s && s.broken && !s.skillUsed && me.poshi >= (s.skill? s.skill.cost : 0)){
        skillEffect(me, s, a.targetIdx);
      }
      break;
    }
    case "artifact": {
      const card = CARDS.find(c=>c.id===a.cardId);
      if(card && me.mana>=card.cost && me.hand.indexOf(card.id)>=0){
        me.mana-=card.cost; me.hand.splice(me.hand.indexOf(card.id),1);
        artifactEffect(card, a.targetIdx, me===G.player?"player":"ai");
      }
      break;
    }
    case "brk": {
      if(a.slotIdx!==undefined && me.field[a.slotIdx] && canBreak(me, a.slotIdx) && me.poshi>=breakCost(me.field[a.slotIdx].cost)){ doBreak(me, a.slotIdx); }
      break;
    }
    case "hpReq": {
      const attSide = localSide(a.role);
      const att = attSide.field[a.attIdx];
      if(att && !att.attacked && !att.frozen && !att.sick && fieldCreatures(attSide===G.player?G.ai:G.player).length>0){
        ui.mode="defend"; ui.pending={hpReq:{attRole:a.role, attIdx:a.attIdx}};
        renderAll();
      }
      break;
    }
    case "defendRes": {
      const attSide = localSide(a.attRole || a.role);
      resolveHpAttackBy(attSide, a.attIdx, a.blockerIdx);
      if(attSide===mySide()){ G.waitingPeer=false; }
      renderAll();
      break;
    }
    case "hpDirect": {
      const attSide = localSide(a.role);
      resolveHpAttackBy(attSide, a.attIdx, null);
      break;
    }
    case "endturn": {
      const endName = a.role==="p1" ? "player" : "ai";
      if(G.active !== endName){ __trace("SKIP-endturn:role="+a.role+" need="+endName); break; }
      const cur = G.active==="player"?G.player:G.ai;
      settleEnd(cur);
      if(G.ended) break;
      G.active = cur===G.player?"ai":"player";
      if(G.active==="player"){ // SHANHAIPO-006：回到 1P 视为一轮（与 endTurn/aiEndPhase 口径一致）
        G.turn++;
        if(G.turn > CFG.maxTurns){ finalByTurns(); break; }
      }
      startTurn(G.active==="player"?G.player:G.ai);
      renderAll();
      const nxt = G.active==="player"?G.player:G.ai;
      logMsg(`—— 回合 ${G.turn}：${sideLabel(nxt)} 的回合 ——`,"s");
      animTurn(`${sideLabel(nxt)} 回合 ${G.turn}`);
      break;
    }
  }
  renderAll();
}

