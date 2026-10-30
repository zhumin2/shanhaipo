/* ============ 破封 / 镇封 / 狂性 ============ */
function breakCost(cost){
  if(cost<=2) return CFG.breakLow;
  if(cost<=4) return CFG.breakMid;
  return CFG.breakHigh;
}
function canBreak(side, slotIdx){
  const s = side.field[slotIdx];
  if(!s || s.kind==="artifact") return false;
  if(s.broken) return false;
  if(side.brokenFlags[s.id] || side.sealedFlags[s.id]) return false;
  return true;
}
function doBreak(side, slotIdx){
  const s = side.field[slotIdx];
  const cost = breakCost(s.cost);
  if(side.poshi < cost){ EV({log:`破势不足（需 ${cost}）。`,k:"e"}); return; }
  side.poshi -= cost;
  s.broken = true;
  s.atk += CFG.breakAtk; s.hp += CFG.breakHp;
  side.brokenFlags[s.id] = true;
  s.skillUsed = false;
  G.stats.breaks++;
  EV({log:`${s.name} 破封觉醒！${s.atk-CFG.breakAtk}/${s.hp-CFG.breakHp} → ${s.atk}/${s.hp}，获得破势技「${s.skill? s.skill.name:"—"}」。`,k:"p"});
  EV({anim:"break", side, idx:slotIdx});
}
function doSeal(side, slotIdx){
  const s = side.field[slotIdx];
  if(!s || !s.broken) return false;
  s.broken = false;
  s.atk -= CFG.breakAtk; s.hp -= CFG.breakHp;
  side.sealedFlags[s.id] = true;
  G.stats.sealed++;
  EV({log:`${s.name} 被镇封，翻回封印态，本局不可再破封。`,k:"e"});
  EV({anim:"seal", side, idx:slotIdx});
  return true;
}

