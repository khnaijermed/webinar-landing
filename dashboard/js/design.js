import { supabase } from './supabase-client.js';
import { initLayout, toast } from './layout.js';

await initLayout({ active: 'design' });

const form = document.getElementById('design-form');
let settings = null;

async function load() {
  const { data, error } = await supabase
    .from('design_settings')
    .select('*')
    .limit(1)
    .maybeSingle();
  if (error) { toast('تعذّر التحميل: ' + error.message, 'error'); return; }
  settings = data;
  hydrate(data);
}

function hydrate(s) {
  if (!s) return;
  for (const [k, v] of Object.entries(s)) {
    const el = form.querySelector(`[name="${k}"]`);
    if (!el) continue;
    if (el.type === 'checkbox') el.checked = !!v;
    else el.value = v ?? '';
    if (el.type === 'color') {
      const mirror = form.querySelector(`[data-mirror="${k}"]`);
      if (mirror) mirror.value = (v ?? '').toUpperCase();
    }
  }
}

// Two-way sync between hex text input and native color picker
form.addEventListener('input', e => {
  if (e.target.type === 'color') {
    const m = form.querySelector(`[data-mirror="${e.target.name}"]`);
    if (m) m.value = e.target.value.toUpperCase();
  } else if (e.target.dataset.mirror) {
    const c = form.querySelector(`[name="${e.target.dataset.mirror}"]`);
    if (c && /^#[0-9a-f]{6}$/i.test(e.target.value)) c.value = e.target.value;
  }
});

document.getElementById('save-btn').addEventListener('click', async () => {
  if (!settings) { toast('لم يتم تحميل الإعدادات بعد', 'error'); return; }
  const payload = {};
  for (const el of form.elements) {
    if (!el.name) continue;
    if (el.dataset.mirror) continue;
    payload[el.name] = el.type === 'checkbox' ? el.checked : (el.value || null);
  }
  const { error } = await supabase
    .from('design_settings')
    .update(payload)
    .eq('id', settings.id);
  if (error) toast('تعذّر الحفظ: ' + error.message, 'error');
  else toast('تم حفظ الإعدادات', 'success');
});

load();
