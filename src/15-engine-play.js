/* ============ 出牌 ============ */
function playCreature(side, card, slotIdx){
  const s = { id:card.id, name:card.name, cost:card.cost, atk:card.atk, hp:card.hp, element:card.element, aura:card.aura, kind:"creature",
    effect:card.effect, skill:card.skill, broken:false, attacked:false, defended:false, frozen:false, skillUsed:false, skillBonus:0, turnAtkBuff:0, didDamageThisTurn:false, sick:true };
  side.field[slotIdx] = s;
  side.mana -= card.cost;
  const _hi = side.hand.indexOf(card.id);
  if(_hi>=0){ side.hand.splice(_hi,1); }
  // 进场效果
  if(card.effect && card.effect.type==="onEnter"){
    if(card.effect.fx==="peek"){
      const oppHand = (side===G.player?G.ai:G.player).hand;
      if(oppHand.length>0){ EV({log:`${card.name}（白泽）通晓万物：窥见对手手牌「${CARDS.find(c=>c.id===oppHand[0]).name}」。`,k:"p"}); }
    } else if(card.effect.fx==="damageHp"){
      const opp = side===G.player?G.ai:G.player;
      damageHpRaw(opp, card.effect.value, card.name);
    } else if(card.effect.fx==="damageEnemy"){
      const opp = side===G.player?G.ai:G.player;
      const targets = fieldCreatures(opp);
      if(targets.length>0){
        const t = targets.reduce((a,b)=>a.hp<b.hp?a:b);
        const idx = opp.field.indexOf(t);
        dealDamage(side, {name:card.name, element:card.element, side:side===G.player?"player":"ai", broken:false, skillBonus:0}, opp, idx, card.effect.value, true);
      }
    } else if(card.effect.fx==="allyAtkUp"){
      fieldCreatures(side).forEach(t=>{ if(t!==s){ t.turnAtkBuff=(t.turnAtkBuff||0)+card.effect.value; } });
      EV({log:`${card.name}（乘黄）：友方神兽本回合 +${card.effect.value} 攻击。`,k:"g"});
    } else if(card.effect.fx==="enemyAtkDown"){
      const opp = side===G.player?G.ai:G.player;
      const targets = fieldCreatures(opp);
      if(targets.length>0){
        const t = targets[0];
        t.turnAtkBuff=(t.turnAtkBuff||0)-card.effect.value;
        EV({log:`${card.name}（獬豸）：${t.name} 本回合攻击 −${card.effect.value}。`,k:"e"});
      }
    }
  }
  EV({anim:"summon", side, idx:slotIdx});
}

