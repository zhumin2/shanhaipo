const animQueue = [];
let animTimer = null;
function pushAnim(fn){
  animQueue.push(fn);
  if(!animTimer){
    animTimer = setInterval(()=>{
      if(animQueue.length){ const f = animQueue.shift(); try{ f(); }catch(e){} }
      else { clearInterval(animTimer); animTimer = null; }
    }, 240);
  }
}
function qSlot(sideEl, idx){ return document.querySelector(`#${sideEl} .slot[data-slot-idx="${idx}"]`); }
function qCard(sideEl, idx){ const s = qSlot(sideEl, idx); return s ? s.querySelector(".card") : null; }
function replay(el, cls){ if(!el) return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); }
function addBurst(el){ if(!el || el.querySelector(".burst")) return; const b = document.createElement("div"); b.className="burst"; el.appendChild(b); setTimeout(()=>b.remove(), 750); }
function sideFieldEl(side){ return side===G.player ? "myField" : "aiField"; }
function animLunge(sideEl, idx){ pushAnim(()=>replay(qCard(sideEl, idx), sideEl==="myField"?"anim-lunge":"anim-lunge-r")); }
function animHit(sideEl, idx, num, color){
  pushAnim(()=>{
    replay(qCard(sideEl, idx), "anim-hit");
    if(num!=null){ const slot=qSlot(sideEl, idx); if(slot){ const d=document.createElement("div"); d.className="dmg-num"; d.textContent="-"+(num||""); d.style.color=color||"#C0392B"; slot.appendChild(d); setTimeout(()=>d.remove(),950); } }
  });
}
function animSummon(sideEl, idx){ pushAnim(()=>replay(qCard(sideEl, idx), "anim-summon")); }
function animBreak(sideEl, idx){ pushAnim(()=>{ const el=qCard(sideEl, idx); replay(el,"anim-break"); addBurst(el); }); }
function animSeal(sideEl, idx){ pushAnim(()=>replay(qCard(sideEl, idx), "anim-seal")); }
function animSkill(sideEl, idx){ pushAnim(()=>{ const el=qCard(sideEl, idx); replay(el,"anim-skill"); addBurst(el); }); }
function animHp(side, num){
  pushAnim(()=>{
    const bar = document.getElementById((side===mySide()?"my":"ai")+"HpBar"); // 视角修正：按本端我方判定（TDD-01）
    replay(bar, "anim-hp");
    const meter = bar ? bar.closest(".meter") : null;
    if(meter && num!=null){ const d=document.createElement("div"); d.className="dmg-num hp"; d.textContent="-"+(num||""); d.style.color="#C0392B"; meter.appendChild(d); setTimeout(()=>d.remove(),950); }
  });
}
function animTurn(text){
  const d = document.createElement("div"); d.className="turn-banner"; d.textContent = text;
  document.body.appendChild(d); setTimeout(()=>d.remove(), 1450);
}

