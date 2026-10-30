/* ============ 用户系统（本地档案 · L0.5） ============
 * schema 与《山海破-页游完整技术设计》§6.1/§11.4 前向兼容：T1 接服务端时 guestToken 平移为账号。
 * 注意：本模块的 Math.random 仅用于昵称/令牌生成（非对局随机，不触碰种子化 RNG，见 tools/check.js 白名单）。 */
const USER_KEYS = { profile:"shp.profile", records:"shp.records" };
const UserSys = {
  v: 1, ringCap: 200,
  profile: null,          // { v, guestToken, nickname, createdAt, updatedAt }
  records: null,          // { v, list:[{ts,mode,result,winner,turns,seed,opp,hp[2],stats}] }
  oppName: null,          // PvP 对手昵称（init.name / hello 消息交换所得）
  init(){
    try { this.profile = JSON.parse(localStorage.getItem(USER_KEYS.profile) || "null"); } catch(e){ this.profile = null; }
    try { this.records = JSON.parse(localStorage.getItem(USER_KEYS.records) || "null"); } catch(e){ this.records = null; }
    let created = false;
    if(!this.profile || this.profile.v !== this.v){
      this.profile = { v: this.v, guestToken: this.newToken(), nickname: this.genNickname(), createdAt: Date.now(), updatedAt: Date.now() };
      created = true;
    }
    if(!this.records || this.records.v !== this.v){ this.records = { v: this.v, list: [] }; }
    if(created){ this.save(); }
    return this.profile;
  },
  save(){
    try {
      localStorage.setItem(USER_KEYS.profile, JSON.stringify(this.profile));
      localStorage.setItem(USER_KEYS.records, JSON.stringify(this.records));
    } catch(e){}
  },
  newToken(){ return "g-" + Date.now().toString(36) + "-" + Math.floor(Math.random()*1e9).toString(36); },
  genNickname(){
    const a = ["青云","玄水","赤炎","苍山","幽谷","流云","丹穴","灵墟"];
    const b = ["白泽","应龙","夫诸","乘黄","毕方","九尾","獬豸","精卫","狰","刑天"];
    return a[Math.floor(Math.random()*a.length)] + b[Math.floor(Math.random()*b.length)];
  },
  setNickname(n){
    n = String(n||"").trim().slice(0,12);
    if(!n || n === this.profile.nickname) return false;
    this.profile.nickname = n;
    this.profile.updatedAt = Date.now();
    this.save();
    return true;
  },
  // 终局记录（showEnd 调用）：result 仅为 ai/pvp 视角（win/lose/draw）；热座存 winner 座位
  recordGame(game){
    if(!game || !game.ended) return null;
    const Gm = game;
    const my = (Gm.mode === "pvp") ? (Gm.role === "p1" ? "player" : "ai") : "player";
    let result = null;
    if(Gm.mode === "ai" || Gm.mode === "pvp"){
      result = Gm.winner === "draw" ? "draw" : (Gm.winner === my ? "win" : "lose");
    }
    const winner = Gm.winner === "draw" ? "平局" : (Gm.winner === "player" ? "1P" : "2P");
    const rec = {
      ts: Date.now(), mode: Gm.mode, result, winner, turns: Gm.turn, seed: Gm.seed,
      opp: (Gm.mode === "pvp" && this.oppName) ? this.oppName : null,
      hp: [Gm.player ? Gm.player.hp : 0, Gm.ai ? Gm.ai.hp : 0],
      stats: Gm.stats ? Object.assign({}, Gm.stats) : {},
    };
    this.records.list.push(rec);
    if(this.records.list.length > this.ringCap){ this.records.list.splice(0, this.records.list.length - this.ringCap); }
    this.save();
    return rec;
  },
  summary(){
    const s = { ai:{w:0,l:0,d:0}, pvp:{w:0,l:0,d:0}, hotseat:0, total:0, turns:0 };
    this.records.list.forEach(r=>{
      s.total++; s.turns += r.turns||0;
      if(r.mode === "ai" || r.mode === "pvp"){
        const m = s[r.mode];
        if(r.result === "win") m.w++; else if(r.result === "lose") m.l++; else m.d++;
      } else if(r.mode === "hotseat"){ s.hotseat++; }
    });
    return s;
  },
  reset(){
    try { localStorage.removeItem(USER_KEYS.profile); localStorage.removeItem(USER_KEYS.records); } catch(e){}
    this.profile = null; this.records = null;
    this.init();
  },
};

