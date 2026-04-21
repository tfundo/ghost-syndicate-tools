/* ===================================================
   GHOST SYNDICATE TOOLS — Trading Routes
   UEX Corp API v2.0
   =================================================== */

'use strict';

window.Trading = (function () {

  const API_BASE = 'https://api.uexcorp.space/2.0';
  const API_KEY  = '4996aae707d9ff2f23e17ab42cb51c71e549fa92';

  let _loaded  = false;
  let _loading = false;
  let _prices  = [];
  let _filter  = '';

  function tr(es, en) {
    return (window.currentLang === 'en') ? en : es;
  }

  function esc(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function fmtAuec(n) {
    if (n == null || n === 0) return '—';
    return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  async function apiFetch(endpoint) {
    const res = await fetch(API_BASE + endpoint, {
      headers: { 'Authorization': 'Bearer ' + API_KEY }
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const json = await res.json();
    if (json.status !== 'ok') throw new Error(json.message || 'API error');
    return json.data || [];
  }

  function computeRoutes(prices) {
    const byComm = new Map();
    for (const p of prices) {
      const cid = p.id_commodity;
      if (!byComm.has(cid)) byComm.set(cid, { name: p.commodity_name, buys: [], sells: [] });
      const entry = byComm.get(cid);
      if (p.price_buy  > 0 && +p.status_buy  === 1) entry.buys.push(p);
      if (p.price_sell > 0 && +p.status_sell === 1) entry.sells.push(p);
    }

    const routes = [];
    for (const [, { name, buys, sells }] of byComm) {
      if (!buys.length || !sells.length) continue;
      const bestBuy = buys.reduce((a, b) => a.price_buy < b.price_buy ? a : b);
      for (const sell of sells) {
        if (sell.id_terminal === bestBuy.id_terminal) continue;
        const profit = sell.price_sell - bestBuy.price_buy;
        if (profit <= 0) continue;
        routes.push({
          commodity: name || '—',
          from:      bestBuy.terminal_name || ('T-' + bestBuy.id_terminal),
          to:        sell.terminal_name   || ('T-' + sell.id_terminal),
          buyPrice:  bestBuy.price_buy,
          sellPrice: sell.price_sell,
          profit,
          profitPct: ((profit / bestBuy.price_buy) * 100).toFixed(1),
        });
      }
    }

    return routes.sort((a, b) => b.profit - a.profit);
  }

  function render() {
    const wrap = document.getElementById('tradingContent');
    if (!wrap) return;

    if (_loading) {
      wrap.innerHTML = `<div class="loading-state"><div class="loading-spinner"></div>
        <p>${tr('Cargando rutas de comercio...', 'Loading trade routes...')}</p></div>`;
      return;
    }

    const query    = _filter.toLowerCase();
    const filtered = query
      ? _prices.filter(p => (p.commodity_name || '').toLowerCase().includes(query))
      : _prices;

    const routes = computeRoutes(filtered);

    const toolbar = `
      <div class="trd-toolbar">
        <div class="search-box trd-search">
          <span class="search-icon">🔍</span>
          <input type="text" id="trdSearch"
            placeholder="${tr('Filtrar por mercancía...', 'Filter by commodity...')}"
            value="${esc(_filter)}"
            oninput="Trading.setFilter(this.value)"
            autocomplete="off">
          ${_filter ? `<button class="search-clear" onclick="Trading.setFilter('')">✕</button>` : ''}
        </div>
        <button class="btn-ghost trd-refresh-btn" onclick="Trading.refresh()">
          ↺ ${tr('Actualizar', 'Refresh')}
        </button>
        <span class="trd-count">
          ${tr('Rutas rentables', 'Profitable routes')}: <strong>${routes.length}</strong>
        </span>
      </div>`;

    if (!routes.length) {
      wrap.innerHTML = toolbar + `
        <div class="empty-state">
          <div class="empty-icon">◈</div>
          <p>${tr('No hay rutas rentables con ese filtro', 'No profitable routes for that filter')}</p>
        </div>`;
      return;
    }

    const rows = routes.slice(0, 200).map((r, i) => {
      const cls = +r.profitPct >= 50 ? 'trd-hi' : +r.profitPct >= 20 ? 'trd-mid' : 'trd-lo';
      return `<tr>
        <td class="trd-rank">${i + 1}</td>
        <td class="trd-commodity">${esc(r.commodity)}</td>
        <td>${esc(r.from)}</td>
        <td>${esc(r.to)}</td>
        <td class="trd-num">${fmtAuec(r.buyPrice)}</td>
        <td class="trd-num">${fmtAuec(r.sellPrice)}</td>
        <td class="trd-num trd-profit ${cls}">+${fmtAuec(r.profit)} <span class="trd-pct">(+${r.profitPct}%)</span></td>
      </tr>`;
    }).join('');

    wrap.innerHTML = toolbar + `
      <div class="trd-table-wrap">
        <table class="trd-table">
          <thead><tr>
            <th>#</th>
            <th>${tr('Mercancía', 'Commodity')}</th>
            <th>${tr('Comprar en', 'Buy at')}</th>
            <th>${tr('Vender en', 'Sell at')}</th>
            <th>${tr('Precio compra', 'Buy price')}</th>
            <th>${tr('Precio venta', 'Sell price')}</th>
            <th>${tr('Beneficio/u', 'Profit/u')}</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <p class="trd-attribution">
        ${tr('Precios de la comunidad vía', 'Community prices via')}
        <a href="https://uexcorp.space" target="_blank" rel="noopener">UEX Corp</a>
      </p>`;
  }

  async function load() {
    if (_loaded) { render(); return; }
    _loading = true;
    render();
    try {
      _prices = await apiFetch('/commodities_prices_all/');
      _loaded = true;
    } catch (e) {
      const wrap = document.getElementById('tradingContent');
      if (wrap) wrap.innerHTML = `<div class="empty-state">
        <div class="empty-icon">⚠</div>
        <p>${tr('Error al cargar precios', 'Error loading prices')}: ${esc(e.message)}</p>
        <button class="btn-ghost" onclick="Trading.refresh()">↺ ${tr('Reintentar', 'Retry')}</button>
      </div>`;
      _loading = false;
      return;
    }
    _loading = false;
    render();
  }

  async function refresh() {
    _loaded  = false;
    _loading = true;
    render();
    try {
      _prices = await apiFetch('/commodities_prices_all/');
      _loaded = true;
    } catch (e) {
      const wrap = document.getElementById('tradingContent');
      if (wrap) wrap.innerHTML = `<div class="empty-state">
        <div class="empty-icon">⚠</div>
        <p>Error: ${esc(e.message)}</p>
        <button class="btn-ghost" onclick="Trading.refresh()">↺ ${tr('Reintentar', 'Retry')}</button>
      </div>`;
      _loading = false;
      return;
    }
    _loading = false;
    render();
  }

  function setFilter(val) {
    _filter = val || '';
    render();
  }

  return { load, refresh, setFilter };

})();
