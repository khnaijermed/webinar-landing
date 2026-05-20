import { supabase } from './supabase-client.js';
import { initLayout, escapeHtml, escapeAttr, formatDate, formatRelative, toast, openModal, confirmDialog } from './layout.js';
import Papa from 'https://cdn.jsdelivr.net/npm/papaparse@5.4.1/+esm';

await initLayout({ active: 'leads' });

/* Delegated handler for the password show/hide toggle.
   - Toggles the same input's type between 'password' and 'text'
   - Preserves the typed value (some browsers blank password inputs on
     type swap because of autofill heuristics, so we save+restore).
   - Restores caret position so the user keeps typing where they were. */
document.addEventListener('click', (e) => {
  const btn = e.target.closest && e.target.closest('[data-toggle-password]');
  if (!btn) return;
  e.preventDefault();
  const wrap = btn.closest('.input-with-toggle') || btn.parentElement;
  const pw   = wrap && wrap.querySelector('input[name="password"]');
  if (!pw) return;

  const savedValue = pw.value;
  const savedStart = pw.selectionStart;
  const savedEnd   = pw.selectionEnd;
  const wasFocused = document.activeElement === pw;

  pw.type = pw.type === 'password' ? 'text' : 'password';

  // Restore value if the type change blanked it
  if (pw.value !== savedValue) pw.value = savedValue;
  // Restore caret + focus so the user keeps typing in place
  if (wasFocused) {
    pw.focus();
    try { pw.setSelectionRange(savedStart, savedEnd); } catch { /* setSelectionRange fails on type=email/etc., not type=text */ }
  }

  const revealed = pw.type === 'text';
  btn.classList.toggle('is-on', revealed);
  btn.setAttribute('aria-pressed', revealed ? 'true' : 'false');
  btn.setAttribute('title', revealed ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور');
});

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
  const isAdmin = member && member.role === 'Administrator';
  const passwordHelp = isNew
    ? 'إذا كان الدور <strong>Administrator</strong>، فإن كلمة المرور إلزامية وستُستعمل لتسجيل الدخول إلى لوحة التحكم.'
    : 'اتركها فارغة للإبقاء على كلمة المرور الحالية. أدخل قيمة جديدة لتغييرها.';
  openModal(`
    <div class="modal-head">
      <h3 class="modal-title">${isNew ? 'إضافة عضو' : 'تعديل العضو'}${isAdmin ? ' — Administrator' : ''}</h3>
      <button class="modal-close" data-act="close" type="button">×</button>
    </div>
    <form>
      <div class="field-row">
        <div class="field"><label>الاسم الكامل</label><input name="full_name" type="text" required value="${escapeAttr(member?.full_name || '')}" /></div>
        <div class="field"><label>البريد الإلكتروني</label><input name="email" type="email" required dir="ltr" value="${escapeAttr(member?.email || '')}" /></div>
      </div>
      <div class="field-row">
        <div class="field"><label>الهاتف</label><input name="phone" type="tel" dir="ltr" value="${escapeAttr(member?.phone || '')}" placeholder="+212600000000" /></div>
        <div class="field">
          <label>الدور</label>
          <select name="role">
            <option value="Member"        ${(!member || member.role === 'Member')      ? 'selected' : ''}>Member</option>
            <option value="Administrator" ${ member && member.role === 'Administrator' ? 'selected' : ''}>Administrator</option>
          </select>
        </div>
      </div>
      <div class="field">
        <label>كلمة المرور</label>
        <div class="input-with-toggle">
          <input name="password" type="password" minlength="6" autocomplete="new-password"
                 dir="ltr" style="text-align:right"
                 placeholder="${isNew ? '6 أحرف على الأقل' : '••••••••'}" />
          <button type="button" class="password-toggle" data-toggle-password
                  aria-label="إظهار/إخفاء كلمة المرور" title="إظهار كلمة المرور">
            <svg class="eye-on"  viewBox="0 0 24 24" aria-hidden="true"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/></svg>
            <svg class="eye-off" viewBox="0 0 24 24" aria-hidden="true"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
          </button>
        </div>
        <p style="color:var(--text-3);font-size:12px;margin:6px 0 0">${passwordHelp}</p>
      </div>
      ${isNew ? `<div class="field"><label>المصدر</label><input name="source" type="text" value="manual" /></div>` : ''}
      <div class="modal-foot">
        <button class="btn btn-ghost" data-act="close" type="button">إلغاء</button>
        <button class="btn" type="submit">${isNew ? 'إضافة' : 'حفظ'}</button>
      </div>
    </form>`, {
    onSubmit: async (form) => {
      const fd = new FormData(form);
      const full_name = (fd.get('full_name') || '').trim();
      const email     = (fd.get('email')     || '').trim();
      const phone     = (fd.get('phone')     || '').trim() || null;
      const role      = fd.get('role') === 'Administrator' ? 'Administrator' : 'Member';
      const password  = (fd.get('password')  || '').trim();

      if (!full_name) { toast('الاسم مطلوب', 'error'); return false; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { toast('بريد إلكتروني غير صالح', 'error'); return false; }
      if (password && password.length < 6) {
        toast('كلمة المرور يجب أن تكون 6 أحرف على الأقل', 'error'); return false;
      }

      /* ---------- EDIT ---------- */
      if (!isNew) {
        const emailChanged = email.toLowerCase() !== (member.email || '').toLowerCase();
        const needsServer  = emailChanged || password.length > 0 ||
                             (role === 'Administrator' && member.role !== 'Administrator');

        if (needsServer) {
          const { data, error } = await supabase.functions.invoke('update_member', {
            body: { member_id: member.id, full_name, email, phone, role, password },
          });
          if (error || data?.error) {
            toast((data?.error || error?.message || 'تعذّر تحديث العضو'), 'error');
            return false;
          }
          toast('تم الحفظ', 'success'); load(); return;
        }

        // Pure leads-row edit (no auth-side change required)
        const { error } = await supabase.from('leads')
          .update({ full_name, phone, role })
          .eq('id', member.id);
        if (error) { toast(error.message, 'error'); return false; }
        toast('تم الحفظ', 'success'); load(); return;
      }

      /* ---------- NEW ---------- */
      if (role === 'Administrator' || password) {
        if (!password || password.length < 6) {
          toast('كلمة المرور مطلوبة لإنشاء Administrator', 'error');
          return false;
        }
        const { data, error } = await supabase.functions.invoke('create_member', {
          body: { full_name, email, password, phone, role },
        });
        if (error || data?.error) {
          toast((data?.error || error?.message || 'تعذّر إنشاء العضو'), 'error');
          return false;
        }
        toast('تمت الإضافة — يمكن للعضو الآن تسجيل الدخول', 'success');
        load();
        return;
      }

      // NEW Member with no password → plain leads row, no auth user
      const source = (fd.get('source') || '').trim() || 'manual';
      const { error } = await supabase.from('leads')
        .insert({ full_name, email, phone, source, role });
      if (error) { toast(error.message, 'error'); return false; }
      toast('تمت الإضافة', 'success');
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
