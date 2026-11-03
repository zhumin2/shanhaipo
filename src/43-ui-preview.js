/* ============ 卡牌预览 + 瞄准指示（v2.1，纯表现层） ============
 * 一、悬停/聚焦任意卡牌时在旁侧显示大图详情（完整规则文本、破势技、出处）。
 * 二、进入攻击模式后，从攻击者到鼠标画一条暗金曲线；悬停合法目标时吸附并加粗。
 * 两者均为 pointer-events:none，不拦截任何点击。 */

let previewEl = null;
function ensurePreview(){
  if(!previewEl){
    previewEl = document.createElement("div");
    previewEl.className = "card-preview";
    document.body.appendChild(previewEl);
  }
  return previewEl;
}
function showCardPreview(card, anchorEl, unit){
  if(!card || !anchorEl) return;
  const el = ensurePreview();
  const atk = unit ? unit.atk : card.atk;
  const hp  = unit ? unit.hp  : card.hp;
  const broken = !!(unit ? unit.broken : card.broken);
  const parts = [];
  if(ART[card.id]) parts.push(`<img src="${ART[card.id]}" alt="">`);
  parts.push(`<div class="cp-body">`);
  parts.push(`<div class="cp-name">${card.name}${broken?"·破封":""}</div>`);
  parts.push(`<div class="cp-meta">${card.cost} 费 · ${card.element}系 · ${card.aura||"神器"}`
    + (card.kind==="creature" ? ` · 攻 ${atk} / 命 ${hp}` : ``) + `</div>`);
  parts.push(`<div class="cp-text">${card.effect && card.effect.desc ? card.effect.desc : "无特殊效果"}</div>`);
  if(card.skill) parts.push(`<div class="cp-skill">破势技「${card.skill.name}」${card.skill.cost} 破势：${card.skill.desc}</div>`);
  if(card.source) parts.push(`<div class="cp-src">${card.source}</div>`);
  parts.push(`</div>`);
  el.innerHTML = parts.join("");
  el.classList.add("on");

  // 定位：优先显示在卡牌上方，越界则翻到下方，并夹在视口内
  const r = anchorEl.getBoundingClientRect();
  const pr = el.getBoundingClientRect();
  let top = r.top - pr.height - 12;
  if(top < 8) top = Math.min(window.innerHeight - pr.height - 8, r.bottom + 12);
  let left = r.left + r.width/2 - pr.width/2;
  left = Math.max(8, Math.min(left, window.innerWidth - pr.width - 8));
  el.style.left = Math.round(left) + "px";
  el.style.top  = Math.round(top) + "px";
}
function hideCardPreview(){
  if(previewEl) previewEl.classList.remove("on");
}

/* ---------- 瞄准曲线 ---------- */
let aimSvg = null, aimPath = null, aimHead = null;
const SVGNS = "http://www.w3.org/2000/svg";
function ensureAim(){
  if(aimSvg) return;
  aimSvg = document.createElementNS(SVGNS, "svg");
  aimSvg.setAttribute("class", "aim-layer");
  aimPath = document.createElementNS(SVGNS, "path");
  aimPath.setAttribute("class", "aim-path");
  aimSvg.appendChild(aimPath);
  aimHead = document.createElementNS(SVGNS, "circle");
  aimHead.setAttribute("class", "aim-head");
  aimHead.setAttribute("r", "5");
  aimSvg.appendChild(aimHead);
  document.body.appendChild(aimSvg);
}
function aimClear(){
  if(aimPath) aimPath.setAttribute("d", "");
  if(aimHead){ aimHead.setAttribute("cx", "-20"); aimHead.setAttribute("cy", "-20"); }
}
function aimFromEl(){
  if(ui.mode!=="attack" || ui.selField===null) return null;
  const slot = document.querySelector(`#myField .slot[data-slot-idx="${ui.selField}"]`);
  return slot ? slot.querySelector(".card") : null;
}
function aimDraw(toX, toY, snapped){
  const from = aimFromEl();
  if(!from){ aimClear(); return; }
  ensureAim();
  const r = from.getBoundingClientRect();
  const x1 = r.left + r.width/2, y1 = r.top + r.height/2;
  const cx = (x1 + toX)/2, cy = Math.min(y1, toY) - Math.max(46, Math.abs(toX-x1)*0.16);
  if(aimPath){
    aimPath.setAttribute("d", `M ${x1} ${y1} Q ${cx} ${cy} ${toX} ${toY}`);
    aimPath.classList.toggle("locked", !!snapped);
  }
  if(aimHead){ aimHead.setAttribute("cx", toX); aimHead.setAttribute("cy", toY); }
}
// 全局监听：仅在攻击模式下生效
document.addEventListener("mousemove", (e)=>{
  if(!G || !G.player || G.ended){ aimClear(); return; }
  if(ui.mode!=="attack"){ aimClear(); return; }
  const el = document.elementFromPoint(e.clientX, e.clientY);
  const slot = el && el.closest ? el.closest("#aiField .slot") : null;
  const targetCard = slot ? slot.querySelector(".card") : null;
  if(targetCard){
    const tr = targetCard.getBoundingClientRect();
    aimDraw(tr.left + tr.width/2, tr.top + tr.height/2, true);
  } else {
    aimDraw(e.clientX, e.clientY, false);
  }
});
