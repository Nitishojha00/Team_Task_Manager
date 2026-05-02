// ── Dashboard ────────────────────────────────────────────────

async function renderDashboard(container) {
  try {
    const data = await api.getDashboard();
    const { stats, byStatus, byPriority, recentTasks, projects } = data;
    const donePercent = stats.totalTasks ? Math.round((byStatus.done / stats.totalTasks) * 100) : 0;

    container.innerHTML = `
      <div class="stats-grid">
        <div class="stat-card" style="--accent-color:#4da6ff">
          <div class="label">Total Tasks</div>
          <div class="value">${stats.totalTasks}</div>
          <div class="sub">across ${stats.projectCount} project${stats.projectCount !== 1 ? 's' : ''}</div>
          <div class="icon">${Icons.tasks}</div>
        </div>
        <div class="stat-card" style="--accent-color:var(--accent)">
          <div class="label">Assigned to Me</div>
          <div class="value">${stats.myTasks}</div>
          <div class="sub">active tasks</div>
          <div class="icon">${Icons.members}</div>
        </div>
        <div class="stat-card" style="--accent-color:var(--danger)">
          <div class="label">Overdue</div>
          <div class="value">${stats.overdueTasks}</div>
          <div class="sub"><a href="#" onclick="navigateTo('overdue');return false;" style="color:var(--danger)">view all →</a></div>
          <div class="icon">${Icons.overdue}</div>
        </div>
        <div class="stat-card" style="--accent-color:var(--warn)">
          <div class="label">Completion</div>
          <div class="value">${donePercent}%</div>
          <div class="sub">${byStatus.done || 0} of ${stats.totalTasks} done</div>
          <div class="icon">${Icons.kanban}</div>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.25rem;margin-bottom:1.5rem">
        <div class="card">
          <div class="card-header"><h3 style="font-size:0.9rem">Tasks by Status</h3></div>
          ${statusChart(byStatus, stats.totalTasks)}
        </div>
        <div class="card">
          <div class="card-header"><h3 style="font-size:0.9rem">Open Tasks by Priority</h3></div>
          ${priorityChart(byPriority)}
        </div>
      </div>

      <div style="display:grid;grid-template-columns:2fr 1fr;gap:1.25rem">
        <div class="card">
          <div class="card-header">
            <h3 style="font-size:0.9rem">Recent Tasks</h3>
            <a href="#" onclick="navigateTo('tasks');return false;" style="font-size:0.75rem;color:var(--accent)">View all →</a>
          </div>
          ${recentTasks.length ? `<div class="task-list">${recentTasks.map(t => miniTaskCard(t)).join('')}</div>`
            : `<div class="empty-state" style="padding:1.5rem">${Icons.tasks}<p>No tasks yet</p></div>`}
        </div>
        <div class="card">
          <div class="card-header">
            <h3 style="font-size:0.9rem">My Projects</h3>
            <button class="btn btn-ghost btn-sm btn-icon" onclick="navigateTo('projects')" title="All projects">${Icons.projects}</button>
          </div>
          ${projects.length ? projects.map(p => `
            <div class="member-item" style="cursor:pointer" onclick="navigateTo('project',{projectId:'${p._id}'})">
              <div style="width:10px;height:10px;border-radius:50%;background:${p.color};flex-shrink:0"></div>
              <div class="info"><div class="name">${esc(p.name)}</div></div>
            </div>
          `).join('') : `<p style="font-size:0.78rem;color:var(--text3)">No projects yet</p>`}
          <button class="btn btn-outline btn-sm btn-full mt-3" onclick="showCreateProjectModal()">
            ${Icons.plus} New Project
          </button>
        </div>
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<div class="empty-state"><p style="color:var(--danger)">${err.message}</p></div>`;
  }
}

function statusChart(byStatus, total) {
  const items = [
    { key: 'todo', label: 'To Do', color: 'var(--todo)' },
    { key: 'in_progress', label: 'In Progress', color: 'var(--inprog)' },
    { key: 'review', label: 'Review', color: 'var(--review)' },
    { key: 'done', label: 'Done', color: 'var(--done)' },
  ];
  return items.map(({ key, label, color }) => {
    const count = byStatus[key] || 0;
    const pct = total ? Math.round((count / total) * 100) : 0;
    return `<div class="chart-bar-row">
      <div class="bar-label">${label}</div>
      <div class="bar-track"><div class="bar-fill" style="width:${pct}%;background:${color}"></div></div>
      <div class="bar-count">${count}</div>
    </div>`;
  }).join('');
}

function priorityChart(byPriority) {
  const items = [
    { key: 'urgent', label: 'Urgent', color: 'var(--urgent)' },
    { key: 'high', label: 'High', color: 'var(--high)' },
    { key: 'medium', label: 'Medium', color: 'var(--medium)' },
    { key: 'low', label: 'Low', color: 'var(--low)' },
  ];
  const max = Math.max(...items.map(i => byPriority[i.key] || 0), 1);
  return items.map(({ key, label, color }) => {
    const count = byPriority[key] || 0;
    const pct = Math.round((count / max) * 100);
    return `<div class="chart-bar-row">
      <div class="bar-label">${label}</div>
      <div class="bar-track"><div class="bar-fill" style="width:${pct}%;background:${color}"></div></div>
      <div class="bar-count">${count}</div>
    </div>`;
  }).join('');
}

function miniTaskCard(t) {
  const overdue = t.isOverdue || isDueOverdue(t.dueDate);
  return `
    <div class="task-card ${overdue ? 'overdue' : ''}" style="--priority-color:${priorityColor(t.priority)}" onclick="showTaskDetail('${t._id}')">
      <div class="task-body">
        <div class="task-title ${t.status === 'done' ? 'done' : ''}">${esc(t.title)}</div>
        <div class="task-meta">
          ${statusBadge(t.status)}
          ${t.project ? `<span style="font-size:0.68rem;color:var(--text3)">${esc(t.project.name)}</span>` : ''}
        </div>
      </div>
      <div class="task-right">
        ${t.assignee ? avatar(t.assignee, 'avatar-sm') : ''}
        ${t.dueDate ? `<div class="due-date ${overdue ? 'overdue' : ''}">${Icons.calendar}${formatDueDate(t.dueDate)}</div>` : ''}
      </div>
    </div>`;
}