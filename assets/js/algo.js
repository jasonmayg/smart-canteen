// Real algorithms on simulated data: menu planning, headcount forecasting, risk ranking, credit sizing.
import { DISHES, D, TARGET, DAYS } from './data.js';
import { rng } from './core.js';

export function mealStats(ids) {
  return ids.reduce((a, id) => { const d = D[id]; if (!d) return a; a.kcal += d.kcal; a.p += d.p; a.c += d.c; a.f += d.f; a.cost += d.cost; a.price += d.price; d.al.forEach(x => a.al.add(x)); return a; },
    { kcal: 0, p: 0, c: 0, f: 0, cost: 0, price: 0, al: new Set() });
}

// Exhaustive per-day search under cost cap + allergen exclusions, with variety constraints across the week.
export function planWeek(cap, exclude = []) {
  const ok = d => !d.al.some(a => exclude.includes(a));
  const by = t => DISHES.filter(d => d.type === t && ok(d));
  const mains = by('main'), vegs = by('veg'), staples = by('staple'), extras = by('extra');
  if (!mains.length || !vegs.length || !staples.length || !extras.length) return { error: 'Not enough dishes left after excluding those allergens. Allow at least one more.' };
  const mainMax = Math.ceil(5 / mains.length);
  const used = { main: {}, veg: {}, staple: {} }; const week = []; let searched = 0;
  for (let day = 0; day < 5; day++) {
    let best = null;
    for (const m of mains) { if ((used.main[m.id] || 0) >= mainMax) continue;
      for (const v of vegs) { if ((used.veg[v.id] || 0) >= 2) continue;
        for (const s of staples) { if ((used.staple[s.id] || 0) >= 2) continue;
          for (const e of extras) {
            searched++; const st = mealStats([m.id, v.id, s.id, e.id]);
            if (st.cost > cap + 1e-9) continue;
            let pen = 0;
            if (st.kcal < TARGET.kcalMin) pen += TARGET.kcalMin - st.kcal;
            if (st.kcal > TARGET.kcalMax) pen += st.kcal - TARGET.kcalMax;
            if (st.p < TARGET.p) pen += (TARGET.p - st.p) * 12;
            pen += Math.abs(st.kcal - TARGET.kcal) * .05 + st.cost * 2;
            if (week.length && week[week.length - 1].ids[3] === e.id) pen += 15;
            if (!best || pen < best.pen) best = { pen, ids: [m.id, v.id, s.id, e.id], st };
          } } } }
    if (!best) return { error: `Nothing fits under $${cap.toFixed(2)} for ${DAYS[day]} without repeating dishes too often. Raise the cost cap or allow an allergen.` };
    used.main[best.ids[0]] = (used.main[best.ids[0]] || 0) + 1; used.veg[best.ids[1]] = (used.veg[best.ids[1]] || 0) + 1; used.staple[best.ids[2]] = (used.staple[best.ids[2]] || 0) + 1;
    week.push(best);
  }
  week.forEach(w => {
    const others = mains.filter(m => m.id !== w.ids[0]);
    // alternates are always a different dish from the standard main, so parents get a real choice
    const pick = (tag, sort) => (others.filter(m => m.tags.includes(tag)).sort(sort)[0] || D[w.ids[0]]).id;
    w.light = pick('light', (a, b) => a.kcal - b.kcal);
    w.halal = pick('halal', (a, b) => b.p - a.p);
    if (w.halal === w.light) w.halal = (others.filter(m => m.tags.includes('halal') && m.id !== w.light).sort((a, b) => b.p - a.p)[0] || D[w.halal]).id;
  });
  return { week, searched, repeats: mainMax > 1 };
}

// 30 school days of headcount history for one school (simulated)
export const HIST = (() => { const r = rng(42); const g = () => { let u = 0, v = 0; while (!u) u = r(); while (!v) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  const dow = [6, 2, 0, 1, -11]; let base = 402; const out = []; for (let k = 0; k < 30; k++) { base += .25; out.push({ wd: k % 5, v: Math.round(base + dow[k % 5] + g() * 5) }); } return out; })();

export function forecast(wd, ev = {}) {
  const wavg = arr => { const w = arr.map((_, i) => i + 1); return arr.reduce((a, v, i) => a + v * w[i], 0) / w.reduce((a, b) => a + b, 0); };
  const same = HIST.filter(h => h.wd === wd).slice(-4).map(h => h.v); const base = wavg(same);
  const trend = (HIST.slice(-10).reduce((a, h) => a + h.v, 0) / 10 - HIST.slice(-20, -10).reduce((a, h) => a + h.v, 0) / 10) / 10 * 2;
  let f = base + trend; const notes = [`same-weekday average ${Math.round(base)}`, `trend ${trend >= 0 ? '+' : ''}${trend.toFixed(1)}`];
  if (ev.trip) { f -= 65 * .82; notes.push('field trip −53'); }
  if (ev.rain) { f *= 1.03; notes.push('rain +3%'); }
  if (ev.exam) { f *= 1.02; notes.push('exam day +2%'); }
  const res = []; for (let k = 15; k < 30; k++) { const prev = HIST.slice(0, k).filter(h => h.wd === HIST[k].wd).slice(-4).map(h => h.v); if (prev.length < 2) continue; res.push({ e: HIST[k].v - wavg(prev), v: HIST[k].v }); }
  const sd = Math.sqrt(res.reduce((a, x) => a + x.e * x.e, 0) / res.length); const mape = res.reduce((a, x) => a + Math.abs(x.e) / x.v, 0) / res.length * 100;
  return { f, lo: f - 1.28 * sd, hi: f + 1.28 * sd, sd, mape, notes, prep: Math.ceil((f + .5 * sd) / 5) * 5 };
}

export const riskOf = a => a.sev * (1 + .5 * a.rep) * (1 + a.days / 30);

export function creditLimit({ students, price, days, deposit }) {
  const monthly = students * .85 * price * days; const byContract = monthly * 1.5 * .8, byDeposit = deposit * 5;
  return { monthly, byContract, byDeposit, limit: Math.max(0, Math.min(byContract, byDeposit)) };
}

// Plain-language nutrition insights from a week of recognized meals
export function insights(meals) {
  if (!meals.length) return [];
  const out = []; const avg = k => meals.reduce((a, m) => a + m[k], 0) / meals.length;
  const vegDays = meals.filter(m => m.items.some(id => D[id] && D[id].type === 'veg')).length;
  const proteinDays = meals.filter(m => m.p >= TARGET.p).length;
  const treats = meals.flatMap(m => m.items.filter(id => D[id] && D[id].type === 'treat'));
  if (proteinDays === meals.length) out.push({ tone: 'good', text: `Protein target met on all ${meals.length} days.` });
  else out.push({ tone: 'warn', text: `Protein below ${TARGET.p} g on ${meals.length - proteinDays} of ${meals.length} days.` });
  if (vegDays < meals.length) out.push({ tone: 'warn', text: `No vegetable on ${meals.length - vegDays} day${meals.length - vegDays > 1 ? 's' : ''}. The pre-order set always includes one; skipped vegetables show up here.` });
  else out.push({ tone: 'good', text: 'A vegetable every day.' });
  const k = avg('kcal'); if (k < TARGET.kcalMin) out.push({ tone: 'warn', text: `Lunches averaged ${Math.round(k)} kcal, under the ${TARGET.kcalMin} kcal target.` });
  else if (k > TARGET.kcalMax) out.push({ tone: 'warn', text: `Lunches averaged ${Math.round(k)} kcal, above the ${TARGET.kcalMax} kcal target.` });
  else out.push({ tone: 'good', text: `Energy on target: ${Math.round(k)} kcal on average.` });
  if (treats.length) out.push({ tone: 'warn', text: `${treats.length} treat${treats.length > 1 ? 's' : ''} bought at the counter this week (${treats.map(t => D[t].name.toLowerCase()).join(', ')}).` });
  return out;
}
