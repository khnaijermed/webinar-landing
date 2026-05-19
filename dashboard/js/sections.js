import { supabase } from './supabase-client.js';
import { initLayout, escapeHtml, escapeAttr, toast, openModal, confirmDialog } from './layout.js';
import Sortable from 'https://cdn.jsdelivr.net/npm/sortablejs@1.15.6/+esm';

await initLayout({ active: 'sections' });

const pageSelect = document.getElementById('page-select');
const listEl     = document.getElementById('section-list');
const emptyEl    = document.getElementById('sections-empty');
const cardEl     = document.getElementById('sections-card');
const newBtn     = document.getElementById('new-section-btn');

let currentPageId = null;
let sectionRows   = [];
let mediaRows     = [];

async function loadPages() {
  const { data } = await supabase.from('pages').select('id, title, slug').order('created_at');
  pageSelect.innerHTML = (data || []).map(p =>
    `<option value="${p.id}">${escapeHtml(p.title)} — ${escapeHtml(p.slug)}</option>`
  ).join('');
  if (!data || !data.length) {
    pageSelect.innerHTML = '<option value="">— لا توجد صفحات —</option>';
    cardEl.hidden = true;
    newBtn.hidden = true;
    return null;
  }
  newBtn.hidden = false;
  return data[0].id;
}

async function loadMedia() {
  const { data } = await supabase.from('media').select('id, type, file_name').order('created_at', { ascending: false });
  mediaRows = data || [];
}

async function loadSections(pageId) {
  if (!pageId) return;
  currentPageId = pageId;
  const { data, error } = await supabase
    .from('sections')
    .select('*')
    .eq('page_id', pageId)
    .order('sort_order', { ascending: true });
  if (error) { toast('تعذّر تحميل الأقسام', 'error'); return; }
  sectionRows = data || [];
  renderSections();
}

function renderSections() {
  cardEl.hidden = false;
  if (!sectionRows.length) {
    listEl.innerHTML = '';
    emptyEl.hidden = false;
    return;
  }
  emptyEl.hidden = true;
  listEl.innerHTML = sectionRows.map(s => `
    <div class="section-row${s.is_active ? '' : ' is-inactive'}" data-id="${s.id}">
      <span class="handle" title="اسحب لإعادة الترتيب">⋮⋮</span>
      <div class="section-meta">
        <p class="section-title">${escapeHtml(s.title || '(بدون عنوان)')}</p>
        <span class="section-key">${escapeHtml(s.section_key)}</span>
      </div>
      <label class="switch" title="إظهار/إخفاء">
        <input type="checkbox" data-act="toggle" ${s.is_active ? 'checked' : ''} />
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
      const row = sectionRows.find(s => s.id === id);
      return { ...row, sort_order: i };
    });
    sectionRows = updates;
    const { error } = await supabase.from('sections').upsert(updates);
    if (error) toast('تعذّر حفظ الترتيب', 'error');
    else toast('تم حفظ الترتيب', 'success');
  }
});

listEl.addEventListener('click', async e => {
  const row = e.target.closest('.section-row');
  if (!row) return;
  const id = row.dataset.id;
  const act = e.target.dataset.act;
  const section = sectionRows.find(s => s.id === id);

  if (act === 'edit') openEditModal(section);
  else if (act === 'delete') {
    const ok = await confirmDialog(`حذف القسم "${section.title || section.section_key}"؟`);
    if (!ok) return;
    const { error } = await supabase.from('sections').delete().eq('id', id);
    if (error) toast('تعذّر الحذف', 'error');
    else { toast('تم الحذف', 'success'); loadSections(currentPageId); }
  }
});

listEl.addEventListener('change', async e => {
  if (e.target.dataset.act !== 'toggle') return;
  const row = e.target.closest('.section-row');
  const id = row.dataset.id;
  const isActive = e.target.checked;
  row.classList.toggle('is-inactive', !isActive);
  const { error } = await supabase.from('sections').update({ is_active: isActive }).eq('id', id);
  if (error) { toast('تعذّر التحديث', 'error'); e.target.checked = !isActive; }
});

newBtn.addEventListener('click', () => openEditModal(null));
pageSelect.addEventListener('change', e => loadSections(e.target.value));

document.getElementById('new-page-btn').addEventListener('click', () => {
  openModal(`
    <div class="modal-head">
      <h3 class="modal-title">صفحة جديدة</h3>
      <button class="modal-close" data-act="close" type="button">×</button>
    </div>
    <form>
      <div class="field">
        <label>العنوان</label>
        <input name="title" type="text" required placeholder="مثال: الصفحة الرئيسية" />
      </div>
      <div class="field">
        <label>Slug (مُعرّف بالإنجليزية)</label>
        <input name="slug" type="text" required placeholder="home" dir="ltr" />
      </div>
      <div class="field">
        <label>وصف الميتا (SEO)</label>
        <textarea name="meta_description" rows="2"></textarea>
      </div>
      <div class="modal-foot">
        <button class="btn btn-ghost" data-act="close" type="button">إلغاء</button>
        <button class="btn" type="submit">إنشاء</button>
      </div>
    </form>`, {
    onSubmit: async (form) => {
      const fd = new FormData(form);
      const { data, error } = await supabase.from('pages').insert({
        title: fd.get('title'),
        slug:  fd.get('slug'),
        meta_description: fd.get('meta_description') || null,
        is_active: true,
      }).select().single();
      if (error) { toast(error.message, 'error'); return false; }
      toast('تم إنشاء الصفحة', 'success');
      await refresh();
      pageSelect.value = data.id;
      loadSections(data.id);
    }
  });
});

function openEditModal(s) {
  const isNew = !s;
  const videoOpts = ['<option value="">— لا شيء —</option>']
    .concat(mediaRows.filter(m => m.type === 'video').map(m =>
      `<option value="${m.id}" ${s?.video_id === m.id ? 'selected' : ''}>${escapeHtml(m.file_name)} (${m.source_type || 'upload'})</option>`
    )).join('');
  const imageOpts = ['<option value="">— لا شيء —</option>']
    .concat(mediaRows.filter(m => m.type === 'image').map(m =>
      `<option value="${m.id}" ${s?.image_id === m.id ? 'selected' : ''}>${escapeHtml(m.file_name)}</option>`
    )).join('');

  const dataJson = s?.data ? JSON.stringify(s.data, null, 2) : '{}';

  openModal(`
    <div class="modal-head">
      <h3 class="modal-title">${isNew ? 'قسم جديد' : 'تعديل القسم'}</h3>
      <button class="modal-close" data-act="close" type="button">×</button>
    </div>
    <form>
      <div class="field-row">
        <div class="field">
          <label>العنوان</label>
          <input name="title" type="text" value="${escapeAttr(s?.title || '')}" />
        </div>
        <div class="field">
          <label>Section Key (Type)</label>
          <input name="section_key" type="text" required dir="ltr" value="${escapeAttr(s?.section_key || '')}" placeholder="hero | video | discover | …" />
        </div>
      </div>
      <div class="field">
        <label>العنوان الفرعي (Subtitle / Kicker)</label>
        <input name="subtitle" type="text" value="${escapeAttr(s?.subtitle || '')}" />
      </div>
      <div class="field">
        <label>المحتوى</label>
        <textarea name="content" rows="4">${escapeHtml(s?.content || '')}</textarea>
      </div>
      <div class="field-row">
        <div class="field">
          <label>نص الزر</label>
          <input name="button_text" type="text" value="${escapeAttr(s?.button_text || '')}" />
        </div>
        <div class="field">
          <label>رابط الزر</label>
          <input name="button_link" type="text" dir="ltr" value="${escapeAttr(s?.button_link || '')}" />
        </div>
      </div>
      <div class="field-row">
        <div class="field">
          <label>صورة مرتبطة</label>
          <select name="image_id">${imageOpts}</select>
        </div>
        <div class="field">
          <label>فيديو مرتبط</label>
          <select name="video_id">${videoOpts}</select>
        </div>
      </div>
      <div class="field">
        <label>Data (JSON) — للأقسام التي تحتوي على عناصر متكررة</label>
        <textarea name="data" rows="8" dir="ltr" style="font-family:var(--font-display);font-size:12.5px;line-height:1.5">${escapeHtml(dataJson)}</textarea>
        <p style="color:var(--text-3);font-size:12px;margin:6px 0 0">
          مثال للأقسام مثل ماذا ستكتشف؟ / لمن هذا الويبنار؟:<br>
          <code dir="ltr" style="color:var(--text-2);font-size:11.5px">{"items":[{"icon":"🧠","text":"نص العنصر"}]}</code>
        </p>
      </div>
      <div class="modal-foot">
        <button class="btn btn-ghost" data-act="close" type="button">إلغاء</button>
        <button class="btn" type="submit">${isNew ? 'إنشاء' : 'حفظ'}</button>
      </div>
    </form>`, {
    onSubmit: async (form) => {
      const fd = new FormData(form);
      let dataValue;
      try {
        dataValue = JSON.parse(fd.get('data') || '{}');
      } catch (e) {
        toast('JSON غير صالح في حقل Data', 'error');
        return false;
      }
      const payload = {
        page_id: currentPageId,
        section_key: fd.get('section_key'),
        title:    fd.get('title')    || null,
        subtitle: fd.get('subtitle') || null,
        content:  fd.get('content')  || null,
        button_text: fd.get('button_text') || null,
        button_link: fd.get('button_link') || null,
        image_id: fd.get('image_id') || null,
        video_id: fd.get('video_id') || null,
        data:     dataValue,
      };
      let res;
      if (isNew) {
        payload.sort_order = sectionRows.length;
        payload.is_active  = true;
        res = await supabase.from('sections').insert(payload);
      } else {
        res = await supabase.from('sections').update(payload).eq('id', s.id);
      }
      if (res.error) { toast(res.error.message, 'error'); return false; }
      toast(isNew ? 'تم الإنشاء' : 'تم الحفظ', 'success');
      loadSections(currentPageId);
    }
  });
}

async function refresh() {
  await loadMedia();
  const first = await loadPages();
  if (first) loadSections(first);
}

refresh();
