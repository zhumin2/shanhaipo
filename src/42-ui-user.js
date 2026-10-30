/* ============ 用户档案面板（本地用户系统 UI） ============ */
function userFmtTs(ts){ const d=new Date(ts); const p=n=>String(n).padStart(2,"0"); return p(d.getMonth()+1)+"-"+p(d.getDate())+" "+p(d.getHours())+":"+p(d.getMinutes()); }
function userModeLabel(m){ return m==="ai"?"打AI":(m==="pvp"?"在线":"同屏"); }
function openUserPanel(){ renderUserPanel(); document.getElementById("userPanel").style.display="flex"; }
function closeUserPanel(){ document.getElementById("userPanel").style.display="none"; }
function saveNickname(){
  const inp = document.getElementById("nickInput");
  if(UserSys.setNickname(inp.value)){ logMsg("昵称已更新："+UserSys.profile.nickname,"s"); }
  renderUserPanel(); renderMeters();
}
function resetProfile(){
  if(!window.confirm("确定重置档案？昵称与全部本地战绩将被清除（不影响当前对局）。")) return;
  UserSys.reset(); renderUserPanel(); renderMeters();
  logMsg("档案已重置。","s");
}
function renderUserPanel(){
  const box = document.getElementById("userBox");
  if(!box || !UserSys.profile) return;
  const p = UserSys.profile, sm = UserSys.summary();
  const rows = UserSys.records.list.slice(-14).reverse().map(r=>{
    const res = r.result==="win" ? `<span style="color:var(--good);font-weight:700;">胜</span>`
              : r.result==="lose" ? `<span style="color:var(--bad);font-weight:700;">负</span>`
              : r.result==="draw" ? `<span style="color:var(--sub);font-weight:700;">平</span>`
              : `<span style="color:var(--sub);">${r.winner}胜</span>`;
    const opp = r.opp ? ` vs ${r.opp}` : "";
    return `<div style="display:flex;justify-content:space-between;gap:8px;padding:3px 0;border-bottom:1px dashed var(--line);font-size:12px;">
      <span>${userFmtTs(r.ts)} · ${userModeLabel(r.mode)}${opp}</span>
      <span>${res} · ${r.turns}回合</span></div>`;
  }).join("") || `<div style="color:var(--sub);padding:6px 0;">暂无战绩，完成一局后自动记录。</div>`;
  const escNick = p.nickname.replace(/&/g,"&amp;").replace(/"/g,"&quot;");
  box.innerHTML = `
    <h2>我的档案</h2>
    <div style="text-align:left;font-size:13px;line-height:1.9;">
      <div style="display:flex;gap:6px;align-items:center;">
        <b>昵称</b>
        <input id="nickInput" maxlength="12" value="${escNick}" style="flex:1;min-width:0;border:1px solid var(--line);border-radius:6px;padding:4px 8px;font-size:14px;background:var(--card);color:var(--ink);">
        <button class="btn small" onclick="saveNickname()">保存</button>
      </div>
      <div style="color:var(--sub);font-size:11px;">游客档案 ${p.guestToken.slice(0,10)}…（仅存本设备浏览器，正式版可绑定账号云同步）</div>
      <div style="border-top:1px solid var(--line);margin:8px 0;"></div>
      <b>累计战绩</b>（共 ${sm.total} 局 ｜ 合计 ${sm.turns} 回合）<br>
      打AI：${sm.ai.w}胜 ${sm.ai.l}负 ${sm.ai.d}平 ｜ 在线：${sm.pvp.w}胜 ${sm.pvp.l}负 ${sm.pvp.d}平 ｜ 同屏：${sm.hotseat} 局
      <div style="border-top:1px solid var(--line);margin:8px 0;"></div>
      <b>最近对局</b>
      <div style="max-height:180px;overflow-y:auto;">${rows}</div>
    </div>
    <div style="margin-top:12px;">
      <button class="btn small alert" onclick="resetProfile()">重置档案</button>
      <button class="btn primary" onclick="closeUserPanel()">关闭</button>
    </div>`;
}

