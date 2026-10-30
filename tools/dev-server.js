#!/usr/bin/env node
/* 极简静态服务器（本地试玩 / ?pvpAuto 双 tab 回归用）
 * 用法：node tools/dev-server.js [端口]   默认 8080
 * 零依赖（Node 内置 http/fs）。
 */
"use strict";
const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const PORT = Number(process.argv[2]) || 8080;
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".md": "text/plain; charset=utf-8",
};

http.createServer((req, res) => {
  let urlPath = decodeURIComponent(req.url.split("?")[0]);
  if (urlPath === "/") urlPath = "/index.html";
  const file = path.normalize(path.join(ROOT, urlPath));
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404); return res.end("404 Not Found");
  }
  res.writeHead(200, { "Content-Type": MIME[path.extname(file).toLowerCase()] || "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
}).listen(PORT, "127.0.0.1", () => {
  console.log(`山海破本地服务: http://127.0.0.1:${PORT}/`);
  console.log(`PvP 回归: 开两个标签页访问 /index.html?pvpAuto&role=p1 与 /index.html?pvpAuto&role=p2`);
});
