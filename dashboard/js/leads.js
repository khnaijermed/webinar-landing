import { supabase } from './supabase-client.js';
import { initLayout, escapeHtml, escapeAttr, formatDate, formatRelative, toast, openModal, confirmDialog } from './layout.js';
import Papa from 'https://cdn.jsdelivr.net/npm/papaparse@5.4.1/+esm';

await initLayout({ active: 'leads' });

let all = [];
let sortKey = 'created_at';
let sortDir = 'desc';
let q = '';

const tbody     = document.getElementById('rows');
const search    = document.getElementById('search');
const tableWrap = document.getElementById('table-wrap');
const emptyEl   = document.getElementById('empty-state');
const csvInput  = document.getElementById('csv-input');

async function load() {
  tableWrap.classList.add('loading');
  const { data, error } = await supabase
    .from('leads')
    .select('id, full_name, email, phone, source, role, created_at')
    .order('created_at', { ascending: false });
  tableWrap.classList.remove('loading');

  if (error) {
    tbody.innerHTML = `<tr><td colspan="8" class="td-error">${escapeHtml(error.message)}</td></tr>`;
    toast('تعذّر تحميل البيانات', 'error');
    return;
  }
  all = data || [];
  computeStats();
  render();
}

function computeStats() {
  const now = Date.now();
  const startDay = new Date(); startDay.setHours(0,0,0,0);
  const weekAgo = now - 7*24*60*60*1000;
  let today = 0, week = 0;
  for (const r of all) {
    const t = new Date(r.created_at).getTime();
    if (t >= startDay.getTime()) today++;
    if (t >= weekAgo) week++;
  }
  document.getElementById('stat-total').textContent  = all.length.toLocaleString('en-US');
  document.getElementById('stat-today').textContent  = today.toLocaleString('en-US');
  document.getElementById('stat-week').textContent   = week.toLocaleString('en-US');
  document.getElementById('stat-latest').textContent = all.length ? formatRelative(all[0].created_at) : '—';
}

function render() {
  let rows = all;
  if (q) {
    const needle = q.toLowerCase();
    rows = rows.filter(r =>
      (r.full_name || '').toLowerCase().includes(needle) ||
      (r.email     || '').toLowerCase().includes(needle) ||
      (r.phone     || '').toLowerCase().includes(needle) ||
      (r.role      || '').toLowerCase().includes(needle)
    );
  }
  rows = [...rows].sort((a, b) => {
    const av = a[sortKey] ?? '';
    const bv = b[sortKey] ?? '';
    if (sortKey === 'created_at') {
      return sortDir === 'asc' ? new Date(av) - new Date(bv) : new Date(bv) - new Date(av);
    }
    return sortDir === 'asc'
      ? String(av).localeCompare(String(bv))
      : String(bv).localeCompare(String(av));
  });

  if (!rows.length) { tbody.innerHTML = ''; emptyEl.hidden = false; return; }
  emptyEl.hidden = true;

  tbody.innerHTML = rows.map((r, i) => `
    <tr data-id="${r.id}">
      <td class="td-num">${i + 1}</td>
      <td>${escapeHtml(r.full_name || '')}</td>
      <td dir="ltr" class="td-email">${escapeHtml(r.email || '')}</td>
      <td dir="ltr" class="td-email">${escapeHtml(r.phone || '—')}</td>
      <td><span class="badge badge-muted">${escapeHtml(r.source || '—')}</span></td>
      <td><span class="badge ${r.role === 'Administrator' ? 'badge-amber' : ''}">${escapeHtml(r.role || 'Member')}</span></td>
      <td class="td-date" dir="ltr">${formatDate(r.created_at)}</td>
      <td class="td-actions">
        <button class="btn btn-ghost btn-sm" data-act="edit">تعديل</button>
        <button class="btn btn-ghost btn-sm" data-act="delete" style="color:var(--danger)">حذف</button>
      </td>
    </tr>`).join('');

  document.querySelectorAll('th[data-sort]').forEach(th => {
    th.classList.toggle('sorted-asc',  th.dataset.sort === sortKey && sortDir === 'asc');
    th.classList.toggle('sorted-desc', th.dataset.sort === sortKey && sortDir === 'desc');
  });
}

document.querySelectorAll('th[data-sort]').forEach(th => {
  th.addEventListener('click', () => {
    const k = th.dataset.sort;
    if (sortKey === k) sortDir = sortDir === 'asc' ? 'desc' : 'asc';
    else { sortKey = k; sortDir = 'asc'; }
    render();
  });
});

search.addEventListener('input', e => { q = e.target.value.trim(); render(); });
document.getElementById('refresh-btn').addEventListener('click', load);

document.getElementById('export-btn').addEventListener('click', () => {
  const header = ['full_name', 'email', 'phone', 'source', 'role', 'created_at'];
  const lines  = [header.join(',')];
  for (const r of all) lines.push(header.map(k => csvCell(r[k])).join(','));
  downloadBlob(['﻿' + lines.join('\n')], `leads-${new Date().toISOString().slice(0,10)}.csv`, 'text/csv;charset=utf-8');
  toast('تم تصدير الملف', 'success');
});

document.getElementById('add-member-btn').addEventListener('click', () => openMemberModal(null));

document.getElementById('import-csv-btn').addEventListener('click', () => csvInput.click());
csvInput.addEventListener('change', handleImport);

// Inline edit/delete from table
tbody.addEventListener('click', async e => {
  const tr = e.target.closest('tr');
  if (!tr) return;
  const id = tr.dataset.id;
  const r  = all.find(x => x.id === id);
  const act = e.target.dataset.act;
  if (!r || !act) return;

  if (act === 'edit') openMemberModal(r);
  else if (act === 'delete') {
    const ok = await confirmDialog(`حذف العضو "${r.full_name}"؟`);
    if (!ok) return;
    const { error } = await supabase.from('leads').delete().eq('id', id);
    if (error) toast('تعذّر الحذف', 'error');
    else { toast('تم الحذف', 'success'); load(); }
  }
});

function openMemberModal(member) {
  const isNew = !member;
  openModal(`
    <div class="modal-head">
      <h3 class="modal-title">${isNew ? 'إضافة عضو' : 'تعديل العضو'}</h3>
      <button class="modal-close" data-act="close" type="button">×</button>
    </div>
    <form>
      <div class="field-row">
        <div class="field"><label>الاسم الكامل</label><input name="full_name" type="text" required value="${escapeAttr(member?.full_name || '')}" /></div>
        <div class="field"><label>البريد الإلكتروني</label><input name="email" type="email" required dir="ltr" value="${escapeAttr(member?.email || '')}" /></div>
      </div>
      <div class="field-row">
        <div class="field"><label>الهاتف</label><input name="phone" type="tel" dir="ltr" value="${escapeAttr(member?.phone || '')}" placeholder="+212600000000" /></div>
        <div class="field"><label>المصدر</label><input name="source" type="text" value="${escapeAttr(member?.source || 'manual')}" /></div>
      </div>
      <div class="field">
        <label>الدور</label>
        <select name="role">
          <option value="Member"        ${(!member || member.role === 'Member')         ? 'selected' : ''}>Member</option>
          <option value="Administrator" ${ member && member.role === 'Administrator'    ? 'selected' : ''}>Administrator</option>
        </select>
      </div>
      <div class="modal-foot">
        <button class="btn btn-ghost" data-act="close" type="button">إلغاء</button>
        <button class="btn" type="submit">${isNew ? 'إضافة' : 'حفظ'}</button>
      </div>
    </form>`, {
    onSubmit: async (form) => {
      const fd = new FormData(form);
      const payload = {
        full_name: fd.get('full_name').trim(),
        email:     fd.get('email').trim(),
        phone:     (fd.get('phone') || '').trim() || null,
        source:    (fd.get('source') || '').trim() || 'manual',
        role:      fd.get('role') === 'Administrator' ? 'Administrator' : 'Member',
      };
      const res = isNew
        ? await supabase.from('leads').insert(payload)
        : await supabase.from('leads').update(payload).eq('id', member.id);
      if (res.error) { toast(res.error.message, 'error'); return false; }
      toast(isNew ? 'تمت الإضافة' : 'تم الحفظ', 'success');
      load();
    }
  });
}

async function handleImport(e) {
  const file = e.target.files?.[0];
  e.target.value = '';
  if (!file) return;

  const text = await file.text();
  const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
  if (parsed.errors.length) {
    console.warn('CSV parse errors', parsed.errors);
    toast('تحذير: تعذّر قراءة بعض الصفوف', 'error');
  }

  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const rows = [];
  let skipped = 0;

  for (const raw of parsed.data) {
    const r = {};
    for (const [k, v] of Object.entries(raw)) {
      if (k != null) r[k.toLowerCase().trim()] = (v ?? '').toString().trim();
    }
    const full_name = r.full_name || r['الاسم'] || r.name || '';
    const email     = (r.email || r['البريد'] || '').toLowerCase();
    if (!full_name || !emailRe.test(email)) { skipped++; continue; }
    rows.push({
      full_name,
      email,
      phone:  r.phone  || r['الهاتف']  || null,
      source: r.source || r['المصدر'] || 'csv-import',
      role:   (r.role === 'Administrator') ? 'Administrator' : 'Member',
    });
  }

  if (!rows.length) { toast('لم يتم العثور على صفوف صالحة', 'error'); return; }

  const { error } = await supabase.from('leads').insert(rows);
  if (error) { toast('فشل الاستيراد: ' + error.message, 'error'); return; }
  toast(`تم استيراد ${rows.length} عضو${skipped ? ` (تم تخطي ${skipped})` : ''}`, 'success');
  load();
}

function csvCell(v) {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function downloadBlob(parts, filename, mime) {
  const blob = new Blob(parts, { type: mime });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

load();
