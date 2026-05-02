// ── Sidebar ──────────────────────────────────────────────────

async function renderSidebar() {
  const u = state.user;
  document.getElementById('sidebar-user').innerHTML = `
    ${avatar(u, 'avatar-sm')}
    <div class="info">
      <div class="name">${esc(u.name)}</div>
      <div class="role">Member</div>
    </div>
    <button class="btn btn-ghost btn-icon btn-sm" onclick="logout()" title="Logout">${Icons.logout}</button>
  `;
  await refreshProjectNav();
}

async function refreshProjectNav() {
  try {
    const { projects } = await api.getProjects();
    state.projects = projects;
    const navEl = document.getElementById('projects-nav');
    if (!navEl) return;
    if (!projects.length) {
      navEl.innerHTML = `<div style="padding:0.4rem 0.75rem;font-size:0.72rem;color:var(--text3)">No projects yet</div>`;
      return;
    }
    navEl.innerHTML = projects.map(p => `
      <div class="nav-item" data-project="${p._id}" onclick="navigateTo('project',{projectId:'${p._id}'})">
        <span class="nav-project-dot" style="background:${p.color}"></span>
        <span class="truncate">${esc(p.name)}</span>
      </div>
    `).join('');
  } catch (e) {
    console.error('Failed to load projects nav', e);
  }
}