import { supabase } from './supabase-client.js';
import { initLayout, escapeHtml, escapeAttr, toast, openModal, confirmDialog, formatBytes } from './layout.js';

await initLayout({ active: 'media' });

const IMAGE_MAX = 5  * 1024 * 1024;
const VIDEO_MAX = 100 * 1024 * 1024;
const IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp'];
const VIDEO_MIMES = ['video/mp4',  'video/webm'];
const BLOCKED_EXT = /\.(php|exe|js|jsp|sh|bat|cmd|vbs|html?|svg)$/i;

const grid    = document.getElementById('grid');
const emptyEl = document.getElementById('empty-state');
let mediaRows = [];
let heroVideoId = null;
let designSettingsId = null;
let filter = 'all';

document.querySelectorAll('.segment button').forEach(b => {
  b.addEventListener('click', () => {
    document.querySelectorAll('.segment button').forEach(x => x.classList.remove('is-active'));
    b.classList.add('is-active');
    filter = b.dataset.filter;
    render();
  });
});

setupDropzone('dz-image', 'images', IMAGE_MIMES, IMAGE_MAX, 'image');
setupDropzone('dz-video', 'videos', VIDEO_MIMES, VIDEO_MAX, 'video');

document.getElementById('add-external-btn').addEventListener('click', openExternalModal);

function openExternalModal() {
  openModal(`
    <div class="modal-head">
      <h3 class="modal-title">إضافة فيديو خارجي</h3>
      <button class="modal-close" data-act="close" type="button">×</button>
    </div>
    <form>
      <div class="field">
        <label>عنوان وصفي (للإدارة فقط)</label>
        <input name="title" type="text" placeholder="مثال: فيديو الويبنار الرئيسي" />
      </div>
      <div class="field">
        <label>رابط الفيديو</label>
        <input name="url" type="url" required dir="ltr" placeholder="https://www.youtube.com/embed/…" />
        <p style="color:var(--text-3);font-size:12px;margin:6px 0 0">
          استعمل رابط Embed لـ YouTube (مثال: <code dir="ltr">https://www.youtube.com/embed/VIDEO_ID</code>)
        </p>
      </div>
      <div class="modal-foot">
        <button class="btn btn-ghost" data-act="close" type="button">إلغاء</button>
        <button class="btn" type="submit">إضافة</button>
      </div>
    </form>`, {
    onSubmit: async (form) => {
      const fd = new FormData(form);
      const url = (fd.get('url') || '').trim();
      const title = (fd.get('title') || '').trim() || url;
      if (!/^https?:\/\//i.test(url)) { toast('رابط غير صالح', 'error'); return false; }
      const { error } = await supabase.from('media').insert({
        type: 'video',
        source_type: 'external',
        external_url: url,
        file_path: url,
        file_name: title,
        mime_type: 'video/external',
        size: 0,
      });
      if (error) { toast(error.message, 'error'); return false; }
      toast('تمت الإضافة', 'success');
      load();
    }
  });
}

function setupDropzone(id, bucket, allowedMimes, maxSize, kind) {
  const dz = document.getElementById(id);
  const input = dz.querySelector('input');

  const handle = async (file) => {
    if (!file) return;
    if (!allowedMimes.includes(file.type)) {
      toast('نوع الملف غير مسموح', 'error'); return;
    }
    if (BLOCKED_EXT.test(file.name)) {
      toast('امتداد الملف غير مسموح', 'error'); return;
    }
    if (file.size > maxSize) {
      toast(`الحجم يتجاوز الحد المسموح (${formatBytes(maxSize)})`, 'error'); return;
    }
    dz.classList.add('uploading');
    dz.insertAdjacentHTML('beforeend', '<div class="dropzone-progress"></div>');

    const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `${Date.now()}-${safe}`;
    const up = await supabase.storage.from(bucket).upload(path, file, {
      cacheControl: '3600',
      contentType: file.type,
      upsert: false,
    });

    if (up.error) {
      dz.classList.remove('uploading');
      dz.querySelector('.dropzone-progress')?.remove();
      toast('فشل الرفع: ' + up.error.message, 'error');
      return;
    }

    const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(path);

    const ins = await supabase.from('media').insert({
      type: kind,
      file_path: publicUrl,
      file_name: file.name,
      mime_type: file.type,
      size: file.size,
      alt_text: null,
      thumbnail_path: kind === 'image' ? publicUrl : null,
    });

    dz.classList.remove('uploading');
    dz.querySelector('.dropzone-progress')?.remove();
    input.value = '';

    if (ins.error) { toast('تم الرفع لكن فشل التسجيل', 'error'); return; }
    toast('تم الرفع', 'success');
    load();
  };

  input.addEventListener('change', e => handle(e.target.files?.[0]));
  ['dragenter','dragover'].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.add('is-over'); }));
  ['dragleave','drop'].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.remove('is-over'); }));
  dz.addEventListener('drop', e => handle(e.dataTransfer.files?.[0]));
}

async function load() {
  const [media, settings] = await Promise.all([
    supabase.from('media').select('*').order('created_at', { ascending: false }),
    supabase.from('design_settings').select('id, hero_video_id').limit(1).maybeSingle(),
  ]);
  if (media.error) { toast('تعذّر تحميل الوسائط', 'error'); return; }
  mediaRows = media.data || [];
  heroVideoId     = settings.data?.hero_video_id || null;
  designSettingsId = settings.data?.id || null;
  render();
}

function render() {
  let rows = mediaRows;
  if (filter !== 'all') rows = rows.filter(r => r.type === filter);

  if (!rows.length) {
    grid.innerHTML = '';
    emptyEl.hidden = false;
    return;
  }
  emptyEl.hidden = true;

  grid.innerHTML = rows.map(m => {
    const isHero = m.id === heroVideoId;
    const isExternal = m.source_type === 'external';
    let thumb;
    if (isExternal) {
      thumb = `<div class="media-thumb-icon" style="font-size:42px">🔗</div>`;
    } else if (m.type === 'image') {
      thumb = `<img src="${escapeAttr(m.file_path)}" alt="${escapeAttr(m.alt_text || m.file_name)}" loading="lazy" />`;
    } else {
      thumb = `<video src="${escapeAttr(m.file_path)}" muted preload="metadata"></video>`;
    }
    return `
      <div class="media-item" data-id="${m.id}">
        ${isHero ? '<span class="media-hero-flag">رئيسي</span>' : ''}
        <div class="media-thumb">${thumb}</div>
        <div class="media-info">
          <div class="media-name" title="${escapeAttr(m.file_name)}">${escapeHtml(m.file_name)}</div>
          <div class="media-meta">
            <span class="media-type media-type-${m.type}">${m.type}${isExternal ? ' · external' : ''}</span>
            <span>${isExternal ? '' : formatBytes(m.size)}</span>
          </div>
        </div>
        <div class="media-actions">
          ${m.type === 'image' && !isExternal ? `<button class="btn btn-sm btn-ghost" data-act="alt">Alt</button>` : ''}
          ${m.type === 'video' ? `<button class="btn btn-sm" data-act="hero">${isHero ? '✓ رئيسي' : 'اجعله رئيسي'}</button>` : ''}
          ${isExternal
            ? `<button class="btn btn-sm btn-ghost" data-act="edit-url">تعديل الرابط</button>`
            : `<button class="btn btn-sm btn-ghost" data-act="replace">استبدال</button>`}
          <button class="btn btn-sm btn-danger" data-act="delete">حذف</button>
        </div>
      </div>`;
  }).join('');
}

grid.addEventListener('click', async e => {
  const item = e.target.closest('.media-item');
  if (!item) return;
  const id = item.dataset.id;
  const m  = mediaRows.find(r => r.id === id);
  const act = e.target.dataset.act;
  if (!act || !m) return;

  if (act === 'delete') {
    const ok = await confirmDialog(`حذف "${m.file_name}"؟`);
    if (!ok) return;
    if (m.source_type !== 'external') {
      const bucket = m.type === 'image' ? 'images' : 'videos';
      const key = decodeURIComponent(m.file_path.split(`/${bucket}/`)[1] || '');
      if (key) await supabase.storage.from(bucket).remove([key]);
    }
    const { error } = await supabase.from('media').delete().eq('id', id);
    if (error) toast('تعذّر الحذف', 'error');
    else { toast('تم الحذف', 'success'); load(); }
  }
  else if (act === 'edit-url') {
    openModal(`
      <div class="modal-head">
        <h3 class="modal-title">تعديل رابط الفيديو</h3>
        <button class="modal-close" data-act="close" type="button">×</button>
      </div>
      <form>
        <div class="field">
          <label>العنوان</label>
          <input name="title" type="text" value="${escapeAttr(m.file_name || '')}" />
        </div>
        <div class="field">
          <label>الرابط</label>
          <input name="url" type="url" required dir="ltr" value="${escapeAttr(m.external_url || m.file_path || '')}" />
        </div>
        <div class="modal-foot">
          <button class="btn btn-ghost" data-act="close" type="button">إلغاء</button>
          <button class="btn" type="submit">حفظ</button>
        </div>
      </form>`, {
      onSubmit: async (form) => {
        const fd = new FormData(form);
        const url = (fd.get('url') || '').trim();
        if (!/^https?:\/\//i.test(url)) { toast('رابط غير صالح', 'error'); return false; }
        const { error } = await supabase.from('media').update({
          external_url: url,
          file_path:    url,
          file_name:    (fd.get('title') || '').trim() || url,
        }).eq('id', id);
        if (error) { toast(error.message, 'error'); return false; }
        toast('تم الحفظ', 'success'); load();
      }
    });
  }
  else if (act === 'hero') {
    if (!designSettingsId) { toast('لم يتم تحميل الإعدادات', 'error'); return; }
    const newVal = heroVideoId === id ? null : id;
    const { error } = await supabase
      .from('design_settings')
      .update({ hero_video_id: newVal })
      .eq('id', designSettingsId);
    if (error) toast('تعذّر التحديث', 'error');
    else { heroVideoId = newVal; toast('تم التحديث', 'success'); render(); }
  }
  else if (act === 'alt') {
    openModal(`
      <div class="modal-head">
        <h3 class="modal-title">النص البديل (Alt)</h3>
        <button class="modal-close" data-act="close" type="button">×</button>
      </div>
      <form>
        <div class="field">
          <label>وصف الصورة</label>
          <input name="alt_text" type="text" value="${escapeAttr(m.alt_text || '')}" placeholder="مثال: شخص يجلس أمام شاشة الحاسوب" />
        </div>
        <div class="modal-foot">
          <button class="btn btn-ghost" data-act="close" type="button">إلغاء</button>
          <button class="btn" type="submit">حفظ</button>
        </div>
      </form>`, {
      onSubmit: async (form) => {
        const alt = new FormData(form).get('alt_text') || null;
        const { error } = await supabase.from('media').update({ alt_text: alt }).eq('id', id);
        if (error) { toast('تعذّر الحفظ', 'error'); return false; }
        toast('تم الحفظ', 'success'); load();
      }
    });
  }
  else if (act === 'replace') {
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = m.type === 'image' ? IMAGE_MIMES.join(',') : VIDEO_MIMES.join(',');
    inp.onchange = async () => {
      const file = inp.files?.[0];
      if (!file) return;
      const bucket = m.type === 'image' ? 'images' : 'videos';
      const allowed = m.type === 'image' ? IMAGE_MIMES : VIDEO_MIMES;
      const max = m.type === 'image' ? IMAGE_MAX : VIDEO_MAX;
      if (!allowed.includes(file.type) || file.size > max || BLOCKED_EXT.test(file.name)) {
        toast('الملف غير صالح', 'error'); return;
      }
      const oldKey = decodeURIComponent(m.file_path.split(`/${bucket}/`)[1] || '');
      const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const newPath = `${Date.now()}-${safe}`;
      const up = await supabase.storage.from(bucket).upload(newPath, file, { contentType: file.type });
      if (up.error) { toast('فشل الرفع: ' + up.error.message, 'error'); return; }
      if (oldKey) await supabase.storage.from(bucket).remove([oldKey]);
      const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(newPath);
      const { error } = await supabase.from('media').update({
        file_path: publicUrl,
        file_name: file.name,
        mime_type: file.type,
        size: file.size,
        thumbnail_path: m.type === 'image' ? publicUrl : m.thumbnail_path,
      }).eq('id', id);
      if (error) toast('تعذّر التحديث', 'error');
      else { toast('تم الاستبدال', 'success'); load(); }
    };
    inp.click();
  }
});

load();
