/* ============ 胜负 ============ */
function checkEnd(){
  if(G.ended) return;
  if(G.player.hp<=0){ G.ended=true; G.winner="ai"; showEnd(); }
  else if(G.ai.hp<=0){ G.ended=true; G.winner="player"; showEnd(); }
}
function finalByTurns(){
  G.ended = true;
  G.winner = G.player.hp>G.ai.hp?"player":(G.ai.hp>G.player.hp?"ai":"draw");
  showEnd();
}
// v2.1：结算面板的战绩条（值 → 条形宽度，中文标签 + 数值）
function endBar(label, val, max, txt){
  const pct = max > 0 ? Math.max(3, Math.min(100, Math.round(val / max * 100))) : 0;
  return `<div class="endrow"><span class="lbl">${label}</span>`
    + `<span class="track"><span class="fill" style="width:${pct}%"></span></span>`
    + `<span class="val">${txt}</span></div>`;
}
function showEnd(){
  EVflush(); // 终局前清空事件队列，保证最后一批日志/动画可见
  const w = G.winner;
  if(typeof SFX !== "undefined"){
    SFX.play((w === "ai") ? "lose" : "win");
  }
  const st = G.stats;
  const meIsP1 = (G.mode === "pvp") ? (G.role === "p1") : true;
  const myHp = meIsP1 ? G.player.hp : G.ai.hp;
  const opHp = meIsP1 ? G.ai.hp : G.player.hp;
  const titleMap = { player:"胜", ai:"败", draw:"平" };
  const t = document.getElementById("endTitle");
  t.textContent = (G.mode==="hotseat") ? (w==="draw"?"平局":"胜利方 "+(w==="player"?"1P":"2P")) : titleMap[w];
  t.style.color = (G.mode==="hotseat") ? "#3D2F5C" : (w==="player"?"var(--good)":(w==="ai"?"var(--bad)":"var(--sub)"));
  const counterPct = st.attacks ? Math.round(st.counterAttacks / st.attacks * 100) : 0;
  let html = "";
  html += `<div class="endgrid">
      <div class="endhp ${myHp>opHp?"win":(myHp<opHp?"lose":"")}"><span>你的本源</span><b>${myHp}</b></div>
      <div class="endhp ${opHp>myHp?"win":(opHp<myHp?"lose":"")}"><span>对方本源</span><b>${opHp}</b></div>
    </div>`;
  html += `<div class="endbars">`
    + endBar("回合数", G.turn, CFG.maxTurns, `${G.turn} / ${CFG.maxTurns}`)
    + endBar("克制率", counterPct, 100, `${counterPct}%`)
    + endBar("攻击", st.attacks, 40, `${st.attacks} 次`)
    + endBar("破封", st.breaks, 4, `${st.breaks} 次`)
    + endBar("破势技", st.skills, 5, `${st.skills} 次`)
    + endBar("狂性", st.raged, 5, `${st.raged} 次`)
    + `</div>`;
  if(st.sealed > 0) html += `<div class="endline">镇封 ${st.sealed} 次 ｜ 重开 ${st.mulligan} 次</div>`;
  // v3.0 本局点评：把统计翻译成一句可执行的反馈
  if(st.attacks > 0){
    const tips = [];
    tips.push(counterPct >= 50 ? "五行克制用得不错" : "克制利用偏少，试着针对对方元素下手");
    if(st.raged >= 2) tips.push(`狂性反噬 ${st.raged} 次，破封后记得让神兽出手`);
    if(st.breaks === 0 && st.poshi >= CFG.breakMid) tips.push("破势攒着没用，破封能换来 +2/+2 与破势技");
    html += `<div class="endline">本局点评：${tips.join("；")}。</div>`;
  }
  const __rec = (typeof UserSys!=="undefined") ? UserSys.recordGame(G) : null;
  if(__rec){
    const sm = UserSys.summary();
    html += `<div class="endline">档案已记录（${UserSys.profile.nickname}）：打AI ${sm.ai.w}胜${sm.ai.l}负${sm.ai.d}平 ｜ 在线 ${sm.pvp.w}胜${sm.pvp.l}负${sm.pvp.d}平 ｜ 同屏 ${sm.hotseat} 局</div>`;
  }
  document.getElementById("endStats").innerHTML = html;
  document.getElementById("endBanner").style.display="flex";
}
function hideEnd(){ document.getElementById("endBanner").style.display="none"; }
function restartGame(){
  if(G.mode==="pvp"){ logMsg("在线对局请通过「模式」重新发起连接。","s"); openMenu(); return; }
  newGame(G.mode, G.role);
  hideEnd();
}

