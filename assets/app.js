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
window.currentSection = currentSection;

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
    fab.title = t('dyn.scroll.title');
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
  window.currentSection = sectionId;

  // Hide all sections
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  // Show target
  const target = document.getElementById(sectionId);
  if (target) target.classList.add('active');

  // Update nav active state (top nav + bottom nav)
  document.querySelectorAll('.nav-link').forEach(l => {
    l.classList.toggle('active', l.dataset.section === sectionId);
  });
  document.querySelectorAll('.nav-bottom-item').forEach(b => {
    b.classList.toggle('active', b.dataset.section === sectionId);
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

  // Load WikeloData on first visit
  if (sectionId === 'wikelodata') loadWikeloDb();

  // Load Mining on first visit
  if (sectionId === 'mining' && window.Mining) Mining.load();

  // Hangar Ejecutivo: start/stop ticker
  if (sectionId === 'hangar') HNG.start();
  else HNG.stop();

  // Scroll to top
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

// ============================================================
// DATABASE LOADING
// ============================================================
async function loadDatabase() {
  try {
    const dbResp = await fetch('data/crafting_db.json');
    if (!dbResp.ok) throw new Error('HTTP ' + dbResp.status);
    db = await dbResp.json();
    initCraftingUI();
    updateHomeStats();
  } catch (err) {
    console.error('Failed to load database:', err);
    document.getElementById('loadingState').innerHTML = `
      <div style="text-align:center; padding: 3rem; color: var(--text-secondary)">
        <div style="font-size:2rem; margin-bottom:1rem;">⚠</div>
        <p>${t('dyn.loading.error')}</p>
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
    el.textContent = current.toLocaleString(t('locale'));
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
      case 'name': return a.name.localeCompare(b.name, currentLang);
      case 'category': return a.categoryPath.localeCompare(b.categoryPath, currentLang);
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
  countEl.textContent = `${filtered.length.toLocaleString(t('locale'))} ${t('dyn.blueprints')}`;

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
        ${t('dyn.showing', { n: filtered.length.toLocaleString(t('locale')) })}
      </div>
    `);
  }
}

function getCatInfo(catPath) {
  const p = (catPath || '').toLowerCase();
  if (p.includes('ammo')) {
    if (p.includes('laser'))     return { abbr: t('cat.laser'),        color: '#f59e0b' };
    if (p.includes('ballistic')) return { abbr: t('cat.ballistic'),    color: '#ef4444' };
    if (p.includes('plasma'))    return { abbr: t('cat.plasma'),       color: '#8b5cf6' };
    if (p.includes('electron'))  return { abbr: t('cat.electron'),     color: '#06b6d4' };
    if (p.includes('shotgun'))   return { abbr: t('cat.shotgun.ammo'), color: '#f97316' };
    return { abbr: t('cat.ammo'), color: '#ef4444' };
  }
  if (p.includes('armour') || p.includes('armor')) {
    if (p.includes('combat'))      return { abbr: t('cat.combat'),     color: '#3b82f6' };
    if (p.includes('stealth'))     return { abbr: t('cat.stealth'),    color: '#6366f1' };
    if (p.includes('explorer'))    return { abbr: t('cat.explorer'),   color: '#10b981' };
    if (p.includes('hunter'))      return { abbr: t('cat.hunter'),     color: '#f97316' };
    if (p.includes('medic'))       return { abbr: t('cat.medic'),      color: '#06b6d4' };
    if (p.includes('miner'))       return { abbr: t('cat.miner'),      color: '#78716c' };
    if (p.includes('engineer'))    return { abbr: t('cat.engineer'),   color: '#a78bfa' };
    if (p.includes('salvager'))    return { abbr: t('cat.salvager'),   color: '#d97706' };
    if (p.includes('flightsuit'))  return { abbr: t('cat.pilot'),      color: '#22c55e' };
    if (p.includes('racer'))       return { abbr: t('cat.pilot'),      color: '#22c55e' };
    if (p.includes('radiation'))   return { abbr: t('cat.radiation'),  color: '#84cc16' };
    if (p.includes('environment')) return { abbr: t('cat.environment'),color: '#84cc16' };
    if (p.includes('cosmonaut'))   return { abbr: t('cat.cosmonaut'),  color: '#60a5fa' };
    if (p.includes('undersuit'))   return { abbr: t('cat.undersuit'),  color: '#94a3b8' };
    return { abbr: t('cat.armor'), color: '#3b82f6' };
  }
  if (p.includes('weapons') || p.includes('weapon')) {
    if (p.includes('rifle'))   return { abbr: t('cat.rifle'),  color: '#f59e0b' };
    if (p.includes('pistol'))  return { abbr: t('cat.pistol'), color: '#d97706' };
    if (p.includes('sniper'))  return { abbr: t('cat.sniper'), color: '#8b5cf6' };
    if (p.includes('smg'))     return { abbr: t('cat.smg'),    color: '#ef4444' };
    if (p.includes('lmg'))     return { abbr: t('cat.lmg'),    color: '#dc2626' };
    if (p.includes('shotgun')) return { abbr: t('cat.shotgun'),color: '#f97316' };
    return { abbr: t('cat.weapon'), color: '#f59e0b' };
  }
  return { abbr: t('cat.item'), color: '#8a7048' };
}

function renderBlueprintCard(bp, idx) {
  const tier = bp.tiers[0];
  const ingredients = tier?.ingredients || [];
  const previewIngredients = ingredients.slice(0, 3);
  const extraIngredients = ingredients.slice(3);
  const extraCount = extraIngredients.length;

  const renderIng = ing => `
    <div class="bp-ingredient">
      <span class="ing-qty">${formatSCU(ing.quantity_scu)}</span>
      <span class="ing-name">${escHtml(ing.resourceName)}</span>
      <span class="ing-slot">${escHtml(ing.slot || '')}</span>
    </div>`;

  const ingHtml = previewIngredients.map(renderIng).join('');
  const extraHtml = extraCount > 0
    ? `<div class="bp-extra-ingredients hidden">${extraIngredients.map(renderIng).join('')}</div>
       <button class="bp-more-btn" onclick="event.stopPropagation();this.previousElementSibling.classList.toggle('hidden');this.classList.toggle('expanded');this.textContent=this.classList.contains('expanded')?t('dyn.see.less'):t('dyn.more.materials',{n:${extraCount}})">${t('dyn.more.materials', { n: extraCount })}</button>`
    : '';

  const catInfo = getCatInfo(bp.categoryPath);
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
        const tooltip = (m.contractor ? m.contractor + ': ' : '') + m.missionName;
        const sysBadges = (m.systems && m.systems.length > 0)
          ? m.systems.map(s => `<span class="card-system-badge card-system-${s.toLowerCase()}">${s}</span>`).join('')
          : '';
        return `<span class="mission-tag" title="${escHtml(tooltip)}"><span class="mission-tag-text">${escHtml(display)}</span>${sysBadges}</span>`;
      }).join('')
    : `<span style="color:var(--text-muted);font-size:0.7rem">${t('dyn.no.mission')}</span>`;

  return `
    <div class="bp-card" onclick="openBlueprintDetail(${idx})" style="animation-delay:${Math.min(idx * 0.02, 0.5)}s">
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
        ${extraHtml}
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
          ${ing.minQuality > 0 ? `<span class="modal-quality">${t('dyn.min.quality')}: ${ing.minQuality}</span>` : ''}
        </div>
      `).join('')
    : `<p class="modal-no-data">${t('dyn.modal.no.ingredients')}</p>`;

  // Deduplicate missions by poolFile
  const uniqueMissions = [];
  const seenPools = new Set();
  bp.missions.forEach(m => {
    if (!seenPools.has(m.poolFile)) {
      seenPools.add(m.poolFile);
      uniqueMissions.push(m);
    }
  });

  const DIFF_ABBREV = { VeryEasy: t('diff.abbr.VeryEasy'), Easy: t('diff.abbr.Easy'), Medium: t('diff.abbr.Medium'), Hard: t('diff.abbr.Hard'), VeryHard: t('diff.abbr.VeryHard'), Super: t('diff.abbr.Super') };
  const DIFF_LABEL  = { VeryEasy: t('diff.VeryEasy'), Easy: t('diff.Easy'), Medium: t('diff.Medium'), Hard: t('diff.Hard'), VeryHard: t('diff.VeryHard'), Super: t('diff.Super') };

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
            rewardsHtml = `<table class="mission-scrip-table"><thead><tr><th>${t('dyn.difficulty')}</th><th>${t('dyn.reward')}</th></tr></thead><tbody>${rows}</tbody></table>`;
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
    : `<p class="modal-no-data">${t('dyn.modal.no.mission')}</p>`;

  // Craft times
  const timesHtml = bp.tiers
    .filter(t => t.craftTime != null)
    .map((tier, i) => `
      <span class="modal-craft-time">⏱ Tier ${i+1}: <strong>${formatTime(tier.craftTime)}</strong></span>
    `).join(' ') || `<p class="modal-no-data">${t('dyn.modal.no.time')}</p>`;

  modalContent.innerHTML = `
    <div class="modal-title">${escHtml(bp.name)}</div>
    <div class="modal-category">${escHtml(bp.categoryPath)}</div>
    ${bp.itemEntity ? `<div class="modal-entity">📦 ${escHtml(bp.itemEntity)}</div>` : ''}

    <div class="modal-section-title">${t('dyn.modal.craft.time')}</div>
    <div>${timesHtml}</div>

    <div class="modal-section-title">${t('dyn.modal.materials')}</div>
    ${ingredientsHtml}

    <div class="modal-section-title">${t('dyn.modal.missions')}</div>
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

// ============================================================
// WIKELODATA SECTION
// ============================================================
const wkState = {
  db: null,
  activeTab: 'ships',
  search: '',
};

const WK_ICONS = {
  ships:   '🚀',
  armors:  '🛡',
  weapons: '⚔',
  misc:    '🔧',
  economy: '💱',
};

async function loadWikeloDb() {
  if (wkState.db) return;
  try {
    const resp = await fetch('data/wikelo_db.json');
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    wkState.db = await resp.json();
    initWikelo();
  } catch (e) {
    document.getElementById('wkLoading').innerHTML = `<p style="color:var(--accent)">${t('dyn.wk.error')}</p>`;
  }
}

function initWikelo() {
  const db = wkState.db;
  window._wkReady = true;
  document.getElementById('wkLoading').classList.add('hidden');

  // Build tabs
  const tabsEl = document.getElementById('wkTabs');
  tabsEl.innerHTML = Object.entries(db).map(([key, cat]) =>
    `<button class="wk-tab${key === wkState.activeTab ? ' active' : ''}" onclick="wkSetTab('${key}')">
      ${WK_ICONS[key] || '◈'} ${cat.label}
    </button>`
  ).join('');

  // Search listener
  const searchEl = document.getElementById('wkSearch');
  searchEl.addEventListener('input', e => {
    wkState.search = e.target.value.toLowerCase();
    document.getElementById('wkSearchClear').classList.toggle('visible', wkState.search.length > 0);
    renderWikelo();
  });

  renderWikelo();
}

window.wkSetTab = function(tab) {
  wkState.activeTab = tab;
  wkState.search = '';
  document.getElementById('wkSearch').value = '';
  document.getElementById('wkSearchClear').classList.remove('visible');
  document.querySelectorAll('.wk-tab').forEach(b => b.classList.toggle('active', b.textContent.trim().includes(wkState.db[tab]?.label || tab)));
  // Re-mark active tab reliably
  document.querySelectorAll('.wk-tab').forEach((b, i) => {
    const keys = Object.keys(wkState.db);
    b.classList.toggle('active', keys[i] === tab);
  });
  renderWikelo();
};

window.wkClearSearch = function() {
  wkState.search = '';
  document.getElementById('wkSearch').value = '';
  document.getElementById('wkSearchClear').classList.remove('visible');
  renderWikelo();
};

function renderWikelo() {
  const db = wkState.db;
  const cat = db[wkState.activeTab];
  const content = document.getElementById('wkContent');
  const countEl = document.getElementById('wkCount');

  if (cat.type === 'tables') {
    countEl.textContent = '';
    content.innerHTML = renderWikeloTables(cat);
    return;
  }

  // Filter cards
  const q = wkState.search;
  const items = q
    ? cat.items.filter(it =>
        it.name.toLowerCase().includes(q) ||
        (it.desc || '').toLowerCase().includes(q) ||
        it.cost.some(c => c.toLowerCase().includes(q))
      )
    : cat.items;

  countEl.textContent = `${items.length} ${t('dyn.items')}`;
  content.innerHTML = items.length
    ? `<div class="wk-grid">${items.map(renderWikeloCard).join('')}</div>`
    : `<div class="empty-state"><div class="empty-icon">◈</div><p>${t('dyn.wk.no.items')}</p></div>`;
}

function renderWikeloCard(item) {
  const costsHtml = item.cost.map(c =>
    `<li class="wk-cost-item"><span class="wk-bullet">▸</span>${escHtml(c)}</li>`
  ).join('');

  const compsHtml = item.comps && item.comps.length
    ? `<div class="wk-comps">
        <span class="wk-comps-label">${t('dyn.wk.comps')}</span>
        ${item.comps.map(c => `<span class="wk-comp-tag">${escHtml(c)}</span>`).join('')}
       </div>`
    : '';

  const missionMatch = (item.desc || '').match(/[Mm]isi[oó]n[:\s]*['"]?([^'.]+)/);
  const missionHtml = missionMatch
    ? `<div class="wk-mission"><span class="wk-mission-icon">🎯</span>${escHtml(missionMatch[1].trim())}</div>`
    : '';

  const descClean = (item.desc || '').replace(/Misi[oó]n[:\s]*['"]?[^'.]+['"]?\.?\s*/i, '').trim();
  const descHtml = descClean
    ? `<p class="wk-desc">${escHtml(descClean)}</p>`
    : '';

  return `
    <div class="wk-card">
      <div class="wk-card-header">
        <span class="wk-item-name">${escHtml(item.name)}</span>
      </div>
      ${missionHtml}
      ${descHtml}
      <ul class="wk-cost-list">${costsHtml}</ul>
      ${compsHtml}
    </div>`;
}

function renderWikeloTables(cat) {
  return cat.tables.map(table => `
    <div class="wk-table-block">
      <h3 class="wk-table-title">${escHtml(table.title)}</h3>
      <div class="wk-table-wrap">
        <table class="wk-table">
          <thead><tr>${table.headers.map(h => `<th>${escHtml(h)}</th>`).join('')}</tr></thead>
          <tbody>${table.rows.map(row =>
            `<tr>${row.map(cell => `<td>${escHtml(cell)}</td>`).join('')}</tr>`
          ).join('')}</tbody>
        </table>
      </div>
    </div>
  `).join('');
}

// ============================================================
// HANGAR EJECUTIVO — PYAM STATUS TRACKER
// Based on exec.xyxyll.com by Xyxyll (MIT License)
// ============================================================
const HNG = (() => {
  const OPEN_DURATION  = 3900338;
  const CLOSE_DURATION = 7200623;
  const CYCLE_DURATION = OPEN_DURATION + CLOSE_DURATION;
  const INITIAL_OPEN   = new Date('2026-03-26T01:11:56.500-04:00');

  const CIRCLES_THRESHOLDS = [
    { min: 0,           max: 12*60*1000,  colors: ['green','green','green','green','green'] },
    { min: 12*60*1000,  max: 24*60*1000,  colors: ['green','green','green','green','empty'] },
    { min: 24*60*1000,  max: 36*60*1000,  colors: ['green','green','green','empty','empty'] },
    { min: 36*60*1000,  max: 48*60*1000,  colors: ['green','green','empty','empty','empty'] },
    { min: 48*60*1000,  max: 60*60*1000,  colors: ['green','empty','empty','empty','empty'] },
    { min: 60*60*1000,  max: 65*60*1000,  colors: ['empty','empty','empty','empty','empty'] },
    { min: 65*60*1000,  max: 89*60*1000,  colors: ['red',  'red',  'red',  'red',  'red'  ] },
    { min: 89*60*1000,  max: 113*60*1000, colors: ['green','red',  'red',  'red',  'red'  ] },
    { min: 113*60*1000, max: 137*60*1000, colors: ['green','green','red',  'red',  'red'  ] },
    { min: 137*60*1000, max: 161*60*1000, colors: ['green','green','green','red',  'red'  ] },
    { min: 161*60*1000, max: 185*60*1000, colors: ['green','green','green','green','red'  ] },
  ];

  let _intervalId = null;
  let _circles = null;

  // ── Alert system ──────────────────────────────────────────
  const ALERT_OPEN_MS   = 25 * 60 * 1000;  // 25 min before opening
  const ALERT_CLOSE_MS  = 15 * 60 * 1000;  // 15 min before closing
  const ALERT_REPEAT_MS =  5 * 60 * 1000;  // repeat interval

  let _alertEnabled = false;
  let _alertFiredOpen     = false;
  let _alertFiredClose    = false;
  let _lastOpenAlertTime  = 0;
  let _lastCloseAlertTime = 0;
  let _prevOnline         = null;
  let _audioCtx = null;

  function getAudioCtx() {
    if (!_audioCtx) {
      _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    // Resume if suspended (browser autoplay policy)
    if (_audioCtx.state === 'suspended') _audioCtx.resume();
    return _audioCtx;
  }

  // Play a synthesized alert tone
  // type: 'open' (ascending seq) | 'close' (descending seq) | 'opened' (triumphant chord)
  function playAlert(type) {
    try {
      const ctx = getAudioCtx();
      const now = ctx.currentTime;

      if (type === 'opened') {
        // Triumphant chord: all notes simultaneously, long sustain
        [523.25, 659.25, 783.99, 1046.50].forEach(freq => {
          const osc  = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.type = 'sine';
          osc.frequency.value = freq;
          gain.gain.setValueAtTime(0, now);
          gain.gain.linearRampToValueAtTime(0.22, now + 0.04);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 2.2);
          osc.start(now);
          osc.stop(now + 2.3);
        });
        return;
      }

      const notes = type === 'open'
        ? [523.25, 659.25, 783.99, 1046.50]   // C5 E5 G5 C6 — ascending
        : [1046.50, 783.99, 523.25, 392.00];   // C6 G5 C5 G4 — descending warning

      notes.forEach((freq, i) => {
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.type = 'sine';
        osc.frequency.value = freq;

        const t0 = now + i * 0.22;
        gain.gain.setValueAtTime(0, t0);
        gain.gain.linearRampToValueAtTime(0.35, t0 + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.45);

        osc.start(t0);
        osc.stop(t0 + 0.5);
      });
    } catch (e) {
      console.warn('HNG alert sound error:', e);
    }
  }

  function checkAlerts(online, remaining) {
    if (!_alertEnabled) return;
    const nowMs = Date.now();

    // Fire special sound exactly when hangar transitions to open
    if (_prevOnline === false && online) {
      playAlert('opened');
      showAlertToast(t('dyn.alert.toast.opened'));
    }
    _prevOnline = online;

    if (!online) {
      // Hangar CLOSED — alert 25 min before opening, repeat every 5 min
      if (remaining <= ALERT_OPEN_MS) {
        if (!_alertFiredOpen || (nowMs - _lastOpenAlertTime) >= ALERT_REPEAT_MS) {
          _alertFiredOpen = true;
          _lastOpenAlertTime = nowMs;
          playAlert('open');
          showAlertToast(t('dyn.alert.toast.open'));
        }
      }
      _alertFiredClose = false;
      _lastCloseAlertTime = 0;
    } else {
      // Hangar OPEN — alert 15 min before closing, repeat every 5 min
      if (remaining <= ALERT_CLOSE_MS) {
        if (!_alertFiredClose || (nowMs - _lastCloseAlertTime) >= ALERT_REPEAT_MS) {
          _alertFiredClose = true;
          _lastCloseAlertTime = nowMs;
          playAlert('close');
          showAlertToast(t('dyn.alert.toast.close'));
        }
      }
      _alertFiredOpen = false;
      _lastOpenAlertTime = 0;
    }
  }

  function showAlertToast(msg) {
    let toast = document.getElementById('hngToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'hngToast';
      toast.className = 'hng-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.add('hng-toast-show');
    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(() => toast.classList.remove('hng-toast-show'), 5000);
  }

  function toggleAlert() {
    // On first activation, resume AudioContext (required by browsers)
    try { getAudioCtx(); } catch(e) {}

    _alertEnabled = !_alertEnabled;
    _alertFiredOpen  = false;
    _alertFiredClose = false;

    const btn    = document.getElementById('hngAlertBtn');
    const label  = document.getElementById('hngAlertLabel');
    const status = document.getElementById('hngAlertStatus');

    if (_alertEnabled) {
      btn.classList.add('hng-alert-active');
      label.textContent = t('dyn.alert.on');
      status.textContent = t('dyn.alert.status');
      // Play a short confirmation beep
      playAlert('open');
    } else {
      btn.classList.remove('hng-alert-active');
      label.textContent = t('dyn.alert.off');
      status.textContent = '';
    }
  }

  function getStatus(now) {
    const elapsed = now - INITIAL_OPEN;
    const timeInCycle = ((elapsed % CYCLE_DURATION) + CYCLE_DURATION) % CYCLE_DURATION;
    if (timeInCycle < OPEN_DURATION) {
      return { online: true,  remaining: OPEN_DURATION  - timeInCycle, timeInCycle };
    } else {
      return { online: false, remaining: CYCLE_DURATION - timeInCycle, timeInCycle };
    }
  }

  function fmt(ms) {
    const total = Math.max(0, Math.floor(ms / 1000));
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  }

  function updateUI() {
    const now = new Date();
    const { online, remaining, timeInCycle } = getStatus(now);

    const card    = document.getElementById('hngStatusCard');
    const statusEl = document.getElementById('hngStatus');
    const cdEl    = document.getElementById('hngCountdown');
    const infoEl  = document.getElementById('hngCycleInfo');
    if (!statusEl) return;

    const isOnline = online;
    statusEl.textContent = isOnline ? t('dyn.open') : t('dyn.closed');
    statusEl.className   = 'hng-status-value ' + (isOnline ? 'hng-online' : 'hng-offline');
    card.className       = 'hng-status-card ' + (isOnline ? 'hng-card-online' : 'hng-card-offline');
    cdEl.textContent     = fmt(remaining);

    // Duration info
    const openMin  = Math.round(OPEN_DURATION  / 60000);
    const closeMin = Math.round(CLOSE_DURATION / 60000);
    infoEl.textContent = t('dyn.cycle.info', { open: openMin, close: closeMin });

    // Alert check
    checkAlerts(isOnline, remaining);

    // Circles
    if (_circles) {
      const match = CIRCLES_THRESHOLDS.find(t => timeInCycle >= t.min && timeInCycle < t.max);
      if (match) {
        _circles.forEach((c, i) => {
          const col = match.colors[i];
          c.style.background = col === 'green' ? 'var(--hng-green)' : col === 'red' ? 'var(--hng-red)' : 'transparent';
          c.style.borderColor = col === 'empty' ? 'rgba(255,255,255,0.15)' : 'transparent';
        });
      }
    }
  }

  function buildSchedule() {
    const tbody = document.getElementById('hngSchedule');
    if (!tbody) return;
    const now = new Date();
    const events = [];
    const { online, remaining } = getStatus(now);

    let cursor = new Date(now.getTime() + remaining);
    let nextOnline = !online;
    const endTime = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    // If currently online, first upcoming event is going offline
    if (online) {
      events.push({ online: false, time: cursor });
      cursor = new Date(cursor.getTime() + CLOSE_DURATION);
      nextOnline = true;
    } else {
      events.push({ online: true, time: cursor });
      cursor = new Date(cursor.getTime() + OPEN_DURATION);
      nextOnline = false;
    }

    while (cursor < endTime) {
      if (nextOnline) {
        events.push({ online: true, time: cursor });
        cursor = new Date(cursor.getTime() + OPEN_DURATION);
        nextOnline = false;
      } else {
        events.push({ online: false, time: cursor });
        cursor = new Date(cursor.getTime() + CLOSE_DURATION);
        nextOnline = true;
      }
    }

    const getCycle = (evtTime) => Math.floor((evtTime - INITIAL_OPEN) / CYCLE_DURATION) + 3;

    let html = '';
    let i = 0;
    while (i < events.length) {
      const ev = events[i];
      if (ev.online && i + 1 < events.length && !events[i+1].online) {
        const cycle = getCycle(events[i+1].time);
        html += `<tr><td class="hng-td-cycle" rowspan="2">${cycle}</td>
          <td class="hng-td-online">${t('dyn.open')}</td>
          <td>${ev.time.toLocaleString(t('locale'),{weekday:'short',hour:'2-digit',minute:'2-digit'})}</td></tr>
          <tr><td class="hng-td-offline">${t('dyn.closed')}</td>
          <td>${events[i+1].time.toLocaleString(t('locale'),{weekday:'short',hour:'2-digit',minute:'2-digit'})}</td></tr>`;
        i += 2;
      } else {
        const cycle = getCycle(ev.time);
        html += `<tr><td class="hng-td-cycle">${cycle}</td>
          <td class="${ev.online ? 'hng-td-online' : 'hng-td-offline'}">${ev.online ? t('dyn.open') : t('dyn.closed')}</td>
          <td>${ev.time.toLocaleString(t('locale'),{weekday:'short',hour:'2-digit',minute:'2-digit'})}</td></tr>`;
        i++;
      }
    }
    tbody.innerHTML = html;
  }

  function start() {
    _circles = [1,2,3,4,5].map(n => document.getElementById('hngC' + n));
    updateUI();
    buildSchedule();
    _intervalId = setInterval(() => {
      updateUI();
      // Rebuild schedule every minute
      if (new Date().getSeconds() === 0) buildSchedule();
    }, 1000);
  }

  function stop() {
    if (_intervalId) { clearInterval(_intervalId); _intervalId = null; }
  }

  function rebuildAll() { updateUI(); buildSchedule(); }
  return { start, stop, toggleAlert, rebuild: rebuildAll };
})();
