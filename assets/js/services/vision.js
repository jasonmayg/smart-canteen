// Dish recognition.
// Demo mode: recognizes the sample trays the renderer drew (no network).
// Real mode: sends an uploaded photo to a vision model with the user's own API key, straight from the browser.
import { DISHES, D } from '../domain/data.js';
export const vision = { apiKey: '', model: 'claude-sonnet-5-5' }; // key lives in memory only, never saved

const sleep = ms => new Promise(r => setTimeout(r, ms));

export async function recognizeDemo(dets, onStage) {
  onStage && onStage('Finding the tray'); await sleep(450);
  onStage && onStage('Separating compartments'); await sleep(450);
  onStage && onStage('Identifying dishes'); await sleep(550);
  onStage && onStage('Estimating portions'); await sleep(350);
  return dets.map(d => { const x = D[d.id]; return { id: d.id, name: x.name, grams: x.g, kcal: x.kcal, p: x.p, c: x.c, f: x.f, price: x.price, conf: d.conf, box: d.box, al: x.al, type: x.type, tags: x.tags }; });
}

export function matchLibrary(name) {
  const n = name.toLowerCase();
  let best = null, score = 0;
  for (const d of DISHES) {
    const words = d.name.toLowerCase().replace(/[^a-z ]/g, ' ').split(/\s+/).filter(w => w.length > 3);
    const s = words.filter(w => n.includes(w)).length / (words.length || 1);
    if (s > score) { score = s; best = d; }
  }
  return score >= .5 ? best : null;
}

export async function recognizePhoto(dataUrl, onStage) {
  if (!vision.apiKey) throw new Error('Add an Anthropic API key in Settings to recognize real photos.');
  const [meta, b64] = dataUrl.split(','); const mediaType = meta.match(/data:(.*?);/)[1];
  onStage && onStage('Sending photo to the vision model');
  const prompt = `You are the dish-recognition step of a school canteen checkout. Identify each distinct food or drink item visible on the tray in this photo.
Return ONLY a JSON object, no prose, in this exact shape:
{"items":[{"name":"short dish name","grams":number,"kcal":number,"protein_g":number,"carbs_g":number,"fat_g":number,"confidence":0-1,"box":[x,y,w,h]}]}
"box" is the item's bounding box as fractions of image width/height (0-1). Estimate a typical school portion if unsure. Use at most 8 items.`;
  let res; try { res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': vision.apiKey, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
    body: JSON.stringify({ model: vision.model, max_tokens: 1200, messages: [{ role: 'user', content: [{ type: 'image', source: { type: 'base64', media_type: mediaType, data: b64 } }, { type: 'text', text: prompt }] }] }),
  }); } catch (e) { throw new Error('Couldn’t reach the vision model. Check your internet connection and try again.'); }
  if (!res.ok) { let msg = res.status === 401 ? 'The API key was rejected. Check it in Settings.' : `The vision model returned an error (${res.status}).`; try { const j = await res.json(); if (j.error && j.error.message) msg += ' ' + j.error.message; } catch (e) { } throw new Error(msg); }
  onStage && onStage('Reading the model’s answer');
  const j = await res.json(); const text = (j.content || []).map(c => c.text || '').join('');
  const m = text.match(/\{[\s\S]*\}/); if (!m) throw new Error('The model did not return dish data. Try a clearer, top-down photo.');
  let parsed; try { parsed = JSON.parse(m[0]); } catch (e) { throw new Error('The model’s answer could not be read. Try again.'); }
  return (parsed.items || []).slice(0, 8).map(it => {
    const lib = matchLibrary(it.name || '');
    return {
      id: lib ? lib.id : null, name: it.name || 'Unknown item', grams: Math.round(it.grams || 0),
      kcal: Math.round(it.kcal || 0), p: Math.round(it.protein_g || 0), c: Math.round(it.carbs_g || 0), f: Math.round(it.fat_g || 0),
      price: lib ? lib.price : 1.00, conf: Math.max(0, Math.min(1, +it.confidence || .7)), box: Array.isArray(it.box) && it.box.length === 4 ? it.box : null,
      al: lib ? lib.al : [], type: lib ? lib.type : 'other', tags: lib ? lib.tags : [], matched: !!lib,
    };
  });
}
