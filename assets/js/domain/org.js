// Organization and access for school lunch.
//
//   District (education bureau) → School → Canteen departments (checkout, kitchen, finance) → staff
//   School → Household → guardian (parent) → students
//
// Delegation rule: grant only roles below your own, only inside what you manage. The district appoints
// school admins; a school admin appoints canteen leads and registers guardians; a lead adds staff to
// their department; a guardian manages their own children (rules, allergies, face-pay consent).

export const DISTRICT = { id: 'd1', name: 'Riverside Unified School District' };
export const SCHOOL_LIST = [
  { id: 's1', name: 'Maple Street Elementary', students: 430, live: true },
  { id: 's2', name: 'Harbor View Middle', students: 510, kpi: { meals: 436, checklist: 0.96, alerts: 1, enrolledFace: 0.31, offlineTxns: 0 } },
  { id: 's3', name: 'Cedar Park Elementary', students: 300, kpi: { meals: 262, checklist: 0.88, alerts: 2, enrolledFace: 0, offlineTxns: 14 } },
];

export const DEPARTMENTS = {
  counter: { name: 'Checkout', staffTitle: 'Cashier', leadTitle: 'Canteen manager',
    staff: ['checkout.run', 'recog.correct'], lead: ['recog.view', 'offline.review', 'family.preview'] },
  kitchen: { name: 'Kitchen', staffTitle: 'Cook', leadTitle: 'Kitchen lead',
    staff: ['kitchen.view'], lead: ['kitchen.plan'] },
  finance: { name: 'Finance', staffTitle: 'Finance clerk', leadTitle: 'Finance lead',
    staff: ['finance.view'], lead: ['credit.view', 'offline.review'] },
};

const SCHOOL_ALL = ['family.preview', 'checkout.view', 'recog.view', 'kitchen.view', 'kitchen.plan', 'finance.view', 'credit.view', 'offline.review', 'consent.audit', 'org.view', 'org.grant'];

export const ROLES = {
  platform_admin: { label: 'Platform admin', level: 100, scope: 'platform', perms: [...SCHOOL_ALL, 'district.view', 'portfolio.view'] },
  district_admin: { label: 'District food-safety officer', level: 80, scope: 'district', perms: ['district.view', 'portfolio.view', 'recog.view', 'consent.audit', 'finance.view', 'credit.view', 'checkout.view', 'org.view', 'org.grant'] },
  school_admin: { label: 'School principal', level: 60, scope: 'school', perms: SCHOOL_ALL },
  dept_lead: { label: 'Department lead', level: 40, scope: 'department', perms: ['org.view', 'org.grant'] },
  staff: { label: 'Staff', level: 20, scope: 'department', perms: [] },
  guardian: { label: 'Parent or guardian', level: 30, scope: 'household', perms: ['family.app', 'pay', 'rules.manage', 'consent.manage', 'org.view', 'org.grant'] },
  student: { label: 'Student', level: 5, scope: 'household', perms: [] },
};

export const HOUSEHOLDS = [{ id: 'h1', school: 's1', name: 'Lin family' }, { id: 'h2', school: 's1', name: 'Okoro family' }];

export const SEED_USERS = [
  { id: 'u0', name: 'Platform operations', role: 'platform_admin', scope: {} },
  { id: 'u1', name: 'Dr. Helen Ortiz', role: 'district_admin', scope: { district: 'd1' } },
  { id: 'u2', name: 'Paul Grant', role: 'school_admin', scope: { district: 'd1', school: 's1' } },
  { id: 'u3', name: 'Nina Shah', role: 'dept_lead', scope: { district: 'd1', school: 's1', dept: 'counter' } },
  { id: 'u4', name: 'Omar Diaz', role: 'staff', scope: { district: 'd1', school: 's1', dept: 'counter' } },
  { id: 'u5', name: 'Rosa Lee', role: 'dept_lead', scope: { district: 'd1', school: 's1', dept: 'kitchen' } },
  { id: 'u6', name: 'Ben Kim', role: 'staff', scope: { district: 'd1', school: 's1', dept: 'kitchen' } },
  { id: 'u7', name: 'Alice Moore', role: 'dept_lead', scope: { district: 'd1', school: 's1', dept: 'finance' } },
  { id: 'u8', name: 'Lin Zhou', role: 'guardian', scope: { district: 'd1', school: 's1', household: 'h1' }, note: 'Mia and Leo’s mother' },
  { id: 'u9', name: 'Mia Lin', role: 'student', scope: { district: 'd1', school: 's1', household: 'h1' }, student: 'mia', age: 9 },
  { id: 'u10', name: 'Leo Lin', role: 'student', scope: { district: 'd1', school: 's1', household: 'h1' }, student: 'leo', age: 6 },
  { id: 'u11', name: 'Grace Okoro', role: 'guardian', scope: { district: 'd1', school: 's1', household: 'h2' } },
  { id: 'u12', name: 'Daniel Okoro', role: 'student', scope: { district: 'd1', school: 's1', household: 'h2' }, age: 11 },
];

export const roleLabel = u => (u.role === 'staff' ? DEPARTMENTS[u.scope.dept].staffTitle : u.role === 'dept_lead' ? DEPARTMENTS[u.scope.dept].leadTitle : ROLES[u.role].label);

export function permsOf(u) {
  const p = new Set(ROLES[u.role].perms);
  const d = DEPARTMENTS[u.scope?.dept];
  if (d && ['staff', 'dept_lead'].includes(u.role)) { d.staff.forEach(x => p.add(x)); if (u.role === 'dept_lead') d.lead.forEach(x => p.add(x)); }
  return p;
}
export const can = (u, perm) => permsOf(u).has(perm);

export function contains(outer, inner) {
  for (const k of ['district', 'school', 'dept', 'household']) if (outer[k] && outer[k] !== inner[k]) return false;
  return true;
}

export function checkGrant(actor, role, scope) {
  const R = ROLES[role], A = ROLES[actor.role];
  if (!R) return { ok: false, reason: 'Unknown role.' };
  if (!can(actor, 'org.grant')) return { ok: false, reason: `${roleLabel(actor)} can’t grant access.` };
  if (R.level >= A.level) return { ok: false, reason: `You can only grant roles below your own (${A.label}).` };
  if (!contains(actor.scope, scope)) return { ok: false, reason: 'That is outside what you manage.' };
  const need = { district: ['district'], school: ['district', 'school'], department: ['district', 'school', 'dept'], household: ['district', 'school', 'household'] }[R.scope] || [];
  const missing = need.filter(k => !scope[k]);
  if (missing.length) return { ok: false, reason: `${R.label} needs a ${missing.join(' and ')}.` };
  if (actor.role === 'guardian' && role !== 'student') return { ok: false, reason: 'Parents can only add their own children.' };
  if (actor.role === 'dept_lead' && role !== 'staff') return { ok: false, reason: 'Leads can only add staff to their department.' };
  if (role === 'guardian' && !['school_admin', 'platform_admin'].includes(actor.role)) return { ok: false, reason: 'Only the school registers a parent or guardian, after checking identity.' };
  return { ok: true };
}
export function checkRevoke(actor, target) {
  if (actor.id === target.id) return { ok: false, reason: 'You can’t remove your own access.' };
  return checkGrant(actor, target.role, target.scope);
}

export const CAPABILITIES = [
  ['portfolio.view', 'See every school in the district'],
  ['org.grant', 'Grant and remove access below own level'],
  ['checkout.run', 'Run the checkout and take payments'],
  ['recog.correct', 'Correct dish recognition at the counter'],
  ['recog.view', 'See recognition accuracy'],
  ['offline.review', 'Review offline transactions after sync'],
  ['kitchen.view', 'See orders, forecast and checklist'],
  ['kitchen.plan', 'Plan and publish menus'],
  ['finance.view', 'See escrow and settlements'],
  ['consent.audit', 'Audit face-pay consent records'],
  ['family.app', 'Use the family app and pay'],
  ['consent.manage', 'Give or withdraw face-pay consent'],
];

export const ROUTE_PERMS = {
  overview: [], family: ['family.app', 'family.preview'], checkout: ['checkout.run', 'checkout.view'], kitchen: ['kitchen.view'],
  district: ['district.view'], finance: ['credit.view'], org: ['org.view'],
};
export const canSee = (u, route) => !ROUTE_PERMS[route]?.length || ROUTE_PERMS[route].some(p => can(u, p));
