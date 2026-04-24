/* ===================================================
   GHOST SYNDICATE TOOLS — Ship Builds Module
   Tab BUILDS en comparador + creación de builds
   =================================================== */
'use strict';

window.Builds = (function () {

  const SLOTS = [
    { key: 'power_plant', label: 'Planta de Energía',     icon: '⚡' },
    { key: 'shield',      label: 'Generador de Escudos',  icon: '🛡' },
    { key: 'cooler_1',   label: 'Enfriador 1',            icon: '❄' },
    { key: 'cooler_2',   label: 'Enfriador 2',            icon: '❄' },
    { key: 'jump_drive', label: 'Motor de Salto',          icon: '🌀' },
    { key: 'radar',      label: 'Radar',                   icon: '📡' },
  ];

  const DC_SVG = `<svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>`;

  let _allBuilds = [];
  let _userVotes = {};

  function _getSb() { return window.Auth?.getSupabase(); }

  // ── BUILDS TAB: load all builds ──────────────────────
  async function loadAllBuilds(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const sb = _getSb();
    if (!sb) {
      container.innerHTML = '<div class="builds-error">No se pudo conectar con la base de datos.</div>';
      return;
    }

    container.innerHTML = '<div class="builds-loading">Cargando builds…</div>';

    const { data: builds, error } = await sb
      .from('ship_builds')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      container.innerHTML = '<div class="builds-error">Error al cargar builds.</div>';
      return;
    }

    _allBuilds = builds || [];

    if (_allBuilds.length === 0) {
      container.innerHTML = `
        <div class="builds-empty">
          <div style="font-size:2rem;margin-bottom:.7rem">⚙</div>
          No hay builds todavía.<br>
          <span style="font-size:.8rem;color:var(--text-muted)">Ve a la pestaña Naves y pulsa "Crear Build" en cualquier nave.</span>
        </div>`;
      return;
    }

    // Aggregate all votes
    const buildIds = _allBuilds.map(b => b.id);
    const { data: allVotes } = await sb
      .from('ship_build_votes')
      .select('build_id,stars')
      .in('build_id', buildIds);

    const voteMap = {};
    (allVotes || []).forEach(v => {
      if (!voteMap[v.build_id]) voteMap[v.build_id] = { total: 0, count: 0 };
      voteMap[v.build_id].total += v.stars;
      voteMap[v.build_id].count++;
    });

    _allBuilds.forEach(b => {
      const vm = voteMap[b.id] || { total: 0, count: 0 };
      b._votes_count = vm.count;
      b._avg_stars   = vm.count > 0 ? vm.total / vm.count : 0;
    });

    _allBuilds.sort((a, b) =>
      (b._avg_stars * Math.log(b._votes_count + 2)) -
      (a._avg_stars * Math.log(a._votes_count + 2))
    );

    // Load user votes
    const user = window.Auth?.getUser();
    _userVotes = {};
    if (user && buildIds.length > 0) {
      const { data: myVotes } = await sb
        .from('ship_build_votes')
        .select('build_id,stars')
        .eq('user_id', user.id)
        .in('build_id', buildIds);
      (myVotes || []).forEach(v => { _userVotes[v.build_id] = v.stars; });
    }

    container.innerHTML = _allBuilds.map((b, i) => _buildCard(b, user, i)).join('');
  }

  function _buildCard(build, user, rank) {
    const comps   = build.components || {};
    const myVote  = _userVotes[build.id] || 0;
    const avg     = build._avg_stars || 0;
    const cnt     = build._votes_count || 0;
    const isOwner = user && user.id === build.user_id;

    const starsHtml = [1, 2, 3, 4, 5].map(s => `
      <button class="build-star-btn${myVote >= s ? ' lit' : ''}"
              onclick="Builds.vote('${build.id}',${s},'buildsTabList')"
              ${!user ? 'disabled' : ''}
              title="${s} estrella${s > 1 ? 's' : ''}">★</button>`).join('');

    const slotRows = SLOTS.filter(sl => comps[sl.key]).map(sl => `
      <div class="btab-comp-row">
        <span class="btab-comp-lbl">${sl.icon} ${sl.label}</span>
        <span class="btab-comp-val">${esc(comps[sl.key])}</span>
      </div>`).join('');

    const weapons = comps.weapons || [];
    const weaponsHtml = weapons.length
      ? `<div class="btab-comp-row">
           <span class="btab-comp-lbl">⚔ Armas</span>
           <span class="btab-comp-val btab-weapons-val">
             ${weapons.map(w => `<span class="btab-weapon-tag">${esc(w)}</span>`).join('')}
           </span>
         </div>`
      : '';

    const avgTxt = cnt > 0
      ? `${avg.toFixed(1)}★ <span class="btab-vote-cnt">(${cnt} voto${cnt !== 1 ? 's' : ''})</span>`
      : '<span class="btab-no-votes">Sin votos aún</span>';

    const loginMsg = `<span class="btab-login-note">${DC_SVG} Inicia sesión con Discord para votar</span>`;

    return `
      <div class="btab-build-card">
        <div class="btab-card-top">
          <span class="btab-rank">#${rank + 1}</span>
          <div class="btab-ship-badge">${esc(build.ship_name)}</div>
          <div class="btab-build-name">${esc(build.build_name)}</div>
          <div class="btab-author">
            ${build.author_avatar ? `<img src="${esc(build.author_avatar)}" class="btab-avatar" loading="lazy" alt="">` : ''}
            <span>${esc(build.author_name)}</span>
          </div>
          ${isOwner ? `<button class="btab-delete-btn" onclick="Builds.deleteBuild('${build.id}','buildsTabList')" title="Eliminar build">✕</button>` : ''}
        </div>

        ${build.description ? `<div class="btab-desc">${esc(build.description)}</div>` : ''}

        ${slotRows || weaponsHtml ? `<div class="btab-comps">${slotRows}${weaponsHtml}</div>` : ''}

        <div class="btab-vote-row">
          <div class="btab-avg">${avgTxt}</div>
          ${user
            ? `<div class="btab-stars-wrap">
                 <div class="build-stars">${starsHtml}</div>
                 ${myVote ? `<button class="build-unvote" onclick="Builds.vote('${build.id}',0,'buildsTabList')">Quitar voto</button>` : ''}
               </div>`
            : loginMsg}
        </div>
      </div>`;
  }

  // ── CREATE BUILD: HTML for the pane ─────────────────
  function getCreateFormHTML(shipName) {
    const user = window.Auth?.getUser();

    if (!user) {
      return `
        <div class="bcreate-login-gate">
          <div class="bcreate-lock-icon">🔒</div>
          <p class="bcreate-login-msg">Necesitas iniciar sesión con Discord para crear una build.</p>
          <button class="bcreate-discord-btn" onclick="Auth.login()">
            ${DC_SVG} Iniciar sesión con Discord
          </button>
        </div>`;
    }

    const slotFields = SLOTS.map(sl => `
      <div class="bcreate-field">
        <label class="bcreate-label">${sl.icon} ${sl.label}</label>
        <input class="bcreate-input" type="text" id="bcf_${sl.key}"
               placeholder="Nombre del componente…" maxlength="80" autocomplete="off">
      </div>`).join('');

    return `
      <div class="bcreate-form">
        <div class="bcreate-section-lbl">Información de la build</div>
        <div class="bcreate-field">
          <label class="bcreate-label">Nombre de la build <span class="bcreate-req">*</span></label>
          <input class="bcreate-input" type="text" id="bcfBuildName"
                 placeholder="Ej: PvP agresivo, Exploración, Minería…" maxlength="60" autocomplete="off">
        </div>
        <div class="bcreate-field">
          <label class="bcreate-label">Descripción <span class="bcreate-opt">(opcional)</span></label>
          <textarea class="bcreate-input bcreate-ta" id="bcfDesc"
                    placeholder="Para qué está orientada esta build…" rows="2" maxlength="300"></textarea>
        </div>
        <div class="bcreate-section-lbl">Componentes</div>
        ${slotFields}
        <div class="bcreate-field">
          <label class="bcreate-label">⚔ Armas <span class="bcreate-opt">(una por línea)</span></label>
          <textarea class="bcreate-input bcreate-ta" id="bcfWeapons"
                    placeholder="CF-117 Badger Repeater&#10;Attrition-3 Laser Cannon" rows="3" maxlength="500"></textarea>
        </div>
        <div class="bcreate-actions">
          <button class="bcreate-cancel" onclick="Comp.switchTab('ships')">Cancelar</button>
          <button class="bcreate-submit" onclick="Builds.submitBuild(${JSON.stringify(shipName)})">Publicar Build</button>
        </div>
      </div>`;
  }

  // ── Submit ───────────────────────────────────────────
  async function submitBuild(shipName) {
    const sb   = _getSb();
    const user = window.Auth?.getUser();
    if (!sb || !user) return;

    const buildName = (document.getElementById('bcfBuildName')?.value || '').trim();
    if (!buildName) { _toast('El nombre de la build es obligatorio'); return; }

    const desc = (document.getElementById('bcfDesc')?.value || '').trim();
    const components = {};
    SLOTS.forEach(sl => {
      const v = (document.getElementById(`bcf_${sl.key}`)?.value || '').trim();
      if (v) components[sl.key] = v;
    });
    const wRaw = (document.getElementById('bcfWeapons')?.value || '').trim();
    if (wRaw) components.weapons = wRaw.split('\n').map(w => w.trim()).filter(Boolean);

    const meta = user.user_metadata || {};
    const btn  = document.querySelector('.bcreate-submit');
    if (btn) { btn.disabled = true; btn.textContent = 'Publicando…'; }

    const { error } = await sb.from('ship_builds').insert({
      user_id:       user.id,
      author_name:   meta.full_name || meta.user_name || 'Miembro',
      author_avatar: meta.avatar_url || '',
      ship_name:     shipName,
      build_name:    buildName,
      description:   desc,
      components,
    });

    if (error) {
      _toast('Error al publicar: ' + error.message);
      if (btn) { btn.disabled = false; btn.textContent = 'Publicar Build'; }
      return;
    }

    _toast('¡Build publicada!');
    window.Comp?.switchTab('builds');
  }

  // ── Vote ─────────────────────────────────────────────
  async function vote(buildId, stars, containerId) {
    const sb   = _getSb();
    const user = window.Auth?.getUser();
    if (!user) {
      _toast('Inicia sesión con Discord para votar');
      return;
    }
    if (!sb) return;

    if (stars === 0) {
      await sb.from('ship_build_votes').delete().eq('user_id', user.id).eq('build_id', buildId);
      delete _userVotes[buildId];
    } else {
      await sb.from('ship_build_votes').upsert(
        { user_id: user.id, build_id: buildId, stars },
        { onConflict: 'user_id,build_id' }
      );
      _userVotes[buildId] = stars;
    }

    await loadAllBuilds(containerId);
  }

  // ── Delete ───────────────────────────────────────────
  async function deleteBuild(buildId, containerId) {
    if (!confirm('¿Eliminar esta build? Esta acción no se puede deshacer.')) return;
    const sb   = _getSb();
    const user = window.Auth?.getUser();
    if (!sb || !user) return;

    await sb.from('ship_build_votes').delete().eq('build_id', buildId);
    const { error } = await sb.from('ship_builds').delete()
      .eq('id', buildId).eq('user_id', user.id);

    if (error) { _toast('Error al eliminar: ' + error.message); return; }
    await loadAllBuilds(containerId);
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
      el.style.cssText = [
        'position:fixed', 'bottom:1.5rem', 'left:50%', 'transform:translateX(-50%)',
        'z-index:10000', 'padding:.5rem 1.4rem', 'border-radius:8px',
        'font-size:.85rem', 'font-family:monospace', 'font-weight:700',
        'background:rgba(245,158,11,.96)', 'color:#1c1917',
        'pointer-events:none', 'transition:opacity .4s',
        'box-shadow:0 4px 20px rgba(0,0,0,.4)'
      ].join(';');
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.style.opacity = '1';
    clearTimeout(el._t);
    el._t = setTimeout(() => { el.style.opacity = '0'; }, 2800);
  }

  return { loadAllBuilds, getCreateFormHTML, submitBuild, vote, deleteBuild };

})();
