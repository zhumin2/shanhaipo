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

