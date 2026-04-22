/* ===================================================
   GHOST SYNDICATE TOOLS — Trading Routes + Refineries
   UEX Corp API v2.0
   =================================================== */
'use strict';

window.Trading = (function () {

  const API_BASE = 'https://api.uexcorp.space/2.0';
  const API_KEY  = '4996aae707d9ff2f23e17ab42cb51c71e549fa92';
  const UNITS_PER_SCU = 100;

  const KNOWN_COLORS = {
    metal:'#94a3b8', ore:'#f97316', mineral:'#f97316',
    agricultural:'#22c55e', food:'#eab308', drug:'#a855f7',
    gas:'#06b6d4', medical:'#3b82f6', scrap:'#78716c',
    vice:'#ec4899', waste:'#71717a', raw:'#ea580c',
    refined:'#f59e0b', clothing:'#14b8a6', weapon:'#ef4444',
    electronic:'#0ea5e9', consumer:'#8b5cf6', industrial:'#b45309',
    data:'#a3e635',
  };
  const PALETTE = [
    '#f97316','#22c55e','#06b6d4','#a855f7','#eab308',
    '#3b82f6','#ec4899','#94a3b8','#14b8a6','#ef4444',
    '#f59e0b','#8b5cf6','#10b981','#0ea5e9','#78716c',
  ];

  // ── State ────────────────────────────────────────────────
  const S = {
    // trade data
    loaded: false, loading: false, error: null,
    comms:  new Map(), terms: new Map(), prices: [],
    catColors: new Map(),
    // trade UI
    selCat: '', selComm: null, selRoute: null,
    view: 'routes', search: '', scuInput: 100,
    // refinery data
    ref: {
      loaded: false, loading: false,
      yields: [], methods: [], caps: new Map(),
      selMineralId: null,
    },
  };

  // ── Helpers ──────────────────────────────────────────────
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
  function fmtInt(n) { return (+n).toLocaleString('en-US', { maximumFractionDigits: 0 }); }
  function catColor(kind) { return S.catColors.get(kind) || '#b45309'; }
  function commColor(id)  { const c = S.comms.get(+id); return c ? catColor(c.kind) : '#b45309'; }
  function termLoc(t) {
    if (!t) return '';
    return t.city_name || t.moon_name || t.planet_name || t.star_system_name || '';
  }
  function buildCatColors(kinds) {
    let idx = 0;
    for (const k of [...kinds].sort()) {
      const low = k.toLowerCase();
      let color = null;
      for (const [kw, v] of Object.entries(KNOWN_COLORS)) {
        if (low.includes(kw)) { color = v; break; }
      }
      S.catColors.set(k, color || PALETTE[idx++ % PALETTE.length]);
    }
  }
  function stars(n, max = 3) {
    return '★'.repeat(n) + '☆'.repeat(max - n);
  }

  // ── API ──────────────────────────────────────────────────
  async function apiFetch(ep) {
    const r = await fetch(API_BASE + ep, { headers: { Authorization: 'Bearer ' + API_KEY } });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const j = await r.json();
    if (j.status !== 'ok') throw new Error(j.message || 'API error');
    return j.data || [];
  }

  // ── Route computation ────────────────────────────────────
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
        const comm = S.comms.get(cid) || {};
        const tBuy  = S.terms.get(+bestBuy.id_terminal) || {};
        const tSell = S.terms.get(+sell.id_terminal)    || {};
        routes.push({
          commId: cid, commodity: comm.name || bestBuy.commodity_name || '—',
          kind: comm.kind || '',
          from: bestBuy.terminal_name || '—', fromLoc: termLoc(tBuy),
          to:   sell.terminal_name   || '—', toLoc:   termLoc(tSell),
          buyPrice: +bestBuy.price_buy, sellPrice: +sell.price_sell,
          profit,
          profitPct: ((profit / +bestBuy.price_buy) * 100).toFixed(1),
          scuStock:  +bestBuy.scu_buy_avg || +bestBuy.scu_buy || 0,
        });
      }
    }
    return routes.sort((a, b) => b.profit - a.profit);
  }

  // ── Filter helpers ───────────────────────────────────────
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
    if (S.selCat)  list = list.filter(c => c.kind === S.selCat);
    if (S.search) {
      const q = S.search.toLowerCase();
      list = list.filter(c => (c.name || '').toLowerCase().includes(q));
    }
    return list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }

  // ── Render: toolbar ──────────────────────────────────────
  function renderToolbar() {
    const rA  = S.view === 'routes'     ? ' trd-tab-active' : '';
    const pA  = S.view === 'prices'     ? ' trd-tab-active' : '';
    const rfA = S.view === 'refineries' ? ' trd-tab-active' : '';
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
          <button class="trd-tab${rA}"  onclick="Trading.setView('routes')">📈 ${tr('Rutas','Routes')}</button>
          <button class="trd-tab${pA}"  onclick="Trading.setView('prices')">📊 ${tr('Precios','Prices')}</button>
          <button class="trd-tab${rfA}" onclick="Trading.setView('refineries')">⚗ ${tr('Refinerías','Refineries')}</button>
        </div>
        <button class="btn-ghost trd-refresh-btn" onclick="Trading.refresh()">↺ ${tr('Actualizar','Refresh')}</button>
      </div>`;
  }

  // ── Render: category pills ───────────────────────────────
  function renderCats() {
    if (S.view === 'refineries') return '';
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

  // ── Render: commodity chips ──────────────────────────────
  function renderChips() {
    if (S.view === 'refineries') return '';
    const comms = filteredComms();
    if (!comms.length) return '';
    let html = '<div class="trd-chips">';
    for (const c of comms) {
      const color  = catColor(c.kind);
      const active = S.selComm === c.id ? ' trd-chip-active' : '';
      const flags  = (c.is_mineral?'⛏':'') + (c.is_refined?'✨':'') + (c.is_illegal?'☠':'');
      html += `<button class="trd-chip${active}" style="--cc:${color}"
        onclick="Trading.selectComm(${c.id})"
        title="${esc(c.kind||'')}">
        <span class="trd-chip-dot"></span>${esc(c.name)}${flags ? `<span class="trd-chip-flags">${flags}</span>` : ''}
      </button>`;
    }
    return html + '</div>';
  }

  // ── Render: SCU calculator ───────────────────────────────
  function renderCalc() {
    const r = S.selRoute;
    if (!r) return `<div class="trd-calc trd-calc-empty">
      <span class="trd-calc-hint">👆 ${tr('Haz clic en una ruta para calcular el beneficio con tus SCUs','Click a route to calculate profit for your SCUs')}</span>
    </div>`;
    const scu     = +S.scuInput || 1;
    const invest  = r.buyPrice  * scu * UNITS_PER_SCU;
    const revenue = r.sellPrice * scu * UNITS_PER_SCU;
    const profit  = (r.sellPrice - r.buyPrice) * scu * UNITS_PER_SCU;
    const color   = commColor(r.commId);
    const pCls    = profit >= 0 ? 'trd-calc-profit-pos' : 'trd-calc-profit-neg';
    return `<div class="trd-calc">
      <div class="trd-calc-route">
        <span class="trd-comm-dot" style="background:${color}"></span>
        <strong>${esc(r.commodity)}</strong>
        <span class="trd-calc-arrow">${esc(r.from)} → ${esc(r.to)}</span>
        <button class="trd-calc-clear" onclick="Trading.clearRoute()">✕</button>
      </div>
      <div class="trd-calc-row">
        <div class="trd-calc-scu-ctrl">
          <label class="trd-calc-label">📦 SCUs</label>
          <div class="trd-calc-scu-input-wrap">
            <button class="trd-scu-btn" onclick="Trading.adjScu(-100)">−100</button>
            <button class="trd-scu-btn" onclick="Trading.adjScu(-10)">−10</button>
            <input type="number" class="trd-scu-input" id="trdScuInput"
              value="${scu}" min="1" max="99999" oninput="Trading.setScu(this.value)">
            <button class="trd-scu-btn" onclick="Trading.adjScu(10)">+10</button>
            <button class="trd-scu-btn" onclick="Trading.adjScu(100)">+100</button>
          </div>
          <div class="trd-scu-presets">
            ${[50,100,500,1000,2000,4000].map(v =>
              `<button class="trd-scu-preset${scu===v?' active':''}" onclick="Trading.setScu(${v})">${v}</button>`
            ).join('')}
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
            <span class="trd-calc-result-val ${pCls}">${profit>=0?'+':''}${fmt(profit)} aUEC</span>
          </div>
          <div class="trd-calc-result-item">
            <span class="trd-calc-result-label">${tr('Margen','Margin')}</span>
            <span class="trd-calc-result-val ${pCls}">${profit>=0?'+':''}${r.profitPct}%</span>
          </div>
        </div>
      </div>
    </div>`;
  }

  // ── Render: routes view ──────────────────────────────────
  function renderRoutes() {
    const prices = filteredPrices();
    const routes = computeRoutes(prices);
    const tableHtml = !routes.length
      ? `<div class="empty-state"><div class="empty-icon">◈</div>
          <p>${tr('No hay rutas rentables con este filtro','No profitable routes for this filter')}</p></div>`
      : (() => {
          const rows = routes.slice(0, 250).map((r, i) => {
            const cls  = +r.profitPct>=100?'trd-hi':+r.profitPct>=30?'trd-mid':'trd-lo';
            const col  = catColor(r.kind);
            const sel  = S.selRoute && S.selRoute.commId===r.commId && S.selRoute.from===r.from && S.selRoute.to===r.to ? ' trd-row-sel' : '';
            const fLoc = r.fromLoc ? `<span class="trd-loc">${esc(r.fromLoc)}</span>` : '';
            const tLoc = r.toLoc   ? `<span class="trd-loc">${esc(r.toLoc)}</span>`   : '';
            const stock= r.scuStock? `<span class="trd-scu-badge">${fmtInt(r.scuStock)} SCU</span>` : '';
            const d    = esc(JSON.stringify({ commId:r.commId,commodity:r.commodity,from:r.from,to:r.to,buyPrice:r.buyPrice,sellPrice:r.sellPrice,profitPct:r.profitPct }));
            return `<tr class="trd-row${sel}" onclick="Trading.pickRoute('${d}')">
              <td class="trd-rank">${i+1}</td>
              <td class="trd-commodity"><span class="trd-comm-dot" style="background:${col}"></span>${esc(r.commodity)}</td>
              <td><span class="trd-term">${esc(r.from)}</span>${fLoc}</td>
              <td><span class="trd-term">${esc(r.to)}</span>${tLoc}</td>
              <td class="trd-num">${fmt(r.buyPrice)}</td>
              <td class="trd-num">${fmt(r.sellPrice)}</td>
              <td class="trd-num trd-profit ${cls}">+${fmt(r.profit)}${stock}</td>
            </tr>`;
          }).join('');
          return `<div class="trd-routes-info">${tr('Rutas rentables','Profitable routes')}: <strong>${routes.length}</strong>
            <span class="trd-routes-hint">· ${tr('Clic en fila para calcular beneficio','Click row to calculate profit')}</span></div>
            <div class="trd-table-wrap"><table class="trd-table">
              <thead><tr>
                <th>#</th><th>${tr('Mercancía','Commodity')}</th>
                <th>${tr('Comprar en','Buy at')}</th><th>${tr('Vender en','Sell at')}</th>
                <th>${tr('Compra','Buy')}</th><th>${tr('Venta','Sell')}</th>
                <th>${tr('Beneficio/u','Profit/u')}</th>
              </tr></thead>
              <tbody>${rows}</tbody>
            </table></div>`;
        })();
    return renderCalc() + tableHtml +
      `<p class="trd-attribution">${tr('Precios de la comunidad vía','Community prices via')} <a href="https://uexcorp.space" target="_blank" rel="noopener">UEX Corp</a> · ${tr('1 SCU = 100 unidades asumido','1 SCU = 100 units assumed')}</p>`;
  }

  // ── Render: prices view ──────────────────────────────────
  function renderPrices() {
    const comm = S.selComm ? S.comms.get(S.selComm) : null;
    if (!comm) return `<div class="trd-prices-hint"><div class="empty-icon">◈</div>
      <p>${tr('Selecciona una mercancía del listado superior o de las rutas para ver sus precios','Select a commodity from the list above or from routes to see prices')}</p></div>`;

    const color = catColor(comm.kind);
    const commPrices = S.prices.filter(p => +p.id_commodity === S.selComm);
    const buys  = commPrices.filter(p => +p.price_buy >0 && +p.status_buy ===1).sort((a,b)=>+a.price_buy -+b.price_buy);
    const sells = commPrices.filter(p => +p.price_sell>0 && +p.status_sell===1).sort((a,b)=>+b.price_sell-+a.price_sell);
    const bestBuy  = buys[0]  ? +buys[0].price_buy   : null;
    const bestSell = sells[0] ? +sells[0].price_sell  : null;
    const maxProfit= (bestBuy && bestSell) ? bestSell - bestBuy : null;
    const marginPct= maxProfit && bestBuy  ? ((maxProfit/bestBuy)*100).toFixed(1) : null;

    const flags = [
      comm.is_mineral  ? `<span class="trd-flag">⛏ ${tr('Mineral','Mineral')}</span>` : '',
      comm.is_refined  ? `<span class="trd-flag">✨ ${tr('Refinado','Refined')}</span>` : '',
      comm.is_raw      ? `<span class="trd-flag">🪨 ${tr('En bruto','Raw')}</span>` : '',
      comm.is_refinable? `<span class="trd-flag">🔧 ${tr('Refinable','Refinable')}</span>` : '',
      comm.is_illegal  ? `<span class="trd-flag trd-flag-red">☠ ${tr('Ilegal','Illegal')}</span>` : '',
    ].filter(Boolean).join('');

    const stats = `<div class="trd-price-stats">
      <div class="trd-stat-card"><div class="trd-stat-label">${tr('Mejor compra','Best buy')}</div>
        <div class="trd-stat-val trd-buy-clr">${bestBuy ? fmt(bestBuy)+' aUEC' : '—'}</div></div>
      <div class="trd-stat-card"><div class="trd-stat-label">${tr('Mejor venta','Best sell')}</div>
        <div class="trd-stat-val trd-sell-clr">${bestSell ? fmt(bestSell)+' aUEC' : '—'}</div></div>
      <div class="trd-stat-card"><div class="trd-stat-label">${tr('Margen máx/u','Max margin/u')}</div>
        <div class="trd-stat-val ${maxProfit>0?'trd-hi':''}">${maxProfit>0?`+${fmt(maxProfit)} aUEC`:'—'}</div></div>
      <div class="trd-stat-card"><div class="trd-stat-label">${tr('Margen %','Margin %')}</div>
        <div class="trd-stat-val ${marginPct>0?'trd-hi':''}">${marginPct>0?`+${marginPct}%`:'—'}</div></div>
      <div class="trd-stat-card"><div class="trd-stat-label">${tr('Terminales','Terminals')}</div>
        <div class="trd-stat-val">${commPrices.length}</div></div>
    </div>`;

    const mkBuyRow  = p => { const t=S.terms.get(+p.id_terminal)||{}; const loc=termLoc(t); const scu=+p.scu_buy_avg||+p.scu_buy||0;
      return `<tr><td><span class="trd-term">${esc(p.terminal_name||'')}</span>${loc?`<span class="trd-loc">${esc(loc)}</span>`:''}</td>
        <td class="trd-num trd-buy-clr">${fmt(+p.price_buy)}</td>
        <td class="trd-num trd-muted">${scu?fmtInt(scu)+' SCU':'—'}</td></tr>`; };
    const mkSellRow = p => { const t=S.terms.get(+p.id_terminal)||{}; const loc=termLoc(t); const scu=+p.scu_sell_avg||+p.scu_sell||0;
      const diff=bestBuy&&(+p.price_sell-bestBuy)>0?`<span class="trd-pct trd-hi"> (+${((+p.price_sell-bestBuy)/bestBuy*100).toFixed(1)}%)</span>`:'';
      return `<tr><td><span class="trd-term">${esc(p.terminal_name||'')}</span>${loc?`<span class="trd-loc">${esc(loc)}</span>`:''}</td>
        <td class="trd-num trd-sell-clr">${fmt(+p.price_sell)}${diff}</td>
        <td class="trd-num trd-muted">${scu?fmtInt(scu)+' SCU':'—'}</td></tr>`; };

    const noRow = msg => `<tr><td colspan="3" class="trd-empty-cell">${msg}</td></tr>`;
    return `<div class="trd-price-header">
        <span class="trd-comm-dot-lg" style="background:${color}"></span>
        <h3 class="trd-comm-title">${esc(comm.name)}</h3>
        ${comm.kind?`<span class="trd-kind-badge" style="--cc:${color}">${esc(comm.kind)}</span>`:''}
        ${flags}
        <button class="trd-clear-sel" onclick="Trading.selectComm(null)">✕ ${tr('Quitar','Clear')}</button>
      </div>${stats}
      <div class="trd-price-tables">
        <div class="trd-price-col">
          <div class="trd-price-col-title trd-buy-title">⬇ ${tr('DÓNDE COMPRAR','WHERE TO BUY')} (${buys.length})</div>
          <div class="trd-table-wrap"><table class="trd-table">
            <thead><tr><th>${tr('Terminal','Terminal')}</th><th>${tr('Precio/u','Price/u')}</th><th>SCU</th></tr></thead>
            <tbody>${buys.map(mkBuyRow).join('')||noRow(tr('No disponible para compra','Not available to buy'))}</tbody>
          </table></div>
        </div>
        <div class="trd-price-col">
          <div class="trd-price-col-title trd-sell-title">⬆ ${tr('DÓNDE VENDER','WHERE TO SELL')} (${sells.length})</div>
          <div class="trd-table-wrap"><table class="trd-table">
            <thead><tr><th>${tr('Terminal','Terminal')}</th><th>${tr('Precio/u','Price/u')}</th><th>SCU</th></tr></thead>
            <tbody>${sells.map(mkSellRow).join('')||noRow(tr('No disponible para venta','Not available to sell'))}</tbody>
          </table></div>
        </div>
      </div>
      <p class="trd-attribution">${tr('Precios de la comunidad vía','Community prices via')} <a href="https://uexcorp.space" target="_blank" rel="noopener">UEX Corp</a></p>`;
  }

  // ── Render: refineries view ──────────────────────────────
  function renderRefineries() {
    const ref = S.ref;
    if (ref.loading) return `<div class="loading-state"><div class="loading-spinner"></div>
      <p>${tr('Cargando datos de refinerías...','Loading refinery data...')}</p></div>`;

    if (!ref.loaded) return `<div class="empty-state"><div class="empty-icon">⚗</div>
      <p>${tr('Error al cargar datos de refinerías','Error loading refinery data')}</p>
      <button class="btn-ghost" onclick="Trading.loadRef()">↺ ${tr('Reintentar','Retry')}</button></div>`;

    // Methods grid
    const methodCards = ref.methods.map(m => {
      const yld   = m.rating_yield;
      const cost  = 4 - m.rating_cost;  // invert: cheaper = more stars
      const speed = m.rating_speed;
      const bestClass = (yld === 3 || speed === 3 || cost === 3) ? ' ref-method-top' : '';
      return `<div class="ref-method-card${bestClass}">
        <div class="ref-method-name">${esc(m.name)}</div>
        <div class="ref-method-code">${esc(m.code)}</div>
        <div class="ref-method-ratings">
          <div class="ref-rating-row">
            <span class="ref-rating-lbl">${tr('Rendimiento','Yield')}</span>
            <span class="ref-stars ref-stars-yield">${stars(yld)}</span>
          </div>
          <div class="ref-rating-row">
            <span class="ref-rating-lbl">${tr('Coste','Cost')}</span>
            <span class="ref-stars ref-stars-cost">${stars(cost)}</span>
          </div>
          <div class="ref-rating-row">
            <span class="ref-rating-lbl">${tr('Velocidad','Speed')}</span>
            <span class="ref-stars ref-stars-speed">${stars(speed)}</span>
          </div>
        </div>
      </div>`;
    }).join('');

    // Mineral chips (only those present in yields data)
    const mineralIds = new Set(ref.yields.map(y => +y.id_commodity));
    const mineralComms = [...S.comms.values()]
      .filter(c => mineralIds.has(c.id))
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));

    const mineralChips = mineralComms.map(c => {
      const color  = catColor(c.kind);
      const active = ref.selMineralId === c.id ? ' trd-chip-active' : '';
      return `<button class="trd-chip${active}" style="--cc:${color}"
        onclick="Trading.selectRefMineral(${c.id})">
        <span class="trd-chip-dot"></span>${esc(c.name)}
      </button>`;
    }).join('');

    // Yields table
    let yieldsHtml = '';
    if (ref.selMineralId) {
      const comm    = S.comms.get(ref.selMineralId);
      const entries = ref.yields
        .filter(y => +y.id_commodity === ref.selMineralId)
        .sort((a, b) => +b.value - +a.value);

      if (entries.length) {
        const rows = entries.map(y => {
          const val     = +y.value;
          const cap     = ref.caps.get(+y.id_terminal);
          const valCls  = val > 0 ? 'ref-yield-pos' : val < 0 ? 'ref-yield-neg' : 'ref-yield-neu';
          const valStr  = val > 0 ? `+${val}%` : `${val}%`;
          const loc     = [y.moon_name, y.planet_name, y.star_system_name].find(Boolean) || '';
          return `<tr>
            <td><span class="trd-term">${esc(y.terminal_name || '—')}</span>
                ${loc ? `<span class="trd-loc">${esc(loc)}</span>` : ''}</td>
            <td class="trd-num ${valCls} ref-yield-big">${valStr}</td>
            <td class="trd-num trd-muted">${cap ? fmtInt(cap) + ' SCU' : '—'}</td>
          </tr>`;
        }).join('');

        const color = comm ? catColor(comm.kind) : '#b45309';
        yieldsHtml = `
          <div class="ref-yields-header">
            <span class="trd-comm-dot" style="background:${color}"></span>
            <strong>${esc(comm ? comm.name : '')}</strong>
            <span class="trd-muted" style="font-size:0.75rem">· ${entries.length} ${tr('refinerías con datos','refineries with data')}</span>
            <button class="trd-clear-sel" onclick="Trading.selectRefMineral(null)">✕</button>
          </div>
          <div class="trd-table-wrap">
            <table class="trd-table">
              <thead><tr>
                <th>${tr('Refinería','Refinery')}</th>
                <th>${tr('Bonificación rendimiento','Yield bonus')}</th>
                <th>${tr('Capacidad','Capacity')}</th>
              </tr></thead>
              <tbody>${rows}</tbody>
            </table>
          </div>`;
      }
    } else {
      // Show overview: top bonuses across all minerals
      const topEntries = [...ref.yields]
        .sort((a, b) => +b.value - +a.value)
        .slice(0, 30);

      const rows = topEntries.map(y => {
        const val    = +y.value;
        const comm2  = S.comms.get(+y.id_commodity);
        const color  = comm2 ? catColor(comm2.kind) : '#b45309';
        const cap    = ref.caps.get(+y.id_terminal);
        const valCls = val > 0 ? 'ref-yield-pos' : val < 0 ? 'ref-yield-neg' : 'ref-yield-neu';
        const valStr = val > 0 ? `+${val}%` : `${val}%`;
        const loc    = [y.moon_name, y.planet_name, y.star_system_name].find(Boolean) || '';
        return `<tr>
          <td><span class="trd-comm-dot" style="background:${color}"></span>${esc(y.commodity_name || '—')}</td>
          <td><span class="trd-term">${esc(y.terminal_name || '—')}</span>
              ${loc ? `<span class="trd-loc">${esc(loc)}</span>` : ''}</td>
          <td class="trd-num ${valCls} ref-yield-big">${valStr}</td>
          <td class="trd-num trd-muted">${cap ? fmtInt(cap) + ' SCU' : '—'}</td>
        </tr>`;
      }).join('');

      yieldsHtml = `
        <div class="trd-routes-info">${tr('Mejores bonificaciones (todos los minerales)','Best yield bonuses (all minerals)')}</div>
        <div class="trd-table-wrap">
          <table class="trd-table">
            <thead><tr>
              <th>${tr('Mineral','Mineral')}</th>
              <th>${tr('Refinería','Refinery')}</th>
              <th>${tr('Bonificación','Yield bonus')}</th>
              <th>${tr('Capacidad','Capacity')}</th>
            </tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>`;
    }

    return `
      <div class="ref-methods-section">
        <div class="ref-section-title">⚙ ${tr('Métodos de refinado','Refining methods')}</div>
        <div class="ref-methods-grid">${methodCards}</div>
      </div>
      <div class="ref-yields-section">
        <div class="ref-section-title">📊 ${tr('Bonificaciones por mineral — selecciona un mineral','Yield bonuses by mineral — select a mineral')}</div>
        <div class="trd-chips ref-mineral-chips">${mineralChips}</div>
        ${yieldsHtml}
      </div>
      <p class="trd-attribution">${tr('Datos de la comunidad vía','Community data via')} <a href="https://uexcorp.space" target="_blank" rel="noopener">UEX Corp</a></p>`;
  }

  // ── Master render ────────────────────────────────────────
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

    const content = S.view === 'routes' ? renderRoutes()
                  : S.view === 'prices' ? renderPrices()
                  : renderRefineries();
    wrap.innerHTML = renderToolbar() + renderCats() + renderChips() + `<div class="trd-content">${content}</div>`;
  }

  // ── Load trade data ──────────────────────────────────────
  async function fetchTrade() {
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
    try { await fetchTrade(); } catch (e) { S.error = e.message; }
    S.loading = false;
    render();
  }

  async function refresh() {
    S.loaded = false; S.loading = true; S.error = null;
    S.comms.clear(); S.terms.clear(); S.catColors.clear();
    S.prices = []; S.selRoute = null;
    S.ref.loaded = false; S.ref.yields = []; S.ref.methods = [];
    S.ref.caps.clear();
    render();
    try { await fetchTrade(); } catch (e) { S.error = e.message; }
    S.loading = false;
    render();
    if (S.loaded && S.view === 'refineries') loadRef();
  }

  // ── Load refinery data (lazy) ────────────────────────────
  async function loadRef() {
    if (S.ref.loaded || S.ref.loading) return;
    S.ref.loading = true;
    render();
    try {
      const [yieldsData, methodsData, capsData] = await Promise.all([
        apiFetch('/refineries_yields/'),
        apiFetch('/refineries_methods/'),
        apiFetch('/refineries_capacities/'),
      ]);
      S.ref.yields  = yieldsData;
      S.ref.methods = methodsData;
      for (const c of capsData) S.ref.caps.set(+c.id_terminal, +c.value);
      S.ref.loaded = true;
    } catch (e) {
      S.ref.loaded = false;
    }
    S.ref.loading = false;
    render();
  }

  // ── Public actions ───────────────────────────────────────
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
    if (v === 'refineries' && !S.ref.loaded && !S.ref.loading) loadRef();
    render();
  }

  function setSearch(val) { S.search = val || ''; render(); }

  function pickRoute(dataStr) {
    try { S.selRoute = JSON.parse(dataStr); } catch (_) {}
    render();
    const calc = document.querySelector('.trd-calc');
    if (calc) calc.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function clearRoute() { S.selRoute = null; render(); }

  function setScu(val) {
    S.scuInput = Math.max(1, parseInt(val, 10) || 1);
    render();
  }

  function adjScu(delta) {
    S.scuInput = Math.max(1, (S.scuInput || 100) + delta);
    render();
  }

  function selectRefMineral(id) {
    S.ref.selMineralId = id === null ? null : +id;
    render();
  }

  return { load, refresh, loadRef, selectCat, selectComm, setView, setSearch,
           pickRoute, clearRoute, setScu, adjScu, selectRefMineral };

})();
