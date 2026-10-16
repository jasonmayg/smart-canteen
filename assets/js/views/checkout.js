// Canteen checkout: tray recognition -> nutrition -> parental rules -> pay (face / card / parent QR) -> receipt.
import { $, $$, money, int, esc, ico, update, state, toast, activity, modal, timeNow, rng } from '../core.js';
import { SAMPLE_TRAYS, CHILD, TARGET } from '../data.js';
import { drawTray, drawPhoto } from '../tray.js';
import { recognizeDemo, recognizePhoto, vision } from '../vision.js';
import { fmtDate } from '../store.js';
import { openSettings } from '../main.js';

let mode = 'sample', trayIdx = 0, phase = 'idle', stage = '', items = [], dets = [], photo = null, photoFit = null, err = '', paid = null;
const S = () => state.data;

export function renderCheckout(root) {
  root.innerHTML = `
  <div class="h-page"><div><h2>Canteen checkout</h2><p>Students set their tray down; the camera recognizes each dish, works out portions and nutrition, checks the parent's rules, and charges the right wallet. No cashier, no lunch cards.</p></div>
    <div class="right"><div class="seg" role="group" aria-label="Input"><button data-mode="sample" aria-pressed="${mode === 'sample'}">Sample trays</button><button data-mode="photo" aria-pressed="${mode === 'photo'}">Your photo</button></div></div></div>
  <div class="kiosk">
    <div class="stack">
      <div class="card" style="padding:10px">
        <div class="camera" id="cam"><canvas id="camCanvas" aria-label="Checkout camera view"></canvas><div class="overlay" id="camOverlay"></div>
          <div class="hud"><span class="badge"><span class="dot" style="color:#5BE3A1"></span>Station 2, live</span><span class="badge">${CHILD.school}</span></div></div>
      </div>
      <div class="card"><div class="card-b" id="inputPanel"></div></div>
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

function reset(clearPhoto = false) { phase = 'idle'; items = []; dets = []; err = ''; paid = null; if (clearPhoto) photo = null; paintInput(); redrawCam(); paintSide(); }

function redrawCam() {
  const c = $('#camCanvas'); if (!c) return;
  if (mode === 'sample') { const t = SAMPLE_TRAYS[trayIdx]; dets = drawTray(c, t.slots, t.extras || [], 11 + trayIdx * 13); }
  else if (photo) { photoFit = drawPhoto(c, photo.img); }
  else { const ctx = c.getContext('2d'); const W = c.clientWidth, H = c.clientHeight; c.width = W; c.height = H; ctx.fillStyle = '#0F1722'; ctx.fillRect(0, 0, W, H); ctx.fillStyle = '#7C8BA0'; ctx.font = '600 15px Manrope, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('Upload a top-down photo of a lunch tray', W / 2, H / 2); }
  paintOverlay();
}

function paintOverlay() {
  const o = $('#camOverlay'); if (!o) return;
  if (phase === 'scanning') { o.innerHTML = '<div class="scanline"></div>'; return; }
  if (phase === 'idle' || phase === 'error') { o.innerHTML = ''; return; }
  o.innerHTML = items.map(it => { if (!it.box) return ''; let [x, y, w, h] = it.box; if (mode === 'photo' && photoFit) { x = photoFit.ox + x * photoFit.sw; y = photoFit.oy + y * photoFit.sh; w *= photoFit.sw; h *= photoFit.sh; }
    return `<div class="det ${it.blocked ? 'blocked' : ''}" style="left:${x * 100}%;top:${y * 100}%;width:${w * 100}%;height:${h * 100}%"><span>${esc(it.name)} ${Math.round(it.conf * 100)}%</span></div>`; }).join('');
}

function paintInput() {
  const p = $('#inputPanel'); if (!p) return;
  if (mode === 'sample') {
    p.innerHTML = `<div class="row between" style="margin-bottom:10px"><div class="strong">Next in line</div><span class="small muted">Pick a tray, then scan it</span></div>
      <div class="samples" role="group" aria-label="Sample trays">${SAMPLE_TRAYS.map((t, i) => `<button class="sample" data-tray="${i}" aria-pressed="${i === trayIdx}"><canvas data-tray-thumb="${i}"></canvas>${esc(t.label)}</button>`).join('')}</div>
      <button class="btn primary lg block" data-scan style="margin-top:12px" ${phase === 'scanning' ? 'disabled' : ''}>${ico('scan')}Scan tray</button>`;
    $$('[data-tray-thumb]', p).forEach(c => { const t = SAMPLE_TRAYS[+c.dataset.trayThumb]; drawTray(c, t.slots, t.extras || [], 11 + +c.dataset.trayThumb * 13); });
  } else {
    p.innerHTML = `<div class="row between" style="margin-bottom:10px"><div class="strong">Your photo</div><span class="badge ${vision.apiKey ? 'green' : 'amber'}">${vision.apiKey ? 'Vision model connected' : 'No API key yet'}</span></div>
      <label class="btn secondary block" style="cursor:pointer">${ico('upload')}Choose a photo<input type="file" accept="image/*" id="photoInput" hidden></label>
      <div class="row" style="margin-top:10px"><button class="btn primary lg" data-scan style="flex:1" ${!photo || phase === 'scanning' ? 'disabled' : ''}>${ico('sparkles')}Recognize with AI</button>${vision.apiKey ? '' : `<button class="btn ghost" data-settings>${ico('key')}Add key</button>`}</div>
      <p class="small muted" style="margin:10px 0 0">Works best with a top-down photo of one tray or plate. Items are matched to the canteen's dish library when possible; otherwise the model's own estimate is used.</p>`;
  }
}

function paintSide() {
  const side = $('#side'); if (!side) return;
  if (phase === 'idle') { side.innerHTML = `<div class="card"><div class="card-b"><div class="empty">${ico('camera', '')}<div class="strong" style="color:var(--ink);margin-top:8px">Waiting for a tray</div><div class="small">${mode === 'sample' ? 'Pick a sample tray and press Scan tray.' : 'Upload a photo and press Recognize with AI.'}</div></div></div></div>${rulesCard()}`; $$('#side .empty svg').forEach(s => { s.style.width = '32px'; s.style.height = '32px'; }); return; }
  if (phase === 'scanning') { side.innerHTML = `<div class="card"><div class="card-b"><div class="processing"><div class="spinner"></div><div class="strong">${esc(stage)}</div><div class="small muted">${mode === 'sample' ? 'On-device detector' : esc(vision.model)}</div></div></div></div>${rulesCard()}`; return; }
  if (phase === 'error') { side.innerHTML = `<div class="card"><div class="card-b"><div class="row" style="align-items:flex-start"><span style="color:var(--danger)">${ico('alert')}</span><div><div class="strong">Couldn't recognize this photo</div><div class="small muted">${esc(err)}</div></div></div><div class="row" style="margin-top:12px"><button class="btn secondary" data-retry>Try again</button>${vision.apiKey ? '' : `<button class="btn primary" data-settings>${ico('key')}Add API key</button>`}</div></div></div>`; return; }
  if (phase === 'paid') { side.innerHTML = receiptCard(); return; }
  // recognized
  const allowed = items.filter(i => !i.blocked); const tot = sum(allowed); const blocked = items.filter(i => i.blocked);
  const overLimit = tot.price > S().controls.dailyLimit; const short = tot.price > S().wallet.balance;
  const totM = tot.p * 4 + tot.c * 4 + tot.f * 9 || 1;
  side.innerHTML = `
  <div class="card"><div class="card-h"><h2>Tray</h2><span class="sub">${items.length} item${items.length !== 1 ? 's' : ''} recognized</span><div class="right"><button class="btn ghost sm" data-retry>${ico('refresh')}Rescan</button></div></div>
    <div class="card-b">${items.map((it, i) => `<div class="item-row"><div style="min-width:0"><div class="strong small">${esc(it.name)} ${it.blocked ? '<span class="badge red">Blocked by parent</span>' : ''}${mode === 'photo' && !it.matched ? '<span class="badge">Model estimate</span>' : ''}</div><div class="tiny muted">${it.grams ? it.grams + ' g, ' : ''}${int(it.kcal)} kcal, ${it.p} g protein</div><div class="conf" title="Confidence ${Math.round(it.conf * 100)}%"><i style="width:${it.conf * 100}%"></i></div></div><div class="strong small num">${money(it.price)}</div><button class="btn icon ghost" data-remove="${i}" aria-label="Remove ${esc(it.name)}">${ico('x')}</button></div>`).join('')}
      ${blocked.length ? `<div class="row" style="background:var(--danger-soft);border-radius:10px;padding:10px 12px;margin-top:10px;align-items:flex-start"><span style="color:var(--danger)">${ico('lock')}</span><div class="small"><b>${blocked.map(b => esc(b.name)).join(' and ')}</b> ${blocked.length > 1 ? 'are' : 'is'} blocked by ${CHILD.name}'s parent. Ask the student to put ${blocked.length > 1 ? 'them' : 'it'} back; ${blocked.length > 1 ? 'they are' : 'it is'} not charged.</div></div>` : ''}
      <div class="divider"></div>
      <div class="row between"><span class="strong">Total</span><span class="strong num" style="font-size:22px">${money(tot.price)}</span></div>
      <div class="row between small muted"><span>${int(tot.kcal)} kcal, ${tot.p} g protein</span><span>${tot.kcal >= TARGET.kcalMin && tot.kcal <= TARGET.kcalMax ? 'Within lunch target' : tot.kcal < TARGET.kcalMin ? 'Below lunch target' : 'Above lunch target'}</span></div>
      <div class="macro-bar" style="margin-top:10px" aria-hidden="true"><i style="width:${tot.p * 4 / totM * 100}%;background:var(--protein)"></i><i style="width:${tot.c * 4 / totM * 100}%;background:var(--carbs)"></i><i style="width:${tot.f * 9 / totM * 100}%;background:var(--fat)"></i></div>
      <div class="legend" style="margin-top:6px"><span><i style="background:var(--protein)"></i>Protein</span><span><i style="background:var(--carbs)"></i>Carbs</span><span><i style="background:var(--fat)"></i>Fat</span></div>
    </div></div>
  <div class="card"><div class="card-h"><h2>Pay</h2><span class="sub">Charged to the student's wallet</span></div><div class="card-b">
    ${overLimit ? `<p class="small" style="color:var(--danger);margin-top:0">${money(tot.price)} is over ${CHILD.name}'s daily limit of ${money(S().controls.dailyLimit)}. Remove an item to continue.</p>` : ''}
    ${short && !overLimit ? `<p class="small" style="color:var(--danger);margin-top:0">Not enough in the wallet (${money(S().wallet.balance)}).</p>` : ''}
    <div class="grid cols-3">
      <button class="btn lg primary" data-pay="face" ${overLimit || short || !allowed.length ? 'disabled' : ''}>${ico('face')}Face</button>
      <button class="btn lg secondary" data-pay="card" ${overLimit || short || !allowed.length ? 'disabled' : ''}>${ico('card')}Card</button>
      <button class="btn lg secondary" data-pay="qr" ${overLimit || short || !allowed.length ? 'disabled' : ''}>${ico('qr')}Parent QR</button>
    </div></div></div>
  ${rulesCard()}`;
}

function rulesCard() { const c = S().controls; return `<div class="card"><div class="card-h"><h3>${CHILD.name}'s rules</h3><span class="sub">Set by her parent in the family app</span></div><div class="card-b small"><div class="row between"><span>Daily limit</span><b>${money(c.dailyLimit)}</b></div><div class="row between"><span>Desserts</span><b>${c.blockDessert ? 'Blocked' : 'Allowed'}</b></div><div class="row between"><span>Sugary drinks</span><b>${c.blockSugary ? 'Blocked' : 'Allowed'}</b></div><div class="row between"><span>Wallet balance</span><b class="num">${money(S().wallet.balance)}</b></div></div></div>`; }

function receiptCard() {
  const p = paid; return `<div class="card"><div class="card-b"><div class="processing" style="padding:10px 0 14px"><div class="success-check">${ico('check')}</div><div class="strong" style="font-size:18px">Paid, enjoy your lunch</div><div class="small muted">${CHILD.name} ${CHILD.last}, ${CHILD.grade}, paid with ${p.method.toLowerCase()}</div></div>
  <div class="receipt">${p.items.map(i => `<div class="line"><span>${esc(i.name)}</span><span class="num">${money(i.price)}</span></div>`).join('')}${p.blocked.map(i => `<div class="line muted"><span><s>${esc(i.name)}</s> blocked</span><span>${money(0)}</span></div>`).join('')}
  <div class="line total"><span>Total</span><span class="num">${money(p.total)}</span></div><div class="line small muted"><span>Wallet balance</span><span class="num">${money(S().wallet.balance)}</span></div><div class="line small muted"><span>Nutrition</span><span>${int(p.kcal)} kcal, ${p.p} g protein</span></div></div>
  <div class="row" style="margin-top:14px"><button class="btn primary" data-next style="flex:1">Next tray</button><a class="btn secondary" href="#/family">${ico('home')}See parent app</a></div></div></div>`;
}

const sum = arr => arr.reduce((a, i) => { a.price += i.price; a.kcal += i.kcal; a.p += i.p; a.c += i.c; a.f += i.f; return a; }, { price: 0, kcal: 0, p: 0, c: 0, f: 0 });

function applyRules(list) { const c = S().controls; return list.map(it => ({ ...it, blocked: (c.blockDessert && it.tags.includes('dessert')) || (c.blockSugary && it.tags.includes('sugary')) })); }

async function scan() {
  phase = 'scanning'; stage = 'Starting'; paintInput(); paintOverlay(); paintSide();
  try {
    const onStage = s => { stage = s; paintSide(); };
    const raw = mode === 'sample' ? await recognizeDemo(dets, onStage) : await recognizePhoto(photo.dataUrl, onStage);
    if (!raw.length) throw new Error('No food items were found in the photo.');
    items = applyRules(raw); phase = 'recognized';
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
    // downscale to keep the request small
    const s = Math.min(1, 1280 / Math.max(img.width, img.height)); const c = document.createElement('canvas'); c.width = img.width * s; c.height = img.height * s; c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    photo = { img, dataUrl: c.toDataURL('image/jpeg', .85) }; phase = 'idle'; items = []; redrawCam(); paintInput(); paintSide(); }; img.src = r.result; }; r.readAsDataURL(f);
}
function onSideClick(e) {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.remove !== undefined) { items.splice(+b.dataset.remove, 1); paintOverlay(); paintSide(); return; }
  if (b.hasAttribute('data-retry')) { if (mode === 'sample' || photo) scan(); else reset(); return; }
  if (b.hasAttribute('data-settings')) { openSettings(() => { paintInput(); paintSide(); }); return; }
  if (b.hasAttribute('data-next')) { trayIdx = (trayIdx + 1) % 4; reset(); return; }
  if (b.dataset.pay) pay(b.dataset.pay);
}

function pay(method) {
  const label = { face: 'Face', card: 'Student card', qr: 'Parent QR' }[method];
  const body = method === 'face' ? `<div class="face-scan"><svg class="face" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2">${'<circle cx="12" cy="9" r="4.2"/><path d="M4.5 21a7.5 7.5 0 0 1 15 0"/>'}</svg><div class="ringp"></div></div><p class="strong" style="text-align:center;margin:14px 0 2px" id="payStatus">Look at the camera</p><p class="small muted" style="text-align:center;margin:0" id="paySub">Matching against enrolled students at ${CHILD.school}</p>`
    : method === 'card' ? `<div class="processing"><div class="icon-tile" style="width:72px;height:72px;border-radius:18px;background:var(--info-soft);color:var(--info)">${ico('card')}</div><p class="strong" id="payStatus" style="margin:0">Tap the student card on the reader</p><p class="small muted" id="paySub" style="margin:0">NFC reader, station 2</p></div>`
    : `<div style="display:grid;justify-items:center;gap:10px">${qrSvg()}<p class="strong" id="payStatus" style="margin:0">Scan with the family app</p><p class="small muted" id="paySub" style="margin:0;text-align:center">For students who forgot their card, a parent can approve from their phone</p></div>`;
  const close = modal(`Pay with ${label}`, body, { width: 420 });
  const st = () => $('#payStatus'), sub = () => $('#paySub');
  setTimeout(() => { if (!st()) return; st().textContent = method === 'face' ? 'Matched: Mia Lin, Grade 4' : method === 'card' ? 'Card read: Mia Lin, Grade 4' : 'Approved by Lin on her phone'; sub().textContent = method === 'face' ? 'Confidence 98.6%. Charging her wallet…' : 'Charging her wallet…'; }, 1500);
  setTimeout(() => { close(); complete(label); }, 2600);
}

function complete(method) {
  const allowed = items.filter(i => !i.blocked), blocked = items.filter(i => i.blocked); const t = sum(allowed);
  const ids = allowed.map(i => i.id || i.name);
  update(s => {
    s.wallet.balance -= t.price;
    s.txns.unshift({ id: 'x' + Date.now(), date: fmtDate(new Date()), title: 'Lunch at checkout', detail: allowed.map(i => i.name).join(', '), amt: -t.price, kind: 'counter' });
    blocked.forEach(b => s.txns.unshift({ id: 'xb' + Date.now() + b.name, date: fmtDate(new Date()), title: 'Blocked at checkout', detail: `${b.name}, by your rule`, amt: 0, kind: 'blocked' }));
    s.todayMeal = { date: fmtDate(new Date()), time: timeNow(), items: ids, kcal: t.kcal, p: t.p, c: t.c, f: t.f, price: t.price, source: mode === 'sample' ? 'Recognized at checkout' : 'Recognized from your photo by the vision model' };
    if (s.controls.autoTopup && s.wallet.balance < s.controls.lowBalance) { s.wallet.balance += 40; s.txns.unshift({ id: 'xa' + Date.now(), date: fmtDate(new Date()), title: 'Auto top-up', detail: 'Bank account ending 4021', amt: 40, kind: 'topup' }); }
  });
  activity('scan', 'green', `<b>${CHILD.name} paid ${money(t.price)}</b> at checkout with ${method.toLowerCase()}: ${esc(allowed.map(i => i.name).join(', '))}. ${int(t.kcal)} kcal, ${t.p} g protein.`);
  if (blocked.length) activity('lock', 'red', `<b>Blocked</b>: ${esc(blocked.map(b => b.name).join(', '))}, by your spending rule. Not charged.`);
  paid = { method, items: allowed, blocked, total: t.price, kcal: t.kcal, p: t.p };
  phase = 'paid'; paintSide();
  toast(`Charged ${money(t.price)} to ${CHILD.name}'s wallet`);
}

function qrSvg() { const r = rng(99); let cells = ''; const n = 25, s = 7; for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { const finder = (x < 7 && y < 7) || (x > 17 && y < 7) || (x < 7 && y > 17); if (finder) continue; if (r() < .45) cells += `<rect x="${x * s}" y="${y * s}" width="${s}" height="${s}"/>`; }
  const f = (x, y) => `<rect x="${x * s}" y="${y * s}" width="${7 * s}" height="${7 * s}"/><rect x="${(x + 1) * s}" y="${(y + 1) * s}" width="${5 * s}" height="${5 * s}" fill="#fff"/><rect x="${(x + 2) * s}" y="${(y + 2) * s}" width="${3 * s}" height="${3 * s}"/>`;
  return `<svg width="190" height="190" viewBox="-7 -7 189 189" role="img" aria-label="Payment QR code"><rect x="-7" y="-7" width="189" height="189" fill="#fff"/><g fill="#1A2230">${cells}${f(0, 0)}${f(18, 0)}${f(0, 18)}</g></svg>`; }
