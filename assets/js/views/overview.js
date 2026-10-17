// Landing page.
import { $, ico } from '../lib/ui.js';
import { state } from '../state.js';
import { SAMPLE_TRAYS, CHILD } from '../domain/data.js';
import { drawTray } from '../render/tray.js';
export function renderOverview(root) {
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
  <p class="demo-note">These are the product targets from the PRD, not measured results. Try <a href="#/checkout">Canteen checkout</a>: scan “Leo, today”, fix the rice the camera misread, pay by card. Click <b>Online</b> at the top to go offline and keep selling, then reconnect to settle. Use <b>Viewing as</b> to switch between the district, the principal, a cashier, a cook and a parent.</p>`;
  const c = $('#ovTray'); requestAnimationFrame(() => drawTray(c, SAMPLE_TRAYS[0].slots, [], 11));
}

