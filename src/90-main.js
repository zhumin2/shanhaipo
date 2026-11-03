/* ============ 启动 ============ */
UserSys.init();
openMenu();
syncCfgInputs();
// v1.9：Esc 取消当前选择（无按钮式交互的逃生口）
document.addEventListener("keydown", (e)=>{
  if(e.key==="Escape"){
    if(G && G.player){ uiReset(); renderAll(); }
    ["helpPanel","debugPanel","userPanel"].forEach(id=>{
      const p=document.getElementById(id); if(p && p.style.display!=="none"){ p.style.display="none"; }
    });
  }
});

