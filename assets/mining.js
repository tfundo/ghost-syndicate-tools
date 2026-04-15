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
    // Configurador
    ship: null,
    lasers: [null, null, null],
    // 3D: [slot_idx][module_slot_idx] — up to 3 module slots per laser
    modules: [[null, null, null], [null, null, null], [null, null, null]],
    gadget: null,
    mineral: null,
    rockMassKg: 3000,
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
      { id: 'configurador', label: 'Configurador' },
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
    else if (mState.tab === 'configurador') el.innerHTML = renderConfigurador();

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
  // TAB: CONFIGURADOR
  // ============================================================
  function renderConfigurador() {
    const { ships, laserHeads, modules, gadgets, minerals } = mState.db;

    // Ship cards
    const shipCards = ships.map(s => {
      const sel = mState.ship && mState.ship.id === s.id;
      const typeIcon = s.type === 'ground' ? '🚗' : '🚀';
      return `<div class="mn-ship-card${sel ? ' selected' : ''}" onclick="Mining._selectShip('${s.id}')">
        <div class="mn-ship-icon">${typeIcon}</div>
        <div class="mn-ship-name">${s.name}</div>
        <div class="mn-ship-stats">
          <span>${s.laserSlots} láser${s.laserSlots > 1 ? 'es' : ''}</span>
          <span>${s.cargoSCU} SCU</span>
        </div>
        ${s.notes ? `<div class="mn-ship-note">${s.notes}</div>` : ''}
      </div>`;
    }).join('');

    // Laser slots (only when ship selected)
    let laserSlotsHtml = '';
    if (mState.ship) {
      const slotCount = mState.ship.laserSlots;
      const laserSize = mState.ship.laserSize;
      const compatLasers = laserHeads.filter(l => l.size === laserSize);

      const slotCols = slotCount === 3 ? 'mn-laser-cols-3' : slotCount === 2 ? 'mn-laser-cols-2' : '';

      const slots = Array.from({ length: slotCount }, (_, i) => {
        const selLaser = mState.lasers[i];
        const moduleSlotCount = selLaser ? selLaser.moduleSlots : 0;

        const laserOpts = `<option value="">— Seleccionar láser —</option>` +
          compatLasers.map(l => {
            const rng = l.rangeMin === l.rangeMax ? `${l.rangeMin}m` : `${l.rangeMin}–${l.rangeMax}m`;
            return `<option value="${l.id}"${selLaser && selLaser.id === l.id ? ' selected' : ''}>${l.name} (${l.powerMax} · Rng ${rng})</option>`;
          }).join('');

        // Module dropdowns — dynamic count based on selected laser's moduleSlots
        let modulesHtml = '';
        if (selLaser === null) {
          modulesHtml = `<div class="mn-module-hint">Selecciona un láser para ver sus ranuras de módulo.</div>`;
        } else if (moduleSlotCount === 0) {
          modulesHtml = `<div class="mn-module-hint mn-module-none">Este láser no tiene ranuras de módulo.</div>`;
        } else {
          const modOpts = `<option value="">— Sin módulo —</option>` +
            modules.map(m =>
              `<option value="${m.id}">${m.name}${m.filterOnly ? ' (filtro)' : ''}</option>`
            ).join('');

          modulesHtml = Array.from({ length: moduleSlotCount }, (_, mi) => {
            const selMod = mState.modules[i][mi];
            const curOpts = `<option value="">— Sin módulo —</option>` +
              modules.map(m =>
                `<option value="${m.id}"${selMod && selMod.id === m.id ? ' selected' : ''}>${m.name}${m.filterOnly ? ' (filtro)' : ''}</option>`
              ).join('');
            return `<select class="mn-select mn-select-sm" data-action="module" data-slot="${i}" data-modslot="${mi}">${curOpts}</select>`;
          }).join('');
        }

        // Show laser stats if selected
        let laserStatsHtml = '';
        if (selLaser) {
          const signFmt = (v) => v > 0 ? `+${v}%` : v < 0 ? `${v}%` : '0%';
          laserStatsHtml = `<div class="mn-laser-stats">
            <span title="Inestabilidad modificada">Instab: <b>${signFmt(selLaser.instabMod)}</b></span>
            <span title="Tamaño de ventana óptima modificado">Ventana: <b>${signFmt(selLaser.windowSizeMod)}</b></span>
            <span title="Resistencia modificada">Resist: <b>${signFmt(selLaser.resMod)}</b></span>
            <span title="Velocidad de carga en ventana modificada">Carga: <b>${signFmt(selLaser.windowRateMod)}</b></span>
          </div>`;
        }

        return `<div class="mn-slot-card">
          <div class="mn-slot-label">Láser ${i + 1}</div>
          <select class="mn-select" data-action="laser" data-slot="${i}">${laserOpts}</select>
          ${laserStatsHtml}
          <div class="mn-module-row">${modulesHtml}</div>
        </div>`;
      }).join('');

      laserSlotsHtml = `<div class="mn-section-title">Láseres y Módulos</div>
        <div class="mn-laser-slots ${slotCols}">${slots}</div>`;
    }

    // Gadget (1 per rock)
    const gadgetOpts = gadgets.map(g =>
      `<option value="${g.id}"${mState.gadget && mState.gadget.id === g.id ? ' selected' : ''}>${g.name}</option>`
    ).join('');

    const gadgetSection = `<div class="mn-section-title">Gadget de Roca <span class="mn-section-hint">(1 por roca)</span></div>
      <select class="mn-select" data-action="gadget">${gadgetOpts}</select>`;

    // Rock section
    const presets = [
      { label: 'Tiny', kg: 200 },
      { label: 'Pequeña', kg: 800 },
      { label: 'Media', kg: 3000 },
      { label: 'Grande', kg: 12000 },
      { label: 'Masiva', kg: 50000 },
    ];
    const presetBtns = presets.map(p =>
      `<button class="mn-preset-btn${mState.rockMassKg === p.kg ? ' active' : ''}" onclick="Mining._setRockMass(${p.kg})">${p.label}<br><small>${p.kg >= 1000 ? (p.kg / 1000) + 't' : p.kg + 'kg'}</small></button>`
    ).join('');

    const mineralOpts = `<option value="">— Seleccionar mineral —</option>` +
      minerals.map(m =>
        `<option value="${m.id}"${mState.mineral && mState.mineral.id === m.id ? ' selected' : ''}>${m.name} (Res:${m.resistance} · ${m.priceSCU.toLocaleString('es-ES')} aUEC/SCU)</option>`
      ).join('');

    const rockSection = `<div class="mn-section-title">Mineral y Roca</div>
      <select class="mn-select" data-action="mineral">${mineralOpts}</select>
      <div class="mn-preset-grid">${presetBtns}</div>
      <div class="mn-custom-mass">
        <label class="mn-label">Masa personalizada (kg):</label>
        <input type="number" id="mnCustomMass" class="mn-input" value="${mState.rockMassKg}" min="100" max="500000" step="100" />
      </div>`;

    const results = renderResults();

    return `<div class="mn-config-layout">
      <div class="mn-config-panel">
        <div class="mn-section-title">Nave</div>
        <div class="mn-ship-grid">${shipCards}</div>
        ${laserSlotsHtml}
        ${gadgetSection}
        ${rockSection}
      </div>
      <div class="mn-results-panel">
        ${results}
      </div>
    </div>`;
  }

  // ============================================================
  // RESULTS PANEL
  // ============================================================
  function renderResults() {
    const sim = simulate();

    if (!sim) {
      return `<div class="mn-results-placeholder">
        <div class="mn-results-icon">⛏</div>
        <p>Selecciona una nave, láser y mineral para simular.</p>
      </div>`;
    }

    const mineral = mState.mineral;
    const meterHtml = buildWindowMeter(sim, mineral);

    const throttleColor = sim.recommendedThrottle > 80 ? '#ef4444' :
                          sim.recommendedThrottle > 50 ? '#f39c12' : '#10b981';

    const tipsHtml = sim.tips.length
      ? `<ul class="mn-tips">${sim.tips.map(t => `<li>${t}</li>`).join('')}</ul>`
      : '';

    const estTime = sim.estimatedTimeSec;
    const timeStr = estTime >= 60
      ? `${Math.floor(estTime / 60)}m ${estTime % 60}s`
      : `${estTime}s`;

    return `
      <div class="mn-results">
        <div class="mn-verdict mn-verdict-${sim.verdictClass}">${sim.verdict}</div>
        ${meterHtml}
        <div class="mn-throttle-section">
          <div class="mn-throttle-label">Throttle recomendado</div>
          <div class="mn-throttle-gauge">
            <div class="mn-throttle-fill" style="width:${Math.min(100, sim.recommendedThrottle)}%;background:${throttleColor}"></div>
          </div>
          <div class="mn-throttle-value" style="color:${throttleColor}">${sim.recommendedThrottle}%</div>
        </div>
        <div class="mn-stat-grid">
          <div class="mn-stat">
            <div class="mn-stat-val">${sim.totalPower.toLocaleString('es-ES')}</div>
            <div class="mn-stat-label">Potencia total</div>
          </div>
          <div class="mn-stat">
            <div class="mn-stat-val">${sim.chargeRate100}%/s</div>
            <div class="mn-stat-label">Vel. carga (100%)</div>
          </div>
          <div class="mn-stat">
            <div class="mn-stat-val">${sim.effectiveWindowSize.toFixed(1)}%</div>
            <div class="mn-stat-label">Ancho ventana</div>
          </div>
          <div class="mn-stat">
            <div class="mn-stat-val">${sim.effectiveInstability.toFixed(1)}</div>
            <div class="mn-stat-label">Inestabilidad</div>
          </div>
          <div class="mn-stat">
            <div class="mn-stat-val">${sim.effectiveResistance.toFixed(1)}</div>
            <div class="mn-stat-label">Resistencia efect.</div>
          </div>
          <div class="mn-stat">
            <div class="mn-stat-val">${timeStr}</div>
            <div class="mn-stat-label">Tiempo est.</div>
          </div>
        </div>
        ${tipsHtml}
      </div>
    `;
  }

  function buildWindowMeter(sim, mineral) {
    if (!mineral) return '';
    const color = mineral.color;
    const optMin = sim.adjustedOptMin;
    const optMax = sim.adjustedOptMax;
    const throttlePct = Math.min(100, sim.recommendedThrottle);

    return `<div class="mn-window-meter-wrap">
      <div class="mn-meter-label">Ventana Óptima (0–100%)</div>
      <div class="mn-window-meter">
        <div class="mn-window-zone" style="left:${optMin}%;width:${optMax - optMin}%;background:${color}33;border-color:${color}88"></div>
        <div class="mn-window-cursor" style="left:${throttlePct}%" title="Throttle recomendado: ${throttlePct}%"></div>
        <div class="mn-meter-tick" style="left:${optMin}%"><span>${optMin.toFixed(0)}%</span></div>
        <div class="mn-meter-tick mn-meter-tick-r" style="left:${optMax}%"><span>${optMax.toFixed(0)}%</span></div>
      </div>
    </div>`;
  }

  // ============================================================
  // SIMULATION (new model from real game data)
  // ============================================================
  const CALIB_K = 40;

  function simulate() {
    const ship = mState.ship;
    const mineral = mState.mineral;
    const rockMass = mState.rockMassKg;

    if (!ship || !mineral) return null;

    const activeLasers = mState.lasers.slice(0, ship.laserSlots).filter(l => l !== null);
    if (activeLasers.length === 0) return null;

    // Gadget effects
    const g = mState.gadget && mState.gadget.id !== 'none' ? mState.gadget : null;
    const gadgetPowerMod   = g ? g.powerMod       : 1.0;
    const gadgetInstabMod  = g ? g.instabilityMod  : 0;   // percentage additive
    const gadgetResMod     = g ? g.resistanceMod   : 0;   // percentage additive

    // Accumulate per-slot power and modifiers
    let totalPower = 0;
    let sumLaserInstabMod  = 0;  // laser instab % modifier (averaged)
    let sumLaserResMod     = 0;  // laser resistance % modifier (averaged)
    let sumLaserWindowMod  = 0;  // laser window size % modifier (averaged)
    let sumLaserRateMod    = 0;  // laser window rate % modifier (averaged)
    let sumModWindowMod    = 0;  // sum of module window size mods across all slots
    let sumModRateMod      = 0;  // sum of module window rate mods across all slots

    activeLasers.forEach((laser, slotIdx) => {
      // Module power multiplier for this slot
      let slotPowerMod = 1.0;
      let slotModWindowMod = 0;
      let slotModRateMod = 0;

      const modSlotCount = laser.moduleSlots;
      for (let mi = 0; mi < modSlotCount; mi++) {
        const mod = mState.modules[slotIdx][mi];
        if (mod && !mod.filterOnly) {
          slotPowerMod   *= mod.powerMod;
          slotModWindowMod += (mod.windowSizeMod || 0);
          slotModRateMod   += (mod.windowRateMod || 0);
        }
      }

      // Slot power at 100% throttle, with modules applied
      const slotPower = laser.powerMax * slotPowerMod * gadgetPowerMod;
      totalPower += slotPower;

      sumLaserInstabMod += laser.instabMod;
      sumLaserResMod    += laser.resMod;
      sumLaserWindowMod += laser.windowSizeMod;
      sumLaserRateMod   += laser.windowRateMod;
      sumModWindowMod   += slotModWindowMod;
      sumModRateMod     += slotModRateMod;
    });

    const n = activeLasers.length;
    const avgLaserInstabMod = sumLaserInstabMod / n;
    const avgLaserResMod    = sumLaserResMod / n;
    const avgLaserWindowMod = sumLaserWindowMod / n;
    const avgLaserRateMod   = sumLaserRateMod / n;

    // Effective stats
    const effectiveResistance  = mineral.resistance * (1 + (avgLaserResMod + gadgetResMod) / 100);
    const effectiveInstability = mineral.instability * (1 + (avgLaserInstabMod + gadgetInstabMod) / 100);

    const baseWindowSize = mineral.optMax - mineral.optMin;
    const totalWindowMod = avgLaserWindowMod + sumModWindowMod; // module mods are NOT averaged — stacked
    const effectiveWindowSize = Math.max(3, baseWindowSize * (1 + totalWindowMod / 100));

    const windowRateMultiplier = 1 + (avgLaserRateMod + sumModRateMod) / 100;

    // Adjusted window position (centered around mineral optMin, widened/narrowed)
    const windowCenter = (mineral.optMin + mineral.optMax) / 2;
    const halfNew = effectiveWindowSize / 2;
    const adjustedOptMin = Math.max(0, windowCenter - halfNew);
    const adjustedOptMax = Math.min(100, windowCenter + halfNew);

    // Charge rate at 100% throttle (% of bar per second)
    const chargeRate100 = totalPower / (Math.max(1, effectiveResistance) * CALIB_K);

    // Recommended throttle: aim to fill the window in ~4 seconds
    const targetRate = effectiveWindowSize / 4;  // % per second
    let recommendedThrottleFrac = Math.min(1.0, targetRate / Math.max(0.001, chargeRate100));
    // Enforce all active lasers' minimum throttle
    const maxThrottleMin = Math.max(...activeLasers.map(l => l.throttleMin));
    recommendedThrottleFrac = Math.max(recommendedThrottleFrac, maxThrottleMin);
    recommendedThrottleFrac = Math.min(1.0, recommendedThrottleFrac);

    const chargeRateAtThrottle = chargeRate100 * recommendedThrottleFrac;
    const difficultyRatio = effectiveInstability / Math.max(1, effectiveWindowSize);

    // Estimated time: fill window + drain (simplified: ~window / chargeRate fill, then extraction
    // For ROC-scale rocks we use rockMass as a proxy: ~1 cycle per 100kg
    const fillTimeSec = effectiveWindowSize / Math.max(0.01, chargeRateAtThrottle);
    const cycles = Math.max(1, Math.round(rockMass / 500));
    const estimatedTotalSec = Math.round(fillTimeSec * cycles * 0.5 + cycles * 3);

    // Verdict
    let verdict, verdictClass, tips = [];

    if (chargeRate100 < 0.3) {
      verdict = 'INSUFICIENTE';
      verdictClass = 'insufficient';
      tips.push('La potencia combinada es demasiado baja para cargar la barra de forma efectiva.');
      tips.push('Prueba un láser más potente, usa módulos Rieger o el gadget Surge en la roca.');
    } else if (chargeRate100 * (maxThrottleMin) > effectiveWindowSize * 2) {
      verdict = 'EXCESIVA';
      verdictClass = 'excess';
      tips.push('Incluso al mínimo de throttle, el láser supera la ventana óptima con demasiada rapidez.');
      tips.push('Usa módulos Focus o XTR para ampliar la ventana, o cambia a un láser menos potente.');
    } else if (difficultyRatio > 1.5) {
      verdict = 'CRÍTICO';
      verdictClass = 'critical';
      tips.push('La inestabilidad supera ampliamente la ventana óptima. Muy difícil de controlar.');
      tips.push('Usa módulos Focus para ampliar ventana, o gadget Lifeline/Optimum en la roca.');
      if (mineral.explosive) tips.push('⚠️ Mineral explosivo: un error puede destruir la roca.');
    } else if (difficultyRatio > 0.8) {
      verdict = 'DIFÍCIL';
      verdictClass = 'hard';
      tips.push('Manejable con experiencia. La ventana es estrecha respecto a la inestabilidad.');
      if (mineral.explosive) tips.push('⚠️ Mineral explosivo: mantén control constante del throttle.');
    } else if (difficultyRatio > 0.4) {
      verdict = 'MODERADO';
      verdictClass = 'medium';
      tips.push('Configuración viable. Mantén el throttle cerca del valor recomendado.');
      if (mineral.explosive) tips.push('⚠️ Mineral explosivo: mantén el control del throttle.');
    } else {
      verdict = 'FACTIBLE';
      verdictClass = 'easy';
      tips.push('Configuración óptima. Deberías poder romper la roca sin problemas.');
      if (mineral.explosive) tips.push('⚠️ Mineral explosivo: aunque es fácil, mantén siempre control del throttle.');
    }

    return {
      verdict,
      verdictClass,
      totalPower: Math.round(totalPower),
      chargeRate100: Math.round(chargeRate100 * 10) / 10,
      chargeRateAtThrottle: Math.round(chargeRateAtThrottle * 10) / 10,
      recommendedThrottle: Math.round(recommendedThrottleFrac * 100),
      effectiveWindowSize: Math.round(effectiveWindowSize * 10) / 10,
      adjustedOptMin: Math.round(adjustedOptMin * 10) / 10,
      adjustedOptMax: Math.round(adjustedOptMax * 10) / 10,
      effectiveInstability: Math.round(effectiveInstability * 10) / 10,
      effectiveResistance: Math.round(effectiveResistance * 10) / 10,
      difficultyRatio: Math.round(difficultyRatio * 100) / 100,
      windowRateMultiplier: Math.round(windowRateMultiplier * 100) / 100,
      estimatedTimeSec: estimatedTotalSec,
      activeLaserCount: activeLasers.length,
      tips,
    };
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

    // Configurador selects
    document.querySelectorAll('.mn-select[data-action]').forEach(sel => {
      sel.addEventListener('change', () => {
        const action = sel.dataset.action;
        const slot = parseInt(sel.dataset.slot || 0);
        const modSlot = parseInt(sel.dataset.modslot || 0);
        const val = sel.value;
        const { laserHeads, modules, gadgets } = mState.db;

        if (action === 'laser') {
          const newLaser = val ? laserHeads.find(l => l.id === val) : null;
          mState.lasers[slot] = newLaser;
          // Clear module selections for this slot when laser changes
          mState.modules[slot] = [null, null, null];
          // Full re-render to update module dropdowns for this slot
          renderContent();
          return;
        } else if (action === 'module') {
          mState.modules[slot][modSlot] = val ? modules.find(m => m.id === val) : null;
        } else if (action === 'gadget') {
          mState.gadget = val ? gadgets.find(g => g.id === val) : null;
        } else if (action === 'mineral') {
          mState.mineral = val ? mState.db.minerals.find(m => m.id === val) : null;
        }

        // Re-render only results panel for non-laser changes
        const resultsPanel = document.querySelector('.mn-results-panel');
        if (resultsPanel) {
          resultsPanel.innerHTML = renderResults();
        }
      });
    });

    // Custom mass input
    const massInput = document.getElementById('mnCustomMass');
    if (massInput) {
      massInput.addEventListener('change', e => {
        const v = parseInt(e.target.value);
        if (v > 0) {
          mState.rockMassKg = v;
          const resultsPanel = document.querySelector('.mn-results-panel');
          if (resultsPanel) resultsPanel.innerHTML = renderResults();
        }
      });
    }
  }

  // ============================================================
  // PUBLIC HELPERS (called from HTML onclick)
  // ============================================================
  function _selectShip(shipId) {
    const ship = mState.db.ships.find(s => s.id === shipId);
    mState.ship = ship || null;
    // Clear laser/module/gadget selections
    mState.lasers = [null, null, null];
    mState.modules = [[null, null, null], [null, null, null], [null, null, null]];
    mState.gadget = null;
    renderContent();
  }

  function _setLocSystem(sys) {
    mState.locSystem = sys;
    renderContent();
  }

  function _setRockMass(kg) {
    mState.rockMassKg = kg;
    const inp = document.getElementById('mnCustomMass');
    if (inp) inp.value = kg;
    document.querySelectorAll('.mn-preset-btn').forEach(btn => {
      btn.classList.toggle('active', btn.textContent.includes(
        kg >= 1000 ? (kg / 1000) + 't' : kg + 'kg'
      ));
    });
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
    _selectShip,
    _setLocSystem,
    _setRockMass,
    _clearMineralSearch,
  };

})();

window.Mining = Mining;
