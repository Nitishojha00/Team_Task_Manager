// ── Tasks Page ───────────────────────────────────────────────

async function renderTasksPage(container, filters = {}) {
  try {
    const [{ tasks }, { projects }] = await Promise.all([
      api.getTasks(filters),
      api.getProjects()
    ]);

    container.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.25rem;flex-wrap:wrap;gap:0.75rem">
        <div>
          <h2 style="font-size:1.25rem">All Tasks</h2>
          <p style="font-size:0.78rem;color:var(--text3)">${tasks.length} task${tasks.length !== 1 ? 's' : ''}</p>
        </div>
        <button class="btn btn-primary btn-sm" onclick="showCreateTaskModal()">
          ${Icons.plus} New Task
        </button>
      </div>
      <div class="filters-bar">
        <input class="search-input" id="task-search" placeholder="Search tasks..." value="${esc(filters.search || '')}">
        <select class="filter-select" id="filter-project" onchange="applyTaskFilters()">
          <option value="">All Projects</option>
          ${projects.map(p => `<option value="${p._id}" ${filters.project === p._id ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}
        </select>
        <select class="filter-select" id="filter-status" onchange="applyTaskFilters()">
          <option value="">All Status</option>
          <option value="todo" ${filters.status === 'todo' ? 'selected' : ''}>To Do</option>
          <option value="in_progress" ${filters.status === 'in_progress' ? 'selected' : ''}>In Progress</option>
          <option value="review" ${filters.status === 'review' ? 'selected' : ''}>Review</option>
          <option value="done" ${filters.status === 'done' ? 'selected' : ''}>Done</option>
        </select>
        <select class="filter-select" id="filter-priority" onchange="applyTaskFilters()">
          <option value="">All Priority</option>
          <option value="urgent" ${filters.priority === 'urgent' ? 'selected' : ''}>Urgent</option>
          <option value="high" ${filters.priority === 'high' ? 'selected' : ''}>High</option>
          <option value="medium" ${filters.priority === 'medium' ? 'selected' : ''}>Medium</option>
          <option value="low" ${filters.priority === 'low' ? 'selected' : ''}>Low</option>
        </select>
        <select class="filter-select" id="filter-assignee" onchange="applyTaskFilters()">
          <option value="">All Assignees</option>
          <option value="me" ${filters.assignee === 'me' ? 'selected' : ''}>Assigned to Me</option>
        </select>
      </div>
      <div class="task-list" id="tasks-list">
        ${tasks.length ? tasks.map(t => fullTaskCard(t)).join('') : `
          <div class="empty-state">
            ${Icons.tasks}
            <h3>No tasks found</h3>
            <p>Try adjusting filters or create a new task</p>
          </div>
        `}
      </div>
    `;

    let searchTimer;
    document.getElementById('task-search').addEventListener('input', () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(applyTaskFilters, 400);
    });
  } catch (err) {
    container.innerHTML = `<div class="empty-state"><p style="color:var(--danger)">${err.message}</p></div>`;
  }
}

function applyTaskFilters() {
  const filters = {};
  const search = document.getElementById('task-search')?.value.trim();
  const project = document.getElementById('filter-project')?.value;
  const status = document.getElementById('filter-status')?.value;
  const priority = document.getElementById('filter-priority')?.value;
  const assignee = document.getElementById('filter-assignee')?.value;
  if (search) filters.search = search;
  if (project) filters.project = project;
  if (status) filters.status = status;
  if (priority) filters.priority = priority;
  if (assignee) filters.assignee = assignee;
  renderTasksPage(document.getElementById('content-area'), filters);
}

async function renderOverduePage(container) {
  try {
    const { tasks } = await api.getTasks({ overdue: 'true' });
    container.innerHTML = `
      <div style="margin-bottom:1.25rem">
        <h2 style="font-size:1.25rem">Overdue Tasks</h2>
        <p style="font-size:0.78rem;color:var(--danger)">${tasks.length} overdue task${tasks.length !== 1 ? 's' : ''}</p>
      </div>
      <div class="task-list">
        ${tasks.length ? tasks.map(t => fullTaskCard(t)).join('') : `
          <div class="empty-state">
            <svg width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24" style="opacity:0.3"><path d="M20 6L9 17l-5-5"/></svg>
            <h3>No overdue tasks!</h3>
            <p>You're all caught up 🎉</p>
          </div>
        `}
      </div>`;
  } catch (err) {
    container.innerHTML = `<div class="empty-state"><p style="color:var(--danger)">${err.message}</p></div>`;
  }
}

// ── Full Task Card ────────────────────────────────────────────
function fullTaskCard(t) {
  const overdue = t.isOverdue || isDueOverdue(t.dueDate);
  return `
    <div class="task-card ${overdue ? 'overdue' : ''}" style="--priority-color:${priorityColor(t.priority)}" onclick="showTaskDetail('${t._id}')">
      <div class="task-body">
        <div class="task-title ${t.status === 'done' ? 'done' : ''}">${esc(t.title)}</div>
        <div class="task-meta">
          ${statusBadge(t.status)}
          ${priorityBadge(t.priority)}
          ${t.project ? `<span style="font-size:0.68rem;color:var(--text3)">${esc(t.project.name)}</span>` : ''}
          ${t.dueDate ? `<div class="due-date ${overdue ? 'overdue' : ''}">${Icons.calendar}${formatDueDate(t.dueDate)}</div>` : ''}
        </div>
      </div>
      <div class="task-right">
        ${t.assignee ? avatar(t.assignee, 'avatar-sm') : `<span style="font-size:0.7rem;color:var(--text3)">Unassigned</span>`}
        <span style="font-size:0.68rem;color:var(--text3)">${formatDate(t.createdAt)}</span>
      </div>
    </div>`;
}

// ── Create Task Modal ─────────────────────────────────────────
async function showCreateTaskModal(projectId = '', defaultStatus = 'todo') {
  const { projects } = await api.getProjects();
  if (!projects.length) {
    if (confirm('You need a project first. Create one now?')) {
      showCreateProjectModal((p) => showCreateTaskModal(p._id));
    }
    return;
  }

  const body = `
    <div class="form-group">
      <label>TASK TITLE *</label>
      <input id="ct-title" class="form-control" placeholder="What needs to be done?" maxlength="200">
      <div id="ct-title-err" class="form-error hidden"></div>
    </div>
    <div class="form-group">
      <label>DESCRIPTION</label>
      <textarea id="ct-desc" class="form-control" placeholder="Add more details..." rows="3" maxlength="2000"></textarea>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>PROJECT *</label>
        <select id="ct-project" class="form-control" onchange="loadProjectMembers(this.value,'ct-assignee')">
          <option value="">Select project...</option>
          ${projects.map(p => `<option value="${p._id}" ${p._id === projectId ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}
        </select>
        <div id="ct-project-err" class="form-error hidden"></div>
      </div>
      <div class="form-group">
        <label>ASSIGNEE</label>
        <select id="ct-assignee" class="form-control">
          <option value="">Unassigned</option>
        </select>
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>STATUS</label>
        <select id="ct-status" class="form-control">
          <option value="todo" ${defaultStatus === 'todo' ? 'selected' : ''}>To Do</option>
          <option value="in_progress" ${defaultStatus === 'in_progress' ? 'selected' : ''}>In Progress</option>
          <option value="review" ${defaultStatus === 'review' ? 'selected' : ''}>Review</option>
          <option value="done" ${defaultStatus === 'done' ? 'selected' : ''}>Done</option>
        </select>
      </div>
      <div class="form-group">
        <label>PRIORITY</label>
        <select id="ct-priority" class="form-control">
          <option value="low">Low</option>
          <option value="medium" selected>Medium</option>
          <option value="high">High</option>
          <option value="urgent">Urgent</option>
        </select>
      </div>
    </div>
    <div class="form-group">
      <label>DUE DATE</label>
      <input id="ct-due" type="date" class="form-control">
    </div>`;

  const footer = `
    <button class="btn btn-outline" onclick="document.getElementById('modal-create-task').remove()">Cancel</button>
    <button class="btn btn-primary" id="ct-submit-btn" onclick="submitCreateTask()">Create Task</button>`;

  createModal('modal-create-task', 'New Task', body, footer);
  document.getElementById('ct-title').focus();
  if (projectId) loadProjectMembers(projectId, 'ct-assignee');
}

async function loadProjectMembers(projectId, selectId) {
  const sel = document.getElementById(selectId);
  if (!sel || !projectId) return;
  try {
    const { project } = await api.getProject(projectId);
    sel.innerHTML = '<option value="">Unassigned</option>' +
      project.members.map(m => `<option value="${m.user._id}">${esc(m.user.name)}</option>`).join('');
  } catch (e) {}
}

async function submitCreateTask() {
  const title = document.getElementById('ct-title').value.trim();
  const description = document.getElementById('ct-desc').value.trim();
  const project = document.getElementById('ct-project').value;
  const assignee = document.getElementById('ct-assignee').value;
  const status = document.getElementById('ct-status').value;
  const priority = document.getElementById('ct-priority').value;
  const dueDate = document.getElementById('ct-due').value;

  document.getElementById('ct-title-err').classList.add('hidden');
  document.getElementById('ct-project-err').classList.add('hidden');
  let valid = true;
  if (!title) {
    document.getElementById('ct-title-err').textContent = 'Title is required';
    document.getElementById('ct-title-err').classList.remove('hidden');
    valid = false;
  }
  if (!project) {
    document.getElementById('ct-project-err').textContent = 'Project is required';
    document.getElementById('ct-project-err').classList.remove('hidden');
    valid = false;
  }
  if (!valid) return;

  const btn = document.getElementById('ct-submit-btn');
  setLoading(btn, true);
  try {
    const payload = { title, project, status, priority };
    if (description) payload.description = description;
    if (assignee) payload.assignee = assignee;
    if (dueDate) payload.dueDate = dueDate;
    await api.createTask(payload);
    document.getElementById('modal-create-task')?.remove();
    toast('Task created!', 'success');
    refreshCurrentView();
  } catch (err) {
    toast(err.message, 'error');
    setLoading(btn, false);
  }
}

// ── Task Detail Modal ─────────────────────────────────────────
async function showTaskDetail(taskId) {
  try {
    const { task } = await api.getTask(taskId);
    const overdue = isDueOverdue(task.dueDate) && task.status !== 'done';
    const projectMembers = task.project?.members || [];

    const body = `
      <div style="display:flex;align-items:flex-start;gap:1rem;flex-wrap:wrap">
        <div style="flex:1;min-width:280px">
          <div class="form-group">
            <label>TITLE</label>
            <input id="td-title" class="form-control" value="${esc(task.title)}" maxlength="200">
          </div>
          <div class="form-group">
            <label>DESCRIPTION</label>
            <textarea id="td-desc" class="form-control" rows="4" maxlength="2000">${esc(task.description || '')}</textarea>
          </div>
        </div>
        <div style="width:200px;flex-shrink:0">
          <div class="form-group">
            <label>STATUS</label>
            <select id="td-status" class="form-control">
              <option value="todo" ${task.status==='todo'?'selected':''}>To Do</option>
              <option value="in_progress" ${task.status==='in_progress'?'selected':''}>In Progress</option>
              <option value="review" ${task.status==='review'?'selected':''}>Review</option>
              <option value="done" ${task.status==='done'?'selected':''}>Done</option>
            </select>
          </div>
          <div class="form-group">
            <label>PRIORITY</label>
            <select id="td-priority" class="form-control">
              <option value="low" ${task.priority==='low'?'selected':''}>Low</option>
              <option value="medium" ${task.priority==='medium'?'selected':''}>Medium</option>
              <option value="high" ${task.priority==='high'?'selected':''}>High</option>
              <option value="urgent" ${task.priority==='urgent'?'selected':''}>Urgent</option>
            </select>
          </div>
          <div class="form-group">
            <label>ASSIGNEE</label>
            <select id="td-assignee" class="form-control">
              <option value="">Unassigned</option>
              ${projectMembers.map(m => `<option value="${m.user._id||m.user}" ${(task.assignee?._id||task.assignee)==(m.user._id||m.user)?'selected':''}>${esc(m.user.name||'')}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>DUE DATE</label>
            <input id="td-due" type="date" class="form-control ${overdue?'error':''}" value="${task.dueDate?new Date(task.dueDate).toISOString().split('T')[0]:''}">
          </div>
          <div style="font-size:0.72rem;color:var(--text3);line-height:1.8">
            <div>Created by ${esc(task.creator?.name || 'Unknown')}</div>
            <div>${formatDate(task.createdAt)}</div>
            ${task.project?`<div style="margin-top:0.25rem">Project: <span style="color:var(--text2)">${esc(task.project.name)}</span></div>`:''}
          </div>
        </div>
      </div>
      <hr class="divider">
      <h4 style="font-size:0.8rem;margin-bottom:0.75rem;color:var(--text2)" id="comment-count-title">COMMENTS (${task.comments?.length||0})</h4>
      <div id="comments-list" style="margin-bottom:0.75rem">
        ${(task.comments||[]).length ? (task.comments||[]).map(c => commentHTML(c)).join('') : `<p style="font-size:0.78rem;color:var(--text3)">No comments yet</p>`}
      </div>
      <div style="display:flex;gap:0.75rem">
        <input id="td-comment" class="form-control" placeholder="Add a comment..." style="flex:1">
        <button class="btn btn-outline btn-sm" onclick="submitComment('${taskId}')">Post</button>
      </div>`;

    const footer = `
      <button class="btn btn-danger btn-sm" onclick="confirmDeleteTask('${taskId}')">${Icons.trash} Delete</button>
      <div style="flex:1"></div>
      <button class="btn btn-outline" onclick="document.getElementById('modal-task-detail').remove()">Cancel</button>
      <button class="btn btn-primary" onclick="submitUpdateTask('${taskId}')">Save Changes</button>`;

    createModal('modal-task-detail', esc(task.title), body, footer, 'modal-lg');

    document.getElementById('td-comment').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') submitComment(taskId);
    });
  } catch (err) {
    toast(err.message, 'error');
  }
}

function commentHTML(c) {
  return `
    <div style="display:flex;gap:0.625rem;margin-bottom:0.75rem">
      ${avatar(c.author, 'avatar-sm')}
      <div style="flex:1">
        <div style="font-size:0.75rem;color:var(--text2);margin-bottom:0.25rem">
          <strong>${esc(c.author?.name)}</strong>
          <span style="color:var(--text3);margin-left:0.375rem">${formatDate(c.createdAt)}</span>
        </div>
        <div style="font-size:0.82rem;color:var(--text);white-space:pre-wrap">${esc(c.text)}</div>
      </div>
    </div>`;
}

async function submitUpdateTask(taskId) {
  const title = document.getElementById('td-title').value.trim();
  const description = document.getElementById('td-desc').value.trim();
  const status = document.getElementById('td-status').value;
  const priority = document.getElementById('td-priority').value;
  const assignee = document.getElementById('td-assignee').value;
  const dueDate = document.getElementById('td-due').value;

  if (!title) { toast('Title is required', 'error'); return; }
  try {
    await api.updateTask(taskId, {
      title, description, status, priority,
      assignee: assignee || null,
      dueDate: dueDate || null
    });
    document.getElementById('modal-task-detail')?.remove();
    toast('Task updated!', 'success');
    refreshCurrentView();
  } catch (err) {
    toast(err.message, 'error');
  }
}

async function submitComment(taskId) {
  const input = document.getElementById('td-comment');
  const text = input.value.trim();
  if (!text) return;
  try {
    const { comments } = await api.addComment(taskId, text);
    input.value = '';
    document.getElementById('comments-list').innerHTML = comments.map(c => commentHTML(c)).join('');
    const countEl = document.getElementById('comment-count-title');
    if (countEl) countEl.textContent = `COMMENTS (${comments.length})`;
  } catch (err) {
    toast(err.message, 'error');
  }
}

async function confirmDeleteTask(taskId) {
  if (!confirm('Delete this task permanently?')) return;
  try {
    await api.deleteTask(taskId);
    document.getElementById('modal-task-detail')?.remove();
    toast('Task deleted', 'success');
    refreshCurrentView();
  } catch (err) {
    toast(err.message, 'error');
  }
}

function refreshCurrentView() {
  if (state.currentView === 'project') {
    navigateTo('project', { projectId: state.activeProjectId });
  } else if (state.currentView === 'tasks') {
    navigateTo('tasks');
  } else if (state.currentView === 'overdue') {
    navigateTo('overdue');
  } else {
    navigateTo('dashboard');
  }
}