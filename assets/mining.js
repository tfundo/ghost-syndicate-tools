/* ===================================================
   GHOST SYNDICATE TOOLS — Mining Module
   Minerales · Localizaciones · Configurador
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
    locSystem: 'Stanton',
    mineralSort: 'resistance',
    mineralSortDir: -1,
    mineralSearch: '',
  };

  let loaded = false;

  // ============================================================
  // LOAD
  // ============================================================
  async function load() {
    if (loaded && mState.db) {
      render();
      return;
    }

    const loadingEl = document.getElementById('mnLoading');
    const contentEl = document.getElementById('mnContent');
    const tabsEl = document.getElementById('mnTabs');
    if (loadingEl) loadingEl.classList.remove('hidden');
    if (contentEl) contentEl.innerHTML = '';
    if (tabsEl) tabsEl.innerHTML = '';

    try {
      const res = await fetch('data/mining_db.json');
      if (!res.ok) throw new Error('HTTP ' + res.status);
      mState.db = await res.json();
      loaded = true;
      if (loadingEl) loadingEl.classList.add('hidden');
      render();
    } catch (e) {
      if (loadingEl) loadingEl.classList.add('hidden');
      if (contentEl) contentEl.innerHTML = '<div class="mn-error">Error cargando datos de minería: ' + e.message + '</div>';
    }
  }

  // ============================================================
  // SET TAB
  // ============================================================
  function setTab(tab) {
    mState.tab = tab;
    render();
  }

  // ============================================================
  // RENDER MAIN
  // ============================================================
  function render() {
    renderTabs();
    renderContent();
  }

  function renderTabs() {
    const tabsEl = document.getElementById('mnTabs');
    if (!tabsEl) return;
    const tabs = [
      { id: 'minerales', label: 'Minerales' },
      { id: 'localizaciones', label: 'Localizaciones' },
    ];
    tabsEl.innerHTML = tabs.map(t =>
      `<button class="mn-tab${mState.tab === t.id ? ' active' : ''}" onclick="Mining.setTab('${t.id}')">${t.label}</button>`
    ).join('');
  }

  function renderContent() {
    const el = document.getElementById('mnContent');
    if (!el) return;
    if (!mState.db) return;

    if (mState.tab === 'minerales') el.innerHTML = renderMinerales();
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
      let va = a[col], vb = b[col];
      if (typeof va === 'string') return dir * va.localeCompare(vb);
      return dir * (vb - va);
    });

    const cols = [
      { key: 'name', label: 'Mineral' },
      { key: 'symbol', label: 'Símbolo' },
      { key: 'resistance', label: 'Resistencia' },
      { key: 'optMin', label: 'Ventana Óptima' },
      { key: 'instability', label: 'Inestabilidad' },
      { key: 'priceSCU', label: 'Precio/SCU' },
      { key: 'rarity', label: 'Rareza' },
    ];

    const thead = cols.map(c => {
      const active = mState.mineralSort === c.key;
      const arrow = active ? (mState.mineralSortDir === -1 ? ' ▼' : ' ▲') : '';
      return `<th class="mn-th${active ? ' active' : ''}" data-col="${c.key}">${c.label}${arrow}</th>`;
    }).join('');

    const rows = list.map(m => {
      const optBar = buildOptBar(m);
      const resBar = buildSimpleBar(m.resistance, '#e74c3c');
      const instBar = buildSimpleBar(m.instability, '#f39c12');
      const explosive = m.explosive ? ' <span class="mn-explosive-tag" title="Mineral explosivo">💥</span>' : '';
      return `<tr class="mn-mineral-row" style="border-left: 3px solid ${m.color}">
        <td><span class="mn-dot" style="background:${m.color}"></span>${m.name}${explosive}</td>
        <td><code class="mn-symbol">${m.symbol}</code></td>
        <td>${resBar} <span class="mn-val">${m.resistance}</span></td>
        <td>${optBar}</td>
        <td>${instBar} <span class="mn-val">${m.instability}</span></td>
        <td class="mn-price">${m.priceSCU.toLocaleString('es-ES')} aUEC</td>
        <td><span class="mn-rarity mn-rarity-${rarityClass(m.rarity)}">${m.rarity}</span></td>
      </tr>`;
    }).join('');

    return `
      <div class="mn-search-bar">
        <div class="search-box">
          <span class="search-icon">🔍</span>
          <input type="text" id="mnMineralSearch" class="mn-search-input" placeholder="Buscar mineral..." value="${escHtml(mState.mineralSearch)}" autocomplete="off" />
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
      <p class="mn-table-note">Haz clic en el encabezado de columna para ordenar. Los precios son aproximados en SC 4.7.0.</p>
    `;
  }

  function buildOptBar(m) {
    const pct = v => Math.min(100, Math.max(0, v));
    const left = pct(m.optMin);
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
    const map = {
      'Legendario': 'legendary',
      'Épico': 'epic',
      'Raro': 'rare',
      'Poco común': 'uncommon',
      'Común': 'common',
      'Abundante': 'abundant',
    };
    return map[r] || 'common';
  }

  // ============================================================
  // TAB: LOCALIZACIONES
  // ============================================================
  function renderLocalizaciones() {
    const { locations } = mState.db;
    const stantonLocs = locations.filter(l => l.system === 'Stanton');
    const pyroLocs = locations.filter(l => l.system === 'Pyro');

    const renderCards = (locs) => locs.map(loc => {
      const bodyIcon = loc.bodyType === 'asteroid_belt' ? '🪨' : loc.bodyType === 'moon' ? '🌙' : '🪐';
      const methodIcon = loc.method === 'ship' ? '🚀' : loc.method === 'ground' ? '🚗' : '🚀 🚗';
      const mineralChips = loc.minerals.map(mn => {
        const mObj = mState.db.minerals.find(m =>
          m.name === mn || m.name.toLowerCase() === mn.toLowerCase() ||
          mn.toLowerCase().includes(m.id.replace(/_/g, ' '))
        );
        const color = mObj ? mObj.color : '#888';
        return `<span class="mn-mineral-chip" style="border-color:${color};color:${color}">${mn}</span>`;
      }).join('');
      const diffClass = difficultyClass(loc.difficulty);
      return `<div class="mn-loc-card">
        <div class="mn-loc-header">
          <span class="mn-loc-icon">${bodyIcon}</span>
          <div class="mn-loc-title-block">
            <div class="mn-loc-name">${loc.name}</div>
            <div class="mn-loc-meta">${methodIcon} ${methodLabel(loc.method)}</div>
          </div>
          <span class="mn-difficulty-badge mn-diff-${diffClass}">${loc.difficulty}</span>
        </div>
        <div class="mn-mineral-chips">${mineralChips}</div>
        ${loc.notes ? `<div class="mn-loc-notes">${loc.notes}</div>` : ''}
      </div>`;
    }).join('');

    return `
      <div class="mn-sys-tabs">
        <button class="mn-sys-tab${mState.locSystem === 'Stanton' ? ' active' : ''}" onclick="Mining._setLocSystem('Stanton')">
          <span class="mn-sys-dot mn-sys-stanton"></span> Stanton
        </button>
        <button class="mn-sys-tab${mState.locSystem === 'Pyro' ? ' active' : ''}" onclick="Mining._setLocSystem('Pyro')">
          <span class="mn-sys-dot mn-sys-pyro"></span> Pyro
        </button>
      </div>
      <div class="mn-loc-grid">
        ${mState.locSystem === 'Stanton' ? renderCards(stantonLocs) : renderCards(pyroLocs)}
      </div>
    `;
  }

  function methodLabel(m) {
    return m === 'ship' ? 'Nave' : m === 'ground' ? 'Vehículo terrestre' : 'Nave y terrestre';
  }

  function difficultyClass(d) {
    const map = {
      'Muy baja': 'verylw',
      'Baja': 'low',
      'Media': 'med',
      'Alta': 'high',
      'Muy alta': 'veryhigh',
    };
    return map[d] || 'med';
  }

  // ============================================================
  // EVENT WIRING
  // ============================================================
  function wireEvents() {
    // Mineral search
    const searchInput = document.getElementById('mnMineralSearch');
    if (searchInput) {
      searchInput.addEventListener('input', e => {
        mState.mineralSearch = e.target.value;
        renderContent();
      });
    }

    // Table headers (sort)
    document.querySelectorAll('.mn-th[data-col]').forEach(th => {
      th.addEventListener('click', () => {
        const col = th.dataset.col;
        if (mState.mineralSort === col) {
          mState.mineralSortDir *= -1;
        } else {
          mState.mineralSort = col;
          mState.mineralSortDir = -1;
        }
        renderContent();
      });
    });

  }

  // ============================================================
  // PUBLIC HELPERS
  // ============================================================
  function _setLocSystem(sys) {
    mState.locSystem = sys;
    renderContent();
  }

  function _clearMineralSearch() {
    mState.mineralSearch = '';
    renderContent();
  }

  // ============================================================
  // UTILITIES
  // ============================================================
  function escHtml(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // ============================================================
  // PUBLIC API
  // ============================================================
  return {
    load,
    setTab,
    _setLocSystem,
    _clearMineralSearch,
  };

})();

window.Mining = Mining;
