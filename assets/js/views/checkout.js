// Canteen checkout: tray recognition → cashier check and corrections → allergies and parent rules →
// pay (face only with parental consent, card always, parent QR online) → receipt. Works offline.
import { money, int, esc, timeNow, rng } from '../lib/format.js';
import { $, $$, ico, toast, modal } from '../lib/ui.js';
import { update, state, activity, fmtDate, viewer, isOffline, queueSale, recordFix } from '../state.js';
import { SAMPLE_TRAYS, TARGET, DISHES, D } from '../domain/data.js';
import { drawTray, drawPhoto } from '../render/tray.js';
import { applyRules, decide } from '../domain/rules.js';
import { methodsFor } from '../domain/consent.js';
import { OFFLINE_LIMITS } from '../domain/pos.js';
import { correct, needsCheck, quality, CONFIRM_BELOW } from '../domain/recog.js';
import { can } from '../domain/org.js';
import { recognizeDemo, recognizePhoto, vision } from '../services/vision.js';
import { openSettings } from './settings.js';

let mode = 'sample', trayIdx = 0, phase = 'idle', stage = '', items = [], dets = [], photo = null, photoFit = null, err = '', paid = null, fixes = [];
const S = () => state.data;
const student = () => S().students[mode === 'sample' ? SAMPLE_TRAYS[trayIdx].student : 'mia'];
const allergiesOf = st => st.allergies ?? S().controls.allergies;
const rerule = list => applyRules(list.map(x => ({ ...x, blocked: false, why: null })), S().controls, allergiesOf(student()));

export function renderCheckout(root) {
  root.innerHTML = `
  <div class="h-page"><div><h2>Canteen checkout</h2><p>Students set their tray down; the camera recognizes each dish and the cashier confirms anything it isn’t sure about. Allergies and the parent’s rules are checked, and the right wallet is charged. Face pay only for students whose parent opted in; the card always works. If the network drops, the line keeps moving.</p></div>
    <div class="right"><div class="seg" role="group" aria-label="Input"><button data-mode="sample" aria-pressed="${mode === 'sample'}">Sample trays</button><button data-mode="photo" aria-pressed="${mode === 'photo'}">Your photo</button></div></div></div>
  <div class="kiosk">
    <div class="stack">
      <div class="card" style="padding:10px">
        <div class="camera" id="cam"><canvas id="camCanvas" aria-label="Checkout camera view"></canvas><div class="overlay" id="camOverlay"></div>
          <div class="hud"><span class="badge" id="hudNet"><span class="dot" style="color:#5BE3A1"></span>Station 2, live</span><span class="badge">Maple Street Elementary</span></div></div>
      </div>
      <div class="card"><div class="card-b" id="inputPanel"></div></div>
      <div class="card" id="qualityCard" hidden><div class="card-h"><h3>${ico('sparkles')} Recognition accuracy</h3><span class="sub">Measured from cashier corrections</span></div><div class="card-b" id="quality"></div></div>
    </div>
    <div class="stack" id="side"></div>
  </div>
  <p class="demo-note">Sample trays are recognized by a simulated detector so anyone can try the flow. “Your photo” sends a real image to a vision model using your own API key (Settings); the key stays in this tab and is never saved.</p>`;
  $$('.seg [data-mode]', root).forEach(b => b.addEventListener('click', () => { mode = b.dataset.mode; $$('.seg [data-mode]', root).forEach(x => x.setAttribute('aria-pressed', x === b)); reset(true); }));
  $('#inputPanel').addEventListener('click', onInputClick);
  $('#inputPanel').addEventListener('change', onFile);
  $('#side').addEventListener('click', onSideClick);
  reset();
  if (!window.__camResize) { window.__camResize = true; window.addEventListener('resize', () => { if ($('#camCanvas')) redrawCam(); }); }
}
export function repaintCheckout() { if ($('#side')) { paintInput(); paintOverlay(); paintSide(); paintQuality(); } }

function reset(clearPhoto = false) { phase = 'idle'; items = []; dets = []; err = ''; paid = null; fixes = []; if (clearPhoto) photo = null; paintInput(); redrawCam(); paintSide(); paintQuality(); }

function redrawCam() {
  const c = $('#camCanvas'); if (!c) return;
  if (mode === 'sample') { const t = SAMPLE_TRAYS[trayIdx]; dets = drawTray(c, t.slots, t.extras || [], 11 + trayIdx * 13); }
  else if (photo) { photoFit = drawPhoto(c, photo.img); }
  else { const ctx = c.getContext('2d'); const W = c.clientWidth, H = c.clientHeight; c.width = W; c.height = H; ctx.fillStyle = '#0F1722'; ctx.fillRect(0, 0, W, H); ctx.fillStyle = '#7C8BA0'; ctx.font = '600 15px Manrope, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('Upload a top-down photo of a lunch tray', W / 2, H / 2); }
  paintOverlay();
}

function paintOverlay() {
  const o = $('#camOverlay'); if (!o) return;
  const h = $('#hudNet'); if (h) h.innerHTML = isOffline() ? '<span class="dot" style="color:#F2B13A"></span>Station 2, offline' : '<span class="dot" style="color:#5BE3A1"></span>Station 2, live';
  if (phase === 'scanning') { o.innerHTML = '<div class="scanline"></div>'; return; }
  if (phase === 'idle' || phase === 'error') { o.innerHTML = ''; return; }
  o.innerHTML = items.map(it => { if (!it.box) return ''; let [x, y, w, h2] = it.box; if (mode === 'photo' && photoFit) { x = photoFit.ox + x * photoFit.sw; y = photoFit.oy + y * photoFit.sh; w *= photoFit.sw; h2 *= photoFit.sh; }
    return `<div class="det ${it.blocked ? 'blocked' : needsCheck(it) && !it.corrected ? 'check' : ''}" style="left:${x * 100}%;top:${y * 100}%;width:${w * 100}%;height:${h2 * 100}%"><span>${esc(it.name)} ${it.corrected ? '✓' : Math.round(it.conf * 100) + '%'}</span></div>`; }).join('');
}

function paintInput() {
  const p = $('#inputPanel'); if (!p) return;
  if (mode === 'sample') {
    p.innerHTML = `<div class="row between" style="margin-bottom:10px"><div class="strong">Next in line</div><span class="small muted">Pick a tray, then scan it</span></div>
      <div class="samples" role="group" aria-label="Sample trays">${SAMPLE_TRAYS.map((t, i) => `<button class="sample" data-tray="${i}" aria-pressed="${i === trayIdx}"><canvas data-tray-thumb="${i}"></canvas>${esc(t.label)}</button>`).join('')}</div>
      <button class="btn primary lg block" data-scan style="margin-top:12px" ${phase === 'scanning' ? 'disabled' : ''}>${ico('scan')}Scan tray</button>`;
    $$('[data-tray-thumb]', p).forEach(c => { const t = SAMPLE_TRAYS[+c.dataset.trayThumb]; drawTray(c, t.slots, t.extras || [], 11 + +c.dataset.trayThumb * 13); });
  } else {
    const off = isOffline();
    p.innerHTML = `<div class="row between" style="margin-bottom:10px"><div class="strong">Your photo</div><span class="badge ${off ? 'amber' : vision.apiKey ? 'green' : 'amber'}">${off ? 'Needs a connection' : vision.apiKey ? 'Vision model connected' : 'No API key yet'}</span></div>
      <label class="btn secondary block" style="cursor:pointer">${ico('upload')}Choose a photo<input type="file" accept="image/*" id="photoInput" hidden></label>
      <div class="row" style="margin-top:10px"><button class="btn primary lg" data-scan style="flex:1" ${!photo || phase === 'scanning' || off ? 'disabled' : ''}>${ico('sparkles')}Recognize with AI</button>${vision.apiKey ? '' : `<button class="btn ghost" data-settings>${ico('key')}Add key</button>`}</div>
      <p class="small muted" style="margin:10px 0 0">${off ? 'Photo recognition uses a cloud model, so it waits for the connection. Sample trays use the on-device detector and keep working offline.' : 'Works best with a top-down photo of one tray or plate. Items are matched to the canteen’s dish library when possible; otherwise the model’s own estimate is used.'}</p>`;
  }
}

function paintQuality() {
  const card = $('#qualityCard'); if (!card) return;
  card.hidden = !can(viewer(), 'recog.view');
  if (card.hidden) return;
  const q = quality(S().recogFixes, S().recogItems);
  $('#quality').innerHTML = `<div class="grid cols-3"><div class="mini"><span>Items right first time</span><b>${(q.itemAccuracy * 100).toFixed(1)}%</b></div><div class="mini"><span>Wrong dish</span><b>${(q.wrongDish * 100).toFixed(1)}%</b></div><div class="mini"><span>Missed items</span><b>${(q.missed * 100).toFixed(1)}%</b></div></div>
    <div class="small" style="margin-top:12px"><b>Most often confused</b>${q.top.map(t => `<div class="row between" style="padding:4px 0;border-bottom:1px solid var(--border)"><span>${esc(t.from)} → ${esc(t.to)}</span><span class="num muted">${t.count}</span></div>`).join('')}</div>
    <p class="tiny muted" style="margin:10px 0 0">${int(q.trays)} trays in the last 30 days. ${int(q.retrain)} corrected tray images are queued for the next retraining run. Items under ${Math.round(CONFIRM_BELOW * 100)}% confidence are highlighted for the cashier.</p>
    ${S().recogFixes.length ? `<div class="small" style="margin-top:10px"><b>Corrections this session</b>${S().recogFixes.slice(0, 4).map(f => `<div class="tiny muted">${f.t} · ${esc(f.by)}: ${f.kind === 'swap' ? `${esc(f.fromName)} → ${esc(f.toName)}` : f.kind === 'remove' ? `removed ${esc(f.fromName)}` : `added ${esc(f.toName)}`}</div>`).join('')}</div>` : ''}`;
}

function paintSide() {
  const side = $('#side'); if (!side) return;
  const st = student();
  if (phase === 'idle') { side.innerHTML = `<div class="card"><div class="card-b"><div class="empty">${ico('camera', '')}<div class="strong" style="color:var(--ink);margin-top:8px">Waiting for a tray</div><div class="small">${mode === 'sample' ? 'Pick a sample tray and press Scan tray.' : 'Upload a photo and press Recognize with AI.'}</div></div></div></div>${rulesCard()}`; $$('#side .empty svg').forEach(s => { s.style.width = '32px'; s.style.height = '32px'; }); return; }
  if (phase === 'scanning') { side.innerHTML = `<div class="card"><div class="card-b"><div class="processing"><div class="spinner"></div><div class="strong">${esc(stage)}</div><div class="small muted">${mode === 'sample' ? 'On-device detector' : esc(vision.model)}</div></div></div></div>${rulesCard()}`; return; }
  if (phase === 'error') { side.innerHTML = `<div class="card"><div class="card-b"><div class="row" style="align-items:flex-start"><span style="color:var(--danger)">${ico('alert')}</span><div><div class="strong">Couldn't recognize this photo</div><div class="small muted">${esc(err)}</div></div></div><div class="row" style="margin-top:12px"><button class="btn secondary" data-retry>Try again</button>${vision.apiKey ? '' : `<button class="btn primary" data-settings>${ico('key')}Add API key</button>`}</div></div></div>`; return; }
  if (phase === 'paid') { side.innerHTML = receiptCard(); return; }
  const off = isOffline(), canFix = can(viewer(), 'recog.correct'), canPayHere = can(viewer(), 'checkout.run');
  const { blocked, t: tot, overLimit, short, canPay } = decide(items, S().controls, off ? S().offline.cachedBalance : S().wallet.balance);
  const unsure = items.filter(i => needsCheck(i) && !i.corrected);
  const totM = tot.p * 4 + tot.c * 4 + tot.f * 9 || 1;
  const m = methodsFor(S().consents[st.id], !off);
  const btn = (k, cls, icon, label) => { const ok = canPay && canPayHere && m[k].ok; return `<button class="btn lg ${cls} paybtn" data-pay="${k}" ${ok ? '' : 'disabled'}>${ico(icon)}<span>${label}${!m[k].ok ? `<small>${esc(m[k].reason)}</small>` : ''}</span></button>`; };
  side.innerHTML = `
  <div class="card"><div class="card-h"><h2>Tray</h2><span class="sub">${esc(st.name)}, ${items.length} item${items.length !== 1 ? 's' : ''}</span><div class="right"><button class="btn ghost sm" data-retry>${ico('refresh')}Rescan</button></div></div>
    <div class="card-b">${unsure.length ? `<div class="row" style="background:var(--warn-soft);border-radius:10px;padding:8px 12px;margin-bottom:8px"><span style="color:var(--warn)">${ico('alert')}</span><div class="small">The camera isn’t sure about <b>${unsure.map(u => esc(u.name)).join(', ')}</b>. Check ${unsure.length > 1 ? 'them' : 'it'} against the tray.</div></div>` : ''}
      ${items.map((it, i) => `<div class="item-row ${needsCheck(it) && !it.corrected ? 'unsure' : ''}"><div style="min-width:0"><div class="strong small">${esc(it.name)} ${it.blocked ? `<span class="badge red">${it.why.kind === 'allergen' ? ico('alert') : ico('lock')}${esc(it.why.text)}</span>` : ''}${it.corrected ? '<span class="badge blue">Corrected</span>' : ''}${mode === 'photo' && !it.matched ? '<span class="badge">Model estimate</span>' : ''}${it.allergensUnknown ? '<span class="badge amber">Allergens unknown, check by eye</span>' : ''}</div><div class="tiny muted">${it.grams ? it.grams + ' g, ' : ''}${int(it.kcal)} kcal, ${it.p} g protein</div>${it.corrected ? '' : `<div class="conf" title="Confidence ${Math.round(it.conf * 100)}%"><i style="width:${it.conf * 100}%;${needsCheck(it) ? 'background:var(--warn)' : ''}"></i></div>`}</div><div class="strong small num">${money(it.price)}</div>${canFix ? `<button class="btn ghost sm" data-fix="${i}">Fix</button>` : '<span></span>'}</div>`).join('')}
      ${canFix ? `<button class="btn ghost sm" data-add style="margin-top:6px">${ico('plus')}Add a missed item</button>` : ''}
      ${blocked.length ? `<div class="row" style="background:var(--danger-soft);border-radius:10px;padding:10px 12px;margin-top:10px;align-items:flex-start"><span style="color:var(--danger)">${ico('lock')}</span><div class="small">${blocked.map(b => `<b>${esc(b.name)}</b>: ${esc(b.why.text.charAt(0).toLowerCase() + b.why.text.slice(1))}${b.why.kind === 'allergen' ? `, ${esc(st.name.split(' ')[0])}'s allergy` : ''}.`).join('<br>')} Ask the student to put ${blocked.length > 1 ? 'them' : 'it'} back; ${blocked.length > 1 ? 'they are' : 'it is'} not charged.</div></div>` : ''}
      <div class="divider"></div>
      <div class="row between"><span class="strong">Total</span><span class="strong num" style="font-size:22px">${money(tot.price)}</span></div>
      <div class="row between small muted"><span>${int(tot.kcal)} kcal, ${tot.p} g protein</span><span>${tot.kcal >= TARGET.kcalMin && tot.kcal <= TARGET.kcalMax ? 'Within lunch target' : tot.kcal < TARGET.kcalMin ? 'Below lunch target' : 'Above lunch target'}</span></div>
      <div class="macro-bar" style="margin-top:10px" aria-hidden="true"><i style="width:${tot.p * 4 / totM * 100}%;background:var(--protein)"></i><i style="width:${tot.c * 4 / totM * 100}%;background:var(--carbs)"></i><i style="width:${tot.f * 9 / totM * 100}%;background:var(--fat)"></i></div>
    </div></div>
  <div class="card"><div class="card-h"><h2>Pay</h2><span class="sub">${off ? 'Offline: saved on this terminal, settles later' : 'Charged to the family wallet'}</span></div><div class="card-b">
    ${!canPayHere ? `<p class="small muted" style="margin-top:0">${ico('lock')} Only checkout staff can take payments. You’re viewing as ${esc(viewer().name)}.</p>` : ''}
    ${off ? `<p class="small" style="margin-top:0;color:var(--warn)">Offline limits: ${money(OFFLINE_LIMITS.perSale)} per sale, ${money(OFFLINE_LIMITS.perStudent)} per student until the connection is back.</p>` : ''}
    ${overLimit ? `<p class="small" style="color:var(--danger);margin-top:0">${money(tot.price)} is over the daily limit of ${money(S().controls.dailyLimit)}. Remove an item to continue.</p>` : ''}
    ${short && !overLimit ? `<p class="small" style="color:var(--danger);margin-top:0">Not enough in the wallet${off ? ' saved on this terminal' : ''}.</p>` : ''}
    <div class="grid cols-3">${btn('face', 'primary', 'face', 'Face')}${btn('card', 'secondary', 'card', 'Card')}${btn('qr', 'secondary', 'qr', 'Parent QR')}</div></div></div>
  ${rulesCard()}`;
}

function rulesCard() {
  const c = S().controls, st = student(), al = allergiesOf(st), con = S().consents[st.id];
  return `<div class="card"><div class="card-h"><h3>${esc(st.name.split(' ')[0])}'s rules</h3><span class="sub">Set by ${st.id === 'leo' ? 'his' : 'her'} parent in the family app</span></div><div class="card-b small">
    <div class="row between"><span>Allergies</span><b>${al.length ? esc(al.join(', ')) : 'None'}</b></div>
    <div class="row between"><span>Daily limit</span><b>${money(c.dailyLimit)}</b></div>
    <div class="row between"><span>Desserts / sugary drinks</span><b>${c.blockDessert ? 'Blocked' : 'Allowed'} / ${c.blockSugary ? 'Blocked' : 'Allowed'}</b></div>
    <div class="row between"><span>Face pay</span><b>${con?.status === 'granted' ? `Enrolled by ${esc(con.by)}` : con?.status === 'revoked' ? 'Withdrawn by parent' : 'Not enrolled'}</b></div>
    <div class="row between"><span>Wallet balance</span><b class="num">${money(isOffline() ? S().offline.cachedBalance : S().wallet.balance)}${isOffline() ? ' (saved)' : ''}</b></div></div></div>`;
}

function receiptCard() {
  const p = paid;
  return `<div class="card"><div class="card-b"><div class="processing" style="padding:10px 0 14px"><div class="success-check" ${p.offline ? 'style="background:var(--warn)"' : ''}>${ico(p.offline ? 'clock' : 'check')}</div><div class="strong" style="font-size:18px">${p.offline ? 'Saved, enjoy your lunch' : 'Paid, enjoy your lunch'}</div><div class="small muted">${esc(p.student)}, paid with ${p.method.toLowerCase()}${p.offline ? '. Saved on this terminal; it settles when the connection is back.' : ''}</div></div>
  <div class="receipt">${p.items.map(i => `<div class="line"><span>${esc(i.name)}</span><span class="num">${money(i.price)}</span></div>`).join('')}${p.blocked.map(i => `<div class="line muted"><span><s>${esc(i.name)}</s> ${i.why.kind === 'allergen' ? 'allergen' : 'blocked'}</span><span>${money(0)}</span></div>`).join('')}
  <div class="line total"><span>Total</span><span class="num">${money(p.total)}</span></div>${p.offline ? '' : `<div class="line small muted"><span>Wallet balance</span><span class="num">${money(S().wallet.balance)}</span></div>`}<div class="line small muted"><span>Nutrition</span><span>${int(p.kcal)} kcal, ${p.p} g protein</span></div></div>
  <div class="row" style="margin-top:14px"><button class="btn primary" data-next style="flex:1">Next tray</button><a class="btn secondary" href="#/family">${ico('home')}See parent app</a></div></div></div>`;
}

async function scan() {
  phase = 'scanning'; stage = 'Starting'; fixes = []; paintInput(); paintOverlay(); paintSide();
  try {
    const onStage = s => { stage = s; paintSide(); };
    const raw = mode === 'sample' ? await recognizeDemo(dets, onStage) : await recognizePhoto(photo.dataUrl, onStage);
    if (!raw.length) throw new Error('No food items were found in the photo.');
    items = rerule(raw); phase = 'recognized';
  } catch (e) { err = e.message || String(e); phase = 'error'; }
  paintInput(); paintOverlay(); paintSide();
}

function onInputClick(e) {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.tray) { trayIdx = +b.dataset.tray; reset(); return; }
  if (b.hasAttribute('data-scan')) scan();
  if (b.hasAttribute('data-settings')) openSettings(() => { paintInput(); paintSide(); });
}
function onFile(e) {
  if (e.target.id !== 'photoInput' || !e.target.files[0]) return;
  const f = e.target.files[0]; if (f.size > 8 * 1024 * 1024) { toast('That photo is over 8 MB. Choose a smaller one.', 'alert'); return; }
  const r = new FileReader(); r.onload = () => { const img = new Image(); img.onload = () => {
    const s = Math.min(1, 1280 / Math.max(img.width, img.height)); const c = document.createElement('canvas'); c.width = img.width * s; c.height = img.height * s; c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    photo = { img, dataUrl: c.toDataURL('image/jpeg', .85) }; phase = 'idle'; items = []; redrawCam(); paintInput(); paintSide(); }; img.src = r.result; }; r.readAsDataURL(f);
}

function applyFix(fix) {
  const r = correct(items, fix);
  items = rerule(r.items); fixes.push(r.rec); recordFix(r.rec);
  paintOverlay(); paintSide(); paintQuality();
  toast(r.rec.kind === 'swap' ? `Changed to ${r.rec.toName}. Saved for retraining.` : r.rec.kind === 'remove' ? `Removed ${r.rec.fromName}. Saved for retraining.` : `Added ${r.rec.toName}. Saved for retraining.`, 'sparkles');
}

function dishPicker(title, current, onPick, { allowRemove = false } = {}) {
  const cur = current ? D[current.id] : null;
  const order = [...DISHES].sort((a, b) => (cur && b.type === cur.type) - (cur && a.type === cur.type) || a.name.localeCompare(b.name));
  modal(title, `<div class="stack" style="gap:10px">${current ? `<div class="small muted">Camera said <b>${esc(current.name)}</b> (${Math.round(current.conf * 100)}%).</div>` : ''}
    ${allowRemove ? `<button class="btn secondary" data-remove>${ico('x')}Not on the tray</button>` : ''}
    <div class="dish-grid">${order.filter(d => !cur || d.id !== cur.id).map(d => `<button class="dish-pick ${cur && d.type === cur.type ? 'same' : ''}" data-to="${d.id}"><b>${esc(d.name)}</b><span>${money(d.price)}</span></button>`).join('')}</div></div>`, {
    width: 560,
    onMount(m, close) { m.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; if (b.dataset.to) { close(); onPick({ to: b.dataset.to }); } if (b.hasAttribute('data-remove')) { close(); onPick({ remove: true }); } }); },
  });
}

function onSideClick(e) {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.fix !== undefined) { const i = +b.dataset.fix; return dishPicker('Fix this item', items[i], r => applyFix(r.remove ? { kind: 'remove', index: i } : { kind: 'swap', index: i, to: r.to }), { allowRemove: true }); }
  if (b.hasAttribute('data-add')) return dishPicker('Add a missed item', null, r => applyFix({ kind: 'add', to: r.to }));
  if (b.hasAttribute('data-retry')) { if (mode === 'sample' || photo) scan(); else reset(); return; }
  if (b.hasAttribute('data-settings')) { openSettings(() => { paintInput(); paintSide(); }); return; }
  if (b.hasAttribute('data-next')) { trayIdx = (trayIdx + 1) % SAMPLE_TRAYS.length; reset(); return; }
  if (b.dataset.pay) pay(b.dataset.pay);
}

function pay(method) {
  const label = { face: 'Face', card: 'Student card', qr: 'Parent QR' }[method], st = student();
  const body = method === 'face' ? `<div class="face-scan"><svg class="face" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><circle cx="12" cy="9" r="4.2"/><path d="M4.5 21a7.5 7.5 0 0 1 15 0"/></svg><div class="ringp"></div></div><p class="strong" style="text-align:center;margin:14px 0 2px" id="payStatus">Look at the camera</p><p class="small muted" style="text-align:center;margin:0" id="paySub">Matching only against students whose parents opted in${isOffline() ? ' (on this terminal)' : ''}</p>`
    : method === 'card' ? `<div class="processing"><div class="icon-tile" style="width:72px;height:72px;border-radius:18px;background:var(--info-soft);color:var(--info)">${ico('card')}</div><p class="strong" id="payStatus" style="margin:0">Tap the student card on the reader</p><p class="small muted" id="paySub" style="margin:0">NFC reader, station 2</p></div>`
    : `<div style="display:grid;justify-items:center;gap:10px">${qrSvg()}<p class="strong" id="payStatus" style="margin:0">Scan with the family app</p><p class="small muted" id="paySub" style="margin:0;text-align:center">For students who forgot their card, a parent can approve from their phone</p></div>`;
  const close = modal(`Pay with ${label}`, body, { width: 420 });
  const stEl = () => $('#payStatus'), sub = () => $('#paySub');
  setTimeout(() => { if (!stEl()) return; stEl().textContent = method === 'face' ? `Matched: ${st.name}, ${st.grade}` : method === 'card' ? `Card read: ${st.name}, ${st.grade}` : 'Approved by Lin Zhou on her phone'; sub().textContent = isOffline() ? 'Saving on this terminal…' : 'Charging the family wallet…'; }, 1300);
  setTimeout(() => { close(); complete(label); }, 2300);
}

function complete(method) {
  const st = student();
  const { allowed, blocked, t } = decide(items, S().controls, isOffline() ? S().offline.cachedBalance : S().wallet.balance);
  if (isOffline()) {
    const r = queueSale({ studentId: st.id, studentName: st.name, items: allowed.map(i => i.name), total: t.price, method: method === 'Face' ? 'face' : method === 'Student card' ? 'card' : 'qr' });
    if (!r.ok) { toast(r.reason, 'alert'); return; }
    activity('clock', 'blue', `<b>${esc(st.name)}</b> had lunch (${money(t.price)}) while the counter was offline. It will be charged when the terminal reconnects.`);
  } else {
    const ids = allowed.map(i => i.id || i.name);
    update(s => {
      s.wallet.balance -= t.price; s.recogItems += items.length;
      s.txns.unshift({ id: 'x' + Date.now(), date: fmtDate(new Date()), title: 'Lunch at checkout', detail: `${st.name}: ${allowed.map(i => i.name).join(', ')}`, amt: -t.price, kind: 'counter' });
      blocked.forEach(b => s.txns.unshift({ id: 'xb' + Date.now() + b.name, date: fmtDate(new Date()), title: 'Blocked at checkout', detail: `${b.name}: ${b.why.text.toLowerCase()}`, amt: 0, kind: 'blocked' }));
      if (st.id === 'mia') s.todayMeal = { date: fmtDate(new Date()), time: timeNow(), items: ids, kcal: t.kcal, p: t.p, c: t.c, f: t.f, price: t.price, source: mode === 'sample' ? 'Recognized at checkout' : 'Recognized from your photo by the vision model' };
      if (s.controls.autoTopup && s.wallet.balance < s.controls.lowBalance) { s.wallet.balance += 40; s.txns.unshift({ id: 'xa' + Date.now(), date: fmtDate(new Date()), title: 'Auto top-up', detail: 'Bank account ending 4021', amt: 40, kind: 'topup' }); }
    });
    activity('scan', 'green', `<b>${esc(st.name)} paid ${money(t.price)}</b> at checkout with ${method.toLowerCase()}: ${esc(allowed.map(i => i.name).join(', '))}. ${int(t.kcal)} kcal, ${t.p} g protein.${fixes.length ? ` The cashier corrected ${fixes.length} item${fixes.length > 1 ? 's' : ''}.` : ''}`);
  }
  if (blocked.length) activity(blocked.some(b => b.why.kind === 'allergen') ? 'alert' : 'lock', 'red', `<b>Blocked at checkout</b>: ${blocked.map(b => `${esc(b.name)} (${esc(b.why.text.toLowerCase())})`).join(', ')}. Not charged.`);
  paid = { method, items: allowed, blocked, total: t.price, kcal: t.kcal, p: t.p, student: st.name, offline: isOffline() };
  phase = 'paid'; paintSide(); paintQuality();
  toast(isOffline() ? `Saved ${money(t.price)} for ${st.name}. Settles when back online.` : `Charged ${money(t.price)} for ${st.name}`, isOffline() ? 'clock' : 'check');
}

function qrSvg() { const r = rng(99); let cells = ''; const n = 25, s = 7; for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { const finder = (x < 7 && y < 7) || (x > 17 && y < 7) || (x < 7 && y > 17); if (finder) continue; if (r() < .45) cells += `<rect x="${x * s}" y="${y * s}" width="${s}" height="${s}"/>`; }
  const f = (x, y) => `<rect x="${x * s}" y="${y * s}" width="${7 * s}" height="${7 * s}"/><rect x="${(x + 1) * s}" y="${(y + 1) * s}" width="${5 * s}" height="${5 * s}" fill="#fff"/><rect x="${(x + 2) * s}" y="${(y + 2) * s}" width="${3 * s}" height="${3 * s}"/>`;
  return `<svg width="190" height="190" viewBox="-7 -7 189 189" role="img" aria-label="Payment QR code"><rect x="-7" y="-7" width="189" height="189" fill="#fff"/><g fill="#1A2230">${cells}${f(0, 0)}${f(18, 0)}${f(0, 18)}</g></svg>`; }
