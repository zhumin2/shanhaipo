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
// v1.7：出场扩散光环（挂在灵位容器上，避免被全量重绘覆盖）
function addRing(el){
  if(!el) return;
  const slot = el.closest ? el.closest(".slot") : null;
  if(!slot || slot.querySelector(".summon-ring")) return;
  const r = document.createElement("div"); r.className="summon-ring"; slot.appendChild(r); setTimeout(()=>r.remove(), 720);
}
function sideFieldEl(side){ return side===G.player ? "myField" : "aiField"; }
// v1.8：金色墨点迸发（破封/阵亡时）。偏移表为固定值——不使用随机数，保持 UI 层无随机源。
const MOTE_OFFSETS = [[-34,-42],[30,-48],[-15,-58],[13,-60],[-41,-24],[39,-28],[0,-66]];
function goldBurst(el){
  if(!el) return;
  const host = el.closest ? (el.closest(".slot") || el) : el;
  if(!host || host.querySelector(".gold-mote")) return;
  MOTE_OFFSETS.forEach((off,i)=>{
    const m = document.createElement("div");
    m.className = "gold-mote";
    m.style.left = "50%"; m.style.top = "46%";
    m.style.setProperty("--dx", off[0]+"px");
    m.style.setProperty("--dy", off[1]+"px");
    m.style.animationDelay = (i*24)+"ms";
    host.appendChild(m);
    setTimeout(()=>m.remove(), 1150 + i*24);
  });
}
function animLunge(sideEl, idx){ pushAnim(()=>replay(qCard(sideEl, idx), sideEl==="myField"?"anim-lunge":"anim-lunge-r")); }
function animHit(sideEl, idx, num, color, crit){
  pushAnim(()=>{
    replay(qCard(sideEl, idx), "anim-hit");
    if(num!=null){ const slot=qSlot(sideEl, idx); if(slot){
      const d=document.createElement("div");
      d.className="dmg-num" + (crit?" crit":"");
      d.textContent="-"+(num||"");
      d.style.color=color||"#C0392B";
      slot.appendChild(d); setTimeout(()=>d.remove(), crit?1150:950);
    } }
  });
}
function animSummon(sideEl, idx){ pushAnim(()=>{ const el=qCard(sideEl, idx); replay(el,"anim-summon"); addRing(el); }); }
function animBreak(sideEl, idx){ pushAnim(()=>{ const el=qCard(sideEl, idx); replay(el,"anim-break"); addBurst(el); goldBurst(el); }); }
function animSeal(sideEl, idx){ pushAnim(()=>replay(qCard(sideEl, idx), "anim-seal")); }
function animSkill(sideEl, idx){ pushAnim(()=>{ const el=qCard(sideEl, idx); replay(el,"anim-skill"); addBurst(el); }); }
// v1.7：阵亡飘字（灵位仍存在，卡牌已被移除）
function animDeath(sideEl, idx){
  pushAnim(()=>{
    const slot = qSlot(sideEl, idx);
    if(!slot || slot.querySelector(".death-mark")) return;
    const m = document.createElement("div"); m.className="death-mark"; m.textContent="阵亡";
    slot.appendChild(m); goldBurst(slot); setTimeout(()=>m.remove(), 1150);
  });
}
function animHp(side, num){
  pushAnim(()=>{
    const bar = document.getElementById((side===mySide()?"my":"ai")+"HpBar"); // 视角修正：按本端我方判定（TDD-01）
    replay(bar, "anim-hp");
    const meter = bar ? bar.closest(".meter") : null;
    if(meter){ replay(meter, "shake"); } // v1.7：本源受击震动
    if(meter && num!=null){ const d=document.createElement("div"); d.className="dmg-num hp"; d.textContent="-"+(num||""); d.style.color="#C0392B"; meter.appendChild(d); setTimeout(()=>d.remove(),950); }
  });
}
function animTurn(text){
  const d = document.createElement("div"); d.className="turn-banner"; d.textContent = text;
  document.body.appendChild(d); setTimeout(()=>d.remove(), 1450);
}

