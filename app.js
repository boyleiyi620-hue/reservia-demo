/* Reservia demo v2 â€” framework-free application logic. No network requests. */
(function () {
  'use strict';

  /* ---------- storage keys ---------- */
  const KEY = 'reservia-demo-v2';
  const THEME_KEY = 'reservia-demo-theme';
  const VERSION = 2;

  /* ---------- tiny helpers ---------- */
  const $ = (s, root = document) => root.querySelector(s);
  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const clone = (v) => JSON.parse(JSON.stringify(v));
  const uid = (p = 'id') => p + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const pad = n => String(n).padStart(2, '0');
  const iso = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const parseISO = s => { const [y, m, d] = String(s).split('-').map(Number); return new Date(y, m - 1, d); };
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const startOfDay = d => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
  const startOfMonth = d => new Date(d.getFullYear(), d.getMonth(), 1);
  const toMin = t => { const [h, m] = String(t).split(':').map(Number); return h * 60 + m; };
  const fromMin = n => pad(Math.floor(n / 60)) + ':' + pad(n % 60);
  const TODAY = startOfDay(new Date());
  const TODAY_ISO = iso(TODAY);

  const MONTHS = ['Ocak', 'Åžubat', 'Mart', 'Nisan', 'MayÄ±s', 'Haziran', 'Temmuz', 'AÄŸustos', 'EylÃ¼l', 'Ekim', 'KasÄ±m', 'AralÄ±k'];
  const MONTHS_SHORT = ['Oca', 'Åžub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'AÄŸu', 'Eyl', 'Eki', 'Kas', 'Ara'];
  const DAYS_LONG = ['Pazar', 'Pazartesi', 'SalÄ±', 'Ã‡arÅŸamba', 'PerÅŸembe', 'Cuma', 'Cumartesi'];
  const DAYS_SHORT = ['Pzt', 'Sal', 'Ã‡ar', 'Per', 'Cum', 'Cmt', 'Paz'];

  const weekdayOf = s => parseISO(s).getDay();          // 0 = Pazar
  const weekdayIndex = s => weekdayOf(s) || 7;          // 1 = Pazartesi ... 7 = Pazar
  const dayName = s => DAYS_LONG[weekdayOf(s)];
  const fmtLong = s => { const d = parseISO(s); return d.getDate() + ' ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear(); };
  const fmtShort = s => { const d = parseISO(s); return d.getDate() + ' ' + MONTHS_SHORT[d.getMonth()]; };
  const relDay = s => {
    const diff = Math.round((parseISO(s) - TODAY) / 86400000);
    if (diff === 0) return 'BugÃ¼n';
    if (diff === 1) return 'YarÄ±n';
    if (diff === -1) return 'DÃ¼n';
    return fmtShort(s);
  };
  const nowStamp = () => { const d = new Date(); return iso(d) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes()); };

  /* ---------- icons ---------- */
  const ICONS = {
    plus: '<path d="M12 5v14M5 12h14"/>',
    arrow: '<path d="M5 12h13M13 6l6 6-6 6"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    calendar: '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    users: '<path d="M16 20v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1M9.5 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM17 8a3 3 0 0 1 0 6M21 20v-1a4 4 0 0 0-3-3.87"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    left: '<path d="m15 18-6-6 6-6"/>',
    right: '<path d="m9 18 6-6-6-6"/>',
    trash: '<path d="M4 7h16M9 7V5h6v2m-8 0 1 13h8l1-13"/>',
    download: '<path d="M12 3v12m0 0-4-4m4 4 4-4M4 19h16"/>',
    upload: '<path d="M12 15V3m0 0L8 7m4-4 4 4M4 19h16"/>',
    reset: '<path d="M4 12a8 8 0 1 0 3-6.2M4 4v5h5"/>',
    moon: '<path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5Z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19"/>',
    phone: '<path d="M5 3h4l2 5-3 2a12 12 0 0 0 6 6l2-3 5 2v4a2 2 0 0 1-2 2A18 18 0 0 1 3 5a2 2 0 0 1 2-2Z"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    spark: '<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5Z"/>'
  };
  const svg = (n, s = 18) => `<svg class="icon" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONS[n] || ''}</svg>`;

  /* ---------- defaults ---------- */
  const SETTINGS_BY_TYPE = {
    Otel: { start: '09:00', end: '18:00', duration: 60, capacity: 3, dateRange: 90, weekdays: [1, 2, 3, 4, 5, 6, 7], services: ['Standart Oda', 'Deluxe Oda', 'Suit Oda', 'KahvaltÄ± Dahil Oda'] },
    Berber: { start: '09:00', end: '19:00', duration: 30, capacity: 1, dateRange: 60, weekdays: [1, 2, 3, 4, 5, 6], services: ['SaÃ§ Kesimi', 'Sakal TÄ±raÅŸÄ±', 'SaÃ§ + Sakal', 'Cilt BakÄ±mÄ±'] },
    Kafe: { start: '10:00', end: '22:00', duration: 60, capacity: 6, dateRange: 30, weekdays: [1, 2, 3, 4, 5, 6, 7], services: ['Masa Rezervasyonu', 'KahvaltÄ± MasasÄ±', 'Pencere KenarÄ±', 'Teras'] },
    DiÄŸer: { start: '09:00', end: '18:00', duration: 30, capacity: 1, dateRange: 30, weekdays: [1, 2, 3, 4, 5], services: ['Rezervasyon'] }
  };
  const FALLBACK_SETTINGS = SETTINGS_BY_TYPE.DiÄŸer;

  const BUSINESSES = [
    { id: 'hotel', name: 'Mysa Boutique Hotel', type: 'Otel', img: 'assets/hotel.jpg', location: 'Ä°stanbul', color: '#5d7f72', about: 'BoÄŸaz manzaralÄ± butik otel' },
    { id: 'barber', name: 'Studio 34 Barber', type: 'Berber', img: 'assets/barber.jpg', location: 'Ä°stanbul', color: '#c77c55', about: 'Åžehrin merkezinde erkek kuafÃ¶rÃ¼' },
    { id: 'cafe', name: 'Minoa Coffee', type: 'Kafe', img: 'assets/cafe.jpg', location: 'Ä°stanbul', color: '#c29b62', about: 'ÃœÃ§Ã¼ncÃ¼ nesil kahve ve kahvaltÄ±' }
  ];
  const IMG_BY_TYPE = { Otel: 'assets/hotel.jpg', Berber: 'assets/barber.jpg', Kafe: 'assets/cafe.jpg', StÃ¼dyo: 'assets/cafe.jpg', DiÄŸer: 'assets/hotel.jpg' };

  function seedBookings() {
    const d = n => iso(addDays(TODAY, n));
    return [
      { id: 'bk-1', businessId: 'hotel', customer: 'Elif YÄ±lmaz', email: 'elif@example.com', phone: '0532 000 00 01', date: d(0), time: '14:00', service: 'Deluxe Oda', status: 'confirmed', party: 2, notes: 'YÃ¼ksek kat tercih ediliyor.', createdAt: d(-3) },
      { id: 'bk-2', businessId: 'hotel', customer: 'Can AydÄ±n', email: 'can@example.com', phone: '0532 000 00 02', date: d(0), time: '16:00', service: 'Standart Oda', status: 'confirmed', party: 1, notes: '', createdAt: d(-1) },
      { id: 'bk-3', businessId: 'hotel', customer: 'Deniz Arslan', email: 'deniz@example.com', phone: '0532 000 00 05', date: d(2), time: '10:00', service: 'Suit Oda', status: 'pending', party: 2, notes: '', createdAt: d(0) },
      { id: 'bk-4', businessId: 'barber', customer: 'Mert Kaya', email: 'mert@example.com', phone: '0532 000 00 03', date: d(0), time: '11:00', service: 'SaÃ§ Kesimi', status: 'confirmed', party: 1, notes: '', createdAt: d(-2) },
      { id: 'bk-5', businessId: 'barber', customer: 'Aylin Åžahin', email: 'aylin@example.com', phone: '0532 000 00 06', date: d(1), time: '15:30', service: 'SaÃ§ + Sakal', status: 'pending', party: 1, notes: '', createdAt: d(-1) },
      { id: 'bk-6', businessId: 'cafe', customer: 'Selin Ak', email: 'selin@example.com', phone: '0532 000 00 04', date: d(1), time: '13:00', service: 'Masa Rezervasyonu', status: 'pending', party: 4, notes: 'Pencere kenarÄ± olabilirse.', createdAt: d(0) },
      { id: 'bk-7', businessId: 'cafe', customer: 'Burak Demir', email: 'burak@example.com', phone: '0532 000 00 07', date: d(-2), time: '19:00', service: 'Teras', status: 'confirmed', party: 3, notes: '', createdAt: d(-5) }
    ];
  }

  function defaults() {
    const settingsByBusiness = {};
    BUSINESSES.forEach(b => {
      settingsByBusiness[b.id] = Object.assign({}, clone(SETTINGS_BY_TYPE[b.type] || FALLBACK_SETTINGS), { businessName: b.name, color: b.color });
    });
    return {
      version: VERSION,
      businesses: clone(BUSINESSES),
      bookings: seedBookings(),
      selected: null,
      account: 'Can Arslan',
      settings: clone(settingsByBusiness.hotel),
      settingsByBusiness,
      wizardCodeSeq: 1042
    };
  }

  function load() {
    let raw = null;
    try { raw = JSON.parse(localStorage.getItem(KEY)); } catch (e) { raw = null; }
    if (!raw || raw.version !== VERSION || !Array.isArray(raw.businesses) || !raw.businesses.length) return defaults();
    const d = Object.assign(defaults(), raw);
    d.settingsByBusiness = Object.assign({}, d.settingsByBusiness);
    d.businesses.forEach(b => {
      d.settingsByBusiness[b.id] = Object.assign({}, clone(SETTINGS_BY_TYPE[b.type] || FALLBACK_SETTINGS), d.settingsByBusiness[b.id] || {});
      if (!Array.isArray(d.settingsByBusiness[b.id].services) || !d.settingsByBusiness[b.id].services.length) {
        d.settingsByBusiness[b.id].services = clone(FALLBACK_SETTINGS.services);
      }
    });
    if (!Array.isArray(d.bookings)) d.bookings = [];
    if (d.selected && !d.businesses.some(b => b.id === d.selected)) d.selected = null;
    return d;
  }

  function persist() {
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { /* storage full / disabled */ }
  }

  /* ---------- state ---------- */
  let data = load();
  let theme = localStorage.getItem(THEME_KEY) || (window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  const ui = {
    view: 'businesses',
    month: startOfMonth(TODAY),
    day: TODAY_ISO,
    q: '',
    status: '',
    range: 'upcoming',
    sort: 'date-asc',
    wizard: null
  };

  /* ---------- selectors ---------- */
  const biz = id => data.businesses.find(b => b.id === id) || data.businesses[0];
  const active = () => biz(data.selected || data.businesses[0].id);
  const settingsOf = id => data.settingsByBusiness[id] || data.settings;
  const bookingsOf = id => data.bookings.filter(b => b.businessId === id);
  const liveBookings = id => bookingsOf(id).filter(b => b.status !== 'cancelled');
  const byDateTime = (a, b) => (a.date + a.time).localeCompare(b.date + b.time);
  const isOpenWeekday = (id, date) => (settingsOf(id).weekdays || []).includes(weekdayIndex(date));
  const lastBookable = id => iso(addDays(TODAY, Number(settingsOf(id).dateRange) || 30));
  const inRange = (id, date) => date >= TODAY_ISO && date <= lastBookable(id);

  function slotsFor(id) {
    const s = settingsOf(id);
    const step = Math.max(15, Number(s.duration) || 30);
    const end = toMin(s.end);
    const out = [];
    for (let t = toMin(s.start); t < end; t += step) out.push(fromMin(t));
    return out;
  }

  function slotLoad(id, date, time) {
    return data.bookings
      .filter(b => b.businessId === id && b.date === date && b.time === time && b.status !== 'cancelled')
      .reduce((n, b) => n + (Number(b.party) || 1), 0);
  }

  function slotFree(id, date, time, party) {
    const cap = Number(settingsOf(id).capacity) || 1;
    return slotLoad(id, date, time) + Math.max(1, Number(party) || 1) <= cap;
  }

  function slotError(id, date, time, party) {
    if (!date || !time) return 'LÃ¼tfen tarih ve saat seÃ§.';
    if (!inRange(id, date)) return 'SeÃ§tiÄŸin tarih rezervasyon aralÄ±ÄŸÄ± dÄ±ÅŸÄ±nda.';
    if (!isOpenWeekday(id, date)) return 'Ä°ÅŸletme bu gÃ¼n kapalÄ±. BaÅŸka bir gÃ¼n seÃ§.';
    if (!slotsFor(id).includes(time)) return 'SeÃ§tiÄŸin saat Ã§alÄ±ÅŸma saatleri dÄ±ÅŸÄ±nda.';
    if (!slotFree(id, date, time, party)) return 'Bu saat dolu. LÃ¼tfen baÅŸka bir saat seÃ§.';
    return null;
  }

  function openDates(id, limit = 21) {
    const s = settingsOf(id);
    const out = [];
    const span = Math.max(1, Math.min(90, Number(s.dateRange) || 30));
    for (let i = 0; i < span; i++) {
      const d = iso(addDays(TODAY, i));
      if (isOpenWeekday(id, d)) out.push(d);
      if (out.length >= limit) break;
    }
    return out;
  }

  function occupancy(id) {
    const s = settingsOf(id);
    const slots = slotsFor(id).length;
    const cap = Number(s.capacity) || 1;
    const y = ui.month.getFullYear(), m = ui.month.getMonth();
    const dim = new Date(y, m + 1, 0).getDate();
    let openDays = 0;
    for (let d = 1; d <= dim; d++) if (isOpenWeekday(id, iso(new Date(y, m, d)))) openDays++;
    const seats = Math.max(1, openDays * slots * cap);
    const prefix = y + '-' + pad(m + 1);
    const booked = liveBookings(id)
      .filter(b => b.date.slice(0, 7) === prefix)
      .reduce((n, b) => n + (Number(b.party) || 1), 0);
    return Math.round(Math.min(100, (booked / seats) * 100));
  }

  /* ---------- theme ---------- */
  function applyTheme() {
    document.documentElement.setAttribute('data-theme', theme);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#121a17' : '#22584c');
    const btn = $('#theme-toggle');
    if (btn) {
      btn.innerHTML = svg(theme === 'dark' ? 'sun' : 'moon');
      btn.setAttribute('aria-label', theme === 'dark' ? 'AÃ§Ä±k temaya geÃ§' : 'Koyu temaya geÃ§');
      btn.setAttribute('title', theme === 'dark' ? 'AÃ§Ä±k tema' : 'Koyu tema');
    }
  }

  function toggleTheme() {
    theme = theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem(THEME_KEY, theme);
    applyTheme();
    toast(theme === 'dark' ? 'Koyu tema aÃ§Ä±k.' : 'AÃ§Ä±k tema aÃ§Ä±k.');
  }

  /* ---------- shell ---------- */
  const TITLES = { businesses: 'Ä°ÅŸletmelerim', overview: 'Genel bakÄ±ÅŸ', calendar: 'Takvim', bookings: 'Rezervasyonlar', settings: 'Ã–zelleÅŸtirme', book: 'MÃ¼ÅŸteri gÃ¶rÃ¼nÃ¼mÃ¼' };

  function setText(id, text) { const el = document.getElementById(id); if (el) el.textContent = text; }

  function shell() {
    const b = active();
    setText('business-name', data.selected ? b.name : "Can'Ä±n Ã§alÄ±ÅŸma alanÄ±");
    const nc = document.querySelector('.nav-count');
    if (nc) nc.textContent = data.businesses.length;
    const pending = data.bookings.filter(x => x.businessId === b.id && x.status === 'pending' && x.date >= TODAY_ISO);
    const pc = $('#pending-count');
    if (pc) { pc.textContent = pending.length ? String(pending.length) : ''; pc.style.display = pending.length ? '' : 'none'; }
    setText('account-name', data.account || 'Demo KullanÄ±cÄ±');
    setText('page-title', TITLES[ui.view] || 'Ä°ÅŸletmelerim');
    setText('crumb', ui.view === 'businesses' ? 'Ä°ÅŸletmelerim' : b.name);
    setText('header-date', TODAY.getDate() + ' ' + MONTHS[TODAY.getMonth()] + ' ' + TODAY.getFullYear() + ', ' + DAYS_LONG[TODAY.getDay()]);
    document.querySelectorAll('[data-nav]').forEach(a => a.classList.toggle('active', a.dataset.nav === ui.view));
    applyTheme();
  }

  function render() {
    shell();
    const c = $('#content');
    if (!c) return;
    const views = { businesses, overview, calendar, bookings, settings, book };
    c.innerHTML = (views[ui.view] || businesses)();
  }

  /* ---------- shared pieces ---------- */
  const statusPill = s => s === 'confirmed'
    ? '<span class="pill pill-green">OnaylandÄ±</span>'
    : s === 'cancelled'
      ? '<span class="pill pill-blue">Ä°ptal</span>'
      : '<span class="pill pill-amber">Bekliyor</span>';

  function avatar(name) {
    const parts = String(name || '?').trim().split(/\s+/);
    const initials = (parts[0] || '').charAt(0) + (parts.length > 1 ? parts[parts.length - 1].charAt(0) : '');
    return `<span class="avatar">${esc(initials.toUpperCase())}</span>`;
  }

  function row(x) {
    return `<div class="tr"><span class="inline">${avatar(x.customer)}<span><b>${esc(x.customer)}</b><small>${esc(x.service || 'Rezervasyon')}</small></span></span><span>${esc(relDay(x.date))} Â· ${esc(x.time)}</span><span>${statusPill(x.status)}</span></div>`;
  }

  function calendarGrid(id) {
    const y = ui.month.getFullYear(), m = ui.month.getMonth();
    const offset = (new Date(y, m, 1).getDay() + 6) % 7;
    const days = new Date(y, m + 1, 0).getDate();
    let out = '<div class="cal-grid">';
    DAYS_SHORT.forEach(d => { out += `<span class="cal-head">${d}</span>`; });
    for (let i = 0; i < offset; i++) out += '<span class="cal-cell is-empty"></span>';
    for (let d = 1; d <= days; d++) {
      const date = iso(new Date(y, m, d));
      const count = liveBookings(id).filter(b => b.date === date).length;
      const cls = ['cal-cell'];
      if (date === TODAY_ISO) cls.push('is-today');
      if (date === ui.day) cls.push('is-selected');
      if (!isOpenWeekday(id, date)) cls.push('is-closed');
      if (date < TODAY_ISO) cls.push('is-past');
      out += `<button type="button" class="${cls.join(' ')}" onclick="app.pickDay('${date}')" aria-label="${esc(fmtLong(date) + ', ' + dayName(date))}${count ? ', ' + count + ' rezervasyon' : ', rezervasyon yok'}"><span class="cal-num">${d}</span>${count ? `<span class="cal-count">${count}</span>` : ''}</button>`;
    }
    return out + '</div>';
  }

  function dayPanel(id) {
    const list = bookingsOf(id).filter(b => b.date === ui.day).sort(byDateTime);
    return `<div class="panel day-panel"><div class="panel-head"><div><h3>${esc(relDay(ui.day))}</h3><small class="muted">${esc(fmtLong(ui.day) + ' Â· ' + dayName(ui.day))}</small></div><button class="text-btn" onclick="app.modal('booking','${ui.day}')">${svg('plus',15)} Ekle</button></div>
      ${list.length ? `<div class="day-list">${list.map(x => `<div class="day-item"><div class="day-time">${esc(x.time)}</div><div class="day-main">${avatar(x.customer)}<span><b>${esc(x.customer)}</b><small>${esc(x.service || 'Rezervasyon')} Â· ${x.party} kiÅŸi</small></span></div><div class="day-side">${statusPill(x.status)}${x.status === 'pending' ? `<button class="mini-btn mini-btn-green" onclick="app.setBookingStatus('${esc(x.id)}','confirmed')">Onayla</button>` : ''}</div></div>`).join('')}</div>` : '<div class="empty">Bu gÃ¼n iÃ§in rezervasyon yok.<br><small>Uygun bir saat seÃ§ip ilk rezervasyonu oluÅŸtur.</small></div>'}
    </div>`;
  }

  function monthBar() {
    return `<div class="cal-nav"><button class="icon-btn" onclick="app.shiftMonth(-1)" aria-label="Ã–nceki ay">${svg('left')}</button><strong>${MONTHS[ui.month.getMonth()]} ${ui.month.getFullYear()}</strong><button class="icon-btn" onclick="app.shiftMonth(1)" aria-label="Sonraki ay">${svg('right')}</button><button class="text-btn" onclick="app.goToday()">BugÃ¼n</button></div>`;
  }

  /* ---------- view: businesses ---------- */
  function businesses() {
    return `<section class="page-intro section-heading"><div><div class="eyebrow">HER Ä°ÅžLETMENÄ°N RÄ°TMÄ° FARKLI</div><h1>Ä°ÅŸletmeni seÃ§,<br>gerisini kolaylaÅŸtÄ±r.</h1><p>RezervasyonlarÄ±nÄ± yÃ¶netmek ve deneyimini Ã¶zelleÅŸtirmek iÃ§in bir iÅŸletme seÃ§.</p></div><button class="btn btn-primary" onclick="app.modal('new-business')">${svg('plus',16)} Yeni iÅŸletme</button></section>
    <div class="summary-row"><span><b>${data.businesses.length}</b> iÅŸletme</span><span><b>${data.bookings.filter(b => b.status !== 'cancelled' && b.date >= TODAY_ISO).length}</b> yaklaÅŸan rezervasyon</span><span><b>${data.bookings.filter(b => b.status === 'pending' && b.date >= TODAY_ISO).length}</b> onay bekliyor</span></div>
    <div class="business-grid">${data.businesses.map(b => {
      const live = liveBookings(b.id);
      const today = live.filter(x => x.date === TODAY_ISO).length;
      return `<article class="business-card ${data.selected === b.id ? 'selected' : ''}"><div class="card-image"><img src="${esc(b.img)}" alt="${esc(b.name)}" loading="lazy"><span class="category">${esc(b.type)}</span><span class="pill pill-green active-badge">Aktif</span></div><div class="card-body"><h3>${esc(b.name)}</h3><div class="card-meta"><span>${svg('calendar', 15)} ${esc(b.location)}</span><span>${live.length} rezervasyon</span></div><div class="card-meta card-meta-tight"><span>${svg('clock', 15)} BugÃ¼n ${today} rezervasyon</span><span>${bookingsOf(b.id).filter(x => x.status === 'pending' && x.date >= TODAY_ISO).length} bekleyen</span></div><button class="business-cta" onclick="app.select('${esc(b.id)}')">YÃ¶netim paneline git ${svg('arrow', 16)}</button></div></article>`;
    }).join('')}</div>
    <div class="onboarding-banner"><div class="round-icon">${svg('calendar', 22)}</div><div><h3>Ä°ÅŸletmene Ã¶zel bir rezervasyon deneyimi.</h3><p>Ã‡alÄ±ÅŸma saatlerinden hizmetlerine, her ÅŸey senin kontrolÃ¼nde.</p></div><button class="btn btn-secondary" onclick="app.modal('guide')">NasÄ±l Ã§alÄ±ÅŸÄ±r?</button></div>
    <div class="quick-guide"><div class="step"><b>01</b><strong>Ä°ÅŸletmeni seÃ§</strong><span>Paneline giriÅŸ yap.</span></div><div class="step"><b>02</b><strong>Takvimini dÃ¼zenle</strong><span>Saatlerini, hizmetlerini ve kapasiteni belirle.</span></div><div class="step"><b>03</b><strong>Rezervasyon almaya baÅŸla</strong><span>MÃ¼ÅŸteri gÃ¶rÃ¼nÃ¼mÃ¼nÃ¼ paylaÅŸ, rezervasyonlarÄ± topla.</span></div></div>`;
  }

  /* ---------- view: overview ---------- */
  function overview() {
    const b = active();
    const live = liveBookings(b.id);
    const todayList = live.filter(x => x.date === TODAY_ISO).sort(byDateTime);
    const weekEnd = iso(addDays(TODAY, 7));
    const upcoming = live.filter(x => x.date >= TODAY_ISO).sort(byDateTime).slice(0, 5);
    const pending = live.filter(x => x.status === 'pending' && x.date >= TODAY_ISO).length;
    return `<div class="section-heading"><div><div class="eyebrow">${esc(String(b.type).toUpperCase())} / GENEL BAKIÅž</div><h1>${esc(b.name)}</h1><p class="muted">${esc(b.about || 'BugÃ¼n iÅŸletmendeki hareketlere hÄ±zlÄ±ca gÃ¶z at.')}</p></div><div class="heading-actions"><button class="btn btn-secondary" onclick="app.openBook()">${svg('user', 16)} MÃ¼ÅŸteri gÃ¶rÃ¼nÃ¼mÃ¼</button><button class="btn btn-primary" onclick="app.modal('booking')">${svg('plus', 16)} Yeni rezervasyon</button></div></div>
    <div class="stats-grid">
      <div class="stat-card"><span>BugÃ¼n</span><strong>${todayList.length}</strong><small>${todayList.length ? 'rezervasyon var' : 'sakin bir gÃ¼n'}</small></div>
      <div class="stat-card"><span>Ã–nÃ¼mÃ¼zdeki 7 gÃ¼n</span><strong>${live.filter(x => x.date >= TODAY_ISO && x.date < weekEnd).length}</strong><small>rezervasyon</small></div>
      <div class="stat-card"><span>Onay bekleyen</span><strong>${pending}</strong><small>${pending ? 'seni bekliyor' : 'her ÅŸey onaylÄ±'}</small></div>
      <div class="stat-card"><span>Doluluk</span><strong>%${occupancy(b.id)}</strong><small>${MONTHS[ui.month.getMonth()]} ortalamasÄ±</small></div>
    </div>
    <div class="two-col">
      <div class="panel"><div class="panel-head"><h3>YaklaÅŸan rezervasyonlar</h3><button class="text-btn" onclick="app.view('bookings')">TÃ¼mÃ¼nÃ¼ gÃ¶r ${svg('arrow', 15)}</button></div>${upcoming.length ? `<div class="booking-table"><div class="tr th"><span>MÃ¼ÅŸteri</span><span>Tarih / Saat</span><span>Durum</span></div>${upcoming.map(row).join('')}</div>` : '<div class="empty">HenÃ¼z yaklaÅŸan rezervasyon yok.<br><small>Yeni bir rezervasyon oluÅŸturarak baÅŸla.</small></div>'}</div>
      <div class="panel"><div class="panel-head"><h3>${MONTHS[ui.month.getMonth()]} ${ui.month.getFullYear()}</h3><button class="text-btn" onclick="app.view('calendar')">Takvim ${svg('arrow', 15)}</button></div>${calendarGrid(b.id)}<div class="panel-foot">${todayList.length ? `<span class="muted">BugÃ¼n ${todayList.length} rezervasyon</span><button class="text-btn" onclick="app.pickDay('${TODAY_ISO}');app.view('calendar')">GÃ¼nÃ¼ aÃ§ ${svg('arrow', 15)}</button>` : '<span class="muted">BugÃ¼n iÃ§in rezervasyon yok.</span>'}</div></div>
    </div>
    <div class="two-col" style="margin-top:18px">
      <div class="panel"><div class="panel-head"><h3>BugÃ¼n sÄ±ra</h3><span class="pill">GerÃ§ek zamanlÄ±</span></div><div id="queue-root"></div></div>
      <div class="panel"><div class="panel-head"><h3>Son 7 gÃ¼n</h3><span class="pill pill-green">EÄŸilim</span></div><div id="insights-root"></div></div>
    </div>`;
  }

  /* ---------- view: calendar ---------- */
  function calendar() {
    const b = active();
    return `<div class="section-heading"><div><div class="eyebrow">TAKVÄ°M</div><h1>${esc(b.name)}</h1><p class="muted">GÃ¼nlere tÄ±klayarak rezervasyonlarÄ± gÃ¶r, boÅŸ saatleri deÄŸerlendir.</p></div><div class="heading-actions">${monthBar()}</div></div>
    <div class="two-col calendar-layout"><div class="panel"><div class="panel-head"><h3>${MONTHS[ui.month.getMonth()]} ${ui.month.getFullYear()}</h3><span class="pill pill-green">${bookingsOf(b.id).filter(x => x.date.slice(0, 7) === ui.month.getFullYear() + '-' + pad(ui.month.getMonth() + 1) && x.status !== 'cancelled').length} rezervasyon</span></div>${calendarGrid(b.id)}<div class="cal-legend"><span><i class="dot dot-today"></i>BugÃ¼n</span><span><i class="dot dot-full"></i>Rezervasyonlu</span><span><i class="dot dot-closed"></i>KapalÄ± gÃ¼n</span></div></div>${dayPanel(b.id)}</div>`;
  }

  /* ---------- view: bookings ---------- */
  function filteredBookings() {
    const id = active().id;
    const q = (ui.q || '').toLocaleLowerCase('tr');
    let list = bookingsOf(id).slice();
    if (ui.status) list = list.filter(b => b.status === ui.status);
    if (ui.range === 'upcoming') list = list.filter(b => b.date >= TODAY_ISO && b.status !== 'cancelled');
    if (ui.range === 'past') list = list.filter(b => b.date < TODAY_ISO);
    if (q) list = list.filter(b => (b.customer + ' ' + (b.email || '') + ' ' + (b.service || '')).toLocaleLowerCase('tr').includes(q));
    if (ui.sort === 'date-desc') list.sort((a, b) => byDateTime(b, a));
    else if (ui.sort === 'name') list.sort((a, b) => a.customer.localeCompare(b.customer, 'tr'));
    else list.sort(byDateTime);
    return list;
  }

  function fullRow(x) {
    return `<div class="tr booking-row"><span class="inline">${avatar(x.customer)}<span><b>${esc(x.customer)}</b><small>${esc(x.email || '')}${x.phone ? ' Â· ' + esc(x.phone) : ''}</small></span></span><span><b class="cell-strong">${esc(relDay(x.date))}</b><small class="cell-sub">${esc(x.time)} Â· ${esc(x.service || 'Rezervasyon')} Â· ${x.party} kiÅŸi</small></span><span>${statusPill(x.status)}</span><span class="row-actions">${x.status === 'pending' ? `<button class="mini-btn mini-btn-green" onclick="app.setBookingStatus('${esc(x.id)}','confirmed')" title="Onayla">${svg('check', 15)}</button>` : ''}${x.status === 'confirmed' ? `<button class="mini-btn" onclick="app.setBookingStatus('${esc(x.id)}','pending')" title="Beklemeye al">${svg('clock', 15)}</button>` : ''}${x.status !== 'cancelled' ? `<button class="mini-btn" onclick="app.cancelBooking('${esc(x.id)}')" title="Ä°ptal et">${svg('close', 15)}</button>` : ''}<button class="mini-btn mini-btn-danger" onclick="app.removeBooking('${esc(x.id)}')" title="Sil">${svg('trash', 15)}</button></span></div>`;
  }

  function bookings() {
    const b = active();
    const list = filteredBookings();
    const live = liveBookings(b.id);
    return `<div class="section-heading"><div><div class="eyebrow">REZERVASYONLAR</div><h1>${esc(b.name)}</h1><p class="muted">${live.length} aktif rezervasyon Â· ${live.filter(x => x.status === 'pending' && x.date >= TODAY_ISO).length} onay bekliyor.</p></div><button class="btn btn-primary" onclick="app.modal('booking')">${svg('plus', 16)} Yeni rezervasyon</button></div>
    <div class="booking-toolbar">
      <label class="search-field">${svg('search', 16)}<input id="booking-filter" type="search" placeholder="MÃ¼ÅŸteri, e-posta veya hizmet ara..." value="${esc(ui.q)}" oninput="app.filterBookings(this.value)"></label>
      <select id="status-filter" onchange="app.setFilter('status',this.value)"><option value="">TÃ¼m durumlar</option><option value="confirmed" ${ui.status === 'confirmed' ? 'selected' : ''}>OnaylandÄ±</option><option value="pending" ${ui.status === 'pending' ? 'selected' : ''}>Bekliyor</option><option value="cancelled" ${ui.status === 'cancelled' ? 'selected' : ''}>Ä°ptal</option></select>
      <select id="range-filter" onchange="app.setFilter('range',this.value)"><option value="upcoming" ${ui.range === 'upcoming' ? 'selected' : ''}>YaklaÅŸan</option><option value="past" ${ui.range === 'past' ? 'selected' : ''}>GeÃ§miÅŸ</option><option value="all" ${ui.range === 'all' ? 'selected' : ''}>TÃ¼mÃ¼</option></select>
      <select id="sort-filter" onchange="app.setFilter('sort',this.value)"><option value="date-asc" ${ui.sort === 'date-asc' ? 'selected' : ''}>Tarih â†‘</option><option value="date-desc" ${ui.sort === 'date-desc' ? 'selected' : ''}>Tarih â†“</option><option value="name" ${ui.sort === 'name' ? 'selected' : ''}>Ä°sme gÃ¶re</option></select>
    </div>
    <div class="panel"><div class="booking-table full-table" id="booking-list"><div class="tr th"><span>MÃ¼ÅŸteri</span><span>Tarih / Hizmet</span><span>Durum</span><span>Ä°ÅŸlem</span></div>${list.length ? list.map(fullRow).join('') : '<div class="empty">Bu filtreye uygun rezervasyon yok.<br><small>Filtreleri deÄŸiÅŸtir ya da yeni bir rezervasyon oluÅŸtur.</small></div>'}</div></div>`;
  }

  /* ---------- view: settings ---------- */
  function settings() {
    const s = settingsOf(active().id), b = active();
    return `<div class="section-heading"><div><div class="eyebrow">Ä°ÅžLETME AYARLARI</div><h1>Ã–zelleÅŸtirme</h1><p class="muted">${esc(b.name)} iÃ§in rezervasyon deneyimini Ã¶zelleÅŸtir.</p></div><button class="btn btn-primary" onclick="app.saveSettings(event)">${svg('check', 16)} Kaydet</button></div>
    <div class="two-col settings-layout">
      <form class="panel" id="settings-form" onsubmit="app.saveSettings(event);return false;">
        <div class="form-grid">
          <label class="field full">Ä°ÅŸletme adÄ±<input name="businessName" value="${esc(s.businessName || b.name)}" required></label>
          <label class="field">Tema rengi<input name="color" type="color" value="${esc(s.color || b.color)}"></label>
          <label class="field">Rezervasyon aralÄ±ÄŸÄ±<select name="dateRange"><option value="30" ${Number(s.dateRange) === 30 ? 'selected' : ''}>30 gÃ¼n</option><option value="60" ${Number(s.dateRange) === 60 ? 'selected' : ''}>60 gÃ¼n</option><option value="90" ${Number(s.dateRange) === 90 ? 'selected' : ''}>90 gÃ¼n</option></select></label>
          <label class="field">BaÅŸlangÄ±Ã§ saati<input name="start" type="time" value="${esc(s.start)}"></label>
          <label class="field">BitiÅŸ saati<input name="end" type="time" value="${esc(s.end)}"></label>
          <label class="field">Slot sÃ¼resi<select name="duration"><option value="15" ${Number(s.duration) === 15 ? 'selected' : ''}>15 dakika</option><option value="30" ${Number(s.duration) === 30 ? 'selected' : ''}>30 dakika</option><option value="60" ${Number(s.duration) === 60 ? 'selected' : ''}>60 dakika</option></select></label>
          <label class="field">Slot kapasitesi <span class="hint">kiÅŸi / slot</span><input name="capacity" type="number" min="1" max="50" value="${esc(s.capacity)}"></label>
          <label class="field full">Hizmetler <span class="hint">virgÃ¼lle ayÄ±r</span><input name="services" value="${esc((s.services || []).join(', '))}" placeholder="SaÃ§ Kesimi, Sakal TÄ±raÅŸÄ±"></label>
          <div class="field full"><span>Ã‡alÄ±ÅŸma gÃ¼nleri</span><div class="weekday-list">${DAYS_SHORT.map((d, i) => `<label><input type="checkbox" name="weekdays" value="${i + 1}" ${(s.weekdays || []).includes(i + 1) ? 'checked' : ''}> ${d}</label>`).join('')}</div></div>
        </div>
        <div class="settings-note">${svg('clock', 16)} <span>${slotsFor(b.id).length} gÃ¼nlÃ¼k slot Â· ${esc(s.start)}â€“${esc(s.end)} arasÄ± Â· ${Number(s.capacity) || 1} kiÅŸi kapasite</span></div>
      </form>
      <div class="settings-side">
        <div class="panel preview-card"><div class="panel-head"><h3>CanlÄ± Ã¶nizleme</h3><span class="pill pill-green">MÃ¼ÅŸteri gÃ¶rÃ¼nÃ¼mÃ¼</span></div><div class="preview-phone"><div class="preview-logo" style="background:${esc(s.color || b.color)}">${esc((s.businessName || b.name).charAt(0))}</div><h2>${esc(s.businessName || b.name)}</h2><p class="muted">${(s.services || []).length} hizmet Â· kolayca rezervasyon yapÄ±n.</p><button class="btn btn-primary" onclick="app.openBook()">Rezervasyon akÄ±ÅŸÄ±nÄ± aÃ§ ${svg('arrow', 15)}</button></div></div>
        <div class="panel"><div class="panel-head"><h3>Veri</h3><span class="pill">localStorage</span></div><p class="muted small">Demo verisi yalnÄ±zca bu tarayÄ±cÄ±da saklanÄ±r. Yedek alabilir, geri yÃ¼kleyebilir veya sÄ±fÄ±rlayabilirsin.</p><div class="data-actions"><button class="btn btn-secondary" onclick="app.exportData()">${svg('download', 15)} Yedek al</button><label class="btn btn-secondary file-btn">${svg('upload', 15)} Geri yÃ¼kle<input type="file" accept="application/json" onchange="app.importData(this)"></label><button class="btn btn-ghost" onclick="app.resetData()">${svg('reset', 15)} SÄ±fÄ±rla</button></div></div>
      </div>
    </div>`;
  }

  /* ---------- view: customer booking wizard ---------- */
  function newWizard() {
    return { step: 1, service: '', party: 1, date: '', time: '', customer: '', email: '', phone: '', notes: '', code: '' };
  }

  function wizardState() {
    if (!ui.wizard) ui.wizard = newWizard();
    const w = ui.wizard;
    const id = active().id;
    if (!w.service) {
      const services = settingsOf(id).services || [];
      if (services.length) w.service = services[0];
    }
    if (!w.date) {
      const dates = openDates(id);
      w.date = dates[0] || TODAY_ISO;
    }
    return w;
  }

  function wizardSteps(w) {
    const labels = ['Hizmet', 'Tarih & saat', 'Bilgiler', 'Onay'];
    return `<div class="wizard-steps">${labels.map((l, i) => `<span class="wz-step ${w.step > i + 1 ? 'is-done' : ''} ${w.step === i + 1 ? 'is-current' : ''}"><b>${w.step > i + 1 ? svg('check', 12) : i + 1}</b>${l}</span>`).join('')}</div>`;
  }

  function book() {
    const b = active(), s = settingsOf(b.id), w = wizardState();

    if (w.step === 4) {
      return `<div class="book-wrap"><div class="panel confirm-card"><span class="confirm-icon">${svg('check', 26)}</span><h1>Rezervasyonun alÄ±ndÄ±!</h1><p class="muted">${esc(b.name)} seni bekliyor. Bilgiler demo olarak bu tarayÄ±cÄ±da saklandÄ±.</p><div class="confirm-code"><small>REZERVASYON KODU</small><strong>${esc(w.code)}</strong></div><dl class="confirm-list"><div><dt>Hizmet</dt><dd>${esc(w.service)}</dd></div><div><dt>Tarih</dt><dd>${esc(fmtLong(w.date) + ', ' + dayName(w.date))}</dd></div><div><dt>Saat</dt><dd>${esc(w.time)}</dd></div><div><dt>KiÅŸi</dt><dd>${esc(w.party)} kiÅŸi</dd></div><div><dt>Ad soyad</dt><dd>${esc(w.customer)}</dd></div><div><dt>Ä°letiÅŸim</dt><dd>${esc(w.email)}${w.phone ? ' Â· ' + esc(w.phone) : ''}</dd></div></dl><div class="confirm-actions"><button class="btn btn-primary" onclick="app.restartWizard()">Yeni rezervasyon</button><button class="btn btn-secondary" onclick="app.closeBook()">Panele dÃ¶n</button></div></div></div>`;
    }

    let body = '';
    if (w.step === 1) {
      body = `<div class="wz-title"><h2>Hangi hizmeti istiyorsun?</h2><p class="muted">${esc(b.name)} Â· ${esc(b.location)}</p></div><div class="service-grid">${(s.services || []).map(name => `<button type="button" class="service-card ${w.service === name ? 'is-selected' : ''}" onclick="app.wizSet('service','${esc(name)}')"><span class="service-check">${w.service === name ? svg('check', 14) : ''}</span><strong>${esc(name)}</strong><small>${Math.max(15, Number(s.duration) || 30)} dk Â· ${esc(s.start)}â€“${esc(s.end)}</small></button>`).join('')}</div><div class="party-row"><span>KaÃ§ kiÅŸi?</span><div class="stepper"><button type="button" onclick="app.wizParty(-1)" aria-label="Azalt">âˆ’</button><strong>${w.party}</strong><button type="button" onclick="app.wizParty(1)" aria-label="ArtÄ±r">+</button></div></div>`;
    } else if (w.step === 2) {
      const dates = openDates(b.id);
      const slots = slotsFor(b.id);
      body = `<div class="wz-title"><h2>Tarih ve saat seÃ§</h2><p class="muted">${esc(w.service)} Â· ${w.party} kiÅŸi</p></div><div class="chip-row">${dates.map(d => `<button type="button" class="chip ${w.date === d ? 'is-selected' : ''}" onclick="app.wizSet('date','${d}')"><small>${esc(relDay(d))}</small><strong>${esc(fmtShort(d))}</strong><span>${esc(DAY_SHORT(d))}</span></button>`).join('')}</div><div class="slot-grid">${slots.map(t => { const err = slotError(b.id, w.date, t, w.party); return `<button type="button" class="slot ${w.time === t ? 'is-selected' : ''} ${err ? 'is-disabled' : ''}" ${err ? 'disabled' : ''} onclick="app.wizSet('time','${t}')"><strong>${t}</strong><small>${err ? 'Dolu' : 'Uygun'}</small></button>`; }).join('')}</div>`;
    } else {
      body = `<div class="wz-title"><h2>Bilgilerini tamamla</h2><p class="muted">${esc(w.service)} Â· ${esc(fmtShort(w.date))} Â· ${esc(w.time)} Â· ${w.party} kiÅŸi</p></div><label class="field">Ad soyad<input name="customer" id="wz-name" value="${esc(w.customer)}" placeholder="AdÄ±n ve soyadÄ±n" oninput="app.wizSet('customer',this.value)"></label><div class="form-grid"><label class="field">E-posta<input name="email" type="email" value="${esc(w.email)}" placeholder="ornek@eposta.com" oninput="app.wizSet('email',this.value)"></label><label class="field">Telefon<input name="phone" type="tel" value="${esc(w.phone)}" placeholder="05xx xxx xx xx" oninput="app.wizSet('phone',this.value)"></label></div><label class="field">Not <span class="hint">opsiyonel</span><textarea name="notes" rows="2" oninput="app.wizSet('notes',this.value)" placeholder="Ã–zel bir isteÄŸin var mÄ±?">${esc(w.notes)}</textarea></label><p class="muted small">Bu bir demo rezervasyonudur; gerÃ§ek iÅŸletmeye iletilmez.</p>`;
    }

    const backLabel = w.step === 1 ? 'Panele dÃ¶n' : 'Geri';
    return `<div class="book-wrap"><div class="panel wizard"><div class="wizard-head"><div class="preview-logo" style="background:${esc(s.color || b.color)}">${esc((s.businessName || b.name).charAt(0))}</div><div><strong>${esc(s.businessName || b.name)}</strong><small class="muted">${esc(b.type)} Â· ${esc(b.location)}</small></div><span class="pill pill-green">MÃ¼ÅŸteri gÃ¶rÃ¼nÃ¼mÃ¼</span></div>${wizardSteps(w)}<div class="wizard-body">${body}</div><div class="wizard-foot"><button class="btn btn-ghost" onclick="app.wizBack()">${backLabel}</button>${w.step < 3 ? `<button class="btn btn-primary" onclick="app.wizNext()">Devam ${svg('arrow', 16)}</button>` : `<button class="btn btn-primary" onclick="app.submitWizard()">Rezervasyonu tamamla ${svg('check', 16)}</button>`}</div></div></div>`;
  }
  const DAY_SHORT = s => DAYS_SHORT[(weekdayOf(s) + 6) % 7];

  /* ---------- booking mutations ---------- */
  function commitBooking(payload) {
    const booking = Object.assign({ id: uid('booking'), createdAt: nowStamp(), status: 'confirmed', notes: '' }, payload);
    data.bookings.push(booking);
    persist();
    return booking;
  }

  function addBooking(e) {
    e.preventDefault();
    const f = new FormData(e.target);
    const id = active().id;
    const party = Math.max(1, Number(f.get('party')) || 1);
    const date = f.get('date'), time = f.get('time');
    const err = slotError(id, date, time, party);
    if (err) { toast(err); return; }
    commitBooking({ businessId: id, customer: String(f.get('customer') || '').trim(), email: String(f.get('email') || '').trim(), phone: String(f.get('phone') || '').trim(), date, time, service: f.get('service') || 'Rezervasyon', party, notes: String(f.get('notes') || '').trim() });
    close();
    render();
    toast('Rezervasyon oluÅŸturuldu.');
  }

  function setBookingStatus(id, status) {
    const x = data.bookings.find(b => b.id === id);
    if (!x || x.status === status) return;
    const prev = x.status;
    x.status = status;
    persist();
    render();
    toast(status === 'confirmed' ? 'Rezervasyon onaylandÄ±.' : 'Rezervasyon beklemeye alÄ±ndÄ±.', { label: 'Geri al', run: () => { x.status = prev; persist(); render(); } });
  }

  function cancelBooking(id) {
    const x = data.bookings.find(b => b.id === id);
    if (!x || x.status === 'cancelled') return;
    const prev = x.status;
    x.status = 'cancelled';
    persist();
    render();
    toast('Rezervasyon iptal edildi.', { label: 'Geri al', run: () => { x.status = prev; persist(); render(); } });
  }

  function removeBooking(id) {
    const i = data.bookings.findIndex(b => b.id === id);
    if (i < 0) return;
    const [removed] = data.bookings.splice(i, 1);
    persist();
    render();
    toast('Rezervasyon silindi.', { label: 'Geri al', run: () => { data.bookings.splice(i, 0, removed); persist(); render(); } });
  }

  /* ---------- wizard actions ---------- */
  function openBook() {
    if (!data.selected) { toast('Ã–nce bir iÅŸletme seÃ§.'); return; }
    ui.wizard = newWizard();
    ui.view = 'book';
    close();
    render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function closeBook() {
    ui.view = 'overview';
    render();
  }

  function wizSet(field, value) {
    const w = wizardState();
    w[field] = value;
    if (field === 'date') w.time = '';
    // Metin alanlarÄ±nda yeniden Ã§izim yapmÄ±yoruz ki odak kaybolmasÄ±n.
    if (field === 'customer' || field === 'email' || field === 'phone' || field === 'notes') return;
    render();
  }

  function wizParty(delta) {
    const w = wizardState();
    const cap = Math.max(1, Number(settingsOf(active().id).capacity) || 1);
    w.party = Math.min(Math.max(1, w.party + delta), Math.max(1, cap));
    render();
  }

  function wizNext() {
    const w = wizardState(), id = active().id;
    if (w.step === 1 && !w.service) { toast('LÃ¼tfen bir hizmet seÃ§.'); return; }
    if (w.step === 2) {
      const err = slotError(id, w.date, w.time, w.party);
      if (err) { toast(err); return; }
    }
    w.step = Math.min(4, w.step + 1);
    render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function wizBack() {
    const w = wizardState();
    if (w.step === 1) { closeBook(); return; }
    w.step -= 1;
    render();
  }

  function submitWizard() {
    const w = wizardState(), id = active().id;
    if (!w.customer.trim()) { toast('LÃ¼tfen adÄ±nÄ± ve soyadÄ±nÄ± yaz.'); return; }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(w.email)) { toast('GeÃ§erli bir e-posta adresi gir.'); return; }
    const err = slotError(id, w.date, w.time, w.party);
    if (err) { toast(err); w.step = 2; render(); return; }
    data.wizardCodeSeq = (Number(data.wizardCodeSeq) || 1000) + 1;
    w.code = 'RSV-' + data.wizardCodeSeq;
    commitBooking({ businessId: id, customer: w.customer.trim(), email: w.email.trim(), phone: w.phone.trim(), date: w.date, time: w.time, service: w.service, party: w.party, notes: w.notes.trim(), status: 'pending' });
    persist();
    w.step = 4;
    render();
    toast('Rezervasyonun alÄ±ndÄ±: ' + w.code);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function restartWizard() {
    ui.wizard = newWizard();
    render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* ---------- navigation & filters ---------- */
  function select(id) {
    if (!biz(id)) return;
    if (data.selected && data.selected !== id) data.settingsByBusiness[data.selected] = clone(data.settings);
    data.selected = id;
    data.settings = clone(settingsOf(id));
    ui.wizard = null;
    persist();
    ui.view = 'overview';
    render();
    toast('Ä°ÅŸletme seÃ§ildi: ' + biz(id).name);
  }

  function view(name) {
    if (name !== 'businesses' && !data.selected) {
      toast('Ã–nce yÃ¶netmek istediÄŸin iÅŸletmeyi seÃ§.');
      ui.view = 'businesses';
      render();
      return;
    }
    if (name !== 'book') ui.wizard = null;
    ui.view = name || 'businesses';
    render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function pickDay(date) {
    ui.day = date;
    const d = parseISO(date);
    if (d.getMonth() !== ui.month.getMonth() || d.getFullYear() !== ui.month.getFullYear()) ui.month = startOfMonth(d);
    if (ui.view === 'overview') { ui.view = 'calendar'; }
    render();
  }

  function shiftMonth(n) {
    const next = new Date(ui.month.getFullYear(), ui.month.getMonth() + n, 1);
    ui.month = next;
    const dayInMonth = parseISO(ui.day);
    if (dayInMonth.getMonth() !== next.getMonth() || dayInMonth.getFullYear() !== next.getFullYear()) {
      ui.day = iso(next);
    }
    render();
  }

  function goToday() {
    ui.month = startOfMonth(TODAY);
    ui.day = TODAY_ISO;
    render();
  }

  function setFilter(key, value) {
    if (key === 'q') ui.q = value;
    else ui[key] = value;
    if (ui.view === 'overview' || ui.view === 'calendar') ui.view = 'bookings';
    render();
    const input = $('#booking-filter');
    if (input && key !== 'q') { /* keep focus where it was */ }
  }

  function filterBookings(v) {
    ui.q = v || '';
    const list = $('#booking-list');
    if (!list) return;
    const rows = filteredBookings();
    list.innerHTML = '<div class="tr th"><span>MÃ¼ÅŸteri</span><span>Tarih / Hizmet</span><span>Durum</span><span>Ä°ÅŸlem</span></div>' + (rows.length ? rows.map(fullRow).join('') : '<div class="empty">Bu filtreye uygun rezervasyon yok.</div>');
  }

  function notifications() {
    const pending = data.bookings.filter(b => b.businessId === active().id && b.status === 'pending' && b.date >= TODAY_ISO);
    if (!pending.length) { toast('Bildirim yok. Her ÅŸey gÃ¼ncel.'); return; }
    ui.view = 'bookings';
    ui.status = 'pending';
    ui.range = 'upcoming';
    render();
    toast(pending.length + ' rezervasyon onay bekliyor.');
  }

  /* ---------- settings & data ---------- */
  function saveSettings(e) {
    if (e) e.preventDefault();
    const form = $('#settings-form');
    if (!form) return;
    if (!form.reportValidity()) return;
    const f = new FormData(form);
    const b = active();
    if (f.get('start') >= f.get('end')) { toast('BitiÅŸ saati baÅŸlangÄ±Ã§tan sonra olmalÄ±.'); return; }
    if (!f.getAll('weekdays').length) { toast('En az bir Ã§alÄ±ÅŸma gÃ¼nÃ¼ seÃ§.'); return; }
    const services = String(f.get('services') || '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
    if (!services.length) { toast('En az bir hizmet ekle.'); return; }
    Object.assign(data.settings, {
      businessName: String(f.get('businessName') || '').trim(),
      color: f.get('color'),
      dateRange: Number(f.get('dateRange')),
      start: f.get('start'),
      end: f.get('end'),
      duration: Number(f.get('duration')),
      capacity: Number(f.get('capacity')),
      weekdays: f.getAll('weekdays').map(Number),
      services
    });
    b.name = data.settings.businessName || b.name;
    b.color = data.settings.color;
    data.settingsByBusiness[b.id] = clone(data.settings);
    persist();
    render();
    toast('Ayarlar kaydedildi.');
  }

  function exportData() {
    const payload = JSON.stringify(data, null, 2);
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'reservia-yedek-' + TODAY_ISO + '.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast('Yedek indirildi.');
  }

  function importData(input) {
    const file = input && input.files && input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        if (!parsed || !Array.isArray(parsed.businesses) || !parsed.businesses.length || !Array.isArray(parsed.bookings)) throw new Error('format');
        parsed.version = VERSION;
        data = Object.assign(defaults(), parsed);
        data.settingsByBusiness = Object.assign({}, data.settingsByBusiness);
        data.businesses.forEach(b => { data.settingsByBusiness[b.id] = Object.assign({}, clone(SETTINGS_BY_TYPE[b.type] || FALLBACK_SETTINGS), data.settingsByBusiness[b.id] || {}); });
        data.selected = data.businesses.some(b => b.id === data.selected) ? data.selected : null;
        data.settings = clone(settingsOf(data.selected || data.businesses[0].id));
        persist();
        ui.view = 'businesses';
        render();
        toast('Yedek geri yÃ¼klendi.');
      } catch (err) {
        toast('Dosya okunamadÄ±. GeÃ§erli bir Reservia yedeÄŸi seÃ§.');
      }
    };
    reader.readAsText(file);
    input.value = '';
  }

  function resetData() {
    if (!window.confirm('TÃ¼m demo verileri sÄ±fÄ±rlansÄ±n mÄ±? Bu iÅŸlem geri alÄ±namaz.')) return;
    data = defaults();
    ui.view = 'businesses';
    ui.wizard = null;
    persist();
    render();
    toast('Demo verileri sÄ±fÄ±rlandÄ±.');
  }

  /* ---------- modals ---------- */
  let lastFocus = null;

  function modal(type, extra) {
    close();
    let html = '';

    if (type === 'guide') {
      html = `<div class="modal"><div class="modal-head"><h2>NasÄ±l Ã§alÄ±ÅŸÄ±r?</h2><button class="icon-btn" onclick="app.close()">${svg('close')}</button></div><div class="modal-body"><div class="list"><div class="inline"><b>01</b><span><strong>Ä°ÅŸletmeni seÃ§</strong><small>Her iÅŸletme iÃ§in ayrÄ± ayarlar, takvim ve rezervasyonlar.</small></span></div><div class="inline"><b>02</b><span><strong>Takvimini dÃ¼zenle</strong><small>Ã‡alÄ±ÅŸma saatlerini, hizmetlerini, kapasiteni ve slotlarÄ±nÄ± belirle.</small></span></div><div class="inline"><b>03</b><span><strong>Rezervasyon almaya baÅŸla</strong><small>MÃ¼ÅŸteri gÃ¶rÃ¼nÃ¼mÃ¼nÃ¼ aÃ§, uygun saatleri doldur.</small></span></div></div></div><div class="modal-footer"><button class="btn btn-primary" onclick="app.modal('booking')">Yeni rezervasyon oluÅŸtur</button></div></div>`;
    } else if (type === 'new-business') {
      html = `<div class="modal"><div class="modal-head"><h2>Yeni iÅŸletme ekle</h2><button class="icon-btn" onclick="app.close()">${svg('close')}</button></div><form class="modal-body" onsubmit="app.addBusiness(event)"><label class="field">Ä°ÅŸletme adÄ±<input name="name" required placeholder="Ã–rn. Limon Studio"></label><label class="field">Ä°ÅŸletme tÃ¼rÃ¼<select name="type"><option>Otel</option><option>Berber</option><option>Kafe</option><option>StÃ¼dyo</option><option>DiÄŸer</option></select></label><label class="field">Konum<input name="location" value="Ä°stanbul" required></label><div class="modal-footer"><button type="button" class="btn btn-secondary" onclick="app.close()">VazgeÃ§</button><button class="btn btn-primary">Ä°ÅŸletme ekle</button></div></form></div>`;
    } else if (type === 'booking') {
      const b = active(), s = settingsOf(b.id);
      const date = extra && parseISO(extra) ? extra : (isOpenWeekday(b.id, TODAY_ISO) ? TODAY_ISO : openDates(b.id)[0] || TODAY_ISO);
      html = `<div class="modal"><div class="modal-head"><h2>Yeni rezervasyon</h2><button class="icon-btn" onclick="app.close()">${svg('close')}</button></div><form class="modal-body" onsubmit="app.addBooking(event)"><div class="form-grid"><label class="field">MÃ¼ÅŸteri adÄ±<input name="customer" required></label><label class="field">Telefon<input name="phone" type="tel" placeholder="05xx xxx xx xx"></label></div><label class="field">E-posta<input name="email" type="email" required></label><div class="form-grid"><label class="field">Tarih<input name="date" type="date" id="booking-date" value="${esc(date)}" min="${esc(TODAY_ISO)}" max="${esc(lastBookable(b.id))}" onchange="app.refreshSlots(this.value)" required></label><label class="field">Saat<select name="time" id="booking-time">${slotOptions(b.id, date)}</select></label></div><div class="form-grid"><label class="field">Hizmet<select name="service">${(s.services || ['Rezervasyon']).map(x => `<option>${esc(x)}</option>`).join('')}</select></label><label class="field">KiÅŸi sayÄ±sÄ±<input name="party" type="number" min="1" max="50" value="1" required></label></div><label class="field">Not <span class="hint">opsiyonel</span><textarea name="notes" rows="2"></textarea></label><div class="modal-footer"><button type="button" class="btn btn-secondary" onclick="app.close()">VazgeÃ§</button><button class="btn btn-primary">Rezervasyon oluÅŸtur</button></div></form></div>`;
    } else if (type === 'auth' || type === 'login' || type === 'register') {
      html = `<div class="modal"><div class="modal-head"><h2>${type === 'register' ? 'Yeni bir baÅŸlangÄ±Ã§ yap' : 'Tekrar hoÅŸ geldin'}</h2><button class="icon-btn" onclick="app.close()">${svg('close')}</button></div><form class="modal-body" onsubmit="app.auth(event)"><div class="tabs"><button type="button" class="${type !== 'register' ? 'active' : ''}" onclick="app.setTab('login')">GiriÅŸ yap</button><button type="button" class="${type === 'register' ? 'active' : ''}" onclick="app.setTab('register')">KayÄ±t ol</button></div><label class="field">Ad soyad<input name="name" placeholder="Demo KullanÄ±cÄ±"></label><label class="field">E-posta<input name="email" type="email" required></label><label class="field">Åžifre<input name="password" type="password" required minlength="6"></label><p class="muted">Demo modudur; gerÃ§ek bir giriÅŸ yapÄ±lmaz ve ÅŸifreniz kaydedilmez.</p><div class="modal-footer"><button class="btn btn-primary">Devam et</button></div></form></div>`;
    } else if (type === 'preview') {
      openBook();
      return;
    }

    if (!html) return;
    const layer = $('#modal-layer');
    if (!layer) return;
    lastFocus = document.activeElement;
    layer.innerHTML = html;
    layer.classList.add('open');
    layer.onclick = e => { if (e.target === layer) close(); };
    const focusable = layer.querySelector('input, select, textarea, button');
    if (focusable) focusable.focus();
  }

  function slotOptions(id, date) {
    const party = 1;
    return slotsFor(id).map(t => {
      const err = slotError(id, date, t, party);
      return `<option value="${t}" ${err ? 'disabled' : ''}>${t}${err ? ' Â· dolu' : ''}</option>`;
    }).join('');
  }

  function refreshSlots(date) {
    const sel = $('#booking-time');
    if (!sel) return;
    const id = active().id;
    sel.innerHTML = slotOptions(id, date);
    if (!sel.value || sel.selectedOptions[0]?.disabled) {
      const first = Array.from(sel.options).find(o => !o.disabled);
      if (first) sel.value = first.value;
    }
    const partyInput = $('input[name="party"]');
    if (partyInput && Number(partyInput.value) > (Number(settingsOf(id).capacity) || 1)) partyInput.value = Number(settingsOf(id).capacity) || 1;
  }

  function close() {
    const l = $('#modal-layer');
    if (l) { l.classList.remove('open'); l.innerHTML = ''; }
    if (lastFocus && typeof lastFocus.focus === 'function') { try { lastFocus.focus(); } catch (e) { } }
    lastFocus = null;
  }

  function setTab(name) { modal(name); }

  function toast(text, action) {
    const el = $('#toast');
    if (!el) return;
    el.innerHTML = `<span>${esc(text)}</span>${action ? `<button type="button" class="toast-action">${esc(action.label)}</button>` : ''}`;
    if (action) {
      const btn = el.querySelector('.toast-action');
      if (btn) btn.onclick = () => { el.classList.remove('show'); if (action.run) action.run(); };
    }
    el.classList.add('show');
    clearTimeout(window.__toast);
    window.__toast = setTimeout(() => el.classList.remove('show'), action ? 6000 : 3200);
  }

  function addBusiness(e) {
    e.preventDefault();
    const f = new FormData(e.target);
    const type = f.get('type');
    const id = uid('business');
    const name = String(f.get('name') || '').trim();
    const color = (SETTINGS_BY_TYPE[type] || FALLBACK_SETTINGS).color || '#5d7f72';
    data.businesses.push({ id, name, type, location: String(f.get('location') || '').trim() || 'Ä°stanbul', img: IMG_BY_TYPE[type] || IMG_BY_TYPE.DiÄŸer, color, about: '' });
    data.settingsByBusiness[id] = Object.assign({}, clone(SETTINGS_BY_TYPE[type] || FALLBACK_SETTINGS), { businessName: name, color });
    persist();
    close();
    ui.view = 'businesses';
    render();
    toast('Ä°ÅŸletme eklendi: ' + name);
  }

  function auth(e) {
    e.preventDefault();
    const f = new FormData(e.target);
    data.account = String(f.get('name') || '').trim() || String(f.get('email') || '') || 'Demo KullanÄ±cÄ±';
    persist();
    close();
    render();
    toast('Demo hesabÄ±na giriÅŸ yapÄ±ldÄ±.');
  }

  /* ---------- global events ---------- */
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { close(); return; }
    const layer = $('#modal-layer');
    if (e.key === 'Tab' && layer && layer.classList.contains('open')) {
      const items = Array.from(layer.querySelectorAll('button, input, select, textarea, a[href]')).filter(el => !el.disabled && el.offsetParent !== null);
      if (!items.length) return;
      const first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  function exportCsv(){
    const b=active(); const rows=data.bookings.filter(x=>x.businessId===b.id);
    if(!rows.length){toast('Dışa aktarılacak rezervasyon yok.');return;}
    const escCsv=v=>'"'+String(v==null?'':v).replace(/"/g,'""')+'"';
    const header=['id','tarih','saat','musteri','eposta','telefon','hizmet','kisi','durum','not','olusturulma'];
    const body=rows.map(r=>[r.id,r.date,r.time,escCsv(r.customer),r.email||'',r.phone||'',escCsv(r.service),r.party||1,r.status,escCsv(r.notes),r.createdAt||''].join(','));
    const blob=new Blob(['\ufeff'+[header.join(','),...body].join('\r\n')],{type:'text/csv;charset=utf-8;'});
    const url=URL.createObjectURL(blob); const a=document.createElement('a');a.href=url;a.download='reservia-'+b.id+'-'+TODAY_ISO+'.csv';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000); toast('CSV indirildi.');
  }
  function exportIcs(){
    const b=active(); const rows=data.bookings.filter(x=>x.businessId===b.id&&x.status!=='cancelled'&&x.date>=TODAY_ISO);
    if(!rows.length){toast('Yaklaşan rezervasyon yok.');return;}
    const now=new Date(); const stamp=now.getUTCFullYear()+pad(now.getUTCMonth()+1)+pad(now.getUTCDate())+'T'+pad(now.getUTCHours())+pad(now.getUTCMinutes())+pad(now.getUTCSeconds())+'Z';
    let out=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Reservia//Demo//TR','CALSCALE:GREGORIAN','METHOD:PUBLISH'].join('\r\n')+'\r\n';
    rows.forEach(r=>{
      const uid=r.id+'@reservia-demo'; const ds=r.date.replace(/-/g,'')+'T'+String(r.time).replace(':','')+'00';
      const em=toMin(r.time)+60; const de=r.date.replace(/-/g,'')+'T'+pad(Math.floor(em/60)%24)+pad(em%60)+'00';
      const desc=('Müşteri: '+r.customer+'\nE-posta: '+(r.email||'')+'\nTelefon: '+(r.phone||'')+'\nKişi: '+(r.party||1)+'\nNot: '+(r.notes||'')).replace(/\n/g,'\\n');
      out+=['BEGIN:VEVENT','UID:'+uid,'DTSTAMP:'+stamp,'DTSTART:'+ds,'DTEND:'+de,'SUMMARY:Reservia: '+(r.service||'Rezervasyon')+' - '+r.customer,'DESCRIPTION:'+desc,'LOCATION:'+(b.location||''),'STATUS:CONFIRMED','END:VEVENT'].join('\r\n')+'\r\n';
    });
    out+='END:VCALENDAR\r\n';
    const blob=new Blob([out],{type:'text/calendar;charset=utf-8;'});
    const url=URL.createObjectURL(blob); const a=document.createElement('a');a.href=url;a.download='reservia-'+b.id+'-yaklasan.ics';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000); toast('Takvim (.ics) indirildi.');
  }

  window.app = {
    view, select, modal, close, toast, saveSettings, addBooking, auth, addBusiness, preview: openBook, setTab,
    filterBookings, cancelBooking, setBookingStatus, removeBooking, toggleTheme,
    pickDay, shiftMonth, goToday, setFilter, notifications,
    openBook, closeBook, wizSet, wizParty, wizNext, wizBack, submitWizard, restartWizard,
    exportData, importData, resetData, refreshSlots, exportCsv, exportIcs,
    openCustomer: openBook, active, _data: () => data
  };

  applyTheme();
  render();
})();
