/* ============ 战斗结算（按 GDD 4.6 顺序：伤害→死亡→破势） ============ */
function getCounterMod(atkEl, defEl){
  if(!atkEl||!defEl) return 0;
  if(COUNTER[atkEl]===defEl) return CFG.counterBonus;
  if(COUNTER[defEl]===atkEl) return -CFG.counterPenalty;
  return 0;
}
function creatureAtk(side){
  const aura = side.field.filter(s=>s&&s.aura==="凶").length>=2 ? 1 : 0;
  return aura; // 凶煞羁绊：攻击 +1
}
function auraXiang(side){ return side.field.filter(s=>s&&s.aura==="祥").length>=2; }
function auraXiong(side){ return side.field.filter(s=>s&&s.aura==="凶").length>=2; }

function slotCard(side, i){ return side.field[i]; }
function fieldCreatures(side){ return side.field.filter(s=>s&&s.hp>0); }

function dealDamage(attackerSide, attacker, defSide, defSlotIdx, base, isSkill){
  // attacker: {element, atk, broken, skillBonus} 或 null（法术）
  let dmg = base;
  const def = defSide==="hp" ? null : defSide.field[defSlotIdx];
  if(attacker && def){
    const mod = getCounterMod(attacker.element, def.element);
    dmg = Math.max(CFG.minDamage, base + mod);
    G.stats.attacks++;
    if(mod>0){ G.stats.counterAttacks++; EV({log:`五行克制：${attacker.name}（${attacker.element}）克制 ${def.name}（${def.element}），伤害 +1。`,k:"g"}); }
    if(mod<0){ EV({log:`五行被克：${attacker.name}（${attacker.element}）被 ${def.name}（${def.element}）克制，伤害 −1。`,k:"e"}); }
  }
  if(def){
    def.hp -= dmg;
    EV({anim:"hit", side:defSide, idx:defSlotIdx, n:dmg, c:dmg>base?"#C9A227":(dmg<base?"#8B5C3E":"#C0392B")});
    EV({log:`${attacker?attacker.name:"效果"} 对 ${def.name} 造成 ${dmg} 点伤害${mod2str(attacker,def)}。`});
    // 破势：按伤害事件 floor(X/3)
    if(attacker && attacker.side==="player"){ gainPoshi(G.player, dmg, attacker); }
    if(attacker && attacker.side==="ai"){ gainPoshi(G.ai, dmg, attacker); }
    if(def.hp<=0){ killCreature(defSide, defSlotIdx); }
  } else {
    // 打本源
    if(defSide==="hp"){
      const side = attacker ? (attacker.side==="player"?G.ai:G.player) : null;
      damageHpRaw(side, dmg, attacker?attacker.name:"效果");
    }
  }
}
function mod2str(a,d){ if(!a||!d) return ""; const m=getCounterMod(a.element,d.element); return m>0?"（克制）":(m<0?"（被克）":""); }

function gainPoshi(side, dmg, attacker){
  if(!attacker.broken && attacker.skillBonus){} // 破势仅神兽普通攻击计入（原型：攻击与神兽效果均计）
  const gain = Math.floor(dmg / CFG.poshiPer);
  if(gain>0){
    const before = side.poshi;
    side.poshi = Math.min(CFG.poshiCap, side.poshi + gain);
    EV({log:`${side===G.player?"你":"敌方"}获得 ${side.poshi-before} 点破势（本次伤害 ${dmg}）。`,k:"p"});
  }
}
function damageHpRaw(side, dmg, src){
  if(!side) return;
  let d = Math.max(0, dmg); // 攻被减益至 ≤0 时不得为负（负伤害=回血，见技术设计文档 TDD-03）
  if(side.field.some(s=>s&&s.effect&&s.effect.fx==="hpReduce")){ d = Math.max(0, d-1); EV({log:`${src}：玄武减伤生效，本源实际 −${d}。`,k:"s"}); }
  if(side.immune && d >= side.hp){ // 刑天亡语「断首犹战」：下一次致命伤害被抵消（SHANHAIPO-006 / TDD-16）
    side.immune = false;
    EV({log:`${src} 的致命伤害被「断首犹战」抵消！`,k:"g"});
    return;
  }
  side.hp = Math.max(0, side.hp - d);
  EV({anim:"hp", side, n:d});
  EV({log:`${src} 使${side===G.player?"你的":"敌方"}本源 −${d}。`,k:"e"});
  checkEnd();
}
function killCreature(sideObj, idx){
  const s = sideObj.field[idx];
  if(!s) return;
  sideObj.field[idx] = null;
  sideObj.grave.push(s.id);
  EV({log:`${s.name} 阵亡。`,k:"e"});
  if(s.effect && s.effect.fx==="reshuffle"){ sideObj.deck.unshift(s.id); shuffle(sideObj.deck); EV({log:`${s.name}（精卫）衔石填海，洗回牌库。`,k:"g"}); }
  if(s.effect && s.effect.fx==="draw"){ draw(sideObj, s.effect.value||1); }
  if(s.effect && s.effect.fx==="immuneOnce"){ sideObj.immune = true; EV({log:`${s.name}（刑天）断首犹战：你下一次致命伤害将被抵消。`,k:"g"}); }
}

