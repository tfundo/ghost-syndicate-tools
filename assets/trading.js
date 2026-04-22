/* ===================================================
   GHOST SYNDICATE TOOLS — Trading Routes
   UEX Corp API v2.0 · Full redesign
   =================================================== */
'use strict';

window.Trading = (function () {

  const API_BASE = 'https://api.uexcorp.space/2.0';
  const API_KEY  = '4996aae707d9ff2f23e17ab42cb51c71e549fa92';
  const UNITS_PER_SCU = 100;

  // Known colors per category keyword
  const KNOWN_COLORS = {
    metal:        '#94a3b8',
    ore:          '#f97316',
    mineral:      '#f97316',
    agricultural: '#22c55e',
    food:         '#eab308',
    drug:         '#a855f7',
    gas:          '#06b6d4',
    medical:      '#3b82f6',
    scrap:        '#78716c',
    vice:         '#ec4899',
    waste:        '#71717a',
    raw:          '#ea580c',
    refined:      '#f59e0b',
    clothing:     '#14b8a6',
    weapon:       '#ef4444',
    electronic:   '#0ea5e9',
    consumer:     '#8b5cf6',
    industrial:   '#b45309',
    data:         '#a3e635',
  };
  const PALETTE = [
    '#f97316','#22c55e','#06b6d4','#a855f7','#eab308',
    '#3b82f6','#ec4899','#94a3b8','#14b8a6','#ef4444',
    '#f59e0b','#8b5cf6','#10b981','#0ea5e9','#78716c',
  ];

  // State
  const S = {
    loaded:    false,
    loading:   false,
    error:     null,
    comms:     new Map(),   // id → commodity obj
    terms:     new Map(),   // id → terminal obj
    prices:    [],
    catColors: new Map(),   // kind → hex
    selCat:    '',
    selComm:   null,
    selRoute:  null,        // { commodity, from, to, buyPrice, sellPrice, profitPct }
    view:      'routes',
    search:    '',
    scuInput:  100,
  };

  // ── helpers ──────────────────────────────────────────────
  function tr(es, en) { return window.currentLang === 'en' ? en : es; }
  function esc(s) {
    return String(s)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
  function fmt(n, dec = 2) {
    if (n == null || n === '') return '—';
    return (+n).toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec });
  }
  function fmtInt(n) {
    return (+n).toLocaleString('en-US', { maximumFractionDigits: 0 });
  }
  function catColor(kind) {
    return S.catColors.get(kind) || '#b45309';
  }
  function commColor(id) {
    const c = S.comms.get(+id);
    return c ? catColor(c.kind) : '#b45309';
  }
  function termLoc(t) {
    if (!t) return '';
    return t.city_name || t.moon_name || t.planet_name || t.star_system_name || '';
  }

  // ── API ──────────────────────────────────────────────────
  async function apiFetch(ep) {
    const r = await fetch(API_BASE + ep, { headers: { Authorization: 'Bearer ' + API_KEY } });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const j = await r.json();
    if (j.status !== 'ok') throw new Error(j.message || 'API error');
    return j.data || [];
  }

  function buildCatColors(kinds) {
    let idx = 0;
    for (const k of [...kinds].sort()) {
      const low = k.toLowerCase();
      let color = null;
      for (const [kw, val] of Object.entries(KNOWN_COLORS)) {
        if (low.includes(kw)) { color = val; break; }
      }
      if (!color) color = PALETTE[idx++ % PALETTE.length];
      S.catColors.set(k, color);
    }
  }

  // ── route computation ────────────────────────────────────
  function computeRoutes(prices) {
    const byComm = new Map();
    for (const p of prices) {
      const cid = +p.id_commodity;
      if (!byComm.has(cid)) byComm.set(cid, { buys: [], sells: [] });
      const e = byComm.get(cid);
      if (+p.price_buy  > 0 && +p.status_buy  === 1) e.buys.push(p);
      if (+p.price_sell > 0 && +p.status_sell === 1) e.sells.push(p);
    }
    const routes = [];
    for (const [cid, { buys, sells }] of byComm) {
      if (!buys.length || !sells.length) continue;
      const bestBuy = buys.reduce((a, b) => +a.price_buy < +b.price_buy ? a : b);
      for (const sell of sells) {
        if (+sell.id_terminal === +bestBuy.id_terminal) continue;
        const profit = +sell.price_sell - +bestBuy.price_buy;
        if (profit <= 0) continue;
        const comm  = S.comms.get(cid)  || {};
        const tBuy  = S.terms.get(+bestBuy.id_terminal) || {};
        const tSell = S.terms.get(+sell.id_terminal)    || {};
        routes.push({
          commId:    cid,
          commodity: comm.name || bestBuy.commodity_name || '—',
          kind:      comm.kind || '',
          from:      bestBuy.terminal_name || ('T-' + bestBuy.id_terminal),
          fromLoc:   termLoc(tBuy),
          to:        sell.terminal_name   || ('T-' + sell.id_terminal),
          toLoc:     termLoc(tSell),
          buyPrice:  +bestBuy.price_buy,
          sellPrice: +sell.price_sell,
          profit,
          profitPct: ((profit / +bestBuy.price_buy) * 100).toFixed(1),
          scuStock:  +bestBuy.scu_buy_avg || +bestBuy.scu_buy || 0,
        });
      }
    }
    return routes.sort((a, b) => b.profit - a.profit);
  }

  // ── filter helpers ───────────────────────────────────────
  function filteredPrices() {
    let list = S.prices;
    if (S.selComm) return list.filter(p => +p.id_commodity === S.selComm);
    if (S.selCat) {
      const ids = new Set([...S.comms.values()].filter(c => c.kind === S.selCat).map(c => c.id));
      list = list.filter(p => ids.has(+p.id_commodity));
    }
    if (S.search) {
      const q = S.search.toLowerCase();
      list = list.filter(p => {
        const name = p.commodity_name || (S.comms.get(+p.id_commodity) || {}).name || '';
        return name.toLowerCase().includes(q);
      });
    }
    return list;
  }

  function filteredComms() {
    let list = [...S.comms.values()];
    if (S.selCat) list = list.filter(c => c.kind === S.selCat);
    if (S.search) {
      const q = S.search.toLowerCase();
      list = list.filter(c => (c.name || '').toLowerCase().includes(q));
    }
    return list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }

  // ── render: toolbar ──────────────────────────────────────
  function renderToolbar() {
    const rA = S.view === 'routes' ? ' trd-tab-active' : '';
    const pA = S.view === 'prices' ? ' trd-tab-active' : '';
    return `
      <div class="trd-toolbar">
        <div class="search-box trd-search">
          <span class="search-icon">🔍</span>
          <input type="text" id="trdSearch"
            placeholder="${tr('Buscar mercancía...','Search commodity...')}"
            value="${esc(S.search)}"
            oninput="Trading.setSearch(this.value)"
            autocomplete="off">
          ${S.search ? `<button class="search-clear" onclick="Trading.setSearch('')">✕</button>` : ''}
        </div>
        <div class="trd-tabs">
          <button class="trd-tab${rA}" onclick="Trading.setView('routes')">📈 ${tr('Rutas','Routes')}</button>
          <button class="trd-tab${pA}" onclick="Trading.setView('prices')">📊 ${tr('Precios','Prices')}</button>
        </div>
        <button class="btn-ghost trd-refresh-btn" onclick="Trading.refresh()">↺ ${tr('Actualizar','Refresh')}</button>
      </div>`;
  }

  // ── render: category pills ───────────────────────────────
  function renderCats() {
    const cats = [...S.catColors.keys()].sort();
    const allA = !S.selCat ? ' active' : '';
    let html = `<div class="trd-cats">
      <button class="trd-cat-pill${allA}" style="--cc:#b45309" onclick="Trading.selectCat('')">
        ${tr('Todos','All')} <span class="trd-cat-count">${S.comms.size}</span>
      </button>`;
    for (const cat of cats) {
      const color = S.catColors.get(cat);
      const count = [...S.comms.values()].filter(c => c.kind === cat).length;
      const active = S.selCat === cat ? ' active' : '';
      html += `<button class="trd-cat-pill${active}" style="--cc:${color}" onclick="Trading.selectCat('${esc(cat)}')">
        ${esc(cat)} <span class="trd-cat-count">${count}</span>
      </button>`;
    }
    return html + '</div>';
  }

  // ── render: commodity chips ──────────────────────────────
  function renderChips() {
    const comms = filteredComms();
    if (!comms.length) return '';
    let html = '<div class="trd-chips">';
    for (const c of comms) {
      const color = catColor(c.kind);
      const active = S.selComm === c.id ? ' trd-chip-active' : '';
      const flags = [];
      if (c.is_mineral)  flags.push('⛏');
      if (c.is_refined)  flags.push('✨');
      if (c.is_illegal)  flags.push('☠');
      const badge = flags.length ? `<span class="trd-chip-flags">${flags.join('')}</span>` : '';
      html += `<button class="trd-chip${active}" style="--cc:${color}"
        onclick="Trading.selectComm(${c.id})"
        title="${esc(c.kind || '')}${c.is_mineral?' · Mineral':''}${c.is_refined?' · Refinado':''}">
        <span class="trd-chip-dot"></span>${esc(c.name)}${badge}
      </button>`;
    }
    return html + '</div>';
  }

  // ── render: SCU calculator ───────────────────────────────
  function renderCalc() {
    const r = S.selRoute;
    if (!r) {
      return `<div class="trd-calc trd-calc-empty">
        <span class="trd-calc-hint">👆 ${tr('Haz clic en una ruta para calcular el beneficio con tus SCUs','Click a route to calculate profit for your SCUs')}</span>
      </div>`;
    }
    const scu = +S.scuInput || 1;
    const invest  = r.buyPrice  * scu * UNITS_PER_SCU;
    const revenue = r.sellPrice * scu * UNITS_PER_SCU;
    const profit  = (r.sellPrice - r.buyPrice) * scu * UNITS_PER_SCU;
    const color   = commColor(r.commId);
    const profitCls = profit > 0 ? 'trd-calc-profit-pos' : 'trd-calc-profit-neg';

    return `<div class="trd-calc">
      <div class="trd-calc-route">
        <span class="trd-comm-dot" style="background:${color}"></span>
        <strong>${esc(r.commodity)}</strong>
        <span class="trd-calc-arrow">${esc(r.from)} → ${esc(r.to)}</span>
        <button class="trd-calc-clear" onclick="Trading.clearRoute()" title="${tr('Quitar','Clear')}">✕</button>
      </div>
      <div class="trd-calc-row">
        <div class="trd-calc-scu-ctrl">
          <label class="trd-calc-label">📦 SCUs</label>
          <div class="trd-calc-scu-input-wrap">
            <button class="trd-scu-btn" onclick="Trading.adjScu(-100)">−100</button>
            <button class="trd-scu-btn" onclick="Trading.adjScu(-10)">−10</button>
            <input type="number" class="trd-scu-input" id="trdScuInput"
              value="${scu}" min="1" max="99999"
              oninput="Trading.setScu(this.value)">
            <button class="trd-scu-btn" onclick="Trading.adjScu(10)">+10</button>
            <button class="trd-scu-btn" onclick="Trading.adjScu(100)">+100</button>
          </div>
          <div class="trd-scu-presets">
            ${[50,100,500,1000,2000,4000].map(v=>`<button class="trd-scu-preset${scu===v?' active':''}" onclick="Trading.setScu(${v})">${v}</button>`).join('')}
          </div>
        </div>
        <div class="trd-calc-results">
          <div class="trd-calc-result-item">
            <span class="trd-calc-result-label">${tr('Inversión','Investment')}</span>
            <span class="trd-calc-result-val trd-calc-invest">${fmt(invest)} aUEC</span>
          </div>
          <div class="trd-calc-result-item">
            <span class="trd-calc-result-label">${tr('Ingresos','Revenue')}</span>
            <span class="trd-calc-result-val">${fmt(revenue)} aUEC</span>
          </div>
          <div class="trd-calc-result-item">
            <span class="trd-calc-result-label">${tr('Beneficio neto','Net profit')}</span>
            <span class="trd-calc-result-val ${profitCls}">${profit>0?'+':''}${fmt(profit)} aUEC</span>
          </div>
          <div class="trd-calc-result-item">
            <span class="trd-calc-result-label">${tr('Margen','Margin')}</span>
            <span class="trd-calc-result-val ${profitCls}">${profit>0?'+':''}${r.profitPct}%</span>
          </div>
        </div>
      </div>
    </div>`;
  }

  // ── render: routes view ──────────────────────────────────
  function renderRoutes() {
    const prices = filteredPrices();
    const routes = computeRoutes(prices);

    const tableHtml = !routes.length
      ? `<div class="empty-state"><div class="empty-icon">◈</div>
          <p>${tr('No hay rutas rentables con este filtro','No profitable routes for this filter')}</p></div>`
      : `<div class="trd-routes-info">
          ${tr('Rutas rentables','Profitable routes')}: <strong>${routes.length}</strong>
          <span class="trd-routes-hint">· ${tr('Clic en fila para calcular beneficio','Click row to calculate profit')}</span>
         </div>
         <div class="trd-table-wrap">
           <table class="trd-table">
             <thead><tr>
               <th>#</th>
               <th>${tr('Mercancía','Commodity')}</th>
               <th>${tr('Comprar en','Buy at')}</th>
               <th>${tr('Vender en','Sell at')}</th>
               <th>${tr('Compra','Buy')}</th>
               <th>${tr('Venta','Sell')}</th>
               <th>${tr('Beneficio/u','Profit/u')}</th>
             </tr></thead>
             <tbody>${routes.slice(0, 250).map((r, i) => renderRouteRow(r, i)).join('')}</tbody>
           </table>
         </div>`;

    return renderCalc() + tableHtml +
      `<p class="trd-attribution">${tr('Precios de la comunidad vía','Community prices via')} <a href="https://uexcorp.space" target="_blank" rel="noopener">UEX Corp</a> · ${tr('1 SCU = 100 unidades asumido','1 SCU = 100 units assumed')}</p>`;
  }

  function renderRouteRow(r, i) {
    const cls  = +r.profitPct >= 100 ? 'trd-hi' : +r.profitPct >= 30 ? 'trd-mid' : 'trd-lo';
    const color = catColor(r.kind);
    const sel  = S.selRoute && S.selRoute.commId === r.commId && S.selRoute.from === r.from && S.selRoute.to === r.to ? ' trd-row-sel' : '';
    const loc  = r.fromLoc ? `<span class="trd-loc">${esc(r.fromLoc)}</span>` : '';
    const toLoc= r.toLoc   ? `<span class="trd-loc">${esc(r.toLoc)}</span>` : '';
    const stock= r.scuStock? `<span class="trd-scu-badge">${fmtInt(r.scuStock)} SCU</span>` : '';
    const routeData = esc(JSON.stringify({ commId: r.commId, commodity: r.commodity, from: r.from, to: r.to, buyPrice: r.buyPrice, sellPrice: r.sellPrice, profitPct: r.profitPct }));
    return `<tr class="trd-row${sel}" onclick="Trading.pickRoute('${routeData}')">
      <td class="trd-rank">${i + 1}</td>
      <td class="trd-commodity"><span class="trd-comm-dot" style="background:${color}"></span>${esc(r.commodity)}</td>
      <td><span class="trd-term">${esc(r.from)}</span>${loc}</td>
      <td><span class="trd-term">${esc(r.to)}</span>${toLoc}</td>
      <td class="trd-num">${fmt(r.buyPrice)}</td>
      <td class="trd-num">${fmt(r.sellPrice)}</td>
      <td class="trd-num trd-profit ${cls}">+${fmt(r.profit)}${stock}</td>
    </tr>`;
  }

  // ── render: prices view ──────────────────────────────────
  function renderPrices() {
    const comm = S.selComm ? S.comms.get(S.selComm) : null;
    if (!comm) {
      return `<div class="trd-prices-hint">
        <div class="empty-icon">◈</div>
        <p>${tr('Selecciona una mercancía del listado superior o de las rutas para ver sus precios','Select a commodity from the list above or from routes to see prices')}</p>
      </div>`;
    }

    const color = catColor(comm.kind);
    const commPrices = S.prices.filter(p => +p.id_commodity === S.selComm);
    const buys  = commPrices.filter(p => +p.price_buy  > 0 && +p.status_buy  === 1).sort((a,b) => +a.price_buy - +b.price_buy);
    const sells = commPrices.filter(p => +p.price_sell > 0 && +p.status_sell === 1).sort((a,b) => +b.price_sell - +a.price_sell);

    const bestBuy   = buys[0]  ? +buys[0].price_buy   : null;
    const bestSell  = sells[0] ? +sells[0].price_sell  : null;
    const maxProfit = (bestBuy && bestSell) ? bestSell - bestBuy : null;
    const marginPct = maxProfit && bestBuy ? ((maxProfit / bestBuy) * 100).toFixed(1) : null;

    const flags = [];
    if (comm.is_mineral)  flags.push(`<span class="trd-flag">⛏ ${tr('Mineral','Mineral')}</span>`);
    if (comm.is_refined)  flags.push(`<span class="trd-flag">✨ ${tr('Refinado','Refined')}</span>`);
    if (comm.is_raw)      flags.push(`<span class="trd-flag">🪨 ${tr('En bruto','Raw')}</span>`);
    if (comm.is_refinable)flags.push(`<span class="trd-flag">🔧 ${tr('Refinable','Refinable')}</span>`);
    if (comm.is_illegal)  flags.push(`<span class="trd-flag trd-flag-red">☠ ${tr('Ilegal','Illegal')}</span>`);

    const header = `
      <div class="trd-price-header">
        <span class="trd-comm-dot-lg" style="background:${color}"></span>
        <h3 class="trd-comm-title">${esc(comm.name)}</h3>
        ${comm.kind ? `<span class="trd-kind-badge" style="--cc:${color}">${esc(comm.kind)}</span>` : ''}
        ${flags.join('')}
        <button class="trd-clear-sel" onclick="Trading.selectComm(null)">✕ ${tr('Quitar','Clear')}</button>
      </div>`;

    const stats = `
      <div class="trd-price-stats">
        <div class="trd-stat-card">
          <div class="trd-stat-label">${tr('Mejor compra','Best buy')}</div>
          <div class="trd-stat-val trd-buy-clr">${bestBuy ? fmt(bestBuy) + ' aUEC' : '—'}</div>
        </div>
        <div class="trd-stat-card">
          <div class="trd-stat-label">${tr('Mejor venta','Best sell')}</div>
          <div class="trd-stat-val trd-sell-clr">${bestSell ? fmt(bestSell) + ' aUEC' : '—'}</div>
        </div>
        <div class="trd-stat-card">
          <div class="trd-stat-label">${tr('Margen máx/u','Max margin/u')}</div>
          <div class="trd-stat-val ${maxProfit > 0 ? 'trd-hi' : ''}">${maxProfit > 0 ? `+${fmt(maxProfit)} aUEC` : '—'}</div>
        </div>
        <div class="trd-stat-card">
          <div class="trd-stat-label">${tr('Margen %','Margin %')}</div>
          <div class="trd-stat-val ${marginPct > 0 ? 'trd-hi' : ''}">${marginPct > 0 ? `+${marginPct}%` : '—'}</div>
        </div>
        <div class="trd-stat-card">
          <div class="trd-stat-label">${tr('Terminales','Terminals')}</div>
          <div class="trd-stat-val">${commPrices.length}</div>
        </div>
      </div>`;

    const buyRows = buys.map(p => {
      const t   = S.terms.get(+p.id_terminal) || {};
      const loc = termLoc(t);
      const scu = +p.scu_buy_avg || +p.scu_buy || 0;
      return `<tr>
        <td><span class="trd-term">${esc(p.terminal_name||'')}</span>${loc?`<span class="trd-loc">${esc(loc)}</span>`:''}</td>
        <td class="trd-num trd-buy-clr">${fmt(+p.price_buy)}</td>
        <td class="trd-num trd-muted">${scu ? fmtInt(scu) + ' SCU' : '—'}</td>
      </tr>`;
    }).join('') || `<tr><td colspan="3" class="trd-empty-cell">${tr('No disponible para compra','Not available to buy')}</td></tr>`;

    const sellRows = sells.map(p => {
      const t      = S.terms.get(+p.id_terminal) || {};
      const loc    = termLoc(t);
      const scu    = +p.scu_sell_avg || +p.scu_sell || 0;
      const diff   = bestBuy ? ((+p.price_sell - bestBuy) / bestBuy * 100).toFixed(1) : null;
      const diffHtml = diff !== null && +diff > 0
        ? `<span class="trd-pct trd-hi"> (+${diff}%)</span>` : '';
      return `<tr>
        <td><span class="trd-term">${esc(p.terminal_name||'')}</span>${loc?`<span class="trd-loc">${esc(loc)}</span>`:''}</td>
        <td class="trd-num trd-sell-clr">${fmt(+p.price_sell)}${diffHtml}</td>
        <td class="trd-num trd-muted">${scu ? fmtInt(scu) + ' SCU' : '—'}</td>
      </tr>`;
    }).join('') || `<tr><td colspan="3" class="trd-empty-cell">${tr('No disponible para venta','Not available to sell')}</td></tr>`;

    const tables = `
      <div class="trd-price-tables">
        <div class="trd-price-col">
          <div class="trd-price-col-title trd-buy-title">⬇ ${tr('Dónde COMPRAR','Where to BUY')} (${buys.length})</div>
          <div class="trd-table-wrap">
            <table class="trd-table">
              <thead><tr>
                <th>${tr('Terminal','Terminal')}</th>
                <th>${tr('Precio/u','Price/u')}</th>
                <th>SCU</th>
              </tr></thead>
              <tbody>${buyRows}</tbody>
            </table>
          </div>
        </div>
        <div class="trd-price-col">
          <div class="trd-price-col-title trd-sell-title">⬆ ${tr('Dónde VENDER','Where to SELL')} (${sells.length})</div>
          <div class="trd-table-wrap">
            <table class="trd-table">
              <thead><tr>
                <th>${tr('Terminal','Terminal')}</th>
                <th>${tr('Precio/u','Price/u')}</th>
                <th>SCU</th>
              </tr></thead>
              <tbody>${sellRows}</tbody>
            </table>
          </div>
        </div>
      </div>`;

    return header + stats + tables +
      `<p class="trd-attribution">${tr('Precios de la comunidad vía','Community prices via')} <a href="https://uexcorp.space" target="_blank" rel="noopener">UEX Corp</a></p>`;
  }

  // ── main render ──────────────────────────────────────────
  function render() {
    const wrap = document.getElementById('tradingContent');
    if (!wrap) return;

    if (S.loading) {
      wrap.innerHTML = `<div class="loading-state"><div class="loading-spinner"></div>
        <p>${tr('Cargando datos de comercio...','Loading trade data...')}</p></div>`;
      return;
    }
    if (S.error) {
      wrap.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠</div>
        <p>${tr('Error al cargar datos','Error loading data')}: ${esc(S.error)}</p>
        <button class="btn-ghost" onclick="Trading.refresh()">↺ ${tr('Reintentar','Retry')}</button></div>`;
      return;
    }
    if (!S.loaded) return;

    const content = S.view === 'routes' ? renderRoutes() : renderPrices();
    wrap.innerHTML = renderToolbar() + renderCats() + renderChips() + `<div class="trd-content">${content}</div>`;
  }

  // ── load / refresh ───────────────────────────────────────
  async function fetchAll() {
    const [commsData, pricesData] = await Promise.all([
      apiFetch('/commodities/'),
      apiFetch('/commodities_prices_all/'),
    ]);
    try {
      const termsData = await apiFetch('/terminals/');
      for (const t of termsData) S.terms.set(+t.id, t);
    } catch (_) {}
    for (const c of commsData) S.comms.set(+c.id, c);
    S.prices = pricesData;
    const kinds = new Set([...S.comms.values()].filter(c => c.kind).map(c => c.kind));
    buildCatColors(kinds);
    S.loaded = true;
  }

  async function load() {
    if (S.loaded) { render(); return; }
    S.loading = true; S.error = null;
    render();
    try { await fetchAll(); } catch (e) { S.error = e.message; }
    S.loading = false;
    render();
  }

  async function refresh() {
    S.loaded = false; S.loading = true; S.error = null;
    S.comms.clear(); S.terms.clear(); S.catColors.clear();
    S.prices = []; S.selRoute = null;
    render();
    try { await fetchAll(); } catch (e) { S.error = e.message; }
    S.loading = false;
    render();
  }

  // ── public actions ───────────────────────────────────────
  function selectCat(cat) {
    S.selCat = cat;
    if (S.selComm) {
      const c = S.comms.get(S.selComm);
      if (c && cat && c.kind !== cat) S.selComm = null;
    }
    render();
  }

  function selectComm(id) {
    S.selComm = id === null ? null : +id;
    if (S.selComm !== null) S.view = 'prices';
    render();
  }

  function setView(v) {
    S.view = v;
    render();
  }

  function setSearch(val) {
    S.search = val || '';
    render();
  }

  function pickRoute(dataStr) {
    try {
      S.selRoute = JSON.parse(dataStr);
    } catch (_) {}
    render();
    const calc = document.querySelector('.trd-calc');
    if (calc) calc.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function clearRoute() {
    S.selRoute = null;
    render();
  }

  function setScu(val) {
    const n = parseInt(val, 10);
    S.scuInput = n > 0 ? n : 1;
    // Re-render only the calc to avoid scroll jump
    const calcEl = document.querySelector('.trd-calc');
    if (calcEl) calcEl.outerHTML = renderCalc();
    const calcEl2 = document.querySelector('.trd-calc');
    if (calcEl2) calcEl2.outerHTML = renderCalc();
    render();
  }

  function adjScu(delta) {
    S.scuInput = Math.max(1, (S.scuInput || 100) + delta);
    render();
  }

  return { load, refresh, selectCat, selectComm, setView, setSearch, pickRoute, clearRoute, setScu, adjScu };

})();
