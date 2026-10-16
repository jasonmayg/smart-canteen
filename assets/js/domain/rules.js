// Checkout rules: what the parent allows, what the child must not eat, and whether the tray can be paid.
// Pure functions, applied to recognized items before any money moves.

export const REASON = {
  allergen: a => `Contains ${a.join(', ')}`,
  dessert: () => 'Desserts blocked by parent',
  sugary: () => 'Sugary drinks blocked by parent',
};

/**
 * Mark each recognized item as blocked (with a reason) or allowed.
 * Allergy checks come first and cannot be overridden by spending rules.
 * Items the model recognized but couldn't match to the dish library have unknown allergens; they are
 * allowed but flagged, so staff check them by eye.
 */
export function applyRules(items, controls, allergies = []) {
  return items.map(it => {
    const tags = it.tags || [], al = it.al || [];
    const hit = allergies.filter(a => al.includes(a));
    let blocked = null;
    if (hit.length) blocked = { kind: 'allergen', text: REASON.allergen(hit) };
    else if (controls.blockDessert && tags.includes('dessert')) blocked = { kind: 'dessert', text: REASON.dessert() };
    else if (controls.blockSugary && tags.includes('sugary')) blocked = { kind: 'sugary', text: REASON.sugary() };
    return { ...it, blocked: !!blocked, why: blocked, allergensUnknown: it.matched === false && allergies.length > 0 };
  });
}

export const tally = list => list.reduce((a, i) => { a.price += i.price; a.kcal += i.kcal; a.p += i.p; a.c += i.c; a.f += i.f; return a; }, { price: 0, kcal: 0, p: 0, c: 0, f: 0 });

/** Can this tray be paid? Returns the totals and every reason it can't. */
export function decide(items, controls, balance) {
  const allowed = items.filter(i => !i.blocked), blocked = items.filter(i => i.blocked);
  const t = tally(allowed);
  const overLimit = t.price > controls.dailyLimit + 1e-9;
  const short = !overLimit && t.price > balance + 1e-9;
  return { allowed, blocked, t, overLimit, short, canPay: allowed.length > 0 && !overLimit && !short };
}
