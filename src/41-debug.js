/* ============ 调试面板 ============ */
function toggleHelp(){ const b=document.getElementById("helpBox"); b.open=!b.open; }
function toggleDebug(){ const b=document.getElementById("debugBox"); b.open=!b.open; }
function syncCfgInputs(){
  document.getElementById("cfgPoshiPer").value=CFG.poshiPer;
  document.getElementById("cfgCB").value=CFG.counterBonus;
  document.getElementById("cfgCP").value=CFG.counterPenalty;
  document.getElementById("cfgPC").value=CFG.poshiCap;
  document.getElementById("cfgRage").value=CFG.rageDamage;
  document.getElementById("cfgBM").value=CFG.breakMid;
}
function applyCfg(){
  CFG.poshiPer=Math.max(1,+document.getElementById("cfgPoshiPer").value||3);
  CFG.counterBonus=Math.max(0,+document.getElementById("cfgCB").value||1);
  CFG.counterPenalty=Math.max(0,+document.getElementById("cfgCP").value||1);
  CFG.poshiCap=Math.max(4,+document.getElementById("cfgPC").value||10);
  CFG.rageDamage=Math.max(0,+document.getElementById("cfgRage").value||1);
  CFG.breakMid=Math.max(2,+document.getElementById("cfgBM").value||5);
  logMsg("调试参数已应用（仅影响本局后续结算）。","s");
  renderAll();
}
function resetCfg(){ CFG=Object.assign({},DEFAULT_CFG); syncCfgInputs(); logMsg("参数恢复默认。","s"); renderAll(); }
function renderDebug(){
  const el=document.getElementById("debugStats");
  if(!el) return;
  el.innerHTML =
    `<b>验证统计：</b>破封 ${G.stats.breaks} 次（目标场均 2–3）｜ 克制攻击 ${G.stats.counterAttacks}/${G.stats.attacks} 次（${G.stats.attacks?Math.round(G.stats.counterAttacks/G.stats.attacks*100):0}%，目标 ≥40%）｜ 狂性 ${G.stats.raged} 次｜ 破势技 ${G.stats.skills} 次｜ 回合 ${G.turn}`;
}

