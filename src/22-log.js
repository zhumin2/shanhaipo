/* ============ 日志 ============ */
function logMsg(txt, kind){
  G.log.push({t:txt,k:kind});
  const box = document.getElementById("logBox");
  const div = document.createElement("div");
  div.className = "lg-"+(kind||"n");
  div.textContent = `[${G.turn}] ${txt}`;
  box.appendChild(div);
  box.scrollTop = box.scrollHeight;
  if(box.children.length>120){ box.removeChild(box.firstChild); }
}
// 清空日志面板（换局时调用，避免上一局的记录残留在当前对局里）
function logClear(){
  const box = document.getElementById("logBox");
  if(box) box.innerHTML = "";
}

