/* ============ 事件流（T1-A2）：引擎产出结构化事件，表现层统一消费 ============
 * 约束：引擎函数（战斗结算/破封/回合/效果/出牌）内禁止直接调用 logMsg / anim* / renderAll；
 * 一律 EV() 入队，由 renderAll / showEnd 末尾的 EVflush() 消费（日志即时写出，动画进 240ms 队列）。
 * 事件形：
 *   {log:"文本", k:"n|e|g|p|s"}                        纯日志
 *   {anim:"hit"|"lunge", side, idx, n, c}              灵位卡动画（hit 附伤害数字 n 与颜色 c）
 *   {anim:"hp", side, n}                               本源扣血动画
 *   {anim:"summon"|"break"|"seal"|"skill", side, idx}  出场/破封/镇封/破势技动画 */
let EVQ = [];
function EV(e){ EVQ.push(e); }
function EVflush(){
  if(!EVQ.length) return;
  const q = EVQ; EVQ = [];
  q.forEach(e=>{
    if(e.log !== undefined){ logMsg(e.log, e.k); return; }
    const el = (e.side !== undefined && e.side !== null) ? sideFieldEl(e.side) : null;
    if(e.anim==="hit"){ animHit(el, e.idx, e.n, e.c); }
    else if(e.anim==="lunge"){ animLunge(el, e.idx); }
    else if(e.anim==="hp"){ animHp(e.side, e.n); }
    else if(e.anim==="summon"){ animSummon(el, e.idx); }
    else if(e.anim==="break"){ animBreak(el, e.idx); }
    else if(e.anim==="seal"){ animSeal(el, e.idx); }
    else if(e.anim==="skill"){ animSkill(el, e.idx); }
  });
}

