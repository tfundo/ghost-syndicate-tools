/* ===================================================
   GHOST SYNDICATE TOOLS — Mining Module
   Minerales · Localizaciones · Configurador
   SC 4.7.0
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
    modules: [[null, null], [null, null], [null, null]],
    gadgets: [null, null],
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

    // Wire events after DOM insertion
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
          mn.toLowerCase().includes(m.id.replace(/_/g,' '))
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
      const activeModules = modules.filter(m => m.type === 'active');
      const passiveModules = modules.filter(m => m.type === 'passive');

      const slotCols = slotCount === 3 ? 'mn-laser-cols-3' : slotCount === 2 ? 'mn-laser-cols-2' : '';

      const slots = Array.from({ length: slotCount }, (_, i) => {
        const selLaser = mState.lasers[i];
        const selActive = mState.modules[i][0];
        const selPassive = mState.modules[i][1];

        const laserOpts = `<option value="">— Seleccionar láser —</option>` +
          compatLasers.map(l =>
            `<option value="${l.id}"${selLaser && selLaser.id === l.id ? ' selected' : ''}>${l.name} (${l.powerMW} MW · Rng ${l.rangem}m)</option>`
          ).join('');

        const activeOpts = `<option value="">— Módulo activo —</option>` +
          activeModules.map(m =>
            `<option value="${m.id}"${selActive && selActive.id === m.id ? ' selected' : ''}>${m.name}</option>`
          ).join('');

        const passiveOpts = `<option value="">— Módulo pasivo —</option>` +
          passiveModules.map(m =>
            `<option value="${m.id}"${selPassive && selPassive.id === m.id ? ' selected' : ''}>${m.name}</option>`
          ).join('');

        return `<div class="mn-slot-card">
          <div class="mn-slot-label">Láser ${i + 1}</div>
          <select class="mn-select" data-action="laser" data-slot="${i}">${laserOpts}</select>
          <div class="mn-module-row">
            <select class="mn-select mn-select-sm" data-action="module-active" data-slot="${i}">${activeOpts}</select>
            <select class="mn-select mn-select-sm" data-action="module-passive" data-slot="${i}">${passiveOpts}</select>
          </div>
        </div>`;
      }).join('');

      laserSlotsHtml = `<div class="mn-section-title">Láseres y Módulos</div>
        <div class="mn-laser-slots ${slotCols}">${slots}</div>`;
    }

    // Gadgets
    const gadgetOpts = gadgets.map(g =>
      `<option value="${g.id}"${mState.gadgets[0] && mState.gadgets[0].id === g.id ? ' selected' : ''}>${g.name}</option>`
    ).join('');
    const gadgetOpts2 = gadgets.map(g =>
      `<option value="${g.id}"${mState.gadgets[1] && mState.gadgets[1].id === g.id ? ' selected' : ''}>${g.name}</option>`
    ).join('');

    const gadgetSection = `<div class="mn-section-title">Gadgets de Roca</div>
      <div class="mn-gadget-row">
        <select class="mn-select" data-action="gadget" data-slot="0">${gadgetOpts}</select>
        <select class="mn-select" data-action="gadget" data-slot="1">${gadgetOpts2}</select>
      </div>`;

    // Rock section
    const presets = [
      { label: 'Tiny', kg: 200 },
      { label: 'Pequeña', kg: 800 },
      { label: 'Media', kg: 3000 },
      { label: 'Grande', kg: 12000 },
      { label: 'Masiva', kg: 50000 },
    ];
    const presetBtns = presets.map(p =>
      `<button class="mn-preset-btn${mState.rockMassKg === p.kg ? ' active' : ''}" onclick="Mining._setRockMass(${p.kg})">${p.label}<br><small>${p.kg >= 1000 ? (p.kg/1000)+'t' : p.kg+'kg'}</small></button>`
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

    // Results panel
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
      ? `${Math.floor(estTime/60)}m ${estTime%60}s`
      : `${estTime}s`;

    return `
      <div class="mn-results">
        <div class="mn-verdict mn-verdict-${sim.verdictClass}">${sim.verdict}</div>
        ${meterHtml}
        <div class="mn-throttle-section">
          <div class="mn-throttle-label">Throttle recomendado</div>
          <div class="mn-throttle-gauge">
            <div class="mn-throttle-fill" style="width:${Math.min(100,sim.recommendedThrottle)}%;background:${throttleColor}"></div>
          </div>
          <div class="mn-throttle-value" style="color:${throttleColor}">${sim.recommendedThrottle}%</div>
        </div>
        <div class="mn-stat-grid">
          <div class="mn-stat">
            <div class="mn-stat-val">${sim.effectivePowerMW.toLocaleString('es-ES')} MW</div>
            <div class="mn-stat-label">Potencia efectiva</div>
          </div>
          <div class="mn-stat">
            <div class="mn-stat-val">${sim.chargeRateAtThrottle}%/s</div>
            <div class="mn-stat-label">Vel. carga</div>
          </div>
          <div class="mn-stat">
            <div class="mn-stat-val">${sim.windowWidth.toFixed(1)}%</div>
            <div class="mn-stat-label">Ancho ventana</div>
          </div>
          <div class="mn-stat">
            <div class="mn-stat-val">${sim.adjustedInstability.toFixed(1)}</div>
            <div class="mn-stat-label">Inestabilidad</div>
          </div>
          <div class="mn-stat">
            <div class="mn-stat-val">${sim.totalExtrRate}/s</div>
            <div class="mn-stat-label">Extracción</div>
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
        <div class="mn-meter-tick" style="left:${optMin}%"><span>${optMin}%</span></div>
        <div class="mn-meter-tick mn-meter-tick-r" style="left:${optMax}%"><span>${optMax}%</span></div>
      </div>
    </div>`;
  }

  // ============================================================
  // SIMULATION
  // ============================================================
  const CALIB_K = 10;

  function simulate() {
    const ship = mState.ship;
    const mineral = mState.mineral;
    const rockMass = mState.rockMassKg;

    if (!ship || !mineral) return null;

    let totalPowerMW = 0;
    let totalExtrRate = 0;
    let totalInstabAdd = 0;
    let totalWindowMod = 0;

    const activeLasers = mState.lasers.slice(0, ship.laserSlots).filter(l => l !== null);

    if (activeLasers.length === 0) return null;

    activeLasers.forEach((laser, slotIdx) => {
      const slotModules = mState.modules[slotIdx].filter(m => m !== null);
      let slotPower = laser.powerMW;
      let slotExtr = laser.extrRate;
      let slotInstab = laser.instabilityAdd;
      let slotWindow = 0;

      slotModules.forEach(mod => {
        slotPower *= mod.powerMod;
        slotExtr *= mod.extrMod;
        slotInstab += (mod.instabMod - 1) * 40;
        slotWindow += (mod.windowMod || 0);
      });

      totalPowerMW += slotPower;
      totalExtrRate += slotExtr;
      totalInstabAdd += slotInstab / activeLasers.length;
      totalWindowMod += slotWindow / activeLasers.length;
    });

    // Gadget effects
    const activeGadgets = mState.gadgets.filter(g => g && g.id !== 'none');
    let gadgetPowerMod = 1.0;
    let gadgetInstabMod = 1.0;
    let gadgetWindowMod = 0;
    let gadgetResistMod = 1.0;

    activeGadgets.forEach(g => {
      gadgetPowerMod *= g.powerMod;
      gadgetInstabMod *= g.instabMod;
      gadgetWindowMod += g.windowMod;
      gadgetResistMod *= g.resistMod;
    });

    const effectivePower = totalPowerMW * gadgetPowerMod;
    const adjustedResistance = mineral.resistance * gadgetResistMod;
    const adjustedInstability = mineral.instability * gadgetInstabMod * (1 + totalInstabAdd / 100);
    const adjustedOptMin = mineral.optMin;
    const adjustedOptMax = Math.min(95, Math.max(mineral.optMin + 5, mineral.optMax + gadgetWindowMod + totalWindowMod));
    const windowWidth = adjustedOptMax - adjustedOptMin;

    const chargeRate100 = effectivePower / (adjustedResistance * CALIB_K);

    const TARGET_FILL_S = 5;
    const targetRate = windowWidth / TARGET_FILL_S;
    const recommendedThrottle = Math.min(1.0, targetRate / Math.max(0.001, chargeRate100));

    const difficultyRatio = adjustedInstability / Math.max(1, windowWidth);

    const chargeRateAtThrottle = chargeRate100 * recommendedThrottle;
    const windowCenter = (adjustedOptMin + adjustedOptMax) / 2;
    const timeToChargeSec = windowCenter / Math.max(0.1, chargeRateAtThrottle);
    const timeToExtractSec = (rockMass / 1000) / Math.max(0.01, totalExtrRate);
    const estimatedTotalSec = (timeToChargeSec + timeToExtractSec) * 1.8;

    let verdict, verdictClass, tips = [];

    if (recommendedThrottle > 1.8) {
      verdict = 'INSUFICIENTE';
      verdictClass = 'insufficient';
      tips.push('Necesitas más potencia. Prueba un láser más potente o usa módulos Surge.');
      tips.push('También puedes usar el gadget Surge Charge en la roca.');
    } else if (chargeRate100 * 0.05 > windowWidth * 3) {
      verdict = 'EXCESIVA';
      verdictClass = 'excess';
      tips.push('Incluso al 5% de potencia el láser llena la barra demasiado rápido.');
      tips.push('Usa módulos de estabilidad (Lifeline, Rime) o cambia a un láser menos potente.');
    } else if (difficultyRatio > 1.2) {
      verdict = 'CRÍTICO';
      verdictClass = 'critical';
      tips.push('La inestabilidad supera la ventana óptima. Muy difícil de controlar.');
      tips.push('Añade módulos Rime o Focus, y usa el gadget Optimum Charge en la roca.');
      if (mineral.explosive) tips.push('⚠️ Mineral explosivo: un error puede destruir la roca.');
    } else if (difficultyRatio > 0.7) {
      verdict = 'DIFÍCIL';
      verdictClass = 'hard';
      tips.push('Manejable con experiencia. La ventana óptima es estrecha respecto a la inestabilidad.');
      if (mineral.explosive) tips.push('⚠️ Mineral explosivo: ten cuidado de no sobrepasar la ventana.');
    } else if (difficultyRatio > 0.4) {
      verdict = 'MODERADO';
      verdictClass = 'medium';
      tips.push('Configuración viable. Mantén el throttle cerca del valor recomendado.');
      if (mineral.explosive) tips.push('⚠️ Mineral explosivo: mantén el control del throttle.');
    } else {
      verdict = 'FACTIBLE';
      verdictClass = 'easy';
      tips.push('Configuración óptima. Deberías poder romper la roca sin problemas.');
      if (mineral.explosive) tips.push('⚠️ Cuantanio explosivo: mantén siempre control del throttle aunque sea fácil.');
    }

    return {
      verdict,
      verdictClass,
      effectivePowerMW: Math.round(effectivePower),
      chargeRate100: Math.round(chargeRate100 * 10) / 10,
      chargeRateAtThrottle: Math.round(chargeRateAtThrottle * 10) / 10,
      recommendedThrottle: Math.round(recommendedThrottle * 100),
      windowWidth: Math.round(windowWidth * 10) / 10,
      adjustedOptMin: Math.round(adjustedOptMin * 10) / 10,
      adjustedOptMax: Math.round(adjustedOptMax * 10) / 10,
      adjustedInstability: Math.round(adjustedInstability * 10) / 10,
      difficultyRatio: Math.round(difficultyRatio * 100) / 100,
      estimatedTimeSec: Math.round(estimatedTotalSec),
      totalExtrRate: Math.round(totalExtrRate * 100) / 100,
      tips,
      activeLaserCount: activeLasers.length,
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
        const val = sel.value;
        const { laserHeads, modules, gadgets } = mState.db;

        if (action === 'laser') {
          mState.lasers[slot] = val ? laserHeads.find(l => l.id === val) : null;
        } else if (action === 'module-active') {
          mState.modules[slot][0] = val ? modules.find(m => m.id === val) : null;
        } else if (action === 'module-passive') {
          mState.modules[slot][1] = val ? modules.find(m => m.id === val) : null;
        } else if (action === 'gadget') {
          mState.gadgets[slot] = val ? gadgets.find(g => g.id === val) : null;
        } else if (action === 'mineral') {
          mState.mineral = val ? mState.db.minerals.find(m => m.id === val) : null;
        }

        // Re-render only results panel
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
    // Clear laser/module selections
    mState.lasers = [null, null, null];
    mState.modules = [[null, null], [null, null], [null, null]];
    renderContent();
  }

  function _setLocSystem(sys) {
    mState.locSystem = sys;
    renderContent();
  }

  function _setRockMass(kg) {
    mState.rockMassKg = kg;
    // Update custom input if visible
    const inp = document.getElementById('mnCustomMass');
    if (inp) inp.value = kg;
    // Update preset buttons
    document.querySelectorAll('.mn-preset-btn').forEach(btn => {
      btn.classList.toggle('active', btn.textContent.includes(
        kg >= 1000 ? (kg/1000)+'t' : kg+'kg'
      ));
    });
    // Re-render presets + results
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
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
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
