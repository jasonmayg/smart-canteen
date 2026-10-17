// Procedural food renderer: draws school-lunch trays and dish thumbnails on canvas.
import { rng } from '../lib/format.js';
import { D } from '../domain/data.js';
function ell(ctx, x, y, rx, ry, color, rot = 0) { ctx.beginPath(); ctx.ellipse(x, y, Math.max(rx, .5), Math.max(ry, .5), rot, 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill(); }
function rr(ctx, x, y, w, h, r, color, stroke) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); if (color) { ctx.fillStyle = color; ctx.fill(); } if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1.5; ctx.stroke(); } }
let DENS = 1;
function scatter(R, n, x, y, w, h, fn) { n = Math.round(n * DENS); for (let i = 0; i < n; i++) { const a = R() * Math.PI * 2, d = Math.sqrt(R()); fn(x + w / 2 + Math.cos(a) * d * w * .42, y + h / 2 + Math.sin(a) * d * h * .4, i); } }
function mound(ctx, x, y, w, h, base, shade) { const g = ctx.createRadialGradient(x + w * .45, y + h * .4, 2, x + w / 2, y + h / 2, Math.max(w, h) * .6); g.addColorStop(0, base); g.addColorStop(1, shade); ell(ctx, x + w / 2, y + h / 2, w * .44, h * .42, g); }

const DRAW = {
  rice(ctx, x, y, w, h, R) { mound(ctx, x, y, w, h, '#FBFAF4', '#E4E0D2'); scatter(R, 140, x, y, w, h, (px, py) => ell(ctx, px, py, 2.4, 1.2, R() < .5 ? '#FFFFFF' : '#ECE8DA', R() * 3)); },
  brownrice(ctx, x, y, w, h, R) { mound(ctx, x, y, w, h, '#D9C3A0', '#B99B6F'); scatter(R, 140, x, y, w, h, (px, py) => ell(ctx, px, py, 2.4, 1.2, R() < .5 ? '#E6D3B2' : '#A98758', R() * 3)); },
  pasta(ctx, x, y, w, h, R) { mound(ctx, x, y, w, h, '#E9C989', '#C9A15C'); ctx.lineWidth = 3; for (let i = 0; i < 26; i++) { ctx.strokeStyle = R() < .5 ? '#F2D59C' : '#D4AE68'; ctx.beginPath(); const cx = x + w * (.2 + R() * .6), cy = y + h * (.2 + R() * .6); ctx.arc(cx, cy, 6 + R() * 10, R() * 6, R() * 6 + 2.5); ctx.stroke(); } },
  sweetpotato(ctx, x, y, w, h, R) { scatter(R, 9, x, y, w, h, (px, py) => { ctx.save(); ctx.translate(px, py); ctx.rotate(R() * 6); rr(ctx, -16, -6, 32, 12, 6, '#E8833A'); rr(ctx, -16, -6, 32, 4, 3, '#C9652A'); ctx.restore(); }); },
  chicken(ctx, x, y, w, h, R) { scatter(R, 13, x, y, w, h, (px, py) => { ell(ctx, px, py, 13 + R() * 6, 9 + R() * 4, R() < .5 ? '#9A5A28' : '#B36B30', R() * 3); ell(ctx, px - 3, py - 3, 5, 3, 'rgba(255,220,170,.35)', R()); }); scatter(R, 40, x, y, w, h, (px, py) => ell(ctx, px, py, 1.6, 1, '#F6EBD3', R() * 3)); scatter(R, 12, x, y, w, h, (px, py) => ell(ctx, px, py, 3, 1.4, '#5BAA4A', R() * 3)); },
  beef(ctx, x, y, w, h, R) { scatter(R, 12, x, y, w, h, (px, py) => ell(ctx, px, py, 14, 5, '#6B3A22', R() * 3)); DRAW.broccoli(ctx, x + w * .1, y + h * .1, w * .8, h * .8, R, 6); },
  fish(ctx, x, y, w, h, R) { ctx.save(); ctx.translate(x + w / 2, y + h / 2); ctx.rotate(-.3); rr(ctx, -w * .34, -h * .2, w * .68, h * .4, 24, '#F4EAD8'); ctx.strokeStyle = 'rgba(200,180,150,.6)'; ctx.lineWidth = 2; for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(i * w * .08, -h * .16); ctx.quadraticCurveTo(i * w * .08 + 8, 0, i * w * .08, h * .16); ctx.stroke(); } ctx.restore(); ell(ctx, x + w * .72, y + h * .3, 16, 16, '#F7DE52'); ell(ctx, x + w * .72, y + h * .3, 11, 11, '#FCEB8F'); scatter(R, 20, x, y, w, h, (px, py) => ell(ctx, px, py, 2.5, 1.2, '#4E9A3E', R() * 3)); },
  meatball(ctx, x, y, w, h, R) { ell(ctx, x + w / 2, y + h / 2, w * .42, h * .4, '#C0412E'); scatter(R, 9, x, y, w, h, (px, py) => { ell(ctx, px, py, 12, 12, '#7A4426'); ell(ctx, px - 3, py - 4, 4, 3, 'rgba(255,210,170,.3)'); }); },
  tofu(ctx, x, y, w, h, R) { scatter(R, 14, x, y, w, h, (px, py) => { ctx.save(); ctx.translate(px, py); ctx.rotate(R()); rr(ctx, -8, -8, 16, 16, 3, '#EAD9B4'); rr(ctx, -8, -8, 16, 5, 2, '#D9BE88'); ctx.restore(); }); scatter(R, 8, x, y, w, h, (px, py) => ell(ctx, px, py, 9, 5, '#7B5A3E', R() * 3)); scatter(R, 10, x, y, w, h, (px, py) => ell(ctx, px, py, 3, 1.4, '#5BAA4A', R() * 3)); },
  curry(ctx, x, y, w, h, R) { ell(ctx, x + w / 2, y + h / 2, w * .43, h * .41, '#E0A02E'); scatter(R, 10, x, y, w, h, (px, py) => ell(ctx, px, py, 10, 7, '#F2D2A0', R() * 3)); scatter(R, 18, x, y, w, h, (px, py) => ell(ctx, px, py, 4, 4, '#E8C27A')); },
  dumpling(ctx, x, y, w, h, R) { scatter(R, 7, x, y, w, h, (px, py) => { ctx.save(); ctx.translate(px, py); ctx.rotate(R() * 6); ctx.beginPath(); ctx.ellipse(0, 0, 20, 12, 0, Math.PI, 0); ctx.closePath(); ctx.fillStyle = '#F3EBDD'; ctx.fill(); ctx.strokeStyle = '#D9CBB2'; ctx.lineWidth = 1.5; for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(i * 6, -10); ctx.lineTo(i * 6, -4); ctx.stroke(); } ctx.restore(); }); },
  grilled(ctx, x, y, w, h, R) { ctx.save(); ctx.translate(x + w / 2, y + h / 2); ctx.rotate(-.25); rr(ctx, -w * .32, -h * .22, w * .64, h * .44, 30, '#D8A25B'); ctx.strokeStyle = '#7B4A22'; ctx.lineWidth = 4; for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(i * 14 - 10, -h * .18); ctx.lineTo(i * 14 + 10, h * .18); ctx.stroke(); } ctx.restore(); },
  chili(ctx, x, y, w, h, R) { ell(ctx, x + w / 2, y + h / 2, w * .43, h * .41, '#8E3524'); scatter(R, 30, x, y, w, h, (px, py) => ell(ctx, px, py, 5, 3, R() < .5 ? '#5A2418' : '#B8562E', R() * 3)); },
  eggtomato(ctx, x, y, w, h, R) { scatter(R, 22, x, y, w, h, (px, py) => ell(ctx, px, py, 9 + R() * 5, 6 + R() * 3, R() < .6 ? '#F6D04D' : '#F2E19A', R() * 3)); scatter(R, 12, x, y, w, h, (px, py) => ell(ctx, px, py, 8, 6, '#D9432F', R() * 3)); },
  beans(ctx, x, y, w, h, R) { ctx.lineCap = 'round'; for (let i = 0; i < 26; i++) { ctx.strokeStyle = R() < .5 ? '#3E8E3A' : '#5DAA4C'; ctx.lineWidth = 5; const px = x + w * (.15 + R() * .7), py = y + h * (.15 + R() * .7), a = R() * 3; ctx.beginPath(); ctx.moveTo(px - Math.cos(a) * 14, py - Math.sin(a) * 14); ctx.lineTo(px + Math.cos(a) * 14, py + Math.sin(a) * 14); ctx.stroke(); } },
  carrot(ctx, x, y, w, h, R) { scatter(R, 18, x, y, w, h, (px, py) => { ell(ctx, px, py, 8, 8, '#EE8A2E'); ell(ctx, px, py, 4, 4, '#F6AE5C'); }); },
  bokchoy(ctx, x, y, w, h, R) { scatter(R, 8, x, y, w, h, (px, py) => { ctx.save(); ctx.translate(px, py); ctx.rotate(R() * 6); ell(ctx, 0, -6, 12, 16, '#3F8F3B'); rr(ctx, -4, 2, 8, 18, 4, '#E5EED6'); ctx.restore(); }); },
  broccoli(ctx, x, y, w, h, R, n = 9) { scatter(R, n, x, y, w, h, (px, py) => { rr(ctx, px - 3, py, 6, 12, 3, '#9CC56E'); for (let k = 0; k < 6; k++) ell(ctx, px + (R() - .5) * 14, py - 4 + (R() - .5) * 10, 6, 6, R() < .5 ? '#2F7D32' : '#3E9142'); }); },
  corn(ctx, x, y, w, h, R) { scatter(R, 70, x, y, w, h, (px, py) => ell(ctx, px, py, 3.6, 3.6, R() < .6 ? '#F4C94A' : '#5BAA4A')); },
  cucumber(ctx, x, y, w, h, R) { scatter(R, 12, x, y, w, h, (px, py) => { ell(ctx, px, py, 11, 11, '#5E9E4F'); ell(ctx, px, py, 9, 9, '#D7EBBF'); ell(ctx, px, py, 3, 3, '#BBD89E'); }); },
  apple(ctx, x, y, w, h, R) { scatter(R, 6, x, y, w, h, (px, py) => { ctx.save(); ctx.translate(px, py); ctx.rotate(R() * 6); ctx.beginPath(); ctx.ellipse(0, 0, 16, 8, 0, 0, Math.PI); ctx.fillStyle = '#F7EED2'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#C8322B'; ctx.stroke(); ctx.restore(); }); },
  orange(ctx, x, y, w, h, R) { scatter(R, 5, x, y, w, h, (px, py) => { ctx.save(); ctx.translate(px, py); ctx.rotate(R() * 6); ctx.beginPath(); ctx.ellipse(0, 0, 16, 9, 0, 0, Math.PI); ctx.fillStyle = '#F7A23A'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#E07B12'; ctx.stroke(); ctx.restore(); }); },
  yogurt(ctx, x, y, w, h) { const r = Math.min(w, h) * .38; ell(ctx, x + w / 2, y + h / 2, r, r, '#FFFFFF'); ell(ctx, x + w / 2, y + h / 2, r * .78, r * .78, '#F3F1EA'); },
  soup(ctx, x, y, w, h, R) { const r = Math.min(w, h) * .42; ell(ctx, x + w / 2, y + h / 2, r, r, '#E9EEF2'); ell(ctx, x + w / 2, y + h / 2, r * .82, r * .82, '#D9B86A'); for (let i = 0; i < 6; i++) ell(ctx, x + w / 2 + (R() - .5) * r, y + h / 2 + (R() - .5) * r, r * .18, r * .06, '#2F3A2A', R() * 3); for (let i = 0; i < 6; i++) ell(ctx, x + w / 2 + (R() - .5) * r, y + h / 2 + (R() - .5) * r, r * .14, r * .05, '#FBE58A', R() * 3); },
  milk(ctx, x, y, w, h) { const cw = Math.min(w * .7, h * .5), ch = cw * 1.25; const cx = x + (w - cw) / 2, cy = y + (h - ch) / 2; rr(ctx, cx, cy, cw, ch, 6, '#FFFFFF'); rr(ctx, cx, cy + ch * .35, cw, ch * .3, 0, '#4F8FE0'); ctx.fillStyle = '#fff'; ctx.font = `700 ${Math.round(cw * .2)}px Manrope, sans-serif`; ctx.textAlign = 'center'; ctx.fillText('MILK', cx + cw / 2, cy + ch * .56); },
  cookie(ctx, x, y, w, h, R) { const r = Math.min(w, h) * .36; ell(ctx, x + w / 2, y + h / 2, r, r, '#D7A15E'); ell(ctx, x + w / 2 - r * .15, y + h / 2 - r * .2, r * .8, r * .75, '#E2B271'); for (let i = 0; i < 9; i++) ell(ctx, x + w / 2 + (R() - .5) * r * 1.3, y + h / 2 + (R() - .5) * r * 1.3, r * .1, r * .08, '#4A2A16'); },
  juice(ctx, x, y, w, h) { const cw = Math.min(w * .6, h * .45), ch = cw * 1.5; const cx = x + (w - cw) / 2, cy = y + (h - ch) / 2 + 6; rr(ctx, cx, cy, cw, ch, 5, '#F2C14E'); rr(ctx, cx + cw * .15, cy + ch * .3, cw * .7, ch * .45, 4, '#7DBB4C'); ctx.strokeStyle = '#E8EDF2'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx + cw * .75, cy); ctx.lineTo(cx + cw * .9, cy - 16); ctx.stroke(); },
};

const LAYOUT_MAIN = { main: [.03, .06, .46, .88], staple: [.52, .06, .45, .42], veg: [.52, .52, .24, .42], extra: [.79, .52, .18, .42] };

// Draws a tray. slots: [mainId, vegId, stapleId, extraId]; extras: treat ids placed beside the tray.
// Returns detections in normalized canvas coordinates.
/** Known confusions of the simulated detector (the recognition page measures these from corrections). */
const MISREAD = { s2: 's1' };
export function drawTray(canvas, slots, extras = [], seed = 7) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const W = canvas.clientWidth || 640, H = canvas.clientHeight || 480;
  canvas.width = W * dpr; canvas.height = H * dpr;
  const ctx = canvas.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const R = rng(seed);
  // counter surface
  const g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#3A4656'); g.addColorStop(1, '#232C38'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 60; i++) { ctx.fillStyle = `rgba(255,255,255,${R() * .025})`; ctx.fillRect(R() * W, R() * H, 2, 2); }
  const hasExtras = extras.length > 0;
  const T = hasExtras ? [W * .04, H * .1, W * .70, H * .8] : [W * .06, H * .08, W * .88, H * .84];
  // tray
  ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.35)'; ctx.shadowBlur = 18; ctx.shadowOffsetY = 6; rr(ctx, T[0], T[1], T[2], T[3], 22, '#C9D3DC'); ctx.restore();
  rr(ctx, T[0], T[1], T[2], T[3], 22, null, 'rgba(255,255,255,.4)');
  const dets = [];
  const order = ['main', 'veg', 'staple', 'extra'];
  order.forEach((slot, i) => {
    const id = slots[i]; const L = LAYOUT_MAIN[slot];
    const x = T[0] + T[2] * L[0], y = T[1] + T[3] * L[1], w = T[2] * L[2], h = T[3] * L[3];
    rr(ctx, x, y, w, h, 16, '#B7C2CD'); rr(ctx, x + 2, y + 2, w - 4, h - 4, 14, '#BFC9D3');
    if (!id) return; const d = D[id]; ctx.save(); ctx.beginPath(); ctx.roundRect(x + 2, y + 2, w - 4, h - 4, 14); ctx.clip();
    const k = Math.max(1, Math.min(w, h) / 150); DENS = Math.min(2.2, Math.max(1, (w / k) * (h / k) / (170 * 170))); ctx.translate(x, y); ctx.scale(k, k); (DRAW[d.kind] || DRAW.rice)(ctx, 0, 0, w / k, h / k, R); DENS = 1; ctx.restore();
    const c0 = +(0.86 + R() * 0.13).toFixed(2); // simulated detector: brown rice is often read as white rice, with low confidence
    dets.push({ id: MISREAD[id] || id, truth: id, box: [(x + 6) / W, (y + 6) / H, (w - 12) / W, (h - 12) / H], conf: MISREAD[id] ? 0.66 : c0 });
  });
  extras.forEach((id, i) => {
    const d = D[id]; const x = W * .76, h = H * .36, y = H * (.1 + i * .42), w = W * .2;
    const k = Math.max(1, Math.min(w, h) / 150); ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.35)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 4; ctx.translate(x, y); ctx.scale(k, k); (DRAW[d.kind])(ctx, 0, 0, w / k, h / k, R); ctx.restore();
    dets.push({ id, box: [(x + 4) / W, (y + 8) / H, (w - 8) / W, (h - 16) / H], conf: +(0.9 + R() * 0.08).toFixed(2) });
  });
  return dets;
}

// Small round dish thumbnail for menus
export function drawThumb(canvas, id, size = 52) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2); canvas.width = size * dpr; canvas.height = size * dpr;
  const ctx = canvas.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const d = D[id]; const R = rng(id.charCodeAt(0) * 31 + id.length * 7 + (+id.slice(1) || 1));
  ctx.fillStyle = '#EEF1F4'; ctx.fillRect(0, 0, size, size);
  ell(ctx, size / 2, size / 2, size * .44, size * .44, '#FFFFFF'); ell(ctx, size / 2, size / 2, size * .36, size * .36, '#F7F8F9');
  ctx.save(); ctx.beginPath(); ctx.arc(size / 2, size / 2, size * .36, 0, Math.PI * 2); ctx.clip();
  ctx.scale(size / 200, size / 200); // dish drawers are tuned for ~200px compartments
  (DRAW[d.kind] || DRAW.rice)(ctx, 28, 28, 144, 144, R);
  ctx.restore();
}

// Load an uploaded photo into the camera canvas (for real-AI mode)
export function drawPhoto(canvas, img) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2); const W = canvas.clientWidth, H = canvas.clientHeight;
  canvas.width = W * dpr; canvas.height = H * dpr; const ctx = canvas.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = '#0F1722'; ctx.fillRect(0, 0, W, H);
  const s = Math.min(W / img.width, H / img.height); const w = img.width * s, h = img.height * s;
  ctx.drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
  return { ox: (W - w) / 2 / W, oy: (H - h) / 2 / H, sw: w / W, sh: h / H };
}
