// Next-day headcount forecast with a back-tested 80% interval.
import { rng } from '../lib/format.js';
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

