// District dashboard for the regulator: risk-ranked kitchens, escrow, traceable procurement.
import { money, int, esc, rng } from '../lib/format.js';
import { $, toast } from '../lib/ui.js';
import { update, state, fmtDate, daysAgo } from '../state.js';
import { CHECKS, SCHOOLS, SCHOOL_STUDENTS, ALERTS } from '../domain/data.js';
import { riskOf } from '../domain/risk.js';
import { kpi } from './kitchen.js';
const S = () => state.data;

const SCH = (() => { const r = rng(9); return SCHOOLS.map((n, i) => { const stu = SCHOOL_STUDENTS[i]; const meals = Math.round(stu * (.82 + r() * .12)); const collected = meals * 4.5 * 21; return { n, stu, meals, check: Math.round(84 + r() * 16), waste: +(3 + r() * 12).toFixed(1), collected, released: collected * (.55 + r() * .1) }; }); })();
export function renderDistrict(root) {
  const s = S(); SCH[0].check = Math.round(CHECKS.filter(c => s.checks[c[0]]).length / CHECKS.length * 100);
  const open = ALERTS.filter(a => !s.inspected[a.id]); const meals = SCH.reduce((a, x) => a + x.meals, 0) + (s.todayMeal ? 1 : 0);
  const chk = SCH.reduce((a, x) => a + x.check, 0) / SCH.length; const col = SCH.reduce((a, x) => a + x.collected, 0) + s.wallet.escrow, rel = SCH.reduce((a, x) => a + x.released, 0);
  const sorted = [...ALERTS].sort((a, b) => (!!s.inspected[a.id]) - (!!s.inspected[b.id]) || riskOf(b) - riskOf(a));
  const r = rng(5); const items = [['Chicken thigh, 120 kg', 'Hilltop Poultry'], ['Broccoli, 80 kg', 'Greenfield Farms'], ['Brown rice, 300 kg', 'Valley Grain Co.'], ['Cod fillet, 60 kg', 'Bayline Seafood'], ['Apples, 90 kg', 'Sunrise Produce'], ['Tofu, 70 kg', 'Greenfield Farms']];
  root.innerHTML = `
  <div class="h-page"><div><h2>District dashboard</h2><p>Riverside District education bureau. Twelve school kitchens on one screen: camera events, checklists, money and purchases are reported automatically.</p></div></div>
  <div class="grid cols-4">${kpi('School kitchens', SCH.length, 'All reporting', 'chef')}${kpi('Lunches today', int(meals), '+2.1% vs. last week', 'utensils')}${kpi('Checklists complete', chk.toFixed(0) + '%', chk >= 95 ? 'On target' : 'Target 98%', 'shield', chk >= 95 ? 'up' : 'down')}${kpi('Open camera alerts', open.length, open.length ? `${open.filter(a => riskOf(a) >= 10).length} high risk` : 'None open', 'alert', open.length ? 'down' : 'up')}</div>
  <div class="grid split" style="margin-top:16px">
    <div class="card"><div class="card-h"><h2>Where to inspect first</h2><span class="sub">Detections simulated, ranking real</span></div><div class="card-b">
      <p class="tiny muted" style="margin-top:0">Risk = severity × (1 + 0.5 × repeats this month) × (1 + days since last inspection ÷ 30)</p>
      ${sorted.map(a => { const rk = riskOf(a), done = s.inspected[a.id]; return `<div class="alert-row ${done ? 'done' : ''}"><div class="risk" style="background:${rk >= 10 ? 'var(--danger)' : rk >= 5 ? 'var(--carbs)' : 'var(--faint)'}">${rk.toFixed(0)}</div><div style="min-width:0"><div class="strong small">${esc(a.type)}</div><div class="tiny muted">${a.k}, today ${a.time}. Severity ${a.sev}, ${a.rep} repeat${a.rep === 1 ? '' : 's'}, last inspected ${a.days} days ago.</div></div>${done ? '<span class="badge green">Inspected</span>' : `<button class="btn secondary sm" data-insp="${a.id}">Mark inspected</button>`}</div>`; }).join('')}
    </div></div>
    <div class="card"><div class="card-h"><h2>Meal fees in escrow</h2><span class="sub">This month</span></div><div class="card-b">
      <div class="list"><div class="list-item"><span class="small" style="flex:1">Collected from parents</span><b class="num">${money(col)}</b></div><div class="list-item"><span class="small" style="flex:1">Released for served lunches</span><b class="num">${money(rel)}</b></div><div class="list-item"><span class="small" style="flex:1">Held by the custodian bank</span><b class="num">${money(col - rel)}</b></div></div>
      <div class="macro-bar" style="margin-top:12px"><i style="width:${rel / col * 100}%;background:var(--brand)"></i><i style="width:${(col - rel) / col * 100}%;background:var(--carbs)"></i></div>
      <p class="tiny muted" style="margin:10px 0 0">Refunds for absences come out of escrow, never from the caterer.</p></div></div>
  </div>
  <div class="card" style="margin-top:16px"><div class="card-h"><h2>Kitchens</h2></div><div class="card-b"><div class="t-wrap"><table class="t"><thead><tr><th>Kitchen</th><th class="r">Students</th><th class="r">Lunches today</th><th class="r">Checklist</th><th class="r">Food waste</th><th>Status</th></tr></thead><tbody>
    ${SCH.map(x => { const a = ALERTS.find(y => y.k === x.n && !s.inspected[y.id]); const st = a && riskOf(a) >= 10 ? ['red', 'Inspect today'] : a ? ['amber', 'Watch'] : x.check < 90 ? ['amber', 'Checklist late'] : ['green', 'On track']; return `<tr><td class="strong">${x.n}</td><td class="r">${int(x.stu)}</td><td class="r">${int(x.meals)}</td><td class="r">${x.check}%</td><td class="r">${x.waste}%</td><td><span class="badge ${st[0]}"><span class="dot"></span>${st[1]}</span></td></tr>`; }).join('')}</tbody></table></div></div></div>
  <div class="card" style="margin-top:16px"><div class="card-h"><h2>Recent purchases</h2><span class="sub">Every supplier payment goes through the bank, with the batch certificate attached</span></div><div class="card-b"><div class="t-wrap"><table class="t"><thead><tr><th>Date</th><th>Item</th><th>Supplier</th><th>Certificate</th><th>Bank reference</th><th class="r">Amount</th></tr></thead><tbody>
    ${items.map((it, i) => `<tr><td>${fmtDate(daysAgo(i))}</td><td>${it[0]}</td><td>${it[1]}</td><td><span class="badge green">On file</span></td><td class="num">TRX-${48210 + Math.floor(r() * 9000)}</td><td class="r">${money(200 + r() * 900)}</td></tr>`).join('')}</tbody></table></div></div></div>`;
  root.onclick = e => { const b = e.target.closest('[data-insp]'); if (!b) return; update(st => { st.inspected[b.dataset.insp] = true; }); toast('Inspection logged'); renderDistrict(root); };
}

