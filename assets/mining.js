/* ===================================================
   GHOST SYNDICATE TOOLS — Mining Module
   Minerales · Localizaciones
   SC 4.7.0 — Real game data from Data.p4k
   =================================================== */

'use strict';

const Mining = (() => {

  // ============================================================
  // STATE
  // ============================================================
  const mState = {
    db: null,
    tab: 'minerales',
    // Minerales tab
    mineralSort: 'resistance',
    mineralSortDir: -1,
    mineralSearch: '',
    // Localizaciones filters
    locSystem: 'Stanton',
    locFilterMineral: null,   // mineral name or null = todos
    locFilterMethod: 'all',   // 'all' | 'ship' | 'ground' | 'both'
    locFilterDiff: 'all',     // 'all' | 'easy' | 'medium' | 'hard'
  };

  let loaded = false;

  // ============================================================
  // LOAD
  // ============================================================
  async function load() {
    if (loaded && mState.db) { render(); return; }

    const loadingEl = document.getElementById('mnLoading');
    const contentEl = document.getElementById('mnContent');
    const tabsEl    = document.getElementById('mnTabs');
    if (loadingEl) loadingEl.classList.remove('hidden');
    if (contentEl) contentEl.innerHTML = '';
    if (tabsEl)    tabsEl.innerHTML = '';

    try {
      const res = await fetch('data/mining_db.json');
      if (!res.ok) throw new Error('HTTP ' + res.status);
      mState.db = await res.json();
      loaded = true;
      if (loadingEl) loadingEl.classList.add('hidden');
      render();
    } catch (e) {
      if (loadingEl) loadingEl.classList.add('hidden');
      if (contentEl) contentEl.innerHTML =
        '<div class="mn-error">Error cargando datos de minería: ' + e.message + '</div>';
    }
  }

  // ============================================================
  // TABS
  // ============================================================
  function setTab(tab) { mState.tab = tab; render(); }

  function render() { renderTabs(); renderContent(); }

  function renderTabs() {
    const tabsEl = document.getElementById('mnTabs');
    if (!tabsEl) return;
    tabsEl.innerHTML = [
      { id: 'minerales',      label: 'Minerales' },
      { id: 'localizaciones', label: 'Localizaciones' },
    ].map(t =>
      `<button class="mn-tab${mState.tab === t.id ? ' active' : ''}" onclick="Mining.setTab('${t.id}')">${t.label}</button>`
    ).join('');
  }

  function renderContent() {
    const el = document.getElementById('mnContent');
    if (!el || !mState.db) return;
    if (mState.tab === 'minerales')      el.innerHTML = renderMinerales();
    else if (mState.tab === 'localizaciones') el.innerHTML = renderLocalizaciones();
    wireEvents();
  }

  // ============================================================
  // TAB: MINERALES
  // ============================================================
  function renderMinerales() {
    const { minerals } = mState.db;
    const search = mState.mineralSearch.toLowerCase();
    let list = minerals.filter(m => !search || m.name.toLowerCase().includes(search));

    const col = mState.mineralSort;
    const dir = mState.mineralSortDir;
    list = list.sort((a, b) => {
      let va = a[col] ?? -Infinity, vb = b[col] ?? -Infinity;
      if (typeof va === 'string') return dir * va.localeCompare(vb);
      return dir * (vb - va);
    });

    const cols = [
      { key: 'name',       label: 'Mineral' },
      { key: 'symbol',     label: 'Símbolo' },
      { key: 'resistance', label: 'Resistencia' },
      { key: 'optMin',     label: 'Ventana Óptima' },
      { key: 'instability',label: 'Inestabilidad' },
      { key: 'priceSCU',   label: 'Precio/SCU' },
      { key: 'rarity',     label: 'Rareza' },
      { key: 'scanBase',   label: 'Escáner' },
    ];

    const thead = cols.map(c => {
      const active = mState.mineralSort === c.key;
      const arrow  = active ? (mState.mineralSortDir === -1 ? ' ▼' : ' ▲') : '';
      return `<th class="mn-th${active ? ' active' : ''}" data-col="${c.key}">${c.label}${arrow}</th>`;
    }).join('');

    const rows = list.map(m => {
      const optBar  = buildOptBar(m);
      const resBar  = buildSimpleBar(m.resistance, '#e74c3c');
      const instBar = buildSimpleBar(m.instability, '#f39c12');
      const explosive = m.explosive
        ? ' <span class="mn-explosive-tag" title="Mineral explosivo — inestable, tiempo limitado">💥</span>' : '';
      const scanCell = buildScanBadge(m);
      return `<tr class="mn-mineral-row" style="border-left: 3px solid ${m.color}">
        <td><span class="mn-dot" style="background:${m.color}"></span>${m.name}${explosive}</td>
        <td><code class="mn-symbol">${m.symbol}</code></td>
        <td>${resBar} <span class="mn-val">${m.resistance}</span></td>
        <td>${optBar}</td>
        <td>${instBar} <span class="mn-val">${m.instability}</span></td>
        <td class="mn-price">${m.priceSCU.toLocaleString('es-ES')} aUEC</td>
        <td><span class="mn-rarity mn-rarity-${rarityClass(m.rarity)}">${m.rarity}</span></td>
        <td>${scanCell}</td>
      </tr>`;
    }).join('');

    return `
      <div class="mn-search-bar">
        <div class="search-box">
          <span class="search-icon">🔍</span>
          <input type="text" id="mnMineralSearch" class="mn-search-input"
            placeholder="Buscar mineral..." value="${escHtml(mState.mineralSearch)}" autocomplete="off" />
          <button class="search-clear" id="mnSearchClear" onclick="Mining._clearMineralSearch()">✕</button>
        </div>
        <span class="mn-count">${list.length} minerales</span>
      </div>
      <div class="mn-table-wrap">
        <table class="mn-table">
          <thead><tr>${thead}</tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <p class="mn-table-note">
        Haz clic en los encabezados para ordenar. Los precios son aproximados en SC 4.7.0.<br>
        <strong>Escáner:</strong> valor base (×1) del ping. El número sube con la concentración del mineral en la roca (×2–6 según rareza).
      </p>
    `;
  }

  // Scan value badge coloured by rarity
  function buildScanBadge(m) {
    if (!m.scanBase) {
      return `<span class="mn-scan-na" title="No mineable en nave">—</span>`;
    }
    const rc  = rarityClass(m.rarity);
    const max = m.scanMaxMult ? `×${m.scanMaxMult}` : '';
    return `<span class="mn-scan-badge mn-scan-${rc}" title="Valor escáner base · máx ${max}">
      ${m.scanBase.toLocaleString('es-ES')}
      ${max ? `<span class="mn-scan-mult">${max}</span>` : ''}
    </span>`;
  }

  function buildOptBar(m) {
    const pct = v => Math.min(100, Math.max(0, v));
    const left  = pct(m.optMin);
    const width = pct(m.optMax) - left;
    return `<div class="mn-opt-bar">
      <div class="mn-opt-track">
        <div class="mn-opt-zone" style="left:${left}%;width:${width}%;background:${m.color}88"></div>
        <div class="mn-opt-label-min" style="left:${left}%">${m.optMin}%</div>
        <div class="mn-opt-label-max" style="left:${pct(m.optMax)}%">${m.optMax}%</div>
      </div>
    </div>`;
  }

  function buildSimpleBar(val, color) {
    const pct = Math.min(100, Math.max(0, val));
    return `<div class="mn-bar-wrap"><div class="mn-bar-fill" style="width:${pct}%;background:${color}88"></div></div>`;
  }

  function rarityClass(r) {
    return { 'Legendario': 'legendary', 'Épico': 'epic', 'Raro': 'rare',
             'Poco común': 'uncommon', 'Común': 'common', 'Abundante': 'common' }[r] || 'common';
  }

  // ============================================================
  // TAB: LOCALIZACIONES
  // ============================================================
  function renderLocalizaciones() {
    const { locations, minerals } = mState.db;

    // All minerals present in the current system (for filter chips)
    const sysLocs  = locations.filter(l => l.system === mState.locSystem);
    const allMinerals = [...new Set(sysLocs.flatMap(l => l.minerals))].sort();

    // Apply filters
    let filtered = sysLocs;
    if (mState.locFilterMineral) {
      filtered = filtered.filter(l => l.minerals.includes(mState.locFilterMineral));
    }
    if (mState.locFilterMethod !== 'all') {
      filtered = filtered.filter(l => l.method === mState.locFilterMethod);
    }
    if (mState.locFilterDiff !== 'all') {
      const diffGroups = {
        easy:   ['Muy baja', 'Baja'],
        medium: ['Media'],
        hard:   ['Alta', 'Muy alta'],
      };
      filtered = filtered.filter(l => diffGroups[mState.locFilterDiff].includes(l.difficulty));
    }

    // Sort by profitability (best mineral price desc)
    filtered = [...filtered].sort((a, b) => profitScore(b, minerals) - profitScore(a, minerals));

    // Mineral filter chips
    const mineralChipsFilter = allMinerals.map(mn => {
      const mObj  = minerals.find(m => m.name === mn);
      const color = mObj ? mObj.color : '#888';
      const active = mState.locFilterMineral === mn;
      return `<button class="mn-filter-chip${active ? ' active' : ''}"
        style="--chip-color:${color}"
        onclick="Mining._setLocMineral(${active ? 'null' : `'${mn.replace(/'/g, "\\'")}'`})">
        <span class="mn-filter-dot" style="background:${color}"></span>${mn}
      </button>`;
    }).join('');

    // Method filter buttons
    const methods = [
      { val: 'all',    label: 'Todos', icon: '' },
      { val: 'ship',   label: 'Nave',  icon: '🚀' },
      { val: 'ground', label: 'Terrestre', icon: '🚗' },
      { val: 'both',   label: 'Ambos', icon: '🚀🚗' },
    ];
    const methodBtns = methods.map(m =>
      `<button class="mn-filter-btn${mState.locFilterMethod === m.val ? ' active' : ''}"
        onclick="Mining._setLocMethod('${m.val}')">
        ${m.icon ? m.icon + ' ' : ''}${m.label}
      </button>`
    ).join('');

    // Difficulty filter buttons
    const diffs = [
      { val: 'all',    label: 'Todos' },
      { val: 'easy',   label: 'Fácil' },
      { val: 'medium', label: 'Media' },
      { val: 'hard',   label: 'Difícil' },
    ];
    const diffBtns = diffs.map(d =>
      `<button class="mn-filter-btn${mState.locFilterDiff === d.val ? ' active' : ''}"
        onclick="Mining._setLocDiff('${d.val}')">
        ${d.label}
      </button>`
    ).join('');

    // Cards
    const cards = filtered.length
      ? filtered.map(loc => renderLocCard(loc, minerals)).join('')
      : `<div class="mn-no-results">Ninguna localización coincide con los filtros activos.</div>`;

    // Active filter summary
    const activeFilters = [
      mState.locFilterMineral ? `Mineral: ${mState.locFilterMineral}` : null,
      mState.locFilterMethod !== 'all' ? `Método: ${methods.find(m => m.val === mState.locFilterMethod)?.label}` : null,
      mState.locFilterDiff !== 'all' ? `Dificultad: ${diffs.find(d => d.val === mState.locFilterDiff)?.label}` : null,
    ].filter(Boolean);

    const filterSummary = activeFilters.length
      ? `<div class="mn-filter-summary">
          Mostrando ${filtered.length} de ${sysLocs.length} · ${activeFilters.join(' · ')}
          <button class="mn-filter-reset" onclick="Mining._resetLocFilters()">Limpiar filtros</button>
         </div>`
      : `<div class="mn-filter-summary">${filtered.length} localizaciones</div>`;

    return `
      <div class="mn-loc-controls">
        <!-- System tabs -->
        <div class="mn-sys-tabs">
          <button class="mn-sys-tab${mState.locSystem === 'Stanton' ? ' active' : ''}" onclick="Mining._setLocSystem('Stanton')">
            <span class="mn-sys-dot mn-sys-stanton"></span> Stanton
          </button>
          <button class="mn-sys-tab${mState.locSystem === 'Pyro' ? ' active' : ''}" onclick="Mining._setLocSystem('Pyro')">
            <span class="mn-sys-dot mn-sys-pyro"></span> Pyro
          </button>
        </div>

        <!-- Method + difficulty filter row -->
        <div class="mn-filter-row">
          <div class="mn-filter-group">
            <span class="mn-filter-label">Método</span>
            <div class="mn-filter-btns">${methodBtns}</div>
          </div>
          <div class="mn-filter-group">
            <span class="mn-filter-label">Dificultad</span>
            <div class="mn-filter-btns">${diffBtns}</div>
          </div>
        </div>

        <!-- Mineral filter chips -->
        <div class="mn-filter-minerals">
          <span class="mn-filter-label">Filtrar por mineral</span>
          <div class="mn-filter-chips">${mineralChipsFilter}</div>
        </div>

        ${filterSummary}
      </div>

      <div class="mn-loc-grid">${cards}</div>
    `;
  }

  function renderLocCard(loc, minerals) {
    const bodyIcon   = loc.bodyType === 'asteroid_belt' ? '🪨' : loc.bodyType === 'moon' ? '🌙' : '🪐';
    const methodIcon = loc.method === 'ship' ? '🚀' : loc.method === 'ground' ? '🚗' : '🚀🚗';
    const diffClass  = difficultyClass(loc.difficulty);

    // Profit badge
    const score = profitScore(loc, minerals);
    const profitBadge = buildProfitBadge(score);

    // Mineral chips — highlight the active filter
    const mineralChips = loc.minerals.map(mn => {
      const mObj  = minerals.find(m => m.name === mn);
      const color = mObj ? mObj.color : '#888';
      const isActive = mState.locFilterMineral === mn;
      return `<button class="mn-mineral-chip${isActive ? ' highlighted' : ''}"
        style="border-color:${color};color:${color}"
        onclick="Mining._setLocMineral(${isActive ? 'null' : `'${mn.replace(/'/g, "\\'")}'`})">
        ${mn}
      </button>`;
    }).join('');

    return `<div class="mn-loc-card">
      <div class="mn-loc-header">
        <span class="mn-loc-icon">${bodyIcon}</span>
        <div class="mn-loc-title-block">
          <div class="mn-loc-name">${loc.name}</div>
          <div class="mn-loc-meta">${methodIcon} ${methodLabel(loc.method)}</div>
        </div>
        <div class="mn-loc-badges">
          ${profitBadge}
          <span class="mn-difficulty-badge mn-diff-${diffClass}">${loc.difficulty}</span>
        </div>
      </div>
      <div class="mn-mineral-chips">${mineralChips}</div>
      ${loc.notes ? `<div class="mn-loc-notes">${loc.notes}</div>` : ''}
    </div>`;
  }

  // Profitability score: max mineral price in location
  function profitScore(loc, minerals) {
    let max = 0;
    for (const mn of loc.minerals) {
      const mObj = minerals.find(m => m.name === mn);
      if (mObj && mObj.priceSCU > max) max = mObj.priceSCU;
    }
    return max;
  }

  function buildProfitBadge(score) {
    if (score >= 50000) return `<span class="mn-profit-badge mn-profit-veryhigh" title="Rentabilidad muy alta">💰💰💰</span>`;
    if (score >= 15000) return `<span class="mn-profit-badge mn-profit-high"    title="Rentabilidad alta">💰💰</span>`;
    if (score >= 3000)  return `<span class="mn-profit-badge mn-profit-med"     title="Rentabilidad media">💰</span>`;
    return `<span class="mn-profit-badge mn-profit-low" title="Rentabilidad baja">—</span>`;
  }

  function methodLabel(m) {
    return m === 'ship' ? 'Nave' : m === 'ground' ? 'Vehículo terrestre' : 'Nave y terrestre';
  }

  function difficultyClass(d) {
    return { 'Muy baja': 'verylw', 'Baja': 'low', 'Media': 'med',
             'Alta': 'high', 'Muy alta': 'veryhigh' }[d] || 'med';
  }

  // ============================================================
  // EVENT WIRING
  // ============================================================
  function wireEvents() {
    const searchInput = document.getElementById('mnMineralSearch');
    if (searchInput) {
      searchInput.addEventListener('input', e => {
        mState.mineralSearch = e.target.value;
        renderContent();
      });
    }
    document.querySelectorAll('.mn-th[data-col]').forEach(th => {
      th.addEventListener('click', () => {
        const col = th.dataset.col;
        if (mState.mineralSort === col) mState.mineralSortDir *= -1;
        else { mState.mineralSort = col; mState.mineralSortDir = -1; }
        renderContent();
      });
    });
  }

  // ============================================================
  // PUBLIC HELPERS
  // ============================================================
  function _setLocSystem(sys) {
    mState.locSystem = sys;
    mState.locFilterMineral = null; // reset mineral filter on system change
    renderContent();
  }
  function _setLocMineral(mn) { mState.locFilterMineral = mn; renderContent(); }
  function _setLocMethod(m)   { mState.locFilterMethod = m;   renderContent(); }
  function _setLocDiff(d)     { mState.locFilterDiff = d;     renderContent(); }
  function _resetLocFilters() {
    mState.locFilterMineral = null;
    mState.locFilterMethod  = 'all';
    mState.locFilterDiff    = 'all';
    renderContent();
  }
  function _clearMineralSearch() { mState.mineralSearch = ''; renderContent(); }

  // ============================================================
  // UTILITIES
  // ============================================================
  function escHtml(str) {
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  // ============================================================
  // PUBLIC API
  // ============================================================
  return { load, setTab, _setLocSystem, _setLocMineral, _setLocMethod, _setLocDiff, _resetLocFilters, _clearMineralSearch };

})();

window.Mining = Mining;
