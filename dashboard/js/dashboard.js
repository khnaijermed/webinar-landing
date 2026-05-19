import { supabase } from './supabase-client.js';
import { initLayout, formatRelative } from './layout.js';

await initLayout({ active: 'overview' });

const [leads, sections, mediaVideos, mediaImages, faqs, formFields, design] = await Promise.all([
  supabase.from('leads').select('id, created_at').order('created_at', { ascending: false }),
  supabase.from('sections').select('id', { count: 'exact', head: true }).eq('is_active', true),
  supabase.from('media').select('id', { count: 'exact', head: true }).eq('type', 'video'),
  supabase.from('media').select('id', { count: 'exact', head: true }).eq('type', 'image'),
  supabase.from('faqs').select('id', { count: 'exact', head: true }).eq('is_active', true),
  supabase.from('form_fields').select('id', { count: 'exact', head: true }).eq('is_active', true),
  supabase.from('design_settings').select('whatsapp_enabled, sticky_cta_enabled, faq_button_enabled').limit(1).maybeSingle(),
]);

const leadRows = leads.data || [];
const startOfDay = new Date(); startOfDay.setHours(0,0,0,0);
const today = leadRows.filter(r => new Date(r.created_at) >= startOfDay).length;
const d = design.data || {};

const txt = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
const statusBadge = (enabled) => enabled ? '✓ مفعّل' : '✕ معطّل';

txt('stat-leads',    leadRows.length.toLocaleString('en-US'));
txt('stat-today',    today.toLocaleString('en-US'));
txt('stat-sections', (sections.count ?? 0).toLocaleString('en-US'));
txt('stat-faqs',     (faqs.count ?? 0).toLocaleString('en-US'));
txt('stat-videos',   (mediaVideos.count ?? 0).toLocaleString('en-US'));
txt('stat-images',   (mediaImages.count ?? 0).toLocaleString('en-US'));
txt('stat-fields',   (formFields.count ?? 0).toLocaleString('en-US'));
txt('stat-latest',   leadRows.length ? formatRelative(leadRows[0].created_at) : '—');
txt('stat-wa',       statusBadge(d.whatsapp_enabled));
txt('stat-cta',      statusBadge(d.sticky_cta_enabled));
txt('stat-faqb',     statusBadge(d.faq_button_enabled));
txt('stat-form',     (formFields.count ?? 0) > 0 ? '✓ مفعّل' : '✕ معطّل');
