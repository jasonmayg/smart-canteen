// Unit tests for the DOM-free domain logic. Run: node --test tests/*.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { planWeek, mealStats } from '../assets/js/domain/menu.js';
import { forecast } from '../assets/js/domain/forecast.js';
import { riskOf, creditLimit } from '../assets/js/domain/risk.js';
import { insights } from '../assets/js/domain/nutrition.js';
import { applyRules, decide } from '../assets/js/domain/rules.js';
import { D, ALERTS } from '../assets/js/domain/data.js';

test('menu planner respects the cost cap and allergen exclusions', () => {
  for (const cap of [2.2, 2.6, 3.2]) {
    const r = planWeek(cap, ['egg']);
    if (r.error) continue;
    assert.equal(r.week.length, 5);
    for (const day of r.week) {
      assert.ok(day.st.cost <= cap + 1e-9, `cost ${day.st.cost} over ${cap}`);
      day.ids.forEach(id => assert.ok(!D[id].al.includes('egg'), `${id} contains egg`));
    }
  }
});

test('menu planner offers light and halal alternates that differ from the main', () => {
  const { week } = planWeek(2.6, []);
  week.forEach(d => { assert.notEqual(d.light, d.ids[0]); assert.notEqual(d.halal, d.ids[0]); });
});

test('menu planner explains when nothing fits', () => {
  assert.match(planWeek(0.5, []).error, /Raise the cost cap/);
});

test('forecast carries an 80% range and reacts to events', () => {
  const base = forecast(4), trip = forecast(4, { trip: true });
  assert.ok(base.lo < base.f && base.f < base.hi);
  assert.ok(trip.f < base.f - 40);
  assert.ok(base.prep >= base.f && base.prep % 5 === 0);
  assert.ok(base.mape > 0 && base.mape < 5);
});

test('inspection risk ranks severity, repeats and time since inspection', () => {
  const ranked = [...ALERTS].sort((a, b) => riskOf(b) - riskOf(a));
  assert.equal(ranked[0].sev, 5);
  assert.ok(riskOf({ sev: 2, rep: 3, days: 8 }) > riskOf({ sev: 2, rep: 0, days: 8 }));
});

test('credit limit is the smaller of contract and deposit caps', () => {
  const c = creditLimit({ students: 1000, price: 4.5, days: 20, deposit: 1000 });
  assert.equal(c.limit, 5000);
  assert.equal(creditLimit({ students: 0, price: 4.5, days: 20, deposit: 1000 }).limit, 0);
});

test('rules: allergy beats everything, desserts and drinks follow the switches', () => {
  const tray = ['m8', 'v6', 't1', 't2'].map(id => ({ ...D[id], id }));
  const out = applyRules(tray, { blockDessert: true, blockSugary: false }, ['sesame']);
  assert.equal(out[1].why.kind, 'allergen');
  assert.equal(out[2].why.kind, 'dessert');
  assert.equal(out[3].blocked, false);
  assert.equal(out[0].blocked, false);
});

test('rules: unmatched model items are flagged when allergies are set', () => {
  const [x] = applyRules([{ name: 'Mystery bar', price: 1, kcal: 1, p: 0, c: 0, f: 0, al: [], tags: [], matched: false }], { blockDessert: false, blockSugary: false }, ['milk']);
  assert.equal(x.blocked, false); assert.equal(x.allergensUnknown, true);
});

test('rules: daily limit and balance stop payment', () => {
  const items = applyRules(['m2', 's1', 'v4'].map(id => ({ ...D[id], id })), { blockDessert: false, blockSugary: false }, []);
  const total = mealStats(['m2', 's1', 'v4']).price;
  assert.equal(decide(items, { dailyLimit: total - 0.01 }, 100).overLimit, true);
  assert.equal(decide(items, { dailyLimit: 20 }, total - 0.01).short, true);
  assert.equal(decide(items, { dailyLimit: 20 }, 100).canPay, true);
});

test('nutrition insights flag missing vegetables and treats', () => {
  const meal = ids => ({ items: ids, ...mealStats(ids) });
  const notes = insights([meal(['m2', 'v1', 's1', 'e1']), meal(['m6', 's2', 'e5', 't1'])]).map(x => x.text).join(' ');
  assert.match(notes, /No vegetable on 1 day/);
  assert.match(notes, /1 treat/);
});
