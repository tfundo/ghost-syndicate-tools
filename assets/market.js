/* ===================================================
   GHOST SYNDICATE TOOLS — Mercado de Jugadores
   Discord OAuth via Supabase
   =================================================== */
'use strict';

window.Market = (function () {

  const SUPABASE_URL  = 'https://hsluuuhnkhdqrmkfpehv.supabase.co';
  const SUPABASE_ANON = 'sb_publishable_PMu9nPqwiPUK7mKH5RniQA_GKX1BL6U';
  const GUILD_ID      = '571607898434568193';
  const BUCKET        = 'listing-images';

  let sb           = null;
  let _user        = null;
  let _session     = null;
  let _inGuild     = null;   // null=comprobando, true, false
  let _listings    = [];
  let _filter      = 'all';
  let _myOnly      = false;
  let _showForm    = false;
  let _formType    = 'venta';
  let _saving      = false;
  let _loadingData = false;
  let _mountEl     = null;
  let _initialized = false;

  const DC_SVG = `<svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>`;

  // ── Init ─────────────────────────────────────────────────
  function init() {
    if (_initialized) { render(); return; }
    if (!window.supabase) { console.error('Supabase SDK no cargado'); return; }
    _initialized = true;

    sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);

    sb.auth.onAuthStateChange(async (event, session) => {
      _session = session;
      _user    = session?.user ?? null;
      if (event === 'SIGNED_IN' && _user) {
        _inGuild = null;
        render();
        await checkGuild();
        if (_inGuild) await loadListings();
      } else if (event === 'SIGNED_OUT') {
        _inGuild  = null;
        _listings = [];
      }
      render();
    });

    sb.auth.getSession().then(async ({ data: { session } }) => {
      _session = session;
      _user    = session?.user ?? null;
      if (_user) {
        await checkGuild();
        if (_inGuild) await loadListings();
      }
      render();
    });
  }

  // ── Mount ─────────────────────────────────────────────────
  function mount(elId) {
    _mountEl = elId;
    init();
    render();
  }

  // ── Auth ──────────────────────────────────────────────────
  async function login() {
    const base = window.location.href.split('?')[0].split('#')[0];
    await sb.auth.signInWithOAuth({
      provider: 'discord',
      options: {
        scopes: 'identify email guilds',
        redirectTo: base
      }
    });
  }

  async function logout() {
    await sb.auth.signOut();
  }

  // ── Guild check ───────────────────────────────────────────
  async function checkGuild() {
    if (!_session?.provider_token) { _inGuild = false; return; }
    try {
      const res = await fetch('https://discord.com/api/users/@me/guilds', {
        headers: { Authorization: `Bearer ${_session.provider_token}` }
      });
      if (!res.ok) { _inGuild = false; return; }
      const guilds = await res.json();
      _inGuild = Array.isArray(guilds) && guilds.some(g => g.id === GUILD_ID);
    } catch {
      _inGuild = false;
    }
  }

  // ── DB ────────────────────────────────────────────────────
  async function loadListings() {
    if (!sb) return;
    _loadingData = true; render();
    const { data, error } = await sb
      .from('listings')
      .select('*')
      .eq('active', true)
      .order('created_at', { ascending: false });
    _loadingData = false;
    if (!error && data) _listings = data;
    render();
  }

  async function submitForm(e) {
    e.preventDefault();
    if (_saving) return;
    const form  = e.target;
    const title = form.querySelector('[name=title]').value.trim();
    const desc  = form.querySelector('[name=description]').value.trim();
    const price = form.querySelector('[name=price]')?.value.trim() || '';
    const file  = form.querySelector('[name=image]').files[0];

    if (!title) return;
    if (file && file.size > 2 * 1024 * 1024) {
      alert(tr('La imagen no puede superar 2MB', 'Image cannot exceed 2MB'));
      return;
    }

    _saving = true; render();

    let imageUrl = null;
    if (file) {
      const ext  = file.name.split('.').pop().toLowerCase();
      const path = `${_user.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await sb.storage.from(BUCKET).upload(path, file);
      if (upErr) {
        _saving = false;
        alert('Error subiendo imagen: ' + upErr.message);
        render(); return;
      }
      imageUrl = sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
    }

    const meta = _user.user_metadata || {};
    const { error } = await sb.from('listings').insert({
      user_id:          _user.id,
      discord_id:       meta.provider_id || meta.sub || _user.id,
      discord_username: meta.full_name || meta.user_name || 'Unknown',
      discord_avatar:   meta.avatar_url  || null,
      type:             _formType,
      title,
      description:      desc  || null,
      price:            price || null,
      image_url:        imageUrl,
      active:           true
    });

    _saving = false;
    if (error) { alert('Error publicando: ' + error.message); render(); return; }
    _showForm = false;
    await loadListings();
  }

  async function deleteListing(id) {
    if (!confirm(tr('¿Eliminar este anuncio?', 'Delete this listing?'))) return;
    await sb.from('listings').update({ active: false }).eq('id', id).eq('user_id', _user.id);
    _listings = _listings.filter(l => l.id !== id);
    render();
  }

  // ── Helpers ───────────────────────────────────────────────
  function tr(es, en) { return window.currentLang === 'en' ? en : es; }
  function esc(s) {
    return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
  function timeAgo(d) {
    const min = Math.floor((Date.now() - new Date(d)) / 60000);
    if (min < 1)  return tr('ahora', 'just now');
    if (min < 60) return `${min}m`;
    const h = Math.floor(min / 60);
    if (h < 24)   return `${h}h`;
    return `${Math.floor(h / 24)}d`;
  }

  // ── Render ────────────────────────────────────────────────
  function render() {
    const el = document.getElementById(_mountEl);
    if (!el || !sb) return;
    if (!_user)             { el.innerHTML = renderLogin();    return; }
    if (_inGuild === null)  { el.innerHTML = renderChecking(); return; }
    if (!_inGuild)          { el.innerHTML = renderNoGuild();  return; }
    el.innerHTML = renderMarket();
  }

  function renderLogin() {
    return `
      <div class="mkt-gate">
        <div class="mkt-gate-icon">🏪</div>
        <h2 class="mkt-gate-title">${tr('Mercado de Jugadores', 'Player Market')}</h2>
        <p class="mkt-gate-desc">${tr(
          'Compra, vende e intercambia con la comunidad Ghost Syndicate.<br>Exclusivo para miembros del servidor.',
          'Buy, sell and trade with the Ghost Syndicate community.<br>Exclusive for server members.'
        )}</p>
        <button class="mkt-discord-btn" onclick="Market.login()">
          ${DC_SVG} ${tr('Entrar con Discord', 'Sign in with Discord')}
        </button>
      </div>`;
  }

  function renderChecking() {
    return `<div class="loading-state">
      <div class="loading-spinner"></div>
      <p>${tr('Verificando membresía del servidor...', 'Checking server membership...')}</p>
    </div>`;
  }

  function renderNoGuild() {
    const name = esc(_user.user_metadata?.full_name || _user.user_metadata?.user_name || '');
    return `
      <div class="mkt-gate">
        <div class="mkt-gate-icon">🔒</div>
        <h2 class="mkt-gate-title">${tr('Acceso Restringido', 'Access Restricted')}</h2>
        <p class="mkt-gate-desc">${tr(
          `Hola <strong>${name}</strong>, este mercado es exclusivo para miembros de <strong>Ghost Syndicate Gaming</strong>. Únete al servidor para acceder.`,
          `Hello <strong>${name}</strong>, this market is exclusive for <strong>Ghost Syndicate Gaming</strong> members. Join the server to get access.`
        )}</p>
        <a class="mkt-discord-btn" href="https://discord.com/invite/Ktfnbmj5s7" target="_blank" rel="noopener">
          ${DC_SVG} ${tr('Unirse a Ghost Syndicate Gaming', 'Join Ghost Syndicate Gaming')}
        </a>
        <button class="mkt-text-btn" onclick="Market.logout()">${tr('Cerrar sesión', 'Sign out')}</button>
      </div>`;
  }

  function renderMarket() {
    const meta     = _user.user_metadata || {};
    const username = esc(meta.full_name || meta.user_name || 'User');
    const avatar   = meta.avatar_url;

    const typeColors  = { venta: '#22c55e', compra: '#3b82f6', cambio: '#f59e0b' };
    const typeLabels  = { venta: tr('VENTA','SALE'), compra: tr('COMPRA','BUY'), cambio: tr('CAMBIO','TRADE') };
    const fltLabels   = { all: tr('Todos','All'), venta: tr('Venta','Sale'), compra: tr('Compra','Buy'), cambio: tr('Cambio','Trade') };
    const fltIcons    = { all: '🔍', venta: '💰', compra: '🛒', cambio: '🔄' };

    let shown = _filter === 'all' ? [..._listings] : _listings.filter(l => l.type === _filter);
    if (_myOnly) shown = shown.filter(l => l.user_id === _user.id);

    const gridHtml = _loadingData
      ? `<div class="loading-state"><div class="loading-spinner"></div></div>`
      : !shown.length
      ? `<div class="empty-state"><div class="empty-icon">📭</div>
          <p>${tr('No hay anuncios en esta categoría', 'No listings in this category')}</p></div>`
      : `<div class="mkt-grid">${shown.map(l => `
          <div class="mkt-card">
            <div class="mkt-card-thumb">
              ${l.image_url
                ? `<img src="${esc(l.image_url)}" alt="${esc(l.title)}" loading="lazy">`
                : `<div class="mkt-no-img">◈</div>`}
              <span class="mkt-badge" style="--bc:${typeColors[l.type]}">${typeLabels[l.type]}</span>
            </div>
            <div class="mkt-card-body">
              <h3 class="mkt-card-title">${esc(l.title)}</h3>
              ${l.description ? `<p class="mkt-card-desc">${esc(l.description)}</p>` : ''}
              ${l.price ? `<div class="mkt-card-price">${esc(l.price)} aUEC</div>` : ''}
              <div class="mkt-card-foot">
                ${l.discord_avatar
                  ? `<img class="mkt-avatar" src="${esc(l.discord_avatar)}" alt="">`
                  : `<div class="mkt-avatar mkt-avatar-ph">◈</div>`}
                <span class="mkt-card-user">${esc(l.discord_username)}</span>
                <span class="mkt-card-time">${timeAgo(l.created_at)}</span>
                ${l.user_id === _user.id
                  ? `<button class="mkt-del-btn" onclick="Market.deleteListing('${l.id}')" title="${tr('Eliminar','Delete')}">✕</button>`
                  : ''}
              </div>
            </div>
          </div>`).join('')}
        </div>`;

    const formHtml = _showForm ? renderForm() : '';

    return `
      <div class="mkt-topbar">
        <div class="mkt-user">
          ${avatar ? `<img class="mkt-avatar mkt-avatar-md" src="${esc(avatar)}" alt="">` : ''}
          <span class="mkt-username">${username}</span>
        </div>
        <div class="mkt-top-actions">
          <button class="mkt-mine-btn${_myOnly ? ' active' : ''}" onclick="Market.toggleMine()">
            ${tr('Mis anuncios', 'My listings')}
          </button>
          <button class="btn-primary mkt-post-btn" onclick="Market.openForm()">
            + ${tr('Publicar', 'Post')}
          </button>
          <button class="mkt-logout-btn" onclick="Market.logout()" title="${tr('Cerrar sesión','Sign out')}">⏻</button>
        </div>
      </div>
      <div class="mkt-filters">
        ${['all','venta','compra','cambio'].map(f => `
          <button class="mkt-filter-btn${_filter === f ? ' active' : ''}" onclick="Market.setFilter('${f}')">
            ${fltIcons[f]} ${fltLabels[f]}
          </button>`).join('')}
        <span class="mkt-count">${shown.length} ${tr('anuncios', 'listings')}</span>
      </div>
      ${gridHtml}
      ${formHtml}`;
  }

  function renderForm() {
    return `
      <div class="mkt-overlay" onclick="if(event.target===this)Market.closeForm()">
        <div class="mkt-modal">
          <div class="mkt-modal-head">
            <span class="mkt-modal-title">${tr('Nuevo Anuncio', 'New Listing')}</span>
            <button class="modal-close" onclick="Market.closeForm()">✕</button>
          </div>
          <form class="mkt-form" onsubmit="Market.submitForm(event)">
            <div class="mkt-field">
              <label>${tr('Tipo de anuncio', 'Listing type')}</label>
              <div class="mkt-type-row">
                <button type="button" class="mkt-type-btn${_formType==='venta'?' active':''}" onclick="Market.setType('venta')">💰 ${tr('Venta','Sale')}</button>
                <button type="button" class="mkt-type-btn${_formType==='compra'?' active':''}" onclick="Market.setType('compra')">🛒 ${tr('Compra','Buy')}</button>
                <button type="button" class="mkt-type-btn${_formType==='cambio'?' active':''}" onclick="Market.setType('cambio')">🔄 ${tr('Cambio','Trade')}</button>
              </div>
            </div>
            <div class="mkt-field">
              <label for="mktTitle">${tr('Artículo / Título', 'Item / Title')} *</label>
              <input id="mktTitle" class="mkt-input" type="text" name="title"
                placeholder="${tr('Ej: Aurora MR, 100 Widowmaker, 500k aUEC...','E.g.: Aurora MR, 100 Widowmaker...')}"
                maxlength="100" required autocomplete="off">
            </div>
            <div class="mkt-field">
              <label for="mktDesc">${tr('Descripción', 'Description')}</label>
              <textarea id="mktDesc" class="mkt-input mkt-textarea" name="description"
                placeholder="${tr('Condiciones, estado, cómo contactar en Discord...','Condition, details, how to contact...')}"
                maxlength="500"></textarea>
            </div>
            ${_formType !== 'cambio' ? `
            <div class="mkt-field">
              <label for="mktPrice">${tr('Precio (aUEC)', 'Price (aUEC)')}</label>
              <input id="mktPrice" class="mkt-input" type="text" name="price"
                placeholder="${tr('Ej: 150000 o negociable','E.g.: 150000 or negotiable')}" maxlength="50">
            </div>` : ''}
            <div class="mkt-field">
              <label for="mktImg">${tr('Imagen (máx 2MB)', 'Image (max 2MB)')}</label>
              <input id="mktImg" class="mkt-file-input" type="file" name="image"
                accept="image/jpeg,image/png,image/webp,image/gif">
            </div>
            <div class="mkt-form-btns">
              <button type="button" class="btn-ghost" onclick="Market.closeForm()">${tr('Cancelar','Cancel')}</button>
              <button type="submit" class="btn-primary" ${_saving ? 'disabled' : ''}>
                ${_saving ? tr('Publicando...','Publishing...') : tr('Publicar Anuncio','Publish Listing')}
              </button>
            </div>
          </form>
        </div>
      </div>`;
  }

  // ── Acciones públicas ─────────────────────────────────────
  function openForm()   { _showForm = true;  render(); }
  function closeForm()  { _showForm = false; render(); }
  function setFilter(f) { _filter = f;       render(); }
  function toggleMine() { _myOnly = !_myOnly; render(); }
  function setType(t)   { _formType = t;     render(); }

  return { mount, login, logout, openForm, closeForm, setFilter, toggleMine, setType, submitForm, deleteListing };

})();
