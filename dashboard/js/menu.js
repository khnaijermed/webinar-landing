import { supabase } from './supabase-client.js';
import { initLayout, escapeHtml, escapeAttr, toast, openModal, confirmDialog } from './layout.js';
import Sortable from 'https://cdn.jsdelivr.net/npm/sortablejs@1.15.6/+esm';

await initLayout({ active: 'menu' });

const listEl  = document.getElementById('menu-list');
const emptyEl = document.getElementById('empty-state');
let items = [];

async function load() {
  const { data, error } = await supabase
    .from('menu_items')
    .select('*')
    .order('sort_order', { ascending: true });
  if (error) { toast('تعذّر التحميل: ' + error.message, 'error'); return; }
  items = data || [];
  render();
}

function render() {
  if (!items.length) {
    listEl.innerHTML = '';
    emptyEl.hidden = false;
    return;
  }
  emptyEl.hidden = true;
  listEl.innerHTML = items.map(m => `
    <div class="section-row${m.is_active ? '' : ' is-inactive'}" data-id="${m.id}">
      <span class="handle" title="اسحب لإعادة الترتيب">⋮⋮</span>
      <div class="section-meta">
        <p class="section-title">${escapeHtml(m.label)}</p>
        <span class="section-key" dir="ltr">${escapeHtml(m.target)}</span>
      </div>
      <label class="switch" title="إظهار/إخفاء">
        <input type="checkbox" data-act="toggle" ${m.is_active ? 'checked' : ''} />
        <span class="switch-track"></span>
      </label>
      <div class="section-actions">
        <button class="btn btn-ghost btn-sm" data-act="edit">تعديل</button>
        <button class="btn btn-ghost btn-sm" data-act="delete" style="color:var(--danger)">حذف</button>
      </div>
    </div>
  `).join('');
}

Sortable.create(listEl, {
  animation: 150,
  handle: '.handle',
  ghostClass: 'dragging',
  onEnd: async () => {
    const ids = [...listEl.querySelectorAll('.section-row')].map(el => el.dataset.id);
    const updates = ids.map((id, i) => {
      const row = items.find(m => m.id === id);
      return { ...row, sort_order: i };
    });
    items = updates;
    const { error } = await supabase.from('menu_items').upsert(updates);
    if (error) toast('تعذّر حفظ الترتيب', 'error');
    else toast('تم حفظ الترتيب', 'success');
  }
});

listEl.addEventListener('click', async e => {
  const row = e.target.closest('.section-row');
  if (!row) return;
  const id = row.dataset.id;
  const m  = items.find(x => x.id === id);
  const act = e.target.dataset.act;
  if (act === 'edit') openEdit(m);
  else if (act === 'delete') {
    const ok = await confirmDialog(`حذف الرابط "${m.label}"؟`);
    if (!ok) return;
    const { error } = await supabase.from('menu_items').delete().eq('id', id);
    if (error) toast('تعذّر الحذف', 'error');
    else { toast('تم الحذف', 'success'); load(); }
  }
});

listEl.addEventListener('change', async e => {
  if (e.target.dataset.act !== 'toggle') return;
  const row = e.target.closest('.section-row');
  const id  = row.dataset.id;
  const v   = e.target.checked;
  row.classList.toggle('is-inactive', !v);
  const { error } = await supabase.from('menu_items').update({ is_active: v }).eq('id', id);
  if (error) { toast('تعذّر التحديث', 'error'); e.target.checked = !v; }
});

document.getElementById('new-menu-btn').addEventListener('click', () => openEdit(null));

function openEdit(m) {
  const isNew = !m;
  openModal(`
    <div class="modal-head">
      <h3 class="modal-title">${isNew ? 'رابط جديد' : 'تعديل الرابط'}</h3>
      <button class="modal-close" data-act="close" type="button">×</button>
    </div>
    <form>
      <div class="field">
        <label>التسمية (label)</label>
        <input name="label" type="text" required value="${escapeAttr(m?.label || '')}" placeholder="مثال: البرنامج" />
      </div>
      <div class="field">
        <label>الهدف (link/anchor)</label>
        <input name="target" type="text" required dir="ltr" value="${escapeAttr(m?.target || '')}" placeholder="#program  أو  https://..." />
      </div>
      <div class="modal-foot">
        <button class="btn btn-ghost" data-act="close" type="button">إلغاء</button>
        <button class="btn" type="submit">${isNew ? 'إنشاء' : 'حفظ'}</button>
      </div>
    </form>`, {
    onSubmit: async (form) => {
      const fd = new FormData(form);
      const payload = {
        label:  (fd.get('label')  || '').trim(),
        target: (fd.get('target') || '').trim(),
      };
      let res;
      if (isNew) {
        payload.sort_order = items.length;
        payload.is_active  = true;
        res = await supabase.from('menu_items').insert(payload);
      } else {
        res = await supabase.from('menu_items').update(payload).eq('id', m.id);
      }
      if (res.error) { toast(res.error.message, 'error'); return false; }
      toast(isNew ? 'تم الإنشاء' : 'تم الحفظ', 'success');
      load();
    }
  });
}

load();
