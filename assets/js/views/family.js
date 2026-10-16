// Family app: a parent's phone. Home, Menu (pre-order + pay), Nutrition, Wallet (top-up, history, controls).
import { $, $$, money, int, esc, ico, ring, update, state, toast, activity, timeNow } from '../core.js';
import { D, DAYS, SET_PRICE, TARGET, CHILD, PARENT } from '../data.js';
import { mealStats, insights } from '../algo.js';
import { weekDate, fmtDate } from '../store.js';
import { drawThumb } from '../tray.js';

let tab = 'home', day = 0, sheet = null; // sheet: {type, step, ...}

const S = () => state.data;
const dayDishes = i => { const m = S().menu[i]; const c = S().choice[i]; const main = c === 'light' ? m.light : c === 'halal' ? m.halal : m.ids[0]; return [main, m.ids[1], m.ids[2], m.ids[3]]; };
const orderTotal = () => DAYS.reduce((a, _, i) => a + (S().away[i] ? 0 : SET_PRICE[S().choice[i]]), 0);
const lunches = () => DAYS.filter((_, i) => !S().away[i]).length;
const greeting = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'; };
const cap = s => s[0].toUpperCase() + s.slice(1);

export function renderFamily(root) {
  root.innerHTML = `
  <div class="h-page"><div><h2>Family app</h2><p>What a parent sees on their phone. Pre-order next week, pay, see what their child actually ate, and set spending rules the checkout enforces.</p></div></div>
  <div class="family-layout">
    <div class="phone" aria-label="Parent phone app"><div class="phone-screen" id="ph">
      <div class="status-bar"><span>${new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }).replace(/ [AP]M/, '')}</span><span class="notch"></span><span>5G ▮</span></div>
      <div class="app-scroll" id="phScroll"></div>
      <nav class="tabbar" id="phTabs" aria-label="App sections">
        ${[['home', 'home', 'Home'], ['menu', 'utensils', 'Menu'], ['nutrition', 'chart', 'Nutrition'], ['wallet', 'wallet', 'Wallet']].map(([k, i, l]) => `<button data-tab="${k}">${ico(i)}${l}</button>`).join('')}
      </nav>
      <div id="phSheet"></div>
    </div></div>
    <div class="stack">
      <div class="card"><div class="card-h"><h3>Live activity</h3><span class="sub">Every tap in the app, and every checkout, shows up here</span></div><div class="card-b"><div class="activity" id="feed"></div></div></div>
      <div class="card"><div class="card-b small muted">Try this: order next week's lunches and pay from the wallet. Then open <a href="#/checkout">Canteen checkout</a>, scan Mia's tray and pay with her face. Her lunch, calories and the charge appear back here.</div></div>
    </div>
  </div>`;
  $('#phTabs').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; tab = b.dataset.tab; sheet = null; paint(); $('#phScroll').scrollTop = 0; });
  $('#phScroll').addEventListener('click', onClick); $('#phScroll').addEventListener('change', onChange);
  $('#phSheet').addEventListener('click', onSheetClick);
  paint();
}

export function paint() {
  if (!$('#phScroll')) return;
  $$('#phTabs button').forEach(b => b.setAttribute('aria-current', b.dataset.tab === tab ? 'page' : 'false'));
  $('#phScroll').innerHTML = ({ home, menu, nutrition, wallet })[tab]();
  $$('#phScroll canvas[data-thumb]').forEach(c => drawThumb(c, c.dataset.thumb, +c.dataset.size || 52));
  $('#phSheet').innerHTML = sheet ? sheetHTML() : '';
  $$('#phSheet canvas[data-thumb]').forEach(c => drawThumb(c, c.dataset.thumb, +c.dataset.size || 40));
  const f = $('#feed'); if (f) f.innerHTML = S().activity.length ? S().activity.map(a => `<div class="ev"><div class="icon-tile" style="background:${a.tone === 'red' ? 'var(--danger-soft)' : a.tone === 'blue' ? 'var(--info-soft)' : 'var(--brand-soft)'};color:${a.tone === 'red' ? 'var(--danger)' : a.tone === 'blue' ? 'var(--info)' : 'var(--brand)'}">${ico(a.icon)}</div><div><div class="small">${a.html}</div><time>${a.t}</time></div></div>`).join('') : '<p class="muted small" style="margin:0">Nothing yet. Place an order or top up the wallet.</p>';
}

// ---------- screens ----------
function home() {
  const s = S(), tm = s.todayMeal;
  const nextLabel = `${fmtDate(weekDate(0))}–${fmtDate(weekDate(4))}`;
  return `
  <div class="row between" style="margin-top:4px"><div><div class="small muted strong">${greeting()}, ${PARENT.name}</div><div class="m-h1">${CHILD.name}'s lunches</div></div><div class="avatar" style="background:var(--brand-soft);color:var(--brand-ink)">${CHILD.initials}</div></div>
  <div class="m-card balance m-section">
    <div class="small" style="opacity:.85;font-weight:600">${CHILD.name}'s wallet</div>
    <div class="amt">${money(s.wallet.balance)}</div>
    <div class="small" style="opacity:.85">${s.wallet.escrow > 0 ? `${money(s.wallet.escrow)} held in escrow for next week` : 'Nothing held for upcoming lunches'}</div>
    <div class="row" style="margin-top:12px"><button class="btn secondary sm" data-act="topup">${ico('plus')}Top up</button><button class="btn secondary sm" data-act="goto-wallet">${ico('lock')}Spending rules</button></div>
  </div>
  <div class="m-title">Today</div>
  ${tm ? `<div class="m-card"><div class="row between"><div><div class="strong">Lunch at ${tm.time}</div><div class="small muted">${CHILD.school}</div></div><span class="badge green"><span class="dot"></span>${money(tm.price)}</span></div>
     <div class="row" style="gap:6px;margin:12px 0;flex-wrap:wrap">${tm.items.filter(i => D[i]).map(i => `<canvas data-thumb="${i}" data-size="44" width="44" height="44" style="width:44px;height:44px;border-radius:12px" title="${esc(D[i].name)}"></canvas>`).join('')}</div>
     <div class="small">${tm.items.map(i => D[i] ? D[i].name : i).join(', ')}</div>
     <div class="rings" style="margin-top:12px">${ring([{ v: tm.kcal, max: TARGET.kcal, color: 'var(--energy)' }, { v: tm.p, max: TARGET.p, color: 'var(--protein)' }], 76, 8)}<div class="ring-legend"><span><i style="background:var(--energy)"></i>${int(tm.kcal)} of ${TARGET.kcal} kcal</span><span><i style="background:var(--protein)"></i>${tm.p} of ${TARGET.p} g protein</span><span class="muted tiny">Recognized from a photo of her tray</span></div></div></div>`
      : `<div class="m-card"><div class="row"><div class="icon-tile" style="background:var(--surface-2);color:var(--muted)">${ico('clock')}</div><div class="small">${CHILD.name} hasn't had lunch yet today. You'll get a notification with what she ate when she checks out.</div></div></div>`}
  <div class="m-title">Next week</div>
  ${s.order ? `<div class="m-card"><div class="row"><div class="icon-tile" style="background:var(--brand-soft);color:var(--brand)">${ico('check')}</div><div><div class="strong">${lunches()} lunches ordered</div><div class="small muted">${nextLabel}, ${money(orderTotal())} in escrow</div></div><button class="btn ghost sm" data-act="goto-menu" style="margin-left:auto">Edit</button></div></div>`
    : `<button class="m-card" data-act="goto-menu" style="width:100%;text-align:left;cursor:pointer"><div class="row"><div class="icon-tile" style="background:var(--warn-soft);color:var(--warn)">${ico('calendar')}</div><div><div class="strong">Next week's menu is ready</div><div class="small muted">${nextLabel}. Order by Wednesday 8 PM.</div></div><span style="margin-left:auto;color:var(--muted)">${ico('chevron')}</span></div></button>`}
  <div class="m-title">This week</div>
  <div class="m-card">${weekBars(84)}</div>`;
}

function weekBars(h = 110) {
  const meals = [...S().meals, ...(S().todayMeal ? [S().todayMeal] : [])].slice(-5);
  const W = 320, max = 900, bw = 34, gap = (W - bw * 5) / 6, y = v => h - (v / max) * (h - 16);
  const bars = meals.map((m, i) => { const x = gap + i * (bw + gap); return `<rect x="${x}" y="${y(m.kcal)}" width="${bw}" height="${h - y(m.kcal)}" rx="7" fill="${m.kcal >= TARGET.kcalMin && m.kcal <= TARGET.kcalMax ? 'var(--brand)' : 'var(--carbs)'}"/><text x="${x + bw / 2}" y="${h + 14}" font-size="11" text-anchor="middle" fill="var(--muted)">${m.date.split(' ')[1]}</text>`; }).join('');
  return `<div class="row between small"><span class="strong">Calories per lunch</span><span class="muted">target ${TARGET.kcalMin}–${TARGET.kcalMax}</span></div>
   <svg class="chart" viewBox="0 0 ${W} ${h + 18}" role="img" aria-label="Calories per lunch this week"><rect x="0" y="${y(TARGET.kcalMax)}" width="${W}" height="${y(TARGET.kcalMin) - y(TARGET.kcalMax)}" fill="var(--brand-soft)" opacity=".7"/>${bars}</svg>`;
}

function menu() {
  const s = S(), ids = dayDishes(day), st = mealStats(ids), m = s.menu[day];
  const opts = [['standard', m.ids[0]], ['light', m.light], ['halal', m.halal]];
  return `
  <div class="m-h1" style="margin-top:4px">Next week</div><div class="small muted">${fmtDate(weekDate(0))}–${fmtDate(weekDate(4))}, ${CHILD.school}</div>
  <div class="day-chips m-section" role="group" aria-label="Day">${DAYS.map((d, i) => `<button class="day-chip ${s.away[i] ? 'off' : ''}" data-day="${i}" aria-pressed="${i === day}"><span>${d}</span><b>${weekDate(i).getDate()}</b></button>`).join('')}</div>
  <div class="m-card m-section">
    <div class="row between"><div class="strong">${DAYS[day]}'s lunch</div><span class="small muted">${int(st.kcal)} kcal, ${st.p} g protein</span></div>
    ${ids.map(id => `<div class="dish"><canvas data-thumb="${id}" width="52" height="52"></canvas><div style="min-width:0"><div class="strong small">${esc(D[id].name)}</div><div class="tiny muted">${D[id].kcal} kcal, ${D[id].p} g protein${D[id].al.length ? `, contains ${D[id].al.join(', ')}` : ''}</div></div></div>`).join('')}
  </div>
  <div class="m-title">Main dish</div>
  ${opts.map(([k, id]) => `<button class="set-opt" data-set="${k}" aria-pressed="${s.choice[day] === k}" ${s.away[day] ? 'disabled' : ''}><span class="radio"></span><span style="flex:1;min-width:0"><span class="strong small">${cap(k)}</span><span class="tiny muted" style="display:block">${esc(D[id].name)}, ${D[id].kcal} kcal</span></span><span class="strong small">${money(SET_PRICE[k])}</span></button>`).join('')}
  <div class="m-card setting" style="padding:12px 14px"><div class="grow"><div class="strong small">${CHILD.name} will be away</div><div class="tiny muted">${s.order ? 'Refunded to the wallet automatically' : 'No lunch is charged for this day'}</div></div><label class="switch"><input type="checkbox" data-away="${day}" ${s.away[day] ? 'checked' : ''} aria-label="Away on ${DAYS[day]}"></label></div>
  <div class="sticky-cta">${s.order ? `<button class="btn secondary block lg" disabled>${ico('check')}Ordered, ${lunches()} lunches for ${money(orderTotal())}</button>` : `<button class="btn primary block lg" data-act="review">Review order, ${money(orderTotal())}</button>`}</div>`;
}

function nutrition() {
  const meals = [...S().meals, ...(S().todayMeal ? [S().todayMeal] : [])].slice(-5);
  const avg = k => meals.length ? meals.reduce((a, m) => a + m[k], 0) / meals.length : 0;
  const tot = avg('p') * 4 + avg('c') * 4 + avg('f') * 9 || 1;
  const ins = insights(meals);
  return `
  <div class="m-h1" style="margin-top:4px">Nutrition</div><div class="small muted">Last ${meals.length} school lunches, recognized from tray photos at checkout</div>
  <div class="m-card m-section">${weekBars()}</div>
  <div class="m-card m-section"><div class="strong small" style="margin-bottom:10px">Average lunch</div>
    <div class="rings">${ring([{ v: avg('kcal'), max: TARGET.kcal, color: 'var(--energy)' }, { v: avg('p'), max: TARGET.p, color: 'var(--protein)' }], 88, 9)}
    <div class="ring-legend"><span><i style="background:var(--energy)"></i>${int(avg('kcal'))} kcal</span><span><i style="background:var(--protein)"></i>${avg('p').toFixed(0)} g protein</span></div></div>
    <div class="macro-bar" style="margin-top:14px" aria-hidden="true"><i style="width:${avg('p') * 4 / tot * 100}%;background:var(--protein)"></i><i style="width:${avg('c') * 4 / tot * 100}%;background:var(--carbs)"></i><i style="width:${avg('f') * 9 / tot * 100}%;background:var(--fat)"></i></div>
    <div class="legend" style="margin-top:8px"><span><i style="background:var(--protein)"></i>Protein ${Math.round(avg('p') * 4 / tot * 100)}%</span><span><i style="background:var(--carbs)"></i>Carbs ${Math.round(avg('c') * 4 / tot * 100)}%</span><span><i style="background:var(--fat)"></i>Fat ${Math.round(avg('f') * 9 / tot * 100)}%</span></div>
  </div>
  <div class="m-title">What we noticed</div>
  <div class="m-card">${ins.map(x => `<div class="row" style="align-items:flex-start;padding:6px 0"><span style="color:${x.tone === 'good' ? 'var(--brand)' : 'var(--warn)'};flex:none">${ico(x.tone === 'good' ? 'check' : 'alert')}</span><span class="small">${esc(x.text)}</span></div>`).join('')}</div>
  <div class="m-title">Meals</div>
  <div class="m-card">${meals.slice().reverse().map((m, i) => `<button class="dish" data-meal="${meals.length - 1 - i}" style="width:100%;border:0;border-bottom:1px solid var(--border);background:none;text-align:left;cursor:pointer"><canvas data-thumb="${m.items.find(x => D[x] && D[x].type === 'main') || m.items[0]}" width="52" height="52"></canvas><div style="min-width:0;flex:1"><div class="strong small">${m === S().todayMeal ? 'Today' : m.date}</div><div class="tiny muted" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${m.items.map(x => D[x] ? D[x].name : x).join(', ')}</div></div><span class="small strong num">${int(m.kcal)} kcal</span></button>`).join('')}</div>`;
}

function wallet() {
  const s = S(), c = s.controls;
  return `
  <div class="m-h1" style="margin-top:4px">Wallet</div>
  <div class="m-card balance m-section"><div class="small" style="opacity:.85;font-weight:600">Available</div><div class="amt">${money(s.wallet.balance)}</div>
    <div class="small" style="opacity:.85">Held in bank escrow: ${money(s.wallet.escrow)}. Released to the caterer only after each lunch is served.</div>
    <div class="row" style="margin-top:12px"><button class="btn secondary sm" data-act="topup">${ico('plus')}Top up</button></div></div>
  <div class="m-title">Spending rules <span class="tiny muted">Enforced at the checkout</span></div>
  <div class="m-card" style="padding:4px 14px">
    <div class="setting"><div class="grow"><div class="strong small">Daily limit at the counter</div><div class="tiny muted">Checkout declines anything above this</div></div><div class="row" style="gap:6px"><button class="btn icon secondary" data-limit="-1" aria-label="Lower limit">${ico('minus')}</button><span class="strong num" style="min-width:44px;text-align:center">${money(c.dailyLimit)}</span><button class="btn icon secondary" data-limit="1" aria-label="Raise limit">${ico('plus')}</button></div></div>
    <div class="setting"><div class="grow"><div class="strong small">Block desserts</div><div class="tiny muted">Cookies, cakes, ice cream</div></div><label class="switch"><input type="checkbox" data-ctl="blockDessert" ${c.blockDessert ? 'checked' : ''} aria-label="Block desserts"></label></div>
    <div class="setting"><div class="grow"><div class="strong small">Block sugary drinks</div><div class="tiny muted">Juice boxes and soda</div></div><label class="switch"><input type="checkbox" data-ctl="blockSugary" ${c.blockSugary ? 'checked' : ''} aria-label="Block sugary drinks"></label></div>
    <div class="setting"><div class="grow"><div class="strong small">Auto top-up</div><div class="tiny muted">Add $40 when the balance drops below ${money(c.lowBalance)}</div></div><label class="switch"><input type="checkbox" data-ctl="autoTopup" ${c.autoTopup ? 'checked' : ''} aria-label="Auto top-up"></label></div>
    <div class="setting"><div class="grow"><div class="strong small">Lunch notifications</div><div class="tiny muted">What ${CHILD.name} ate, right after checkout</div></div><label class="switch"><input type="checkbox" data-ctl="notifyMeals" ${c.notifyMeals ? 'checked' : ''} aria-label="Lunch notifications"></label></div>
  </div>
  <div class="m-title">Activity</div>
  <div class="m-card" style="padding:4px 14px">${s.txns.map(t => `<div class="txn"><div class="icon-tile" style="background:${t.amt > 0 ? 'var(--brand-soft)' : 'var(--surface-2)'};color:${t.amt > 0 ? 'var(--brand)' : 'var(--ink-2)'}">${ico(t.kind === 'topup' ? 'arrowDown' : t.kind === 'refund' ? 'refresh' : t.kind === 'counter' ? 'scan' : t.kind === 'blocked' ? 'lock' : 'utensils')}</div><div style="min-width:0"><div class="strong small">${esc(t.title)}</div><div class="tiny muted">${esc(t.detail)}</div></div><div class="amt small" style="color:${t.amt > 0 ? 'var(--brand-ink)' : t.kind === 'blocked' ? 'var(--danger)' : 'var(--ink)'}">${t.kind === 'blocked' ? 'Declined' : (t.amt > 0 ? '+' : '') + money(t.amt)}<small>${t.date}</small></div></div>`).join('')}</div>`;
}

// ---------- sheets ----------
function sheetHTML() {
  const s = S();
  if (sheet.type === 'review') {
    if (sheet.step === 'processing') return wrap(`<div class="processing"><div class="spinner"></div><div class="strong">Paying from ${CHILD.name}'s wallet</div><div class="small muted">Moving ${money(orderTotal())} into bank escrow</div></div>`);
    if (sheet.step === 'done') return wrap(`<div class="processing"><div class="success-check">${ico('check')}</div><div class="strong" style="font-size:18px">Lunches ordered</div><div class="small muted">${lunches()} lunches, ${money(orderTotal())} held in escrow. The kitchen sees your order now.</div><button class="btn primary block" data-sheet="close">Done</button></div>`);
    const short = orderTotal() > s.wallet.balance;
    return wrap(`<div class="strong" style="font-size:18px;margin-bottom:6px">Review order</div>
      ${DAYS.map((d, i) => `<div class="row between small" style="padding:7px 0;border-bottom:1px solid var(--border)"><span>${d} ${fmtDate(weekDate(i))}</span><span>${s.away[i] ? '<span class="badge">Away</span>' : `${cap(s.choice[i])}, ${money(SET_PRICE[s.choice[i]])}`}</span></div>`).join('')}
      <div class="row between" style="padding:12px 0"><span class="strong">Total</span><span class="strong num" style="font-size:18px">${money(orderTotal())}</span></div>
      <div class="pay-method" aria-pressed="true"><div class="icon-tile" style="background:var(--brand-soft);color:var(--brand)">${ico('wallet')}</div><div style="flex:1"><div class="strong small">${CHILD.name}'s wallet</div><div class="tiny muted">Balance ${money(s.wallet.balance)}</div></div></div>
      ${short ? `<div class="small" style="color:var(--danger);margin:4px 0 10px">Not enough in the wallet. Top up ${money(orderTotal() - s.wallet.balance)} or more first.</div><button class="btn secondary block" data-sheet="topup-from-order">Top up</button>`
        : `<button class="btn primary block lg" data-sheet="pay-order">${ico('lock')}Pay ${money(orderTotal())}</button><p class="tiny muted" style="text-align:center;margin:8px 0 0">Held by the custodian bank until each lunch is served. Away days are refunded automatically.</p>`}`);
  }
  if (sheet.type === 'topup') {
    if (sheet.step === 'processing') return wrap(`<div class="processing"><div class="spinner"></div><div class="strong">Contacting your bank</div><div class="small muted">${money(sheet.amount)} from ${sheet.method === 'bank' ? 'bank account ending 4021' : 'debit card ending 8812'}</div></div>`);
    if (sheet.step === 'done') return wrap(`<div class="processing"><div class="success-check">${ico('check')}</div><div class="strong" style="font-size:18px">${money(sheet.amount)} added</div><div class="small muted">New balance ${money(s.wallet.balance)}</div><button class="btn primary block" data-sheet="${sheet.then === 'review' ? 'back-to-review' : 'close'}">${sheet.then === 'review' ? 'Back to order' : 'Done'}</button></div>`);
    return wrap(`<div class="strong" style="font-size:18px;margin-bottom:12px">Top up ${CHILD.name}'s wallet</div>
      <div class="amount-grid" role="group" aria-label="Amount">${[20, 40, 60].map(a => `<button data-amt="${a}" aria-pressed="${sheet.amount === a}">$${a}</button>`).join('')}</div>
      <div class="small strong" style="margin:16px 0 8px">Pay with</div>
      <button class="pay-method" data-method="bank" aria-pressed="${sheet.method === 'bank'}"><div class="icon-tile" style="background:var(--surface-2)">${ico('bank')}</div><div><div class="strong small">Bank account ending 4021</div><div class="tiny muted">No fee, arrives instantly</div></div></button>
      <button class="pay-method" data-method="card" aria-pressed="${sheet.method === 'card'}"><div class="icon-tile" style="background:var(--surface-2)">${ico('card')}</div><div><div class="strong small">Debit card ending 8812</div><div class="tiny muted">No fee</div></div></button>
      <button class="btn primary block lg" data-sheet="pay-topup" style="margin-top:8px">${ico('lock')}Add ${money(sheet.amount)}</button>
      <p class="tiny muted" style="text-align:center;margin:8px 0 0">Demo: no real money moves.</p>`);
  }
  if (sheet.type === 'meal') {
    const meals = [...S().meals, ...(S().todayMeal ? [S().todayMeal] : [])].slice(-5); const m = meals[sheet.i];
    return wrap(`<div class="strong" style="font-size:18px">${m === S().todayMeal ? 'Today' : m.date}</div><div class="small muted" style="margin-bottom:8px">${m.source}</div>
      ${m.items.map(id => D[id] ? `<div class="dish"><canvas data-thumb="${id}" data-size="40" width="40" height="40" style="width:40px;height:40px"></canvas><div style="flex:1"><div class="small strong">${esc(D[id].name)}</div><div class="tiny muted">${D[id].g} g</div></div><span class="small num">${D[id].kcal} kcal</span></div>` : '').join('')}
      <div class="row between strong" style="padding-top:10px"><span>Total</span><span class="num">${int(m.kcal)} kcal, ${m.p} g protein</span></div>
      <button class="btn secondary block" data-sheet="close" style="margin-top:14px">Close</button>`);
  }
  return '';
}
const wrap = inner => `<div class="sheet-back" data-sheet="backdrop"><div class="sheet" role="dialog" aria-modal="true"><div class="grab"></div>${inner}</div></div>`;

// ---------- actions ----------
function onClick(e) {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.day) { day = +b.dataset.day; paint(); return; }
  if (b.dataset.set) { const k = b.dataset.set; const old = S().choice[day];
    update(s => { s.choice[day] = k; if (s.order && !s.away[day]) { const diff = SET_PRICE[k] - SET_PRICE[old]; s.wallet.balance -= diff; s.wallet.escrow += diff; if (diff) s.txns.unshift({ id: 'x' + Date.now(), date: fmtDate(new Date()), title: diff > 0 ? 'Order change' : 'Order change refund', detail: `${DAYS[day]}: ${old} to ${k}`, amt: -diff, kind: diff > 0 ? 'order' : 'refund' }); } });
    if (S().order && SET_PRICE[k] !== SET_PRICE[old]) toast(`${DAYS[day]} changed to ${k}. Price difference settled.`);
    paint(); return; }
  if (b.dataset.meal) { sheet = { type: 'meal', i: +b.dataset.meal }; paint(); return; }
  if (b.dataset.limit) { update(s => { s.controls.dailyLimit = Math.max(2, Math.min(20, s.controls.dailyLimit + +b.dataset.limit)); }); paint(); return; }
  const a = b.dataset.act;
  if (a === 'topup') { sheet = { type: 'topup', amount: 40, method: 'bank' }; paint(); }
  if (a === 'goto-wallet') { tab = 'wallet'; paint(); }
  if (a === 'goto-menu') { tab = 'menu'; paint(); }
  if (a === 'review') { sheet = { type: 'review' }; paint(); }
}
function onChange(e) {
  const t = e.target;
  if (t.dataset.away !== undefined) { const i = +t.dataset.away, on = t.checked;
    update(s => { s.away[i] = on; if (s.order) { const amt = SET_PRICE[s.choice[i]]; if (on) { s.wallet.escrow -= amt; s.wallet.balance += amt; s.txns.unshift({ id: 'x' + Date.now(), date: fmtDate(new Date()), title: 'Refund, away day', detail: `${DAYS[i]} lunch`, amt, kind: 'refund' }); } else { s.wallet.escrow += amt; s.wallet.balance -= amt; s.txns.unshift({ id: 'x' + Date.now(), date: fmtDate(new Date()), title: 'Lunch added back', detail: `${DAYS[i]} lunch`, amt: -amt, kind: 'order' }); } } });
    if (S().order) { activity('refresh', 'blue', on ? `<b>Refund</b>: ${DAYS[i]} marked away, ${money(SET_PRICE[S().choice[i]])} returned from escrow to the wallet. Kitchen headcount updated.` : `<b>Order</b>: ${DAYS[i]} lunch added back.`); toast(on ? `${DAYS[i]} marked away. ${money(SET_PRICE[S().choice[i]])} refunded.` : `${DAYS[i]} lunch added back.`); }
    paint(); return; }
  if (t.dataset.ctl) { const k = t.dataset.ctl; update(s => { s.controls[k] = t.checked; });
    const label = { blockDessert: 'Desserts', blockSugary: 'Sugary drinks', autoTopup: 'Auto top-up', notifyMeals: 'Lunch notifications' }[k];
    activity('lock', 'blue', `<b>Spending rule</b>: ${label} ${t.checked ? (k.startsWith('block') ? 'blocked' : 'on') : (k.startsWith('block') ? 'allowed' : 'off')}. The checkout enforces this immediately.`);
    paint(); }
}
function onSheetClick(e) {
  if (e.target.dataset.sheet === 'backdrop') { if (!sheet || sheet.step !== 'processing') { sheet = null; paint(); } return; }
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.amt) { sheet.amount = +b.dataset.amt; paint(); return; }
  if (b.dataset.method) { sheet.method = b.dataset.method; paint(); return; }
  const a = b.dataset.sheet;
  if (a === 'close') { sheet = null; paint(); }
  if (a === 'topup-from-order') { const need = Math.ceil((orderTotal() - S().wallet.balance) / 20) * 20; sheet = { type: 'topup', amount: Math.max(20, Math.min(60, need)), method: 'bank', then: 'review' }; paint(); }
  if (a === 'back-to-review') { sheet = { type: 'review' }; paint(); }
  if (a === 'pay-topup') { sheet.step = 'processing'; paint();
    setTimeout(() => { const amt = sheet.amount, method = sheet.method;
      update(s => { s.wallet.balance += amt; s.txns.unshift({ id: 'x' + Date.now(), date: fmtDate(new Date()), title: 'Wallet top-up', detail: method === 'bank' ? 'Bank account ending 4021' : 'Debit card ending 8812', amt, kind: 'topup' }); });
      activity('wallet', 'green', `<b>Top-up</b>: ${money(amt)} added to ${CHILD.name}'s wallet.`); sheet.step = 'done'; paint(); }, 1300); }
  if (a === 'pay-order') { sheet.step = 'processing'; paint();
    setTimeout(() => { const total = orderTotal();
      update(s => { s.wallet.balance -= total; s.wallet.escrow += total; s.order = { id: 'ORD-' + Math.floor(10000 + Math.random() * 89999), placed: timeNow() }; s.txns.unshift({ id: 'x' + Date.now(), date: fmtDate(new Date()), title: 'Lunch pre-order', detail: `${lunches()} lunches, held in escrow`, amt: -total, kind: 'order' }); });
      activity('utensils', 'green', `<b>Order placed</b>: ${lunches()} lunches for ${money(total)}. Money moved to bank escrow; the kitchen's headcount for ${CHILD.school} went up.`);
      sheet.step = 'done'; paint(); }, 1400); }
}
