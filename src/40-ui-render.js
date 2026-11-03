/* ============ 渲染 ============ */
// 战场卡面（v2.0 布局重构）：插画铺满 + 费用角标 + 大数值压角，信息密度高于横版列表卡
function cardFaceHtml(card, atkMod, sealed){
  const el = ECOLOR[card.element]||"#888";
  const atk = card.atk + (atkMod||0);
  const tipParts = [];
  if(card.effect && card.effect.desc) tipParts.push(card.effect.desc);
  if(card.broken && card.skill) tipParts.push(`破势技「${card.skill.name}」${card.skill.cost}破势：${card.skill.desc}`);
  if(sealed) tipParts.push("已镇封：本局不可再破封");
  const tip = (card.name + (tipParts.length ? "\n" + tipParts.join("\n") : "")).replace(/"/g,"&quot;");
  return `<div class="card face${card.broken?" broken":""}" title="${tip}">
    ${ART[card.id]?`<img class="card-art" src="${ART[card.id]}" alt="">`:""}
    <div class="face-grad"></div>
    <div class="face-top">
      <span class="cost-badge">${card.cost}</span>
      <span class="el-dot" style="background:${el};"></span>
      <span class="face-name">${card.name}${card.broken?"·破封":""}</span>
    </div>
    <div class="face-bottom">
      <span class="pv atk">${atk}</span>
      <span class="pv hp">${card.hp}</span>
      ${card.broken?`<span class="pv rage">狂</span>`:""}
    </div>
  </div>`;
}
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
    // 状态可视化（v1.7）：ready=可行动金环 / acted=已行动压暗 / frozen=冰蓝 / brk=破封赤环
    let cls = "slot" + (s?" occupied":"");
    if(s){
      if(!s.sick && !s.attacked && !s.defended && !s.frozen) cls += " ready";
      if(s.sick || s.attacked || s.defended) cls += " acted";
      if(s.frozen) cls += " frozen";
      if(s.broken) cls += " brk";
    }
    slot.className = cls;
    slot.dataset.slotIdx = idx;   // 空/占用灵位都带下标：动画定位（阵亡飘字）与点击测试均依赖
    // 可投放提示（v1.9）：选中神兽手牌时，己方空灵位发光并可点/拖放
    let isDrop = false;
    if(!s && isPlayer && ui.selCard){
      const sc = CARDS.find(c=>c.id===ui.selCard);
      if(sc && sc.kind==="creature" && canActNow()){
        isDrop = true;
        slot.className = cls + " dropzone";
        slot.addEventListener("dragover", (e)=>{ e.preventDefault(); slot.classList.add("dragover"); });
        slot.addEventListener("dragleave", ()=> slot.classList.remove("dragover"));
        slot.addEventListener("drop", (e)=>{ e.preventDefault(); slot.classList.remove("dragover"); deployToSlot(idx); });
      }
    }
    // 合法目标提示：攻击/破势技/敌我神器选目标时高亮
    if(s && ((ui.mode==="attack"||ui.mode==="skill"||ui.mode==="artifact") && !isPlayer
             || (ui.mode==="artifactOwn" && isPlayer))){
      slot.className += " targetable";
    }
    if(!s){
      slot.innerHTML = `<div class="slot-empty">
        <span class="plus">＋</span>
        <span class="lbl">${isDrop ? "点击部署至此" : "灵位 "+(idx+1)}</span>
      </div>`;
      if(!isPlayer || (ui.selCard && (CARDS.find(c=>c.id===ui.selCard)||{}).kind==="creature")){
        slot.addEventListener("click", ()=> onSlotClick(side, idx));
      }
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
      slot.innerHTML = cardFaceHtml(s, atkMod, !!side.sealedFlags[s.id])
        + (flags.length?`<div class="slot-tag">${flags.join(" · ")}</div>`:`<div class="slot-tag"></div>`);
      slot.addEventListener("click", ()=> onSlotClick(side, idx));
      const faceEl = slot.querySelector(".card");
      if(faceEl){
        const def = CARDS.find(c=>c.id===s.id);
        faceEl.addEventListener("mouseenter", ()=> showCardPreview(def, slot, s));   // 战场卡预览（带当前数值）
        faceEl.addEventListener("mouseleave", hideCardPreview);
      }
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
    div.addEventListener("mouseenter", ()=> showCardPreview(card, div));      // v2.1 大图预览
    div.addEventListener("mouseleave", hideCardPreview);
    // 拖拽部署（v1.9）：手牌可拖到己方空灵位
    if(playable && mine && card.kind==="creature"){
      div.setAttribute("draggable","true");
      div.addEventListener("dragstart", (e)=>{
        ui.selCard = cid; ui.selField = null; ui.mode = "idle";
        try{ e.dataTransfer.setData("text/plain", cid); e.dataTransfer.effectAllowed = "move"; }catch(_e){}
        renderActionBar(); renderField("myField", mySide(), true);
      });
      div.addEventListener("dragend", ()=>{ /* 落点失败时保持选中，用户可改点击部署 */ });
    }
    area.appendChild(div);
  });
  // 弧形手牌（v2.0）：按中心偏移给每张牌设定旋转与下沉，越靠边越倾斜
  const n = me.hand.length;
  const step = n > 1 ? Math.min(3.6, 15 / n) : 0;
  for(let i=0;i<area.children.length;i++){
    const off = i - (n-1)/2;
    area.children[i].style.setProperty("--rot", (off*step).toFixed(2)+"deg");
    area.children[i].style.setProperty("--ty", (Math.abs(off)*Math.min(6, 12/n)).toFixed(1)+"px");
  }
  hint.textContent = mine ? `灵气 ${me.mana}/${me.manaCap} · 手牌 ${me.hand.length}` : (G.mode==="hotseat" ? `等待 ${sideLabel(me)} 操作…` : "等待对方…");
}
function renderPips(elId, cur, max){
  const el = document.getElementById(elId);
  if(!el) return;
  if(el.dataset.n !== String(max)){
    el.dataset.n = String(max);
    el.innerHTML = Array.from({length:max}, ()=>'<i class="pip"></i>').join("");
  }
  const kids = el.children;
  for(let i=0;i<kids.length;i++){
    const on = i < cur;
    const had = kids[i].classList.contains("on");
    kids[i].classList.toggle("on", on);
    if(on && !had){ kids[i].classList.remove("pop"); void kids[i].offsetWidth; kids[i].classList.add("pop"); }
  }
}
function renderMeters(){
  const set=(id,txt)=>document.getElementById(id).textContent=txt;
  const me = mySide(), opp = oppSide();
  set("myHp",me.hp); set("aiHp",opp.hp); set("myMana",me.mana); set("aiMana",opp.mana);
  set("myPoshi",me.poshi); set("aiPoshi",opp.poshi); set("myHand",me.hand.length); set("aiHand",opp.hand.length);
  renderPips("myManaPips", me.mana, me.manaCap);        // v2.0：灵气/破势珠子格
  renderPips("myPoshiPips", me.poshi, CFG.poshiCap);
  document.getElementById("myHpBar").style.width=(me.hp/CFG.hp*100)+"%";
  document.getElementById("aiHpBar").style.width=(opp.hp/CFG.hp*100)+"%";
  // 破势条已由珠子格取代（v2.0），保留兼容写法但做存在性保护
  const pb1=document.getElementById("myPoshiBar"), pb2=document.getElementById("aiPoshiBar");
  if(pb1) pb1.style.width=(me.poshi/CFG.poshiCap*100)+"%";
  if(pb2) pb2.style.width=(opp.poshi/CFG.poshiCap*100)+"%";
  const tTag = document.getElementById("turnTag");
  if(G.mode==="ai"){ tTag.textContent = `回合 ${G.turn} · ${G.active==="player"?"你的回合":"敌方回合"}`; }
  else if(G.mode==="hotseat"){ tTag.textContent = `回合 ${G.turn} · ${G.active==="player"?"1P 回合":"2P 回合"}`; }
  else { tTag.textContent = `回合 ${G.turn} · ${canActNow()?"你的回合":"对方回合"}`; }
  // HUD 名称（v1.8：双方本源与阵营名上移到 HUD，战场区标题改为静态标签）
  const myZN = document.getElementById("myHudName"), aiZN = document.getElementById("aiHudName");
  if(myZN && aiZN){
    if(G.mode==="hotseat"){ myZN.textContent = "1P（下方）"; aiZN.textContent = "2P（上方）"; }
    else if(G.mode==="pvp"){
      const meName = (typeof UserSys!=="undefined" && UserSys.profile) ? UserSys.profile.nickname : "";
      const opName = (typeof UserSys!=="undefined" && UserSys.oppName) ? UserSys.oppName : "";
      myZN.textContent = meName ? `${meName}（你）` : (G.role==="p1" ? "1P（你）" : "2P（你）");
      aiZN.textContent = opName ? `${opName}（对方）` : (G.role==="p1" ? "2P（对方）" : "1P（对方）");
    }
    else { myZN.textContent = "你"; aiZN.textContent = "敌方（AI）"; }
  }
  document.getElementById("myDeckInfo").textContent = `· 牌库 ${me.deck.length}`;
  document.getElementById("aiDeckInfo").textContent = `· 牌库 ${opp.deck.length}`;
  // 本源告急可视化（v1.7）：≤10 点时血条红化脉冲
  const hpLowMark = (barId, hp) => {
    const bar = document.getElementById(barId);
    const meter = bar ? bar.closest(".meter") : null;
    if(meter){ meter.classList.toggle("low", hp > 0 && hp <= 10); }
  };
  hpLowMark("myHpBar", me.hp);
  hpLowMark("aiHpBar", opp.hp);
}
function renderAll(){
  if(G.mode==="pvp" && (!G.player || !G.ai)) return;
  if(typeof hideCardPreview==="function") hideCardPreview();
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
  markHudTarget(false);   // 每帧重置本源条高亮，仅在需要的模式下重新点亮
  if(ui.mode!=="attack" && typeof aimClear==="function") aimClear();
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
    hint.textContent = "选择攻击目标：点击敌方神兽，或点击上方敌方本源条直攻本源";
    markHudTarget(true);
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
      // 无按钮式部署：点手牌后直接点己方空灵位（或拖拽牌到灵位）
      hint.textContent = `${card.name}：点击己方发光的空灵位部署（也可拖动手牌到灵位）`;
    } else {
      // 模式已在 onHandClick 中确定；此处只给提示（避免渲染期改状态导致高亮晚一帧）
      if(ui.mode==="artifact"){ hint.textContent=`${card.name}：点击一名敌方神兽`; }
      else if(ui.mode==="artifactOwn"){ hint.textContent=`${card.name}：点击一名友方神兽`; }
      else { hint.textContent=`${card.name}：点击上方敌方本源条施放`; markHudTarget(true); }
    }
    const cancel=document.createElement("button"); cancel.className="btn small"; cancel.textContent="取消";
    cancel.onclick=()=>{ uiReset(); renderAll(); };
    bar.appendChild(cancel);
  } else {
    hint.textContent="点击手牌选牌 → 点空灵位部署；点击我方神兽进行操作";
  }
}
function effAtk(s, side){
  side = side || G.player;
  return s.atk + (s.skillBonus||0) + (s.turnAtkBuff||0) + (auraXiong(side)?1:0);
}
function onHandClick(hi, playable){
  if(!playable){ logMsg("灵气不足。","s"); return; }
  const id = mySide().hand[hi];
  if(ui.selCard === id){ uiReset(); renderAll(); return; }   // 再点同一张 = 取消选择（v1.9）
  ui.selCard = id;
  ui.selField = null;
  ui.mode = "idle";
  const card = CARDS.find(c=>c.id===id);
  if(card && card.kind==="artifact"){                       // 神器：选牌即进入目标模式（v1.9）
    if(card.effect.target==="enemyCreature"){ ui.mode="artifact"; ui.pending={card:id}; }
    else if(card.effect.target==="ownCreature"){ ui.mode="artifactOwn"; ui.pending={card:id}; }
    else { ui.mode="artifactHp"; ui.pending={card:id}; }
  }
  renderAll();
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
  if(!side.field[idx] && ui.selCard){ if(deployToSlot(idx)) return; }   // 点空灵位直接部署（v1.9）
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

/* ===== 无按钮式交互（v1.9）：直攻本源 / 直施本源神器 / 点空位或拖拽部署 ===== */
function markHudTarget(on){
  const h = document.querySelector(".hud-enemy");
  if(h){ h.classList.toggle("targetable", !!on); }
}
function doAttackHp(){
  const me = mySide(), opp = oppSide();
  if(ui.mode!=="attack" || ui.selField===null) return;
  const s = me.field[ui.selField];
  if(!s){ uiReset(); renderAll(); return; }
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
}
function castArtifactNoTarget(card){
  const me = mySide();
  if(!card || me.mana < card.cost || me.hand.indexOf(card.id) < 0) return;
  me.mana -= card.cost; me.hand.splice(me.hand.indexOf(card.id),1);
  artifactEffect(card, null, me===G.player?"player":"ai");
  pvpAct({t:"artifact", cardId:card.id, targetIdx:null});
  uiReset(); renderAll();
}
// 点击上方「敌方本源条」：攻击模式下 = 直攻本源；本源神器 = 直接施放
function onHudEnemyClick(){
  if(G.ended || !canActNow()) return;
  if(ui.mode==="attack"){ doAttackHp(); return; }
  if(ui.mode==="artifactHp"){ castArtifactNoTarget(CARDS.find(c=>c.id===ui.pending.card)); }
}
// 部署到指定灵位（点空位或拖拽落点共用）
function deployToSlot(idx){
  const me = mySide();
  if(!ui.selCard) return false;
  const card = CARDS.find(c=>c.id===ui.selCard);
  if(!card || card.kind!=="creature") return false;
  // 记录手牌位置，用于"飞入灵位"动画（v2.0）
  const srcEl = document.querySelector("#myHandArea .card.selected") || document.querySelector("#myHandArea .card");
  const fromRect = srcEl ? srcEl.getBoundingClientRect() : null;
  const r = playCreature(me, card, idx);
  if(!r || !r.ok){ logMsg("无法部署到该灵位（可能已占用或灵气不足）。","s"); return false; }
  pvpAct({t:"deploy", cardId:card.id, slotIdx:idx});
  uiReset(); renderAll();
  const slotEl = qSlot("myField", idx);
  const cardEl = slotEl ? slotEl.querySelector(".card") : null;
  if(fromRect && cardEl){ flyToSlot(fromRect, cardEl.getBoundingClientRect(), ART[card.id]); }
  return true;
}

