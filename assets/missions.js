/* ===================================================
   GHOST SYNDICATE TOOLS — Missions Module
   Misiones · Facciones · Recompensas Blueprint
   SC 4.7.0 — Datos extraídos del Data.p4k
   =================================================== */

'use strict';

const Missions = (() => {

  // ── State ─────────────────────────────────────────────────────────────────
  const S = {
    db:       null,
    search:   '',
    faction:  '',
    color:    '',   // '' | 'yellow' | 'orange' | 'red'
    sort:     'faction',
  };

  let loaded = false;

  // ── Tier metadata ──────────────────────────────────────────────────────────
  const TIER_COLOR = { VE:'yellow', E:'yellow', M:'orange', H:'orange', VH:'red', S:'red', '':'grey' };
  const TIER_LABEL = { VE:'VE', E:'E', M:'M', H:'H', VH:'VH', S:'S', '':'?' };
  const TIER_ORDER = { VE:0, E:1, M:2, H:3, VH:4, S:5, '':9 };
  const COLOR_LABEL = { yellow:'Amarillo', orange:'Naranja', red:'Rojo' };

  // ── Load ───────────────────────────────────────────────────────────────────
  async function load() {
    if (loaded && S.db) { render(); return; }

    const loadingEl = document.getElementById('msLoading');
    const contentEl = document.getElementById('msContent');
    if (loadingEl) loadingEl.classList.remove('hidden');
    if (contentEl) contentEl.classList.add('hidden');

    try {
      const res = await fetch('data/missions_db.json');
      if (!res.ok) throw new Error('HTTP ' + res.status);
      S.db = await res.json();
      loaded = true;
      buildFactionFilter();
      render();
    } catch (e) {
      if (loadingEl) loadingEl.innerHTML =
        `<div class="ms-error">Error cargando misiones: ${e.message}</div>`;
    }
  }

  // ── Build faction dropdown ─────────────────────────────────────────────────
  function buildFactionFilter() {
    const sel = document.getElementById('msFactionFilter');
    if (!sel || !S.db) return;
    const factions = S.db.stats.factions || [];
    sel.innerHTML = `<option value="">Todas las facciones</option>` +
      factions.map(f => `<option value="${esc(f)}">${esc(f)}</option>`).join('');
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  function render() {
    if (!S.db) return;

    const loadingEl = document.getElementById('msLoading');
    if (loadingEl) loadingEl.classList.add('hidden');

    let missions = S.db.missions || [];

    // Filter
    const q = S.search.toLowerCase();
    if (q) {
      missions = missions.filter(m => {
        const inTitle = m.title.toLowerCase().includes(q);
        const inFaction = m.faction.toLowerCase().includes(q);
        const inBp = m.blueprints.some(b => b.name.toLowerCase().includes(q));
        return inTitle || inFaction || inBp;
      });
    }
    if (S.faction) {
      missions = missions.filter(m => m.faction === S.faction);
    }
    if (S.color) {
      missions = missions.filter(m => TIER_COLOR[m.tier] === S.color);
    }

    // Sort
    if (S.sort === 'faction') {
      missions = [...missions].sort((a, b) =>
        a.faction.localeCompare(b.faction) || TIER_ORDER[a.tier] - TIER_ORDER[b.tier] || a.title.localeCompare(b.title)
      );
    } else if (S.sort === 'tier') {
      missions = [...missions].sort((a, b) =>
        TIER_ORDER[a.tier] - TIER_ORDER[b.tier] || a.faction.localeCompare(b.faction) || a.title.localeCompare(b.title)
      );
    } else {
      missions = [...missions].sort((a, b) => a.title.localeCompare(b.title));
    }

    // Results count
    const countEl = document.getElementById('msCount');
    if (countEl) countEl.textContent = `${missions.length} misiones`;

    // Render cards
    const grid = document.getElementById('msGrid');
    if (!grid) return;

    if (missions.length === 0) {
      grid.innerHTML = `
        <div class="ms-empty">
          <div class="ms-empty-icon">🎯</div>
          <p>No se encontraron misiones con ese criterio</p>
          <button class="btn-ghost" onclick="Missions.clearFilters()">Limpiar filtros</button>
        </div>`;
      return;
    }

    // Group by faction when sorted by faction
    if (S.sort === 'faction' && !S.faction) {
      grid.innerHTML = renderGrouped(missions);
    } else {
      grid.innerHTML = missions.map(renderCard).join('');
    }
  }

  function renderGrouped(missions) {
    const groups = {};
    for (const m of missions) {
      if (!groups[m.faction]) groups[m.faction] = [];
      groups[m.faction].push(m);
    }
    return Object.entries(groups).map(([faction, ms]) => `
      <div class="ms-faction-group">
        <h2 class="ms-faction-header">${esc(faction)}</h2>
        <div class="ms-faction-cards">
          ${ms.map(renderCard).join('')}
        </div>
      </div>`).join('');
  }

  function renderCard(m) {
    const color = TIER_COLOR[m.tier] || 'grey';
    const tier  = TIER_LABEL[m.tier] || '?';
    const bps   = m.blueprints;

    const bpHtml = bps.length === 0
      ? `<span class="ms-bp-none">Sin blueprints en pool</span>`
      : bps.map(b => `<span class="ms-bp-tag" title="${esc(b.name)}">${esc(b.name)}</span>`).join('');

    const poolNote = bps.length > 1
      ? `<span class="ms-pool-note">1 aleatorio de ${bps.length}</span>`
      : '';

    return `
      <div class="ms-card ms-card--${color}">
        <div class="ms-card-header">
          <span class="ms-tier-badge ms-tier--${color}">${tier}</span>
          <span class="ms-card-title">${esc(m.title)}</span>
        </div>
        <div class="ms-card-faction">${esc(m.faction)}</div>
        <div class="ms-card-bps">
          ${bpHtml}
          ${poolNote}
        </div>
      </div>`;
  }

  // ── Event handlers (called from HTML) ─────────────────────────────────────
  function onSearch(val) {
    S.search = val.trim();
    render();
  }

  function onFaction(val) {
    S.faction = val;
    render();
  }

  function onColor(val) {
    S.color = val;
    // Update button active states
    document.querySelectorAll('.ms-color-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.color === val);
    });
    render();
  }

  function onSort(val) {
    S.sort = val;
    render();
  }

  function clearFilters() {
    S.search  = '';
    S.faction = '';
    S.color   = '';
    S.sort    = 'faction';
    const searchEl = document.getElementById('msSearch');
    if (searchEl) searchEl.value = '';
    const factionEl = document.getElementById('msFactionFilter');
    if (factionEl) factionEl.value = '';
    const sortEl = document.getElementById('msSort');
    if (sortEl) sortEl.value = 'faction';
    document.querySelectorAll('.ms-color-btn').forEach(b => b.classList.remove('active'));
    const allBtn = document.querySelector('.ms-color-btn[data-color=""]');
    if (allBtn) allBtn.classList.add('active');
    render();
  }

  // ── Utils ──────────────────────────────────────────────────────────────────
  function esc(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  return { load, onSearch, onFaction, onColor, onSort, clearFilters };
})();

window.Missions = Missions;
