/* Reservia demo v3 — daha gelişmiş özellikler */
(function () {
  'use strict';

  /* ---------- extra helpers ---------- */
  const THEME_KEY = 'reservia-demo-theme';
  const $ = (s, root = document) => root.querySelector(s);
  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pad = n => String(n).padStart(2, '0');
  const iso = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const parseISO = s => { const [y, m, d] = String(s).split('-').map(Number); return new Date(y, m - 1, d); };
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const addMin = (d, m) => { const x = new Date(d); x.setMinutes(x.getMinutes() + m); return x; };
  const startOfDay = d => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
  const toMin = t => { const [h, m] = String(t).split(':').map(Number); return h * 60 + m; };
  const fmtTime = d => pad(d.getHours()) + ':' + pad(d.getMinutes());
  const MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
  const MONTHS_SHORT = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
  const DAYS_LONG = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
  const DAYS_SHORT = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
  const TODAY = startOfDay(new Date());
  const TODAY_ISO = iso(TODAY);
  const dayName = s => DAYS_LONG[parseISO(s).getDay()];
  const fmtLong = s => { const d = parseISO(s); return d.getDate() + ' ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear(); };
  const fmtShort = s => { const d = parseISO(s); return d.getDate() + ' ' + MONTHS_SHORT[d.getMonth()]; };
  const weekdayOf = s => parseISO(s).getDay();
  const weekdayIndex = s => weekdayOf(s) || 7;
  function renderIfChanged(root, key, html) {
    if (root.dataset[key] === html) return;
    root.dataset[key] = html;
    root.innerHTML = html;
  }

  function svg(n, s = 18) {
    const icons = {
      plus: '<path d="M12 5v14M5 12h14"/>',
      arrow: '<path d="M5 12h13M13 6l6 6-6 6"/>',
      close: '<path d="M6 6l12 12M18 6L6 18"/>',
      calendar: '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
      clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
      check: '<path d="m5 12 4 4L19 6"/>',
      download: '<path d="M12 3v12m0 0-4-4m4 4 4-4M4 19h16"/>',
      share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4m0-11-6.8 4"/>',
      mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
      user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
      zap: '<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8Z"/>'
    };
    return `<svg class="icon" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${icons[n] || ''}</svg>`;
  }

  /* ---------- erişim: sayfalama yardımcısı ---------- */
  function attachPagination(containerSel, getItems, renderRow, opts = {}) {
    const perPage = opts.perPage || 8;
    const container = $(containerSel);
    if (!container) return;
    const list = getItems();
    if (!list.length) return;
    let page = 0;
    const total = Math.ceil(list.length / perPage);
    function draw() {
      const start = page * perPage;
      const chunk = list.slice(start, start + perPage);
      const rows = container.querySelectorAll('.pg-row');
      rows.forEach(r => r.remove());
      const foot = container.querySelector('.pg-foot');
      if (foot) foot.remove();
      chunk.forEach(item => {
        const div = document.createElement('div');
        div.className = 'pg-row';
        div.innerHTML = renderRow(item);
        container.appendChild(div);
      });
      if (total <= 1) return;
      const f = document.createElement('div');
      f.className = 'pg-foot';
      f.innerHTML = `<span>Sayfa ${page + 1} / ${total} · ${list.length} sonuç</span><div class="pg-actions"><button class="mini-btn" ${page === 0 ? 'disabled' : ''} data-act="prev">${svg('arrow', 14)}</button><button class="mini-btn" ${page >= total - 1 ? 'disabled' : ''} data-act="next">${svg('arrow', 14)}</button></div>`;
      f.querySelector('[data-act="prev"]').style.transform = 'rotate(180deg)';
      f.querySelector('[data-act="prev"]').onclick = () => { if (page > 0) { page--; draw(); } };
      f.querySelector('[data-act="next"]').onclick = () => { if (page < total - 1) { page++; draw(); } };
      container.appendChild(f);
    }
    draw();
  }

  /* ---------- müşteri tarafı: daha zengin akış ---------- */
  function ensureCustomerId() {
    try {
      if (!localStorage.getItem('reservia-cust-v1')) {
        localStorage.setItem('reservia-cust-v1', 'CUST-' + Date.now().toString(36).toUpperCase());
      }
    } catch (e) { }
  }
  ensureCustomerId();

  /* ---------- CSV export ---------- */
  function exportCsv() {
    const app = window.app, data = app._data ? app._data() : null;
    if (!data || !window.app.active) return;
    const b = window.app.active();
    const rows = data.bookings.filter(x => x.businessId === b.id);
    if (!rows.length) { app.toast('Dışa aktarılacak rezervasyon yok.'); return; }
    const header = ['id', 'tarih', 'saat', 'musteri', 'eposta', 'telefon', 'hizmet', 'kisi', 'durum', 'not', 'olusturulma'];
    const body = rows.map(r => [
      r.id, r.date, r.time, '"' + String(r.customer || '').replace(/"/g, '""') + '"',
      r.email || '', r.phone || '', '"' + String(r.service || '').replace(/"/g, '""') + '"',
      r.party || 1, r.status, '"' + String(r.notes || '').replace(/"/g, '""') + '"', r.createdAt || ''
    ].join(','));
    const csv = [header.join(','), ...body].join('\r\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'reservia-' + b.id + '-' + TODAY_ISO + '.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    app.toast('CSV indirildi.');
  }

  /* ---------- ICS takvim dosyası ---------- */
  function toICSDate(d, t) {
    // naive local time format (YYYYMMDDTHHMMSS) without TZ offset for offline use
    const [y, mo, da] = d.split('-');
    const [hh, mm] = (t || '00:00').split(':');
    return y + mo + da + 'T' + hh + mm + '00';
  }

  function exportIcs() {
    const app = window.app;
    if (!app || !app.active) return;
    const b = app.active();
    const data = app._data ? app._data() : null;
    if (!data) return;
    const rows = data.bookings.filter(x => x.businessId === b.id && x.status !== 'cancelled' && x.date >= TODAY_ISO);
    if (!rows.length) { app.toast('Yaklaşan rezervasyon yok.'); return; }
    const now = new Date();
    const stamp = now.getUTCFullYear() + pad(now.getUTCMonth() + 1) + pad(now.getUTCDate()) + 'T' + pad(now.getUTCHours()) + pad(now.getUTCMinutes()) + pad(now.getUTCSeconds()) + 'Z';
    let out = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Reservia//Demo//TR', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'].join('\r\n') + '\r\n';
    rows.forEach(r => {
      const uid = r.id + '@reservia-demo';
      const dtstart = toICSDate(r.date, r.time);
      // varsayılan 60 dk
      const endMin = toMin(r.time) + 60;
      const hh = pad(Math.floor(endMin / 60) % 24);
      const mm = pad(endMin % 60);
      const dtend = r.date.replace(/-/g, '') + 'T' + hh + mm + '00';
      out += [
        'BEGIN:VEVENT',
        'UID:' + uid,
        'DTSTAMP:' + stamp,
        'DTSTART:' + dtstart,
        'DTEND:' + dtend,
        'SUMMARY:' + 'Reservia: ' + (r.service || 'Rezervasyon') + ' - ' + r.customer,
        'DESCRIPTION:' + 'Müşteri: ' + r.customer + '\\nE-posta: ' + (r.email || '') + '\\nTelefon: ' + (r.phone || '') + '\\nKişi: ' + (r.party || 1) + '\\nNot: ' + (r.notes || ''),
        'LOCATION:' + b.location,
        'STATUS:CONFIRMED',
        'END:VEVENT'
      ].join('\r\n') + '\r\n';
    });
    out += 'END:VCALENDAR\r\n';
    const blob = new Blob([out], { type: 'text/calendar;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'reservia-' + b.id + '-yaklasan.ics';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    app.toast('Takvim (.ics) indirildi.');
  }

  /* ---------- kuyruk görünümü (bugün) ---------- */
  function drawQueue() {
    const app = window.app;
    const data = app._data ? app._data() : null;
    if (!data || !app.active) return;
    const id = app.active().id;
    const list = data.bookings
      .filter(b => b.businessId === id && b.date === TODAY_ISO && b.status !== 'cancelled')
      .sort((a, b) => (a.time + a.date).localeCompare(b.time + b.date));
    const root = $('#queue-root');
    if (!root) return;
    if (!list.length) { renderIfChanged(root, 'renderedQueue', '<div class="empty">Bugün için sıralı rezervasyon yok.</div>'); return; }
    renderIfChanged(root, 'renderedQueue', list.map((r, i) => `<div class="queue-item"><span class="q-num">${i + 1}</span><span class="q-time">${r.time}</span><span class="q-main"><b>${esc(r.customer)}</b><small>${esc(r.service)} · ${r.party} kişi</small></span><span class="q-status">${r.status === 'confirmed' ? 'Onaylı' : 'Bekliyor'}</span>${r.status === 'pending' ? `<button class="mini-btn mini-btn-green" onclick="app.setBookingStatus('${esc(r.id)}','confirmed');app._refreshQueue&&app._refreshQueue()">${svg('check', 14)}</button>` : ''}</div>`).join(''));
  }

  /* ---------- hızlı istatistikler ---------- */
  function drawInsights() {
    const app = window.app;
    const data = app._data ? app._data() : null;
    if (!data || !app.active) return;
    const id = app.active().id;
    const b = app.active();
    const live = data.bookings.filter(x => x.businessId === id && x.status !== 'cancelled');
    const today = live.filter(x => x.date === TODAY_ISO).length;
    const week = live.filter(x => x.date >= TODAY_ISO && x.date < iso(addDays(TODAY, 7))).length;
    const pending = live.filter(x => x.status === 'pending' && x.date >= TODAY_ISO).length;
    const last7 = [];
    for (let i = 6; i >= 0; i--) {
      const d = iso(addDays(TODAY, -i));
      last7.push(live.filter(x => x.date === d).length);
    }
    const max = Math.max(1, ...last7);
    const root = $('#insights-root');
    if (!root) return;
    renderIfChanged(root, 'renderedInsights', `<div class="ins-grid">
      <div class="ins-card"><span>Bugün</span><strong>${today}</strong></div>
      <div class="ins-card"><span>7 gün</span><strong>${week}</strong></div>
      <div class="ins-card"><span>Bekleyen</span><strong>${pending}</strong></div>
      <div class="ins-card"><span>Kapasite</span><strong>${Number((window.app._settings&&window.app._settings(id)||{}).capacity)||1} kişi/slot</strong></div>
    </div>
    <div class="sparkline">${last7.map(v => `<span style="height:${Math.round((v/max)*100)}%" title="${v}"></span>`).join('')}</div>
    <p class="muted small">Son 7 gün eğilimi · ${esc(b.name)}</p>`);
  }

  /* ---------- müşteri paneline hızlı link ---------- */
  function openCustomer() {
    const app = window.app;
    if (!app) return;
    if (!app._selected || !app._selected()) { app.toast('Önce bir işletme seç.'); return; }
    app.openBook ? app.openBook() : app.view('book');
  }

  /* ---------- bootstrap hooks ---------- */
  function boot() {
    setTimeout(() => {
      const app = window.app;
      if (!app) return;
      app._data = () => (function(){ try { return JSON.parse(localStorage.getItem('reservia-demo-v2')); } catch(e){ return null; } })();
      app._selected = () => { const d = app._data(); return d ? d.selected : null; };
      app._settings = (id) => { const d = app._data(); if (!d) return {}; return (d.settingsByBusiness && d.settingsByBusiness[id]) || {}; };
      app._refreshQueue = drawQueue;
      app.exportCsv = exportCsv;
      app.exportIcs = exportIcs;
      app.openCustomer = openCustomer;
      // Ayarlar sayfasına butonlar ekle
      const settingsRoot = document.querySelector('.settings-side');
      if (settingsRoot && !$('#export-panel')) {
        const div = document.createElement('div');
        div.className = 'panel';
        div.id = 'export-panel';
        div.innerHTML = `<div class="panel-head"><h3>Dışa aktar</h3><span class="pill">CSV / ICS</span></div><p class="muted small">Listeyi dışa aktar veya takvim uygulamana aktar.</p><div class="data-actions"><button class="btn btn-secondary" onclick="app.exportCsv()">${svg('download', 15)} CSV indir</button><button class="btn btn-secondary" onclick="app.exportIcs()">${svg('calendar', 15)} Takvim (.ics)</button><button class="btn btn-secondary" onclick="app.openCustomer()">${svg('share', 15)} Müşteri linkini aç</button></div>`;
        settingsRoot.appendChild(div);
      }
      // Genel bakışa kuyruk + içgörü
      const main = document.querySelector('#content');
      const obs = new MutationObserver(() => {
        if (document.querySelector('#queue-root')) drawQueue();
        if (document.querySelector('#insights-root')) drawInsights();
      });
      if (main) obs.observe(main, { childList: true, subtree: true });
      drawQueue(); drawInsights();
    }, 400);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
