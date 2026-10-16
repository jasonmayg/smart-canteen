// Plain-language nutrition insights from a week of recognized lunches.
import { D, TARGET } from './data.js';
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
