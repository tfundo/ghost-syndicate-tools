/* ===================================================
   GHOST SYNDICATE TOOLS — Main App
   Star Citizen Crafting Companion
   =================================================== */

'use strict';

// ============================================================
// STATE
// ============================================================
let db = null;
let filtered = [];
let currentView = 'grid';
let currentSection = 'home';

const state = {
  search: '',
  category: '',
  missionFilter: '',
  sort: 'name',
};

// ============================================================
// INIT
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  setupNavigation();
  generateStars();
  loadDatabase();

  // Handle initial hash
  const hash = window.location.hash.replace('#', '') || 'home';
  showSection(hash);
});

// ============================================================
// STARS BACKGROUND
// ============================================================
function generateStars() {
  const container = document.getElementById('stars');
  if (!container) return;
  const count = window.innerWidth < 600 ? 80 : 150;
  for (let i = 0; i < count; i++) {
    const star = document.createElement('div');
    star.className = 'star';
    const size = Math.random() * 2.5 + 0.5;
    star.style.cssText = `
      width: ${size}px;
      height: ${size}px;
      left: ${Math.random() * 100}%;
      top: ${Math.random() * 100}%;
      --dur: ${Math.random() * 4 + 2}s;
      --delay: ${Math.random() * 5}s;
      --min-op: ${Math.random() * 0.2 + 0.1};
      --max-op: ${Math.random() * 0.5 + 0.5};
    `;
    container.appendChild(star);
  }
}

// ============================================================
// NAVIGATION
// ============================================================
function setupNavigation() {
  const navbar = document.getElementById('navbar');
  const hamburger = document.getElementById('hamburger');
  const navLinks = document.getElementById('navLinks');

  // Scroll effect
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 20);
  });

  // Mobile hamburger
  hamburger?.addEventListener('click', () => {
    hamburger.classList.toggle('open');
    navLinks.classList.toggle('open');
  });

  // Nav link clicks
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const section = link.dataset.section;
      showSection(section);
      // Close mobile menu
      hamburger?.classList.remove('open');
      navLinks?.classList.remove('open');
    });
  });
}

window.showSection = function(sectionId) {
  currentSection = sectionId;

  // Hide all sections
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  // Show target
  const target = document.getElementById(sectionId);
  if (target) target.classList.add('active');

  // Update nav active state
  document.querySelectorAll('.nav-link').forEach(l => {
    l.classList.toggle('active', l.dataset.section === sectionId);
  });

  // Update URL
  window.history.replaceState(null, '', '#' + sectionId);

  // Scroll to top
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

// ============================================================
// DATABASE LOADING
// ============================================================
async function loadDatabase() {
  try {
    const resp = await fetch('data/crafting_db.json');
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    db = await resp.json();
    initCraftingUI();
    updateHomeStats();
  } catch (err) {
    console.error('Failed to load database:', err);
    document.getElementById('loadingState').innerHTML = `
      <div style="text-align:center; padding: 3rem; color: var(--text-secondary)">
        <div style="font-size:2rem; margin-bottom:1rem;">⚠</div>
        <p>Error al cargar la base de datos.</p>
        <p style="font-size:0.8rem; color:var(--text-muted); margin-top:0.5rem">${err.message}</p>
      </div>
    `;
  }
}

function updateHomeStats() {
  if (!db) return;
  animateCounter('stat-blueprints', db.stats.totalBlueprints);
  animateCounter('stat-materials', db.stats.totalResources);
  animateCounter('stat-missions', db.stats.blueprintsWithMissions);
}

function animateCounter(id, target) {
  const el = document.querySelector(`#${id} .stat-num`);
  if (!el) return;
  let current = 0;
  const step = Math.ceil(target / 40);
  const timer = setInterval(() => {
    current = Math.min(current + step, target);
    el.textContent = current.toLocaleString('es');
    if (current >= target) clearInterval(timer);
  }, 30);
}

// ============================================================
// CRAFTING UI INIT
// ============================================================
function initCraftingUI() {
  if (!db) return;

  // Populate category filter
  const catSet = new Set(db.blueprints.map(b => b.categoryPath).filter(Boolean));
  const catFilter = document.getElementById('categoryFilter');
  [...catSet].sort().forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat;
    opt.textContent = cat;
    catFilter.appendChild(opt);
  });

  // Event listeners
  document.getElementById('searchInput').addEventListener('input', (e) => {
    state.search = e.target.value.toLowerCase();
    document.getElementById('searchClear').classList.toggle('visible', state.search.length > 0);
    applyFilters();
  });
  document.getElementById('categoryFilter').addEventListener('change', (e) => {
    state.category = e.target.value;
    applyFilters();
  });
  document.getElementById('missionFilter').addEventListener('change', (e) => {
    state.missionFilter = e.target.value;
    applyFilters();
  });
  document.getElementById('sortSelect').addEventListener('change', (e) => {
    state.sort = e.target.value;
    applyFilters();
  });

  // Hide loading, show data
  document.getElementById('loadingState').classList.add('hidden');
  applyFilters();
}

window.clearSearch = function() {
  document.getElementById('searchInput').value = '';
  state.search = '';
  document.getElementById('searchClear').classList.remove('visible');
  applyFilters();
};

window.toggleMissionOnly = function() {
  const btn = document.getElementById('missionToggle');
  const isActive = btn.classList.toggle('active');
  state.missionFilter = isActive ? 'mission' : '';
  // Keep hidden select in sync
  document.getElementById('missionFilter').value = state.missionFilter;
  applyFilters();
};

window.setView = function(view) {
  currentView = view;
  const grid = document.getElementById('blueprintGrid');
  grid.classList.toggle('list-view', view === 'list');
  document.getElementById('viewGrid').classList.toggle('active', view === 'grid');
  document.getElementById('viewList').classList.toggle('active', view === 'list');
};

// ============================================================
// FILTERING & RENDERING
// ============================================================
function applyFilters() {
  if (!db) return;

  filtered = db.blueprints.filter(bp => {
    // Search
    if (state.search) {
      const searchTarget = [
        bp.name,
        bp.categoryPath,
        bp.itemEntity,
        ...bp.tiers.flatMap(t => t.ingredients.map(i => i.resourceName)),
        ...bp.missions.map(m => m.missionName),
      ].join(' ').toLowerCase();
      if (!searchTarget.includes(state.search)) return false;
    }

    // Category
    if (state.category && bp.categoryPath !== state.category) return false;

    // Mission filter
    if (state.missionFilter === 'mission' && !bp.hasMissions) return false;
    if (state.missionFilter === 'no-mission' && bp.hasMissions) return false;

    return true;
  });

  // Sort
  filtered.sort((a, b) => {
    switch (state.sort) {
      case 'name': return a.name.localeCompare(b.name, 'es');
      case 'category': return a.categoryPath.localeCompare(b.categoryPath, 'es');
      case 'ingredients': {
        const countA = a.tiers[0]?.ingredients?.length || 0;
        const countB = b.tiers[0]?.ingredients?.length || 0;
        return countB - countA;
      }
      default: return 0;
    }
  });

  renderBlueprints();
}

function renderBlueprints() {
  const grid = document.getElementById('blueprintGrid');
  const empty = document.getElementById('emptyState');
  const countEl = document.getElementById('resultsCount');

  // Update count
  countEl.textContent = `${filtered.length.toLocaleString('es')} planos`;

  if (filtered.length === 0) {
    grid.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }

  empty.classList.add('hidden');

  // Render with virtual pagination for performance (show 100 at a time)
  const toShow = filtered.slice(0, 200);

  const html = toShow.map((bp, idx) => renderBlueprintCard(bp, idx)).join('');
  grid.innerHTML = html;

  if (filtered.length > 200) {
    grid.insertAdjacentHTML('beforeend', `
      <div style="grid-column:1/-1; text-align:center; padding:1.5rem 0; color:var(--text-muted); font-size:0.85rem">
        Mostrando 200 de ${filtered.length.toLocaleString('es')} planos. Usa el buscador para filtrar.
      </div>
    `);
  }
}

function renderBlueprintCard(bp, idx) {
  const tier = bp.tiers[0];
  const ingredients = tier?.ingredients || [];
  const previewIngredients = ingredients.slice(0, 3);
  const extraCount = ingredients.length - previewIngredients.length;

  const ingHtml = previewIngredients.map(ing => `
    <div class="bp-ingredient">
      <span class="ing-qty">${formatSCU(ing.quantity_scu)}</span>
      <span class="ing-name">${escHtml(ing.resourceName)}</span>
      <span class="ing-slot">${escHtml(ing.slot || '')}</span>
    </div>
  `).join('');

  const missionBadge = bp.hasMissions
    ? `<span class="bp-mission-badge">✓ MISIÓN</span>`
    : '';

  const timeHtml = tier?.craftTime != null
    ? `<span class="bp-time">⏱ <span class="time-val">${formatTime(tier.craftTime)}</span></span>`
    : '';

  // Show first Spanish title if available, otherwise pool name
  const seenCardPools = new Set();
  const missionsHtml = bp.hasMissions
    ? bp.missions.filter(m => {
        if (seenCardPools.has(m.poolFile)) return false;
        seenCardPools.add(m.poolFile);
        return true;
      }).slice(0, 2).map(m => {
        const label = (m.missionTitles && m.missionTitles.length > 0)
          ? m.missionTitles[0]
          : m.missionName;
        const display = label.length > 40 ? label.substring(0, 40) + '…' : label;
        const contractor = m.contractor ? `${m.contractor}: ` : '';
        return `<span class="mission-tag" title="${escHtml(m.missionName)}">${escHtml(contractor)}${escHtml(display)}</span>`;
      }).join('')
    : `<span style="color:var(--text-muted);font-size:0.7rem">Sin misión asignada</span>`;

  return `
    <div class="bp-card" onclick="openBlueprintDetail(${idx})" style="animation-delay:${Math.min(idx * 0.02, 0.5)}s">
      <div class="bp-header">
        <span class="bp-name">${escHtml(bp.name)}</span>
        ${missionBadge}
      </div>
      <div class="bp-category">${escHtml(bp.categoryPath)}</div>
      <div class="bp-ingredients">
        ${ingHtml}
        ${extraCount > 0 ? `<span class="bp-more-ingredients">+${extraCount} materiales más...</span>` : ''}
      </div>
      <div class="bp-footer">
        ${timeHtml}
        <div class="bp-missions-label">${missionsHtml}</div>
      </div>
    </div>
  `;
}

// ============================================================
// BLUEPRINT DETAIL MODAL
// ============================================================
window.openBlueprintDetail = function(idx) {
  const bp = filtered[idx];
  if (!bp) return;

  const modalContent = document.getElementById('modalContent');

  // All ingredients across tiers
  const allIngredients = bp.tiers.flatMap(t => t.ingredients || []);

  // Deduplicate by resource+slot
  const ingMap = new Map();
  allIngredients.forEach(ing => {
    const key = ing.resource + '|' + (ing.slot || '');
    if (!ingMap.has(key)) ingMap.set(key, ing);
  });
  const uniqueIngredients = [...ingMap.values()];

  const ingredientsHtml = uniqueIngredients.length > 0
    ? uniqueIngredients.map(ing => `
        <div class="modal-ingredient-row">
          <span class="modal-qty">${formatSCU(ing.quantity_scu)}</span>
          <span class="modal-res-name">${escHtml(ing.resourceName)}</span>
          <span class="modal-slot">${escHtml(ing.slot || '')}</span>
          ${ing.minQuality > 0 ? `<span class="modal-quality">Min. calidad: ${ing.minQuality}</span>` : ''}
        </div>
      `).join('')
    : '<p class="modal-no-data">Sin ingredientes registrados</p>';

  // Deduplicate missions by poolFile
  const uniqueMissions = [];
  const seenPools = new Set();
  bp.missions.forEach(m => {
    if (!seenPools.has(m.poolFile)) {
      seenPools.add(m.poolFile);
      uniqueMissions.push(m);
    }
  });

  const missionsHtml = uniqueMissions.length > 0
    ? uniqueMissions.map(m => {
        const titlesHtml = m.missionTitles && m.missionTitles.length > 0
          ? `<ul class="modal-mission-titles">${m.missionTitles.map(t => `<li>${escHtml(t)}</li>`).join('')}</ul>`
          : '';
        const contractorBadge = m.contractor
          ? `<span class="modal-contractor-badge">${escHtml(m.contractor)}</span>`
          : '';
        return `
          <div class="modal-mission-item">
            <div class="modal-mission-header">
              ${contractorBadge}
              <span class="modal-mission-name">${escHtml(m.missionName)}</span>
            </div>
            ${titlesHtml}
          </div>
        `;
      }).join('')
    : '<p class="modal-no-data">Este plano no se obtiene como recompensa de misión. Puede estar en tiendas o ser desbloqueado de otra forma.</p>';

  // Craft times
  const timesHtml = bp.tiers
    .filter(t => t.craftTime != null)
    .map((t, i) => `
      <span class="modal-craft-time">⏱ Tier ${i+1}: <strong>${formatTime(t.craftTime)}</strong></span>
    `).join(' ') || '<p class="modal-no-data">Tiempo no especificado</p>';

  modalContent.innerHTML = `
    <div class="modal-title">${escHtml(bp.name)}</div>
    <div class="modal-category">${escHtml(bp.categoryPath)}</div>
    ${bp.itemEntity ? `<div class="modal-entity">📦 ${escHtml(bp.itemEntity)}</div>` : ''}

    <div class="modal-section-title">⏱ Tiempo de fabricación</div>
    <div>${timesHtml}</div>

    <div class="modal-section-title">🧪 Materiales necesarios</div>
    ${ingredientsHtml}

    <div class="modal-section-title">🎯 Misiones fuente</div>
    ${missionsHtml}
  `;

  // Open modal
  document.getElementById('modalOverlay').classList.add('open');
  document.getElementById('detailModal').classList.add('open');
};

window.closeModal = function() {
  document.getElementById('modalOverlay').classList.remove('open');
  document.getElementById('detailModal').classList.remove('open');
};

// Close with ESC
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
});

// ============================================================
// HELPERS
// ============================================================
function formatSCU(scu) {
  if (scu === 0) return '0 SCU';
  if (scu < 0.001) return scu.toFixed(5) + ' SCU';
  if (scu < 1) return scu.toFixed(3) + ' SCU';
  return scu.toFixed(2) + ' SCU';
}

function formatTime(seconds) {
  if (!seconds || seconds === 0) return '—';
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const parts = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  if (s > 0 || parts.length === 0) parts.push(`${s}s`);
  return parts.join(' ');
}

function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
