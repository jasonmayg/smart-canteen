// Organization and access: district → schools → canteen departments → families.
import { esc, money } from '../lib/format.js';
import { $, ico, toast } from '../lib/ui.js';
import { state, viewer, grantUser, revokeUser } from '../state.js';
import { DISTRICT, SCHOOL_LIST, DEPARTMENTS, HOUSEHOLDS, ROLES, CAPABILITIES, permsOf, can, checkGrant, checkRevoke, contains, roleLabel } from '../domain/org.js';
import { faceAllowed, POLICY } from '../domain/consent.js';

let root, node = null;
const S = () => state.data;

const NODES = (() => {
  const n = { d1: { id: 'd1', kind: 'district', label: DISTRICT.name, scope: { district: 'd1' } } };
  SCHOOL_LIST.forEach(s => { n[s.id] = { id: s.id, kind: 'school', label: s.name, scope: { district: 'd1', school: s.id } }; });
  Object.entries(DEPARTMENTS).forEach(([k, d]) => { n['s1:' + k] = { id: 's1:' + k, kind: 'department', label: `Canteen: ${d.name}`, scope: { district: 'd1', school: 's1', dept: k } }; });
  HOUSEHOLDS.forEach(h => { n[h.id] = { id: h.id, kind: 'household', label: h.name, scope: { district: 'd1', school: h.school, household: h.id } }; });
  return n;
})();
const exactly = (u, sc) => ['district', 'school', 'dept', 'household'].every(k => (u.scope[k] || null) === (sc[k] || null));
const homeNode = u => u.scope.household || (u.scope.dept ? `s1:${u.scope.dept}` : u.scope.school || 'd1');
const visible = (u, nd) => contains(u.scope, nd.scope) || contains(nd.scope, u.scope);

function tree(u) {
  const item = (id, depth, extra = '') => {
    const nd = NODES[id]; if (!visible(u, nd)) return '';
    const n = S().users.filter(x => contains(nd.scope, x.scope)).length;
    const icon = { district: 'shield', school: 'book', department: 'chef', household: 'home' }[nd.kind];
    return `<button class="tree-item ${node === id ? 'on' : ''}" data-node="${id}" style="padding-left:${10 + depth * 18}px">${ico(icon)}<span>${esc(nd.label)}</span><span class="count">${n}</span></button>${extra}`;
  };
  return item('d1', 0, SCHOOL_LIST.map(s => item(s.id, 1, s.id === 's1'
    ? `<div class="tree-label" style="padding-left:46px">Canteen</div>${Object.keys(DEPARTMENTS).map(k => item('s1:' + k, 2)).join('')}<div class="tree-label" style="padding-left:46px">Families</div>${HOUSEHOLDS.map(h => item(h.id, 2)).join('')}`
    : '')).join(''));
}

function panel(u) {
  const nd = NODES[node]; if (!nd) return '';
  const people = S().users.filter(x => exactly(x, nd.scope));
  const roles = Object.keys(ROLES).filter(r => checkGrant(u, r, nd.scope).ok);
  const label = r => (r === 'staff' ? DEPARTMENTS[nd.scope.dept].staffTitle : r === 'dept_lead' ? DEPARTMENTS[nd.scope.dept].leadTitle : ROLES[r].label);
  return `<div class="row wrap"><h3 style="margin:0">${esc(nd.label)}</h3><span class="badge">${{ district: 'District', school: 'School', department: 'Department', household: 'Family' }[nd.kind]}</span></div>
    <div class="list" style="margin-top:8px">${people.length ? people.map(p => {
      const st = p.student && S().students[p.student], con = st && S().consents[st.id];
      return `<div class="list-item"><div class="avatar" style="background:var(--surface-2)">${esc(p.name.replace(/^Dr\. /, '').split(' ').map(w => w[0]).join('').slice(0, 2))}</div>
        <div style="flex:1;min-width:0"><b>${esc(p.name)}</b>${p.id === u.id ? ' <span class="badge blue">You</span>' : ''}<div class="tiny muted">${roleLabel(p)}${p.age ? `, ${p.age}` : ''}${p.note ? ` · ${esc(p.note)}` : ''}</div>
        ${st ? `<div class="row wrap" style="gap:6px;margin-top:6px"><span class="badge ${faceAllowed(con) ? 'green' : ''}">${ico('face')}${faceAllowed(con) ? `Face pay: consent by ${esc(con.by)}` : 'Face pay off'}</span><span class="badge">${ico('card')}Card active</span>${(st.allergies ?? S().controls.allergies).length ? `<span class="badge red">${ico('alert')}${esc((st.allergies ?? S().controls.allergies).join(', '))}</span>` : ''}</div>` : ''}</div>
        ${checkRevoke(u, p).ok ? `<button class="btn ghost sm" data-revoke="${p.id}">${ico('x')}Remove</button>` : ''}</div>`; }).join('') : '<div class="empty small">No one at this level yet.</div>'}</div>
    ${roles.length ? `<form class="grant" id="grantForm"><div class="strong small" style="margin-bottom:8px">${nd.kind === 'household' ? 'Add a child' : 'Grant access here'}</div>
      <div class="row wrap" style="gap:8px"><input class="input" id="gName" placeholder="Full name" style="flex:1;min-width:150px" required><select class="input" id="gRole" style="width:auto">${roles.map(r => `<option value="${r}">${label(r)}</option>`).join('')}</select><button class="btn primary">${ico('plus')}Add</button></div>
      <p class="tiny muted" style="margin:8px 0 0">You can grant: ${roles.map(r => label(r).toLowerCase()).join(', ')}. Every change is logged.</p></form>`
    : `<p class="small muted" style="margin:12px 0 0">${ico('lock')} As ${esc(roleLabel(u))}, you can’t grant access here.</p>`}`;
}

function portfolio() {
  const s = S(), live = { meals: 412 + (s.todayMeal ? 1 : 0), checklist: Object.keys(s.checks).length / 5, alerts: 2, enrolledFace: Object.values(s.consents).filter(faceAllowed).length / Object.keys(s.consents).length, offlineTxns: s.settlements.reduce((a, x) => a + x.count, 0) + (s.offline?.sales.length || 0) };
  return `<div class="grid cols-3">${SCHOOL_LIST.map(sc => { const k = sc.live ? live : sc.kpi; const pr = s.users.find(u => u.role === 'school_admin' && u.scope.school === sc.id);
    return `<button class="card prop ${node === sc.id ? 'on' : ''}" data-node="${sc.id}"><div class="row"><div class="icon-tile" style="background:var(--brand-softer);color:var(--brand)">${ico('book')}</div><div style="text-align:left"><b>${esc(sc.name)}</b><div class="tiny muted">${sc.students} students</div></div>${sc.live ? '<span class="badge green" style="margin-left:auto">Live demo</span>' : ''}</div>
      <div class="facts"><div><span>Lunches today</span><b>${k.meals}</b></div><div><span>Checklist</span><b>${Math.round(k.checklist * 100)}%</b></div><div><span>Face pay enrolled</span><b>${Math.round(k.enrolledFace * 100)}%</b></div><div><span>Offline sales settled</span><b>${k.offlineTxns}</b></div></div>
      <div class="tiny muted" style="margin-top:8px;text-align:left">Principal: ${pr ? esc(pr.name) : '<span style="color:var(--danger)">vacant</span>'}</div></button>`; }).join('')}</div>`;
}

function matrix() {
  const reps = [['District officer', { role: 'district_admin', scope: {} }], ['Principal', { role: 'school_admin', scope: {} }], ['Canteen manager', { role: 'dept_lead', scope: { dept: 'counter' } }], ['Cashier', { role: 'staff', scope: { dept: 'counter' } }], ['Kitchen lead', { role: 'dept_lead', scope: { dept: 'kitchen' } }], ['Finance lead', { role: 'dept_lead', scope: { dept: 'finance' } }], ['Parent', { role: 'guardian', scope: {} }], ['Student', { role: 'student', scope: {} }]].map(([l, u]) => [l, permsOf(u)]);
  return `<div class="t-wrap"><table class="t matrix"><thead><tr><th>Can…</th>${reps.map(([l]) => `<th>${l}</th>`).join('')}</tr></thead><tbody>${CAPABILITIES.map(([k, l]) => `<tr><td>${l}</td>${reps.map(([, p]) => `<td class="c">${p.has(k) ? ico('check') : ''}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}

function paint() {
  if (!root?.isConnected) return;
  const u = viewer();
  if (!node || !visible(u, NODES[node])) node = homeNode(u);
  $('#portfolio', root).hidden = !can(u, 'portfolio.view');
  if (can(u, 'portfolio.view')) $('#portfolioBody', root).innerHTML = portfolio();
  $('#tree', root).innerHTML = tree(u);
  $('#panel', root).innerHTML = panel(u);
  $('#audit', root).innerHTML = S().audit.slice(0, 12).map(a => `<div class="list-item small"><span class="muted" style="min-width:58px">${a.t}</span><span style="flex:1"><b>${esc(a.by)}</b>: ${esc(a.text)}</span></div>`).join('');
}

export function renderOrg(el) {
  root = el; node = homeNode(viewer());
  el.innerHTML = `
  <div class="h-page"><div><h2>Organization and access</h2><p>The district oversees its schools; each school runs a canteen with checkout, kitchen and finance; each family has a parent who manages their children’s rules, allergies and face-pay consent. Everyone grants access only below their own level and inside what they manage. Every change, including consent, is logged.</p></div></div>
  <div class="card" id="portfolio" style="margin-bottom:16px"><div class="card-h"><h2>Schools</h2><span class="sub">${esc(DISTRICT.name)}</span></div><div class="card-b" id="portfolioBody"></div></div>
  <div class="grid org-layout">
    <div class="card"><div class="card-h"><h2>Structure</h2></div><div class="card-b tree" id="tree"></div></div>
    <div class="stack"><div class="card"><div class="card-b" id="panel"></div></div><div class="card"><div class="card-h"><h2>Access and consent log</h2></div><div class="card-b" id="audit"></div></div></div>
  </div>
  <div class="card" style="margin-top:16px"><div class="card-h"><h2>What each role can do</h2></div><div class="card-b">${matrix()}</div></div>`;
  el.onclick = e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.node) { node = b.dataset.node; return paint(); }
    if (b.dataset.revoke) { const r = revokeUser(viewer(), b.dataset.revoke); toast(r.ok ? 'Access removed' : r.reason, r.ok ? 'check' : 'alert'); paint(); }
  };
  el.onsubmit = e => {
    e.preventDefault();
    const r = grantUser(viewer(), { name: $('#gName', root).value, role: $('#gRole', root).value, scope: NODES[node].scope });
    toast(r.ok ? `${r.user.name} added as ${roleLabel(r.user)}` : r.reason, r.ok ? 'check' : 'alert'); paint();
  };
  paint();
}
export const repaintOrg = paint;
