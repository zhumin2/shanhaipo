"use strict";
/* ============ 确定性随机（PvP 双方同步洗牌用） ============ */
function mulberry32(a){ return function(){ a|=0; a=a+0x6D2B79F5|0; let t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }
let RNG = Math.random;
function seedRNG(seed){ RNG = mulberry32(seed); }
/* ============ 规则集配置（与 design-contract.json 一致） ============ */
const DEFAULT_CFG = {
  ruleset_id: "SHANHAIPO-006",
  hp: 30, manaCap: 10, handCap: 10,
  poshiCap: 10, poshiPer: 3,
  breakLow: 3, breakMid: 5, breakHigh: 7,   // 按费用 1-2 / 3-4 / 5+
  counterBonus: 1, counterPenalty: 1, minDamage: 1,
  rageDamage: 1, breakAtk: 2, breakHp: 2,
  maxTurns: 30, mulligan: 3, drawPerTurn: 1,
};
let CFG = Object.assign({}, DEFAULT_CFG);
const ELEMENTS = ["金","木","水","火","土"];
const COUNTER = {"金":"木","木":"土","土":"水","水":"火","火":"金"};
const ECOLOR = {"金":"var(--e-jin)","木":"var(--e-mu)","水":"var(--e-shui)","火":"var(--e-huo)","土":"var(--e-tu)"};

