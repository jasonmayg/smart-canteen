// Face-pay consent for minors.
//
// Face recognition of children is regulated (e.g. Illinois BIPA, Texas CUBI and Washington biometric
// laws; COPPA for under-13s; FERPA for school records). The product rules here are stricter than "a box
// in the terms": opt-in only, by a parent or guardian, per child, with a plain-language notice; easy to
// withdraw; the template is deleted on withdrawal; and a non-biometric way to pay always works.

export const POLICY = {
  version: '2026-08',
  stored: 'A face template: a list of numbers computed from enrollment photos. No photos are kept.',
  where: 'Encrypted on the school’s checkout terminals and the platform. Never shared or sold.',
  use: 'Only to identify your child when paying at this school’s counter.',
  retention: 'Deleted within 24 hours of withdrawing consent, and when your child leaves the school.',
  alternative: 'The student card and a parent-approved QR code always work. Opting out changes nothing else.',
};

export const STATUS = { none: 'Not enrolled', granted: 'Enrolled', revoked: 'Withdrawn' };

/** Who may give or withdraw consent for a student: a guardian in the same household. */
export function checkConsentActor(actor, student) {
  if (actor.role !== 'guardian') return { ok: false, reason: 'Only a parent or guardian can give or withdraw consent for face pay.' };
  if (actor.scope.household !== student.household) return { ok: false, reason: 'You can only decide for your own children.' };
  return { ok: true };
}

/** Grant consent. Returns the new record plus the audit entry. Requires the current policy to be shown. */
export function grant(actor, student, t, policyVersion) {
  const chk = checkConsentActor(actor, student); if (!chk.ok) throw new Error(chk.reason);
  if (policyVersion !== POLICY.version) throw new Error('Please read the current notice before giving consent.');
  return { record: { status: 'granted', by: actor.name, at: t, policy: POLICY.version }, audit: { t, by: actor.name, text: `Gave face-pay consent for ${student.name} (notice ${POLICY.version})` } };
}

export function revoke(actor, student, t) {
  const chk = checkConsentActor(actor, student); if (!chk.ok) throw new Error(chk.reason);
  return { record: { status: 'revoked', by: actor.name, at: t, policy: POLICY.version, templateDeleted: true }, audit: { t, by: actor.name, text: `Withdrew face-pay consent for ${student.name}; face template deleted` } };
}

/** Face pay is allowed only with current consent under the current notice. */
export const faceAllowed = c => !!c && c.status === 'granted' && c.policy === POLICY.version;

/** Payment methods for a student right now. The card is always there. */
export function methodsFor(consent, online) {
  return {
    face: faceAllowed(consent) ? { ok: true } : { ok: false, reason: consent?.status === 'revoked' ? 'Consent withdrawn by parent' : 'Not enrolled in face pay' },
    card: { ok: true },
    qr: online ? { ok: true } : { ok: false, reason: 'Parent QR needs a connection' },
  };
}

/** District-level summary for the audit view. */
export function enrollmentSummary(consents, studentCount) {
  const vals = Object.values(consents);
  return { enrolled: vals.filter(faceAllowed).length, withdrawn: vals.filter(c => c.status === 'revoked').length, total: studentCount };
}
