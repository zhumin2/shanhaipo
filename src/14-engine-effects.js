/* ============ 神器 / 破势技执行（拒绝结构化 T1-A4：返回 {ok,reason}，非法输入零状态变更） ============ */
function artifactEffect(card, targetInfo, casterSide){
  casterSide = casterSide || "player";
  const caster = casterSide==="player" ? G.player : G.ai;
  const opp = casterSide==="player" ? G.ai : G.player;
  const fx = card.effect;
  if(fx.type==="damage"){
    if(fx.target==="enemyCreature"){
      const t = opp.field[targetInfo];
      if(!t){ EV({log:"目标不存在。",k:"e"}); return {ok:false, reason:"target"}; }
      dealDamage(caster, {name:card.name, element:card.element, side:casterSide, broken:false, skillBonus:0}, opp, targetInfo, fx.value, true);
    }
  } else if(fx.type==="damageHp"){
    damageHpRaw(opp, fx.value, card.name);
  } else if(fx.type==="damageHpCond"){
    let d = fx.value;
    if(fieldCreatures(caster).some(s=>s.element==="火")){ d += 2; EV({log:`${card.name}：火系神兽在场，额外 −2。`,k:"g"}); }
    damageHpRaw(opp, d, card.name);
  } else if(fx.type==="heal"){
    const t = caster.field[targetInfo];
    if(!t){ EV({log:"目标不存在。",k:"e"}); return {ok:false, reason:"target"}; }
    t.hp += fx.value; EV({log:`${card.name} 使 ${t.name} 恢复 ${fx.value} 点生命。`,k:"g"});
  } else if(fx.type==="buffHp"){
    const t = caster.field[targetInfo];
    if(!t){ EV({log:"目标不存在。",k:"e"}); return {ok:false, reason:"target"}; }
    t.hp += fx.value; EV({log:`${card.name} 使 ${t.name} 生命 +${fx.value}。`,k:"g"});
  } else if(fx.type==="seal"){
    const t = opp.field[targetInfo];
    if(!t){ EV({log:"目标不存在。",k:"e"}); return {ok:false, reason:"target"}; }
    if(!t.broken){ EV({log:`${card.name}：${t.name} 并非破封态，镇封无效。`,k:"s"}); return {ok:false, reason:"state"}; }
    doSeal(opp, targetInfo);
  }
  return {ok:true};
}
const SKILL_NEED_TARGET = ["damage","freeze","enemyAtkDown","destroyLe3"];
function skillEffect(side, caster, targetInfo){
  const sk = caster && caster.skill;
  if(!sk){ return {ok:false, reason:"noskill"}; }
  if(!caster.broken){ return {ok:false, reason:"state"}; }              // 未破封无破势技
  if(caster.skillUsed){ return {ok:false, reason:"used"}; }             // 本回合已用（原先会重复扣破势）
  if(side.poshi < sk.cost){ EV({log:"破势不足。",k:"e"}); return {ok:false, reason:"poshi"}; }
  const opp = side===G.player ? G.ai : G.player;
  if(SKILL_NEED_TARGET.indexOf(sk.type)>=0 && !opp.field[targetInfo]){ return {ok:false, reason:"target"}; } // 扣费前校验（原先白扣破势）
  side.poshi -= sk.cost;
  caster.skillUsed = true;
  G.stats.skills++;
  switch(sk.type){
    case "allEnemy": {
      fieldCreatures(opp).forEach(t=>{
        const d = Math.max(1, sk.value);
        dealDamage(side, {name:caster.name, element:caster.element, side:side===G.player?"player":"ai", broken:true, skillBonus:0}, opp, opp.field.indexOf(t), d, true);
      });
      break;
    }
    case "enemyAtkDown": {
      const t = opp.field[targetInfo];
      if(!t){ return {ok:false, reason:"target"}; }
      t.turnAtkBuff = (t.turnAtkBuff||0) - sk.value;
      t.frozen = true; // 原型：攻击下降以"本回合无法攻击"简化实现冻结类
      EV({log:`${caster.name} 的「${sk.name}」：${t.name} 本回合攻击 −${sk.value}。`,k:"e"});
      break;
    }
    case "selfAtkUp": {
      caster.skillBonus = (caster.skillBonus||0) + sk.value;
      EV({log:`${caster.name} 的「${sk.name}」：本回合攻击 +${sk.value}。`,k:"g"});
      break;
    }
    case "buffAll": {
      fieldCreatures(side).forEach(t=>{ t.hp += sk.value; t.skillBonus=(t.skillBonus||0)+sk.value; });
      EV({log:`${caster.name} 的「${sk.name}」：友方神兽 +${sk.value}/+${sk.value}。`,k:"g"});
      break;
    }
    case "draw": { draw(side, sk.value); break; }
    case "healHp": { side.hp = Math.min(CFG.hp, side.hp+sk.value); EV({log:`${caster.name} 的「${sk.name}」：本源恢复 ${sk.value}。`,k:"g"}); break; }
    case "damageHp": { damageHpRaw(opp, sk.value, caster.name+"·"+sk.name); break; }
    case "damage": {
      const t = opp.field[targetInfo];
      if(!t){ return {ok:false, reason:"target"}; }
      dealDamage(side, {name:caster.name, element:caster.element, side:side===G.player?"player":"ai", broken:true, skillBonus:0}, opp, targetInfo, sk.value, true);
      break;
    }
    case "freeze": {
      const t = opp.field[targetInfo];
      if(!t){ return {ok:false, reason:"target"}; }
      t.frozen = true;
      EV({log:`${caster.name} 的「${sk.name}」：${t.name} 本回合无法攻击。`,k:"e"});
      break;
    }
    case "destroyLe3": {
      const t = opp.field[targetInfo];
      if(!t){ return {ok:false, reason:"target"}; }
      if(t.hp<=3){ killCreature(opp, targetInfo); EV({log:`${caster.name} 的「${sk.name}」吞噬了 ${t.name}。`,k:"e"}); }
      else { EV({log:`${t.name} 生命 ${t.hp} > 3，吞噬失败。`,k:"s"}); }
      break;
    }
  }
  EV({anim:"skill", side, idx:side.field.indexOf(caster)});
  return {ok:true};
}

