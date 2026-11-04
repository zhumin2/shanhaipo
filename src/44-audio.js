/* ============ 音效系统（v3.0，Web Audio 合成，零素材） ============
 * 设计：所有音色由振荡器/噪声实时合成，不引入任何音频文件（遵守单文件零依赖约束）。
 * 触发点与动画同帧（由 anim* 函数直接调用），晚一帧就没有打击感。
 * 首次用户交互后才可发声（浏览器自动播放策略），AudioContext 懒创建。 */
const SFX = (function(){
  let ctx = null, master = null, noiseBuf = null;
  const VOL = 0.26;
  function ensure(){
    if(!ctx){
      const AC = window.AudioContext || window.webkitAudioContext;
      if(!AC) return null;
      try{ ctx = new AC(); }catch(e){ return null; }
      master = ctx.createGain();
      master.gain.value = VOL;
      master.connect(ctx.destination);
      // 预生成 0.6s 白噪声缓冲，供打击/破碎类音色复用
      const len = Math.floor(ctx.sampleRate * 0.6);
      noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      let seed = 22222;                       // 固定种子 LCG 生成噪声，保证音色可复现（不引入真随机）
      for(let i=0;i<len;i++){ seed = (seed*1103515245 + 12345) & 0x7fffffff; d[i] = (seed/0x3fffffff) - 1; }
    }
    if(ctx.state === "suspended"){ try{ ctx.resume(); }catch(e){} }
    return ctx;
  }
  function tone(freq, dur, type, gain, toFreq){
    const c = ensure(); if(!c) return;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type || "sine";
    o.frequency.setValueAtTime(freq, c.currentTime);
    if(toFreq) o.frequency.exponentialRampToValueAtTime(Math.max(20, toFreq), c.currentTime + dur);
    g.gain.setValueAtTime(0.0001, c.currentTime);
    g.gain.exponentialRampToValueAtTime(gain == null ? 0.5 : gain, c.currentTime + Math.min(0.012, dur*0.2));
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
    o.connect(g); g.connect(master);
    o.start(); o.stop(c.currentTime + dur + 0.02);
  }
  function noise(dur, gain, from, to){
    const c = ensure(); if(!c || !noiseBuf) return;
    const s = c.createBufferSource(); s.buffer = noiseBuf;
    const f = c.createBiquadFilter(); f.type = "lowpass";
    f.frequency.setValueAtTime(from || 2400, c.currentTime);
    f.frequency.exponentialRampToValueAtTime(Math.max(80, to || 400), c.currentTime + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(gain == null ? 0.35 : gain, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
    s.connect(f); f.connect(g); g.connect(master);
    s.start(); s.stop(c.currentTime + dur + 0.02);
  }
  const BANKS = {
    place(){ tone(220, 0.09, "triangle", 0.42); noise(0.06, 0.20, 1600, 500); },      // 落子
    swing(){ noise(0.09, 0.30, 900, 220); },                                          // 破风
    hit(){ tone(96, 0.13, "sine", 0.55); noise(0.10, 0.26, 1200, 300); },             // 受击闷响
    crit(){ tone(150, 0.10, "sine", 0.5, 70); noise(0.16, 0.34, 2000, 260); },        // 克制重击
    hp(){ tone(72, 0.22, "sine", 0.45, 48); noise(0.14, 0.20, 900, 200); },           // 本源扣血
    break(){ tone(392, 0.55, "sine", 0.34); tone(587, 0.55, "sine", 0.24); noise(0.3, 0.16, 3000, 600); }, // 破封（纯五度上行）
    seal(){ tone(300, 0.35, "triangle", 0.3, 140); },                                  // 镇封
    death(){ noise(0.32, 0.42, 2200, 120); tone(60, 0.3, "sine", 0.4, 32); },         // 阵亡
    win(){ [523, 659, 784].forEach((f,i)=> setTimeout(()=>tone(f, 0.34, "sine", 0.36), i*110)); },
    lose(){ [392, 294].forEach((f,i)=> setTimeout(()=>tone(f, 0.45, "sine", 0.32), i*140)); },
    turn(){ tone(660, 0.08, "triangle", 0.16); },
    click(){ tone(880, 0.03, "square", 0.06); }
  };
  function enabled(){
    try{
      if(typeof UserSys !== "undefined" && UserSys.profile && UserSys.profile.sfxOff) return false;
    }catch(e){}
    return true;
  }
  return {
    play(name){
      if(!enabled()) return;
      const fn = BANKS[name];
      if(!fn) return;
      try{ fn(); }catch(e){}
    },
    toggle(){
      try{
        UserSys.profile.sfxOff = !UserSys.profile.sfxOff;
        UserSys.profile.updatedAt = Date.now();
        UserSys.save();
        if(!UserSys.profile.sfxOff){ ensure(); this.play("click"); }
        return !UserSys.profile.sfxOff;
      }catch(e){ return false; }
    },
    on(){ return enabled(); }
  };
})();
