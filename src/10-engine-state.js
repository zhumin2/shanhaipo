/* ============ 游戏状态 ============ */
let G = null;
let ui = { selCard:null, selField:null, mode:"idle", pending:{type:null, card:null, caster:null} };

function newSide(deck){
  return {
    hp: CFG.hp, mana: 1, manaCap: 1, poshi: 0,
    deck: shuffle(deck.slice()), hand: [], field: [null,null,null],
    grave: [], turnPlayed: [], immune: false, turnAtkDown: 0,
    brokenFlags: {}, sealedFlags: {},
  };
}
function newGame(mode, role, seed){
  const sd = seed || (Math.floor(Math.random()*1e9));
  seedRNG(sd);
  const keepPeer = G && G.peer ? G.peer : null;
  const keepWaiting = G && G.waitingPeer ? G.waitingPeer : false;
  G = {
    turn: 1, active: "player", ended: false, winner: null,
    mode: mode||"ai", role: role||"p1", seed: sd,
    peer: keepPeer, waitingPeer: keepWaiting,
    player: newSide(CARDS.map(c=>c.id)),
    ai: newSide(CARDS.map(c=>c.id)),
    stats: {breaks:0, counterAttacks:0, attacks:0, raged:0, sealed:0, skills:0, mulligan:0},
    log: [], eventSeq: 0,
  };
  EVQ = []; // 事件队列随对局重置（T1-A2）
  for(let i=0;i<3;i++){ G.player.hand.push(G.player.deck.pop()); }
  for(let i=0;i<3;i++){ G.ai.hand.push(G.ai.deck.pop()); }
  if(typeof UserSys!=="undefined"){ UserSys.oppName = null; } // PvP 对手昵称随对局重置（hello/init.name 重新交换）
  hideMenu(); hideEnd();
  renderAll();
  if(G.mode==="ai"){ logMsg("对局开始：你的回合（先手）。点击手牌部署神兽。","s"); }
  else if(G.mode==="hotseat"){ logMsg("对局开始：1P（下方）先手。回合结束自动轮到 2P（上方）。","s"); }
  else { logMsg("对局开始：你"+(G.role==="p1"?"（1P）先手":"（2P）后手")+"，点击手牌部署神兽。","s"); }
}
/* ============ 模式与对局方（SHANHAIPO-003） ============ */
function mySide(){
  if(G.mode==="pvp") return G.role==="p1"?G.player:G.ai;
  if(G.mode==="hotseat") return G.active==="player"?G.player:G.ai;
  return G.player;
}
function oppSide(){ return mySide()===G.player?G.ai:G.player; }
function sideName(side){ return side===G.player?"1P":"2P"; }
function sideLabel(side){
  if(G.mode==="ai") return side===G.player?"你":"AI";
  return sideName(side);
}
function canActNow(){
  if(G.ended) return false;
  if(G.mode==="pvp") return G.role==="p1"?G.active==="player":G.active==="ai";
  if(G.mode==="hotseat") return true;
  return G.active==="player";
}
function closeMenu(){ if(G && G.player){ hideMenu(); } }
function startMode(m){ newGame(m, "p1"); }
function pvpSend(obj){
  if(G.mode==="pvp" && G.peer && G.peer.readyState==="open"){ try{ G.peer.send(JSON.stringify(obj)); }catch(e){} }
}
function pvpAct(a){ pvpSend({t:"act", a:Object.assign({}, a, {role:G.role})}); }
function localSide(role){
  if(G.mode==="pvp") return role==="p1"?G.player:G.ai;
  return role==="ai"?G.ai:G.player;
}
function shuffle(a){ for(let i=a.length-1;i>0;i--){ const j=Math.floor(RNG()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }
function draw(side,n){
  for(let i=0;i<n;i++){
    if(side.deck.length===0){ damageHpRaw(side,1,"疲乏"); EV({log:"牌库已空，抽牌受到 1 点疲乏伤害。",k:"e"}); continue; }
    side.hand.push(side.deck.pop());
  }
  if(side.hand.length>CFG.handCap){
    // 手牌超上限自动弃置最低费（原型简化，玩家与 AI 口径一致）
    while(side.hand.length>CFG.handCap){
      if(side===G.player){ side.hand.sort((a,b)=>CARDS.find(x=>x.id===a).cost-CARDS.find(x=>x.id===b).cost); side.hand.shift(); EV({log:"手牌超过上限，自动弃置 1 张（原型简化）。",k:"s"}); }
      else { side.hand.sort((a,b)=>CARDS.find(x=>x.id===a).cost-CARDS.find(x=>x.id===b).cost); side.hand.shift(); }
    }
  }
}

