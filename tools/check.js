#!/usr/bin/env node
/* 质量门（技术设计文档 §8.3/§11.2）：
 *   ① node --check 语法校验（对 src 拼接结果）
 *   ② 对局路径 Math.random 审计：确定性不变量（TDD §4.1）——种子生成之外禁止 Math.random
 *   ③ 顶层 function 重名检测（防搬运/合并引入覆盖）
 *   ④ 产物一致性：src+template 重建结果必须与 index.html 字节一致
 * 用法：node tools/check.js   （全部通过退出码 0）
 */
"use strict";
const fs = require("fs");
const path = require("path");
const os = require("os");
const cp = require("child_process");

const ROOT = path.join(__dirname, "..");
const SRC = path.join(ROOT, "src");
// Math.random 白名单：仅允许出现在种子生成/自动对局钩子中（对局内随机必须走 mulberry32）。
// 00-config.js: `let RNG = Math.random` 为 mulberry32 接管前的默认值；newGame 在任何洗牌前必先
// seedRNG(seed) 覆盖之（人工确认，若引入对局路径直接使用 RNG 的代码须先保证已 seedRNG）。
// 05-user.js: 仅用于游客令牌与昵称一次性生成（本地档案，不属于对局状态，不影响双端一致性）。
const MATH_RANDOM_ALLOW = new Set(["00-config.js", "05-user.js", "10-engine-state.js", "50-net.js", "99-pvpauto.js"]);

const files = fs.readdirSync(SRC).filter(f => f.endsWith(".js")).sort();
const parts = files.map(f => ({ f, code: fs.readFileSync(path.join(SRC, f), "utf8") }));
const all = parts.map(p => p.code).join("");
let failed = false;
const fail = msg => { failed = true; console.error("  ✗ " + msg); };
const ok = msg => console.log("  ✓ " + msg);

console.log(`[1/5] node --check（${files.length} 个模块拼接）`);
try {
  const tmp = path.join(os.tmpdir(), `shp_check_${process.pid}.js`);
  fs.writeFileSync(tmp, all);
  cp.execSync(`node --check "${tmp}"`, { stdio: "pipe" });
  fs.unlinkSync(tmp);
  ok("语法通过");
} catch (e) {
  fail("语法错误:\n" + (e.stderr || e.message));
}

console.log("[2/5] Math.random 对局路径审计");
const violations = [];
for (const p of parts) {
  p.code.split("\n").forEach((ln, i) => {
    if (ln.includes("Math.random") && !MATH_RANDOM_ALLOW.has(p.f)) violations.push(`${p.f}:${i + 1}`);
  });
}
if (violations.length) fail("种子生成之外出现 Math.random: " + violations.join(", "));
else ok("对局内随机全部走 mulberry32（白名单外无 Math.random）");

console.log("[3/5] 顶层函数重名检测");
const seen = new Map();
const dups = [];
for (const p of parts) {
  for (const m of p.code.matchAll(/^function\s+([A-Za-z_$][\w$]*)/gm)) {
    if (seen.has(m[1])) dups.push(`${m[1]}（${seen.get(m[1])} 与 ${p.f}）`);
    else seen.set(m[1], p.f);
  }
}
if (dups.length) fail("重名函数: " + dups.join("; "));
else ok(`${seen.size} 个顶层函数无重名`);

console.log("[4/5] 产物一致性（index.html 是否为最新构建）");
try {
  cp.execSync(`node "${path.join(__dirname, "build.js")}" --check`, { stdio: "pipe", cwd: ROOT });
  ok("index.html 与 src+template 字节一致");
} catch (e) {
  fail("index.html 过期或被手工改动，请运行 node tools/build.js");
}

console.log("[5/5] headless 确定性回归（sim 500 局双跑对拍）");
try {
  const simOut = cp.execSync(`node "${path.join(__dirname, "sim.js")}" 500`, { stdio: "pipe", cwd: ROOT, encoding: "utf8" });
  ok(simOut.trim().split("\n")[0].replace("sim: ", ""));
} catch (e) {
  fail("确定性回归失败（同种子双跑出现分歧或未终局）: " + (e.stdout ? e.stdout.split("\n").slice(0, 3).join(" / ") : e.message));
}

if (failed) { console.error("check FAIL"); process.exit(1); }
console.log("check PASS");
