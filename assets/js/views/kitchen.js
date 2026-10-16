// Kitchen console: confirmed orders, pull list, forecast, menu planner, safety checklist.
import { money, int, esc, rng, timeNow } from '../lib/format.js';
import { $, $$, ico, toast } from '../lib/ui.js';
import { update, activity, weekDate, fmtDate, state } from '../state.js';
import { D, ALLERGENS, DAYS, CHECKS } from '../domain/data.js';
import { forecast, HIST } from '../domain/forecast.js';
import { planWeek } from '../domain/menu.js';

const S = () => state.data;
export const kpi = (label, value, delta, icon, tone = 'up') => `<div class="card kpi"><div class="label">${ico(icon)}${label}</div><div class="value">${value}</div>${delta ? `<div class="delta ${tone}">${delta}</div>` : ''}</div>`;

const KSCHOOLS = [{ n: 'Maple Street Elementary', stu: 430 }, { n: 'Harbor View Middle', stu: 510 }, { n: 'Cedar Park Elementary', stu: 300 }];
let ev = { trip: false, rain: false, exam: false }, plan = null, cap = 2.60, excl = new Set();

function mondayOrders() {
  const r = rng(77); const rows = KSCHOOLS.map(s => ({ ...s, st: Math.round(s.stu * (.78 + r() * .06)), li: Math.round(s.stu * (.08 + r() * .03)), ha: Math.round(s.stu * (.05 + r() * .02)) }));
  const s = S(); if (s.order && !s.away[0]) rows[0][s.choice[0] === 'standard' ? 'st' : s.choice[0] === 'light' ? 'li' : 'ha'] += 1;
  return rows;
}

export function renderKitchen(root) {
  const rows = mondayOrders(); const T = rows.reduce((a, r) => ({ st: a.st + r.st, li: a.li + r.li, ha: a.ha + r.ha }), { st: 0, li: 0, ha: 0 }); const total = T.st + T.li + T.ha;
  const fc = forecast(4, ev); const done = CHECKS.filter(c => S().checks[c[0]]).length;
  const m = S().menu[0];
  const bomRows = [[m.ids[0], T.st, 140], [m.light, T.li, 130], [m.halal, T.ha, 140], [m.ids[1], total, 90], [m.ids[2], total, 150], [m.ids[3], total, null]];
  const agg = {}; bomRows.forEach(([id, n, g]) => { agg[id] = agg[id] || { n: 0, g }; agg[id].n += n; });
  root.innerHTML = `
  <div class="h-page"><div><h2>Kitchen</h2><p>Northside Catering, serving three schools. Pre-orders become a production plan; the forecast covers days parents haven't confirmed yet.</p></div></div>
  <div class="grid cols-4">
    ${kpi('Lunches Monday', int(total), 'Confirmed pre-orders', 'utensils')}
    ${kpi('Friday forecast, Maple St.', int(fc.f), `Prep ${fc.prep}, back-tested error ${fc.mape.toFixed(1)}%`, 'trend')}
    ${kpi('Safety checklist', `${done} of ${CHECKS.length}`, done === CHECKS.length ? 'All logged' : 'Due by 10:30 AM', 'shield', done === CHECKS.length ? 'up' : 'down')}
    ${kpi('Food waste, last 4 weeks', '6.1%', 'down from 14.8% before pre-ordering', 'leaf')}
  </div>
  <div class="grid split" style="margin-top:16px">
    <div class="card"><div class="card-h"><h2>Monday's orders</h2><span class="sub">${fmtDate(weekDate(0))}, cut-off passed</span></div><div class="card-b"><div class="t-wrap"><table class="t"><thead><tr><th>School</th><th class="r">Standard</th><th class="r">Light</th><th class="r">Halal</th><th class="r">Total</th></tr></thead><tbody>
      ${rows.map(r => `<tr><td>${r.n}</td><td class="r">${r.st}</td><td class="r">${r.li}</td><td class="r">${r.ha}</td><td class="r strong">${r.st + r.li + r.ha}</td></tr>`).join('')}
      <tr><td class="strong">All schools</td><td class="r">${T.st}</td><td class="r">${T.li}</td><td class="r">${T.ha}</td><td class="r strong">${total}</td></tr></tbody></table></div></div></div>
    <div class="card"><div class="card-h"><h2>Pull list</h2><span class="sub">Raw weight incl. 15% trim</span></div><div class="card-b"><div class="list">
      ${Object.entries(agg).map(([id, a]) => `<div class="list-item"><div style="flex:1"><div class="strong small">${esc(D[id].name)}</div><div class="tiny muted">${int(a.n)} portions</div></div><span class="strong small num">${a.g ? int(a.n * a.g / 1000 * 1.15) + ' kg' : int(a.n) + ' units'}</span></div>`).join('')}</div></div></div>
  </div>
  <div class="card" style="margin-top:16px"><div class="card-h"><h2>Friday headcount forecast</h2><span class="sub">Maple Street Elementary. Pre-orders close Wednesday night.</span></div><div class="card-b">
    <div class="row wrap" id="evs">${[['trip', 'Grade 4 field trip (65 students)'], ['rain', 'Heavy rain'], ['exam', 'Exam day']].map(([k, l]) => `<label class="chip-check" style="--x:0"><input type="checkbox" data-ev="${k}" ${ev[k] ? 'checked' : ''}>${l}</label>`).join('')}</div>
    ${fcChart(fc)}
    <div class="row wrap" style="gap:28px;margin-top:6px"><div><div class="small muted">Expected</div><div style="font-size:30px;font-weight:800" class="num">${int(fc.f)}</div></div><div><div class="small muted">80% range</div><div style="font-size:22px;font-weight:800" class="num">${int(fc.lo)}–${int(fc.hi)}</div></div><div><div class="small muted">Prep</div><div style="font-size:30px;font-weight:800;color:var(--brand)" class="num">${fc.prep}</div></div>
    <p class="small muted" style="flex-basis:100%;margin:0">Based on ${fc.notes.join(', ')}. Prep is set half a standard deviation above the forecast so no student goes without.</p></div>
  </div></div>
  <div class="grid split" style="margin-top:16px">
    <div class="card"><div class="card-h"><h2>Menu planner</h2><span class="sub">Next week, from the dish library</span></div><div class="card-b">
      <div class="row wrap" style="gap:18px;align-items:flex-end;margin-bottom:12px">
        <label class="field" style="min-width:220px">Ingredient cost cap per meal: ${money(cap)}<input type="range" id="cap" min="1.70" max="3.20" step="0.05" value="${cap}" style="accent-color:var(--brand)"></label>
        <div class="field">Exclude allergens<div class="row wrap" style="gap:6px">${ALLERGENS.map(a => `<label class="chip-check"><input type="checkbox" data-al="${a}" ${excl.has(a) ? 'checked' : ''}>${a}</label>`).join('')}</div></div>
        <button class="btn primary" id="planBtn">${ico('sparkles')}Plan the week</button>
      </div>
      <div id="planOut">${planHTML()}</div>
    </div></div>
    <div class="card"><div class="card-h"><h2>Today's safety checklist</h2><span class="badge ${done === CHECKS.length ? 'green' : 'amber'}">${done}/${CHECKS.length}</span></div><div class="card-b">
      ${CHECKS.map(([k, t, d]) => `<label class="check-row"><input type="checkbox" data-check="${k}" ${S().checks[k] ? 'checked' : ''}><span><span class="strong small">${t}</span><span class="tiny muted" style="display:block">${S().checks[k] ? 'Logged at ' + S().checks[k] : d}</span></span></label>`).join('')}
      <p class="tiny muted" style="margin:10px 0 0">Results go straight to the district dashboard.</p></div></div>
  </div>`;
  $('#evs').addEventListener('change', e => { const k = e.target.dataset.ev; if (k) { ev[k] = e.target.checked; renderKitchen(root); } });
  $('#cap').addEventListener('input', e => { cap = +e.target.value; e.target.closest('label').firstChild.textContent = `Ingredient cost cap per meal: ${money(cap)}`; });
  $$('[data-al]', root).forEach(c => c.addEventListener('change', () => { c.checked ? excl.add(c.dataset.al) : excl.delete(c.dataset.al); }));
  $('#planBtn').addEventListener('click', () => { plan = planWeek(cap, [...excl]); $('#planOut').innerHTML = planHTML(); });
  $('#planOut').addEventListener('click', e => { if (e.target.closest('#publish') && plan && !plan.error) { update(s => { s.menu = plan.week.map(w => ({ ids: w.ids, light: w.light, halal: w.halal })); }); activity('utensils', 'blue', `<b>Menu published</b>: parents now see next week's new menu.`); toast('Published. Parents see the new menu.'); renderKitchen(root); } });
  root.onchange = e => { const k = e.target.dataset.check; if (!k) return; update(s => { s.checks[k] = e.target.checked ? timeNow() : null; }); renderKitchen(root); };
}
function planHTML() {
  if (!plan) return `<div class="empty small">Set a cost cap, choose allergens to avoid, and press Plan the week.</div>`;
  if (plan.error) return `<div class="row" style="align-items:flex-start"><span style="color:var(--danger)">${ico('alert')}</span><span class="small">${esc(plan.error)}</span></div>`;
  const wk = plan.week, avg = k => wk.reduce((a, w) => a + w.st[k], 0) / 5;
  return `<div class="t-wrap"><table class="t"><thead><tr><th>Day</th><th>Main</th><th>Vegetable</th><th>Staple</th><th>Extra</th><th class="r">kcal</th><th class="r">Protein</th><th class="r">Cost</th></tr></thead><tbody>${wk.map((w, i) => `<tr><td class="strong">${DAYS[i]}</td>${w.ids.map(id => `<td>${esc(D[id].name)}</td>`).join('')}<td class="r">${w.st.kcal}</td><td class="r">${w.st.p} g</td><td class="r">${money(w.st.cost)}</td></tr>`).join('')}</tbody></table></div>
   <div class="row wrap between" style="margin-top:12px"><span class="small muted">Average ${int(avg('kcal'))} kcal, ${avg('p').toFixed(0)} g protein, ${money(avg('cost'))} per meal. Checked ${int(plan.searched)} combinations.${plan.repeats ? ' Some mains repeat because few are left after the allergen filter.' : ''}</span><button class="btn secondary sm" id="publish">${ico('upload')}Publish to parents</button></div>`;
}
function fcChart(fc) {
  const W = 900, H = 220, pl = 40, pr = 16, pt = 12, pb = 26; const vals = HIST.map(h => h.v).concat([fc.lo, fc.hi]);
  const min = Math.floor((Math.min(...vals) - 8) / 10) * 10, max = Math.ceil((Math.max(...vals) + 8) / 10) * 10; const n = HIST.length + 1;
  const x = i => pl + i * (W - pl - pr) / (n - 1), y = v => pt + (max - v) * (H - pt - pb) / (max - min);
  let g = ''; for (let v = min; v <= max; v += 10) g += `<line x1="${pl}" x2="${W - pr}" y1="${y(v)}" y2="${y(v)}" stroke="var(--border)"/><text x="${pl - 8}" y="${y(v) + 4}" text-anchor="end" font-size="11" fill="var(--muted)">${v}</text>`;
  const path = HIST.map((h, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(h.v).toFixed(1)}`).join(''); const xi = x(n - 1);
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Lunches served over the last 30 school days and Friday forecast">${g}
    <path d="${path}" fill="none" stroke="var(--ink-2)" stroke-width="2"/>${HIST.map((h, i) => h.wd === 4 ? `<circle cx="${x(i)}" cy="${y(h.v)}" r="3.5" fill="var(--ink)"/>` : '').join('')}
    <line x1="${x(n - 2)}" y1="${y(HIST[n - 2].v)}" x2="${xi}" y2="${y(fc.f)}" stroke="var(--brand)" stroke-width="2" stroke-dasharray="5 4"/>
    <rect x="${xi - 9}" y="${y(fc.hi)}" width="18" height="${y(fc.lo) - y(fc.hi)}" rx="6" fill="var(--brand-soft)"/><circle cx="${xi}" cy="${y(fc.f)}" r="6" fill="var(--brand)"/>
    <text x="${pl}" y="${H - 6}" font-size="11" fill="var(--muted)">30 school days ago</text><text x="${xi}" y="${H - 6}" font-size="11" text-anchor="end" fill="var(--brand-ink)" font-weight="700">Friday</text></svg>`;
}

