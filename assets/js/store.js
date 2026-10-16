// Default (seed) state for the demo.
import { planWeek, mealStats } from './algo.js';
import { DAYS } from './data.js';

const today = new Date();
export const fmtDate = d => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
export const daysAgo = n => { const d = new Date(today); d.setDate(today.getDate() - n); return d; };
export const nextMonday = (() => { const d = new Date(today); d.setDate(today.getDate() + ((8 - today.getDay()) % 7 || 7)); return d; })();
export const weekDate = i => { const d = new Date(nextMonday); d.setDate(nextMonday.getDate() + i); return d; };

function meal(daysBack, items) { const st = mealStats(items); return { date: fmtDate(daysAgo(daysBack)), items, kcal: st.kcal, p: st.p, c: st.c, f: st.f, price: st.price, source: 'Recognized at checkout' }; }

export function defaults() {
  const plan = planWeek(2.60, []).week;
  return {
    v: 3,
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
    controls: { dailyLimit: 8, blockDessert: true, blockSugary: false, autoTopup: true, lowBalance: 10, notifyMeals: true },
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
