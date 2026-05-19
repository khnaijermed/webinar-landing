import { supabase } from './supabase-client.js';

const form  = document.getElementById('login-form');
const msgEl = document.getElementById('login-msg');
const btn   = document.getElementById('login-btn');

function setMsg(text, kind) {
  msgEl.textContent = text || '';
  msgEl.className = 'form-msg' + (kind ? ' ' + kind : '');
}

(async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) window.location.replace('./index.html');
})();

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  setMsg('');

  const email    = form.email.value.trim();
  const password = form.password.value;

  if (!email || !password) {
    setMsg('من فضلك أدخل البريد وكلمة المرور.', 'error');
    return;
  }

  btn.disabled = true;
  const originalText = btn.textContent;
  btn.textContent = 'جاري الدخول…';

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    setMsg('بيانات الدخول غير صحيحة.', 'error');
    btn.disabled = false;
    btn.textContent = originalText;
    return;
  }

  // Role gate — only Administrator members can access the dashboard
  const authedEmail = data.user?.email || email;
  const { data: members } = await supabase
    .from('leads')
    .select('role')
    .ilike('email', authedEmail);
  const isAdmin = (members || []).some(m => m.role === 'Administrator');

  if (!isAdmin) {
    await supabase.auth.signOut();
    setMsg('You can not use this service', 'error');
    btn.disabled = false;
    btn.textContent = originalText;
    return;
  }

  window.location.replace('./index.html');
});
