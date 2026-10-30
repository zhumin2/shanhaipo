#!/usr/bin/env node
/* 单文件构建：src/*.js（按文件名序拼接）注入 template.html 占位符 → index.html
 * 用法：
 *   node tools/build.js                # 构建到 index.html
 *   node tools/build.js --out <path>   # 构建到指定路径
 *   node tools/build.js --check        # 构建到内存并与现有 index.html 字节比对（产物新鲜度门）
 * 零依赖（Node 内置模块）。EOL 跟随 template.html（当前 CRLF），src 模块必须与之同 EOL。
 */
"use strict";
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const PLACEHOLDER = "/*__SHANHAIPO_JS__*/";

function build() {
  const tpl = fs.readFileSync(path.join(ROOT, "template.html"), "utf8");
  const eol = tpl.includes("\r\n") ? "\r\n" : "\n";
  const marker = PLACEHOLDER + eol;
  if (!tpl.includes(marker)) {
    throw new Error(`template.html 缺少占位行 ${PLACEHOLDER}（须独占一行，EOL=${eol === "\r\n" ? "CRLF" : "LF"}）`);
  }
  const files = fs.readdirSync(path.join(ROOT, "src"))
    .filter(f => f.endsWith(".js"))
    .sort(); // 文件名数字前缀即拼接顺序
  if (!files.length) throw new Error("src/ 下没有 .js 模块");
  let js = files.map(f => fs.readFileSync(path.join(ROOT, "src", f), "utf8")).join("");
  if (!js.endsWith(eol)) js += eol;
  return { out: tpl.replace(marker, js), files, tpl };
}

const argv = process.argv.slice(2);
const checkMode = argv.includes("--check");
const outIdx = argv.indexOf("--out");

if (checkMode) {
  const { out } = build();
  const current = fs.readFileSync(path.join(ROOT, "index.html"));
  const rebuilt = Buffer.from(out, "utf8");
  if (current.equals(rebuilt)) {
    console.log("check ok: index.html 与 src+template 重建结果字节一致");
  } else {
    console.error("check FAIL: index.html 与 src+template 不一致（产物过期或手工改动，请重新构建）");
    process.exit(1);
  }
} else {
  const { out, files } = build();
  const target = outIdx >= 0 ? argv[outIdx + 1] : path.join(ROOT, "index.html");
  fs.writeFileSync(target, out, "utf8");
  console.log(`build ok: ${files.length} 个模块 -> ${path.relative(ROOT, target)} (${(Buffer.byteLength(out) / 1024).toFixed(0)}KB)`);
}
