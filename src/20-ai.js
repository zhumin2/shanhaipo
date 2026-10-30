/* ============ AI ============ */
function aiTurn(){
  if(G.ended) return;
  startTurn(G.ai);
  if(G.ended) return;
  const ai = G.ai, pl = G.player;
  // 1. 用神器
  ai.hand.slice().forEach(cid=>{
    if(G.ended) return;
    const card = CARDS.find(c=>c.id===cid);
    if(card.cost>ai.mana) return;
    if(card.effect && card.effect.type){
      let used = false;
      if(card.effect.type==="damage" && card.effect.target==="enemyCreature"){
        const ts = fieldCreatures(pl).filter(t=>t.hp>0);
        if(ts.length>0){ const t=ts[0]; const idx=pl.field.indexOf(t); ai.mana-=card.cost; ai.hand.splice(ai.hand.indexOf(cid),1); artifactEffect(card, idx, "ai"); used=true; }
      } else if(card.effect.type==="damageHp" || card.effect.type==="damageHpCond"){
        ai.mana-=card.cost; ai.hand.splice(ai.hand.indexOf(cid),1); artifactEffect(card, null, "ai"); used=true;
      } else if((card.effect.type==="heal"||card.effect.type==="buffHp") && fieldCreatures(ai).length>0){
        const t = fieldCreatures(ai)[0]; const idx = ai.field.indexOf(t);
        ai.mana-=card.cost; ai.hand.splice(ai.hand.indexOf(cid),1); artifactEffect(card, idx, "ai"); used=true;
      } else if(card.effect.type==="seal"){
        const brk = fieldCreatures(pl).find(t=>t.broken);
        if(brk){ const idx=pl.field.indexOf(brk); ai.mana-=card.cost; ai.hand.splice(ai.hand.indexOf(cid),1); artifactEffect(card, idx, "ai"); used=true; }
      }
      if(used){ renderAll(); }
    }
  });
  // 2. 部署神兽
  ai.hand.slice().forEach(cid=>{
    if(G.ended) return;
    const card = CARDS.find(c=>c.id===cid);
    if(card.kind==="creature" && card.cost<=ai.mana){
      const free = ai.field.map((s,i)=>s?null:i).filter(i=>i!==null);
      if(free.length>0){ playCreature(ai, card, free[0]); }
    }
  });
  // 3. 破封
  ai.field.forEach((s,idx)=>{
    if(G.ended) return;
    if(s && canBreak(ai, idx) && ai.poshi>=breakCost(s.cost) && s.atk>=4){
      doBreak(ai, idx);
    }
  });
  // 4. 攻击（队列化：打本源时若玩家场上有神兽，暂停等玩家防御）
  aiAtkQueue = [];
  ai.field.forEach(s=>{
    if(G.ended || !s || s.attacked || s.defended || s.frozen || s.sick) return;
    const atk = s.atk + (s.skillBonus||0) + (s.turnAtkBuff||0) + (auraXiong(G.ai)?1:0);
    if(atk<=0){ s.attacked=true; return; }
    aiAtkQueue.push({s, atk});
  });
  aiProcessAttacks();
}

/* ===== 防御机制（SHANHAIPO-002）：攻击本源时被攻击方可派神兽阻挡 ===== */
var aiAtkQueue = [];
function aiProcessAttacks(){
  if(G.ended) return;
  while(aiAtkQueue.length>0){
    const it = aiAtkQueue[0];
    const ts = fieldCreatures(G.player);
    const taunt = ts.filter(t=>t.tauntTurn);
    const pool = taunt.length?taunt:ts;
    let target = null;
    if(pool.length>0){
      // 有克制目标必打；无克制时能击杀最强神兽则清场，否则抢血打本源（触发玩家防御）
      target = pool.find(t=>COUNTER[it.s.element]===t.element);
      if(!target){
        const strongest = pool.slice().sort((a,b)=>b.atk-a.atk)[0];
        if(it.atk >= strongest.hp) target = strongest;
      }
    }
    if(target){
      const idx = G.player.field.indexOf(target);
      attackExec(G.ai, it.s, G.player, idx, it.atk);
      aiAtkQueue.shift();
    } else if(fieldCreatures(G.player).length>0){
      // 打本源：玩家场上有存活神兽 → 暂停，等玩家选择防御或放弃
      ui.mode="defend"; ui.pending={s:it.s, atk:it.atk};
      renderAll();
      logMsg(`${it.s.name} 即将攻击你的本源！点击我方神兽挺身防御，或放弃防御。`,"e");
      return;
    } else {
      attackHpExec(G.ai, it.s, it.atk);
      aiAtkQueue.shift();
    }
  }
  aiSkillPhase();
  aiEndPhase();
}
function aiResumeDefend(blockerIdx){
  if(G.ended) return;
  const it = aiAtkQueue[0];
  if(!it){ aiProcessAttacks(); return; }
  if(blockerIdx===null){
    attackHpExec(G.ai, it.s, it.atk);
  } else {
    const b = G.player.field[blockerIdx];
    if(b && b.hp>0 && !b.sick){ b.defended = true; logMsg(`${b.name} 挺身防御，代为承受攻击。`,"g"); }
    attackExec(G.ai, it.s, G.player, blockerIdx, it.atk);
  }
  aiAtkQueue.shift();
  uiReset(); renderAll();
  aiProcessAttacks();
}
function aiPickBlocker(side, atk, attElement){
  const cands = side.field.map((s,i)=>({s,i})).filter(x=>x.s && x.s.hp>0 && !x.s.attacked && !x.s.defended && !x.s.frozen && !x.s.sick);
  if(!cands.length) return null;
  const dmg = (t)=>{ const m=getCounterMod(attElement, t.element); return Math.max(CFG.minDamage, atk+m); };
  cands.sort((a,b)=>{
    const al = a.s.hp>dmg(a.s), bl = b.s.hp>dmg(b.s);
    if(al!==bl) return al?-1:1;
    return b.s.atk - a.s.atk;
  });
  return cands[0].i;
}
function resolveHpAttackBy(attSide, attIdx, blockerIdx){
  const s = attSide.field[attIdx];
  if(!s){ uiReset(); renderAll(); return {ok:false, reason:"state"}; }
  const opp = attSide===G.player?G.ai:G.player;
  if(blockerIdx===null || blockerIdx===undefined){
    attackHpExec(attSide, s, effAtk(s, attSide));
  } else {
    const b = opp.field[blockerIdx];
    if(b && b.hp>0 && !b.sick){ b.defended = true; logMsg(`${b.name} 挺身防御，代为承受攻击。`,"g"); }
    attackExec(attSide, s, opp, blockerIdx, effAtk(s, attSide));
  }
  uiReset(); renderAll();
  return {ok:true};
}
function resolveDefend(blockerIdx){
  if(ui.pending.hpReq){
    const attRole=ui.pending.hpReq.attRole, attIdx=ui.pending.hpReq.attIdx;
    resolveHpAttackBy(localSide(attRole), attIdx, blockerIdx);
    pvpSend({t:"act", a:{t:"defendRes", attRole:attRole, attIdx:attIdx, blockerIdx:blockerIdx, role:G.role}});
  } else if(ui.pending.hpAtt){
    resolveHpAttackBy(ui.pending.hpAtt.attSide, ui.pending.hpAtt.attIdx, blockerIdx);
  } else {
    aiResumeDefend(blockerIdx);
  }
}
function aiSkillPhase(){
  if(G.ended) return;
  G.ai.field.forEach(s=>{
    if(G.ended || !s || !s.broken || s.skillUsed) return;
    const sk = s.skill;
    if(!sk || G.ai.poshi < sk.cost) return;
    if(sk.type==="damage" && fieldCreatures(G.player).length>0){
      const t = fieldCreatures(G.player)[0]; const idx = G.player.field.indexOf(t);
      skillEffect(G.ai, s, idx);
    } else if(sk.type==="damageHp" || sk.type==="allEnemy"){
      skillEffect(G.ai, s, null);
    }
  });
}
function aiEndPhase(){
  if(G.ended) return;
  settleEnd(G.ai);
  if(G.ended) return;
  G.active = "player";
  G.turn++; // SHANHAIPO-006：回到 1P 视为一轮，轮次在此 +1（与 endTurn/executeAct 口径一致）
  if(G.turn > CFG.maxTurns){ finalByTurns(); return; }
  startTurn(G.player);
  renderAll();
  logMsg(`—— 回合 ${G.turn}：你的回合 ——`,"s");
  animTurn(`你的回合 ${G.turn}`);
}
function attackExec(attSide, s, defSide, idx, atk){
  // 拒绝结构化（T1-A4）：目标非法拒绝且不消耗行动
  if(!s || !defSide || !defSide.field[idx]) return {ok:false, reason:"target"};
  s.attacked = true;
  s.didDamageThisTurn = true;
  EV({anim:"lunge", side:attSide, idx:attSide.field.indexOf(s)});
  dealDamage(attSide, {name:s.name, element:s.element, side:attSide===G.player?"player":"ai", broken:s.broken, skillBonus:s.skillBonus||0}, defSide, idx, atk, false);
  return {ok:true};
}
function attackHpExec(attSide, s, atk){
  if(!s) return {ok:false, reason:"state"};
  s.attacked = true;
  s.didDamageThisTurn = true;
  EV({anim:"lunge", side:attSide, idx:attSide.field.indexOf(s)});
  damageHpRaw(attSide===G.player?G.ai:G.player, atk, s.name);
  return {ok:true};
}

