/* =============================================================================
   cms-loader.js — builds the entire landing page from Supabase CMS data.
   - Section order, content, and visibility come from public.sections.
   - Lists pull from their typed tables (stats, webinar_days, faqs, form_fields).
   - Design tokens, video player settings, floating buttons, and form labels
     come from public.design_settings.
   ============================================================================= */
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL      = 'https://izzxupiukzbmgmijqvru.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml6enh1cGl1a3pibWdtaWpxdnJ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4NTUwNjgsImV4cCI6MjA5NDQzMTA2OH0.swTI1SVX0k9RnSG3ayeT083wH_ew8N9SrM5udMw2bD4';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* ------- fetch everything in parallel ------- */
const [pageRes, sectionsRes, statsRes, daysRes, faqsRes, designRes, mediaRes, formFieldsRes, menuRes] = await Promise.all([
  supabase.from('pages').select('id, title, meta_description').eq('slug', 'home').maybeSingle(),
  supabase.from('sections').select('*').eq('is_active', true).order('sort_order'),
  supabase.from('stats').select('*').eq('is_active', true).order('sort_order'),
  supabase.from('webinar_days').select('*').eq('is_active', true).order('sort_order'),
  supabase.from('faqs').select('*').eq('is_active', true).order('sort_order'),
  supabase.from('design_settings').select('*').limit(1).maybeSingle(),
  supabase.from('media').select('*'),
  supabase.from('form_fields').select('*').eq('is_active', true).order('sort_order'),
  supabase.from('menu_items').select('*').eq('is_active', true).order('sort_order'),
]);

const page          = pageRes.data;
const sections      = (sectionsRes.data || []).filter(s => !page || s.page_id === page.id);
const stats         = statsRes.data || [];
const days          = daysRes.data || [];
const faqs          = faqsRes.data || [];
const design        = designRes.data || {};
const mediaById     = Object.fromEntries((mediaRes.data || []).map(m => [m.id, m]));
const formFields    = formFieldsRes.data || [];
const menuItems     = menuRes.data || [];

/* ------- design tokens → CSS variables ------- */
applyDesign(design);

/* =============================================================================
   SECTION RENDERERS  (registered before use)
   ============================================================================= */
const RENDERERS = {
  hero,
  video,
  primary_cta,
  intro_description,
  trust_numbers,
  discover,
  benefits,
  program,
  audience,
  callout,
  faq: faqSection,
  register,
  footer,
};

/* ------- render sections in DB order ------- */
const host = document.getElementById('page-content');
host.innerHTML = '';

for (const s of sections) {
  const renderer = RENDERERS[s.section_key];
  if (renderer) {
    const node = renderer(s);
    if (node) host.appendChild(node);
  }
}

/* ------- nav menu links ------- */
renderNavMenu();

/* ------- floating UI ------- */
mountFaqModal();
if (design.faq_button_enabled !== false) mountFaqFab();
if (design.sticky_cta_enabled !== false) mountStickyCta();
if (design.whatsapp_enabled    !== false) mountWhatsapp();

/* ------- nav scroll state + reveal animations ------- */
const nav = document.getElementById('nav');
const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 40);
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

const revealIO = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('in');
      revealIO.unobserve(e.target);
    }
  });
}, { rootMargin: '0px 0px -10% 0px', threshold: 0.08 });
document.querySelectorAll('.reveal').forEach(el => revealIO.observe(el));

function hero(s) {
  return el(`
    <section class="hero">
      <div class="container hero-inner">
        ${s.subtitle ? `<span class="eyebrow reveal"><span class="dot"></span> ${esc(s.subtitle)}</span>` : ''}
        <h1 class="h1 reveal delay-1">${s.title || ''}</h1>
      </div>
    </section>`);
}

function video(s) {
  const data = s.data || {};
  const media = s.video_id ? mediaById[s.video_id] : null;

  let inner = '';
  if (media && media.source_type === 'upload') {
    const attrs = videoAttrs(design);
    const poster = design.video_poster_url || media.poster_url || '';
    inner = `<video src="${escAttr(media.file_path)}" ${attrs} ${poster ? `poster="${escAttr(poster)}"` : ''}></video>`;
  } else if (media && media.source_type === 'external' && media.external_url) {
    inner = `<iframe src="${escAttr(media.external_url)}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen loading="lazy" referrerpolicy="strict-origin-when-cross-origin"></iframe>`;
  } else if (data.external_url) {
    inner = `<iframe src="${escAttr(data.external_url)}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen loading="lazy" referrerpolicy="strict-origin-when-cross-origin"></iframe>`;
  } else {
    inner = `<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#666;font-family:var(--font-display);font-size:12px;letter-spacing:.15em">NO VIDEO</div>`;
  }

  return el(`
    <section class="video-wrap">
      <div class="container">
        <div class="video-card reveal">
          <div class="video-frame">${inner}</div>
        </div>
      </div>
    </section>`);
}

function primary_cta(s) {
  if (!s.button_text) return null;
  return el(`
    <section class="cta-wrap">
      <div class="container">
        <a href="${escAttr(s.button_link || '#register')}" class="btn reveal">${esc(s.button_text)}</a>
      </div>
    </section>`);
}

function intro_description(s) {
  const pills = (s.data?.info_pills || []).map(p =>
    `<span class="info-pill">${renderIcon(p.icon)} ${esc(p.text || '')}</span>`
  ).join('');
  if (!s.subtitle && !s.content && !pills) return null;
  return el(`
    <section class="hero intro-wrap" style="padding:10px 0 60px">
      <div class="container hero-inner">
        ${s.subtitle ? `<p class="lead reveal">${esc(s.subtitle)}</p>` : ''}
        ${s.content  ? `<p class="body-p reveal delay-1">${esc(s.content)}</p>` : ''}
        ${pills      ? `<div class="info-row reveal delay-2">${pills}</div>` : ''}
      </div>
    </section>`);
}

function trust_numbers(s) {
  if (!stats.length) return null;
  return el(`
    <section class="stats">
      <div class="container">
        <div class="stats-grid">
          ${stats.map((st, i) => `
            <div class="stat reveal${i ? ' delay-' + Math.min(i, 4) : ''}">
              <div class="stat-num">${esc(st.number)}</div>
              <div class="stat-label">${esc(st.label)}</div>
            </div>`).join('')}
        </div>
      </div>
    </section>`);
}

function discover(s) {
  return cardsSection(s, 'discover');
}

function benefits(s) {
  return cardsSection(s, 'benefits');
}

function cardsSection(s, id) {
  const items = (s.data?.items || []);
  if (!items.length && !s.title) return null;
  return el(`
    <section class="section" id="${id}">
      <div class="container">
        <div class="section-head">
          ${s.subtitle ? `<span class="kicker reveal">${esc(s.subtitle)}</span>` : ''}
          ${s.title    ? `<h2 class="h2 reveal delay-1">${esc(s.title)}</h2>` : ''}
          ${s.content  ? `<p class="section-sub reveal delay-2">${esc(s.content)}</p>` : ''}
        </div>
        ${items.length ? `<div class="cards">
          ${items.map((it, i) => `
            <div class="card reveal${i % 3 ? ' delay-' + (i % 3) : ''}">
              ${it.icon  ? `<div class="ico">${renderIcon(it.icon)}</div>` : ''}
              ${it.title ? `<h3>${esc(it.title)}</h3>` : ''}
              ${(it.text || it.description) ? `<p>${esc(it.text || it.description)}</p>` : ''}
            </div>`).join('')}
        </div>` : ''}
      </div>
    </section>`);
}

function program(s) {
  if (!days.length) return null;
  const DAY_LABELS_AR = {
    1: 'اليوم الاول',
    2: 'اليوم الثاني',
    3: 'اليوم الثالث',
    4: 'اليوم الرابع',
    5: 'اليوم الخامس',
    6: 'اليوم السادس',
    7: 'اليوم السابع',
  };
  return el(`
    <section class="section" id="program">
      <div class="container">
        <div class="section-head">
          ${s.subtitle ? `<span class="kicker reveal">${esc(s.subtitle)}</span>` : ''}
          ${s.title    ? `<h2 class="h2 reveal delay-1">${esc(s.title)}</h2>` : ''}
        </div>
        <div class="days">
          ${days.map((d, i) => `
            <div class="day reveal${i ? ' delay-' + Math.min(i, 4) : ''}">
              <div class="num">${esc(DAY_LABELS_AR[d.day_number] || `اليوم ${d.day_number}`)}</div>
              <h3>${esc(d.title)}</h3>
              <p>${esc(d.description || '')}</p>
            </div>`).join('')}
        </div>
      </div>
    </section>`);
}

function audience(s) {
  const items = s.data?.items || [];
  if (!items.length) return null;
  return el(`
    <section class="section">
      <div class="container">
        <div class="section-head">
          ${s.subtitle ? `<span class="kicker reveal">${esc(s.subtitle)}</span>` : ''}
          ${s.title    ? `<h2 class="h2 reveal delay-1">${esc(s.title)}</h2>` : ''}
        </div>
        <div class="audience">
          ${items.map((it, i) => `
            <div class="aud reveal${i ? ' delay-' + Math.min(i, 4) : ''}">
              ${it.icon ? `<div class="ico">${renderIcon(it.icon)}</div>` : ''}
              <p>${esc(it.text || '')}</p>
            </div>`).join('')}
        </div>
      </div>
    </section>`);
}

function callout(s) {
  const tags = (s.data?.tags || []).map(t => `<span class="tag">${esc(t)}</span>`).join('');
  return el(`
    <section class="section">
      <div class="container">
        <div class="callout reveal">
          ${s.title   ? `<h3>${esc(s.title)}</h3>` : ''}
          ${s.content ? `<p>${esc(s.content)}</p>` : ''}
          ${tags      ? `<div class="tags" style="margin-top:20px">${tags}</div>` : ''}
        </div>
      </div>
    </section>`);
}

function faqSection(s) {
  if (!faqs.length) return null;
  return el(`
    <section class="section" id="faq-section">
      <div class="container">
        <div class="section-head">
          ${s.subtitle ? `<span class="kicker reveal">${esc(s.subtitle)}</span>` : ''}
          ${s.title    ? `<h2 class="h2 reveal delay-1">${esc(s.title)}</h2>` : ''}
        </div>
        <div class="faq-list">
          ${faqs.map(f => `
            <details class="faq-item"${f.default_open ? ' open' : ''}>
              <summary>${esc(f.question)}</summary>
              <div class="faq-answer">${esc(f.answer)}</div>
            </details>`).join('')}
        </div>
      </div>
    </section>`);
}

function register(s) {
  const fields = formFields.map(f => `
    <div class="field">
      <label for="ff-${escAttr(f.field_name)}">${esc(f.label)}</label>
      ${f.type === 'textarea'
        ? `<textarea id="ff-${escAttr(f.field_name)}" name="${escAttr(f.field_name)}" ${f.is_required ? 'required' : ''} placeholder="${escAttr(f.placeholder || '')}"></textarea>`
        : `<input id="ff-${escAttr(f.field_name)}" name="${escAttr(f.field_name)}" type="${escAttr(f.type)}" ${f.is_required ? 'required' : ''} placeholder="${escAttr(f.placeholder || '')}" ${f.type === 'email' ? 'dir="ltr" style="text-align:right" autocomplete="email"' : ''} ${f.type === 'tel' ? 'dir="ltr" style="text-align:right" autocomplete="tel"' : ''} ${f.type === 'text' ? 'autocomplete="name"' : ''} />`}
    </div>`).join('');

  const section = el(`
    <section class="form-section" id="register">
      <div class="container">
        <div class="section-head">
          ${s.subtitle ? `<span class="kicker reveal">${esc(s.subtitle)}</span>` : `<span class="kicker reveal">🎯 التسجيل مجاني والمقاعد محدودة</span>`}
          ${s.title    ? `<h2 class="h2 reveal delay-1">${esc(s.title)}</h2>` : ''}
          ${s.content  ? `<p class="section-sub reveal delay-2">${esc(s.content)}</p>` : ''}
        </div>
        <form class="form-card reveal" id="register-form" novalidate>
          ${design.form_title       ? `<h3>${esc(design.form_title)}</h3>` : ''}
          ${design.form_description ? `<p class="help">${esc(design.form_description)}</p>` : ''}
          ${fields}
          <button class="btn" type="submit" id="submit-btn">${esc(design.form_submit_text || 'أريد التسجيل الآن')}</button>
          <div class="form-msg" id="form-msg" role="status" aria-live="polite"></div>
        </form>
      </div>
    </section>`);

  // Wire up submission after the element is in the DOM
  setTimeout(() => wireForm(), 0);
  return section;
}

function footer(s) {
  return el(`
    <footer class="footer">
      <div class="container">
        <div class="footer-brand">
          <svg viewBox="0 0 814.414 209.155"><use href="#logo10x10-dark"/></svg>
        </div>
        <p>${esc(s.title || '')}</p>
      </div>
    </footer>`);
}

/* =============================================================================
   FORM SUBMISSION
   ============================================================================= */
function wireForm() {
  const form  = document.getElementById('register-form');
  const msgEl = document.getElementById('form-msg');
  const btn   = document.getElementById('submit-btn');
  if (!form) return;

  const setMsg = (text, kind) => {
    msgEl.textContent = text || '';
    msgEl.className = 'form-msg' + (kind ? ' ' + kind : '');
  };

  // Email RTL flip on input
  const emailInput = form.querySelector('input[type=email]');
  if (emailInput) {
    emailInput.addEventListener('input', e => { e.target.dir = e.target.value ? 'ltr' : 'rtl'; });
  }

  form.addEventListener('submit', async e => {
    e.preventDefault();
    setMsg('');

    const fd = new FormData(form);
    const payload = { source: 'landing' };
    for (const f of formFields) {
      const v = (fd.get(f.field_name) || '').toString().trim();
      if (f.is_required && !v) { setMsg(`من فضلك أدخل ${f.label}.`, 'error'); return; }
      if (v) payload[f.field_name] = v;
    }
    if (payload.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
      setMsg('من فضلك أدخل بريدًا إلكترونيًا صحيحًا.', 'error'); return;
    }

    btn.disabled = true;
    const original = btn.textContent;
    btn.textContent = 'جاري الحجز…';

    const { error } = await supabase.from('leads').insert(payload);

    btn.disabled = false;
    btn.textContent = original;

    if (error) {
      setMsg(design.form_error_message || 'تعذّر إرسال الحجز. حاول مرة أخرى لاحقًا.', 'error');
      console.error('Supabase error:', error);
    } else {
      setMsg(design.form_success_message || 'تم تأكيد حجزك ✅', 'success');
      form.reset();
    }
  });
}

/* =============================================================================
   FLOATING UI
   ============================================================================= */
function mountFaqModal() {
  if (!faqs.length) return;
  const modal = el(`
    <div class="faq-modal-backdrop" id="faq-modal-backdrop" role="dialog" aria-modal="true" aria-hidden="true">
      <div class="faq-modal">
        <div class="faq-modal-head">
          <h3 class="faq-modal-title">الأسئلة الشائعة</h3>
          <button class="faq-modal-close" data-close type="button" aria-label="إغلاق">×</button>
        </div>
        <div class="faq-list">
          ${faqs.map(f => `
            <details class="faq-item"${f.default_open ? ' open' : ''}>
              <summary>${esc(f.question)}</summary>
              <div class="faq-answer">${esc(f.answer)}</div>
            </details>`).join('')}
        </div>
      </div>
    </div>`);
  document.body.appendChild(modal);

  const close = () => { modal.classList.remove('open'); modal.setAttribute('aria-hidden','true'); };
  modal.addEventListener('click', e => {
    if (e.target === modal || e.target.hasAttribute('data-close')) close();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && modal.classList.contains('open')) close();
  });
  window.__openFaqModal = () => { modal.classList.add('open'); modal.setAttribute('aria-hidden','false'); };
}

function mountFaqFab() {
  const label = design.faq_button_text || 'الأسئلة الشائعة';
  const btn = el(`
    <button class="faq-fab" id="faq-fab" type="button" aria-label="${escAttr(label)}" title="${escAttr(label)}">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
        <line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
    </button>
  `);
  btn.addEventListener('click', () => window.__openFaqModal && window.__openFaqModal());
  document.body.appendChild(btn);
}

function mountStickyCta() {
  const bar = el(`
    <div class="sticky-cta" id="sticky-cta" aria-hidden="true">
      <a class="btn" href="${escAttr(design.sticky_cta_link || '#register')}">${esc(design.sticky_cta_text || 'احجز مقعدك الآن')}</a>
    </div>
  `);
  document.body.appendChild(bar);
  document.body.classList.add('has-sticky-cta');

  // Show after the user scrolls past the hero
  const reveal = () => {
    if (window.scrollY > window.innerHeight * 0.4) {
      bar.classList.add('in');
      bar.setAttribute('aria-hidden','false');
    } else {
      bar.classList.remove('in');
      bar.setAttribute('aria-hidden','true');
    }
  };
  window.addEventListener('scroll', reveal, { passive: true });
  reveal();
}

function mountWhatsapp() {
  const phone = (design.whatsapp_number || '').replace(/\D/g, '');
  const msg   = encodeURIComponent(design.whatsapp_message || '');
  const a = document.createElement('a');
  a.id = 'wa-fab';
  a.className = 'wa-fab';
  a.href = phone ? `https://wa.me/${phone}?text=${msg}` : 'https://wa.me/';
  a.target = '_blank';
  a.rel = 'noopener';
  a.setAttribute('aria-label', 'WhatsApp');
  a.title = 'WhatsApp';
  a.innerHTML = '<svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 2.1.55 4.15 1.6 5.95L2 22l4.25-1.11c1.73.94 3.67 1.44 5.65 1.44h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.13-2.9-7C17.05 3.45 14.57 2 12.04 2zm5.83 13.99c-.25.7-1.46 1.34-2.02 1.43-.54.08-1.21.12-1.96-.12-.45-.14-1.03-.34-1.77-.66-3.13-1.35-5.17-4.51-5.33-4.72-.16-.21-1.27-1.7-1.27-3.24 0-1.54.81-2.3 1.09-2.62.29-.32.63-.4.83-.4.21 0 .42 0 .6.01.19.01.45-.07.7.54.26.62.88 2.13.95 2.29.07.16.12.34.02.55-.1.21-.15.34-.29.52-.15.18-.31.41-.45.55-.15.15-.31.31-.13.62.18.31.79 1.32 1.7 2.13 1.18 1.05 2.17 1.37 2.48 1.53.31.16.49.13.67-.08.18-.21.78-.91 1-1.23.21-.32.42-.26.71-.16.29.11 1.83.86 2.14 1.02.31.16.52.24.6.37.07.13.07.74-.18 1.44z"/></svg>';
  document.body.appendChild(a);
}

/* =============================================================================
   DESIGN TOKENS
   ============================================================================= */
function renderNavMenu() {
  const host = document.querySelector('.nav-links');
  if (!host) return;
  if (!menuItems.length) return;          // keep fallback HTML if no DB rows
  host.innerHTML = menuItems
    .map(m => `<a href="${escAttr(m.target)}">${esc(m.label)}</a>`)
    .join('');
}

function applyDesign(d) {
  const r = document.documentElement.style;
  if (d.background_color)   r.setProperty('--bg',          d.background_color);
  if (d.section_background) r.setProperty('--surface',     d.section_background);
  if (d.card_background)    r.setProperty('--surface-2',   d.card_background);
  if (d.text_color)         r.setProperty('--text',        d.text_color);
  if (d.border_color)       r.setProperty('--border',      d.border_color);
  if (d.primary_color)      r.setProperty('--amber',       d.primary_color);
  if (d.secondary_color)    r.setProperty('--brand-green', d.secondary_color);
  if (d.button_radius)      r.setProperty('--radius',      d.button_radius);
  if (d.card_radius)        r.setProperty('--radius-lg',   d.card_radius);

  if (d.font_family)       document.body.style.fontFamily = d.font_family;
  if (d.body_text_size)    document.body.style.fontSize   = d.body_text_size;
}

function videoAttrs(d) {
  const attrs = [];
  if (d.video_controls !== false) attrs.push('controls');
  if (d.video_autoplay)           attrs.push('autoplay');
  if (d.video_muted)              attrs.push('muted');
  if (d.video_loop)               attrs.push('loop');
  attrs.push('playsinline');
  attrs.push('preload="metadata"');
  return attrs.join(' ');
}

/* =============================================================================
   HELPERS
   ============================================================================= */
function el(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));
}

function escAttr(s) { return esc(s); }

function renderIcon(icon) {
  if (!icon) return '';
  // Defined inside the function to avoid TDZ — renderIcon is called by
  // renderers that run while the module is still executing top-level code.
  const LINE_ICONS = new Set([
    'calendar','clock','monitor','timer','brain','cpu','tools','map','leaf',
    'sunrise','moon','users','grad','briefcase','rocket','alert','target',
    'video','mobile','chat','code',
  ]);
  if (LINE_ICONS.has(icon)) {
    return `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><use href="#i-${icon}"/></svg>`;
  }
  return esc(icon); // emoji / arbitrary text fallback
}
