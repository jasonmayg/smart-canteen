// App state: one versioned object in localStorage, change listeners, the activity feed, and the seed data.
// Storage can be unavailable (private mode, blocked site data); the demo then runs in memory.
import { timeNow } from './lib/format.js';
import { DAYS } from './domain/data.js';
import { planWeek, mealStats } from './domain/menu.js';
import { SEED_USERS, checkGrant, checkRevoke, roleLabel } from './domain/org.js';
import { POLICY, grant as grantConsent, revoke as revokeConsent } from './domain/consent.js';
import { settle, offlineCheck, makeSale } from './domain/pos.js';

// ---- persistent state ----
const KEY = 'sc3_state';
const listeners = new Set();
export const state = { data: null };
export function loadState(defaults) {
  let saved = null;
  try { saved = JSON.parse(localStorage.getItem(KEY)); } catch (e) { saved = null; }
  state.data = saved && saved.v === defaults.v ? saved : structuredClone(defaults);
}
export function save() { try { localStorage.setItem(KEY, JSON.stringify(state.data)); } catch (e) { /* storage unavailable: keep in memory */ } }
export function update(fn) { fn(state.data); save(); listeners.forEach(l => l()); }
export function onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }
export function resetState(defaults) { state.data = structuredClone(defaults); save(); listeners.forEach(l => l()); }

// ---- activity feed (what happened behind the scenes) ----
export function activity(icon, tone, html) {
  update(s => { s.activity.unshift({ t: timeNow(), icon, tone, html }); s.activity = s.activity.slice(0, 30); });
}

// ---- seed data ----
const today = new Date();
export const fmtDate = d => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
export const daysAgo = n => { const d = new Date(today); d.setDate(today.getDate() - n); return d; };
export const nextMonday = (() => { const d = new Date(today); d.setDate(today.getDate() + ((8 - today.getDay()) % 7 || 7)); return d; })();
export const weekDate = i => { const d = new Date(nextMonday); d.setDate(nextMonday.getDate() + i); return d; };

function meal(daysBack, items) { const st = mealStats(items); return { date: fmtDate(daysAgo(daysBack)), items, kcal: st.kcal, p: st.p, c: st.c, f: st.f, price: st.price, source: 'Recognized at checkout' }; }

export function defaults() {
  const plan = planWeek(2.60, []).week;
  return {
    v: 5,
    viewer: 'u3',
    users: SEED_USERS,
    audit: [{ t: 'Aug 20', by: 'Lin Zhou', text: `Gave face-pay consent for Mia Lin (notice ${POLICY.version})` }, { t: 'Aug 12', by: 'Dr. Helen Ortiz', text: 'Granted School principal to Paul Grant at Maple Street Elementary' }],
    students: {
      mia: { id: 'mia', name: 'Mia Lin', household: 'h1', grade: 'Grade 4', allergies: null /* uses controls.allergies */ },
      leo: { id: 'leo', name: 'Leo Lin', household: 'h1', grade: 'Grade 1', allergies: [] },
    },
    consents: { mia: { status: 'granted', by: 'Lin Zhou', at: 'Aug 20', policy: POLICY.version }, leo: { status: 'none' } },
    offline: null, // { since, sales: [], cachedBalance }
    appliedSales: [],
    settlements: [],
    recogFixes: [],
    recogItems: 0,
    menu: plan.map(w => ({ ids: w.ids, light: w.light, halal: w.halal })),
    choice: DAYS.map(() => 'standard'),
    away: DAYS.map(() => false),
    order: null, // {id, total, placed}
    wallet: { balance: 46.30, escrow: 0 },
    txns: [
      { id: 'x1', date: fmtDate(daysAgo(1)), title: 'Counter purchase', detail: 'Chocolate chip cookie', amt: -1.20, kind: 'counter' },
      { id: 'x2', date: fmtDate(daysAgo(3)), title: 'Refund, away day', detail: 'Wednesday lunch', amt: 4.50, kind: 'refund' },
      { id: 'x3', date: fmtDate(daysAgo(7)), title: 'Lunch pre-order', detail: '5 lunches, released as served', amt: -22.50, kind: 'order' },
      { id: 'x4', date: fmtDate(daysAgo(8)), title: 'Wallet top-up', detail: 'Bank account ending 4021', amt: 40.00, kind: 'topup' },
    ],
    controls: { dailyLimit: 8, blockDessert: true, blockSugary: false, autoTopup: true, lowBalance: 10, notifyMeals: true, allergies: ['sesame'] },
    meals: [
      meal(5, ['m2', 'v1', 's1', 'e1']),
      meal(4, ['m6', 's2', 'e5']),
      meal(2, ['m4', 'v2', 's3', 'e4']),
      meal(1, ['m10', 'v5', 's1', 'e5', 't1']),
    ],
    todayMeal: null,
    activity: [],
    checks: {},
    inspected: {},
    kitchenPlan: null,
  };
}

// ---- people and access ----
export const viewer = () => state.data.users.find(u => u.id === state.data.viewer) || state.data.users[0];

export function grantUser(actor, { name, role, scope }) {
  const chk = checkGrant(actor, role, scope); if (!chk.ok) return chk;
  if (!name.trim()) return { ok: false, reason: 'Enter a name.' };
  const u = { id: 'u' + Date.now(), name: name.trim(), role, scope: { ...scope } };
  update(s => { s.users.push(u); s.audit.unshift({ t: timeNow(), by: actor.name, text: `Granted ${roleLabel(u)} to ${u.name}` }); });
  return { ok: true, user: u };
}
export function revokeUser(actor, id) {
  const t = state.data.users.find(u => u.id === id), chk = checkRevoke(actor, t); if (!chk.ok) return chk;
  update(s => { s.users = s.users.filter(u => u.id !== id); s.audit.unshift({ t: timeNow(), by: actor.name, text: `Removed ${roleLabel(t)} access for ${t.name}` }); if (s.viewer === id) s.viewer = actor.id; });
  return { ok: true };
}

// ---- face-pay consent ----
export function setConsent(studentId, on) {
  const st = state.data.students[studentId];
  try {
    const r = on ? grantConsent(viewer(), st, fmtDate(new Date()), POLICY.version) : revokeConsent(viewer(), st, fmtDate(new Date()));
    update(s => { s.consents[studentId] = r.record; s.audit.unshift(r.audit); });
    return { ok: true };
  } catch (e) { return { ok: false, reason: e.message }; }
}

// ---- offline checkout ----
export const isOffline = () => !!state.data.offline;
export function goOffline(reason = 'manual') {
  if (state.data.offline) return;
  update(s => { s.offline = { since: timeNow(), reason, sales: [], cachedBalance: s.wallet.balance }; });
}
/** Try to queue a sale while offline. Returns { ok, reason, sale }. */
export function queueSale({ studentId, studentName, items, total, method }) {
  const off = state.data.offline;
  const chk = offlineCheck({ total, method, studentId, cachedBalance: off.cachedBalance, queued: off.sales });
  if (!chk.ok) return chk;
  const sale = makeSale({ id: 'sale-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), terminal: 'Station 2', studentId, studentName, items, total, method, t: new Date().toISOString() });
  update(s => { s.offline.sales.push(sale); });
  return { ok: true, sale };
}
/** Meanwhile, the wallet is used elsewhere (demo helper to show a shortfall at settlement). */
export function spendElsewhere(amount = 40) {
  update(s => { s.wallet.balance = Math.round((s.wallet.balance - amount) * 100) / 100; s.txns.unshift({ id: 'xe' + Date.now(), date: fmtDate(new Date()), title: 'Paid elsewhere', detail: 'Field-trip fee, paid from the wallet', amt: -amount, kind: 'other' }); });
}
/** Reconnect: settle queued sales against the real wallet. Returns the settlement report. */
export function goOnline() {
  const off = state.data.offline; if (!off) return null;
  const c = state.data.controls;
  const r = settle({ balance: state.data.wallet.balance, autoTopup: c.autoTopup, lowBalance: c.lowBalance, topupAmount: 40 }, off.sales, state.data.appliedSales);
  update(s => {
    s.wallet.balance = r.wallet.balance;
    off.sales.filter(x => r.settled.includes(x.id)).forEach(x => s.txns.unshift({ id: x.id, date: fmtDate(new Date()), title: 'Lunch at checkout (offline)', detail: `${x.studentName}: ${x.items.join(', ')}`, amt: -x.total, kind: 'counter' }));
    r.topups.forEach(t => s.txns.unshift({ id: 'xa' + Date.now() + Math.random(), date: fmtDate(new Date()), title: 'Auto top-up', detail: 'Bank account ending 4021', amt: t.amount, kind: 'topup' }));
    s.appliedSales = r.appliedIds.slice(-500);
    s.settlements.unshift({ t: timeNow(), since: off.since, count: r.settled.length, total: r.total, topups: r.topups.length, owed: r.owed, skipped: r.skipped.length });
    s.offline = null;
  });
  return r;
}

// ---- recognition corrections ----
export function recordFix(rec) { update(s => { s.recogFixes.unshift({ ...rec, t: timeNow(), by: viewer().name }); s.recogFixes = s.recogFixes.slice(0, 200); }); }
