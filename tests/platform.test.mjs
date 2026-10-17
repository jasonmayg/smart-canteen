// Access, face-pay consent, offline checkout and recognition corrections. Run: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SEED_USERS, can, canSee, checkGrant, checkRevoke } from '../assets/js/domain/org.js';
import { POLICY, grant, revoke, faceAllowed, methodsFor, checkConsentActor } from '../assets/js/domain/consent.js';
import { offlineCheck, makeSale, settle, reconcile, OFFLINE_LIMITS } from '../assets/js/domain/pos.js';
import { correct, quality, needsCheck, HISTORY } from '../assets/js/domain/recog.js';
import { D } from '../assets/js/domain/data.js';

const U = Object.fromEntries(SEED_USERS.map(u => [u.name, u]));
const S1 = { district: 'd1', school: 's1' };

test('access: district → school → canteen departments → parents → students', () => {
  assert.ok(checkGrant(U['Dr. Helen Ortiz'], 'school_admin', { district: 'd1', school: 's2' }).ok);
  assert.ok(checkGrant(U['Paul Grant'], 'dept_lead', { ...S1, dept: 'kitchen' }).ok);
  assert.ok(checkGrant(U['Paul Grant'], 'guardian', { ...S1, household: 'h2' }).ok);
  assert.ok(!checkGrant(U['Paul Grant'], 'staff', { district: 'd1', school: 's2', dept: 'kitchen' }).ok, 'other school');
  assert.ok(checkGrant(U['Rosa Lee'], 'staff', { ...S1, dept: 'kitchen' }).ok);
  assert.ok(!checkGrant(U['Rosa Lee'], 'staff', { ...S1, dept: 'finance' }).ok);
  assert.ok(checkGrant(U['Lin Zhou'], 'student', { ...S1, household: 'h1' }).ok);
  assert.ok(!checkGrant(U['Lin Zhou'], 'student', { ...S1, household: 'h2' }).ok);
  assert.ok(!checkGrant(U['Lin Zhou'], 'guardian', { ...S1, household: 'h1' }).ok, 'only the school registers guardians');
  assert.ok(!checkGrant(U['Nina Shah'], 'guardian', { ...S1, household: 'h1' }).ok);
  assert.ok(!checkRevoke(U['Omar Diaz'], U['Nina Shah']).ok);
});

test('access: pages follow roles', () => {
  assert.ok(canSee(U['Omar Diaz'], 'checkout') && !canSee(U['Omar Diaz'], 'district') && !canSee(U['Omar Diaz'], 'kitchen'));
  assert.ok(canSee(U['Ben Kim'], 'kitchen') && !canSee(U['Ben Kim'], 'checkout'));
  assert.ok(canSee(U['Dr. Helen Ortiz'], 'district') && !can(U['Dr. Helen Ortiz'], 'checkout.run'));
  assert.ok(canSee(U['Lin Zhou'], 'family') && !canSee(U['Lin Zhou'], 'checkout'));
  assert.ok(can(U['Omar Diaz'], 'recog.correct') && !can(U['Omar Diaz'], 'offline.review'));
});

test('consent: only the child’s guardian, under the current notice', () => {
  const mia = { name: 'Mia Lin', household: 'h1' };
  assert.ok(checkConsentActor(U['Lin Zhou'], mia).ok);
  assert.ok(!checkConsentActor(U['Grace Okoro'], mia).ok);
  assert.ok(!checkConsentActor(U['Paul Grant'], mia).ok, 'the school cannot consent for a parent');
  assert.throws(() => grant(U['Lin Zhou'], mia, 't', '2025-01'), /current notice/);
  const g = grant(U['Lin Zhou'], mia, 't', POLICY.version);
  assert.ok(faceAllowed(g.record));
  const r = revoke(U['Lin Zhou'], mia, 't');
  assert.ok(!faceAllowed(r.record)); assert.equal(r.record.templateDeleted, true);
  assert.ok(!faceAllowed({ status: 'granted', policy: '2020-01' }), 'old notice needs re-consent');
});

test('consent: the card always works; QR needs a connection', () => {
  const m = methodsFor({ status: 'none' }, false);
  assert.ok(!m.face.ok && m.card.ok && !m.qr.ok);
  assert.ok(methodsFor(null, true).qr.ok);
});

test('offline: limits cap the risk of selling against cached balances', () => {
  const base = { method: 'card', studentId: 'mia', cachedBalance: 20, queued: [] };
  assert.ok(offlineCheck({ ...base, total: 5 }).ok);
  assert.match(offlineCheck({ ...base, total: OFFLINE_LIMITS.perSale + 1 }).reason, /capped/);
  assert.match(offlineCheck({ ...base, method: 'qr', total: 3 }).reason, /needs a connection/);
  const q = [makeSale({ id: 'a', studentId: 'mia', total: 7.5, method: 'card', t: '12:01' }), makeSale({ id: 'b', studentId: 'mia', total: 6, method: 'face', t: '12:02' })];
  assert.match(offlineCheck({ ...base, total: 3, queued: q }).reason, /offline limit/);
  assert.match(offlineCheck({ ...base, cachedBalance: 4, total: 5 }).reason, /too low/);
});

test('offline: settlement is ordered, idempotent and never drops a sale', () => {
  const sales = [makeSale({ id: 'b', studentId: 'mia', total: 6, method: 'face', t: '12:05' }), makeSale({ id: 'a', studentId: 'mia', total: 5, method: 'card', t: '12:01' })];
  const w = { balance: 8, autoTopup: false, lowBalance: 10, topupAmount: 40 };
  const r = settle(w, sales);
  assert.deepEqual(r.settled, ['a', 'b']); assert.equal(r.wallet.balance, -3); assert.equal(r.owed[0].amount, 3);
  const again = settle(r.wallet, sales, r.appliedIds);
  assert.equal(again.skipped.length, 2); assert.equal(again.wallet.balance, -3);
  const auto = settle({ ...w, autoTopup: true }, sales);
  assert.equal(auto.wallet.balance, 37); assert.equal(auto.topups[0].amount, 40); assert.equal(auto.owed.length, 0);
  assert.deepEqual(reconcile(sales), { count: 2, total: 11, byMethod: { face: 6, card: 5 } });
});

test('recognition: swap, remove and add corrections, and measured accuracy', () => {
  const items = [{ id: 's2', name: D.s2.name, conf: 0.71, price: 0.7, box: [0, 0, 1, 1] }, { id: 'v1', name: D.v1.name, conf: 0.93, price: 0.9 }];
  assert.ok(needsCheck(items[0]) && !needsCheck(items[1]));
  let r = correct(items, { kind: 'swap', index: 0, to: 's1' });
  assert.equal(r.items[0].id, 's1'); assert.equal(r.items[0].box[2], 1); assert.equal(r.rec.from, 's2');
  const r2 = correct(r.items, { kind: 'remove', index: 1 }); assert.equal(r2.items.length, 1);
  const r3 = correct(r2.items, { kind: 'add', to: 'e5' }); assert.equal(r3.items.at(-1).id, 'e5');
  const q0 = quality(), q1 = quality([r.rec, r2.rec, r3.rec], 2);
  assert.ok(q0.itemAccuracy > 0.97 && q0.itemAccuracy < 0.99);
  assert.ok(q1.itemAccuracy < q0.itemAccuracy);
  assert.equal(q1.retrain, HISTORY.swap + HISTORY.remove + HISTORY.add + 3);
  assert.equal(q0.top[0].from, D.s2.name);
});
