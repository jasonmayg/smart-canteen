// Settings: optional vision-model key and demo reset.
import { esc } from '../lib/format.js';
import { $, ico, modal, toast } from '../lib/ui.js';
import { resetState, defaults } from '../state.js';
import { vision } from '../services/vision.js';
export function openSettings(after) {
  modal('Settings', `
    <div class="stack">
      <div><div class="strong">Real dish recognition</div><p class="small muted" style="margin:4px 0 10px">Sample trays work without a key. To recognize your own photos, paste an Anthropic API key. It stays in this browser tab, is sent only to the model provider, and is cleared when you close the tab.</p>
        <label class="field">API key<input class="input" id="apiKey" type="password" autocomplete="off" placeholder="sk-ant-…" value="${esc(vision.apiKey)}"></label>
        <label class="field" style="margin-top:10px">Model<input class="input" id="model" value="${esc(vision.model)}"></label></div>
      <div class="row"><button class="btn primary" id="saveKey">Save</button>${vision.apiKey ? '<button class="btn ghost" id="clearKey">Remove key</button>' : ''}</div>
      <div class="divider"></div>
      <div><div class="strong">Demo data</div><p class="small muted" style="margin:4px 0 10px">Your orders, payments and checklist ticks are saved in this browser. Start over to see the demo fresh.</p><button class="btn secondary" id="resetDemo">${ico('refresh')}Reset demo</button></div>
    </div>`, { width: 480, onMount: (m, close) => {
      $('#saveKey', m).onclick = () => { vision.apiKey = $('#apiKey', m).value.trim(); vision.model = $('#model', m).value.trim() || vision.model; close(); toast(vision.apiKey ? 'Vision model connected for this tab' : 'Settings saved'); after && after(); };
      const c = $('#clearKey', m); if (c) c.onclick = () => { vision.apiKey = ''; close(); toast('Key removed'); after && after(); };
      $('#resetDemo', m).onclick = () => { resetState(defaults()); close(); toast('Demo reset'); after && after(); };
    } });
}

