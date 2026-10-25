import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

(() => {
  'use strict';

  const config = window.RESERVIA_SUPABASE || {};
  if (!config.url || !config.anonKey) {
    document.body.innerHTML = '<p style="font:16px sans-serif;padding:2rem">Reservia cloud configuration is missing.</p>';
    return;
  }

  const db = createClient(config.url, config.anonKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });
  const $ = (selector, root = document) => root.querySelector(selector);
  const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pad = n => String(n).padStart(2, '0');
  const dateISO = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const localDate = timezone => {
    if (!timezone) return dateISO(new Date());
    const parts = new Intl.DateTimeFormat('en', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
    const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
    return `${values.year}-${values.month}-${values.day}`;
  };
  const parseDate = value => { const [y, m, d] = String(value).slice(0, 10).split('-').map(Number); return new Date(y, m - 1, d); };
  const shiftDate = (value, amount) => { const d = parseDate(value); d.setDate(d.getDate() + amount); return dateISO(d); };
  const slugify = value => String(value || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('tr').replace(/ı/g, 'i').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || 'isletme';
  const months = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
  const weekdays = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
  const weekdayShort = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
  const state = {
    session: null,
    user: null,
    businesses: [],
    bookings: [],
    selected: null,
    view: 'businesses',
    month: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    day: localDate(),
    filters: { query: '', status: '', range: 'upcoming' },
    publicBusiness: null,
    publicFlow: { step: 1, service: '', party: 1, date: localDate(), time: '', slots: [], loading: false, result: null, error: '' },
    modalType: null,
    toastTimer: null,
    realtime: null,
    slotRefreshTimer: null,
    slotRequestSeq: 0
  };

  const active = () => state.businesses.find(b => b.id === state.selected) || state.businesses[0] || null;
  const liveBookings = (businessId) => state.bookings.filter(b => b.business_id === businessId && b.status !== 'cancelled');
  let nowDate = localDate();
  const cleanTime = value => String(value || '').slice(0, 5);
  const timeLabel = value => cleanTime(value);
  const dateLabel = value => {
    const d = parseDate(value);
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  };
  const dayOfWeek = value => (parseDate(value).getDay() + 6) % 7;
  const statusLabel = status => ({ pending: 'Bekliyor', confirmed: 'Onaylı', cancelled: 'İptal' }[status] || status);
  const statusClass = status => status === 'confirmed' ? 'pill-green' : status === 'cancelled' ? '' : 'pill-warn';
  const servicesOf = business => Array.isArray(business?.services) ? business.services : [];
  const normalizeBooking = booking => ({ ...booking, booking_date: booking.local_date, start_time: booking.local_time });

  function toast(message) {
    const node = $('#toast');
    if (!node) return;
    node.innerHTML = `<span>${esc(message)}</span>`;
    node.classList.add('show');
    clearTimeout(state.toastTimer);
    state.toastTimer = setTimeout(() => node.classList.remove('show'), 3600);
  }

  function setHeader() {
    document.body.classList.add('cloud-mode');
    const b = active();
    const title = { businesses: 'İşletmelerim', overview: 'Genel bakış', calendar: 'Takvim', bookings: 'Rezervasyonlar', settings: 'Özelleştirme' }[state.view] || 'İşletmelerim';
    const workspace = $('#business-name');
    if (workspace) workspace.textContent = b ? b.name : 'Çalışma alanım';
    const count = document.querySelector('.nav-count');
    if (count) count.textContent = String(state.businesses.length);
    const pendingCount = $('#pending-count');
    if (pendingCount) {
      const n = b ? liveBookings(b.id).filter(x => x.status === 'pending').length : 0;
      pendingCount.textContent = n ? String(n) : '';
      pendingCount.style.display = n ? '' : 'none';
    }
    const account = $('#account-name');
    if (account) account.textContent = state.user?.user_metadata?.full_name || state.user?.email || 'İşletme sahibi';
    const accountSub = document.querySelector('.account small');
    if (accountSub) accountSub.textContent = 'İşletme hesabı';
    const badge = $('.demo-badge');
    if (badge) { badge.innerHTML = '<i></i>Canlı çalışma alanı'; badge.classList.add('cloud-live-badge'); }
    const topLogin = $('.top-login');
    if (topLogin) {
      topLogin.innerHTML = state.user ? 'Çıkış yap' : 'Giriş / Kayıt';
      topLogin.onclick = state.user ? signOut : () => modal('login');
    }
    const accountButton = $('.account');
    if (accountButton) accountButton.onclick = state.user ? signOut : () => modal('login');
    const pageTitle = $('#page-title');
    if (pageTitle) pageTitle.textContent = title;
    const crumb = $('#crumb');
    if (crumb) crumb.textContent = state.view === 'businesses' ? title : (b?.name || title);
    const headDate = $('#header-date');
    if (headDate) headDate.textContent = dateLabel(localDate());
    document.querySelectorAll('[data-nav]').forEach(node => node.classList.toggle('active', node.dataset.nav === state.view));
    const theme = localStorage.getItem('reservia-demo-theme') || 'light';
    document.documentElement.setAttribute('data-theme', theme);
    const themeButton = $('#theme-toggle');
    if (themeButton) themeButton.textContent = theme === 'dark' ? '☼' : '◐';
  }

  function guestScreen() {
    document.body.classList.add('cloud-guest');
    document.body.classList.remove('cloud-loading');
    const c = $('#content');
    c.innerHTML = `<section class="cloud-welcome"><div class="cloud-brand"><span class="brandmark">r<span>·</span></span><span>reservia<span class="brand-dot">.</span></span></div><p class="eyebrow">İŞLETME RANDEVU YÖNETİMİ</p><h1>Randevularınızı tek yerden yönetin.</h1><p class="muted">Hesabınıza giriş yapın veya işletmeniz için ücretsiz bir yönetim alanı oluşturun.</p><div class="cloud-welcome-actions"><button class="btn btn-primary" data-action="login">Giriş yap</button><button class="btn btn-secondary" data-action="register">Hesap oluştur</button></div><p class="cloud-safe-note">Hesabınız ve işletme verileriniz güvenli biçimde saklanır.</p></section>`;
    setHeader();
  }

  function authForm(mode) {
    const register = mode === 'register';
    return `<div class="modal"><div class="modal-head"><h2>${register ? 'Hesabını oluştur' : 'Tekrar hoş geldin'}</h2><button class="icon-btn" type="button" data-action="close">×</button></div><form class="modal-body" data-auth-mode="${mode}"><div class="tabs"><button type="button" class="${register ? '' : 'active'}" data-action="auth-tab" data-mode="login">Giriş yap</button><button type="button" class="${register ? 'active' : ''}" data-action="auth-tab" data-mode="register">Kayıt ol</button></div>${register ? '<label class="field">Ad soyad<input name="name" autocomplete="name" required minlength="2" maxlength="100" placeholder="Adınız ve soyadınız"></label>' : ''}<label class="field">E-posta<input name="email" type="email" autocomplete="email" required></label><label class="field">Şifre<input name="password" type="password" autocomplete="${register ? 'new-password' : 'current-password'}" required minlength="8"></label><p class="muted small">${register ? 'Kayıt sonrası e-posta doğrulaması istenebilir.' : 'İşletme panelinize güvenli şekilde giriş yapın.'}</p><div class="modal-footer"><button class="btn btn-primary" type="submit">${register ? 'Hesap oluştur' : 'Giriş yap'}</button></div></form></div>`;
  }

  function modal(type, extra) {
    const layer = $('#modal-layer');
    if (!layer) return;
    state.modalType = type;
    let html = '';
    if (type === 'login' || type === 'register' || type === 'auth') html = authForm(type === 'register' ? 'register' : 'login');
    else if (type === 'new-business') html = businessForm();
    else if (type === 'booking') html = bookingForm(extra);
    else if (type === 'guide') html = `<div class="modal"><div class="modal-head"><h2>Nasıl çalışır?</h2><button class="icon-btn" type="button" data-action="close">×</button></div><div class="modal-body"><p>İşletmenizi ekleyin, çalışma saatlerinizi ve hizmetlerinizi ayarlayın; ardından müşteri bağlantınızı yayımlayın. Müşteriler sadece açık saatleri görür, alınan randevular takviminize eklenir.</p></div><div class="modal-footer"><button class="btn btn-primary" type="button" data-action="close">Anladım</button></div></div>`;
    if (!html) return;
    layer.innerHTML = html;
    layer.classList.add('open');
    layer.onclick = event => { if (event.target === layer) closeModal(); };
    const focusable = layer.querySelector('input,select,textarea,button');
    focusable?.focus();
    if (type === 'booking') {
      const form = $('#admin-booking-form');
      if (form) loadAdminSlots(form);
    }
  }

  function closeModal() {
    const layer = $('#modal-layer');
    if (layer) { layer.classList.remove('open'); layer.innerHTML = ''; }
    state.modalType = null;
  }

  function businessForm() {
    return `<div class="modal"><div class="modal-head"><h2>İşletme bilgileri</h2><button class="icon-btn" type="button" data-action="close">×</button></div><form class="modal-body" id="business-create-form"><label class="field">İşletme adı<input name="name" required maxlength="120" placeholder="Örn. Limon Studio"></label><label class="field">İşletme türü<select name="category" required><option value="">Seçin</option><option>Otel</option><option>Berber</option><option>Kafe</option><option>Güzellik Salonu</option><option>Danışmanlık</option><option>Diğer</option></select></label><label class="field">Konum<input name="location" required maxlength="160" placeholder="Şehir, ilçe"></label><label class="field">Zaman dilimi<select name="timezone"><option value="Europe/Istanbul">Türkiye (Europe/Istanbul)</option><option value="Asia/Baku">Azerbaycan (Asia/Baku)</option><option value="Europe/London">Birleşik Krallık</option><option value="Europe/Berlin">Orta Avrupa</option><option value="America/New_York">ABD Doğu</option></select></label><div class="modal-footer"><button class="btn btn-secondary" type="button" data-action="close">Vazgeç</button><button class="btn btn-primary" type="submit">İşletmeyi oluştur</button></div></form></div>`;
  }

  function onboarding() {
    return `<section class="cloud-onboarding"><span class="onboarding-icon">✦</span><h1>Yönetim alanınız hazır</h1><p class="muted">Başlamak için işletme bilgilerinizi ekleyin. Ardından çalışma saatlerini, hizmetleri ve müşteri rezervasyon bağlantınızı ayarlayabilirsiniz.</p><button class="btn btn-primary" data-action="new-business">İşletme bilgilerini gir</button></section>`;
  }

  function businessesView() {
    if (!state.businesses.length) return onboarding();
    const total = state.businesses.reduce((sum, b) => sum + liveBookings(b.id).length, 0);
    const cards = state.businesses.map(b => {
      const count = liveBookings(b.id).length;
      const todayCount = liveBookings(b.id).filter(x => x.booking_date === nowDate).length;
      return `<article class="business-card ${b.id === state.selected ? 'selected' : ''}"><div class="card-image cloud-card-image" style="--biz-color:${esc(b.color || '#255a4c')}"><span class="preview-logo">${esc((b.name || 'R').charAt(0))}</span><span class="category">${esc(b.category || 'İşletme')}</span><span class="pill ${b.is_published ? 'pill-green' : ''}">${b.is_published ? 'Yayında' : 'Taslak'}</span></div><div class="card-body"><h3>${esc(b.name)}</h3><div class="card-meta"><span>${esc(b.location || 'Konum eklenmedi')}</span><span>${count} randevu</span></div><div class="card-meta card-meta-tight"><span>Bugün ${todayCount} randevu</span><span>${b.is_published ? 'Müşteri alıyor' : 'Yayımlanmadı'}</span></div><button class="business-cta" data-action="select-business" data-id="${esc(b.id)}">Yönetim panelini aç →</button></div></article>`;
    }).join('');
    return `<div class="section-heading"><div><div class="eyebrow">İŞLETME ALANI</div><h1>İşletmelerim</h1><p class="muted">${state.businesses.length} işletme · ${total} aktif randevu</p></div><button class="btn btn-primary" data-action="new-business">+ İşletme ekle</button></div><div class="business-grid">${cards}</div>`;
  }

  function bookingRow(b) {
    return `<div class="tr booking-row"><span><b>${esc(b.customer_name)}</b><small>${esc(b.customer_email || '')}${b.customer_phone ? ' · ' + esc(b.customer_phone) : ''}</small></span><span><b class="cell-strong">${esc(dateLabel(b.booking_date))}</b><small class="cell-sub">${esc(timeLabel(b.start_time))} · ${esc(b.service)} · ${Number(b.party)} kişi</small></span><span><span class="pill ${statusClass(b.status)}">${statusLabel(b.status)}</span></span><span class="row-actions">${b.status === 'pending' ? `<button class="mini-btn mini-btn-green" title="Onayla" data-action="status" data-id="${esc(b.id)}" data-status="confirmed">✓</button>` : ''}${b.status === 'confirmed' ? `<button class="mini-btn" title="Beklemeye al" data-action="status" data-id="${esc(b.id)}" data-status="pending">◷</button>` : ''}${b.status !== 'cancelled' ? `<button class="mini-btn" title="İptal et" data-action="status" data-id="${esc(b.id)}" data-status="cancelled">×</button>` : ''}</span></div>`;
  }

  function overviewView() {
    const b = active();
    if (!b) return onboarding();
    const rows = liveBookings(b.id).filter(x => x.booking_date >= nowDate).sort((a, c) => (a.booking_date + a.start_time).localeCompare(c.booking_date + c.start_time));
    const today = rows.filter(x => x.booking_date === nowDate).length;
    const pending = rows.filter(x => x.status === 'pending').length;
    const next7 = rows.filter(x => x.booking_date < shiftDate(nowDate, 7)).length;
    const monthCount = rows.filter(x => x.booking_date.slice(0, 7) === nowDate.slice(0, 7)).length;
    const pubUrl = publicUrl(b);
    return `<div class="section-heading"><div><div class="eyebrow">${esc(String(b.category || 'İŞLETME').toLocaleUpperCase('tr'))} / GENEL BAKIŞ</div><h1>${esc(b.name)}</h1><p class="muted">Bugünkü hareketleri, bekleyen istekleri ve yaklaşan randevuları takip edin.</p></div><div class="heading-actions"><button class="btn btn-secondary" data-action="copy-link">Bağlantıyı kopyala</button><button class="btn btn-primary" data-action="new-booking">+ Yeni randevu</button></div></div><div class="stat-grid"><div class="stat-card"><span>Bugün</span><strong>${today}</strong><small>randevu</small></div><div class="stat-card"><span>Önümüzdeki 7 gün</span><strong>${next7}</strong><small>randevu</small></div><div class="stat-card"><span>Onay bekleyen</span><strong>${pending}</strong><small>istek</small></div><div class="stat-card"><span>Bu ay</span><strong>${monthCount}</strong><small>aktif randevu</small></div></div><div class="two-col"><div class="panel"><div class="panel-head"><h3>Yaklaşan randevular</h3><button class="text-btn" data-action="view-bookings">Tümünü gör →</button></div>${rows.length ? `<div class="booking-table"><div class="tr th"><span>Müşteri</span><span>Tarih / Saat</span><span>Durum</span><span></span></div>${rows.slice(0, 6).map(bookingRow).join('')}</div>` : '<div class="empty">Henüz yaklaşan randevu yok.<br><small>Müşteri bağlantınızı yayımlayarak rezervasyon almaya başlayın.</small></div>'}</div><div class="panel"><div class="panel-head"><h3>Bu ayın takvimi</h3><button class="text-btn" data-action="view-calendar">Takvimi aç →</button></div>${miniCalendar(b)}</div></div><div class="panel cloud-share-panel"><div><strong>Müşteri bağlantınız</strong><small>${b.is_published ? 'Herkes bu bağlantıdan uygun saatleri görüp randevu alabilir.' : 'Rezervasyon almaya başlamak için işletmenizi özelleştirme sayfasından yayımlayın.'}</small></div><code>${esc(pubUrl)}</code><button class="btn btn-secondary" data-action="open-link">Bağlantıyı aç ↗</button></div>`;
  }

  function miniCalendar(b) {
    const year = state.month.getFullYear(), month = state.month.getMonth();
    const firstOffset = (new Date(year, month, 1).getDay() + 6) % 7;
    const days = new Date(year, month + 1, 0).getDate();
    const headings = weekdayShort.map(x => `<span class="cloud-cal-head">${x}</span>`).join('');
    let cells = '';
    for (let i = 0; i < firstOffset; i++) cells += '<span class="cloud-cal-cell is-blank"></span>';
    for (let d = 1; d <= days; d++) {
      const key = `${year}-${pad(month + 1)}-${pad(d)}`;
      const count = liveBookings(b.id).filter(x => x.booking_date === key).length;
      cells += `<button class="cloud-cal-cell ${key === localDate() ? 'is-today' : ''} ${count ? 'has-bookings' : ''}" data-action="pick-day" data-date="${key}"><span>${d}</span>${count ? `<i>${count}</i>` : ''}</button>`;
    }
    return `<div class="cloud-month-head"><button class="mini-btn" data-action="month-prev">‹</button><strong>${months[month]} ${year}</strong><button class="mini-btn" data-action="month-next">›</button></div><div class="cloud-calendar-grid">${headings}${cells}</div>`;
  }

  function calendarView() {
    const b = active();
    if (!b) return onboarding();
    const date = state.day || localDate();
    const rows = liveBookings(b.id).filter(x => x.booking_date === date).sort((a, c) => a.start_time.localeCompare(c.start_time));
    return `<div class="section-heading"><div><div class="eyebrow">TAKVİM</div><h1>${esc(b.name)}</h1><p class="muted">Randevularınızı gün ve saat bazında görüntüleyin.</p></div><button class="btn btn-primary" data-action="new-booking">+ Yeni randevu</button></div><div class="two-col calendar-layout"><div class="panel"><div class="panel-head"><h3>${months[state.month.getMonth()]} ${state.month.getFullYear()}</h3><span class="pill pill-green">${liveBookings(b.id).filter(x => x.booking_date.slice(0, 7) === `${state.month.getFullYear()}-${pad(state.month.getMonth() + 1)}`).length} randevu</span></div>${miniCalendar(b)}</div><div class="panel"><div class="panel-head"><div><h3>${esc(dateLabel(date))}</h3><small class="muted">${weekdays[dayOfWeek(date)]}</small></div><button class="btn btn-secondary" data-action="new-booking" data-date="${date}">+ Ekle</button></div>${rows.length ? `<div class="booking-table">${rows.map(bookingRow).join('')}</div>` : '<div class="empty">Bu gün için randevu yok.</div>'}</div></div>`;
  }

  function bookingsView() {
    const b = active();
    if (!b) return onboarding();
    const query = (state.filters.query || '').toLocaleLowerCase('tr');
    let rows = state.bookings.filter(x => x.business_id === b.id);
    if (state.filters.status) rows = rows.filter(x => x.status === state.filters.status);
    if (state.filters.range === 'upcoming') rows = rows.filter(x => x.booking_date >= nowDate && x.status !== 'cancelled');
    if (state.filters.range === 'past') rows = rows.filter(x => x.booking_date < nowDate);
    if (query) rows = rows.filter(x => `${x.customer_name} ${x.customer_email || ''} ${x.service || ''}`.toLocaleLowerCase('tr').includes(query));
    rows.sort((a, c) => (a.booking_date + a.start_time).localeCompare(c.booking_date + c.start_time));
    return `<div class="section-heading"><div><div class="eyebrow">RANDEVULAR</div><h1>${esc(b.name)}</h1><p class="muted">${liveBookings(b.id).length} aktif randevu · ${liveBookings(b.id).filter(x => x.status === 'pending').length} onay bekliyor.</p></div><button class="btn btn-primary" data-action="new-booking">+ Yeni randevu</button></div><div class="booking-toolbar"><label class="search-field"><input id="cloud-booking-search" type="search" placeholder="Müşteri, e-posta veya hizmet ara…" value="${esc(state.filters.query)}"></label><select id="cloud-status-filter"><option value="">Tüm durumlar</option><option value="confirmed" ${state.filters.status === 'confirmed' ? 'selected' : ''}>Onaylı</option><option value="pending" ${state.filters.status === 'pending' ? 'selected' : ''}>Bekliyor</option><option value="cancelled" ${state.filters.status === 'cancelled' ? 'selected' : ''}>İptal</option></select><select id="cloud-range-filter"><option value="upcoming" ${state.filters.range === 'upcoming' ? 'selected' : ''}>Yaklaşan</option><option value="past" ${state.filters.range === 'past' ? 'selected' : ''}>Geçmiş</option><option value="all" ${state.filters.range === 'all' ? 'selected' : ''}>Tümü</option></select></div><div class="panel"><div class="booking-table full-table"><div class="tr th"><span>Müşteri</span><span>Tarih / Saat</span><span>Durum</span><span>İşlem</span></div>${rows.length ? rows.map(bookingRow).join('') : '<div class="empty">Bu filtreye uygun randevu bulunamadı.</div>'}</div></div>`;
  }

  function settingsView() {
    const b = active();
    if (!b) return onboarding();
    const dayChecks = weekdays.map((label, i) => `<label><input type="checkbox" name="weekdays" value="${i + 1}" ${(b.weekdays || []).includes(i + 1) ? 'checked' : ''}> ${weekdayShort[i]}</label>`).join('');
    return `<div class="section-heading"><div><div class="eyebrow">İŞLETME AYARLARI</div><h1>Özelleştirme</h1><p class="muted">${esc(b.name)} için müşteri deneyimini ayarlayın.</p></div><button class="btn btn-primary" data-action="save-settings">Değişiklikleri kaydet</button></div><div class="two-col settings-layout"><form class="panel" id="cloud-settings-form"><div class="form-grid"><label class="field full">İşletme adı<input name="name" value="${esc(b.name)}" required maxlength="120"></label><label class="field">İşletme türü<input name="category" value="${esc(b.category || '')}" required maxlength="80"></label><label class="field">Konum<input name="location" value="${esc(b.location || '')}" required maxlength="160"></label><label class="field full">Kısa açıklama<input name="about" value="${esc(b.about || '')}" maxlength="240"></label><label class="field">Tema rengi<input name="color" type="color" value="${esc(b.color || '#255a4c')}"></label><label class="field">Zaman dilimi<input name="timezone" value="${esc(b.timezone || 'Europe/Istanbul')}" required></label><label class="field">Başlangıç saati<input name="start_time" type="time" value="${esc(cleanTime(b.start_time || '09:00'))}" required></label><label class="field">Bitiş saati<input name="end_time" type="time" value="${esc(cleanTime(b.end_time || '18:00'))}" required></label><label class="field">Slot süresi<select name="duration_minutes"><option value="15" ${b.duration_minutes === 15 ? 'selected' : ''}>15 dakika</option><option value="30" ${b.duration_minutes === 30 ? 'selected' : ''}>30 dakika</option><option value="45" ${b.duration_minutes === 45 ? 'selected' : ''}>45 dakika</option><option value="60" ${b.duration_minutes === 60 ? 'selected' : ''}>60 dakika</option><option value="90" ${b.duration_minutes === 90 ? 'selected' : ''}>90 dakika</option></select></label><label class="field">Kapasite / slot<input name="capacity" type="number" min="1" max="100" value="${esc(b.capacity || 1)}" required></label><label class="field">İleri tarih sınırı<select name="date_range"><option value="30" ${b.date_range === 30 ? 'selected' : ''}>30 gün</option><option value="60" ${b.date_range === 60 ? 'selected' : ''}>60 gün</option><option value="90" ${b.date_range === 90 ? 'selected' : ''}>90 gün</option><option value="180" ${b.date_range === 180 ? 'selected' : ''}>180 gün</option></select></label><label class="field full">Hizmetler <span class="hint">Virgülle ayırın</span><input name="services" value="${esc(servicesOf(b).join(', '))}" required placeholder="Saç kesimi, Sakal"></label><div class="field full"><span>Çalışma günleri</span><div class="weekday-list">${dayChecks}</div></div><label class="field full publish-toggle"><input type="checkbox" name="is_published" ${b.is_published ? 'checked' : ''}><span><strong>Rezervasyon bağlantısını yayımla</strong><small>Herkes bağlantıdan uygun saatleri ve işletme bilgilerini görebilir.</small></span></label></div></form><div class="settings-side"><div class="panel cloud-public-panel"><div class="panel-head"><h3>Müşteri bağlantısı</h3><span class="pill ${b.is_published ? 'pill-green' : ''}">${b.is_published ? 'Yayında' : 'Taslak'}</span></div><p class="muted small">Bu bağlantıyı müşterilerinizle paylaşın. Dolu saatler otomatik olarak kapatılır.</p><div class="cloud-link-box">${esc(publicUrl(b))}</div><div class="data-actions"><button class="btn btn-secondary" data-action="copy-link">Bağlantıyı kopyala</button><button class="btn btn-secondary" data-action="open-link">Önizle ↗</button></div></div><div class="panel"><div class="panel-head"><h3>Çalışma özeti</h3></div><p class="muted small">${(b.weekdays || []).map(n => weekdayShort[n - 1]).join(', ') || 'Çalışma günü seçilmedi'} · ${esc(cleanTime(b.start_time))}–${esc(cleanTime(b.end_time))}</p><p class="muted small">${servicesOf(b).length} hizmet · ${b.duration_minutes} dk slot · ${b.capacity} kişi/slot</p></div></div></div>`;
  }

  function render() {
    if (state.publicBusiness) { renderPublic(); return; }
    if (!state.session) { guestScreen(); return; }
    document.body.classList.remove('cloud-guest', 'cloud-loading', 'booking-public');
    setHeader();
    const root = $('#content');
    if (!root) return;
    if (!state.businesses.length) root.innerHTML = onboarding();
    else {
      const views = { businesses: businessesView, overview: overviewView, calendar: calendarView, bookings: bookingsView, settings: settingsView };
      root.innerHTML = (views[state.view] || businessesView)();
    }
  }

  async function loadWorkspace() {
    const { data: memberships, error: membershipError } = await db.from('business_members').select('business_id').eq('user_id', state.user.id);
    if (membershipError) throw membershipError;
    const ownedIds = (memberships || []).map(m => m.business_id);
    const { data: businesses, error: businessError } = ownedIds.length
      ? await db.from('businesses').select('*').in('id', ownedIds).order('created_at', { ascending: false })
      : { data: [], error: null };
    if (businessError) throw businessError;
    const baseBusinesses = businesses || [];
    if (baseBusinesses.length) {
      const businessIds = baseBusinesses.map(b => b.id);
      const [hoursResult, servicesResult] = await Promise.all([
        db.from('business_hours').select('*').in('business_id', businessIds).order('weekday'),
        db.from('business_services').select('*').in('business_id', businessIds).eq('active', true).order('sort_order')
      ]);
      if (hoursResult.error) throw hoursResult.error;
      if (servicesResult.error) throw servicesResult.error;
      state.businesses = baseBusinesses.map(b => {
        const hours = (hoursResult.data || []).filter(h => h.business_id === b.id);
        const services = (servicesResult.data || []).filter(s => s.business_id === b.id);
        const open = hours[0] || {};
        return { ...b, color: b.theme_color, is_published: b.published, date_range: b.advance_booking_days,
          weekdays: (b.weekdays || []).map(n => (Number(n) + 6) % 7 + 1), hours,
          start_time: open.open_time || '09:00', end_time: open.close_time || '17:00', services: services.map(s => s.name) };
      });
    } else state.businesses = [];
    const previous = localStorage.getItem('reservia-selected-business');
    state.selected = state.businesses.some(b => b.id === previous) ? previous : (state.businesses[0]?.id || null);
    nowDate = localDate(active()?.timezone);
    state.day = nowDate;
    const currentDate = parseDate(nowDate);
    state.month = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    if (state.selected) localStorage.setItem('reservia-selected-business', state.selected);
    if (!state.businesses.length) { state.bookings = []; render(); return; }
    const ids = state.businesses.map(b => b.id);
    const { data: bookings, error: bookingError } = await db.from('bookings').select('*').in('business_id', ids).order('local_date', { ascending: true }).order('local_time', { ascending: true });
    if (bookingError) throw bookingError;
    state.bookings = (bookings || []).map(normalizeBooking);
    watchBookings();
    render();
  }

  function watchBookings() {
    if (state.realtime) { db.removeChannel(state.realtime); state.realtime = null; }
    const ids = state.businesses.map(b => b.id);
    if (!ids.length) return;
    state.realtime = db.channel('owner-bookings-' + state.user.id)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, payload => {
        const row = payload.new?.id ? payload.new : payload.old;
        if (!row || !ids.includes(row.business_id)) return;
        if (payload.eventType === 'DELETE') state.bookings = state.bookings.filter(x => x.id !== row.id);
        else {
          const i = state.bookings.findIndex(x => x.id === row.id);
          if (i < 0) state.bookings.push(normalizeBooking(payload.new)); else state.bookings[i] = normalizeBooking(payload.new);
        }
        render();
      }).subscribe();
  }

  async function refreshSession(session) {
    state.session = session || null;
    state.user = session?.user || null;
    if (state.user) {
      document.body.classList.remove('cloud-guest');
      try { await loadWorkspace(); }
      catch (error) { guestScreen(); toast('Veriler yüklenemedi: ' + (error.message || 'Bağlantı hatası')); }
    } else {
      state.businesses = [];
      state.bookings = [];
      state.selected = null;
      if (state.realtime) { db.removeChannel(state.realtime); state.realtime = null; }
      render();
    }
  }

  function publicUrl(business) {
    const url = new URL(location.href);
    url.search = '';
    url.hash = '';
    url.searchParams.set('business', business.slug);
    return url.toString();
  }

  async function openPublicRoute() {
    const slug = new URLSearchParams(location.search).get('business') || new URLSearchParams(location.search).get('randevu');
    if (!slug) return false;
    document.body.classList.add('booking-public', 'cloud-loading');
    document.body.classList.remove('cloud-guest');
    const { data, error } = await db.from('businesses').select('id,slug,name,category,location,about,theme_color,timezone,duration_minutes,capacity,advance_booking_days,weekdays,published').eq('slug', slug).eq('published', true).maybeSingle();
    if (error || !data) {
      state.publicBusiness = { name: 'İşletme bulunamadı', unavailable: true };
      renderPublic();
      return true;
    }
    const [hoursResult, servicesResult] = await Promise.all([
      db.from('business_hours').select('*').eq('business_id', data.id).order('weekday'),
      db.from('business_services').select('*').eq('business_id', data.id).eq('active', true).order('sort_order')
    ]);
    if (hoursResult.error || servicesResult.error) {
      state.publicBusiness = { name: data.name, unavailable: true };
      renderPublic();
      return true;
    }
    const open = (hoursResult.data || [])[0] || {};
    state.publicBusiness = { ...data, color: data.theme_color, is_published: data.published,
      date_range: data.advance_booking_days, weekdays: (data.weekdays || []).map(n => (Number(n) + 6) % 7 + 1),
      hours: hoursResult.data || [], start_time: open.open_time || '09:00', end_time: open.close_time || '17:00',
      services: (servicesResult.data || []).map(s => s.name) };
    state.publicFlow.service = servicesOf(state.publicBusiness)[0] || '';
    state.publicFlow.date = localDate(state.publicBusiness.timezone);
    renderPublic();
    return true;
  }

  function publicHeader(b) {
    return `<div class="public-brand"><span class="public-mark" style="background:${esc(b.color || '#255a4c')}">${esc((b.name || 'R').charAt(0))}</span><span><b>${esc(b.name)}</b><small>${esc(b.category || 'Randevu')}</small></span></div>`;
  }

  function renderPublic() {
    const b = state.publicBusiness;
    if (!b) return;
    document.body.classList.add('booking-public');
    document.body.classList.remove('cloud-loading');
    if (b.unavailable) {
      $('#content').innerHTML = `<div class="public-shell">${publicHeader(b)}<section class="public-card"><h1>Bu rezervasyon bağlantısı kullanılamıyor.</h1><p class="muted">İşletme bağlantısı geçersiz olabilir veya henüz yayımlanmamıştır.</p></section></div>`;
      return;
    }
    const flow = state.publicFlow;
    const steps = `<div class="public-steps"><span class="${flow.step >= 1 ? 'active' : ''}">1 Hizmet</span><span class="${flow.step >= 2 ? 'active' : ''}">2 Tarih ve saat</span><span class="${flow.step >= 3 ? 'active' : ''}">3 İletişim</span></div>`;
    let content = '';
    if (flow.result) {
      content = `<div class="public-success"><span class="confirm-icon">✓</span><h1>Randevu isteğiniz alındı</h1><p class="muted">${esc(b.name)} işletmesine iletildi. İşletme onayladığında randevunuz kesinleşir.</p><div class="confirm-code"><small>RANDEVU KODU</small><strong>${esc(flow.result.booking_code)}</strong></div><dl class="confirm-list"><div><dt>Hizmet</dt><dd>${esc(flow.service)}</dd></div><div><dt>Tarih</dt><dd>${esc(dateLabel(flow.date))}</dd></div><div><dt>Saat</dt><dd>${esc(timeLabel(flow.time))}</dd></div><div><dt>Ad soyad</dt><dd>${esc(flow.customerName)}</dd></div></dl><button class="btn btn-secondary" data-action="public-restart">Yeni randevu al</button></div>`;
    } else if (flow.step === 1) {
      content = `<div class="public-title"><h1>Bir hizmet seçin</h1><p class="muted">${esc(b.about || b.location || 'Size uygun bir randevu zamanı seçin.')}</p></div><div class="public-service-grid">${servicesOf(b).map(service => `<button class="public-service ${flow.service === service ? 'selected' : ''}" data-action="public-service" data-service="${esc(service)}"><span>${esc(service)}</span><small>${Number(b.duration_minutes)} dakika</small></button>`).join('') || '<p>Bu işletme henüz hizmet eklememiş.</p>'}</div><label class="field public-party">Kişi sayısı<input type="number" min="1" max="${Number(b.capacity) || 1}" value="${Number(flow.party)}" id="public-party"></label><div class="public-actions"><button class="btn btn-primary" data-action="public-next" ${servicesOf(b).length ? '' : 'disabled'}>Tarih ve saat seç →</button></div>`;
    } else if (flow.step === 2) {
      const today = localDate(b.timezone);
      const max = shiftDate(today, Number(b.date_range) || 30);
      const slots = flow.slots.map(slot => `<button class="public-slot ${slot.available ? '' : 'unavailable'} ${flow.time === cleanTime(slot.slot_time) ? 'selected' : ''}" data-action="public-slot" data-time="${esc(cleanTime(slot.slot_time))}" ${slot.available ? '' : 'disabled'}><strong>${esc(cleanTime(slot.slot_time))}</strong><small>${slot.available ? `${slot.remaining} yer` : 'Dolu'}</small></button>`).join('');
      content = `<div class="public-title"><h1>Tarih ve saat seçin</h1><p class="muted">${esc(flow.service)} · ${Number(flow.party)} kişi</p></div><label class="field">Tarih<input type="date" id="public-date" min="${today}" max="${max}" value="${esc(flow.date)}"></label><div class="public-slot-grid">${flow.loading ? '<p class="muted">Uygun saatler yükleniyor…</p>' : slots || '<p class="muted">Bu tarihte uygun saat yok. Başka bir gün deneyin.</p>'}</div>${flow.error ? `<p class="cloud-error">${esc(flow.error)}</p>` : ''}<div class="public-actions"><button class="btn btn-ghost" data-action="public-back">Geri</button><button class="btn btn-primary" data-action="public-next" ${flow.time ? '' : 'disabled'}>İletişim bilgilerine geç →</button></div>`;
    } else {
      content = `<div class="public-title"><h1>İletişim bilgilerinizi girin</h1><p class="muted">${esc(flow.service)} · ${esc(dateLabel(flow.date))}, ${esc(timeLabel(flow.time))} · ${Number(flow.party)} kişi</p></div><form id="public-booking-form"><label class="field">Ad soyad<input name="customer_name" autocomplete="name" required minlength="2" maxlength="120"></label><div class="form-grid"><label class="field">E-posta<input name="customer_email" type="email" autocomplete="email" required maxlength="254"></label><label class="field">Telefon<input name="customer_phone" type="tel" autocomplete="tel" maxlength="40"></label></div><label class="field">Not <span class="hint">isteğe bağlı</span><textarea name="notes" rows="3" maxlength="1000"></textarea></label><p class="muted small">Randevu isteğiniz işletme tarafından onaylandığında kesinleşir.</p>${flow.error ? `<p class="cloud-error">${esc(flow.error)}</p>` : ''}<div class="public-actions"><button class="btn btn-ghost" type="button" data-action="public-back">Geri</button><button class="btn btn-primary" type="submit">Randevu isteği gönder</button></div></form>`;
    }
    const summary = `${esc(b.location || '')}${b.location ? ' · ' : ''}${esc(cleanTime(b.start_time))}–${esc(cleanTime(b.end_time))}`;
    $('#content').innerHTML = `<div class="public-shell">${publicHeader(b)}<section class="public-card">${flow.result ? '' : steps}${content}</section><p class="public-footer">${summary}</p></div>`;
  }

  async function loadSlots() {
    const flow = state.publicFlow, b = state.publicBusiness;
    if (state.slotRefreshTimer) { clearTimeout(state.slotRefreshTimer); state.slotRefreshTimer = null; }
    if (!b || b.unavailable || !flow.date || flow.step !== 2 || flow.result) return;
    const requestId = ++state.slotRequestSeq;
    flow.loading = true;
    flow.error = '';
    renderPublic();
    const { data, error } = await db.rpc('available_slots', { p_slug: b.slug, p_date: flow.date, p_party: Number(flow.party) || 1 });
    if (requestId !== state.slotRequestSeq) return;
    flow.loading = false;
    if (error) { flow.slots = []; flow.error = 'Uygun saatler yüklenemedi. Lütfen daha sonra tekrar deneyin.'; }
    else flow.slots = (data || []).map(x => ({ ...x, slot_time: cleanTime(x.slot_time) }));
    if (!flow.slots.some(x => x.slot_time === flow.time && x.available)) flow.time = '';
    renderPublic();
    if (flow.step === 2 && !flow.result) state.slotRefreshTimer = setTimeout(() => loadSlots(), 15000);
  }

  async function submitPublicBooking(form) {
    const flow = state.publicFlow, b = state.publicBusiness;
    const values = new FormData(form);
    const customerName = String(values.get('customer_name') || '').trim();
    const customerEmail = String(values.get('customer_email') || '').trim();
    const customerPhone = String(values.get('customer_phone') || '').trim();
    const notes = String(values.get('notes') || '').trim();
    if (!customerName || !customerEmail || !flow.time) { flow.error = 'Lütfen gerekli bilgileri tamamlayın.'; renderPublic(); return; }
    const submit = form.querySelector('[type="submit"]');
    submit.disabled = true;
    submit.textContent = 'Gönderiliyor…';
    const { data, error } = await db.rpc('create_public_booking', {
      p_slug: b.slug, p_date: flow.date, p_time: flow.time, p_service: flow.service,
      p_party: Number(flow.party), p_customer_name: customerName,
      p_email: customerEmail, p_phone: customerPhone, p_notes: notes
    });
    if (error) {
      const slotUnavailable = /slot is full|time unavailable|time is not an available slot/i.test(error.message || '');
      if (slotUnavailable) {
        flow.step = 2;
        await loadSlots();
        flow.error = 'Bu saat artık uygun değil. Lütfen başka bir saat seçin.';
      } else {
        flow.error = 'Randevu isteği gönderilemedi. Bilgilerinizi kontrol edip tekrar deneyin.';
      }
      renderPublic();
      return;
    }
    const result = Array.isArray(data) ? data[0] : data;
    flow.result = result || { booking_code: 'RSV-' + Date.now().toString(36).toUpperCase() };
    flow.customerName = customerName;
    renderPublic();
  }

  function businessPayload(form) {
    const values = new FormData(form);
    const start = String(values.get('start_time') || '09:00');
    const end = String(values.get('end_time') || '18:00');
    if (start >= end) throw new Error('Bitiş saati başlangıç saatinden sonra olmalı.');
    const days = values.getAll('weekdays').map(Number);
    if (!days.length) throw new Error('En az bir çalışma günü seçin.');
    const services = [...new Set(String(values.get('services') || '').split(',').map(x => x.trim()).filter(Boolean))];
    if (!services.length) throw new Error('En az bir hizmet ekleyin.');
    return {
      p_name: String(values.get('name') || '').trim(), p_category: String(values.get('category') || '').trim(),
      p_location: String(values.get('location') || '').trim(), p_about: String(values.get('about') || '').trim(),
      p_theme_color: String(values.get('color') || '#255a4c'), p_timezone: String(values.get('timezone') || 'Europe/Istanbul'),
      p_duration_minutes: Number(values.get('duration_minutes')), p_capacity: Number(values.get('capacity')),
      p_advance_booking_days: Number(values.get('date_range')),
      p_weekdays: days.map(n => Number(n) % 7), p_services: services,
      p_hours: days.map(n => ({ weekday: Number(n) % 7, open_time: start, close_time: end })),
      p_published: values.get('is_published') === 'on'
    };
  }

  async function createBusiness(form) {
    const values = new FormData(form);
    const name = String(values.get('name') || '').trim();
    const category = String(values.get('category') || '').trim();
    const location = String(values.get('location') || '').trim();
    const timezone = String(values.get('timezone') || 'Europe/Istanbul');
    if (!name || !category || !location) { toast('İşletme bilgilerini tamamlayın.'); return; }
    const { data, error } = await db.rpc('create_business', {
      p_name: name, p_category: category, p_location: location,
      p_about: '', p_timezone: timezone
    });
    if (error) { toast('İşletme oluşturulamadı: ' + error.message); return; }
    closeModal();
    await loadWorkspace();
    const id = typeof data === 'string' ? data : (Array.isArray(data) ? data[0] : data);
    if (id && state.businesses.some(b => b.id === id)) state.selected = id;
    state.view = 'settings';
    render();
    toast('İşletme oluşturuldu. Çalışma saatlerinizi ayarlayın.');
  }

  async function saveSettings(form) {
    const b = active();
    if (!b) return;
    let payload;
    try { payload = businessPayload(form); } catch (error) { toast(error.message); return; }
    const { error } = await db.rpc('update_business_settings', { p_business_id: b.id, ...payload });
    if (error) { toast('Ayarlar kaydedilemedi: ' + error.message); return; }
    await loadWorkspace();
    toast('Ayarlar kaydedildi.');
  }

  function bookingForm(date) {
    const b = active();
    if (!b) return '';
    const today = localDate(b.timezone);
    return `<div class="modal"><div class="modal-head"><h2>Yeni randevu ekle</h2><button class="icon-btn" type="button" data-action="close">×</button></div><form class="modal-body" id="admin-booking-form" data-business-slug="${esc(b.slug)}"><label class="field">Müşteri adı<input name="customer_name" required maxlength="120"></label><div class="form-grid"><label class="field">E-posta<input name="customer_email" type="email" required maxlength="254"></label><label class="field">Telefon<input name="customer_phone" type="tel" maxlength="40"></label></div><div class="form-grid"><label class="field">Tarih<input name="booking_date" type="date" min="${today}" max="${shiftDate(today, Number(b.date_range) || 30)}" value="${esc(date || today)}" required></label><label class="field">Saat<select name="start_time" required><option value="">Önce tarih seçin</option></select></label></div><label class="field">Hizmet<select name="service">${servicesOf(b).map(s => `<option>${esc(s)}</option>`).join('')}</select></label><label class="field">Kişi sayısı<input name="party" type="number" min="1" max="${Number(b.capacity) || 1}" value="1" required></label><label class="field">Not<textarea name="notes" rows="2" maxlength="1000"></textarea></label><div class="modal-footer"><button class="btn btn-secondary" type="button" data-action="close">Vazgeç</button><button class="btn btn-primary" type="submit">Randevu isteği ekle</button></div></form></div>`;
  }

  async function loadAdminSlots(form) {
    const b = active();
    if (!b) return;
    const date = form.elements.booking_date.value;
    const party = Number(form.elements.party.value) || 1;
    const select = form.elements.start_time;
    select.innerHTML = '<option value="">Saatler yükleniyor…</option>';
    const { data, error } = await db.rpc('available_slots', { p_slug: b.slug, p_date: date, p_party: party });
    if (error) { select.innerHTML = '<option value="">Saatler alınamadı</option>'; return; }
    const open = (data || []).filter(x => x.available);
    select.innerHTML = open.length ? '<option value="">Saat seçin</option>' + open.map(x => `<option value="${esc(cleanTime(x.slot_time))}">${esc(cleanTime(x.slot_time))}</option>`).join('') : '<option value="">Uygun saat yok</option>';
  }

  async function createAdminBooking(form) {
    const b = active();
    const values = new FormData(form);
    const { data, error } = await db.rpc('create_public_booking', {
      p_slug: b.slug, p_date: values.get('booking_date'), p_time: values.get('start_time'),
      p_service: values.get('service'), p_party: Number(values.get('party')) || 1,
      p_customer_name: String(values.get('customer_name') || '').trim(),
      p_email: String(values.get('customer_email') || '').trim(),
      p_phone: String(values.get('customer_phone') || '').trim(), p_notes: String(values.get('notes') || '').trim()
    });
    if (error) { toast('Randevu eklenemedi: ' + error.message); return; }
    closeModal();
    await loadWorkspace();
    toast('Randevu eklendi.');
  }

  async function changeBooking(id, status) {
    const { data, error } = await db.from('bookings').update({ status }).eq('id', id).select().single();
    if (error) { toast('Randevu güncellenemedi: ' + error.message); return; }
    state.bookings = state.bookings.map(x => x.id === id ? normalizeBooking(data) : x);
    render();
    toast('Randevu durumu güncellendi.');
  }

  async function deleteBooking(id) {
    await changeBooking(id, 'cancelled');
  }

  async function authSubmit(form) {
    const values = new FormData(form);
    const mode = form.dataset.authMode;
    const email = String(values.get('email') || '').trim();
    const password = String(values.get('password') || '');
    let result;
    if (mode === 'register') {
      result = await db.auth.signUp({ email, password, options: { emailRedirectTo: location.origin + location.pathname, data: { full_name: String(values.get('name') || '').trim() } } });
      if (result.error) { toast('Kayıt oluşturulamadı: ' + result.error.message); return; }
      if (!result.data.session) {
        closeModal();
        toast('Hesabınız oluşturuldu. Giriş yapmadan önce e-postanızı doğrulayın.');
        return;
      }
    } else {
      result = await db.auth.signInWithPassword({ email, password });
      if (result.error) { toast('Giriş başarısız: e-posta ve şifrenizi kontrol edin.'); return; }
    }
    closeModal();
    await refreshSession(result.data.session);
    toast(mode === 'register' ? 'Hesabınız oluşturuldu.' : 'Giriş yapıldı.');
  }

  async function signOut() {
    const { error } = await db.auth.signOut();
    if (error) { toast('Çıkış yapılamadı: ' + error.message); return; }
    state.session = null;
    state.user = null;
    state.businesses = [];
    state.bookings = [];
    state.selected = null;
    render();
  }

  function selectedBusiness(id) {
    const business = state.businesses.find(b => b.id === id);
    if (!business) return;
    state.selected = id;
    nowDate = localDate(business.timezone);
    state.day = nowDate;
    const currentDate = parseDate(nowDate);
    state.month = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    localStorage.setItem('reservia-selected-business', id);
    state.view = 'overview';
    render();
  }

  function selectView(name) {
    if (!state.session) { modal('login'); return; }
    if (!state.businesses.length && name !== 'businesses') { toast('Önce işletme bilgilerinizi ekleyin.'); return; }
    state.view = name || 'businesses';
    render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function copyPublicLink() {
    const b = active();
    if (!b) return;
    const value = publicUrl(b);
    try { await navigator.clipboard.writeText(value); toast('Müşteri bağlantısı kopyalandı.'); }
    catch (_) { window.prompt('Müşteri bağlantısı', value); }
  }

  function openPublicPreview() {
    const b = active();
    if (!b) return;
    if (!b.is_published) { toast('Önce ayarlardan bağlantıyı yayımlayın.'); return; }
    window.open(publicUrl(b), '_blank', 'noopener,noreferrer');
  }

  function toggleTheme() {
    const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('reservia-demo-theme', next);
  }

  function notifications() {
    state.view = 'bookings';
    state.filters.status = 'pending';
    state.filters.range = 'upcoming';
    render();
  }

  function onClick(event) {
    const target = event.target.closest('[data-action]');
    if (!target) return;
    const action = target.dataset.action;
    if (action === 'login') modal('login');
    else if (action === 'register') modal('register');
    else if (action === 'close') closeModal();
    else if (action === 'auth-tab') modal(target.dataset.mode);
    else if (action === 'new-business') modal('new-business');
    else if (action === 'select-business') selectedBusiness(target.dataset.id);
    else if (action === 'view-bookings') selectView('bookings');
    else if (action === 'view-calendar') selectView('calendar');
    else if (action === 'save-settings') { const f = $('#cloud-settings-form'); if (f?.reportValidity()) saveSettings(f); }
    else if (action === 'new-booking') modal('booking', target.dataset.date || '');
    else if (action === 'copy-link') copyPublicLink();
    else if (action === 'open-link') openPublicPreview();
    else if (action === 'status') changeBooking(target.dataset.id, target.dataset.status);
    else if (action === 'delete-booking') deleteBooking(target.dataset.id);
    else if (action === 'month-prev') { state.month = new Date(state.month.getFullYear(), state.month.getMonth() - 1, 1); render(); }
    else if (action === 'month-next') { state.month = new Date(state.month.getFullYear(), state.month.getMonth() + 1, 1); render(); }
    else if (action === 'pick-day') { state.day = target.dataset.date; state.view = 'calendar'; render(); }
    else if (action === 'public-service') { state.publicFlow.service = target.dataset.service; renderPublic(); }
    else if (action === 'public-slot') { state.publicFlow.time = target.dataset.time; renderPublic(); }
    else if (action === 'public-next') { const party = $('#public-party'); if (party) state.publicFlow.party = Math.max(1, Number(party.value) || 1); if (state.publicFlow.step === 1) { state.publicFlow.step = 2; state.publicFlow.time = ''; loadSlots(); } else if (state.publicFlow.step === 2 && state.publicFlow.time) { state.publicFlow.step = 3; renderPublic(); } }
    else if (action === 'public-back') { state.publicFlow.step = Math.max(1, state.publicFlow.step - 1); state.publicFlow.error = ''; renderPublic(); if (state.publicFlow.step === 2) loadSlots(); }
    else if (action === 'public-restart') { if (state.slotRefreshTimer) clearTimeout(state.slotRefreshTimer); state.slotRefreshTimer = null; state.slotRequestSeq++; state.publicFlow = { step: 1, service: servicesOf(state.publicBusiness)[0] || '', party: 1, date: localDate(state.publicBusiness.timezone), time: '', slots: [], loading: false, result: null, error: '' }; renderPublic(); }
  }

  function onChange(event) {
    if (event.target.id === 'public-date') { state.publicFlow.date = event.target.value; state.publicFlow.time = ''; loadSlots(); }
    else if (event.target.id === 'public-party') { state.publicFlow.party = Math.max(1, Number(event.target.value) || 1); loadSlots(); }
    else if (event.target.id === 'cloud-booking-search') { state.filters.query = event.target.value; const pos = event.target.selectionStart; render(); const next = $('#cloud-booking-search'); next?.focus(); next?.setSelectionRange(pos, pos); }
    else if (event.target.id === 'cloud-status-filter') { state.filters.status = event.target.value; render(); }
    else if (event.target.id === 'cloud-range-filter') { state.filters.range = event.target.value; render(); }
    else if (event.target.closest('#admin-booking-form') && (event.target.name === 'booking_date' || event.target.name === 'party')) loadAdminSlots(event.target.form);
  }

  function onSubmit(event) {
    const form = event.target;
    if (form.matches('[data-auth-mode]')) { event.preventDefault(); authSubmit(form); }
    else if (form.id === 'business-create-form') { event.preventDefault(); createBusiness(form); }
    else if (form.id === 'cloud-settings-form') { event.preventDefault(); saveSettings(form); }
    else if (form.id === 'admin-booking-form') { event.preventDefault(); createAdminBooking(form); }
    else if (form.id === 'public-booking-form') { event.preventDefault(); submitPublicBooking(form); }
  }

  document.addEventListener('click', onClick);
  document.addEventListener('change', onChange);
  document.addEventListener('submit', onSubmit);
  document.addEventListener('keydown', event => { if (event.key === 'Escape') closeModal(); });
  $('#theme-toggle')?.addEventListener('click', toggleTheme);

  window.app = {
    view: selectView,
    modal,
    close: closeModal,
    toggleTheme,
    notifications,
    select: selectedBusiness,
    setTab: mode => modal(mode),
    addBusiness: event => { event?.preventDefault(); const f = $('#business-create-form'); if (f) createBusiness(f); },
    saveSettings: event => { event?.preventDefault(); const f = $('#cloud-settings-form'); if (f) saveSettings(f); },
    setBookingStatus: changeBooking,
    cancelBooking: id => changeBooking(id, 'cancelled'),
    removeBooking: deleteBooking,
    openBook: openPublicPreview,
    openCustomer: openPublicPreview,
    closeBook: () => selectView('overview'),
    preview: openPublicPreview,
    signOut,
    active
  };

  async function boot() {
    const publicRoute = await openPublicRoute();
    if (publicRoute) return;
    document.body.classList.add('cloud-loading');
    const { data, error } = await db.auth.getSession();
    if (error) { guestScreen(); toast('Oturum kontrol edilemedi: ' + error.message); return; }
    await refreshSession(data.session);
    db.auth.onAuthStateChange((_event, session) => {
      queueMicrotask(() => refreshSession(session));
    });
  }

  boot().catch(error => {
    document.body.classList.remove('cloud-loading');
    guestScreen();
    toast('Uygulama başlatılamadı: ' + (error.message || 'Bağlantı hatası'));
    console.error('Reservia startup error:', error);
  });
})();
