// Menu planning: nutrition totals and a week of menus under a cost cap and allergen exclusions.
import { DISHES, D, TARGET, DAYS } from './data.js';
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

