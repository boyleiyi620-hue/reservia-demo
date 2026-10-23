/* Reservia v3 inline enhancement */
(function(){
  function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function ensureExp(){
    if(document.querySelector('#export-panel')) return;
    var side=document.querySelector('.settings-side');
    if(!side) return;
    var d=document.createElement('div');
    d.className='panel'; d.id='export-panel';
    d.innerHTML='<div class="panel-head"><h3>DÄ±ÅŸa aktar</h3><span class="pill">CSV / ICS</span></div><p class="muted small">Listeyi dÄ±ÅŸa aktar veya takvim uygulamana aktar.</p><div class="data-actions"><button class="btn btn-secondary" onclick="app.exportCsv()">CSV indir</button><button class="btn btn-secondary" onclick="app.exportIcs()">Takvim (.ics)</button><button class="btn btn-secondary" onclick="app.openBook()">MÃ¼ÅŸteri gÃ¶rÃ¼nÃ¼mÃ¼</button></div>';
    side.appendChild(d);
  }
  function drawQ(){ try{
    var appw=window.app; if(!appw||!appw.active) return;
    var b=appw.active();
    var data; try{ data=JSON.parse(localStorage.getItem('reservia-demo-v2')||'{}'); }catch(e){ data={bookings:[]}; }
    var qr=document.querySelector('#queue-root'); if(!qr) return;
    var today=new Date().toISOString().slice(0,10);
    var lst=(data.bookings||[]).filter(function(x){ return x.businessId===b.id && x.date===today && x.status!=='cancelled'; }).sort(function(a,c){ return a.time.localeCompare(c.time); });
    if(!lst.length){ qr.innerHTML='<div class="empty">BugÃ¼n iÃ§in sÄ±ralÄ± rezervasyon yok.</div>'; return; }
    qr.innerHTML=lst.map(function(rn,i){
      var act=rn.status==='pending'?'<button class="mini-btn mini-btn-green" onclick="app.setBookingStatus(\''+rn.id+'\',\'confirmed\');setTimeout(function(){var o=[].find.call(document.querySelectorAll(\'[data-nav]\'),function(x){return x.dataset.nav===\'overview\';});if(o)o.click();},70)">âœ“</button>':'';
      return '<div class="queue-item"><span class="q-num">'+(i+1)+'</span><span class="q-time">'+esc(rn.time)+'</span><span class="q-main"><b>'+esc(rn.customer)+'</b><small>'+esc(rn.service)+' Â· '+rn.party+' kiÅŸi</small></span><span class="q-status">'+(rn.status==='confirmed'?'OnaylÄ±':'Bekliyor')+'</span>'+act+'</div>';
    }).join(''); }catch(e){}
  }
  function drawI(){
    var appw=window.app; if(!appw||!appw.active) return;
    var b=appw.active();
    var data; try{ data=JSON.parse(localStorage.getItem('reservia-demo-v2')||'{}'); }catch(e){ data={bookings:[]}; }
    var live=(data.bookings||[]).filter(function(x){ return b&&x.businessId===b.id&&x.status!=='cancelled'; });
    var today=new Date().toISOString().slice(0,10);
    var t=live.filter(function(x){ return x.date===today; }).length;
    var now=new Date();
    var w=0;
    for(var di=0;di<7;di++){
      var nd=new Date(now.getFullYear(),now.getMonth(),now.getDate()+di);
      if(nd<new Date(now.getFullYear(),now.getMonth(),now.getDate())) continue;
      var ns=nd.getFullYear()+'-'+String(nd.getMonth()+1).padStart(2,'0')+'-'+String(nd.getDate()).padStart(2,'0');
      w += live.filter(function(x){ return x.date===ns; }).length;
    }
    var p=live.filter(function(x){ return x.status==='pending'; }).length;
    var arr=[];
    for(var i=6;i>=0;i--){ var nd2=new Date(now.getFullYear(),now.getMonth(),now.getDate()-i); var ns2=nd2.getFullYear()+'-'+String(nd2.getMonth()+1).padStart(2,'0')+'-'+String(nd2.getDate()).padStart(2,'0'); arr.push(live.filter(function(x){ return x.date===ns2; }).length); }
    var mx=Math.max(1,...arr);
    var r=document.querySelector('#insights-root');
    if(r){
      r.innerHTML='<div class="ins-grid"><div class="ins-card"><span>BugÃ¼n</span><strong>'+t+'</strong></div><div class="ins-card"><span>7 gÃ¼n</span><strong>'+w+'</strong></div><div class="ins-card"><span>Bekleyen</span><strong>'+p+'</strong></div><div class="ins-card"><span>Aktif</span><strong>'+live.length+'</strong></div></div><div class="sparkline">'+arr.map(function(v){return '<span style="height:'+(Math.round(v/mx*100))+'%"></span>';}).join('')+'</div>';
    }
  }catch(e){}
  }
  function refreshAll(){ drawQ(); drawI(); ensureExp(); }
  var mo=new MutationObserver(refreshAll);
  var c=document.querySelector('#content'); if(c) mo.observe(c,{childList:true,subtree:true});
  refreshAll();
  document.addEventListener('click',function(){ setTimeout(refreshAll,200); }, true);
  setInterval(refreshAll, 15000);
})();
