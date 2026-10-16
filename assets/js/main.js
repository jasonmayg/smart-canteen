import { $, $$, ico } from './lib/ui.js';
import { loadState, onChange, defaults } from './state.js';
import { renderCheckout } from './views/checkout.js';
import { renderDistrict } from './views/district.js';
import { renderFamily, paint as paintFamily } from './views/family.js';
import { renderFinance } from './views/finance.js';
import { renderKitchen } from './views/kitchen.js';
import { renderOverview } from './views/overview.js';
import { openSettings } from './views/settings.js';
const ROUTES = {
  overview: { title: 'Overview', group: 'Product', icon: 'sparkles', render: renderOverview },
  family: { title: 'Family app', group: 'Parents & students', icon: 'home', render: renderFamily },
  checkout: { title: 'Canteen checkout', group: 'Parents & students', icon: 'scan', render: renderCheckout, badge: 'AI' },
  kitchen: { title: 'Kitchen', group: 'Operations', icon: 'chef', render: renderKitchen },
  district: { title: 'District dashboard', group: 'Operations', icon: 'shield', render: renderDistrict },
  finance: { title: 'Working capital', group: 'Operations', icon: 'bank', render: renderFinance },
};

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

// boot
loadState(defaults());
shell();
window.addEventListener('hashchange', route);
onChange(() => { if (current === 'family') paintFamily(); });
route();
