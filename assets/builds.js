/* ===================================================
   GHOST SYNDICATE TOOLS — Ship Builds Module
   Builds de naves por miembros + votación por estrellas
   =================================================== */
'use strict';

window.Builds = (function () {

  const COMPONENT_SLOTS = [
    { key: 'power_plant', label: 'Planta de Energía' },
    { key: 'shield',      label: 'Generador de Escudos' },
    { key: 'cooler_1',   label: 'Enfriador 1' },
    { key: 'cooler_2',   label: 'Enfriador 2' },
    { key: 'jump_drive', label: 'Motor de Salto' },
    { key: 'radar',      label: 'Radar' },
  ];

  let _sb        = null;
  let _shipName  = null;
  let _builds    = [];
  let _userVotes = {};

  function _getSb() {
    if (!_sb) _sb = window.Auth?.getSupabase();
    return _sb;
  }

  // ── Public: open modal for a ship ───────────────────
  async function openModal(shipName) {
    _shipName = shipName;
    _ensureModalDOM();
    _setOverlay(true);
    _renderModalShell();
    await _loadBuilds();
  }

  function closeModal() {
    _setOverlay(false);
    _shipName = null;
  }

  // ── DOM helpers ──────────────────────────────────────
  function _ensureModalDOM() {
    if (!document.getElementById('buildsOverlay')) {
      const ov = document.createElement('div');
      ov.id = 'buildsOverlay';
      ov.className = 'modal-overlay';
      ov.onclick = closeModal;
      document.body.appendChild(ov);
    }
    if (!document.getElementById('buildsModal')) {
      const m = document.createElement('div');
      m.id = 'buildsModal';
      m.className = 'modal builds-modal';
      document.body.appendChild(m);
    }
  }

  function _setOverlay(open) {
    const ov = document.getElementById('buildsOverlay');
    const m  = document.getElementById('buildsModal');
    if (ov) ov.style.display = open ? 'block' : 'none';
    if (m)  m.style.display  = open ? 'flex'  : 'none';
  }

  function _renderModalShell() {
    const modal = document.getElementById('buildsModal');
    if (!modal) return;
    const user = window.Auth?.getUser();
    modal.innerHTML = `
      <button class="modal-close" onclick="Builds.closeModal()">✕</button>
      <div class="modal-content builds-modal-content">
        <div class="builds-header">
          <h2 class="builds-title">
            <span class="builds-icon">⚙</span>
            Builds · ${esc(_shipName)}
          </h2>
          ${user
            ? `<button class="builds-create-btn" onclick="Builds.showCreateForm()">+ Nueva Build</button>`
            : `<span class="builds-login-hint">Inicia sesión con Discord para crear builds</span>`}
        </div>
        <div id="buildsFormArea"></div>
        <div id="buildsList"><div class="builds-loading">Cargando builds…</div></div>
      </div>`;
  }

  // ── Load builds from Supabase ────────────────────────
  async function _loadBuilds() {
    const sb = _getSb();
    const listEl = document.getElementById('buildsList');

    if (!sb) {
      if (listEl) listEl.innerHTML = '<div class="builds-error">No se pudo conectar con la base de datos.</div>';
      return;
    }

    // Fetch builds for this ship
    const { data: builds, error } = await sb
      .from('ship_builds')
      .select('*')
      .eq('ship_name', _shipName)
      .order('created_at', { ascending: false });

    if (error) {
      if (listEl) listEl.innerHTML = '<div class="builds-error">Error al cargar builds.</div>';
      return;
    }

    _builds = builds || [];

    if (_builds.length === 0) {
      if (listEl) listEl.innerHTML = '<div class="builds-empty">No hay builds para esta nave. ¡Sé el primero en crearla!</div>';
      return;
    }

    const buildIds = _builds.map(b => b.id);

    // Fetch all votes for these builds
    const { data: allVotes } = await sb
      .from('ship_build_votes')
      .select('build_id, stars')
      .in('build_id', buildIds);

    // Aggregate votes per build
    const voteMap = {};
    (allVotes || []).forEach(v => {
      if (!voteMap[v.build_id]) voteMap[v.build_id] = { total: 0, count: 0 };
      voteMap[v.build_id].total += v.stars;
      voteMap[v.build_id].count++;
    });
    _builds.forEach(b => {
      const vm = voteMap[b.id] || { total: 0, count: 0 };
      b._votes_count = vm.count;
      b._avg_stars   = vm.count > 0 ? vm.total / vm.count : 0;
    });

    // Sort: best rated first (Wilson-style: avg × log(count+1))
    _builds.sort((a, b) =>
      (b._avg_stars * Math.log(b._votes_count + 2)) -
      (a._avg_stars * Math.log(a._votes_count + 2))
    );

    // Fetch current user's votes
    const user = window.Auth?.getUser();
    _userVotes = {};
    if (user) {
      const { data: myVotes } = await sb
        .from('ship_build_votes')
        .select('build_id, stars')
        .eq('user_id', user.id)
        .in('build_id', buildIds);
      (myVotes || []).forEach(v => { _userVotes[v.build_id] = v.stars; });
    }

    _renderBuildsList();
  }

  function _renderBuildsList() {
    const listEl = document.getElementById('buildsList');
    if (!listEl) return;
    const user = window.Auth?.getUser();
    listEl.innerHTML = _builds.map((b, i) => _buildCard(b, user, i)).join('');
  }

  function _buildCard(build, user, rank) {
    const comps    = build.components || {};
    const myVote   = _userVotes[build.id] || 0;
    const avg      = build._avg_stars || 0;
    const cnt      = build._votes_count || 0;
    const isOwner  = user && user.id === build.user_id;

    // Stars voting row
    const starsHtml = [1, 2, 3, 4, 5].map(s => `
      <button class="build-star-btn${myVote >= s ? ' lit' : ''}"
              onclick="Builds.vote('${build.id}',${s})"
              ${!user ? 'disabled' : ''}
              title="${s} estrella${s > 1 ? 's' : ''}">★</button>`).join('');

    // Components
    const slotRows = COMPONENT_SLOTS
      .filter(sl => comps[sl.key])
      .map(sl => `<div class="build-comp-row">
        <span class="build-comp-lbl">${sl.label}</span>
        <span class="build-comp-val">${esc(comps[sl.key])}</span>
      </div>`).join('');

    const weapons = (comps.weapons || []);
    const weaponsHtml = weapons.length
      ? `<div class="build-comp-row build-comp-weapons">
           <span class="build-comp-lbl">Armas</span>
           <span class="build-comp-val">${weapons.map(w => `<span class="build-weapon-tag">${esc(w)}</span>`).join('')}</span>
         </div>`
      : '';

    const avgDisplay = cnt > 0 ? `${avg.toFixed(1)}★ <span class="build-vote-cnt">(${cnt} voto${cnt !== 1 ? 's' : ''})</span>` : `<span class="build-novotes">Sin votos</span>`;

    return `
      <div class="build-card" id="bcard-${build.id}">
        <div class="build-card-top">
          <div class="build-rank">#${rank + 1}</div>
          <div class="build-author-info">
            ${build.author_avatar ? `<img src="${esc(build.author_avatar)}" class="build-avatar" alt="" loading="lazy">` : ''}
            <span class="build-author-name">${esc(build.author_name)}</span>
          </div>
          <div class="build-rating">${avgDisplay}</div>
          ${isOwner ? `<button class="build-delete-btn" onclick="Builds.deleteBuild('${build.id}')" title="Eliminar build">✕</button>` : ''}
        </div>
        <div class="build-name">${esc(build.build_name)}</div>
        ${build.description ? `<div class="build-desc">${esc(build.description)}</div>` : ''}
        ${slotRows || weaponsHtml ? `<div class="build-components">${slotRows}${weaponsHtml}</div>` : ''}
        <div class="build-vote-row">
          ${user
            ? `<span class="build-vote-label">Tu voto:</span>
               <div class="build-stars">${starsHtml}</div>
               ${myVote ? `<button class="build-unvote" onclick="Builds.vote('${build.id}',0)">Quitar</button>` : ''}`
            : `<span class="build-login-note">Inicia sesión para votar</span>`}
        </div>
      </div>`;
  }

  // ── Create form ──────────────────────────────────────
  function showCreateForm() {
    const area = document.getElementById('buildsFormArea');
    if (!area) return;

    const slotFields = COMPONENT_SLOTS.map(sl => `
      <div class="bf-field bf-field-inline">
        <label class="bf-label">${sl.label}</label>
        <input class="bf-input" type="text" id="bf_${sl.key}" placeholder="Nombre del componente…" maxlength="80">
      </div>`).join('');

    area.innerHTML = `
      <div class="build-form">
        <div class="bf-form-title">Nueva Build · ${esc(_shipName)}</div>
        <div class="bf-field">
          <label class="bf-label">Nombre de la build <span class="bf-req">*</span></label>
          <input class="bf-input" type="text" id="bfBuildName" placeholder="Ej: PvP agresivo, Exploración long-range…" maxlength="60">
        </div>
        <div class="bf-field">
          <label class="bf-label">Descripción (opcional)</label>
          <textarea class="bf-input bf-textarea" id="bfDesc" placeholder="Para qué está orientada esta build…" rows="2" maxlength="300"></textarea>
        </div>
        <div class="bf-section-title">Componentes</div>
        ${slotFields}
        <div class="bf-field">
          <label class="bf-label">Armas (una por línea)</label>
          <textarea class="bf-input bf-textarea" id="bfWeapons" placeholder="CF-117 Badger Repeater&#10;Attrition-3 Laser Cannon" rows="3" maxlength="500"></textarea>
        </div>
        <div class="bf-actions">
          <button class="bf-cancel" onclick="Builds.cancelForm()">Cancelar</button>
          <button class="bf-submit" onclick="Builds.submitBuild()">Publicar Build</button>
        </div>
      </div>`;

    area.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function cancelForm() {
    const area = document.getElementById('buildsFormArea');
    if (area) area.innerHTML = '';
  }

  async function submitBuild() {
    const sb   = _getSb();
    const user = window.Auth?.getUser();
    if (!sb || !user) return;

    const buildName = (document.getElementById('bfBuildName')?.value || '').trim();
    if (!buildName) { _toast('El nombre de la build es obligatorio'); return; }

    const desc = (document.getElementById('bfDesc')?.value || '').trim();
    const components = {};

    COMPONENT_SLOTS.forEach(sl => {
      const v = (document.getElementById(`bf_${sl.key}`)?.value || '').trim();
      if (v) components[sl.key] = v;
    });

    const weaponsRaw = (document.getElementById('bfWeapons')?.value || '').trim();
    if (weaponsRaw) {
      components.weapons = weaponsRaw.split('\n').map(w => w.trim()).filter(Boolean);
    }

    const meta = user.user_metadata || {};
    const { error } = await sb.from('ship_builds').insert({
      user_id:       user.id,
      author_name:   meta.full_name || meta.user_name || 'Miembro',
      author_avatar: meta.avatar_url || '',
      ship_name:     _shipName,
      build_name:    buildName,
      description:   desc,
      components,
    });

    if (error) { _toast('Error al publicar: ' + error.message); return; }

    cancelForm();
    _toast('¡Build publicada!');
    await _loadBuilds();
  }

  // ── Voting ───────────────────────────────────────────
  async function vote(buildId, stars) {
    const sb   = _getSb();
    const user = window.Auth?.getUser();
    if (!sb || !user) return;

    if (stars === 0) {
      await sb.from('ship_build_votes').delete()
        .eq('user_id', user.id).eq('build_id', buildId);
      delete _userVotes[buildId];
    } else {
      await sb.from('ship_build_votes').upsert(
        { user_id: user.id, build_id: buildId, stars },
        { onConflict: 'user_id,build_id' }
      );
      _userVotes[buildId] = stars;
    }

    await _loadBuilds();
  }

  // ── Delete own build ─────────────────────────────────
  async function deleteBuild(buildId) {
    if (!confirm('¿Eliminar esta build?')) return;
    const sb   = _getSb();
    const user = window.Auth?.getUser();
    if (!sb || !user) return;

    await sb.from('ship_build_votes').delete().eq('build_id', buildId);
    const { error } = await sb.from('ship_builds').delete()
      .eq('id', buildId).eq('user_id', user.id);

    if (error) { _toast('Error al eliminar: ' + error.message); return; }
    await _loadBuilds();
  }

  // ── Helpers ──────────────────────────────────────────
  function esc(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function _toast(msg) {
    let el = document.getElementById('buildsToast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'buildsToast';
      el.style.cssText = 'position:fixed;bottom:1.5rem;left:50%;transform:translateX(-50%);z-index:10000;padding:.5rem 1.2rem;border-radius:8px;font-size:.85rem;font-family:monospace;background:rgba(245,158,11,.95);color:#1c1917;font-weight:700;pointer-events:none;transition:opacity .4s';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.style.opacity = '1';
    setTimeout(() => { el.style.opacity = '0'; }, 2500);
  }

  return { openModal, closeModal, showCreateForm, cancelForm, submitBuild, vote, deleteBuild };

})();
