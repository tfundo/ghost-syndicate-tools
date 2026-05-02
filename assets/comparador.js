/* ===================================================
   GHOST SYNDICATE TOOLS — Ship & Weapon Comparator
   Star Citizen Companion — SC 4.8.0
   Namespace: Comp
   =================================================== */

'use strict';

(function (global) {

  // ============================================================
  // DATA
  // ============================================================

  // Ships loaded dynamically from data/ships.json
  // Updated each patch by running: python extract_ship_data.py
  let SHIPS = [];

  // Weapons loaded dynamically from data/weapons.json
  // Updated each patch by running: python extract_weapon_data.py
  let WEAPONS = [];

  // ============================================================
  // STATE
  // ============================================================

  const compState = {
    tab: 'ships',
    searchShips: '',
    searchWeapons: '',
    filterRole: '',
    filterMfr: '',
    filterSize: '',
    filterType: '',
    filterSizeWeapon: '',
    sortShips: 'name',
    sortWeapons: 'dps',
    selected: [],  // [{type:'ship'|'weapon', name:string}]
    shipImages: {},
    _imagesLoaded: false,
    _shipsLoaded: false,
    _weaponsLoaded: false,
    createBuildShip: null,
  };

  // ============================================================
  // HELPERS
  // ============================================================

  function escComp(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function isSelected(type, name) {
    return compState.selected.some(s => s.type === type && s.name === name);
  }

  function getShip(name) { return SHIPS.find(s => s.name === name); }

  function getWeapon(name) { return WEAPONS.find(w => w.name === name || w.entity === name); }

  function fmtNum(n) {
    if (n === 0) return '—';
    if (n >= 1000) return n.toLocaleString('es');
    return String(n);
  }

  function showToast(msg) {
    let toast = document.getElementById('comp-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'comp-toast';
      toast.style.cssText = [
        'position:fixed',
        'bottom:2rem',
        'left:50%',
        'transform:translateX(-50%)',
        'background:rgba(12,10,9,0.97)',
        'border:1px solid rgba(245,158,11,0.6)',
        'color:#fef3c7',
        'font-family:\'Rajdhani\',sans-serif',
        'font-size:0.95rem',
        'padding:0.7rem 1.5rem',
        'border-radius:4px',
        'z-index:5000',
        'box-shadow:0 4px 20px rgba(0,0,0,0.6),0 0 12px rgba(245,158,11,0.15)',
        'pointer-events:none',
        'transition:opacity 0.3s ease'
      ].join(';');
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.style.opacity = '1';
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => { toast.style.opacity = '0'; }, 2500);
  }

  // ============================================================
  // TAB SWITCHING
  // ============================================================

  function switchTab(tab, shipName) {
    if (tab === 'create-build' && shipName) compState.createBuildShip = shipName;
    compState.tab = tab;
    render();
    if (tab === 'builds') {
      // loadAllBuilds is idempotent (_isLoading flag prevents duplicate fetches)
      window.Builds?.loadAllBuilds('buildsTabList');
    }
    document.getElementById('compContentArea')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function openCreateBuild(shipName) {
    const user = window.Auth?.getUser();
    if (!user) {
      showToast('Inicia sesión con Discord para crear una build');
      return;
    }
    compState.createBuildShip = shipName;
    compState.tab = 'create-build';
    render();
    document.getElementById('compContentArea')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ============================================================
  // SELECTION
  // ============================================================

  function toggleSelect(type, name) {
    const idx = compState.selected.findIndex(s => s.type === type && s.name === name);
    if (idx !== -1) {
      compState.selected.splice(idx, 1);
    } else {
      if (compState.selected.length >= 4) {
        showToast('Máximo 4 elementos para comparar');
        return;
      }
      compState.selected.push({ type, name });
    }
    render();
  }

  function clearSelection() {
    compState.selected = [];
    render();
  }

  // ============================================================
  // MAIN RENDER DISPATCHER
  // ============================================================

  function render() {
    const root = document.getElementById('compContentArea');
    if (!root) return;

    const focusId  = document.activeElement?.id;
    const selStart = document.activeElement?.selectionStart;
    const selEnd   = document.activeElement?.selectionEnd;

    root.innerHTML = buildLayout();
    attachEventListeners();
    updateFloatingBtn();

    // Restore builds after DOM rebuild (clearSelection, JSON loads, etc.)
    if (compState.tab === 'builds') {
      const listEl = document.getElementById('buildsTabList');
      if (listEl) {
        if (window.Builds?.hasBuilds()) {
          // Cache available → render immediately
          window.Builds.filterBuilds('');
        } else if (!listEl.innerHTML.trim()) {
          // No cache and container is empty → trigger a fresh load
          window.Builds?.loadAllBuilds('buildsTabList');
        }
        // If container already has content (spinner or error from active load) → leave it alone
      }
    }

    if (focusId) {
      const el = document.getElementById(focusId);
      if (el && root.contains(el)) {
        el.focus();
        try { el.setSelectionRange(selStart, selEnd); } catch (_) {}
      }
    }
  }

  function updateFloatingBtn() {
    let fab = document.getElementById('comp-fab');
    const count = compState.selected.length;

    if (count === 0) {
      if (fab) fab.style.opacity = '0';
      return;
    }

    if (!fab) {
      fab = document.createElement('button');
      fab.id = 'comp-fab';
      fab.style.cssText = [
        'position:fixed',
        'bottom:1.8rem',
        'right:1.8rem',
        'z-index:4000',
        'display:flex',
        'align-items:center',
        'gap:0.5rem',
        'padding:0.8rem 1.4rem',
        'background:var(--accent)',
        'color:#0c0a09',
        'font-family:var(--font-hud)',
        'font-size:0.82rem',
        'font-weight:700',
        'letter-spacing:0.1em',
        'text-transform:uppercase',
        'border:none',
        'border-radius:4px',
        'cursor:pointer',
        'box-shadow:0 4px 20px rgba(245,158,11,0.5),0 0 40px rgba(245,158,11,0.2)',
        'transition:all 0.25s ease',
        'white-space:nowrap',
      ].join(';');
      fab.addEventListener('click', () => {
        compState.tab = 'compare';
        render();
        document.querySelector('#compContentArea').scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      fab.addEventListener('mouseenter', () => {
        fab.style.background = 'var(--accent-light)';
        fab.style.transform = 'translateY(-2px)';
        fab.style.boxShadow = '0 6px 28px rgba(245,158,11,0.65),0 0 50px rgba(245,158,11,0.25)';
      });
      fab.addEventListener('mouseleave', () => {
        fab.style.background = 'var(--accent)';
        fab.style.transform = '';
        fab.style.boxShadow = '0 4px 20px rgba(245,158,11,0.5),0 0 40px rgba(245,158,11,0.2)';
      });
      document.body.appendChild(fab);
    }

    fab.innerHTML = `⚖ Comparar <span style="background:#0c0a09;color:var(--accent);border-radius:50%;width:1.3rem;height:1.3rem;display:inline-flex;align-items:center;justify-content:center;font-size:0.72rem;font-weight:900;">${count}</span>`;
    fab.style.opacity = '1';
    fab.style.pointerEvents = 'auto';
  }

  // Remove FAB when leaving comparador
  function destroyFloatingBtn() {
    const fab = document.getElementById('comp-fab');
    if (fab) fab.remove();
  }

  // ============================================================
  // LAYOUT SHELL
  // ============================================================

  function buildLayout() {
    const selCount = compState.selected.length;
    const tabShips   = compState.tab === 'ships'        ? 'comp-tab-btn active' : 'comp-tab-btn';
    const tabWeapons = compState.tab === 'weapons'      ? 'comp-tab-btn active' : 'comp-tab-btn';
    const tabCompare = compState.tab === 'compare'      ? 'comp-tab-btn active' : 'comp-tab-btn';
    const tabBuilds  = (compState.tab === 'builds' || compState.tab === 'create-build')
                       ? 'comp-tab-btn comp-tab-builds active' : 'comp-tab-btn comp-tab-builds';

    const badge = selCount > 0
      ? `<span class="comp-sel-badge">${selCount}</span>`
      : '';

    const selectionBar = selCount > 0 ? buildSelectionBar() : '';

    let content = '';
    if (compState.tab === 'ships')         content = buildShipsPane();
    if (compState.tab === 'weapons')       content = buildWeaponsPane();
    if (compState.tab === 'compare')       content = buildComparePane();
    if (compState.tab === 'builds')        content = buildBuildsPane();
    if (compState.tab === 'create-build')  content = buildCreateBuildPane(compState.createBuildShip);

    return `
      <div class="page-header">
        <h1 class="page-title">◈ Comparador</h1>
        <p class="page-subtitle">Naves y armas · SC 4.7.2</p>
      </div>

      <div class="comp-tabs">
        <button class="${tabShips}"    onclick="Comp.switchTab('ships')">Naves</button>
        <button class="${tabWeapons}"  onclick="Comp.switchTab('weapons')">Armas</button>
        <button class="${tabCompare}"  onclick="Comp.switchTab('compare')">
          Comparar ${badge}
        </button>
        <button class="${tabBuilds}"   onclick="Comp.switchTab('builds')">★ BUILDS</button>
        ${selCount > 0 ? `<button class="comp-clear-btn" onclick="Comp.clearSelection()" title="Limpiar selección">✕ Limpiar</button>` : ''}
      </div>

      ${selectionBar}
      ${content}
    `;
  }

  function buildBuildsPane() {
    return `
      <div class="btab-pane">
        <div class="btab-wip-banner">
          <span class="btab-wip-icon">🚧</span>
          <span>Este módulo está en desarrollo y puede contener errores. Agradecemos tu paciencia.</span>
        </div>
        <div class="btab-topbar">
          <p class="btab-intro">Builds de la comunidad · vota las que más te gusten (1–5 ★)</p>
          <button class="btab-go-ships" onclick="Comp.switchTab('ships')">← Ir a Naves</button>
        </div>
        <div class="btab-search-bar">
          <div class="btab-search-wrap">
            <span class="btab-search-icon">⌕</span>
            <input class="btab-search-input" id="buildsSearch" type="text"
              placeholder="Buscar por nave o usuario…"
              oninput="Builds.filterBuilds(this.value)">
            <button class="btab-search-clear" id="buildsSearchClear"
              onclick="Builds.clearSearch()" title="Limpiar">✕</button>
          </div>
        </div>
        <div id="buildsTabList" class="btab-list"></div>
      </div>`;
  }

  function buildCreateBuildPane(shipName) {
    if (!shipName) {
      compState.tab = 'ships';
      return buildShipsPane();
    }
    return `
      <div class="bcreate-pane">
        <div class="btab-wip-banner">
          <span class="btab-wip-icon">🚧</span>
          <span>Este módulo está en desarrollo y puede contener errores. Agradecemos tu paciencia.</span>
        </div>
        <div class="bcreate-pane-header">
          <button class="bcreate-back" onclick="Comp.switchTab('ships')">← Volver a Naves</button>
          <div class="bcreate-pane-title">
            <span class="bcreate-pane-icon">⚙</span>
            Crear Build · <span class="bcreate-ship-name">${escComp(shipName)}</span>
          </div>
        </div>
        ${window.Builds?.getCreateFormHTML(shipName) || '<div class="builds-error">Error al cargar el formulario.</div>'}
      </div>`;
  }

  // ============================================================
  // SELECTION BAR (chips of selected items)
  // ============================================================

  function buildSelectionBar() {
    const chips = compState.selected.map(s => {
      const label = escComp(s.name);
      const typeLabel = s.type === 'ship' ? 'Nave' : 'Arma';
      return `<div class="comp-chip">
        <span class="comp-chip-type">${typeLabel}</span>
        <span class="comp-chip-name">${label}</span>
        <button class="comp-chip-remove"
          onclick="Comp.toggleSelect('${escComp(s.type)}','${escComp(s.name).replace(/'/g,"\\'")}')"
          title="Quitar">✕</button>
      </div>`;
    }).join('');

    return `<div class="comp-selection-bar">${chips}</div>`;
  }

  // ============================================================
  // SHIPS PANE
  // ============================================================

  function buildShipsPane() {
    const roles  = [...new Set(SHIPS.map(s => s.role))].sort();
    const mfrs   = [...new Set(SHIPS.map(s => s.mfr))].sort();
    const sizes  = ['Small','Snub','Medium','Large','Capital','Ground'];

    const roleOpts = roles.map(r =>
      `<option value="${escComp(r)}" ${compState.filterRole === r ? 'selected' : ''}>${escComp(r)}</option>`
    ).join('');
    const mfrOpts = mfrs.map(m =>
      `<option value="${escComp(m)}" ${compState.filterMfr === m ? 'selected' : ''}>${escComp(m)}</option>`
    ).join('');
    const sizeOpts = sizes.map(sz =>
      `<option value="${sz}" ${compState.filterSize === sz ? 'selected' : ''}>${sz}</option>`
    ).join('');

    const SHIP_SORT_OPTS = [
      ['name','Nombre'],['scm','SCM'],['nav','NAV'],['hp','HP Blindaje'],
      ['cargo','Cargo'],['crew','Tripulación'],
    ];
    const sortOpts = SHIP_SORT_OPTS.map(([v,l]) =>
      `<option value="${v}" ${compState.sortShips === v ? 'selected' : ''}>${l}</option>`
    ).join('');

    let ships = SHIPS.filter(s => {
      const q = compState.searchShips.toLowerCase();
      if (q && !s.name.toLowerCase().includes(q) && !s.mfr.toLowerCase().includes(q) && !s.role.toLowerCase().includes(q)) return false;
      if (compState.filterRole && s.role !== compState.filterRole) return false;
      if (compState.filterMfr  && s.mfr  !== compState.filterMfr)  return false;
      if (compState.filterSize && s.size !== compState.filterSize)  return false;
      return true;
    });

    const sk = compState.sortShips;
    if (sk === 'name') ships.sort((a, b) => a.name.localeCompare(b.name));
    else ships.sort((a, b) => (b[sk] || 0) - (a[sk] || 0));

    const cards = ships.map(s => buildShipCard(s)).join('');
    const empty = ships.length === 0
      ? `<div class="comp-empty"><div class="comp-empty-icon">◈</div><p>Sin resultados para este filtro</p></div>`
      : '';

    return `
      <div class="controls-bar">
        <div class="search-box">
          <span class="search-icon">&#128269;</span>
          <input type="text" id="compSearchShips" class="comp-search-input"
            placeholder="Buscar nave, fabricante o rol..."
            value="${escComp(compState.searchShips)}" autocomplete="off" />
          ${compState.searchShips ? `<button class="search-clear visible" id="compClearShips" onclick="Comp._clearSearchShips()">✕</button>` : ''}
        </div>
        <div class="filters">
          <select class="filter-select" id="compRoleFilter">
            <option value="">Todos los roles</option>
            ${roleOpts}
          </select>
          <select class="filter-select" id="compMfrFilter">
            <option value="">Todos los fabricantes</option>
            ${mfrOpts}
          </select>
          <select class="filter-select" id="compSizeFilter">
            <option value="">Todos los tamaños</option>
            ${sizeOpts}
          </select>
          <select class="filter-select" id="compSortShips">
            ${sortOpts}
          </select>
        </div>
      </div>
      <div class="comp-results-bar">
        <span class="comp-count">${ships.length} nave${ships.length !== 1 ? 's' : ''}</span>
        <span class="comp-hint">Selecciona hasta 4 para comparar</span>
      </div>
      <div class="comp-grid">
        ${cards}
        ${empty}
      </div>
    `;
  }

  function buildShipCard(ship) {
    const sel = isSelected('ship', ship.name);
    const selClass = sel ? ' comp-selected' : '';
    const nameEncoded = escComp(ship.name).replace(/'/g, "\\'");

    const sizeColor = {
      'Small':   '#10b981',
      'Medium':  '#3b82f6',
      'Large':   '#f59e0b',
      'Capital': '#ef4444',
      'Snub':    '#8b5cf6',
      'Ground':  '#6b7280'
    }[ship.size] || '#a88b4a';

    const roleColor = getRoleColor(ship.role);
    const mfrColor  = MFR_COLOR[ship.mfr] || '#8a7048';

    const imgUrl = compState.shipImages && compState.shipImages[ship.name];
    const bannerHtml = imgUrl
      ? `<div class="comp-ship-banner">
          <img src="${escComp(imgUrl)}" alt="${escComp(ship.name)}" loading="lazy"
               onerror="this.parentElement.style.background='linear-gradient(135deg,${mfrColor}15 0%,transparent 80%)';this.remove()">
        </div>`
      : `<div class="comp-ship-banner comp-banner-placeholder"
             style="background:linear-gradient(135deg,${mfrColor}15 0%,transparent 80%)">
          <span class="comp-banner-mfr" style="color:${mfrColor}">${escComp(ship.mfr)}</span>
        </div>`;

    const buildsBtn = `<button class="ship-builds-btn"
      onclick="event.stopPropagation();Comp.openCreateBuild('${nameEncoded}')"
      title="Crear una build para esta nave">✏ Crear Build</button>`;

    return `
      <div class="bp-card comp-card${selClass}"
           onclick="Comp.toggleSelect('ship','${nameEncoded}')"
           title="${sel ? 'Quitar de comparación' : 'Añadir a comparación'}">
        ${bannerHtml}
        ${sel ? '<div class="comp-selected-mark">&#10003;</div>' : ''}
        <div class="comp-card-header">
          <div class="comp-ship-name">${escComp(ship.name)}</div>
          <div class="comp-mfr">${escComp(ship.mfr)}</div>
        </div>
        <div class="comp-badges">
          <span class="comp-badge comp-badge-role" style="background:${roleColor}18;border-color:${roleColor};color:${roleColor}">${escComp(ship.role)}</span>
          <span class="comp-badge comp-badge-size" style="background:${sizeColor}18;border-color:${sizeColor};color:${sizeColor}">${escComp(ship.size)}</span>
        </div>
        <div class="comp-stats-row">
          <div class="comp-stat">
            <span class="comp-stat-label">SCM</span>
            <span class="comp-stat-val">${ship.scm} <span class="comp-stat-unit">m/s</span></span>
          </div>
          <div class="comp-stat">
            <span class="comp-stat-label">NAV</span>
            <span class="comp-stat-val">${fmtNum(ship.nav)} <span class="comp-stat-unit">m/s</span></span>
          </div>
          <div class="comp-stat">
            <span class="comp-stat-label">HP</span>
            <span class="comp-stat-val">${fmtNum(ship.hp)}</span>
          </div>
          <div class="comp-stat">
            <span class="comp-stat-label">Cargo</span>
            <span class="comp-stat-val">${ship.cargo > 0 ? ship.cargo + ' <span class="comp-stat-unit">SCU</span>' : '—'}</span>
          </div>
          <div class="comp-stat">
            <span class="comp-stat-label">Trip.</span>
            <span class="comp-stat-val">${ship.minCrew > 0 && ship.minCrew < ship.crew ? ship.minCrew + '-' + ship.crew : ship.crew}</span>
          </div>
          <div class="comp-stat">
            <span class="comp-stat-label">Long.</span>
            <span class="comp-stat-val">${ship.length > 0 ? ship.length + ' <span class="comp-stat-unit">m</span>' : '—'}</span>
          </div>
        </div>
        ${buildsBtn}
      </div>
    `;
  }

  // ============================================================
  // WEAPONS PANE
  // ============================================================

  function buildWeaponsPane() {
    const types = [...new Set(WEAPONS.map(w => w.type))].sort();
    const sizes = [...new Set(WEAPONS.map(w => w.size))].sort((a,b) => a-b);

    const typeOpts = types.map(t =>
      `<option value="${escComp(t)}" ${compState.filterType === t ? 'selected' : ''}>${escComp(t)}</option>`
    ).join('');
    const sizeWOpts = sizes.map(s =>
      `<option value="${s}" ${compState.filterSizeWeapon == s ? 'selected' : ''}>S${s}</option>`
    ).join('');

    const WPN_SORT_OPTS = [
      ['dps','DPS'],['alpha','Alpha'],['range','Alcance'],
      ['speed','Vel. Proyectil'],['fireRate','Cadencia'],['name','Nombre'],['size','Tamaño'],
    ];
    const sortWOpts = WPN_SORT_OPTS.map(([v,l]) =>
      `<option value="${v}" ${compState.sortWeapons === v ? 'selected' : ''}>${l}</option>`
    ).join('');

    let weapons = WEAPONS.filter(w => {
      const q = compState.searchWeapons.toLowerCase();
      if (q && !w.name.toLowerCase().includes(q) && !w.type.toLowerCase().includes(q)) return false;
      if (compState.filterType && w.type !== compState.filterType) return false;
      if (compState.filterSizeWeapon !== '' && w.size != compState.filterSizeWeapon) return false;
      return true;
    });

    const sw = compState.sortWeapons;
    if (sw === 'name') weapons.sort((a, b) => a.name.localeCompare(b.name));
    else weapons.sort((a, b) => (b[sw] || 0) - (a[sw] || 0));

    const cards = weapons.map(w => buildWeaponCard(w)).join('');
    const empty = weapons.length === 0
      ? `<div class="comp-empty"><div class="comp-empty-icon">◈</div><p>Sin resultados para este filtro</p></div>`
      : '';

    return `
      <div class="controls-bar">
        <div class="search-box">
          <span class="search-icon">&#128269;</span>
          <input type="text" id="compSearchWeapons" class="comp-search-input"
            placeholder="Buscar arma o tipo..."
            value="${escComp(compState.searchWeapons)}" autocomplete="off" />
          ${compState.searchWeapons ? `<button class="search-clear visible" id="compClearWeapons" onclick="Comp._clearSearchWeapons()">✕</button>` : ''}
        </div>
        <div class="filters">
          <select class="filter-select" id="compTypeFilter">
            <option value="">Todos los tipos</option>
            ${typeOpts}
          </select>
          <select class="filter-select" id="compSizeWeaponFilter">
            <option value="">Todos los tamaños</option>
            ${sizeWOpts}
          </select>
          <select class="filter-select" id="compSortWeapons">
            ${sortWOpts}
          </select>
        </div>
      </div>
      <div class="comp-results-bar">
        <span class="comp-count">${weapons.length} arma${weapons.length !== 1 ? 's' : ''}</span>
        <span class="comp-hint">Selecciona hasta 4 para comparar</span>
      </div>
      <div class="comp-grid">
        ${cards}
        ${empty}
      </div>
    `;
  }

  function buildWeaponCard(weapon) {
    const sel = isSelected('weapon', weapon.name);
    const selClass = sel ? ' comp-selected' : '';
    const nameEncoded = escComp(weapon.name).replace(/'/g, "\\'");

    const typeColor = getWeaponTypeColor(weapon.type);
    const sizeDots = '●'.repeat(Math.min(weapon.size, 6)) + '○'.repeat(Math.max(0, 6 - weapon.size));

    return `
      <div class="bp-card comp-card comp-weapon-card${selClass}"
           onclick="Comp.toggleSelect('weapon','${nameEncoded}')"
           title="${sel ? 'Quitar de comparación' : 'Añadir a comparación'}">
        ${sel ? '<div class="comp-selected-mark">&#10003;</div>' : ''}
        <div class="comp-card-header">
          <div class="comp-ship-name">${escComp(weapon.name)}</div>
          <div class="comp-mfr comp-weapon-size" title="Tamaño ${weapon.size}">${sizeDots}</div>
        </div>
        <div class="comp-badges">
          <span class="comp-badge" style="background:${typeColor}18;border-color:${typeColor};color:${typeColor}">${escComp(weapon.type)}</span>
          <span class="comp-badge comp-badge-size" style="color:var(--text-dim);border-color:var(--border)">S${weapon.size}</span>
        </div>
        <div class="comp-stats-row">
          <div class="comp-stat">
            <span class="comp-stat-label">DPS</span>
            <span class="comp-stat-val">${fmtNum(Math.round(weapon.dps))}</span>
          </div>
          <div class="comp-stat">
            <span class="comp-stat-label">Alpha</span>
            <span class="comp-stat-val">${fmtNum(Math.round(weapon.alpha))}</span>
          </div>
          <div class="comp-stat">
            <span class="comp-stat-label">Alcance</span>
            <span class="comp-stat-val">${fmtNum(weapon.range)} <span class="comp-stat-unit">m</span></span>
          </div>
          <div class="comp-stat">
            <span class="comp-stat-label">Cad.</span>
            <span class="comp-stat-val">${fmtNum(weapon.fireRate)} <span class="comp-stat-unit">rpm</span></span>
          </div>
          <div class="comp-stat">
            <span class="comp-stat-label">Vel. Proy.</span>
            <span class="comp-stat-val">${fmtNum(weapon.speed)} <span class="comp-stat-unit">m/s</span></span>
          </div>
        </div>
      </div>
    `;
  }

  // ============================================================
  // COMPARE PANE
  // ============================================================

  function buildComparePane() {
    if (compState.selected.length === 0) {
      return `
        <div class="comp-empty comp-empty-compare">
          <div class="comp-empty-icon">◈</div>
          <p class="comp-empty-title">Sin elementos seleccionados</p>
          <p class="comp-empty-sub">Selecciona hasta 4 naves o armas para comparar</p>
          <div class="comp-empty-actions">
            <button class="btn-primary" onclick="Comp.switchTab('ships')">Ver Naves</button>
            <button class="btn-ghost"  onclick="Comp.switchTab('weapons')">Ver Armas</button>
          </div>
        </div>
      `;
    }

    // Resolve items
    const items = compState.selected.map(s => {
      if (s.type === 'ship')   return { type: 'ship',   data: getShip(s.name) };
      if (s.type === 'weapon') return { type: 'weapon', data: getWeapon(s.name) };
      return null;
    }).filter(Boolean);

    // Separate ships and weapons for per-category maxima
    const ships   = items.filter(i => i.type === 'ship').map(i => i.data);
    const weapons = items.filter(i => i.type === 'weapon').map(i => i.data);

    // Compute maxima across ALL selected items of same type
    const shipMaxima   = computeMaxima(ships,   SHIP_STAT_KEYS);
    const weaponMaxima = computeMaxima(weapons, WEAPON_STAT_KEYS);

    const cards = items.map(item => {
      if (item.type === 'ship')   return buildCompareShipCard(item.data, shipMaxima);
      if (item.type === 'weapon') return buildCompareWeaponCard(item.data, weaponMaxima);
      return '';
    }).join('');

    const cols = Math.min(items.length, 4);

    return `
      <div class="comp-compare-area" style="--comp-cols:${cols}">
        ${cards}
      </div>
    `;
  }

  const SHIP_STAT_KEYS   = ['scm','nav','pitch','yaw','roll','hp','shields','crew','minCrew','cargo','mass','length','beam','height','weapons','missiles'];
  const WEAPON_STAT_KEYS = ['dps','alpha','fireRate','range','speed','physical','energy','distortion','heatPerShot'];

  function computeMaxima(items, keys) {
    const maxima = {};
    keys.forEach(k => {
      maxima[k] = Math.max(...items.map(i => i[k] || 0), 1);
    });
    return maxima;
  }

  function buildCompareShipCard(ship, maxima) {
    const sizeColor = {
      'Small':   '#10b981',
      'Medium':  '#3b82f6',
      'Large':   '#f59e0b',
      'Capital': '#ef4444',
      'Snub':    '#8b5cf6',
      'Ground':  '#6b7280'
    }[ship.size] || '#a88b4a';

    const roleColor = getRoleColor(ship.role);
    const mfrColor  = MFR_COLOR[ship.mfr] || '#8a7048';

    const imgUrl = compState.shipImages && compState.shipImages[ship.name];
    const cmpBannerHtml = imgUrl
      ? `<div class="comp-cmp-banner">
          <img src="${escComp(imgUrl)}" alt="${escComp(ship.name)}" loading="lazy"
               onerror="this.parentElement.style.background='linear-gradient(135deg,${mfrColor}18 0%,transparent 80%)';this.remove()">
        </div>`
      : `<div class="comp-cmp-banner comp-banner-placeholder"
             style="background:linear-gradient(135deg,${mfrColor}18 0%,transparent 80%)">
          <span class="comp-banner-mfr" style="color:${mfrColor}">${escComp(ship.mfr)}</span>
        </div>`;

    const stats = [
      { label: 'SCM Speed',    key: 'scm',     unit: 'm/s', higher: true },
      { label: 'NAV Speed',    key: 'nav',     unit: 'm/s', higher: true },
      { label: 'Pitch (°/s)', key: 'pitch',   unit: '°/s', higher: true },
      { label: 'Yaw (°/s)',   key: 'yaw',     unit: '°/s', higher: true },
      { label: 'Roll (°/s)',  key: 'roll',    unit: '°/s', higher: true },
      { label: 'Blindaje HP',  key: 'hp',      unit: '',    higher: true },
      { label: 'Escudos',      key: 'shields', unit: '',    higher: true },
      { label: 'Trip. máx.',   key: 'crew',    unit: '',    higher: true },
      { label: 'Trip. mín.',   key: 'minCrew', unit: '',    higher: false },
      { label: 'Cargo',        key: 'cargo',   unit: 'SCU', higher: true },
      { label: 'Armas slots',  key: 'weapons', unit: '',    higher: true },
      { label: 'Misiles slots',key: 'missiles',unit: '',    higher: true },
      { label: 'Masa',         key: 'mass',    unit: 'kg',  higher: false },
      { label: 'Longitud',     key: 'length',  unit: 'm',   higher: false },
      { label: 'Anchura',      key: 'beam',    unit: 'm',   higher: false },
      { label: 'Altura',       key: 'height',  unit: 'm',   higher: false },
    ];

    const rows = stats.map(s => buildStatRow(ship[s.key], maxima[s.key], s.label, s.unit, s.higher)).join('');

    return `
      <div class="comp-compare-card">
        ${cmpBannerHtml}
        <div class="comp-cmp-header">
          <div class="comp-cmp-name">${escComp(ship.name)}</div>
          <div class="comp-cmp-sub">${escComp(ship.mfr)}</div>
          <div class="comp-cmp-badges">
            <span class="comp-badge" style="background:${roleColor}18;border-color:${roleColor};color:${roleColor}">${escComp(ship.role)}</span>
            <span class="comp-badge" style="background:${sizeColor}18;border-color:${sizeColor};color:${sizeColor}">${escComp(ship.size)}</span>
          </div>
        </div>
        <div class="comp-cmp-stats">
          ${rows}
        </div>
        <button class="comp-cmp-remove"
          onclick="Comp.toggleSelect('ship','${escComp(ship.name).replace(/'/g,"\\'")}')">
          ✕ Quitar
        </button>
      </div>
    `;
  }

  function buildCompareWeaponCard(weapon, maxima) {
    const typeColor = getWeaponTypeColor(weapon.type);

    const dmgClass = weapon.dmgClass || '';
    const dmgBadgeColor = dmgClass === 'physical' ? '#ef4444' : dmgClass === 'distortion' ? '#06b6d4' : '#fbbf24';

    const stats = [
      { label: 'DPS',             key: 'dps',         unit: '',    higher: true },
      { label: 'Alpha Damage',    key: 'alpha',       unit: '',    higher: true },
      { label: 'Cadencia',        key: 'fireRate',    unit: 'rpm', higher: true },
      { label: 'Alcance',         key: 'range',       unit: 'm',   higher: true },
      { label: 'Vel. Proyectil',  key: 'speed',       unit: 'm/s', higher: true },
      { label: 'Daño Físico',     key: 'physical',    unit: '',    higher: true },
      { label: 'Daño Energía',    key: 'energy',      unit: '',    higher: true },
      { label: 'Distorsión',      key: 'distortion',  unit: '',    higher: true },
      { label: 'Calor/Disparo',   key: 'heatPerShot', unit: '',    higher: false },
    ];

    const rows = stats.map(s => buildStatRow(weapon[s.key] || 0, maxima[s.key], s.label, s.unit, s.higher)).join('');

    return `
      <div class="comp-compare-card">
        <div class="comp-cmp-header">
          <div class="comp-cmp-name">${escComp(weapon.name)}</div>
          <div class="comp-cmp-sub">S${weapon.size} · ${escComp(weapon.type)}</div>
          <div class="comp-cmp-badges">
            <span class="comp-badge" style="background:${typeColor}18;border-color:${typeColor};color:${typeColor}">${escComp(weapon.type)}</span>
            ${dmgClass ? `<span class="comp-badge" style="background:${dmgBadgeColor}18;border-color:${dmgBadgeColor};color:${dmgBadgeColor}">${dmgClass}</span>` : ''}
          </div>
        </div>
        <div class="comp-cmp-stats">
          ${rows}
        </div>
        <button class="comp-cmp-remove"
          onclick="Comp.toggleSelect('weapon','${escComp(weapon.name).replace(/'/g,"\\'")}')">
          ✕ Quitar
        </button>
      </div>
    `;
  }

  function buildStatRow(value, max, label, unit, higher) {
    const pct = max > 0 ? Math.round((value / max) * 100) : 0;
    // Bar color: top value gets amber, rest scale toward dim
    const barColor = pct >= 100
      ? 'var(--accent)'
      : pct >= 66
        ? 'var(--accent-dim)'
        : 'rgba(180,83,9,0.4)';

    const displayVal = value > 0
      ? `${fmtNum(value)}${unit ? ' <span class="comp-stat-unit">' + escComp(unit) + '</span>' : ''}`
      : '—';

    return `
      <div class="comp-stat-row">
        <div class="comp-stat-row-label">${escComp(label)}</div>
        <div class="comp-stat-row-bar-wrap">
          <div class="comp-stat-row-bar" style="width:${pct}%;background:${barColor}"></div>
        </div>
        <div class="comp-stat-row-val">${displayVal}</div>
      </div>
    `;
  }

  // ============================================================
  // COLOR HELPERS
  // ============================================================

  const MFR_COLOR = {
    'Aegis':                 '#4a9eff',
    'Anvil':                 '#22c55e',
    'Aopoa':                 '#8b5cf6',
    'Banu':                  '#d97706',
    'Consolidated Outland':  '#ef4444',
    'Crusader':              '#f59e0b',
    'Drake':                 '#dc2626',
    'Esperia':               '#8b5cf6',
    'Gatac':                 '#22c55e',
    'Greycat':               '#78716c',
    'Kruger':                '#60a5fa',
    'MISC':                  '#10b981',
    'Mirai':                 '#a855f7',
    'NDC':                   '#6b7280',
    'Origin':                '#e2e8f0',
    'RSI':                   '#3b82f6',
    'Tumbril':               '#92400e',
    'Willsop':               '#6b7280'
  };

  function getRoleColor(role) {
    const r = (role || '').toLowerCase();
    if (r.includes('fighter') || r.includes('combat') || r.includes('bomber') || r.includes('gunship')) return '#ef4444';
    if (r.includes('freight') || r.includes('transport') || r.includes('cargo'))  return '#f59e0b';
    if (r.includes('explor') || r.includes('pathfind') || r.includes('expedition')) return '#10b981';
    if (r.includes('mining') || r.includes('salvage')) return '#8b5cf6';
    if (r.includes('medical') || r.includes('rescue'))  return '#06b6d4';
    if (r.includes('racing'))  return '#f97316';
    if (r.includes('touring') || r.includes('starter')) return '#a78bfa';
    if (r.includes('stealth')) return '#6366f1';
    return '#a88b4a';
  }

  function getWeaponTypeColor(type) {
    const t = (type || '').toLowerCase();
    if (t.includes('laser repeater'))    return '#f59e0b';
    if (t.includes('laser cannon'))      return '#fbbf24';
    if (t.includes('laser gatling'))     return '#fcd34d';
    if (t.includes('laser scatter'))     return '#fde68a';
    if (t.includes('laser beam'))        return '#fef3c7';
    if (t.includes('ballistic gatling')) return '#ef4444';
    if (t.includes('ballistic cannon'))  return '#dc2626';
    if (t.includes('ballistic repeater'))return '#f87171';
    if (t.includes('ballistic scatter')) return '#fca5a5';
    if (t.includes('mass driver'))       return '#8b5cf6';
    if (t.includes('distortion'))        return '#06b6d4';
    if (t.includes('neutron'))           return '#10b981';
    if (t.includes('plasma'))            return '#a855f7';
    if (t.includes('tachyon'))           return '#e879f9';
    return '#a88b4a';
  }

  // ============================================================
  // EVENT LISTENERS (attached after render)
  // ============================================================

  function attachEventListeners() {
    // Ships search
    const shipSearch = document.getElementById('compSearchShips');
    if (shipSearch) {
      shipSearch.addEventListener('input', e => {
        compState.searchShips = e.target.value;
        render();
      });
    }

    // Ships role filter
    const roleFilter = document.getElementById('compRoleFilter');
    if (roleFilter) {
      roleFilter.addEventListener('change', e => {
        compState.filterRole = e.target.value;
        render();
      });
    }

    // Ships mfr filter
    const mfrFilter = document.getElementById('compMfrFilter');
    if (mfrFilter) {
      mfrFilter.addEventListener('change', e => {
        compState.filterMfr = e.target.value;
        render();
      });
    }

    // Weapons search
    const weapSearch = document.getElementById('compSearchWeapons');
    if (weapSearch) {
      weapSearch.addEventListener('input', e => {
        compState.searchWeapons = e.target.value;
        render();
      });
    }

    // Ships size filter
    const sizeFilter = document.getElementById('compSizeFilter');
    if (sizeFilter) {
      sizeFilter.addEventListener('change', e => { compState.filterSize = e.target.value; render(); });
    }

    // Ships sort
    const sortShips = document.getElementById('compSortShips');
    if (sortShips) {
      sortShips.addEventListener('change', e => { compState.sortShips = e.target.value; render(); });
    }

    // Weapons type filter
    const typeFilter = document.getElementById('compTypeFilter');
    if (typeFilter) {
      typeFilter.addEventListener('change', e => {
        compState.filterType = e.target.value;
        render();
      });
    }

    // Weapons size filter
    const sizeWeaponFilter = document.getElementById('compSizeWeaponFilter');
    if (sizeWeaponFilter) {
      sizeWeaponFilter.addEventListener('change', e => { compState.filterSizeWeapon = e.target.value; render(); });
    }

    // Weapons sort
    const sortWeapons = document.getElementById('compSortWeapons');
    if (sortWeapons) {
      sortWeapons.addEventListener('change', e => { compState.sortWeapons = e.target.value; render(); });
    }

    // Fill component dropdowns async when create-build tab is active
    // Guard: only fill if the slot container is still empty (avoid re-filling on re-renders)
    if (compState.tab === 'create-build' && compState.createBuildShip) {
      const slotsEl = document.getElementById('bcreateCompSlots');
      if (slotsEl && slotsEl.querySelector('.bcreate-loading')) {
        window.Builds?.fillCreateForm(compState.createBuildShip);
      }
    }
  }

  // ============================================================
  // CSS INJECTION
  // ============================================================

  function injectStyles() {
    if (document.getElementById('comp-styles')) return;
    const style = document.createElement('style');
    style.id = 'comp-styles';
    style.textContent = `
      /* ===== COMPARATOR TABS ===== */
      .comp-tabs {
        display: flex;
        gap: 0.5rem;
        margin-bottom: 1.5rem;
        border-bottom: 1px solid var(--border);
        padding-bottom: 0;
        align-items: center;
        flex-wrap: wrap;
      }
      .comp-tab-btn {
        font-family: var(--font-hud);
        font-size: 1rem;
        font-weight: 600;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        color: var(--text-secondary);
        padding: 0.7rem 1.4rem;
        border-bottom: 2px solid transparent;
        border-radius: 0;
        transition: all var(--transition);
        position: relative;
      }
      .comp-tab-btn:hover {
        color: var(--text-primary);
        background: rgba(180,83,9,0.1);
      }
      .comp-tab-btn.active {
        color: var(--accent);
        border-bottom-color: var(--accent);
        background: rgba(245,158,11,0.06);
      }
      .comp-sel-badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 1.2rem;
        height: 1.2rem;
        border-radius: 50%;
        background: var(--accent);
        color: #0c0a09;
        font-size: 0.6rem;
        font-weight: 900;
        margin-left: 0.4rem;
        line-height: 1;
        font-family: var(--font-mono);
      }
      .comp-clear-btn {
        margin-left: auto;
        font-family: var(--font-hud);
        font-size: 0.62rem;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--text-muted);
        border: 1px solid var(--border);
        border-radius: 3px;
        padding: 0.4rem 0.8rem;
        transition: all var(--transition);
      }
      .comp-clear-btn:hover {
        color: var(--red);
        border-color: rgba(239,68,68,0.4);
        background: rgba(239,68,68,0.08);
      }

      /* ===== SELECTION BAR ===== */
      .comp-selection-bar {
        display: flex;
        gap: 0.5rem;
        flex-wrap: wrap;
        margin-bottom: 1rem;
        padding: 0.6rem 0.75rem;
        background: rgba(18,15,8,0.7);
        border: 1px solid rgba(180,83,9,0.2);
        border-radius: 4px;
        border-left: 3px solid var(--accent-dim);
      }
      .comp-chip {
        display: flex;
        align-items: center;
        gap: 0.4rem;
        background: rgba(245,158,11,0.08);
        border: 1px solid rgba(245,158,11,0.3);
        border-radius: 3px;
        padding: 0.25rem 0.4rem 0.25rem 0.6rem;
        font-size: 0.82rem;
        font-family: var(--font-body);
      }
      .comp-chip-type {
        font-family: var(--font-mono);
        font-size: 0.6rem;
        color: var(--accent-dim);
        text-transform: uppercase;
        letter-spacing: 0.06em;
        border-right: 1px solid rgba(180,83,9,0.3);
        padding-right: 0.4rem;
      }
      .comp-chip-name { color: var(--text-primary); }
      .comp-chip-remove {
        color: var(--text-muted);
        font-size: 0.7rem;
        padding: 0.1rem 0.2rem;
        line-height: 1;
        transition: color var(--transition);
        border-radius: 2px;
      }
      .comp-chip-remove:hover { color: var(--red); background: rgba(239,68,68,0.1); }

      /* ===== RESULTS BAR ===== */
      .comp-results-bar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 1rem;
        padding: 0 0.1rem;
      }
      .comp-count {
        font-family: var(--font-mono);
        font-size: 1rem;
        color: var(--accent);
        letter-spacing: 0.06em;
      }
      .comp-hint {
        font-size: 0.96rem;
        color: var(--text-muted);
        font-style: italic;
      }

      /* ===== CARD GRID ===== */
      .comp-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
        gap: 1rem;
        margin-bottom: 2rem;
      }

      /* ===== COMP CARD ===== */
      .comp-card {
        cursor: pointer;
        position: relative;
        padding: 1rem 1rem 0.85rem;
        border-left: 3px solid transparent;
        transition: all var(--transition);
        user-select: none;
      }
      .comp-card:hover {
        border-left-color: var(--accent-dim);
      }
      .comp-card.comp-selected {
        border-left-color: var(--accent) !important;
        background: rgba(245,158,11,0.06) !important;
        box-shadow: 0 0 20px rgba(245,158,11,0.12) !important;
      }
      .comp-selected-mark {
        position: absolute;
        top: 0.5rem;
        right: 0.5rem;
        width: 1.25rem;
        height: 1.25rem;
        border-radius: 50%;
        background: var(--accent);
        color: #0c0a09;
        font-size: 0.72rem;
        font-weight: 900;
        display: flex;
        align-items: center;
        justify-content: center;
        line-height: 1;
      }

      .comp-card-header { margin-bottom: 0.6rem; }
      .comp-ship-name {
        font-family: var(--font-hud);
        font-size: 1.2rem;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--text-primary);
        line-height: 1.2;
        margin-bottom: 0.2rem;
      }
      .comp-mfr {
        font-family: var(--font-mono);
        font-size: 0.92rem;
        color: var(--text-muted);
        letter-spacing: 0.05em;
        text-transform: uppercase;
      }
      .comp-weapon-size {
        font-size: 0.72rem;
        color: var(--accent-dim);
        letter-spacing: 0.02em;
        font-family: var(--font-mono);
        text-transform: none;
      }
      .comp-weapon-note {
        font-size: 0.72rem;
        color: var(--stanton);
        font-family: var(--font-mono);
        margin-bottom: 0.4rem;
        letter-spacing: 0.04em;
      }

      /* ===== SHIP IMAGE BANNERS ===== */
      .comp-ship-banner {
        height: 100px;
        margin: -1rem -1rem 0.8rem;
        overflow: hidden;
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        border-bottom: 1px solid var(--border);
        background: rgba(0,0,0,0.35);
        flex-shrink: 0;
      }
      .comp-ship-banner img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        object-position: center 40%;
        display: block;
        transition: transform 0.4s ease;
      }
      .comp-card:hover .comp-ship-banner img { transform: scale(1.05); }
      .comp-cmp-banner {
        height: 140px;
        overflow: hidden;
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        border-bottom: 1px solid var(--border);
        background: rgba(0,0,0,0.35);
        flex-shrink: 0;
      }
      .comp-cmp-banner img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        object-position: center 40%;
        display: block;
      }
      .comp-banner-mfr {
        font-family: var(--font-hud);
        font-size: 0.65rem;
        font-weight: 700;
        letter-spacing: 0.28em;
        text-transform: uppercase;
        opacity: 0.35;
      }

      /* ===== BADGES ===== */
      .comp-badges {
        display: flex;
        gap: 0.35rem;
        flex-wrap: wrap;
        margin-bottom: 0.75rem;
      }
      .comp-badge {
        font-family: var(--font-mono);
        font-size: 0.84rem;
        letter-spacing: 0.05em;
        text-transform: uppercase;
        border: 1px solid;
        border-radius: 2px;
        padding: 0.18rem 0.55rem;
        white-space: nowrap;
      }

      /* ===== STAT ROW IN CARDS ===== */
      .comp-stats-row {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 0.4rem 0.6rem;
      }
      .comp-stat {
        display: flex;
        flex-direction: column;
        gap: 0.05rem;
      }
      .comp-stat-label {
        font-family: var(--font-mono);
        font-size: 0.84rem;
        color: var(--text-muted);
        letter-spacing: 0.06em;
        text-transform: uppercase;
      }
      .comp-stat-val {
        font-family: var(--font-mono);
        font-size: 1.08rem;
        color: var(--text-primary);
        font-weight: 600;
      }
      .comp-stat-unit {
        font-size: 0.8rem;
        color: var(--text-muted);
      }

      /* ===== EMPTY STATE ===== */
      .comp-empty {
        grid-column: 1 / -1;
        text-align: center;
        padding: 3rem 1rem;
        color: var(--text-secondary);
      }
      .comp-empty-compare {
        padding: 4rem 1rem;
      }
      .comp-empty-icon {
        font-size: 2.5rem;
        color: var(--text-muted);
        margin-bottom: 1rem;
        opacity: 0.5;
      }
      .comp-empty-title {
        font-family: var(--font-hud);
        font-size: 1rem;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        color: var(--text-secondary);
        margin-bottom: 0.5rem;
      }
      .comp-empty-sub {
        font-size: 0.9rem;
        color: var(--text-muted);
        margin-bottom: 1.5rem;
      }
      .comp-empty-actions {
        display: flex;
        gap: 1rem;
        justify-content: center;
        flex-wrap: wrap;
      }

      /* ===== COMPARE AREA ===== */
      .comp-compare-area {
        display: grid;
        grid-template-columns: repeat(var(--comp-cols, 2), 1fr);
        gap: 1rem;
        margin-bottom: 2rem;
        align-items: start;
      }
      @media (max-width: 900px) {
        .comp-compare-area { grid-template-columns: repeat(2, 1fr); }
      }
      @media (max-width: 560px) {
        .comp-compare-area { grid-template-columns: 1fr; }
      }

      .comp-compare-card {
        background: var(--bg-glass);
        border: 1px solid var(--border);
        border-radius: 4px;
        overflow: hidden;
        backdrop-filter: blur(8px);
        display: flex;
        flex-direction: column;
      }

      .comp-cmp-header {
        padding: 1rem 1rem 0.75rem;
        border-bottom: 1px solid var(--border);
        background: rgba(18,15,8,0.6);
      }
      .comp-cmp-name {
        font-family: var(--font-hud);
        font-size: 1.25rem;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--text-primary);
        margin-bottom: 0.2rem;
      }
      .comp-cmp-sub {
        font-family: var(--font-mono);
        font-size: 0.92rem;
        color: var(--text-muted);
        letter-spacing: 0.05em;
        text-transform: uppercase;
        margin-bottom: 0.5rem;
      }
      .comp-cmp-badges { display: flex; gap: 0.35rem; flex-wrap: wrap; }

      /* ===== STAT ROWS WITH BARS ===== */
      .comp-cmp-stats { padding: 0.75rem 1rem; flex: 1; }
      .comp-stat-row {
        display: grid;
        grid-template-columns: 7rem 1fr 4.5rem;
        gap: 0.5rem;
        align-items: center;
        padding: 0.3rem 0;
        border-bottom: 1px solid rgba(180,83,9,0.08);
      }
      .comp-stat-row:last-child { border-bottom: none; }
      .comp-stat-row-label {
        font-family: var(--font-mono);
        font-size: 0.92rem;
        color: var(--text-muted);
        letter-spacing: 0.05em;
        text-transform: uppercase;
        white-space: nowrap;
      }
      .comp-stat-row-bar-wrap {
        height: 4px;
        background: rgba(180,83,9,0.12);
        border-radius: 2px;
        overflow: hidden;
      }
      .comp-stat-row-bar {
        height: 100%;
        border-radius: 2px;
        transition: width 0.4s ease;
        min-width: 2px;
      }
      .comp-stat-row-val {
        font-family: var(--font-mono);
        font-size: 1rem;
        color: var(--text-primary);
        text-align: right;
        white-space: nowrap;
      }

      .comp-cmp-remove {
        display: block;
        width: 100%;
        padding: 0.5rem;
        font-family: var(--font-hud);
        font-size: 0.58rem;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        color: var(--text-muted);
        border-top: 1px solid var(--border);
        transition: all var(--transition);
        text-align: center;
      }
      .comp-cmp-remove:hover {
        color: var(--red);
        background: rgba(239,68,68,0.08);
      }

      /* ===== PAGE SUBTITLE ===== */
      .page-subtitle {
        font-family: var(--font-mono);
        font-size: 0.7rem;
        color: var(--text-muted);
        letter-spacing: 0.08em;
        text-transform: uppercase;
        margin-top: 0.3rem;
      }

      /* ===== BUTTONS (reuse existing but ensure available) ===== */
      .btn-primary {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        background: var(--accent);
        color: #0c0a09;
        font-family: var(--font-hud);
        font-size: 0.72rem;
        font-weight: 700;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        padding: 0.75rem 1.5rem;
        border-radius: 3px;
        transition: all var(--transition);
        cursor: pointer;
      }
      .btn-primary:hover {
        background: var(--accent-light);
        box-shadow: 0 0 20px rgba(245,158,11,0.3);
      }

      /* ===== RESPONSIVE ===== */
      @media (max-width: 640px) {
        .comp-grid { grid-template-columns: 1fr; }
        .comp-stats-row { grid-template-columns: repeat(2, 1fr); }
        .comp-stat-row { grid-template-columns: 6rem 1fr 3.5rem; }
        .comp-tabs { gap: 0.25rem; }
        .comp-tab-btn { padding: 0.5rem 0.75rem; font-size: 0.65rem; }
      }
    `;
    document.head.appendChild(style);
  }

  // ============================================================
  // PUBLIC INIT
  // ============================================================

  function init() {
    injectStyles();
    render();
    // Recarga builds cuando cambia la sesión (login/logout) para actualizar votos.
    // Debounce para que TOKEN_REFRESHED u otros eventos rápidos no anulen cargas en curso.
    if (!compState._authListened) {
      compState._authListened = true;
      let _authBuildsTimer = null;
      window.Auth?.onUserChange(() => {
        clearTimeout(_authBuildsTimer);
        _authBuildsTimer = setTimeout(() => {
          if (compState.tab === 'builds') {
            const el = document.getElementById('buildsTabList');
            if (el) window.Builds?.loadAllBuilds('buildsTabList');
          }
        }, 200);
      });
    }
    // Load ship data from JSON (updated each game patch)
    if (!compState._shipsLoaded) {
      compState._shipsLoaded = true;
      fetch('data/ships.json')
        .then(r => r.ok ? r.json() : [])
        .then(data => {
          SHIPS.length = 0;
          data.forEach(s => SHIPS.push(s));
          render();
        })
        .catch(() => {});
    }
    // Load weapon data from JSON
    if (!compState._weaponsLoaded) {
      compState._weaponsLoaded = true;
      fetch('data/weapons.json')
        .then(r => r.ok ? r.json() : [])
        .then(data => {
          WEAPONS.length = 0;
          data.forEach(w => WEAPONS.push(w));
          render();
        })
        .catch(() => {});
    }
    // Load ship images
    if (!compState._imagesLoaded) {
      compState._imagesLoaded = true;
      fetch('data/ship_images.json')
        .then(r => r.ok ? r.json() : {})
        .then(imgs => { compState.shipImages = imgs; render(); })
        .catch(() => {});
    }
  }

  // ============================================================
  // NAMESPACE EXPORT
  // ============================================================

  global.Comp = {
    init,
    switchTab,
    toggleSelect,
    clearSelection,
    openCreateBuild,
    destroy: destroyFloatingBtn,
    _clearSearchShips: function () {
      compState.searchShips = '';
      render();
    },
    _clearSearchWeapons: function () {
      compState.searchWeapons = '';
      render();
    }
  };

}(window));
