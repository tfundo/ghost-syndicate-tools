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
let itemImages = {};   // base_entity → image URL

function baseEntity(entity) {
  return (entity || '').replace(/(_\d{2})+$/, '');
}

function getItemImage(entity) {
  return itemImages[baseEntity(entity)] || itemImages[entity] || '';
}

const state = {
  search: '',
  category: '',
  missionFilter: 'mission',
  sort: 'name',
};

// ============================================================
// INIT
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  setupNavigation();
  setupLightboxDelegation();
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
// CRAFTING BACK-TO-TOP FAB
// ============================================================
function updateCraftingFab() {
  if (currentSection !== 'crafting') return;

  let fab = document.getElementById('crafting-top-fab');

  if (window.scrollY < 400) {
    if (fab) fab.style.opacity = '0';
    return;
  }

  if (!fab) {
    fab = document.createElement('button');
    fab.id = 'crafting-top-fab';
    fab.title = 'Volver al inicio de la lista';
    fab.style.cssText = [
      'position:fixed',
      'bottom:1.8rem',
      'right:1.8rem',
      'z-index:4000',
      'width:2.8rem',
      'height:2.8rem',
      'display:flex',
      'align-items:center',
      'justify-content:center',
      'background:var(--accent)',
      'color:#0c0a09',
      'font-size:1.1rem',
      'font-weight:900',
      'border:none',
      'border-radius:4px',
      'cursor:pointer',
      'box-shadow:0 4px 20px rgba(245,158,11,0.5),0 0 40px rgba(245,158,11,0.2)',
      'transition:all 0.25s ease',
      'opacity:0',
    ].join(';');
    fab.innerHTML = '↑';
    fab.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
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

  fab.style.opacity = '1';
}

function destroyCraftingFab() {
  const fab = document.getElementById('crafting-top-fab');
  if (fab) fab.remove();
}

// ============================================================
// ITEM IMAGE LIGHTBOX
// ============================================================
function openLightbox(src, title) {
  let overlay = document.getElementById('img-lightbox');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'img-lightbox';
    overlay.innerHTML = `
      <div class="lb-backdrop"></div>
      <div class="lb-panel">
        <button class="lb-close" title="Cerrar">✕</button>
        <div class="lb-title"></div>
        <img class="lb-img" alt="">
      </div>`;
    overlay.querySelector('.lb-backdrop').addEventListener('click', closeLightbox);
    overlay.querySelector('.lb-close').addEventListener('click', closeLightbox);
    document.addEventListener('keydown', _lbKey);
    document.body.appendChild(overlay);
  }
  overlay.querySelector('.lb-img').src = src;
  overlay.querySelector('.lb-img').alt = title;
  overlay.querySelector('.lb-title').textContent = title;
  overlay.classList.add('lb-open');
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  const overlay = document.getElementById('img-lightbox');
  if (overlay) overlay.classList.remove('lb-open');
  document.body.style.overflow = '';
}

function _lbKey(e) {
  if (e.key === 'Escape') closeLightbox();
}

function setupLightboxDelegation() {
  document.addEventListener('click', e => {
    const el = e.target.closest('[data-lightbox]');
    if (!el) return;
    e.stopPropagation();
    openLightbox(el.dataset.lightbox, el.dataset.lightboxTitle || '');
  });
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
    updateCraftingFab();
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
  // Redirect legacy section IDs that were merged into comparador
  if (sectionId === 'ships' || sectionId === 'weapons') sectionId = 'comparador';

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

  // Init comparador on first visit; destroy FAB when leaving
  if (sectionId === 'comparador' && window.Comp) {
    window.Comp.init();
  } else if (sectionId !== 'comparador' && window.Comp && window.Comp.destroy) {
    window.Comp.destroy();
  }

  // Destroy crafting back-to-top FAB when leaving crafting
  if (sectionId !== 'crafting') destroyCraftingFab();

  // Scroll to top
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

// ============================================================
// DATABASE LOADING
// ============================================================
async function loadDatabase() {
  try {
    const [dbResp, imgResp] = await Promise.all([
      fetch('data/crafting_db.json'),
      fetch('data/item_images.json').catch(() => null),
    ]);
    if (!dbResp.ok) throw new Error('HTTP ' + dbResp.status);
    db = await dbResp.json();
    if (imgResp && imgResp.ok) itemImages = await imgResp.json();
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

  // Sync UI controls with initial state
  document.getElementById('missionFilter').value = state.missionFilter;
  if (state.missionFilter === 'mission') {
    document.getElementById('missionToggle').classList.add('active');
  }

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

function getCatInfo(catPath) {
  const p = (catPath || '').toLowerCase();
  if (p.includes('ammo')) {
    if (p.includes('laser'))     return { abbr: 'LASER',    color: '#f59e0b' };
    if (p.includes('ballistic')) return { abbr: 'BALÍSTICO', color: '#ef4444' };
    if (p.includes('plasma'))    return { abbr: 'PLASMA',   color: '#8b5cf6' };
    if (p.includes('electron'))  return { abbr: 'ELECTRÓN', color: '#06b6d4' };
    if (p.includes('shotgun'))   return { abbr: 'ESCOPETA', color: '#f97316' };
    return { abbr: 'MUNICIÓN', color: '#ef4444' };
  }
  if (p.includes('armour') || p.includes('armor')) {
    if (p.includes('combat'))      return { abbr: 'COMBATE',  color: '#3b82f6' };
    if (p.includes('stealth'))     return { abbr: 'SIGILO',   color: '#6366f1' };
    if (p.includes('explorer'))    return { abbr: 'EXPLORAC', color: '#10b981' };
    if (p.includes('hunter'))      return { abbr: 'CAZADOR',  color: '#f97316' };
    if (p.includes('medic'))       return { abbr: 'MÉDICO',   color: '#06b6d4' };
    if (p.includes('miner'))       return { abbr: 'MINERO',   color: '#78716c' };
    if (p.includes('engineer'))    return { abbr: 'INGENIERO',color: '#a78bfa' };
    if (p.includes('salvager'))    return { abbr: 'SALVADOR', color: '#d97706' };
    if (p.includes('flightsuit'))  return { abbr: 'PILOTO',   color: '#22c55e' };
    if (p.includes('racer'))       return { abbr: 'PILOTO',   color: '#22c55e' };
    if (p.includes('radiation'))   return { abbr: 'RADIACIÓN',color: '#84cc16' };
    if (p.includes('environment')) return { abbr: 'AMBIENTAL',color: '#84cc16' };
    if (p.includes('cosmonaut'))   return { abbr: 'COSMONAUTA',color:'#60a5fa' };
    if (p.includes('undersuit'))   return { abbr: 'INTERIOR', color: '#94a3b8' };
    return { abbr: 'ARMADURA', color: '#3b82f6' };
  }
  if (p.includes('weapons') || p.includes('weapon')) {
    if (p.includes('rifle'))   return { abbr: 'RIFLE',    color: '#f59e0b' };
    if (p.includes('pistol'))  return { abbr: 'PISTOLA',  color: '#d97706' };
    if (p.includes('sniper'))  return { abbr: 'FRANCOTIRADOR', color: '#8b5cf6' };
    if (p.includes('smg'))     return { abbr: 'SMG',      color: '#ef4444' };
    if (p.includes('lmg'))     return { abbr: 'LMG',      color: '#dc2626' };
    if (p.includes('shotgun')) return { abbr: 'ESCOPETA', color: '#f97316' };
    return { abbr: 'ARMA', color: '#f59e0b' };
  }
  return { abbr: 'OBJETO', color: '#8a7048' };
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

  const catInfo = getCatInfo(bp.categoryPath);
  const missionBadge = bp.hasMissions
    ? `<span class="bp-mission-badge">✓ MISIÓN</span>`
    : '';

  const timeHtml = tier?.craftTime != null
    ? `<span class="bp-time">⏱ <span class="time-val">${formatTime(tier.craftTime)}</span></span>`
    : '';

  // Item image
  const imgUrl = getItemImage(bp.itemEntity);
  const imgHtml = imgUrl
    ? `<div class="bp-item-img" data-lightbox="${escHtml(imgUrl)}" data-lightbox-title="${escHtml(bp.name)}" title="Click para ampliar"><img src="${escHtml(imgUrl)}" alt="${escHtml(bp.name)}" loading="lazy" onerror="this.parentElement.style.display='none'"></div>`
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
        const display = label.length > 36 ? label.substring(0, 36) + '…' : label;
        const contractor = m.contractor ? `${m.contractor}: ` : '';
        const sysBadges = (m.systems && m.systems.length > 0)
          ? m.systems.map(s => `<span class="card-system-badge card-system-${s.toLowerCase()}">${s}</span>`).join('')
          : '';
        return `<span class="mission-tag" title="${escHtml(m.missionName)}">${escHtml(contractor)}${escHtml(display)}${sysBadges}</span>`;
      }).join('')
    : `<span style="color:var(--text-muted);font-size:0.7rem">Sin misión asignada</span>`;

  return `
    <div class="bp-card" onclick="openBlueprintDetail(${idx})" style="animation-delay:${Math.min(idx * 0.02, 0.5)}s">
      ${imgHtml}
      <div class="bp-header">
        <span class="bp-name">${escHtml(bp.name)}</span>
        ${missionBadge}
      </div>
      <div class="bp-category">
        <span class="bp-cat-badge" style="color:${catInfo.color};border-color:${catInfo.color};background:${catInfo.color}18">${catInfo.abbr}</span>
        ${escHtml(bp.categoryPath)}
      </div>
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

  const DIFF_ABBREV = { VeryEasy: 'MF', Easy: 'F', Medium: 'M', Hard: 'D', VeryHard: 'MD', Super: 'S' };
  const DIFF_LABEL  = { VeryEasy: 'Muy Fácil', Easy: 'Fácil', Medium: 'Media', Hard: 'Difícil', VeryHard: 'Muy Difícil', Super: 'Súper' };

  const missionsHtml = uniqueMissions.length > 0
    ? uniqueMissions.map(m => {
        const titlesHtml = m.missionTitles && m.missionTitles.length > 0
          ? `<ul class="modal-mission-titles">${m.missionTitles.map(t => `<li>${escHtml(t)}</li>`).join('')}</ul>`
          : '';
        const contractorBadge = m.contractor
          ? `<span class="modal-contractor-badge">${escHtml(m.contractor)}</span>`
          : '';

        // Systems badges
        const systemsHtml = (m.systems && m.systems.length > 0)
          ? m.systems.map(s => `<span class="mission-system-badge mission-system-${s.toLowerCase()}">${escHtml(s)}</span>`).join('')
          : '';

        // Scrip table: if we have per-difficulty data show it; else just difficulty list
        let rewardsHtml = '';
        const hasScrip = m.scripPerDiff && Object.keys(m.scripPerDiff).length > 0;
        const hasDiffs = m.difficulties && m.difficulties.length > 0;
        if (hasScrip) {
          const label = m.scripLabel || 'Scrip';
          const rows = m.difficulties
            .filter(d => m.scripPerDiff[d] != null)
            .map(d => {
              const abbr = DIFF_ABBREV[d] || d;
              const fullLabel = DIFF_LABEL[d] || d;
              return `<tr><td title="${escHtml(fullLabel)}">${escHtml(abbr)}</td><td>${m.scripPerDiff[d]} <span class="scrip-unit">${escHtml(label)}</span> <span class="scrip-auec">+ aUEC variable</span></td></tr>`;
            }).join('');
          if (rows) {
            rewardsHtml = `<table class="mission-scrip-table"><thead><tr><th>Dificultad</th><th>Recompensa</th></tr></thead><tbody>${rows}</tbody></table>`;
          }
        } else if (hasDiffs) {
          const diffBadges = m.difficulties.map(d => {
            const abbr = DIFF_ABBREV[d] || d;
            const fullLabel = DIFF_LABEL[d] || d;
            return `<span class="mission-diff-badge" title="${escHtml(fullLabel)}">${escHtml(abbr)}</span>`;
          }).join('');
          rewardsHtml = `<div class="mission-diffs">${diffBadges}</div>`;
        }

        return `
          <div class="modal-mission-item">
            <div class="modal-mission-header">
              ${contractorBadge}
              <span class="modal-mission-name">${escHtml(m.missionName)}</span>
              ${systemsHtml}
            </div>
            ${titlesHtml}
            ${rewardsHtml}
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
  if (e.key === 'Escape') { closeModal(); closeLegal(); }
});

// ============================================================
// LEGAL MODAL
// ============================================================
const LEGAL_CONTENT = {
  aviso: `
    <h2>Aviso Legal</h2>
    <p><strong>Ghost Syndicate Tools</strong> es un proyecto personal sin ánimo de lucro creado por <strong>TFundo</strong>, creador de contenido de Star Citizen. No es una empresa ni entidad jurídica registrada.</p>
    <p>Este sitio web es de acceso libre y gratuito. No se venden productos ni servicios. Las donaciones son voluntarias y no conllevan ninguna contraprestación.</p>

    <h2>Propiedad Intelectual</h2>
    <p>Ghost Syndicate Tools es contenido de fans no oficial. <strong>Star Citizen®, Roberts Space Industries® y Cloud Imperium®</strong> son marcas registradas de <strong>Cloud Imperium Rights LLC</strong>. Los datos, nombres e imágenes de naves, armas y elementos del juego pertenecen a Cloud Imperium Games Corp.</p>
    <p>Este proyecto se acoge a la <a href="https://robertsspaceindustries.com/fan-content-policy" target="_blank" rel="noopener">Fan Content Policy de Roberts Space Industries</a> y no está afiliado, patrocinado ni respaldado por Cloud Imperium Games de ningún modo.</p>
    <p>Las imágenes de naves se cargan directamente desde el CDN oficial de RSI y no son redistribuidas por este sitio.</p>

    <h2>Exención de Responsabilidad</h2>
    <p>La información contenida en esta web se ofrece "tal cual", sin garantías de exactitud o actualización. Los datos del juego pueden variar con cada parche. Ghost Syndicate Tools no se hace responsable de decisiones tomadas en base a la información aquí publicada.</p>

    <h2>Contacto</h2>
    <p>Para cualquier consulta puedes contactar a través del <a href="https://discord.com/invite/Ktfnbmj5s7" target="_blank" rel="noopener">Discord de Ghost Syndicate</a> o del canal de <a href="https://www.youtube.com/@tfundo" target="_blank" rel="noopener">YouTube de TFundo</a>.</p>
  `,
  privacidad: `
    <h2>Política de Privacidad</h2>
    <p>En Ghost Syndicate Tools nos tomamos tu privacidad en serio. A continuación explicamos qué datos se procesan al usar este sitio.</p>

    <h2>Datos que NO recopilamos</h2>
    <p>Este sitio <strong>no recoge, almacena ni procesa ningún dato personal</strong>. No hay formularios de registro, no hay cuentas de usuario, no hay analytics propios, no hay cookies propias.</p>

    <h2>Servicios de terceros</h2>
    <p><strong>Google Fonts</strong> — Este sitio carga tipografías desde los servidores de Google (fonts.googleapis.com). Al cargar la página, tu navegador realiza una solicitud a Google que puede registrar tu dirección IP según la <a href="https://policies.google.com/privacy" target="_blank" rel="noopener">política de privacidad de Google</a>. Puedes evitarlo usando un bloqueador de fuentes externas.</p>
    <p><strong>Roberts Space Industries CDN</strong> — Las imágenes de naves se cargan desde el CDN de RSI (media.robertsspaceindustries.com). RSI puede registrar las solicitudes según su propia política de privacidad.</p>
    <p><strong>PayPal</strong> — El botón de donación redirige a una página de PayPal. Solo si decides realizar una donación, PayPal procesará los datos necesarios para completar el pago según su <a href="https://www.paypal.com/es/legalhub/privacy-full" target="_blank" rel="noopener">política de privacidad</a>. Este sitio no recibe ni almacena ninguno de esos datos.</p>

    <h2>Cookies</h2>
    <p>Este sitio no establece ninguna cookie propia. Las solicitudes a Google Fonts y al CDN de RSI pueden generar cookies de terceros gestionadas íntegramente por dichos servicios.</p>

    <h2>Tus derechos (RGPD)</h2>
    <p>Al no recopilar datos personales, no hay datos sobre los que ejercer derechos de acceso, rectificación o supresión. Para cuestiones relacionadas con los servicios de terceros mencionados, contacta directamente con Google, RSI o PayPal.</p>

    <h2>Cambios en esta política</h2>
    <p>Cualquier modificación se publicará en esta misma página. Última actualización: abril 2025.</p>
  `
};

let _legalTab = 'aviso';

window.openLegal = function(tab = 'aviso') {
  _legalTab = tab;
  _renderLegalTab(tab);
  document.getElementById('legalOverlay').classList.add('open');
  document.getElementById('legalModal').classList.add('open');
};

window.closeLegal = function() {
  document.getElementById('legalOverlay').classList.remove('open');
  document.getElementById('legalModal').classList.remove('open');
};

window.switchLegalTab = function(tab) {
  _legalTab = tab;
  _renderLegalTab(tab);
};

function _renderLegalTab(tab) {
  document.getElementById('legalBody').innerHTML = LEGAL_CONTENT[tab] || '';
  document.getElementById('legalTabAviso').classList.toggle('active', tab === 'aviso');
  document.getElementById('legalTabPriv').classList.toggle('active', tab === 'privacidad');
}

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
