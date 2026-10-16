// Working capital: credit sized from a school contract, repaid from meal fees.
import { money, int } from '../lib/format.js';
import { $ } from '../lib/ui.js';
import { state } from '../state.js';
import { creditLimit } from '../domain/risk.js';
const S = () => state.data;


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
