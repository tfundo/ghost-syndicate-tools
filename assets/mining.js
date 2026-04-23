/* ===================================================
   GHOST SYNDICATE TOOLS — Mining Module
   Minerales · Localizaciones · Refinado
   SC 4.7.1 — Real game data from Data.p4k
   =================================================== */

'use strict';

const Mining = (() => {

  const UEX_BASE = 'https://api.uexcorp.space/2.0';
  const UEX_KEY  = '4996aae707d9ff2f23e17ab42cb51c71e549fa92';

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
    // Escáner tab
    scanInput: '',
    // Recursos tab
    resDb:      null,
    resLoaded:  false,
    resMineral: null,   // mineral name or null = hotspots view
    resSystem:  'all',  // 'all' | 'Stanton' | 'Pyro' | 'Nyx'
    resMethod:  'all',  // 'all' | 'ship' | 'ground' | 'fps' | 'both'
    // Refinado tab
    refLoaded:   false,
    refLoading:  false,
    refYields:   [],
    refMethods:  [],
    refCaps:     new Map(),
    refSelMineral: null,
  };

  let loaded = false;

  // ============================================================
  // LAZY LOAD — Recursos data
  // ============================================================
  async function loadResources() {
    if (mState.resLoaded && mState.resDb) return true;
    try {
      const res = await fetch('data/mining_resources.json');
      if (!res.ok) throw new Error('HTTP ' + res.status);
      mState.resDb     = await res.json();
      mState.resLoaded = true;
      return true;
    } catch (e) {
      const el = document.getElementById('mnContent');
      if (el) el.innerHTML = '<div class="mn-error">Error cargando recursos: ' + e.message + '</div>';
      return false;
    }
  }

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
      if (contentEl) contentEl.classList.remove('hidden');
      if (tabsEl)    tabsEl.classList.remove('hidden');
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
      { id: 'minerales', label: 'Minerales' },
      { id: 'escaner',   label: 'Escáner' },
      { id: 'recursos',  label: 'Ubicaciones' },
      { id: 'refinado',  label: '⚗ Refinado' },
    ].map(t =>
      `<button class="mn-tab${mState.tab === t.id ? ' active' : ''}" onclick="Mining.setTab('${t.id}')">${t.label}</button>`
    ).join('');
  }

  function renderContent() {
    const el = document.getElementById('mnContent');
    if (!el || !mState.db) return;

    const focusId  = document.activeElement?.id;
    const selStart = document.activeElement?.selectionStart;
    const selEnd   = document.activeElement?.selectionEnd;

    if (mState.tab === 'minerales') el.innerHTML = renderMinerales();
    else if (mState.tab === 'escaner')  el.innerHTML = renderEscaner();
    else if (mState.tab === 'recursos') { renderRecursosAsync(el); return; }
    else if (mState.tab === 'refinado') { renderRefAsync(el); return; }
    wireEvents();

    if (focusId) {
      const newEl = document.getElementById(focusId);
      if (newEl && el.contains(newEl)) {
        newEl.focus();
        try { newEl.setSelectionRange(selStart, selEnd); } catch (_) {}
      }
    }
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
        Haz clic en los encabezados para ordenar. Los precios son aproximados en SC 4.7.1.<br>
        <strong>Escáner:</strong> valor base (×1) del ping. El número sube con la concentración del mineral en la roca (×2–6 según rareza).
      </p>
    `;
  }

  // ============================================================
  // TAB: ESCÁNER
  // ============================================================
  function renderEscaner() {
    const { scanData } = mState.db;
    if (!scanData) return '<div class="mn-error">Sin datos de escáner en la base de datos.</div>';

    // ── Build lookup map: value → [{name, mult, catId, catRarity, catName}]
    const lookup = {};
    for (const cat of scanData.categories) {
      for (const min of cat.minerals) {
        for (let i = 1; i <= cat.maxMult; i++) {
          const val = min.scanBase * i;
          if (!lookup[val]) lookup[val] = [];
          lookup[val].push({ name: min.name, mult: i, catId: cat.id, catRarity: cat.rarity, catName: cat.name });
        }
      }
    }
    for (const sp of scanData.special) {
      sp.values.forEach((v, i) => {
        if (!lookup[v]) lookup[v] = [];
        lookup[v].push({ name: sp.name, mult: i + 1, catId: 'special', catRarity: null, catName: 'Especial' });
      });
    }

    // ── Lookup result
    let lookupResult = '';
    const raw = mState.scanInput.trim();
    if (raw) {
      const inputVal = parseInt(raw, 10);
      if (isNaN(inputVal)) {
        lookupResult = `<div class="mn-scan-result"><span class="mn-scan-result-none">Introduce un número válido.</span></div>`;
      } else {
        const exact = lookup[inputVal];
        if (exact && exact.length) {
          const cards = exact.map(m => {
            const rc = m.catId === 'special' ? 'special' : rarityClass(m.catRarity);
            return `<div class="mn-scan-match-big mn-scan-result-${rc}">
              <span class="mn-scan-match-name">${m.name}</span>
              <span class="mn-scan-match-mult">×${m.mult}</span>
              <span class="mn-scan-match-rarity">${m.catName}</span>
            </div>`;
          }).join('');
          lookupResult = `<div class="mn-scan-result mn-scan-result-found">${cards}</div>`;
        } else {
          // Closest ±200
          const close = Object.keys(lookup)
            .map(k => ({ k: +k, diff: Math.abs(+k - inputVal) }))
            .filter(x => x.diff > 0 && x.diff <= 200)
            .sort((a, b) => a.diff - b.diff)
            .slice(0, 5);
          if (close.length) {
            const items = close.map(c => {
              const ms = lookup[c.k];
              const badges = ms.map(m => {
                const rc = m.catId === 'special' ? 'special' : rarityClass(m.catRarity);
                return `<span class="mn-scan-badge mn-scan-${rc}">${m.name} ×${m.mult}</span>`;
              }).join(' ');
              return `<div class="mn-scan-close-item">
                <span class="mn-scan-close-val">${c.k.toLocaleString('es-ES')}</span>
                <span class="mn-scan-close-diff">(${c.diff > 0 ? '+' : ''}${+k - inputVal > 0 ? '+' : ''}${c.k - inputVal})</span>
                ${badges}
              </div>`;
            }).join('');
            lookupResult = `<div class="mn-scan-result mn-scan-result-close">
              <span class="mn-scan-result-none">Valor exacto ${inputVal.toLocaleString('es-ES')} no encontrado.</span>
              <span class="mn-scan-close-hint">Valores más cercanos:</span>
              ${items}
            </div>`;
          } else {
            lookupResult = `<div class="mn-scan-result">
              <span class="mn-scan-result-none">Sin coincidencias para ${inputVal.toLocaleString('es-ES')}.</span>
            </div>`;
          }
        }
      }
    }

    // ── Reference table (categories)
    const maxLvl = Math.max(...scanData.categories.map(c => c.maxMult));
    const lvlHeaders = Array.from({ length: maxLvl }, (_, i) =>
      `<th class="mn-scan-th mn-scan-th-lvl">×${i + 1}</th>`
    ).join('');

    const catRows = scanData.categories.map(cat => {
      const rc = rarityClass(cat.rarity);
      const header = `<tr class="mn-scan-cat-header">
        <td colspan="${maxLvl + 1}" class="mn-scan-cat-title">
          <span class="mn-rarity mn-rarity-${rc}">${cat.name}</span>
          <span class="mn-scan-cat-maxmult">máx ×${cat.maxMult}</span>
        </td>
      </tr>`;
      const rows = cat.minerals.map(min => {
        const cells = Array.from({ length: maxLvl }, (_, i) => {
          const lvl = i + 1;
          if (lvl > cat.maxMult) return `<td class="mn-scan-cell mn-scan-cell-empty"></td>`;
          return `<td class="mn-scan-cell mn-scan-cell-${rc}">${(min.scanBase * lvl).toLocaleString('es-ES')}</td>`;
        }).join('');
        return `<tr class="mn-scan-mineral-row"><td class="mn-scan-mineral-name">${min.name}</td>${cells}</tr>`;
      }).join('');
      return header + rows;
    }).join('');

    // ── Special table
    const maxSp = Math.max(...scanData.special.map(s => s.values.length));
    const spHeaders = Array.from({ length: maxSp }, (_, i) =>
      `<th class="mn-scan-th mn-scan-th-lvl">×${i + 1}</th>`
    ).join('');
    const spRows = scanData.special.map(sp => {
      const cells = Array.from({ length: maxSp }, (_, i) => {
        const v = sp.values[i];
        return v !== undefined
          ? `<td class="mn-scan-cell mn-scan-cell-special">${v.toLocaleString('es-ES')}</td>`
          : `<td class="mn-scan-cell mn-scan-cell-empty"></td>`;
      }).join('');
      return `<tr class="mn-scan-mineral-row"><td class="mn-scan-mineral-name">${sp.name}</td>${cells}</tr>`;
    }).join('');

    return `
      <div class="mn-scan-lookup">
        <div class="mn-scan-lookup-label">Identificar valor de escáner</div>
        <div class="mn-scan-lookup-row">
          <input type="number" id="mnScanInput" class="mn-scan-input"
            placeholder="p.ej. 7110" value="${escHtml(raw)}"
            oninput="Mining._setScanInput(this.value)" />
          ${raw ? `<button class="mn-scan-input-clear" onclick="Mining._setScanInput('')">✕</button>` : ''}
        </div>
        ${lookupResult}
      </div>

      <div class="mn-scan-section">
        <div class="mn-scan-section-title">Tabla de emisiones — minerales nave</div>
        <div class="mn-table-wrap">
          <table class="mn-table mn-scan-table">
            <thead><tr>
              <th class="mn-scan-th mn-scan-th-name">Mineral</th>
              ${lvlHeaders}
            </tr></thead>
            <tbody>${catRows}</tbody>
          </table>
        </div>
      </div>

      <div class="mn-scan-section">
        <div class="mn-scan-section-title">Categorías especiales</div>
        <p class="mn-table-note" style="margin-bottom:0.6rem">ROC, FPS y Salvage tienen rangos propios. El valor sube con el nivel de concentración de la roca.</p>
        <div class="mn-table-wrap">
          <table class="mn-table mn-scan-table">
            <thead><tr>
              <th class="mn-scan-th mn-scan-th-name">Tipo</th>
              ${spHeaders}
            </tr></thead>
            <tbody>${spRows}</tbody>
          </table>
        </div>
      </div>

      <p class="mn-table-note" style="margin-top:1rem">
        Valores de emisión del escáner según concentración (×1 mínimo → ×N máximo para esa rareza).
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
  function _setScanInput(v) { mState.scanInput = v; renderContent(); }

  // ============================================================
  // PUBLIC HELPERS — Recursos
  // ============================================================
  function _setResMineral(mn) { mState.resMineral = mn; renderContent(); }
  function _setResSystem(sys) { mState.resSystem  = sys; renderContent(); }
  function _setResMethod(m)   { mState.resMethod   = m;  renderContent(); }

  // ============================================================
  // TAB: RECURSOS
  // ============================================================

  async function renderRecursosAsync(el) {
    if (!mState.resLoaded) {
      el.innerHTML = '<div class="mn-res-loading"><div class="spinner"></div>Cargando datos de recursos…</div>';
    }
    const ok = await loadResources();
    if (!ok) return;
    el.innerHTML = renderRecursos();
  }

  function renderRecursos() {
    const { minerals, hotspots } = mState.resDb;

    // ── Mineral chips sorted by rarity tier then name
    const rarityOrder = { legendary: 0, epic: 1, rare: 2, uncommon: 3, common: 4 };
    const mineralNames = Object.keys(minerals).sort((a, b) => {
      const ra = rarityOrder[minerals[a].rarity] ?? 5;
      const rb = rarityOrder[minerals[b].rarity] ?? 5;
      return ra !== rb ? ra - rb : a.localeCompare(b);
    });

    const chips = mineralNames.map(mn => {
      const rc     = rarityClass(minerals[mn].rarity || 'common');
      const active = mState.resMineral === mn;
      return `<button class="mn-res-chip mn-res-chip-${rc}${active ? ' active' : ''}"
        onclick="Mining._setResMineral(${active ? 'null' : `'${mn.replace(/'/g, "\\'")}'`})">${mn}</button>`;
    }).join('');

    const content = mState.resMineral
      ? renderResLocations()
      : renderResHotspots(hotspots);

    return `
      <div class="mn-res-layout">
        <div class="mn-res-mineral-panel">
          <span class="mn-filter-label">Seleccionar mineral</span>
          <div class="mn-res-chips">${chips}</div>
        </div>
        <div class="mn-res-content">${content}</div>
      </div>`;
  }

  function renderResLocations() {
    const { minerals } = mState.resDb;
    const mn   = mState.resMineral;
    const data = minerals[mn];
    if (!data) return '<div class="mn-no-results">Mineral no encontrado.</div>';

    let locs = data.locations;
    if (mState.resSystem !== 'all') locs = locs.filter(l => l.system === mState.resSystem);
    if (mState.resMethod !== 'all') locs = locs.filter(l => l.method === mState.resMethod);

    const rc  = rarityClass(data.rarity || 'common');
    const header = `
      <div class="mn-res-mineral-header">
        <span class="mn-rarity mn-rarity-${rc}">${data.rarity || '—'}</span>
        <span class="mn-res-mineral-name">${mn}</span>
        <span class="mn-res-loc-count">${locs.length} de ${data.locations.length} localizaciones</span>
        <button class="mn-res-chip mn-res-chip-${rc} active" style="margin-left:auto"
          onclick="Mining._setResMineral(null)">✕ Limpiar</button>
      </div>`;

    if (!locs.length) {
      return header + '<div class="mn-no-results">Sin localizaciones con los filtros activos.</div>';
    }

    const cards = locs.map(loc => {
      const pct = data.maxConc > 0 ? (loc.concentration / data.maxConc * 100) : 0;
      return `<div class="mn-res-loc-card">
        <div class="mn-res-loc-top">
          <span class="mn-res-type-icon">${resTypeIcon(loc.type)}</span>
          <div class="mn-res-loc-info">
            <div class="mn-res-loc-name">${loc.location}</div>
            <div class="mn-res-loc-meta">
              <span class="mn-res-sys-badge ${resSysClass(loc.system)}">${loc.system}</span>
              <span class="mn-res-method-badge">${resMethodIcon(loc.method)} ${resMethodLabel(loc.method)}</span>
            </div>
          </div>
          <div class="mn-res-conc-label">${(loc.concentration * 100).toFixed(2)}%</div>
        </div>
        <div class="mn-res-bar-wrap">
          <div class="mn-res-bar-fill mn-res-bar-${rc}" style="width:${pct.toFixed(1)}%"></div>
        </div>
      </div>`;
    }).join('');

    return header + `<div class="mn-res-loc-list">${cards}</div>`;
  }

  function renderResHotspots(hotspots) {
    let filtered = hotspots;
    if (mState.resSystem !== 'all') filtered = filtered.filter(h => h.system === mState.resSystem);
    if (mState.resMethod !== 'all') filtered = filtered.filter(h => h.method === mState.resMethod);

    if (!filtered.length) return '<div class="mn-no-results">Sin localizaciones con esos filtros.</div>';

    const { minerals } = mState.resDb;

    const cards = filtered.map(h => {
      const mineralBars = h.topMinerals.map(tm => {
        const mData  = minerals[tm.mineral];
        const maxConc = mData ? mData.maxConc : tm.concentration;
        const pct    = maxConc > 0 ? (tm.concentration / maxConc * 100) : 0;
        const rc     = rarityClass(mData?.rarity || 'common');
        return `<div class="mn-res-hotspot-mineral">
          <span class="mn-res-hs-name mn-res-chip-${rc}">${tm.mineral}</span>
          <div class="mn-res-bar-wrap mn-res-bar-sm">
            <div class="mn-res-bar-fill mn-res-bar-${rc}" style="width:${pct.toFixed(1)}%"></div>
          </div>
          <span class="mn-res-hs-conc">${(tm.concentration * 100).toFixed(2)}%</span>
        </div>`;
      }).join('');

      return `<div class="mn-res-hotspot-card">
        <div class="mn-res-loc-top">
          <span class="mn-res-type-icon">${resTypeIcon(h.type)}</span>
          <div class="mn-res-loc-info">
            <div class="mn-res-loc-name">${h.location}</div>
            <div class="mn-res-loc-meta">
              <span class="mn-res-sys-badge ${resSysClass(h.system)}">${h.system}</span>
              <span class="mn-res-method-badge">${resMethodIcon(h.method)} ${resMethodLabel(h.method)}</span>
            </div>
          </div>
        </div>
        <div class="mn-res-hotspot-minerals">${mineralBars}</div>
      </div>`;
    }).join('');

    return `
      <div class="mn-res-hotspot-header">
        Distribución por localización
        <span class="mn-res-hs-hint">Selecciona un mineral para ver su distribución completa en todas las zonas.</span>
      </div>
      <div class="mn-res-hotspot-grid">${cards}</div>`;
  }

  // ── Helpers
  function resTypeIcon(t) {
    return { belt:'⬡', moon:'🌙', planet:'🪐', cluster:'✦', cave:'⛰', lagrange:'⬦', event:'⚡', special:'⊕' }[t] || '◈';
  }
  function resMethodIcon(m) {
    return { ship:'🚀', ground:'🚗', fps:'🔫', both:'🚀🚗', salvage:'🔧' }[m] || '';
  }
  function resMethodLabel(m) {
    return { ship:'Nave', ground:'ROC', fps:'FPS', both:'Nave+ROC', salvage:'Salvage' }[m] || m;
  }
  function resSysClass(s) {
    return { Stanton:'mn-res-sys-stanton', Pyro:'mn-res-sys-pyro', Nyx:'mn-res-sys-nyx' }[s] || '';
  }

  // ============================================================
  // UTILITIES
  // ============================================================
  function escHtml(str) {
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  // ============================================================
  // TAB: REFINADO — UEX Corp API
  // ============================================================
  async function uexFetch(ep) {
    const r = await fetch(UEX_BASE + ep, { headers: { Authorization: 'Bearer ' + UEX_KEY } });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const j = await r.json();
    if (j.status !== 'ok') throw new Error(j.message || 'API error');
    return j.data || [];
  }

  async function loadRefData() {
    if (mState.refLoaded || mState.refLoading) return;
    mState.refLoading = true;
    const el = document.getElementById('mnContent');
    if (el) el.innerHTML = '<div class="loading-state"><div class="loading-spinner"></div><p>Cargando datos de refinerías...</p></div>';
    try {
      const [yields, methods, caps] = await Promise.all([
        uexFetch('/refineries_yields/'),
        uexFetch('/refineries_methods/'),
        uexFetch('/refineries_capacities/'),
      ]);
      mState.refYields  = yields;
      mState.refMethods = methods;
      mState.refCaps    = new Map();
      for (const c of caps) mState.refCaps.set(+c.id_terminal, +c.value);
      mState.refLoaded  = true;
    } catch (e) {
      if (el) el.innerHTML = '<div class="mn-error">Error cargando refinerías: ' + escHtml(e.message) +
        ' <button class="btn-ghost" onclick="Mining._loadRef()">↺ Reintentar</button></div>';
      mState.refLoading = false;
      return;
    }
    mState.refLoading = false;
    if (mState.tab === 'refinado') {
      const el2 = document.getElementById('mnContent');
      if (el2) { el2.innerHTML = renderRefinado(); }
    }
  }

  function renderRefAsync(el) {
    if (!mState.refLoaded) { loadRefData(); return; }
    el.innerHTML = renderRefinado();
  }

  function renderRefinado() {
    function starsHtml(n, max) {
      return '★'.repeat(n) + '☆'.repeat((max||3) - n);
    }
    function fmtN(n) { return (+n).toLocaleString('en-US', { maximumFractionDigits: 0 }); }

    // ── Methods grid ──
    const methodCards = mState.refMethods.map(m => {
      const yld   = m.rating_yield;
      const cost  = 4 - m.rating_cost;  // invert: cheaper = more stars
      const speed = m.rating_speed;
      const topCls= (yld === 3 || speed === 3 || cost === 3) ? ' ref-method-top' : '';
      return `<div class="ref-method-card${topCls}">
        <div class="ref-method-name">${escHtml(m.name)}</div>
        <div class="ref-method-code">${escHtml(m.code)}</div>
        <div class="ref-method-ratings">
          <div class="ref-rating-row">
            <span class="ref-rating-lbl">Rendimiento</span>
            <span class="ref-stars ref-stars-yield">${starsHtml(yld)}</span>
          </div>
          <div class="ref-rating-row">
            <span class="ref-rating-lbl">Coste</span>
            <span class="ref-stars ref-stars-cost">${starsHtml(cost)}</span>
          </div>
          <div class="ref-rating-row">
            <span class="ref-rating-lbl">Velocidad</span>
            <span class="ref-stars ref-stars-speed">${starsHtml(speed)}</span>
          </div>
        </div>
      </div>`;
    }).join('');

    // ── Mineral chips ──
    const mineralMap = new Map();
    for (const y of mState.refYields) {
      if (!mineralMap.has(+y.id_commodity)) {
        mineralMap.set(+y.id_commodity, y.commodity_name || '—');
      }
    }
    const mineralList = [...mineralMap.entries()].sort((a,b) => a[1].localeCompare(b[1]));

    const chips = mineralList.map(([id, name]) => {
      const active = mState.refSelMineral === id ? ' active' : '';
      return `<button class="mn-tab ref-mineral-chip${active}" onclick="Mining._selectRefMineral(${id})">${escHtml(name)}</button>`;
    }).join('');

    // ── Yields table ──
    let yieldsHtml = '';
    if (mState.refSelMineral) {
      const name    = mineralMap.get(mState.refSelMineral) || '—';
      const entries = mState.refYields
        .filter(y => +y.id_commodity === mState.refSelMineral)
        .sort((a, b) => +b.value - +a.value);

      const rows = entries.map(y => {
        const val    = +y.value;
        const cap    = mState.refCaps.get(+y.id_terminal);
        const cls    = val > 0 ? 'ref-yield-pos' : val < 0 ? 'ref-yield-neg' : 'ref-yield-neu';
        const str    = val > 0 ? `+${val}%` : `${val}%`;
        const loc    = [y.moon_name, y.planet_name, y.star_system_name].find(Boolean) || '';
        return `<tr>
          <td>${escHtml(y.terminal_name||'—')}${loc?`<br><span class="mn-res-loc">${escHtml(loc)}</span>`:''}</td>
          <td class="ref-yield-big ${cls}">${str}</td>
          <td class="mn-res-num">${cap ? fmtN(cap)+' SCU' : '—'}</td>
        </tr>`;
      }).join('');

      yieldsHtml = `
        <div class="ref-yields-header">
          <strong>${escHtml(name)}</strong>
          <span class="mn-res-muted">· ${entries.length} refinerías con datos</span>
          <button class="mn-tab" style="margin-left:auto;padding:0.2rem 0.6rem;font-size:0.7rem" onclick="Mining._selectRefMineral(null)">✕ Quitar</button>
        </div>
        <div class="trd-table-wrap">
          <table class="trd-table">
            <thead><tr>
              <th>Refinería</th>
              <th>Bonificación rendimiento</th>
              <th>Capacidad</th>
            </tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>`;
    } else {
      // Overview: top bonuses across all minerals
      const topRows = [...mState.refYields]
        .sort((a, b) => +b.value - +a.value)
        .slice(0, 30)
        .map(y => {
          const val  = +y.value;
          const cap  = mState.refCaps.get(+y.id_terminal);
          const cls  = val > 0 ? 'ref-yield-pos' : val < 0 ? 'ref-yield-neg' : 'ref-yield-neu';
          const str  = val > 0 ? `+${val}%` : `${val}%`;
          const loc  = [y.moon_name, y.planet_name, y.star_system_name].find(Boolean) || '';
          return `<tr>
            <td>${escHtml(y.commodity_name||'—')}</td>
            <td>${escHtml(y.terminal_name||'—')}${loc?`<br><span class="mn-res-loc">${escHtml(loc)}</span>`:''}</td>
            <td class="ref-yield-big ${cls}">${str}</td>
            <td class="mn-res-num">${cap ? fmtN(cap)+' SCU' : '—'}</td>
          </tr>`;
        }).join('');

      yieldsHtml = `
        <p class="ref-section-hint">Top 30 mejores bonificaciones de rendimiento · Selecciona un mineral para ver todas sus refinerías</p>
        <div class="trd-table-wrap">
          <table class="trd-table">
            <thead><tr>
              <th>Mineral</th><th>Refinería</th>
              <th>Bonificación</th><th>Capacidad</th>
            </tr></thead>
            <tbody>${topRows}</tbody>
          </table>
        </div>`;
    }

    return `
      <div class="ref-methods-section">
        <div class="ref-section-title">⚙ Métodos de refinado</div>
        <div class="ref-methods-grid">${methodCards}</div>
      </div>
      <div class="ref-yields-section">
        <div class="ref-section-title">📊 Bonificación por mineral y refinería</div>
        <div class="ref-mineral-chips-wrap">${chips}</div>
        ${yieldsHtml}
      </div>
      <p class="trd-attribution">Datos de la comunidad vía <a href="https://uexcorp.space" target="_blank" rel="noopener">UEX Corp</a></p>`;
  }

  // ============================================================
  // PUBLIC API
  // ============================================================
  return { load, setTab, _setLocSystem, _setLocMineral, _setLocMethod, _setLocDiff, _resetLocFilters, _clearMineralSearch, _setScanInput, _setResMineral, _setResSystem, _setResMethod,
    _loadRef: loadRefData,
    _selectRefMineral(id) { mState.refSelMineral = id === null ? null : +id; renderContent(); },
  };

})();

window.Mining = Mining;
