/* ============ 回合流程 ============ */
function startTurn(side){
  side.manaCap = Math.min(CFG.manaCap, side.manaCap+1);
  side.mana = side.manaCap;
  draw(side, CFG.drawPerTurn);
  if(auraXiang(side)){ side.hp = Math.min(CFG.hp, side.hp+1); EV({log:`${side===G.player?"你":"敌方"}祥瑞和鸣：本源 +1。`,k:"g"}); }
  side.turnPlayed = [];
  side.turnAtkDown = 0;
  fieldCreatures(side).forEach(s=>{ s.attacked=false; s.defended=false; s.frozen=false; s.skillBonus=0; s.turnAtkBuff=0; s.tauntTurn=false; s.sick=false; });
  // 神农鼎等进场效果在部署时处理；回合开始重置临时增益
}
function endTurn(){
  // 拒绝结构化（T1-A4）：返回 {ok,reason}，供协议层与调用方判定
  if(G.ended || !canActNow()) return {ok:false, reason:"turn"};
  if(G.mode==="pvp" && G.waitingPeer){ logMsg("等待对方选择防御，暂不能结束回合。","s"); if(typeof __trace==="function"){__trace("endTurn-BLOCKED-wait");} return {ok:false, reason:"waiting"}; }
  if(G.mode==="pvp"){ if(typeof __trace==="function"){__trace("endTurn-local");} }
  if(G.mode==="pvp"){
    pvpAct({t:"endturn"});
  }
  if(G.mode==="ai"){
    settleEnd(G.player);
    if(G.ended) return {ok:true};
    G.active = "ai"; // SHANHAIPO-006：turn=轮次，轮内换边不计数，回到 1P 时 +1（在 aiEndPhase）
    renderAll();
    logMsg(`—— 回合 ${G.turn}：敌方回合 ——`,"s");
    animTurn(`敌方回合 ${G.turn}`);
    setTimeout(aiTurn, 350);
    return {ok:true};
  }
  const cur = G.active==="player"?G.player:G.ai;
  settleEnd(cur);
  if(G.ended) return {ok:true};
  G.active = cur===G.player?"ai":"player";
  if(G.active==="player"){ // 1P 新一轮开始
    G.turn++;
    if(G.turn > CFG.maxTurns){ finalByTurns(); return {ok:true}; }
  }
  const nxt = G.active==="player"?G.player:G.ai;
  startTurn(nxt);
  renderAll();
  logMsg(`—— 回合 ${G.turn}：${sideLabel(nxt)} 的回合 ——`,"s"); animTurn(`${sideLabel(nxt)} 回合 ${G.turn}`);
  return {ok:true};
}
function settleEnd(side){
  // 狂性反噬（SHANHAIPO-006 口径：本回合未攻击且未用破势技，被冻结豁免）
  side.field.forEach(s=>{
    if(s && s.broken && !s.attacked && !s.frozen && !s.skillUsed){
      side.hp = Math.max(0, side.hp - CFG.rageDamage);
      G.stats.raged++;
      EV({anim:"hp", side, n:CFG.rageDamage});
      EV({log:`${s.name} 狂性反噬：${side===G.player?"你":"敌方"}本源 −${CFG.rageDamage}。`,k:"e"});
    }
    if(s){ s.didDamageThisTurn=false; }
  });
  checkEnd();
}

