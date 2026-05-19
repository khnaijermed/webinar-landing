import { supabase, requireSession, signOut } from './supabase-client.js';

const NAV = [
  { id: 'overview', href: 'index.html',    label: 'لوحة التحكم', icon: '📊' },
  { id: 'leads',    href: 'leads.html',    label: 'المسجلون',     icon: '📥' },
  { id: 'sections', href: 'sections.html', label: 'الأقسام',       icon: '🧩' },
  { id: 'menu',     href: 'menu.html',     label: 'القائمة',       icon: '🧭' },
  { id: 'media',    href: 'media.html',    label: 'الوسائط',       icon: '🖼️' },
  { id: 'faqs',     href: 'faqs.html',     label: 'الأسئلة',       icon: '❓' },
  { id: 'design',   href: 'design.html',   label: 'التصميم',       icon: '🎨' },
];

const LOGO_DEFS = `
<svg width="0" height="0" style="position:absolute" aria-hidden="true">
  <defs>
    <symbol id="logo10x10-dark" viewBox="0 0 814.414 209.155">
      <polygon style="fill:#E8E8E8" points="346.492 83.746 274.616 .503 348.326 .503 383.347 41.064 346.492 83.746"/>
      <path style="fill:#E8E8E8" d="M94.374,24.604V.124h-39.519C47.776,25.489,33.62,32.271,0,32.568v34.209h39.519v142.151h54.855v-24.376c-17.448-21.999-27.907-49.78-27.907-79.974s10.459-57.975,27.907-79.974Z"/>
      <path style="fill:#E8E8E8" d="M195.424,208.655c57.389,0,104.078-46.689,104.078-104.078S252.812.5,195.424.5s-104.078,46.689-104.078,104.078,46.689,104.078,104.078,104.078ZM195.424,50.258c29.952,0,54.319,24.367,54.319,54.32s-24.367,54.319-54.319,54.319-54.319-24.367-54.319-54.319,24.367-54.32,54.319-54.32Z"/>
      <path style="fill:#39b54a" d="M608.787,24.604V.124h-39.519c-7.078,25.365-21.235,32.147-54.855,32.443v34.209h39.519v142.151h54.855v-24.376c-17.448-21.999-27.907-49.78-27.907-79.974s10.459-57.975,27.907-79.974Z"/>
      <path style="fill:#39b54a;stroke:#39b54a;stroke-miterlimit:10" d="M709.836,208.655c57.389,0,104.078-46.689,104.078-104.078S767.225.5,709.836.5s-104.078,46.689-104.078,104.078,46.689,104.078,104.078,104.078ZM709.836,50.258c29.952,0,54.319,24.367,54.319,54.32s-24.367,54.319-54.319,54.319-54.32-24.367-54.32-54.319,24.367-54.32,54.32-54.32Z"/>
      <polyline style="fill:#39b54a" points="438.031 104.399 527.734 .5 454.022 .5 401.174 61.713 364.32 104.399 364.317 104.395 346.528 125.062 274.58 208.647 347.823 208.647 383.329 167.619 438.031 104.399"/>
      <polygon style="fill:#E8E8E8" points="456.218 125.095 527.734 208.647 454.025 208.329 419.18 167.618 456.218 125.095"/>
    </symbol>
  </defs>
</svg>`;

export async function initLayout({ active }) {
  const session = await requireSession();
  if (!session) throw new Error('redirecting');

  // Role gate — only members with role = Administrator can use the dashboard
  const { data: members } = await supabase
    .from('leads')
    .select('role')
    .ilike('email', session.user.email);
  const isAdmin = (members || []).some(m => m.role === 'Administrator');
  if (!isAdmin) {
    showAccessDenied();
    throw new Error('not-admin');
  }

  if (!document.getElementById('app-svg-defs')) {
    const host = document.createElement('div');
    host.id = 'app-svg-defs';
    host.innerHTML = LOGO_DEFS;
    document.body.prepend(host);
  }

  document.body.classList.add('with-sidebar');

  const aside = document.createElement('aside');
  aside.className = 'sidebar';
  aside.innerHTML = `
    <a href="./index.html" class="sidebar-brand">
      <span class="sidebar-logo"><svg viewBox="0 0 814.414 209.155"><use href="#logo10x10-dark"/></svg></span>
      <span class="sidebar-tag">Admin</span>
    </a>
    <nav class="sidebar-nav" aria-label="رئيسي">
      ${NAV.map(n => `
        <a href="./${n.href}" class="sidebar-link${n.id === active ? ' is-active' : ''}">
          <span class="sidebar-icon" aria-hidden="true">${n.icon}</span>
          <span>${n.label}</span>
        </a>
      `).join('')}
    </nav>
    <div class="sidebar-foot">
      <div class="sidebar-user" dir="ltr" title="${escapeAttr(session.user.email)}">${escapeHtml(session.user.email)}</div>
      <button class="btn btn-ghost btn-sm" id="layout-logout" type="button">خروج</button>
    </div>`;
  document.body.prepend(aside);
  document.getElementById('layout-logout').addEventListener('click', signOut);

  return session;
}

export function toast(text, kind = 'info') {
  let host = document.getElementById('toast-host');
  if (!host) {
    host = document.createElement('div');
    host.id = 'toast-host';
    host.className = 'toast-host';
    document.body.appendChild(host);
  }
  const t = document.createElement('div');
  t.className = 'toast toast-' + kind;
  t.textContent = text;
  host.appendChild(t);
  requestAnimationFrame(() => t.classList.add('in'));
  setTimeout(() => { t.classList.remove('in'); }, 2400);
  setTimeout(() => t.remove(), 2900);
}

export function confirmDialog(message, { okText = 'تأكيد', cancelText = 'إلغاء', danger = true } = {}) {
  return new Promise(resolve => {
    const wrap = document.createElement('div');
    wrap.className = 'modal-backdrop';
    wrap.innerHTML = `
      <div class="modal modal-sm" role="dialog" aria-modal="true">
        <p class="modal-body">${escapeHtml(message)}</p>
        <div class="modal-foot">
          <button class="btn btn-ghost" data-act="cancel" type="button">${escapeHtml(cancelText)}</button>
          <button class="btn ${danger ? 'btn-danger' : ''}" data-act="ok" type="button">${escapeHtml(okText)}</button>
        </div>
      </div>`;
    document.body.appendChild(wrap);
    wrap.addEventListener('click', e => {
      const act = e.target?.dataset?.act;
      if (e.target === wrap || act === 'cancel') { wrap.remove(); resolve(false); }
      else if (act === 'ok') { wrap.remove(); resolve(true); }
    });
  });
}

export function openModal(html, { onSubmit, onMount } = {}) {
  const wrap = document.createElement('div');
  wrap.className = 'modal-backdrop';
  wrap.innerHTML = `<div class="modal" role="dialog" aria-modal="true">${html}</div>`;
  document.body.appendChild(wrap);

  const modal = wrap.querySelector('.modal');
  const form  = modal.querySelector('form');

  const close = () => wrap.remove();

  wrap.addEventListener('click', e => {
    if (e.target === wrap) close();
    if (e.target?.dataset?.act === 'close') close();
  });
  document.addEventListener('keydown', function esc(e) {
    if (e.key === 'Escape') { close(); document.removeEventListener('keydown', esc); }
  });

  if (form && onSubmit) {
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const handled = await onSubmit(form, close);
      if (handled !== false) close();
    });
  }
  if (onMount) onMount(modal, close);

  return { close, modal };
}

export function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));
}

export function escapeAttr(s) { return escapeHtml(s); }

export function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-GB', {
    year:'numeric', month:'2-digit', day:'2-digit',
    hour:'2-digit', minute:'2-digit',
  });
}

export function formatRelative(iso) {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'الآن';
  if (mins < 60) return `قبل ${mins} د`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `قبل ${hrs} س`;
  const days = Math.floor(hrs / 24);
  return `قبل ${days} يوم`;
}

function showAccessDenied() {
  document.body.className = '';
  document.body.innerHTML = `
    <div class="login-wrap">
      <div class="login-card" style="text-align:center">
        <div style="font-size:54px;margin-bottom:8px">⛔</div>
        <h1 class="login-title" style="color:var(--danger);font-size:22px">Access denied</h1>
        <p class="login-sub" dir="ltr" style="font-size:16px;font-weight:600;color:var(--text)">You can not use this service</p>
        <button class="btn btn-ghost" id="deny-out" type="button" style="width:100%;margin-top:12px">Sign out</button>
      </div>
    </div>`;
  document.getElementById('deny-out').addEventListener('click', signOut);
}

export function formatBytes(n) {
  if (n == null) return '—';
  if (n < 1024) return n + ' B';
  if (n < 1024*1024) return (n / 1024).toFixed(1) + ' KB';
  if (n < 1024*1024*1024) return (n / (1024*1024)).toFixed(1) + ' MB';
  return (n / (1024*1024*1024)).toFixed(2) + ' GB';
}
