import { supabase } from './supabase-client.js';
import { initLayout, escapeHtml, escapeAttr, toast, openModal, confirmDialog } from './layout.js';
import Sortable from 'https://cdn.jsdelivr.net/npm/sortablejs@1.15.6/+esm';

await initLayout({ active: 'faqs' });

const listEl  = document.getElementById('faq-list');
const emptyEl = document.getElementById('empty-state');
let faqs = [];

async function load() {
  const { data, error } = await supabase
    .from('faqs')
    .select('*')
    .order('sort_order', { ascending: true });
  if (error) { toast('تعذّر التحميل: ' + error.message, 'error'); return; }
  faqs = data || [];
  render();
}

function render() {
  if (!faqs.length) {
    listEl.innerHTML = '';
    emptyEl.hidden = false;
    return;
  }
  emptyEl.hidden = true;
  listEl.innerHTML = faqs.map(f => `
    <div class="section-row${f.is_active ? '' : ' is-inactive'}" data-id="${f.id}">
      <span class="handle" title="اسحب لإعادة الترتيب">⋮⋮</span>
      <div class="section-meta">
        <p class="section-title">${escapeHtml(f.question)}</p>
        <span class="section-key">${escapeHtml((f.answer || '').slice(0, 90))}${(f.answer || '').length > 90 ? '…' : ''}</span>
      </div>
      <label class="switch" title="إظهار/إخفاء">
        <input type="checkbox" data-act="toggle" ${f.is_active ? 'checked' : ''} />
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
      const row = faqs.find(f => f.id === id);
      return { ...row, sort_order: i };
    });
    faqs = updates;
    const { error } = await supabase.from('faqs').upsert(updates);
    if (error) toast('تعذّر حفظ الترتيب', 'error');
    else toast('تم حفظ الترتيب', 'success');
  }
});

listEl.addEventListener('click', async e => {
  const row = e.target.closest('.section-row');
  if (!row) return;
  const id = row.dataset.id;
  const act = e.target.dataset.act;
  const f = faqs.find(x => x.id === id);
  if (act === 'edit') openEdit(f);
  else if (act === 'delete') {
    const ok = await confirmDialog(`حذف السؤال "${f.question}"؟`);
    if (!ok) return;
    const { error } = await supabase.from('faqs').delete().eq('id', id);
    if (error) toast('تعذّر الحذف', 'error');
    else { toast('تم الحذف', 'success'); load(); }
  }
});

listEl.addEventListener('change', async e => {
  if (e.target.dataset.act !== 'toggle') return;
  const row = e.target.closest('.section-row');
  const id = row.dataset.id;
  const v = e.target.checked;
  row.classList.toggle('is-inactive', !v);
  const { error } = await supabase.from('faqs').update({ is_active: v }).eq('id', id);
  if (error) { toast('تعذّر التحديث', 'error'); e.target.checked = !v; }
});

document.getElementById('new-faq-btn').addEventListener('click', () => openEdit(null));

function openEdit(f) {
  const isNew = !f;
  openModal(`
    <div class="modal-head">
      <h3 class="modal-title">${isNew ? 'سؤال جديد' : 'تعديل السؤال'}</h3>
      <button class="modal-close" data-act="close" type="button">×</button>
    </div>
    <form>
      <div class="field">
        <label>السؤال</label>
        <input name="question" type="text" required value="${escapeAttr(f?.question || '')}" />
      </div>
      <div class="field">
        <label>الجواب</label>
        <textarea name="answer" rows="5" required>${escapeHtml(f?.answer || '')}</textarea>
      </div>
      <div class="field">
        <label class="switch-label">
          <span class="switch"><input type="checkbox" name="default_open" ${f?.default_open ? 'checked' : ''} /><span class="switch-track"></span></span>
          فتح السؤال افتراضيًا عند تحميل الصفحة
        </label>
      </div>
      <div class="modal-foot">
        <button class="btn btn-ghost" data-act="close" type="button">إلغاء</button>
        <button class="btn" type="submit">${isNew ? 'إنشاء' : 'حفظ'}</button>
      </div>
    </form>`, {
    onSubmit: async (form) => {
      const fd = new FormData(form);
      const payload = {
        question:     fd.get('question'),
        answer:       fd.get('answer'),
        default_open: !!fd.get('default_open'),
      };
      let res;
      if (isNew) {
        payload.sort_order = faqs.length;
        payload.is_active  = true;
        res = await supabase.from('faqs').insert(payload);
      } else {
        res = await supabase.from('faqs').update(payload).eq('id', f.id);
      }
      if (res.error) { toast(res.error.message, 'error'); return false; }
      toast(isNew ? 'تم الإنشاء' : 'تم الحفظ', 'success');
      load();
    }
  });
}

load();
