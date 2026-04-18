/* ===================================================
   GHOST SYNDICATE TOOLS — i18n
   Español / English
   ================================================= */

'use strict';

const TRANSLATIONS = {
  es: {
    // Nav
    'nav.home': 'Inicio',
    'nav.crafting': 'Fabricación',
    'nav.comparador': 'Comparador',
    'nav.wikelodata': 'WikeloData',
    'nav.hangar': 'Hangar Ejecutivo',
    'nav.mining': 'Minería',
    // Home
    'home.badge': 'Star Citizen 4.7.1 · Base de datos activa',
    'home.desc': 'Herramienta para acompañarte en tus partidas de <strong>STAR CITIZEN</strong>',
    'home.stat.blueprints': 'Planos',
    'home.stat.materials': 'Materiales',
    'home.stat.missions': 'Con misión',
    'home.modules.title': 'Módulos Disponibles',
    'home.crafting.title': 'Fabricación',
    'home.crafting.desc': '1.044 planos con ingredientes, misiones y recompensas de scrip.',
    'home.comparador.title': 'Comparador',
    'home.comparador.desc': '250+ naves con datos reales del juego. Filtra y compara hasta 4 lado a lado.',
    'home.wikelodata.title': 'WikeloData',
    'home.wikelodata.desc': 'Ítems Wikelo: costes de fabricación, reputación y economía.',
    'home.hangar.title': 'Hangar Ejecutivo',
    'home.hangar.desc': 'Horarios de apertura en tiempo real con alerta sonora configurable.',
    'home.mining.title': 'Minería',
    'home.mining.desc': '31 minerales, escáner de emisiones y ubicaciones por concentración.',
    'home.missions.title': 'Misiones',
    'home.missions.desc': 'Contratos, reputación y guías de facciones del universo.',
    'home.coming': 'En desarrollo',
    'home.access': 'Acceder →',
    'social.join': 'Únete a la ORG',
    // Crafting
    'crafting.title': '⚙ Fabricación',
    'crafting.subtitle': 'Base de datos de planos · SC 4.7.1',
    'crafting.search.ph': 'Buscar por nombre, material o categoría...',
    'crafting.btn.mission': 'Solo con misión',
    'crafting.filter.all': 'Todas las categorías',
    'crafting.filter.all.src': 'Todas las fuentes',
    'crafting.filter.mission': 'Solo con misión',
    'crafting.filter.no.mission': 'Sin misión',
    'crafting.sort.name': 'Ordenar: Nombre',
    'crafting.sort.category': 'Ordenar: Categoría',
    'crafting.sort.ingredients': 'Ordenar: Ingredientes',
    'crafting.loading': 'Cargando base de datos...',
    'crafting.empty.msg': 'No se encontraron planos con ese criterio',
    'crafting.empty.btn': 'Limpiar búsqueda',
    // Comparador
    'comp.ships': 'Naves',
    'comp.weapons': 'Armas',
    'comp.compare': 'Comparar',
    // WikeloData
    'wk.title': '◈ WikeloData',
    'wk.subtitle': 'Ítems Wikelo · Naves, armaduras, armas &amp; economía · SC 4.7.1',
    'wk.search.ph': 'Buscar ítem, material o misión...',
    // Hangar
    'hng.title': '🛬 Hangar Ejecutivo',
    'hng.subtitle': 'Estado del PYAM Ejecutivo en tiempo real · SC 4.7.1',
    'hng.status.label': 'Estado actual',
    'hng.next.label': 'Próximo cambio en',
    'hng.alert.btn': 'Activar alertas',
    'hng.schedule.title': 'Próximos ciclos',
    'hng.table.cycle': 'Ciclo',
    'hng.table.status': 'Estado',
    'hng.table.time': 'Hora local',
    // Mining
    'mining.title': '⛏ Minería',
    'mining.subtitle': 'Minerales · Escáner · Ubicaciones · SC 4.7.1',
    'mining.loading': 'Cargando datos de minería...',
    // Footer
    'footer.note': 'Ghost Syndicate Tools es un proyecto de fans no oficial, no afiliado ni respaldado por Cloud Imperium Games.<br>Star Citizen®, Roberts Space Industries® y Cloud Imperium® son marcas registradas de Cloud Imperium Rights LLC.<br>Contenido creado bajo la <a class="footer-link" href="https://robertsspaceindustries.com/fan-content-policy" target="_blank" rel="noopener">Fan Content Policy de RSI</a>. Uso estrictamente no comercial.',
    'footer.legal': 'Aviso Legal',
    'footer.privacy': 'Política de Privacidad',
    'footer.donate': '♥ Donar',
    'footer.copy': '© 2025 Ghost Syndicate Tools · TFundo · Proyecto de fans sin ánimo de lucro',
    'legal.tab.aviso': 'Aviso Legal',
    'legal.tab.priv': 'Privacidad',
    // Bottom nav
    'nav.bottom.home': 'Inicio',
    'nav.bottom.crafting': 'Fabricar',
    'nav.bottom.ships': 'Naves',
    'nav.bottom.wikelo': 'Wikelo',
    'nav.bottom.hangar': 'Hangar',
    // Dynamic strings used in app.js
    'dyn.blueprints': 'planos',
    'dyn.see.less': '▲ Ver menos',
    'dyn.more.materials': '▼ +{n} materiales más',
    'dyn.no.mission': 'Sin misión asignada',
    'dyn.open': 'ABIERTO',
    'dyn.closed': 'CERRADO',
    'dyn.cycle.info': 'Abierto {open} min · Cerrado {close} min por ciclo',
    'dyn.alert.on': 'Alertas activadas',
    'dyn.alert.off': 'Activar alertas',
    'dyn.alert.status': '🔔 Sonará 25 min antes de abrir · 15 min antes de cerrar',
    'dyn.alert.toast.open': '🔔 El hangar abre en ~25 minutos',
    'dyn.alert.toast.close': '⚠️ El hangar cierra en ~15 minutos',
    'dyn.items': 'ítems',
    'dyn.loading.error': 'Error al cargar la base de datos.',
    'dyn.showing': 'Mostrando 200 de {n} planos. Usa el buscador para filtrar.',
    'dyn.modal.craft.time': '⏱ Tiempo de fabricación',
    'dyn.modal.materials': '🧪 Materiales necesarios',
    'dyn.modal.missions': '🎯 Misiones fuente',
    'dyn.modal.no.mission': 'Este plano no se obtiene como recompensa de misión. Puede estar en tiendas o ser desbloqueado de otra forma.',
    'dyn.modal.no.time': 'Tiempo no especificado',
    'dyn.modal.no.ingredients': 'Sin ingredientes registrados',
    'dyn.min.quality': 'Min. calidad',
    'dyn.difficulty': 'Dificultad',
    'dyn.reward': 'Recompensa',
    'dyn.wk.error': 'Error cargando datos Wikelo.',
    'dyn.wk.no.items': 'No se encontraron ítems',
    'dyn.scroll.title': 'Volver al inicio de la lista',
    'dyn.wk.comps': 'Componentes',
    // Category abbreviations
    'cat.laser': 'LASER',
    'cat.ballistic': 'BALÍSTICO',
    'cat.plasma': 'PLASMA',
    'cat.electron': 'ELECTRÓN',
    'cat.shotgun.ammo': 'ESCOPETA',
    'cat.ammo': 'MUNICIÓN',
    'cat.combat': 'COMBATE',
    'cat.stealth': 'SIGILO',
    'cat.explorer': 'EXPLORAC',
    'cat.hunter': 'CAZADOR',
    'cat.medic': 'MÉDICO',
    'cat.miner': 'MINERO',
    'cat.engineer': 'INGENIERO',
    'cat.salvager': 'SALVADOR',
    'cat.pilot': 'PILOTO',
    'cat.radiation': 'RADIACIÓN',
    'cat.environment': 'AMBIENTAL',
    'cat.cosmonaut': 'COSMONAUTA',
    'cat.undersuit': 'INTERIOR',
    'cat.armor': 'ARMADURA',
    'cat.rifle': 'RIFLE',
    'cat.pistol': 'PISTOLA',
    'cat.sniper': 'FRANCOTIRADOR',
    'cat.smg': 'SMG',
    'cat.lmg': 'LMG',
    'cat.shotgun': 'ESCOPETA',
    'cat.weapon': 'ARMA',
    'cat.item': 'OBJETO',
    // Difficulty labels
    'diff.VeryEasy': 'Muy Fácil',
    'diff.Easy': 'Fácil',
    'diff.Medium': 'Media',
    'diff.Hard': 'Difícil',
    'diff.VeryHard': 'Muy Difícil',
    'diff.Super': 'Súper',
    'diff.abbr.VeryEasy': 'MF',
    'diff.abbr.Easy': 'F',
    'diff.abbr.Medium': 'M',
    'diff.abbr.Hard': 'D',
    'diff.abbr.VeryHard': 'MD',
    'diff.abbr.Super': 'S',
    // Hangar locale
    'locale': 'es-ES',
  },

  en: {
    // Nav
    'nav.home': 'Home',
    'nav.crafting': 'Crafting',
    'nav.comparador': 'Comparator',
    'nav.wikelodata': 'WikeloData',
    'nav.hangar': 'Executive Hangar',
    'nav.mining': 'Mining',
    // Home
    'home.badge': 'Star Citizen 4.7.1 · Active database',
    'home.desc': 'Tool to accompany you in your <strong>STAR CITIZEN</strong> sessions',
    'home.stat.blueprints': 'Blueprints',
    'home.stat.materials': 'Materials',
    'home.stat.missions': 'With mission',
    'home.modules.title': 'Available Modules',
    'home.crafting.title': 'Crafting',
    'home.crafting.desc': '1,044 blueprints with ingredients, missions and scrip rewards.',
    'home.comparador.title': 'Comparator',
    'home.comparador.desc': '250+ ships with real game data. Filter and compare up to 4 side by side.',
    'home.wikelodata.title': 'WikeloData',
    'home.wikelodata.desc': 'Wikelo items: crafting costs, reputation and economy.',
    'home.hangar.title': 'Executive Hangar',
    'home.hangar.desc': 'Real-time opening schedule with configurable sound alerts.',
    'home.mining.title': 'Mining',
    'home.mining.desc': '31 minerals, emission scanner and locations by concentration.',
    'home.missions.title': 'Missions',
    'home.missions.desc': 'Contracts, reputation and faction guides of the universe.',
    'home.coming': 'In development',
    'home.access': 'Access →',
    'social.join': 'Join the ORG',
    // Crafting
    'crafting.title': '⚙ Crafting',
    'crafting.subtitle': 'Blueprint database · SC 4.7.1',
    'crafting.search.ph': 'Search by name, material or category...',
    'crafting.btn.mission': 'Mission only',
    'crafting.filter.all': 'All categories',
    'crafting.filter.all.src': 'All sources',
    'crafting.filter.mission': 'Mission only',
    'crafting.filter.no.mission': 'No mission',
    'crafting.sort.name': 'Sort: Name',
    'crafting.sort.category': 'Sort: Category',
    'crafting.sort.ingredients': 'Sort: Ingredients',
    'crafting.loading': 'Loading database...',
    'crafting.empty.msg': 'No blueprints found for that criteria',
    'crafting.empty.btn': 'Clear search',
    // Comparador
    'comp.ships': 'Ships',
    'comp.weapons': 'Weapons',
    'comp.compare': 'Compare',
    // WikeloData
    'wk.title': '◈ WikeloData',
    'wk.subtitle': 'Wikelo Items · Ships, armor, weapons &amp; economy · SC 4.7.1',
    'wk.search.ph': 'Search item, material or mission...',
    // Hangar
    'hng.title': '🛬 Executive Hangar',
    'hng.subtitle': 'PYAM Executive status in real time · SC 4.7.1',
    'hng.status.label': 'Current status',
    'hng.next.label': 'Next change in',
    'hng.alert.btn': 'Enable alerts',
    'hng.schedule.title': 'Upcoming cycles',
    'hng.table.cycle': 'Cycle',
    'hng.table.status': 'Status',
    'hng.table.time': 'Local time',
    // Mining
    'mining.title': '⛏ Mining',
    'mining.subtitle': 'Minerals · Scanner · Locations · SC 4.7.1',
    'mining.loading': 'Loading mining data...',
    // Footer
    'footer.note': 'Ghost Syndicate Tools is an unofficial fan project, not affiliated with or endorsed by Cloud Imperium Games.<br>Star Citizen®, Roberts Space Industries® and Cloud Imperium® are registered trademarks of Cloud Imperium Rights LLC.<br>Content created under the <a class="footer-link" href="https://robertsspaceindustries.com/fan-content-policy" target="_blank" rel="noopener">RSI Fan Content Policy</a>. Strictly non-commercial use.',
    'footer.legal': 'Legal Notice',
    'footer.privacy': 'Privacy Policy',
    'footer.donate': '♥ Donate',
    'footer.copy': '© 2025 Ghost Syndicate Tools · TFundo · Non-profit fan project',
    'legal.tab.aviso': 'Legal Notice',
    'legal.tab.priv': 'Privacy',
    // Bottom nav
    'nav.bottom.home': 'Home',
    'nav.bottom.crafting': 'Craft',
    'nav.bottom.ships': 'Ships',
    'nav.bottom.wikelo': 'Wikelo',
    'nav.bottom.hangar': 'Hangar',
    // Dynamic strings used in app.js
    'dyn.blueprints': 'blueprints',
    'dyn.see.less': '▲ See less',
    'dyn.more.materials': '▼ +{n} more materials',
    'dyn.no.mission': 'No mission assigned',
    'dyn.open': 'OPEN',
    'dyn.closed': 'CLOSED',
    'dyn.cycle.info': 'Open {open} min · Closed {close} min per cycle',
    'dyn.alert.on': 'Alerts enabled',
    'dyn.alert.off': 'Enable alerts',
    'dyn.alert.status': '🔔 Will play 25 min before opening · 15 min before closing',
    'dyn.alert.toast.open': '🔔 Hangar opens in ~25 minutes',
    'dyn.alert.toast.close': '⚠️ Hangar closes in ~15 minutes',
    'dyn.items': 'items',
    'dyn.loading.error': 'Error loading database.',
    'dyn.showing': 'Showing 200 of {n} blueprints. Use search to filter.',
    'dyn.modal.craft.time': '⏱ Craft time',
    'dyn.modal.materials': '🧪 Required materials',
    'dyn.modal.missions': '🎯 Source missions',
    'dyn.modal.no.mission': 'This blueprint is not obtained as a mission reward. It may be available in shops or unlocked another way.',
    'dyn.modal.no.time': 'Time not specified',
    'dyn.modal.no.ingredients': 'No ingredients registered',
    'dyn.min.quality': 'Min. quality',
    'dyn.difficulty': 'Difficulty',
    'dyn.reward': 'Reward',
    'dyn.wk.error': 'Error loading Wikelo data.',
    'dyn.wk.no.items': 'No items found',
    'dyn.scroll.title': 'Back to top of list',
    'dyn.wk.comps': 'Components',
    // Category abbreviations
    'cat.laser': 'LASER',
    'cat.ballistic': 'BALLISTIC',
    'cat.plasma': 'PLASMA',
    'cat.electron': 'ELECTRON',
    'cat.shotgun.ammo': 'SHOTGUN',
    'cat.ammo': 'AMMO',
    'cat.combat': 'COMBAT',
    'cat.stealth': 'STEALTH',
    'cat.explorer': 'EXPLORER',
    'cat.hunter': 'HUNTER',
    'cat.medic': 'MEDIC',
    'cat.miner': 'MINER',
    'cat.engineer': 'ENGINEER',
    'cat.salvager': 'SALVAGER',
    'cat.pilot': 'PILOT',
    'cat.radiation': 'RADIATION',
    'cat.environment': 'ENVIRON',
    'cat.cosmonaut': 'COSMONAUT',
    'cat.undersuit': 'UNDERSUIT',
    'cat.armor': 'ARMOR',
    'cat.rifle': 'RIFLE',
    'cat.pistol': 'PISTOL',
    'cat.sniper': 'SNIPER',
    'cat.smg': 'SMG',
    'cat.lmg': 'LMG',
    'cat.shotgun': 'SHOTGUN',
    'cat.weapon': 'WEAPON',
    'cat.item': 'ITEM',
    // Difficulty labels
    'diff.VeryEasy': 'Very Easy',
    'diff.Easy': 'Easy',
    'diff.Medium': 'Medium',
    'diff.Hard': 'Hard',
    'diff.VeryHard': 'Very Hard',
    'diff.Super': 'Super',
    'diff.abbr.VeryEasy': 'VE',
    'diff.abbr.Easy': 'E',
    'diff.abbr.Medium': 'M',
    'diff.abbr.Hard': 'H',
    'diff.abbr.VeryHard': 'VH',
    'diff.abbr.Super': 'S',
    // Hangar locale
    'locale': 'en-US',
  }
};

// ── Core ──────────────────────────────────────────────────────
let _lang = localStorage.getItem('gs-lang') || 'es';

window.currentLang = _lang;

window.t = function(key, vars) {
  const dict = TRANSLATIONS[_lang] || TRANSLATIONS.es;
  const val  = dict[key] !== undefined ? dict[key] : (TRANSLATIONS.es[key] !== undefined ? TRANSLATIONS.es[key] : key);
  if (!vars) return val;
  return val.replace(/\{(\w+)\}/g, (_, k) => vars[k] !== undefined ? vars[k] : '{' + k + '}');
};

window.setLang = function(lang) {
  if (!TRANSLATIONS[lang]) return;
  _lang = lang;
  window.currentLang = lang;
  localStorage.setItem('gs-lang', lang);
  document.documentElement.lang = lang;
  applyLang();
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.lang === lang);
  });
  // Re-render dynamic content that's already on screen
  if (typeof applyFilters === 'function') applyFilters();
  if (typeof renderWikelo === 'function' && window._wkReady) renderWikelo();
  // Rebuild hangar schedule with new locale
  if (typeof HNG !== 'undefined' && window.currentSection === 'hangar') {
    HNG.rebuild && HNG.rebuild();
  }
};

function applyLang() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.innerHTML = t(el.dataset.i18n);
  });
  document.querySelectorAll('[data-i18n-ph]').forEach(el => {
    el.placeholder = t(el.dataset.i18nPh);
  });
  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    el.title = t(el.dataset.i18nTitle);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  document.documentElement.lang = _lang;
  applyLang();
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.lang === _lang);
  });
});
