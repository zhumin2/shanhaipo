#!/usr/bin/env node
// T1-A5：headless 确定性回归对拍器
// 用法：node tools/sim.js [局数=200]
// 机制：vm 沙箱加载引擎/AI 模块（不加载任何 UI/DOM 模块），热座模式双自动玩家对局；
//       每个种子跑两遍，比对「终局全状态 JSON + 全量事件流 JSON」字符串——任何分歧即失败（exit 1）。
// 这是确定性引擎的核心回归门：RNG 消费次序、事件顺序、状态演进任一不确定都会被抓到。
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const crypto = require("crypto");

const SRC = path.join(__dirname, "..", "src");
// 仅加载引擎/AI/胜负模块；表现层（log/anim/render）与网络/启动模块不加载
const MODULES = [
  "00-config.js", "01-cards.js", "10-engine-state.js", "11-engine-combat.js",
  "12-engine-break.js", "13-engine-turn.js", "14-engine-effects.js",
  "15-engine-play.js", "16-engine-events.js", "20-ai.js", "21-engine-win.js",
];
const engineCode = MODULES.map(f => fs.readFileSync(path.join(SRC, f), "utf8")).join("\n;\n");

// 沙箱：stub 掉引擎路径上会触达的全部表现层符号（模块内未定义的：logMsg/renderAll/animTurn/hideMenu）
const sandbox = {
  console: { log() {}, error(...a) { console.error(...a); } },
  setTimeout: (fn) => { fn(); return 0; },   // 同步化（防御性：引擎流程不应依赖定时器）
  clearTimeout() {}, window: {},
};
vm.createContext(sandbox);
sandbox.logMsg = () => {}; sandbox.renderAll = () => {}; sandbox.animTurn = () => {}; sandbox.hideMenu = () => {};
// effAtk（有效攻击力=攻+技增+回合修正+凶光环）当前定义在渲染模块 40 中，引擎模块未含——沙箱按同一公式注入。
// 【模块归属债】A7 TS 引擎化时应移入 engine（规则函数不属于表现层）。
sandbox.effAtk = function(s, side){ return s.atk + (s.skillBonus||0) + (s.turnAtkBuff||0) + (side && side.field.filter(function(x){return x&&x.aura==="凶";}).length>=2 ? 1 : 0); };

try {
  vm.runInContext(engineCode, sandbox, { filename: "engine-bundle.js" });
} catch (e) {
  console.error("引擎加载失败（模块语法/引用错误）:", e.message);
  process.exit(1);
}
// 21-engine-win 加载了真身 showEnd/hideEnd（触 DOM），驱动前覆盖
vm.runInContext("hideEnd = function(){}; showEnd = function(){};", sandbox, { filename: "overrides.js" });

const DRIVER = `
(function(){
  var N = __N__;
  function tagSide(s){ return s===G.player ? "p1" : "p2"; }
  function snapEvents(){
    return EVQ.map(function(e){
      if(e.log !== undefined) return {log:e.log, k:e.k||"n"};
      return {anim:e.anim, s:tagSide(e.side), i:e.idx, n:e.n, c:e.c};
    });
  }
  function snapState(){
    function cs(c){ return c ? {id:c.id, atk:c.atk, hp:c.hp, broken:c.broken, attacked:c.attacked,
      defended:c.defended, frozen:c.frozen, skillUsed:c.skillUsed, skillBonus:c.skillBonus,
      turnAtkBuff:c.turnAtkBuff, sick:c.sick} : null; }
    function ss(sd){ return {hp:sd.hp, mana:sd.mana, manaCap:sd.manaCap, poshi:sd.poshi,
      deck:sd.deck.slice(), hand:sd.hand.slice(), grave:sd.grave.slice(),
      field:sd.field.map(cs), immune:sd.immune, brokenFlags:sd.brokenFlags, sealedFlags:sd.sealedFlags}; }
    return {turn:G.turn, active:G.active, ended:G.ended, winner:G.winner, seed:G.seed,
      stats:G.stats, p1:ss(G.player), p2:ss(G.ai)};
  }
  var NEED_TARGET = ["damage","freeze","enemyAtkDown","destroyLe3"];
  function playHalf(me){
    var opp = me===G.player ? G.ai : G.player;
    for(var k=0;k<3;k++){                       // 部署：最左可部署神兽 → 最左空位
      var done=false;
      for(var i=0;i<me.hand.length;i++){
        var c=CARDS.find(function(x){return x.id===me.hand[i];});
        var slot=-1; for(var q=0;q<3;q++){ if(!me.field[q]){ slot=q; break; } }
        if(c && c.kind==="creature" && c.cost<=me.mana && slot>=0){ playCreature(me,c,slot); done=true; break; }
      }
      if(!done) break;
    }
    for(var b=0;b<3;b++){                       // 破封
      if(canBreak(me,b) && me.poshi>=breakCost(me.field[b].cost)){ doBreak(me,b); }
    }
    for(var s2i=0;s2i<3;s2i++){                 // 破势技
      var s2=me.field[s2i];
      if(s2 && s2.broken && !s2.skillUsed && s2.skill && me.poshi>=s2.skill.cost){
        var need = NEED_TARGET.indexOf(s2.skill.type)>=0;
        var t=-1; if(need){ for(var j=0;j<3;j++){ if(opp.field[j]){ t=j; break; } } }
        if(!need || t>=0){ skillEffect(me,s2, need?t:null); }
      }
    }
    for(var a=0;a<3;a++){                       // 攻击：有目标打兽，无目标打本源
      if(G.ended) break;
      var s3=me.field[a];
      if(s3 && !s3.attacked && !s3.defended && !s3.frozen && !s3.sick){
        var atk=effAtk(s3, me);
        if(atk>0){
          var t2=-1; for(var j2=0;j2<3;j2++){ if(opp.field[j2]){ t2=j2; break; } }
          if(t2>=0){ attackExec(me,s3,opp,t2,atk); } else { attackHpExec(me,s3,atk); }
        } else { s3.attacked=true; }
      }
    }
  }
  function runOne(seed){
    newGame("hotseat","p1",seed);
    var guard=0;
    while(!G.ended && guard<4000){
      playHalf(G.active==="player"?G.player:G.ai);
      if(!G.ended){ endTurn(); }
      guard++;
    }
    return {h: JSON.stringify(snapState()) + "|" + JSON.stringify(snapEvents()),
            ended:G.ended, turn:G.turn, winner:G.winner||"none", guard:guard};
  }
  var out={n:N, mismatch:0, unfinished:0, turns:{}, winners:{}, firstMismatch:null, digest:""};
  var dig="";
  for(var i=1;i<=N;i++){
    var a=runOne(i), b=runOne(i);
    if(!a.ended || !b.ended){ out.unfinished++; }
    if(a.h !== b.h){
      out.mismatch++;
      if(!out.firstMismatch){ out.firstMismatch={seed:i, a:{turn:a.turn,winner:a.winner}, b:{turn:b.turn,winner:b.winner}}; }
    }
    dig += a.h;
    out.turns[a.turn]=(out.turns[a.turn]||0)+1;
    out.winners[a.winner]=(out.winners[a.winner]||0)+1;
  }
  out.digest=__SHA__&&(function(s){ var h=0; for(var i=0;i<s.length;i++){ h=(h*31+s.charCodeAt(i))|0; } return (h>>>0).toString(16); })(dig);
  return JSON.stringify(out);
})()
`;

const N = Number(process.argv[2]) || 200;
const t0 = Date.now();
let out;
try {
  out = JSON.parse(vm.runInContext(DRIVER.replace("__N__", String(N)).replace("__SHA__", "true"), sandbox, { filename: "driver.js" }));
} catch (e) {
  console.error("sim 运行异常:", e.message);
  process.exit(1);
}
const ms = Date.now() - t0;
const turnDist = Object.entries(out.turns).sort((x, y) => Number(x[0]) - Number(y[0]))
  .map(([t, c]) => `${t}轮×${c}`).join(" ");
const winDist = Object.entries(out.winners).map(([w, c]) => `${w}:${c}`).join(" ");
console.log(`sim: ${out.n} 局 × 2 次 | 耗时 ${ms}ms | 分歧 ${out.mismatch} | 未终局 ${out.unfinished}`);
console.log(`  终局回合分布: ${turnDist}`);
console.log(`  胜者分布: ${winDist} | 全量指纹: ${out.digest}`);
if (out.firstMismatch) console.error("  首个分歧种子:", JSON.stringify(out.firstMismatch));
if (out.mismatch > 0 || out.unfinished > 0) { console.error("sim FAIL"); process.exit(1); }
console.log("sim PASS");
