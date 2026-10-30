/* ============ ?pvpAuto 自动对局（本地验证用） ============ */
(function(){
  var qs = new URLSearchParams(location.search);
  if(!qs.get("pvpAuto")) return;
  var role = qs.get("role");
  window.addEventListener("load", function(){
    setTimeout(function(){
      startPvp(role);
      var iv = setInterval(function(){
        if(role==="p1"){
          var o = document.getElementById("offerOut").value;
          if(o){ try{ localStorage.setItem("shp_offer", o); }catch(e){} clearInterval(iv); }
        } else {
          var o2 = localStorage.getItem("shp_offer");
          if(o2){ document.getElementById("offerIn").value = o2;
            var nb=[...document.querySelectorAll('#pvpBtns button')].find(function(b){return b.textContent.trim()==='下一步';});
            if(nb) nb.click();
            clearInterval(iv);
          }
        }
      }, 300);
      var iv2 = setInterval(function(){
        if(role==="p1"){
          var a = localStorage.getItem("shp_answer");
          if(a){ document.getElementById("answerIn").value = a;
            var cb=[...document.querySelectorAll('#pvpBtns button')].find(function(b){return b.textContent.trim()==='建立连接';});
            if(cb) cb.click();
            clearInterval(iv2);
          }
        } else {
          var a2 = document.getElementById("answerOut").value;
          if(a2){ try{ localStorage.setItem("shp_answer", a2); }catch(e){} clearInterval(iv2); }
        }
      }, 300);
      // 开局后注入手牌 + 自动对局
      var iv3 = setInterval(function(){
        if(G && G.mode==="pvp" && G.player && G.peer && G.player.hand && G.role===role){
          clearInterval(iv3);
          var H=['F3','M2','W2','W6'];
          G.player.hand = H.slice();
          G.ai.hand = H.slice();
          renderAll();
          window.__autoLog = [];
          window.__hist = [];
          autoPlayPvp(role);
        }
      }, 400);
    }, 600);
  });
  function autoPlayPvp(role){
    var act = function(){
      if(!G || G.ended){ reportAuto(); return; }
      if(G.mode!=="pvp"){ reportAuto(); return; }
      if(canActNow()){
        var me = mySide();
        var hi = me.hand.findIndex(function(id){ var c=CARDS.find(function(x){return x.id===id;}); return c && c.kind==="creature" && c.cost<=me.mana; });
        if(hi>=0){ onHandClick(hi, true);
          var db=[...document.querySelectorAll('#actionBar button')].find(function(b){return b.textContent.indexOf('部署到灵位')>=0;});
          if(db) db.click();
        }
        setTimeout(function(){
          var idx = (!G.waitingPeer) ? me.field.findIndex(function(s){return s && !s.attacked;}) : -1; // 等待防御应答期间不再发起新攻击（TDD-17）
          if(idx>=0){ onMySlotClick(idx);
            var ab=[...document.querySelectorAll('#actionBar button')].find(function(b){return b.textContent.trim()==='攻击';});
            if(ab){ ab.click();
              var hb=[...document.querySelectorAll('#actionBar button')].find(function(b){return b.textContent.indexOf('攻击敌方本源')>=0;});
              if(hb) hb.click();
            }
          }
          setTimeout(function(){ if(canActNow() && !G.waitingPeer) endTurn(); // 防御未结算不得结束回合（TDD-17）
            var _op = me===G.player?G.ai:G.player;
            window.__hist.push("t"+G.turn+"|a"+G.active+"|p1hp"+G.player.hp+"|p2hp"+G.ai.hp+"|myf"+JSON.stringify(me.field.map(function(x){return x?x.name:"-";}))+"|oppf"+JSON.stringify(_op.field.map(function(x){return x?x.name:"-";})));
            setTimeout(act, 400); }, 400);
        }, 350);
      } else {
        if(ui.mode==="defend"){
          var di = mySide().field.findIndex(function(s){return s;});
          if(di>=0) resolveDefend(di); else resolveDefend(null);
        }
        setTimeout(act, 450);
      }
    };
    setTimeout(act, 700);
  }
  function reportAuto(){
    var hist = (window.__hist||[]).join("\n");
    var info = "AUTO|r="+(G.role||"?")+"|t="+(G.turn||0)+"|p1hp="+(G.player?G.player.hp:0)+"|p2hp="+(G.ai?G.ai.hp:0)+"|win="+(G.winner||"none")+"|end="+G.ended+"|p1f="+(G.player?(G.player.field.filter(Boolean).length):0)+"|p2f="+(G.ai?(G.ai.field.filter(Boolean).length):0)+"\n"+hist;
    document.title = info.slice(0,400);
    try{ localStorage.setItem("shp_res_"+role, info); }catch(e){}
  }
})();
