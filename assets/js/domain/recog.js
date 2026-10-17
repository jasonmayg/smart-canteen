// Recognition corrections at the counter, and how accurate the dish recognizer really is.
//
// The cashier sees every recognized item with its confidence; anything under CONFIRM_BELOW is highlighted
// for a quick look. Three kinds of fix: swap (wrong dish), remove (not on the tray), add (missed). Each fix
// is recorded with the tray image id and goes into the retraining set; accuracy is computed from fixes, so
// the number on the dashboard is measured from real service, not from a benchmark.
import { D } from './data.js';

export const CONFIRM_BELOW = 0.8;
export const needsCheck = it => (it.conf ?? 1) < CONFIRM_BELOW;

/** Last 30 days at Maple Street, before this demo session. */
export const HISTORY = {
  trays: 8420, items: 33150, swap: 412, remove: 96, add: 238,
  confusions: [['s2', 's1', 141], ['v1', 'v4', 88], ['e4', 'e1', 61], ['m9', 'm6', 44], ['v6', 'v3', 29]],
};

const lib = id => ({ id, name: D[id].name, grams: D[id].g, kcal: D[id].kcal, p: D[id].p, c: D[id].c, f: D[id].f, price: D[id].price, al: D[id].al, type: D[id].type, tags: D[id].tags, matched: true });

/** Apply one correction to the recognized items (returns a new array and the correction record). */
export function correct(items, fix) {
  const next = items.map(x => ({ ...x }));
  let rec;
  if (fix.kind === 'swap') {
    const i = fix.index, before = next[i];
    next[i] = { ...lib(fix.to), conf: 1, box: before.box, corrected: true };
    rec = { kind: 'swap', from: before.id, fromName: before.name, to: fix.to, toName: D[fix.to].name, conf: before.conf };
  } else if (fix.kind === 'remove') {
    const [gone] = next.splice(fix.index, 1);
    rec = { kind: 'remove', from: gone.id, fromName: gone.name, conf: gone.conf };
  } else if (fix.kind === 'add') {
    next.push({ ...lib(fix.to), conf: 1, box: null, corrected: true });
    rec = { kind: 'add', to: fix.to, toName: D[fix.to].name };
  } else throw new Error('Unknown correction');
  return { items: next, rec };
}

/** Accuracy from history plus corrections made live. */
export function quality(live = [], liveItems = 0, history = HISTORY) {
  const n = k => history[k] + live.filter(r => r.kind === k).length;
  const items = history.items + liveItems;
  const errors = n('swap') + n('remove') + n('add');
  const conf = {};
  history.confusions.forEach(([a, b, c]) => { conf[a + '>' + b] = c; });
  live.filter(r => r.kind === 'swap').forEach(r => { const k = r.from + '>' + r.to; conf[k] = (conf[k] || 0) + 1; });
  const top = Object.entries(conf).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k, c]) => { const [a, b] = k.split('>'); return { from: D[a]?.name || a, to: D[b]?.name || b, count: c }; });
  return {
    itemAccuracy: 1 - errors / (items + n('add')),
    wrongDish: n('swap') / items, notOnTray: n('remove') / items, missed: n('add') / (items + n('add')),
    trays: history.trays, retrain: errors, top,
  };
}
