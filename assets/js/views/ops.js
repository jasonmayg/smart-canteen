// Operator consoles: Kitchen, District (regulator), Caterer finance.
import { $, $$, money, int, esc, ico, update, state, toast, activity, rng, timeNow } from '../core.js';
import { D, ALLERGENS, DAYS, CHECKS, SCHOOLS, SCHOOL_STUDENTS, ALERTS } from '../data.js';
import { planWeek, forecast, HIST, riskOf, creditLimit } from '../algo.js';
import { weekDate, fmtDate, daysAgo } from '../store.js';

const S = () => state.data;
const kpi = (label, value, delta, icon, tone = 'up') => `<div class="card kpi"><div class="label">${ico(icon)}${label}</div><div class="value">${value}</div>${delta ? `<div class="delta ${tone}">${delta}</div>` : ''}</div>`;

// ================= KITCHEN =================
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

// ================= DISTRICT =================
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

// ================= FINANCE =================
let fin = { students: 1240, price: 4.50, days: 21, deposit: 15000, split: 20 };
export function renderFinance(root) {
  const c = creditLimit(fin); const daily = fin.students * .85 * fin.price, pay = daily * fin.split / 100;
  let bal = c.limit; const pts = [bal]; while (bal > 0 && pts.length < 220) { bal = Math.max(0, bal - pay); pts.push(bal); }
  const W = 900, H = 200, pl = 56, pr = 14, pt = 12, pb = 24, mx = c.limit || 1, x = i => pl + i * (W - pl - pr) / Math.max(1, pts.length - 1), y = v => pt + (mx - v) * (H - pt - pb) / mx;
  root.innerHTML = `
  <div class="h-page"><div><h2>Working capital</h2><p>Suppliers want cash; schools pay 45 to 60 days later. Caterers borrow against their school contract and repay automatically from meal fees as they clear.</p></div></div>
  <div class="grid split">
    <div class="card"><div class="card-h"><h2>Northside Catering</h2><span class="sub">Contract with Riverside District</span></div><div class="card-b">
      <div class="grid cols-3" id="finForm">
        ${[['students', 'Students on contract', 10], ['price', 'Price per lunch ($)', .1], ['days', 'School days per month', 1], ['deposit', 'Deposit paid ($)', 500], ['split', 'Share of each settlement that repays (%)', 1]].map(([k, l, st]) => `<label class="field">${l}<input class="input num" type="number" step="${st}" data-f="${k}" value="${fin[k]}"></label>`).join('')}
      </div>
      <div class="grid cols-2" style="margin-top:16px">
        <div class="card kpi" style="box-shadow:none"><div class="label">Monthly meal-fee volume</div><div class="value">${money(c.monthly)}</div></div>
        <div class="card kpi" style="box-shadow:none;background:var(--brand-softer);border-color:transparent"><div class="label">Credit limit</div><div class="value" style="color:var(--brand-ink)">${money(c.limit)}</div></div>
      </div>
      <p class="small muted" style="margin:12px 0 0">The smaller of 80% of 1.5 months' contract value (${money(c.byContract)}) and five times the deposit (${money(c.byDeposit)}). Assumes 85% of students buy lunch.</p>
    </div></div>
    <div class="card"><div class="card-h"><h2>How it works</h2></div><div class="card-b"><ol class="small" style="padding-left:18px;margin:0;display:grid;gap:8px">
      <li>A bank gives the platform's trading company a credit line.</li><li>The caterer uploads its school contract and pays a deposit.</li><li>The platform sizes a limit from the contract and deposit.</li><li>The trading company buys ingredients in bulk, paying suppliers cash for better prices.</li><li>Ingredients reach the kitchen in weekly batches.</li><li>As meal fees clear, a fixed share is split off automatically to repay.</li></ol></div></div>
  </div>
  <div class="card" style="margin-top:16px"><div class="card-h"><h2>Repayment from meal fees</h2></div><div class="card-b">
    <svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Outstanding balance by school day">${[0, .5, 1].map(f => `<line x1="${pl}" x2="${W - pr}" y1="${y(mx * f)}" y2="${y(mx * f)}" stroke="var(--border)"/><text x="${pl - 8}" y="${y(mx * f) + 4}" text-anchor="end" font-size="11" fill="var(--muted)">${f ? '$' + int(mx * f / 1000) + 'k' : '$0'}</text>`).join('')}
      <path d="M${pl},${y(0)} ${pts.map((v, i) => `L${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')} L${x(pts.length - 1)},${y(0)}Z" fill="var(--brand-soft)"/><path d="${pts.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join('')}" fill="none" stroke="var(--brand)" stroke-width="2.5"/>
      <text x="${pl}" y="${H - 4}" font-size="11" fill="var(--muted)">Day 0</text><text x="${W - pr}" y="${H - 4}" font-size="11" text-anchor="end" fill="var(--muted)">School day ${pts.length - 1}</text></svg>
    <p class="small muted" style="margin:8px 0 0">${c.limit ? `About ${money(daily)} in meal fees clears each school day; ${fin.split}% (${money(pay)}) repays the loan automatically. Paid off in ${pts.length - 1} school days, about ${Math.ceil((pts.length - 1) / fin.days)} months, with no collection calls.` : 'Enter a deposit to see a credit limit.'}</p></div></div>`;
  $('#finForm').addEventListener('change', e => { const k = e.target.dataset.f; if (!k) return; fin[k] = Math.max(0, +e.target.value || 0); renderFinance(root); });
}
