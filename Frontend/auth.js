// ── Auth UI ──────────────────────────────────────────────────

function switchAuthTab(tab) {
  document.getElementById('login-form').classList.toggle('hidden', tab !== 'login');
  document.getElementById('signup-form').classList.toggle('hidden', tab !== 'signup');
}

function setupAuth() {
  // Login
  document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('[type=submit]');
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    clearAuthError('login');
    if (!email || !password) return showAuthError('login', 'All fields required');
    setLoading(btn, true);
    try {
      const { token, user } = await api.login({ email, password });
      api.setToken(token);
      state.user = user;
      await showMainApp();
      toast(`Welcome back, ${user.name}!`, 'success');
    } catch (err) {
      showAuthError('login', err.message);
    } finally {
      setLoading(btn, false);
    }
  });

  // Signup
  document.getElementById('signup-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('[type=submit]');
    const name = document.getElementById('signup-name').value.trim();
    const email = document.getElementById('signup-email').value.trim();
    const password = document.getElementById('signup-password').value;
    clearAuthError('signup');
    if (!name || !email || !password) return showAuthError('signup', 'All fields required');
    if (password.length < 6) return showAuthError('signup', 'Password must be at least 6 characters');
    setLoading(btn, true);
    try {
      const { token, user } = await api.signup({ name, email, password });
      api.setToken(token);
      state.user = user;
      await showMainApp();
      toast(`Account created! Welcome, ${user.name}!`, 'success');
    } catch (err) {
      showAuthError('signup', err.message);
    } finally {
      setLoading(btn, false);
    }
  });
}

function showAuthError(form, msg) {
  const el = document.getElementById(`${form}-error`);
  if (el) { el.textContent = msg; el.classList.remove('hidden'); }
}

function clearAuthError(form) {
  const el = document.getElementById(`${form}-error`);
  if (el) el.classList.add('hidden');
}