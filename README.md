# 山海破（shanhaipo）

取材《山海经》的国潮水墨风卡牌对战游戏。**单文件 HTML、零依赖、双击即玩**，支持打 AI / 同屏双人 / WebRTC 点对点在线对战，内置**本地用户档案**（游客昵称 + 战绩自动记录，仅存本设备浏览器）。

- 公网试玩：<https://zhumin2.github.io/shanhaipo/>
- 产品设计：[山海破-产品设计文档.md](山海破-产品设计文档.md)
- 技术设计（现状还原 as-built）：[山海破-技术设计文档.md](山海破-技术设计文档.md)（P0 代码审计 + M1/M2a 工程记录）
- 页游完整技术设计（目标架构）：[山海破-页游完整技术设计.md](山海破-页游完整技术设计.md)（技术架构 / 技术选型 / 全栈技术设计 / 实施路线）
- 开发计划：[山海破-开发计划.md](山海破-开发计划.md)（T1/T2 任务级 WBS · 人日估算 · 验收门 · 排期与裁剪方案）

## 仓库结构

```
index.html        游戏本体（构建产物，可直接打开/部署）
template.html     页面骨架 + /*__SHANHAIPO_JS__*/ 注入占位
src/              源码模块 ×20（文件名序号 = 构建拼接顺序 = 配置→卡牌→用户档案→引擎→AI→渲染→网络→启动）
  05-user.js        用户系统（UserSys：游客档案/昵称/战绩环形记录，localStorage: shp.profile / shp.records）
  42-ui-user.js     档案面板 UI（昵称编辑/累计战绩/最近对局/重置）
tools/build.js    构建：拼接 src → index.html（零依赖，Node 内置模块）
tools/check.js    质量门：语法 / Math.random 审计 / 函数重名 / 产物一致性
tools/dev-server.js 本地静态服务（试玩与回归）
山海破-产品设计文档.md / 山海破-技术设计文档.md
```

## 常用命令

```bash
node tools/build.js      # 修改 src 或 template 后重新构建 index.html
node tools/check.js      # 质量门（提交前必跑）
node tools/dev-server.js 8080   # 本地试玩 http://127.0.0.1:8080/
```

## 回归验证（PvP 双端一致性）

```bash
node tools/dev-server.js 8123
# 浏览器开两个标签页：
#   http://127.0.0.1:8123/index.html?pvpAuto=1&role=p1
#   http://127.0.0.1:8123/index.html?pvpAuto=1&role=p2
# 自动信令握手（经 localStorage 搬运）→ 自动对局 → 终局各写 localStorage：
#   shp_res_p1 / shp_res_p2 首行应一致（win / t / p1hp / p2hp）
# 注意：pvpAuto 必须带值（=1），裸参数会被当假值跳过
```

## 开发约定

- **只改 `src/` 与 `template.html`，不改 `index.html`**（产物，由构建生成）。
- `src/*.js` 与 `template.html` 行尾必须一致（当前为 CRLF；Git Bash 下 `sed` 会静默转 LF，切分后需 `unix2dos`）。
- 对局内一切随机必须走 `mulberry32`（种子化）；`Math.random` 仅允许出现在 `tools/check.js` 白名单声明的种子生成位置。
- 提交前跑 `node tools/check.js`。
