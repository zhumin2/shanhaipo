/* ============ 渲染 ============ */
function cardHtml(card, opts){
  opts = opts||{};
  const el = ECOLOR[card.element]||"#888";
  let name = card.name;
  let extra = "";
  if(card.broken){ name = card.name+"·破封"; }
  if(opts.sealed){ extra = `<span style="color:#8A7B5E;font-size:10px;margin-left:4px;">已镇封</span>`; } // 镇封标记经 opts 传入（数据在 side.sealedFlags，见 TDD-02）
  const atk = card.atk + (opts.atkMod||0);
  const hp = card.hp;
  const skillTxt = card.skill ? `「${card.skill.name}」${card.skill.cost}破势` : "";
  return `<div class="card${card.broken?" broken":""}${opts.extraCls||""}" ${opts.attr||""}>
    ${ART[card.id]?`<img class="card-art" src="${ART[card.id]}" alt="">`:""}
    <div class="cinfo">
    <div class="cname"><span class="element-tag" style="background:${el};">${card.element}</span>${name}${extra}</div>
    <div class="cmeta">${card.cost}费 · ${card.aura||"神器"}${card.broken?` · ${skillTxt}`:""}</div>
    ${card.kind==="creature"?
      `<div class="ceffect">${card.effect?card.effect.desc:"—"}${card.broken?`<br>破势技：${card.skill?card.skill.desc:""}`:""}</div>
       <div class="stats"><span class="stat atk">攻${atk}</span><span class="stat hp">命${hp}</span>${card.broken?`<span class="stat" style="color:#A63244;">狂性</span>`:""}</div>`:
      `<div class="ceffect">${card.effect?card.effect.desc:"—"}</div>`}
    </div>
  </div>`;
}
function renderField(sideEl, side, isPlayer){
  const holder = document.getElementById(sideEl);
  holder.innerHTML = "";
  side.field.forEach((s,idx)=>{
    const slot = document.createElement("div");
    slot.className = "slot" + (s?" occupied":"");
    if(!s){
      slot.innerHTML = `<div class="slot-tag">灵位 ${idx+1}</div>`;
      if(!isPlayer){ slot.addEventListener("click", ()=> onSlotClick(side, idx)); }
    } else {
      const auraMod = isPlayer ? (auraXiong(side)?1:0) : (auraXiong(side)?1:0);
      const atkMod = auraMod + (s.skillBonus||0) + (s.turnAtkBuff||0);
      let flags = [];
      if(s.sick) flags.push("无法行动");
      if(s.attacked) flags.push("已攻击");
      if(s.defended) flags.push("已行动");
      if(s.frozen) flags.push("冻结");
      if(s.tauntTurn) flags.push("守护");
      if(!s.sick && !s.attacked && !s.defended && !s.frozen) flags.push("待命");
      slot.innerHTML = cardHtml(s, {atkMod, sealed:!!side.sealedFlags[s.id]}) + (flags.length?`<div class="slot-tag">${flags.join(" · ")}</div>`:`<div class="slot-tag"></div>`);
      slot.dataset.slotIdx = idx;
      slot.addEventListener("click", ()=> onSlotClick(side, idx));
    }
    holder.appendChild(slot);
  });
}
function renderHand(){
  const area = document.getElementById("myHandArea");
  const hint = document.getElementById("handHint");
  const title = document.getElementById("handTitle");
  area.innerHTML = "";
  const me = mySide();
  const mine = canActNow();
  title.textContent = mine ? (G.mode==="hotseat" ? `手牌（${sideLabel(me)}）` : "手牌") : "手牌（等待行动方）";
  me.hand.forEach((cid,hi)=>{
    const card = CARDS.find(c=>c.id===cid);
    const playable = card.cost <= me.mana;
    const wrap = document.createElement("div");
    wrap.innerHTML = cardHtml(card, {});
    const div = wrap.firstChild;
    div.className += (playable?" playable":" notplay") + (ui.selCard===cid?" selected":"");
    div.style.cursor = playable?"pointer":"not-allowed";
    div.addEventListener("click", ()=>{ if(!canActNow()||G.ended) return; onHandClick(hi, playable); });
    area.appendChild(div);
  });
  hint.textContent = mine ? `灵气 ${me.mana}/${me.manaCap} · 手牌 ${me.hand.length}` : (G.mode==="hotseat" ? `等待 ${sideLabel(me)} 操作…` : "等待对方…");
}
function renderMeters(){
  const set=(id,txt)=>document.getElementById(id).textContent=txt;
  const me = mySide(), opp = oppSide();
  set("myHp",me.hp); set("aiHp",opp.hp); set("myMana",me.mana); set("aiMana",opp.mana);
  set("myPoshi",me.poshi); set("aiPoshi",opp.poshi); set("myHand",me.hand.length); set("aiHand",opp.hand.length);
  document.getElementById("myHpBar").style.width=(me.hp/CFG.hp*100)+"%";
  document.getElementById("aiHpBar").style.width=(opp.hp/CFG.hp*100)+"%";
  document.getElementById("myPoshiBar").style.width=(me.poshi/CFG.poshiCap*100)+"%";
  document.getElementById("aiPoshiBar").style.width=(opp.poshi/CFG.poshiCap*100)+"%";
  const tTag = document.getElementById("turnTag");
  if(G.mode==="ai"){ tTag.textContent = `回合 ${G.turn} · ${G.active==="player"?"你的回合":"敌方回合"}`; }
  else if(G.mode==="hotseat"){ tTag.textContent = `回合 ${G.turn} · ${G.active==="player"?"1P 回合":"2P 回合"}`; }
  else { tTag.textContent = `回合 ${G.turn} · ${canActNow()?"你的回合":"对方回合"}`; }
  const myZT=document.getElementById("myZoneTitle"), aiZT=document.getElementById("aiZoneTitle");
  if(G.mode==="hotseat"){ myZT.textContent="1P 战场（下方）"; aiZT.textContent="2P 战场（上方）"; }
  else if(G.mode==="pvp"){
    const meName = (typeof UserSys!=="undefined" && UserSys.profile) ? UserSys.profile.nickname : "";
    const opName = (typeof UserSys!=="undefined" && UserSys.oppName) ? UserSys.oppName : "";
    myZT.textContent = meName ? `${meName}（你）` : (G.role==="p1"?"1P 战场（你）":"2P 战场（你）");
    aiZT.textContent = opName ? `${opName}（对方）` : (G.role==="p1"?"2P 战场（对方）":"1P 战场（对方）");
  }
  else { myZT.textContent="你的战场"; aiZT.textContent="敌方（AI）"; }
  document.getElementById("myDeckInfo").textContent = `· 牌库 ${me.deck.length}`;
  document.getElementById("aiDeckInfo").textContent = `· 牌库 ${opp.deck.length}`;
}
function renderAll(){
  if(G.mode==="pvp" && (!G.player || !G.ai)) return;
  const me = mySide(), opp = oppSide();
  renderMeters();
  renderField("myField", me, true);
  renderField("aiField", opp, false);
  renderHand();
  renderActionBar();
  renderDebug();
  EVflush();
}
function renderActionBar(){
  const bar = document.getElementById("actionBar");
  const hint = document.getElementById("actionHint");
  bar.innerHTML = "";
  const me = mySide(), opp = oppSide();
  const mine = canActNow();
  const endBtn = document.createElement("button");
  endBtn.className = "btn primary"; endBtn.textContent="结束回合";
  endBtn.onclick = ()=>{ if(canActNow()) endTurn(); };
  endBtn.disabled = !mine||G.ended||G.waitingPeer;
  bar.appendChild(endBtn);

  if(ui.mode==="defend"){
    hint.textContent = `敌方（${sideLabel(opp)}）神兽来袭：点击己方可行动神兽挺身防御（本回合部署的无法行动），或放弃防御`;
    const give=document.createElement("button"); give.className="btn small alert"; give.textContent="放弃防御（本源承受）";
    give.onclick=()=>{ resolveDefend(null); };
    bar.appendChild(give);
    return;
  }
  if(G.waitingPeer){ hint.textContent="等待对方选择防御…"; return; }
  if(!mine||G.ended){ hint.textContent = G.mode==="hotseat" ? `等待 ${sideLabel(me)} 操作…` : "等待中…"; return; }
  if(ui.mode==="attack"){
    hint.textContent = "选择攻击目标：敌方灵位神兽或敌方本源（点击本源条右侧攻击按钮）";
    const hpBtn = document.createElement("button");
    hpBtn.className="btn small"; hpBtn.textContent="攻击敌方本源";
    hpBtn.onclick=()=>{ const s=me.field[ui.selField]; if(s){
      const bs = fieldCreatures(opp);
      if(bs.length>0){
        if(G.mode==="ai"){
          resolveHpAttackBy(me, ui.selField, aiPickBlocker(opp, effAtk(s, me), s.element));
        } else if(G.mode==="hotseat"){
          ui.mode="defend"; ui.pending={hpAtt:{attSide:me, attIdx:ui.selField}};
          renderAll(); logMsg(`${s.name} 即将攻击 ${sideLabel(opp)} 本源！由 ${sideLabel(opp)} 选择防御。`,"e");
        } else {
          const _ai1 = ui.selField;
          G.waitingPeer=true; uiReset(); renderAll();
          pvpAct({t:"hpReq", attIdx:_ai1});
          logMsg("等待对方选择防御…","s");
        }
        return;
      }
      const _ai0 = ui.selField;
      resolveHpAttackBy(me, _ai0, null);
      if(G.mode==="pvp"){ pvpAct({t:"hpDirect", attIdx:_ai0}); }
    } };
    bar.appendChild(hpBtn);
    const cancel=document.createElement("button"); cancel.className="btn small"; cancel.textContent="取消";
    cancel.onclick=()=>{ uiReset(); renderAll(); };
    bar.appendChild(cancel);
  } else if(ui.selField!==null && me.field[ui.selField]){
    const s = me.field[ui.selField];
    hint.textContent = `${s.name}：选择操作`;
    const atkBtn=document.createElement("button"); atkBtn.className="btn"; atkBtn.textContent="攻击";
    atkBtn.disabled = s.attacked||s.defended||s.frozen||s.sick;
    atkBtn.onclick=()=>{ if(!(s.attacked||s.defended||s.frozen||s.sick)){ ui.mode="attack"; renderActionBar(); } };
    bar.appendChild(atkBtn);
    if(canBreak(me, ui.selField)){
      const brBtn=document.createElement("button"); brBtn.className="btn"; brBtn.textContent=`破封（${breakCost(s.cost)}破势）`;
      brBtn.disabled = me.poshi < breakCost(s.cost);
      brBtn.onclick=()=>{ const _si=ui.selField; doBreak(me, _si); pvpAct({t:"brk", slotIdx:_si}); uiReset(); renderAll(); };
      bar.appendChild(brBtn);
    }
    if(s.broken && s.skill && !s.skillUsed){
      const skBtn=document.createElement("button"); skBtn.className="btn"; skBtn.textContent=`破势技·${s.skill.name}（${s.skill.cost}）`;
      skBtn.disabled = me.poshi < s.skill.cost;
      skBtn.onclick=()=>{
        if(["damage","freeze","enemyAtkDown","destroyLe3"].includes(s.skill.type)){
          ui.mode="skill"; ui.pending={caster:ui.selField}; hint.textContent=`选择「${s.skill.name}」目标`; renderActionBar();
        } else {
          const _ci3 = ui.selField;
          skillEffect(me, s, null);
          pvpAct({t:"skill", casterIdx:_ci3, targetIdx:null});
          uiReset(); renderAll();
        }
      };
      bar.appendChild(skBtn);
    }
    if(s.broken){
      const sealNote = document.createElement("span");
      sealNote.className="hint"; sealNote.textContent="（狂性：本回合未攻击且未用破势技（被冻结豁免），回合结束本源 −1）";
      bar.appendChild(sealNote);
    }
    const cancel=document.createElement("button"); cancel.className="btn small"; cancel.textContent="取消选择";
    cancel.onclick=()=>{ uiReset(); renderAll(); };
    bar.appendChild(cancel);
  } else if(ui.selCard){
    const card = CARDS.find(c=>c.id===ui.selCard);
    if(card.kind==="creature"){
      hint.textContent = `${card.name}：选择灵位部署`;
      const free = me.field.map((s,i)=>s?null:i).filter(i=>i!==null);
      free.forEach(idx=>{
        const b=document.createElement("button"); b.className="btn small"; b.textContent=`部署到灵位${idx+1}`;
        b.onclick=()=>{ playCreature(me, card, idx); pvpAct({t:"deploy", cardId:card.id, slotIdx:idx}); uiReset(); renderAll(); };
        bar.appendChild(b);
      });
    } else {
      hint.textContent = `${card.name}：选择目标`;
      if(card.effect.target==="enemyCreature"){
        ui.mode="artifact"; ui.pending={card:ui.selCard};
        hint.textContent="选择目标：敌方神兽";
      } else if(card.effect.target==="ownCreature"){
        ui.mode="artifactOwn"; ui.pending={card:ui.selCard};
        hint.textContent="选择目标：友方神兽";
      } else {
        const b=document.createElement("button"); b.className="btn"; b.textContent=`使用（本源目标）`;
        b.onclick=()=>{ me.mana-=card.cost; me.hand.splice(me.hand.indexOf(card.id),1); artifactEffect(card, null, me===G.player?"player":"ai"); pvpAct({t:"artifact", cardId:card.id, targetIdx:null}); uiReset(); renderAll(); };
        bar.appendChild(b);
      }
    }
    const cancel=document.createElement("button"); cancel.className="btn small"; cancel.textContent="取消";
    cancel.onclick=()=>{ uiReset(); renderAll(); };
    bar.appendChild(cancel);
  } else {
    hint.textContent="点击手牌部署神兽 / 点击我方神兽操作";
  }
}
function effAtk(s, side){
  side = side || G.player;
  return s.atk + (s.skillBonus||0) + (s.turnAtkBuff||0) + (auraXiong(side)?1:0);
}
function onHandClick(hi, playable){
  if(!playable){ logMsg("灵气不足。","s"); return; }
  ui.selCard = mySide().hand[hi];
  ui.selField = null; ui.mode="idle";
  renderHand(); renderActionBar();
}
function onSlotClick(side, idx){
  if(G.ended) return;
  const me = mySide();
  const isMine = side===me;
  if(ui.mode==="defend"){
    if(!isMine) return;
    const blocker = side.field[idx];
    if(!blocker) return;
    if(blocker.sick){ logMsg(`${blocker.name} 本回合刚部署，无法行动。`,"s"); renderAll(); return; }
    if(blocker.attacked || blocker.defended || blocker.frozen){ logMsg(`${blocker.name} 本回合已行动，无法防御。`,"s"); renderAll(); return; }
    resolveDefend(idx);
    return;
  }
  if(!canActNow()) return;
  if(!isMine){
    const t = side.field[idx];
    if(ui.mode==="attack"){
      if(!t){ logMsg("目标为空。","s"); return; }
      const s = me.field[ui.selField];
      if(!s){ uiReset(); renderAll(); return; }
      const _ai2 = ui.selField;
      attackExec(me, s, side, idx, effAtk(s, me));
      pvpAct({t:"atk", attIdx:_ai2, defIdx:idx});
      uiReset(); renderAll(); return;
    }
    if(ui.mode==="skill"){
      const s = me.field[ui.pending.caster];
      if(!s){ uiReset(); renderAll(); return; }
      if(!t){ logMsg("目标为空。","s"); return; }
      const _ci = ui.pending.caster;
      skillEffect(me, s, idx);
      pvpAct({t:"skill", casterIdx:_ci, targetIdx:idx});
      uiReset(); renderAll(); return;
    }
    if(ui.mode==="artifact"){
      if(!t){ logMsg("目标为空。","s"); return; }
      const card = CARDS.find(c=>c.id===ui.pending.card);
      const _ci2 = card.id;
      me.mana-=card.cost; me.hand.splice(me.hand.indexOf(card.id),1);
      artifactEffect(card, idx, me===G.player?"player":"ai");
      pvpAct({t:"artifact", cardId:_ci2, targetIdx:idx});
      uiReset(); renderAll(); return;
    }
    return;
  }
  // 我方区域
  if(ui.mode==="artifactOwn"){
    const card = CARDS.find(c=>c.id===ui.pending.card);
    me.mana-=card.cost; me.hand.splice(me.hand.indexOf(card.id),1);
    artifactEffect(card, idx, me===G.player?"player":"ai");
    pvpAct({t:"artifact", cardId:card.id, targetIdx:idx});
    uiReset(); renderAll(); return;
  }
  if(!side.field[idx]) return;
  ui.selField = idx; ui.selCard=null; ui.mode="idle";
  renderAll();
}
function onMySlotClick(idx){ onSlotClick(G.player, idx); }
function onEnemySlotClick(idx){ onSlotClick(G.ai, idx); }
function uiReset(){ ui.selCard=null; ui.selField=null; ui.mode="idle"; ui.pending={}; }

