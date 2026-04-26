/* ===================================================
   GHOST SYNDICATE TOOLS — Ship Builds Module
   Tab BUILDS en comparador + creación de builds con
   dropdowns de componentes extraídos del juego
   =================================================== */
'use strict';

window.Builds = (function () {

  const DC_SVG = `<svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>`;

  // Labels for slot types
  const SLOT_LABELS = {
    PowerPlant:   { label: 'Planta de Energía', icon: '⚡' },
    Cooler:       { label: 'Enfriador',          icon: '❄' },
    Shield:       { label: 'Escudo',             icon: '🛡' },
    QuantumDrive: { label: 'Motor de Salto',     icon: '🌀' },
    Radar:        { label: 'Radar',              icon: '📡' },
    Weapon:       { label: 'Arma',               icon: '⚔' },
    TurretModule: { label: 'Módulo Torreta',     icon: '🎯' },
    MissileRack:  { label: 'Rack Misiles',       icon: '🚀' },
  };

  const SUPABASE_URL  = 'https://hsluuuhnkhdqrmkfpehv.supabase.co';
  const SUPABASE_ANON = 'sb_publishable_PMu9nPqwiPUK7mKH5RniQA_GKX1BL6U';

  let _allBuilds  = [];
  let _userVotes  = {};
  let _compDB     = null;

  // Un único cliente Supabase: el de Auth (creado en auth.js).
  // Puede leer tablas públicas incluso sin sesión iniciada (clave anon).
  function _getSb() { return window.Auth?.getSupabase() ?? null; }

  // ── Load components DB ───────────────────────────────
  async function _loadCompDB() {
    if (_compDB) return _compDB;
    try {
      const r = await fetch('data/components_db.json');
      _compDB = await r.json();
    } catch (e) {
      console.error('[Builds] Error cargando components_db:', e);
      _compDB = { components: {}, ships: {} };
    }
    return _compDB;
  }

  // ── Find ship data by name ────────────────────────────
  function _findShipData(shipName) {
    if (!_compDB) return null;
    const ships = _compDB.ships;
    // Exact match
    if (ships[shipName]) return ships[shipName];
    // Case-insensitive
    const lower = shipName.toLowerCase();
    for (const [k, v] of Object.entries(ships)) {
      if (k.toLowerCase() === lower) return v;
    }
    // Partial match
    for (const [k, v] of Object.entries(ships)) {
      if (k.toLowerCase().includes(lower) || lower.includes(k.toLowerCase())) return v;
    }
    return null;
  }

  // ── Build option list for a component type+size ──────
  function _buildOptions(compType, size, defaultName = '') {
    if (!_compDB) return '<option value="">— Sin datos —</option>';
    const sizeKey = String(size);
    const items   = (_compDB.components[compType] || {})[sizeKey] || [];
    if (items.length === 0) {
      const adj = [String(size - 1), String(size + 1)];
      adj.forEach(s => {
        const extra = (_compDB.components[compType] || {})[s] || [];
        extra.forEach(i => items.push(i));
      });
    }
    const opts = items.map(item => {
      const grade = item.grade ? ` · ${item.grade}` : '';
      const mfr   = item.mfr   ? ` — ${item.mfr}` : '';
      const label = `${item.name}${mfr}${grade}`;
      const sel   = defaultName && item.name === defaultName ? ' selected' : '';
      return `<option value="${esc(item.name)}"${sel}>${esc(label)}</option>`;
    }).join('');
    return `<option value="">— Sin equipar —</option>${opts}`;
  }

  // ── Lookup stats for a named component ───────────────
  function _findCompStats(compType, name, size) {
    if (!name || !_compDB) return null;
    const sizeKey = String(size);
    const items = (_compDB.components[compType] || {})[sizeKey] || [];
    const found = items.find(i => i.name === name);
    if (found) return found;
    // Try adjacent sizes
    for (const s of [String(size-1), String(size+1)]) {
      const adj = (_compDB.components[compType] || {})[s] || [];
      const f   = adj.find(i => i.name === name);
      if (f) return f;
    }
    return null;
  }

  // ── Stats comparison panel ────────────────────────────
  const STAT_DEFS = {
    PowerPlant:   [{ key:'power',     label:'⚡ Potencia',       unit:'EU/s', hb:true  }],
    Cooler:       [{ key:'cooling',   label:'❄ Enfriamiento',   unit:'',     hb:true  },
                   { key:'power',     label:'  · Consumo',      unit:'EU',   hb:false }],
    Shield:       [{ key:'hp',        label:'🛡 HP Escudo',      unit:'',     hb:true  },
                   { key:'regen',     label:'  · Regen/s',      unit:'',     hb:true  },
                   { key:'delay',     label:'  · Delay caída',  unit:'s',    hb:false },
                   { key:'power',     label:'  · Consumo',      unit:'EU',   hb:false }],
    QuantumDrive: [{ key:'speed',     label:'🌀 QD Velocidad',   unit:'Mm/s', hb:true  },
                   { key:'spool',     label:'  · Spool',        unit:'s',    hb:false },
                   { key:'cooldown',  label:'  · Cooldown',     unit:'s',    hb:false }],
  };

  function _buildStatsPanelHTML() {
    const selects = [...document.querySelectorAll('.bcreate-select[data-comptype]')];
    if (!selects.length || !_compDB) return '';

    const byType = {};
    selects.forEach(sel => {
      const ct = sel.dataset.comptype;
      if (ct === 'Weapon' || ct === 'Radar' || ct === 'TurretModule' || ct === 'MissileRack') return;
      if (!byType[ct]) byType[ct] = [];
      byType[ct].push({ selected: sel.value, def: sel.dataset.default, size: +sel.dataset.size });
    });

    const fmt = (v, unit) => {
      if (v === null || v === undefined) return '—';
      const n = v >= 10000 ? Math.round(v/1000)+'k' : v >= 1000 ? (v/1000).toFixed(1)+'k' : v % 1 === 0 ? v : v.toFixed(1);
      return unit ? `${n} ${unit}` : String(n);
    };

    let rows = '';
    let hasAny = false;

    for (const [ct, defs] of Object.entries(STAT_DEFS)) {
      const slots = byType[ct];
      if (!slots?.length) continue;

      for (const { key, label, unit, hb } of defs) {
        let baseSum = 0, selSum = 0, baseN = 0, selN = 0;
        slots.forEach(({ selected, def, size }) => {
          const bs = _findCompStats(ct, def, size);
          const ss = _findCompStats(ct, selected, size);
          if (bs?.[key] != null) { baseSum += bs[key]; baseN++; }
          if (ss?.[key] != null) { selSum  += ss[key]; selN++;  }
        });
        if (!baseN && !selN) continue;
        hasAny = true;

        const base = baseN ? baseSum : null;
        const sel  = selN  ? selSum  : null;

        let dcls = '', dtxt = '';
        if (base !== null && sel !== null && base !== sel) {
          const diff   = sel - base;
          const better = hb ? diff > 0 : diff < 0;
          const pct    = base !== 0 ? Math.abs(diff / base * 100).toFixed(0) : '—';
          dcls = better ? 'bc-better' : 'bc-worse';
          dtxt = `${better ? '▲' : '▼'} ${diff > 0 ? '+' : ''}${fmt(diff, unit)} (${diff>0?'+':''}${pct}%)`;
        } else if (base !== null && sel !== null) {
          dcls = 'bc-same'; dtxt = '= igual';
        }

        rows += `<div class="bc-stat-row">
          <span class="bc-stat-lbl">${label}</span>
          <span class="bc-stat-base">${fmt(base, unit)}</span>
          <span class="bc-stat-arrow">→</span>
          <span class="bc-stat-sel">${fmt(sel, unit)}</span>
          ${dtxt ? `<span class="bc-stat-delta ${dcls}">${dtxt}</span>` : ''}
        </div>`;
      }
    }

    if (!hasAny) return '';
    return `<div class="bc-stats-panel">
      <div class="bc-stats-panel-title">Comparativa vs serie</div>
      <div class="bc-stats-hdr">
        <span>Stat</span>
        <span style="text-align:right">Serie</span>
        <span></span>
        <span style="text-align:right">Build</span>
      </div>
      ${rows}
    </div>`;
  }

  function onCompChange() {
    const panel = document.getElementById('bcStatsPanel');
    if (panel) panel.innerHTML = _buildStatsPanelHTML();
  }

  // ── Generate form HTML (sync, called after DB load) ──
  function _buildFormHTML(shipName, shipData) {
    const slots = shipData?.slots || {};
    const sections = [];

    // Non-weapon slots (PP, Cooler, Shield, QD, Radar)
    const baseTypes = ['PowerPlant', 'Cooler', 'Shield', 'QuantumDrive', 'Radar', 'TurretModule', 'MissileRack'];
    const compSection = [];
    baseTypes.forEach(type => {
      const slotList = slots[type] || [];
      const meta = SLOT_LABELS[type];
      if (slotList.length === 0) {
        // Show a generic size-1 slot if ship not in DB
        slotList.push({ size: 1 });
      }
      slotList.forEach((slot, i) => {
        const label    = slotList.length > 1
          ? `${meta.icon} ${meta.label} ${i + 1} (S${slot.size})`
          : `${meta.icon} ${meta.label} (S${slot.size})`;
        const defName  = slot.default || '';
        const stockTag = defName ? `<span class="bcf-stock-tag">stock: ${esc(defName)}</span>` : '';
        const id = `bcf_${type}_${i}`;
        compSection.push(`
          <div class="bcreate-field">
            <label class="bcreate-label">${label}${stockTag}</label>
            <select class="bcreate-select" id="${id}"
              data-comptype="${type}" data-size="${slot.size}" data-default="${esc(defName)}"
              onchange="Builds.onCompChange()">
              ${_buildOptions(type, slot.size, defName)}
            </select>
          </div>`);
      });
    });
    // Weapon slots
    const weaponSlots = slots['Weapon'] || [];
    let weaponHTML = '';
    if (weaponSlots.length > 0) {
      const wRows = weaponSlots.map((slot, i) => {
        const defName  = slot.default || '';
        const stockTag = defName ? `<span class="bcf-stock-tag">stock: ${esc(defName)}</span>` : '';
        const id = `bcf_Weapon_${i}`;
        return `
          <div class="bcreate-field">
            <label class="bcreate-label">⚔ Arma ${i + 1} (S${slot.size})${stockTag}</label>
            <select class="bcreate-select" id="${id}">
              ${_buildOptions('Weapon', slot.size, defName)}
            </select>
          </div>`;
      }).join('');
      weaponHTML = `<div class="bcreate-section-lbl">Armamento</div>${wRows}`;
    } else if (!shipData) {
      weaponHTML = `
        <div class="bcreate-section-lbl">Armamento</div>
        <div class="bcreate-field bcreate-field-full">
          <label class="bcreate-label">⚔ Armas (una por línea)</label>
          <textarea class="bcreate-input bcreate-ta" id="bcf_weapons_text"
                    placeholder="CF-117 Badger Repeater&#10;Attrition-3 Laser Cannon" rows="3" maxlength="500"></textarea>
        </div>`;
    }

    // Two-column layout: slots left, stats right
    return `<div class="bcreate-two-col">
      <div class="bcreate-slots-col">
        ${compSection.length ? `<div class="bcreate-section-lbl">Componentes</div>${compSection.join('')}` : ''}
        ${weaponHTML}
      </div>
      <div class="bcreate-stats-col">
        <div id="bcStatsPanel"></div>
      </div>
    </div>`;
  }

  // ── CREATE BUILD: outer shell (sync) ─────────────────
  function _showLoginModal() {
    let el = document.getElementById('buildsLoginModal');
    if (!el) {
      el = document.createElement('div');
      el.id = 'buildsLoginModal';
      el.innerHTML = `
        <div class="blm-box">
          <button class="blm-close" onclick="document.getElementById('buildsLoginModal').remove()" title="Cerrar">✕</button>
          <div class="blm-lock">🔒</div>
          <h3 class="blm-title">Sesión requerida</h3>
          <p class="blm-msg">Inicia sesión con Discord para poder crear y publicar builds de naves.</p>
          <button class="blm-btn" onclick="Auth.login()">
            ${DC_SVG} Iniciar sesión con Discord
          </button>
        </div>`;
      el.className = 'blm-overlay';
      el.addEventListener('click', e => { if (e.target === el) el.remove(); });
      document.body.appendChild(el);
    }
    el.style.display = 'flex';
  }

  function getCreateFormHTML(shipName) {
    const user = window.Auth?.getUser();
    if (!user) {
      // Mostrar modal centrado y devolver vacío para no romper el panel
      setTimeout(_showLoginModal, 0);
      return '';
    }

    return `
      <div class="bcreate-form">
        <div class="bcreate-section-lbl">Información de la build</div>
        <div class="bcreate-field">
          <label class="bcreate-label">Nombre de la build <span class="bcreate-req">*</span></label>
          <input class="bcreate-input" type="text" id="bcfBuildName"
                 placeholder="Ej: PvP agresivo, Exploración, Minería…" maxlength="60" autocomplete="off">
        </div>
        <div class="bcreate-field bcreate-field-full">
          <label class="bcreate-label">Descripción <span class="bcreate-opt">(opcional)</span></label>
          <textarea class="bcreate-input bcreate-ta" id="bcfDesc"
                    placeholder="Para qué está orientada esta build…" rows="2" maxlength="300"></textarea>
        </div>
        <div id="bcreateCompSlots">
          <div class="bcreate-loading">Cargando componentes del juego…</div>
        </div>
        <div class="bcreate-actions">
          <button class="bcreate-cancel" onclick="Comp.switchTab('ships')">Cancelar</button>
          <button class="bcreate-submit" data-ship="${esc(shipName)}" onclick="Builds.submitBuild(this.dataset.ship)">Publicar Build</button>
        </div>
      </div>`;
  }

  // ── Fill slots async after render ────────────────────
  async function fillCreateForm(shipName) {
    const container = document.getElementById('bcreateCompSlots');
    if (!container) return;
    await _loadCompDB();
    const shipData = _findShipData(shipName);
    container.innerHTML = _buildFormHTML(shipName, shipData);
    onCompChange();  // render initial stats panel with stock values
  }

  // ── Submit ───────────────────────────────────────────
  async function submitBuild(shipName) {
    const sb   = _getSb();
    const user = window.Auth?.getUser();
    if (!sb || !user) return;

    const buildName = (document.getElementById('bcfBuildName')?.value || '').trim();
    if (!buildName) { _toast('El nombre de la build es obligatorio'); return; }

    const desc = (document.getElementById('bcfDesc')?.value || '').trim();
    const components = {};

    // Read component dropdowns
    const baseTypes = ['PowerPlant', 'Cooler', 'Shield', 'QuantumDrive', 'Radar', 'TurretModule', 'MissileRack'];
    baseTypes.forEach(type => {
      const values = [];
      for (let i = 0; i < 10; i++) {
        const el = document.getElementById(`bcf_${type}_${i}`);
        if (!el) break;
        const v = el.value.trim();
        if (v) values.push(v);
      }
      if (values.length === 1) components[type] = values[0];
      else if (values.length > 1) components[type] = values;
    });

    // Weapon slots
    const weapons = [];
    for (let i = 0; i < 30; i++) {
      const el = document.getElementById(`bcf_Weapon_${i}`);
      if (!el) break;
      const v = el.value.trim();
      if (v) weapons.push(v);
    }
    // Weapon text fallback
    const wText = document.getElementById('bcf_weapons_text');
    if (wText) {
      wText.value.split('\n').map(w => w.trim()).filter(Boolean).forEach(w => weapons.push(w));
    }
    if (weapons.length) components['Weapon'] = weapons;

    const meta = user.user_metadata || {};
    const btn  = document.querySelector('.bcreate-submit');
    if (btn) { btn.disabled = true; btn.textContent = 'Publicando…'; }

    const { error } = await sb.from('ship_builds').insert({
      user_id:       user.id,
      author_name:   meta.full_name || meta.user_name || 'Miembro',
      author_avatar: meta.avatar_url || '',
      ship_name:     shipName,
      build_name:    buildName,
      description:   desc,
      components,
    });

    if (error) {
      _toast('Error al publicar: ' + error.message);
      if (btn) { btn.disabled = false; btn.textContent = 'Publicar Build'; }
      return;
    }

    _toast('¡Build publicada!');
    window.Comp?.switchTab('builds');
  }

  // ── BUILDS TAB: load all builds ──────────────────────
  let _loadToken = 0;  // cancela cargas obsoletas cuando el usuario navega

  async function loadAllBuilds(containerId, _retries = 0) {
    const myToken = ++_loadToken;                              // token único para esta carga
    const live    = () => document.getElementById(containerId); // siempre el elemento actual del DOM
    const stale   = () => myToken !== _loadToken;              // ¿hay una carga más reciente?

    const sb = _getSb();
    if (!sb) {
      // Supabase may still be initializing (CDN race) — retry up to 5×
      if (_retries < 5) {
        const el = live();
        if (el) el.innerHTML = '<div class="builds-loading">Conectando…</div>';
        setTimeout(() => { if (!stale() && live()) loadAllBuilds(containerId, _retries + 1); }, 300);
      } else {
        const el = live();
        if (el) el.innerHTML = '<div class="builds-error">No se pudo conectar con la base de datos.</div>';
      }
      return;
    }

    { const el = live(); if (el) el.innerHTML = '<div class="builds-loading">Cargando builds…</div>'; }

    const { data: builds, error } = await sb
      .from('ship_builds')
      .select('*')
      .order('created_at', { ascending: false });

    if (stale()) return;  // otra carga más reciente tomó el relevo

    if (error) {
      const el = live(); if (el) el.innerHTML = '<div class="builds-error">Error al cargar builds.</div>';
      return;
    }

    _allBuilds = builds || [];

    if (_allBuilds.length === 0) {
      const el = live();
      if (el) el.innerHTML = `
        <div class="builds-empty">
          <div style="font-size:2rem;margin-bottom:.7rem">⚙</div>
          No hay builds todavía.<br>
          <span style="font-size:.8rem;color:var(--text-muted)">Ve a la pestaña Naves y pulsa "Crear Build" en cualquier nave.</span>
        </div>`;
      return;
    }

    const buildIds = _allBuilds.map(b => b.id);
    const { data: allVotes } = await sb
      .from('ship_build_votes')
      .select('build_id,stars')
      .in('build_id', buildIds);

    if (stale()) return;

    const voteMap = {};
    (allVotes || []).forEach(v => {
      if (!voteMap[v.build_id]) voteMap[v.build_id] = { total: 0, count: 0 };
      voteMap[v.build_id].total += v.stars;
      voteMap[v.build_id].count++;
    });
    _allBuilds.forEach(b => {
      const vm = voteMap[b.id] || { total: 0, count: 0 };
      b._votes_count = vm.count;
      b._avg_stars   = vm.count > 0 ? vm.total / vm.count : 0;
    });
    _allBuilds.sort((a, b) =>
      (b._avg_stars * Math.log(b._votes_count + 2)) -
      (a._avg_stars * Math.log(a._votes_count + 2))
    );

    const user = window.Auth?.getUser();
    _userVotes = {};
    if (user && buildIds.length > 0) {
      const { data: myVotes } = await sb
        .from('ship_build_votes')
        .select('build_id,stars')
        .eq('user_id', user.id)
        .in('build_id', buildIds);
      if (!stale()) (myVotes || []).forEach(v => { _userVotes[v.build_id] = v.stars; });
    }

    if (stale()) return;

    const el = live();
    if (el) el.innerHTML = _allBuilds.map((b, i) => _buildCard(b, user, i)).join('');
  }

  function _buildCard(build, user, rank) {
    const comps   = build.components || {};
    const myVote  = _userVotes[build.id] || 0;
    const avg     = build._avg_stars || 0;
    const cnt     = build._votes_count || 0;
    const isOwner = user && user.id === build.user_id;

    const starsHtml = [1, 2, 3, 4, 5].map(s => `
      <button class="build-star-btn${myVote >= s ? ' lit' : ''}"
              onclick="Builds.vote('${build.id}',${s},'buildsTabList')"
              ${!user ? 'disabled' : ''}
              title="${s} estrella${s > 1 ? 's' : ''}">★</button>`).join('');

    // Format components
    const compRows = [];
    const typeOrder = ['PowerPlant','Shield','Cooler','QuantumDrive','Radar','Weapon','TurretModule','MissileRack'];
    typeOrder.forEach(type => {
      const meta = SLOT_LABELS[type];
      const val = comps[type];
      if (!val) return;
      if (Array.isArray(val)) {
        val.forEach((v, i) => {
          if (v) compRows.push(`
            <div class="btab-comp-row">
              <span class="btab-comp-lbl">${meta.icon} ${meta.label} ${val.length > 1 ? i+1 : ''}</span>
              <span class="btab-comp-val">${esc(v)}</span>
            </div>`);
        });
      } else {
        compRows.push(`
          <div class="btab-comp-row">
            <span class="btab-comp-lbl">${meta.icon} ${meta.label}</span>
            <span class="btab-comp-val">${esc(val)}</span>
          </div>`);
      }
    });

    const avgTxt = cnt > 0
      ? `${avg.toFixed(1)}★ <span class="btab-vote-cnt">(${cnt} voto${cnt !== 1 ? 's' : ''})</span>`
      : '<span class="btab-no-votes">Sin votos aún</span>';

    const loginMsg = `<span class="btab-login-note">${DC_SVG} Inicia sesión para votar</span>`;

    return `
      <div class="btab-build-card">
        <div class="btab-card-top">
          <span class="btab-rank">#${rank + 1}</span>
          <div class="btab-ship-badge">${esc(build.ship_name)}</div>
          <div class="btab-build-name">${esc(build.build_name)}</div>
          <div class="btab-author">
            ${build.author_avatar ? `<img src="${esc(build.author_avatar)}" class="btab-avatar" loading="lazy" alt="">` : ''}
            <span>${esc(build.author_name)}</span>
          </div>
          ${isOwner ? `<button class="btab-delete-btn" onclick="Builds.deleteBuild('${build.id}','buildsTabList')" title="Eliminar build">✕</button>` : ''}
        </div>
        ${build.description ? `<div class="btab-desc">${esc(build.description)}</div>` : ''}
        ${compRows.length ? `<div class="btab-comps">${compRows.join('')}</div>` : ''}
        <div class="btab-vote-row">
          <div class="btab-avg">${avgTxt}</div>
          ${user
            ? `<div class="btab-stars-wrap">
                 <div class="build-stars">${starsHtml}</div>
                 ${myVote ? `<button class="build-unvote" onclick="Builds.vote('${build.id}',0,'buildsTabList')">Quitar voto</button>` : ''}
               </div>`
            : loginMsg}
        </div>
      </div>`;
  }

  // ── Vote ─────────────────────────────────────────────
  async function vote(buildId, stars, containerId) {
    const sb   = _getSb();
    const user = window.Auth?.getUser();
    if (!user) { _toast('Inicia sesión con Discord para votar'); return; }
    if (!sb) return;

    if (stars === 0) {
      await sb.from('ship_build_votes').delete().eq('user_id', user.id).eq('build_id', buildId);
      delete _userVotes[buildId];
    } else {
      await sb.from('ship_build_votes').upsert(
        { user_id: user.id, build_id: buildId, stars },
        { onConflict: 'user_id,build_id' }
      );
      _userVotes[buildId] = stars;
    }
    await loadAllBuilds(containerId);
  }

  // ── Delete ───────────────────────────────────────────
  async function deleteBuild(buildId, containerId) {
    if (!confirm('¿Eliminar esta build?')) return;
    const sb = _getSb();
    const user = window.Auth?.getUser();
    if (!sb || !user) return;
    await sb.from('ship_build_votes').delete().eq('build_id', buildId);
    const { error } = await sb.from('ship_builds').delete()
      .eq('id', buildId).eq('user_id', user.id);
    if (error) { _toast('Error al eliminar'); return; }
    await loadAllBuilds(containerId);
  }

  // ── Helpers ──────────────────────────────────────────
  function esc(s) {
    return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function _toast(msg) {
    let el = document.getElementById('buildsToast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'buildsToast';
      el.style.cssText = [
        'position:fixed','bottom:1.5rem','left:50%','transform:translateX(-50%)',
        'z-index:10000','padding:.5rem 1.4rem','border-radius:8px',
        'font-size:.85rem','font-family:monospace','font-weight:700',
        'background:rgba(245,158,11,.96)','color:#1c1917',
        'pointer-events:none','transition:opacity .4s',
        'box-shadow:0 4px 20px rgba(0,0,0,.4)'
      ].join(';');
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.style.opacity = '1';
    clearTimeout(el._t);
    el._t = setTimeout(() => { el.style.opacity = '0'; }, 2800);
  }

  // ── Search / filter ──────────────────────────────────
  function filterBuilds(query) {
    const q = (query || '').toLowerCase().trim();
    const clearBtn = document.getElementById('buildsSearchClear');
    if (clearBtn) clearBtn.style.display = q ? 'flex' : 'none';

    const container = document.getElementById('buildsTabList');
    if (!container || !_allBuilds.length) return;

    const user = window.Auth?.getUser();
    const filtered = q
      ? _allBuilds.filter(b =>
          b.ship_name?.toLowerCase().includes(q) ||
          b.author_name?.toLowerCase().includes(q) ||
          b.build_name?.toLowerCase().includes(q))
      : _allBuilds;

    if (!filtered.length) {
      container.innerHTML = `<div class="builds-empty">No se encontraron builds para "<strong>${esc(query)}</strong>".</div>`;
      return;
    }
    container.innerHTML = filtered.map((b, i) => _buildCard(b, user, i)).join('');
  }

  function clearSearch() {
    const input = document.getElementById('buildsSearch');
    if (input) { input.value = ''; input.focus(); }
    filterBuilds('');
  }

  return { loadAllBuilds, getCreateFormHTML, fillCreateForm, submitBuild, vote, deleteBuild, onCompChange, filterBuilds, clearSearch };

})();
