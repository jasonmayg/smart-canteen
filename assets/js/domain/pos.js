// Offline checkout and settlement.
//
// Lunch is 25 minutes for 400 students; the line can’t stop because the Wi-Fi did. When the terminal is
// offline it keeps selling against the balances it cached at the start of service, within limits that cap
// the risk, and queues each sale. When the connection returns, sales settle against the real wallets in the
// order they happened. A sale is settled at most once (idempotent by id). If a wallet can’t cover a sale
// (the parent spent elsewhere meanwhile), auto top-up covers it if it’s on; otherwise the amount is recorded
// as owed and the parent is told. Nothing is silently dropped, and the child is never sent away hungry.

export const OFFLINE_LIMITS = { perSale: 8, perStudent: 15 };

/** Can the terminal take this sale while offline? */
export function offlineCheck({ total, method, studentId, cachedBalance, queued }) {
  if (method === 'qr') return { ok: false, reason: 'Parent QR needs a connection. Use the student card.' };
  if (total > OFFLINE_LIMITS.perSale + 1e-9) return { ok: false, reason: `Offline sales are capped at $${OFFLINE_LIMITS.perSale.toFixed(2)}. Remove an item or take the card later.` };
  const mine = queued.filter(x => x.studentId === studentId).reduce((a, x) => a + x.total, 0);
  if (mine + total > OFFLINE_LIMITS.perStudent + 1e-9) return { ok: false, reason: `This student has reached the $${OFFLINE_LIMITS.perStudent} offline limit for today.` };
  if (cachedBalance - mine + 1e-9 < total) return { ok: false, reason: 'The balance this terminal saved at the start of lunch is too low.' };
  return { ok: true };
}

export function makeSale({ id, terminal, studentId, studentName, items, total, method, t }) {
  return { id, terminal, studentId, studentName, items, total: Math.round(total * 100) / 100, method, t, offline: true };
}

/**
 * Settle queued sales against a wallet.
 * @param wallet { balance, autoTopup, lowBalance, topupAmount }
 * @returns { wallet, settled, skipped, topups, owed, appliedIds, total }
 */
export function settle(wallet, sales, appliedIds = []) {
  const w = { ...wallet }, seen = new Set(appliedIds);
  const out = { settled: [], skipped: [], topups: [], owed: [], appliedIds: [...appliedIds], total: 0 };
  for (const s of [...sales].sort((a, b) => String(a.t).localeCompare(String(b.t)))) {
    if (seen.has(s.id)) { out.skipped.push(s.id); continue; }
    w.balance = Math.round((w.balance - s.total) * 100) / 100;
    out.settled.push(s.id); out.appliedIds.push(s.id); seen.add(s.id); out.total += s.total;
    if (w.balance < 0) {
      if (w.autoTopup) {
        let added = 0; while (w.balance < 0) { w.balance += w.topupAmount; added += w.topupAmount; }
        w.balance = Math.round(w.balance * 100) / 100; out.topups.push({ sale: s.id, amount: added });
      } else out.owed.push({ sale: s.id, studentName: s.studentName, amount: Math.round(-w.balance * 100) / 100 });
    }
  }
  if (w.autoTopup && w.balance >= 0 && w.balance < w.lowBalance && !out.topups.length) { w.balance += w.topupAmount; out.topups.push({ sale: null, amount: w.topupAmount }); }
  out.total = Math.round(out.total * 100) / 100;
  return { ...out, wallet: w };
}

/** End-of-service reconciliation for one terminal. */
export function reconcile(sales) {
  const by = {}; sales.forEach(s => { by[s.method] = (by[s.method] || 0) + s.total; });
  return { count: sales.length, total: Math.round(sales.reduce((a, s) => a + s.total, 0) * 100) / 100, byMethod: by };
}
