import { $, $$, ico } from './lib/ui.js';
import { esc, money } from './lib/format.js';
import { toast, modal } from './lib/ui.js';
import { loadState, onChange, defaults, state, viewer, update, isOffline, goOffline, goOnline, spendElsewhere } from './state.js';
import { canSee, can, roleLabel } from './domain/org.js';
import { renderOrg, repaintOrg } from './views/org.js';
import { repaintCheckout } from './views/checkout.js';
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
  org: { title: 'Organization', group: 'Operations', icon: 'user', render: renderOrg },
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
      <header class="topbar"><button class="btn icon ghost menu-btn" id="menuBtn" aria-label="Open navigation">${ico('menu')}</button><h1 id="pageTitle"></h1><span class="badge amber">Demo data</span><span class="spacer"></span><span id="netBox"></span><span id="viewerBox"></span><button class="btn secondary sm" id="settingsBtn" aria-label="Settings">${ico('settings')}<span class="hide-sm">Settings</span></button></header>
      <div id="netBanner"></div>
      <main class="content" id="content" tabindex="-1"></main>
    </div>
  </div>`;
  $('#menuBtn').onclick = () => $('#app').classList.add('nav-open');
  $('#scrim').onclick = () => $('#app').classList.remove('nav-open');
  $('#settingsBtn').onclick = () => openSettings(() => route());
  $('#viewerBox').onchange = e => {
    if (e.target.id !== 'viewerSel') return;
    update(st => { st.viewer = e.target.value; });
    const u = viewer(); toast(`Now viewing as ${u.name}, ${roleLabel(u)}`, 'user');
    const key = location.hash.replace(/^#\/?/, '').split('/')[0] || 'overview';
    if (!canSee(u, key)) location.hash = '#/' + (['checkout', 'family', 'kitchen', 'district', 'org'].find(k => canSee(u, k)) || 'overview'); else route();
  };
}

const VIEWERS = [['District', ['u1']], ['School', ['u2']], ['Canteen', ['u3', 'u4', 'u5', 'u6', 'u7']], ['Family', ['u8']]];
function paintChrome() {
  const u = viewer(), users = state.data.users;
  $$('.nav a').forEach(a => { a.hidden = !canSee(u, a.dataset.route); });
  $$('.nav-group').forEach(g => { g.hidden = ![...g.querySelectorAll('a')].some(a => !a.hidden); });
  $('#viewerBox').innerHTML = `<label class="viewer"><span>${ico('user')}Viewing as</span><select id="viewerSel" aria-label="Viewing as">${VIEWERS.map(([g, ids]) => `<optgroup label="${g}">${ids.map(id => users.find(x => x.id === id)).filter(Boolean).map(x => `<option value="${x.id}" ${x.id === u.id ? 'selected' : ''}>${esc(x.name)}, ${esc(roleLabel(x))}</option>`).join('')}</optgroup>`).join('')}${VIEWERS.flatMap(v => v[1]).includes(u.id) ? '' : `<option value="${u.id}" selected>${esc(u.name)}</option>`}</select></label>`;
  paintNet();
}

// ---------- offline ----------
function paintNet() {
  const off = state.data.offline;
  $('#netBox').innerHTML = `<button class="net ${off ? 'off' : 'on'}" id="netBtn" title="${off ? 'Reconnect and settle' : 'Simulate losing the connection'}"><i></i>${off ? `Offline${off.sales.length ? ` · ${off.sales.length} to settle` : ''}` : 'Online'}</button>`;
  $('#netBanner').innerHTML = off ? `<div class="net-banner off">${ico('clock')}<div><b>Counter offline since ${off.since}.</b> Lunch keeps going: sales are saved on this terminal${off.sales.length ? ` (${off.sales.length}, ${money(off.sales.reduce((a, x) => a + x.total, 0))})` : ''} against balances saved at the start of service, and settle when the connection is back. Parent QR and photo recognition pause.</div>
    <div class="row wrap" style="gap:8px">${off.sales.length ? '<button class="btn secondary sm" id="spendElse">Meanwhile, the wallet pays a $40 trip fee</button>' : ''}${off.reason === 'network' ? '<span class="small">Waiting for the network…</span>' : `<button class="btn primary sm" id="reconnect">${ico('refresh')}Reconnect and settle</button>`}</div></div>` : '';
}
function settlementReport(r) {
  modal('Back online: sales settled', `<div class="stack" style="gap:12px">
    <div class="grid cols-3"><div class="mini"><span>Sales settled</span><b>${r.settled.length}</b></div><div class="mini"><span>Amount</span><b>${money(r.total)}</b></div><div class="mini"><span>Duplicates skipped</span><b>${r.skipped.length}</b></div></div>
    ${r.topups.length ? `<p class="small" style="margin:0">${ico('wallet')} The wallet ran short during settlement; <b>auto top-up added ${money(r.topups.reduce((a, t) => a + t.amount, 0))}</b>, so every lunch is paid.</p>` : ''}
    ${r.owed.length ? `<p class="small" style="margin:0;color:var(--danger)">${ico('alert')} ${r.owed.map(o => `${esc(o.studentName)}’s lunch left the wallet ${money(o.amount)} short`).join('; ')}. The parent has been notified; the child is never turned away.</p>` : ''}
    <p class="small muted" style="margin:0">Each sale settles once, in the order it happened. The terminal’s end-of-service report now matches the wallets.</p>
    <button class="btn primary" data-close>Done</button></div>`, { width: 520 });
}
function wireNet() {
  document.addEventListener('click', e => {
    const id = e.target.closest('button')?.id;
    if ((id === 'netBtn' || id === 'reconnect') && isOffline() && navigator.onLine === false) return toast('Still no network. Sales stay safe on this terminal.', 'clock');
    if (id === 'netBtn' || id === 'reconnect') {
      if (isOffline()) { const r = goOnline(); if (r) { settlementReport(r); if (r.topups.length || r.owed.length) toast('Settlement finished', 'wallet'); } }
      else { goOffline('manual'); toast('Counter offline. Checkout keeps working; sales settle when you reconnect.', 'clock'); }
    }
    if (id === 'spendElse') { spendElsewhere(40); toast('Lin paid a $40 field-trip fee from the wallet', 'wallet'); }
  });
  window.addEventListener('offline', () => { goOffline('network'); toast('Connection lost. Checkout keeps working offline.', 'clock'); });
  window.addEventListener('online', () => { const r = goOnline(); if (r) settlementReport(r); });
  if (navigator.onLine === false) goOffline('network');
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('./sw.js').catch(() => {});
}

let current = null;
function route() {
  const key = (location.hash.replace(/^#\/?/, '').split('/')[0]) || 'overview';
  paintChrome();
  const r = ROUTES[key] || ROUTES.overview; current = ROUTES[key] ? key : 'overview';
  $$('.nav a').forEach(a => a.setAttribute('aria-current', a.dataset.route === current ? 'page' : 'false'));
  $('#pageTitle').textContent = r.title; document.title = `${r.title} | Smart Canteen`;
  const c = $('#content'); c.onclick = null; c.onchange = null; c.onsubmit = null;
  const u = viewer();
  if (canSee(u, current)) r.render(c);
  else c.innerHTML = `<div class="card" style="max-width:640px"><div class="card-b"><div class="row"><div class="icon-tile" style="background:var(--danger-soft);color:var(--danger)">${ico('lock')}</div><b>${esc(r.title)} isn’t available to ${esc(roleLabel(u))}</b></div><p class="small muted">${esc(u.name)} can open ${Object.keys(ROUTES).filter(k => canSee(u, k)).map(k => `<a href="#/${k}">${ROUTES[k].title}</a>`).join(', ')}. Switch “Viewing as” at the top to see another role.</p></div></div>`;
  $('#app').classList.remove('nav-open'); window.scrollTo(0, 0);
}

// boot
loadState(defaults());
shell();
wireNet();
window.addEventListener('hashchange', route);
onChange(() => { paintNet(); if (current === 'family') paintFamily(); if (current === 'checkout') repaintCheckout(); if (current === 'org') repaintOrg(); });
route();
