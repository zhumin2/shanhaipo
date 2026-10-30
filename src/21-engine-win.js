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
function showEnd(){
  EVflush(); // 终局前清空事件队列，保证最后一批日志/动画可见
  const w = G.winner;
  document.getElementById("endTitle").textContent = w==="player"?"胜！":(w==="ai"?"败":"平局");
  document.getElementById("endTitle").style.color = w==="player"?"var(--good)":"var(--bad)";
  document.getElementById("endStats").innerHTML =
    `本局回合：${G.turn} ｜ 你的本源 ${G.player.hp} vs 敌方 ${G.ai.hp}<br>`+
    `破封次数：${G.stats.breaks} ｜ 狂性触发：${G.stats.raged} ｜ 镇封：${G.stats.sealed}<br>`+
    `攻击次数：${G.stats.attacks} ｜ 克制攻击：${G.stats.counterAttacks}（${G.stats.attacks?Math.round(G.stats.counterAttacks/G.stats.attacks*100):0}%）<br>`+
    `破势技发动：${G.stats.skills} ｜ 重开次数：${G.stats.mulligan}`;
  const __rec = (typeof UserSys!=="undefined") ? UserSys.recordGame(G) : null;
  if(__rec){
    const sm = UserSys.summary();
    document.getElementById("endStats").innerHTML +=
      `<br>档案已记录（${UserSys.profile.nickname}）：打AI ${sm.ai.w}胜${sm.ai.l}负${sm.ai.d}平 ｜ 在线 ${sm.pvp.w}胜${sm.pvp.l}负${sm.pvp.d}平 ｜ 同屏 ${sm.hotseat} 局`;
  }
  document.getElementById("endBanner").style.display="flex";
}
function hideEnd(){ document.getElementById("endBanner").style.display="none"; }
function restartGame(){
  if(G.mode==="pvp"){ logMsg("在线对局请通过「模式」重新发起连接。","s"); openMenu(); return; }
  newGame(G.mode, G.role);
  hideEnd();
}

