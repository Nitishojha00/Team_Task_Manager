// ── Projects Page ────────────────────────────────────────────

async function renderProjectsPage(container) {
  try {
    const { projects } = await api.getProjects();
    state.projects = projects;
    await refreshProjectNav();

    container.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.5rem">
        <div>
          <h2 style="font-size:1.25rem">Projects</h2>
          <p style="font-size:0.78rem;color:var(--text3);margin-top:0.25rem">${projects.length} project${projects.length !== 1 ? 's' : ''}</p>
        </div>
        <button class="btn btn-primary" onclick="showCreateProjectModal()">
          ${Icons.plus} New Project
        </button>
      </div>
      ${projects.length ? `
        <div class="projects-grid">${projects.map(p => projectCard(p)).join('')}</div>
      ` : `
        <div class="empty-state" style="padding:4rem 1rem">
          ${Icons.projects}
          <h3>No projects yet</h3>
          <p>Create your first project to start collaborating</p>
          <button class="btn btn-primary mt-4" onclick="showCreateProjectModal()">${Icons.plus} Create Project</button>
        </div>
      `}
    `;
  } catch (err) {
    container.innerHTML = `<div class="empty-state"><p style="color:var(--danger)">${err.message}</p></div>`;
  }
}

function projectCard(p) {
  const memberCount = p.members?.length || 0;
  return `
    <div class="project-card" style="--project-color:${p.color}" onclick="navigateTo('project',{projectId:'${p._id}'})">
      <div class="p-name">${esc(p.name)}</div>
      <div class="p-desc">${esc(p.description || 'No description')}</div>
      <div class="p-footer">
        <div class="p-stats"><span>${Icons.members} ${memberCount}</span></div>
        <div class="avatar-stack">
          ${(p.members || []).slice(0, 4).map(m => avatar(m.user, 'avatar-sm')).join('')}
          ${memberCount > 4 ? `<div class="avatar avatar-sm" style="background:var(--bg4);color:var(--text2)">+${memberCount - 4}</div>` : ''}
        </div>
      </div>
    </div>`;
}

// ── Create Project Modal ──────────────────────────────────────
function showCreateProjectModal(onSuccess) {
  const body = `
    <div class="form-group">
      <label>PROJECT NAME *</label>
      <input id="cp-name" class="form-control" placeholder="e.g. Website Redesign" maxlength="100">
      <div id="cp-name-err" class="form-error hidden"></div>
    </div>
    <div class="form-group">
      <label>DESCRIPTION</label>
      <textarea id="cp-desc" class="form-control" placeholder="What is this project about?" rows="3" maxlength="500"></textarea>
    </div>
    <div class="form-group">
      <label>COLOR</label>
      <div class="color-options" id="cp-colors">
        ${PROJECT_COLORS.map((c, i) => `
          <div class="color-opt ${i === 5 ? 'selected' : ''}" style="background:${c}" data-color="${c}" onclick="selectColor(this,'cp-colors')"></div>
        `).join('')}
      </div>
    </div>`;

  const footer = `
    <button class="btn btn-outline" onclick="document.getElementById('modal-create-project').remove()">Cancel</button>
    <button class="btn btn-primary" id="cp-submit-btn" onclick="submitCreateProject()">Create Project</button>`;

  createModal('modal-create-project', 'New Project', body, footer);
  document.getElementById('cp-name').focus();
  window._createProjectCallback = onSuccess || null;
}

function selectColor(el, groupId) {
  document.querySelectorAll(`#${groupId} .color-opt`).forEach(e => e.classList.remove('selected'));
  el.classList.add('selected');
}

async function submitCreateProject() {
  const name = document.getElementById('cp-name').value.trim();
  const description = document.getElementById('cp-desc').value.trim();
  const colorEl = document.querySelector('#cp-colors .color-opt.selected');
  const color = colorEl?.dataset.color || '#6366f1';

  if (!name) {
    document.getElementById('cp-name-err').textContent = 'Project name is required';
    document.getElementById('cp-name-err').classList.remove('hidden');
    return;
  }

  const btn = document.getElementById('cp-submit-btn');
  setLoading(btn, true);
  try {
    const { project } = await api.createProject({ name, description, color });
    document.getElementById('modal-create-project')?.remove();
    toast(`Project "${project.name}" created!`, 'success');
    await refreshProjectNav();
    if (window._createProjectCallback) {
      window._createProjectCallback(project);
    } else {
      navigateTo('project', { projectId: project._id });
    }
  } catch (err) {
    toast(err.message, 'error');
    setLoading(btn, false);
  }
}

// ── Project Detail ────────────────────────────────────────────
async function renderProjectDetail(container, projectId) {
  try {
    const [{ project, role }, { tasks }] = await Promise.all([
      api.getProject(projectId),
      api.getTasks({ project: projectId })
    ]);
    state.currentProject = project;
    state.currentProjectRole = role;

    document.getElementById('topbar-title').innerHTML =
      `<span style="color:var(--text3)">Projects /</span> ${esc(project.name)}`;

    container.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.5rem;flex-wrap:wrap;gap:0.75rem">
        <div style="display:flex;align-items:center;gap:0.75rem">
          <div style="width:12px;height:12px;border-radius:50%;background:${project.color};flex-shrink:0"></div>
          <div>
            <h2 style="font-size:1.2rem">${esc(project.name)}</h2>
            ${project.description ? `<p style="font-size:0.78rem;color:var(--text3)">${esc(project.description)}</p>` : ''}
          </div>
        </div>
        <div style="display:flex;gap:0.5rem">
          ${role === 'admin' ? `<button class="btn btn-outline btn-sm" onclick="showProjectSettingsModal('${project._id}')">${Icons.settings} Settings</button>` : ''}
          <button class="btn btn-primary btn-sm" onclick="showCreateTaskModal('${project._id}')">${Icons.plus} Add Task</button>
        </div>
      </div>
      <div class="tabs">
        <button class="tab-btn active" onclick="switchProjectTab(this,'board','${projectId}')">Kanban Board</button>
        <button class="tab-btn" onclick="switchProjectTab(this,'list','${projectId}')">List View</button>
        <button class="tab-btn" onclick="switchProjectTab(this,'members','${projectId}')">Members (${project.members.length})</button>
      </div>
      <div id="project-tab-content"></div>
    `;

    renderKanbanBoard(document.getElementById('project-tab-content'), tasks, project, role);
  } catch (err) {
    container.innerHTML = `<div class="empty-state"><p style="color:var(--danger)">${err.message}</p></div>`;
  }
}

async function switchProjectTab(btn, tab, projectId) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const content = document.getElementById('project-tab-content');
  content.innerHTML = '<div class="empty-state"><div class="spinner"></div></div>';

  if (tab === 'members') {
    const { project, role } = await api.getProject(projectId);
    renderMembersTab(content, project, role);
  } else {
    const { tasks } = await api.getTasks({ project: projectId });
    if (tab === 'board') {
      renderKanbanBoard(content, tasks, state.currentProject, state.currentProjectRole);
    } else {
      renderTaskListView(content, tasks, state.currentProject, state.currentProjectRole);
    }
  }
}

// ── Kanban Board ──────────────────────────────────────────────
function renderKanbanBoard(container, tasks, project, role) {
  const columns = [
    { key: 'todo', label: 'To Do', color: 'var(--todo)' },
    { key: 'in_progress', label: 'In Progress', color: 'var(--inprog)' },
    { key: 'review', label: 'Review', color: 'var(--review)' },
    { key: 'done', label: 'Done', color: 'var(--done)' },
  ];
  const byStatus = {};
  columns.forEach(c => { byStatus[c.key] = []; });
  tasks.forEach(t => { if (byStatus[t.status]) byStatus[t.status].push(t); });

  container.innerHTML = `
    <div class="kanban-board">
      ${columns.map(col => `
        <div class="kanban-col">
          <div class="kanban-col-header">
            <div class="col-title">
              <div class="col-dot" style="background:${col.color}"></div>
              ${col.label}
            </div>
            <span style="font-size:0.72rem;color:var(--text3)">${byStatus[col.key].length}</span>
          </div>
          ${byStatus[col.key].map(t => kanbanTaskCard(t)).join('')}
          <button class="btn btn-ghost btn-sm btn-full mt-2" style="border:1px dashed var(--border);color:var(--text3)"
            onclick="showCreateTaskModal('${project._id}','${col.key}')">
            ${Icons.plus} Add Task
          </button>
        </div>
      `).join('')}
    </div>`;
}

function kanbanTaskCard(t) {
  const overdue = t.isOverdue || isDueOverdue(t.dueDate);
  return `
    <div class="task-card ${overdue ? 'overdue' : ''}" style="--priority-color:${priorityColor(t.priority)};flex-direction:column;gap:0.5rem" onclick="showTaskDetail('${t._id}')">
      <div class="task-title ${t.status === 'done' ? 'done' : ''}">${esc(t.title)}</div>
      <div style="display:flex;align-items:center;justify-content:space-between;gap:0.5rem">
        <div style="display:flex;gap:0.375rem;flex-wrap:wrap">${priorityBadge(t.priority)}</div>
        <div style="display:flex;align-items:center;gap:0.375rem">
          ${t.dueDate ? `<div class="due-date ${overdue ? 'overdue' : ''}">${Icons.calendar}${formatDueDate(t.dueDate)}</div>` : ''}
          ${t.assignee ? avatar(t.assignee, 'avatar-sm') : ''}
        </div>
      </div>
    </div>`;
}

function renderTaskListView(container, tasks, project, role) {
  container.innerHTML = `
    <div class="task-list">
      ${tasks.length ? tasks.map(t => fullTaskCard(t)).join('') : `
        <div class="empty-state">
          <p>No tasks yet. <a href="#" onclick="showCreateTaskModal('${project._id}');return false;" style="color:var(--accent)">Create one →</a></p>
        </div>
      `}
    </div>`;
}

// ── Members Tab ───────────────────────────────────────────────
function renderMembersTab(container, project, role) {
  container.innerHTML = `
    ${role === 'admin' ? `
      <div class="card" style="margin-bottom:1rem">
        <h4 style="font-size:0.85rem;margin-bottom:0.75rem">Add Member</h4>
        <div style="display:flex;gap:0.75rem">
          <input id="add-member-email" class="form-control" placeholder="member@email.com" style="flex:1">
          <select id="add-member-role" class="form-control" style="width:120px">
            <option value="member">Member</option>
            <option value="admin">Admin</option>
          </select>
          <button class="btn btn-primary" onclick="addMember('${project._id}')">Add</button>
        </div>
        <div id="add-member-err" class="form-error hidden mt-1"></div>
      </div>
    ` : ''}
    <div class="card">
      <h4 style="font-size:0.85rem;margin-bottom:0.75rem">Team Members (${project.members.length})</h4>
      ${project.members.map(m => `
        <div class="member-item">
          ${avatar(m.user)}
          <div class="info">
            <div class="name">${esc(m.user.name)} ${m.user._id === project.owner?._id ? '<span style="font-size:0.65rem;color:var(--accent)">OWNER</span>' : ''}</div>
            <div class="email">${esc(m.user.email)}</div>
          </div>
          <span class="badge ${m.role === 'admin' ? 'badge-inprog' : 'badge-todo'}">${m.role}</span>
          ${role === 'admin' && m.user._id !== project.owner?._id ? `
            <button class="btn btn-danger btn-sm" onclick="removeMember('${project._id}','${m.user._id}')">Remove</button>
          ` : ''}
        </div>
      `).join('')}
    </div>`;
}

async function addMember(projectId) {
  const email = document.getElementById('add-member-email').value.trim();
  const memberRole = document.getElementById('add-member-role').value;
  const errEl = document.getElementById('add-member-err');
  errEl.classList.add('hidden');
  if (!email) { errEl.textContent = 'Email is required'; errEl.classList.remove('hidden'); return; }
  try {
    await api.addMember(projectId, { email, role: memberRole });
    toast('Member added!', 'success');
    document.getElementById('add-member-email').value = '';
    const { project, role } = await api.getProject(projectId);
    state.currentProject = project;
    renderMembersTab(document.getElementById('project-tab-content'), project, role);
    await refreshProjectNav();
  } catch (err) {
    errEl.textContent = err.message;
    errEl.classList.remove('hidden');
  }
}

async function removeMember(projectId, userId) {
  if (!confirm('Remove this member?')) return;
  try {
    await api.removeMember(projectId, userId);
    toast('Member removed', 'success');
    const { project, role } = await api.getProject(projectId);
    state.currentProject = project;
    renderMembersTab(document.getElementById('project-tab-content'), project, role);
  } catch (err) {
    toast(err.message, 'error');
  }
}

// ── Project Settings Modal ────────────────────────────────────
async function showProjectSettingsModal(projectId) {
  const { project } = await api.getProject(projectId);
  const body = `
    <div class="form-group">
      <label>PROJECT NAME</label>
      <input id="ps-name" class="form-control" value="${esc(project.name)}" maxlength="100">
    </div>
    <div class="form-group">
      <label>DESCRIPTION</label>
      <textarea id="ps-desc" class="form-control" rows="3" maxlength="500">${esc(project.description || '')}</textarea>
    </div>
    <div class="form-group">
      <label>COLOR</label>
      <div class="color-options" id="ps-colors">
        ${PROJECT_COLORS.map(c => `
          <div class="color-opt ${c === project.color ? 'selected' : ''}" style="background:${c}" data-color="${c}" onclick="selectColor(this,'ps-colors')"></div>
        `).join('')}
      </div>
    </div>
    <hr class="divider">
    <div style="background:rgba(255,77,109,0.05);border:1px solid rgba(255,77,109,0.2);border-radius:var(--radius);padding:1rem">
      <h4 style="font-size:0.85rem;color:var(--danger);margin-bottom:0.5rem">Danger Zone</h4>
      <p style="font-size:0.78rem;color:var(--text2);margin-bottom:0.75rem">Deleting a project removes all its tasks permanently.</p>
      <button class="btn btn-danger btn-sm" onclick="deleteProject('${projectId}')">Delete Project</button>
    </div>`;

  const footer = `
    <button class="btn btn-outline" onclick="document.getElementById('modal-project-settings').remove()">Cancel</button>
    <button class="btn btn-primary" onclick="submitUpdateProject('${projectId}')">Save Changes</button>`;

  createModal('modal-project-settings', 'Project Settings', body, footer);
}

async function submitUpdateProject(projectId) {
  const name = document.getElementById('ps-name').value.trim();
  const description = document.getElementById('ps-desc').value.trim();
  const colorEl = document.querySelector('#ps-colors .color-opt.selected');
  const color = colorEl?.dataset.color;
  try {
    await api.updateProject(projectId, { name, description, color });
    document.getElementById('modal-project-settings')?.remove();
    toast('Project updated!', 'success');
    await refreshProjectNav();
    navigateTo('project', { projectId });
  } catch (err) {
    toast(err.message, 'error');
  }
}

async function deleteProject(projectId) {
  if (!confirm('Delete this project and ALL its tasks? This cannot be undone.')) return;
  try {
    await api.deleteProject(projectId);
    document.getElementById('modal-project-settings')?.remove();
    toast('Project deleted', 'success');
    await refreshProjectNav();
    navigateTo('projects');
  } catch (err) {
    toast(err.message, 'error');
  }
}