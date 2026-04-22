/* ===================================================
   GHOST SYNDICATE TOOLS — Auth Global
   Discord OAuth via Supabase · Sin restricción de servidor
   =================================================== */
'use strict';

window.Auth = (function () {

  const SUPABASE_URL  = 'https://hsluuuhnkhdqrmkfpehv.supabase.co';
  const SUPABASE_ANON = 'sb_publishable_PMu9nPqwiPUK7mKH5RniQA_GKX1BL6U';

  let sb         = null;
  let _user      = null;
  let _session   = null;
  let _resources = new Map();   // "category:key" → quantity
  let _listeners = [];
  let _saveTimers = {};

  const DC_SVG = `<svg viewBox="0 0 24 24" fill="currentColor" width="13" height="13"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>`;

  // ── Init ─────────────────────────────────────────────────
  function init() {
    if (!window.supabase) return;
    sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);

    sb.auth.onAuthStateChange(async (event, session) => {
      _session = session;
      _user    = session?.user ?? null;
      if (_user && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
        await _loadResources();
      } else if (event === 'SIGNED_OUT') {
        _resources.clear();
      }
      _renderWidget();
      _notify(_user);
    });

    // Fallback: if onAuthStateChange fires before we register, pick up the session here
    sb.auth.getSession().then(async ({ data: { session } }) => {
      if (!_user && session?.user) {
        _session = session;
        _user    = session.user;
        await _loadResources();
        _renderWidget();
        _notify(_user);
      }
    });

    _renderWidget();
  }

  // ── Auth ──────────────────────────────────────────────────
  async function login() {
    const base = window.location.href.split('?')[0].split('#')[0];
    await sb.auth.signInWithOAuth({
      provider: 'discord',
      options: { scopes: 'identify email guilds', redirectTo: base }
    });
  }

  async function logout() {
    await sb.auth.signOut();
  }

  // ── Resources ─────────────────────────────────────────────
  async function _loadResources() {
    if (!sb || !_user) return;
    const { data } = await sb
      .from('user_resources')
      .select('category, resource_key, quantity')
      .eq('user_id', _user.id);
    _resources.clear();
    if (data) data.forEach(r => _resources.set(`${r.category}:${r.resource_key}`, +r.quantity));
  }

  function getResource(category, key) {
    return _resources.get(`${category}:${normalizeKey(key)}`) ?? 0;
  }

  function setResource(category, key, qty) {
    const nKey   = normalizeKey(key);
    const mapKey = `${category}:${nKey}`;
    const val    = Math.max(0, qty);
    _resources.set(mapKey, val);

    clearTimeout(_saveTimers[mapKey]);
    _saveTimers[mapKey] = setTimeout(async () => {
      if (!_user || !sb) return;
      if (val <= 0) {
        await sb.from('user_resources').delete()
          .eq('user_id', _user.id).eq('category', category).eq('resource_key', nKey);
      } else {
        await sb.from('user_resources').upsert(
          { user_id: _user.id, category, resource_key: nKey, quantity: val, updated_at: new Date().toISOString() },
          { onConflict: 'user_id,category,resource_key' }
        );
      }
    }, 700);
  }

  function normalizeKey(str) {
    return String(str).trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
  }

  // ── Listeners ─────────────────────────────────────────────
  function onUserChange(cb) { _listeners.push(cb); }
  function _notify(user)    { _listeners.forEach(cb => cb(user)); }

  // ── Getters ───────────────────────────────────────────────
  function getUser()     { return _user; }
  function getSession()  { return _session; }
  function getSupabase() { return sb; }

  // ── Nav widget ────────────────────────────────────────────
  function _renderWidget() {
    const el = document.getElementById('navAuthWidget');
    if (!el) return;
    if (!_user) {
      el.innerHTML = `<button class="nav-auth-login" onclick="Auth.login()" title="Iniciar sesión con Discord">
        ${DC_SVG}<span>Login</span>
      </button>`;
    } else {
      const meta   = _user.user_metadata || {};
      const name   = esc(meta.full_name || meta.user_name || '');
      const avatar = meta.avatar_url || '';
      el.innerHTML = `<div class="nav-auth-user">
        ${avatar ? `<img src="${avatar}" class="nav-auth-avatar" alt="">` : ''}
        <span class="nav-auth-name">${name}</span>
        <button class="nav-auth-logout" onclick="Auth.logout()" title="Cerrar sesión">⏻</button>
      </div>`;
    }
  }

  function esc(s) {
    return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  document.addEventListener('DOMContentLoaded', init);

  return { login, logout, getUser, getSession, getSupabase, getResource, setResource, onUserChange, normalizeKey };

})();
