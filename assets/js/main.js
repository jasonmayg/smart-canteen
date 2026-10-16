import { $, $$, ico, loadState, onChange, modal, toast, resetState, esc, state, money } from './core.js';
import { defaults } from './store.js';
import { vision } from './vision.js';
import { renderFamily, paint as paintFamily } from './views/family.js';
import { renderCheckout } from './views/checkout.js';
import { renderKitchen, renderDistrict, renderFinance } from './views/ops.js';
import { drawTray } from './tray.js';
import { SAMPLE_TRAYS, CHILD } from './data.js';

const ROUTES = {
  overview: { title: 'Overview', group: 'Product', icon: 'sparkles', render: renderOverview },
  family: { title: 'Family app', group: 'Parents & students', icon: 'home', render: renderFamily },
  checkout: { title: 'Canteen checkout', group: 'Parents & students', icon: 'scan', render: renderCheckout, badge: 'AI' },
  kitchen: { title: 'Kitchen', group: 'Operations', icon: 'chef', render: renderKitchen },
  district: { title: 'District dashboard', group: 'Operations', icon: 'shield', render: renderDistrict },
  finance: { title: 'Working capital', group: 'Operations', icon: 'bank', render: renderFinance },
};

export function openSettings(after) {
  modal('Settings', `
    <div class="stack">
      <div><div class="strong">Real dish recognition</div><p class="small muted" style="margin:4px 0 10px">Sample trays work without a key. To recognize your own photos, paste an Anthropic API key. It stays in this browser tab, is sent only to the model provider, and is cleared when you close the tab.</p>
        <label class="field">API key<input class="input" id="apiKey" type="password" autocomplete="off" placeholder="sk-ant-…" value="${esc(vision.apiKey)}"></label>
        <label class="field" style="margin-top:10px">Model<input class="input" id="model" value="${esc(vision.model)}"></label></div>
      <div class="row"><button class="btn primary" id="saveKey">Save</button>${vision.apiKey ? '<button class="btn ghost" id="clearKey">Remove key</button>' : ''}</div>
      <div class="divider"></div>
      <div><div class="strong">Demo data</div><p class="small muted" style="margin:4px 0 10px">Your orders, payments and checklist ticks are saved in this browser. Start over to see the demo fresh.</p><button class="btn secondary" id="resetDemo">${ico('refresh')}Reset demo</button></div>
    </div>`, { width: 480, onMount: (m, close) => {
      $('#saveKey', m).onclick = () => { vision.apiKey = $('#apiKey', m).value.trim(); vision.model = $('#model', m).value.trim() || vision.model; close(); toast(vision.apiKey ? 'Vision model connected for this tab' : 'Settings saved'); after && after(); };
      const c = $('#clearKey', m); if (c) c.onclick = () => { vision.apiKey = ''; close(); toast('Key removed'); after && after(); };
      $('#resetDemo', m).onclick = () => { resetState(defaults()); close(); toast('Demo reset'); route(); };
    } });
}

function shell() {
  const groups = {}; Object.entries(ROUTES).forEach(([k, r]) => (groups[r.group] = groups[r.group] || []).push([k, r]));
  document.body.innerHTML = `
  <div class="app" id="app">
    <aside class="sidebar" aria-label="Main navigation">
      <div class="logo"><span class="mark"><svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="2" y="4" width="20" height="16" rx="4" stroke="#fff" stroke-width="2"/><rect x="5" y="7" width="7" height="10" rx="2" fill="#fff"/><rect x="14" y="7" width="5" height="4" rx="1.5" fill="#fff" opacity=".7"/><rect x="14" y="13" width="5" height="4" rx="1.5" fill="#fff" opacity=".7"/></svg></span>Smart Canteen</div>
      ${Object.entries(groups).map(([g, rs]) => `<nav class="nav nav-group" aria-label="${g}"><div class="nav-label">${g}</div>${rs.map(([k, r]) => `<a href="#/${k}" data-route="${k}">${ico(r.icon)}${r.title}${r.badge ? `<span class="badge green">${r.badge}</span>` : ''}</a>`).join('')}</nav>`).join('')}
      <div class="sidebar-foot">Portfolio prototype by Jason Geng. Fictional data; real algorithms. <a href="https://github.com/jasonmayg/smart-canteen">Source and PRD</a></div>
    </aside>
    <div class="scrim" id="scrim"></div>
    <div class="main">
      <header class="topbar"><button class="btn icon ghost menu-btn" id="menuBtn" aria-label="Open navigation">${ico('menu')}</button><h1 id="pageTitle"></h1><span class="badge amber">Demo data</span><span class="spacer"></span><button class="btn secondary sm" id="settingsBtn">${ico('settings')}Settings</button></header>
      <main class="content" id="content" tabindex="-1"></main>
    </div>
  </div>`;
  $('#menuBtn').onclick = () => $('#app').classList.add('nav-open');
  $('#scrim').onclick = () => $('#app').classList.remove('nav-open');
  $('#settingsBtn').onclick = () => openSettings(() => route());
}

let current = null;
function route() {
  const key = (location.hash.replace(/^#\/?/, '').split('/')[0]) || 'overview';
  const r = ROUTES[key] || ROUTES.overview; current = ROUTES[key] ? key : 'overview';
  $$('.nav a').forEach(a => a.setAttribute('aria-current', a.dataset.route === current ? 'page' : 'false'));
  $('#pageTitle').textContent = r.title; document.title = `${r.title} | Smart Canteen`;
  const c = $('#content'); c.onclick = null; c.onchange = null; r.render(c);
  $('#app').classList.remove('nav-open'); window.scrollTo(0, 0);
}

function renderOverview(root) {
  const s = state.data;
  root.innerHTML = `
  <div class="h-page"><div><h2>School lunch, end to end</h2><p>One system for the five parties in a school lunch. Parents pre-order and set rules, a camera at the counter recognizes each tray and charges the right wallet, kitchens cook to real demand, and regulators see food safety and every dollar as it happens.</p></div></div>
  <div class="grid cols-2">
    <a class="card" href="#/checkout" style="text-decoration:none;color:inherit;overflow:hidden"><canvas id="ovTray" style="width:100%;aspect-ratio:16/8;display:block;background:#0F1722"></canvas><div class="card-b"><div class="row"><span class="badge green">AI</span><b>Canteen checkout</b></div><p class="small muted" style="margin:6px 0 0">The camera recognizes every dish on a tray, estimates portions and nutrition, enforces the parent's rules, and the student pays with their face.</p></div></a>
    <div class="stack">
      ${[['family', 'home', 'Family app', `Pre-order next week, pay into escrow, see what ${CHILD.name} actually ate, and block desserts or sugary drinks.`], ['kitchen', 'chef', 'Kitchen', 'Pre-orders become a production plan; a forecast covers unconfirmed days; the menu planner balances nutrition and cost.'], ['district', 'shield', 'District dashboard', 'Kitchens ranked by inspection risk, meal fees held in escrow, every purchase traceable to a bank payment.'], ['finance', 'bank', 'Working capital', 'Caterers borrow against school contracts and repay automatically as meal fees clear.']].map(([k, i, t, d]) => `<a class="card" href="#/${k}" style="text-decoration:none;color:inherit"><div class="card-b row" style="align-items:flex-start"><div class="icon-tile" style="background:var(--brand-softer);color:var(--brand)">${ico(i)}</div><div><div class="strong">${t}</div><div class="small muted">${d}</div></div><span style="margin-left:auto;color:var(--faint)">${ico('chevron')}</span></div></a>`).join('')}
    </div>
  </div>
  <div class="grid cols-4" style="margin-top:16px">
    ${[['Food waste target', '~15% to under 5%', 'via weekly pre-ordering'], ['Checkout target', 'under 5 s', 'per tray, no cashier'], ['Caterer cash cycle target', '45–60 to under 7 days', 'with fee-backed credit'], ['Forecast error target', 'under 5%', 'next-day headcount']].map(([a, b, c]) => `<div class="card kpi"><div class="label">${a}</div><div class="value" style="font-size:21px">${b}</div><div class="delta muted">${c}</div></div>`).join('')}
  </div>
  <p class="demo-note">These are the product targets from the PRD, not measured results. Start with the <a href="#/family">Family app</a>, place an order, then scan a tray at <a href="#/checkout">Canteen checkout</a>.</p>`;
  const c = $('#ovTray'); requestAnimationFrame(() => drawTray(c, SAMPLE_TRAYS[0].slots, [], 11));
}

// boot
loadState(defaults());
shell();
window.addEventListener('hashchange', route);
onChange(() => { if (current === 'family') paintFamily(); });
route();
