const express = require('express');
const router = express.Router();
const { body, query, validationResult } = require('express-validator');
const Task = require('../models/Task');
const Project = require('../models/Project');
const { protect } = require('../middleware/auth');

router.use(protect);

// Helper: verify user is member of the task's project
const verifyProjectAccess = async (projectId, userId) => {
  const project = await Project.findById(projectId);
  if (!project) return null;
  const member = project.members.find(m => m.user.toString() === userId.toString());
  return member ? { project, role: member.role } : null;
};

// GET /api/tasks - get tasks with filters
router.get('/', async (req, res) => {
  try {
    const { project, status, priority, assignee, overdue, search, page = 1, limit = 50 } = req.query;

    // First find all projects user is member of
    const userProjects = await Project.find({ 'members.user': req.user._id }).select('_id');
    const projectIds = userProjects.map(p => p._id);

    const filter = { project: { $in: projectIds } };
    if (project) filter.project = project;
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (assignee === 'me') filter.assignee = req.user._id;
    else if (assignee) filter.assignee = assignee;
    if (overdue === 'true') {
      filter.dueDate = { $lt: new Date() };
      filter.status = { $ne: 'done' };
    }
    if (search) filter.title = { $regex: search, $options: 'i' };

    const skip = (Number(page) - 1) * Number(limit);
    const [tasks, total] = await Promise.all([
      Task.find(filter)
        .populate('assignee', 'name email avatarColor')
        .populate('creator', 'name email avatarColor')
        .populate('project', 'name color')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Task.countDocuments(filter)
    ]);

    res.json({ success: true, tasks, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/tasks/dashboard - dashboard stats for current user
router.get('/dashboard', async (req, res) => {
  try {
    const userProjects = await Project.find({ 'members.user': req.user._id }).select('_id name color');
    const projectIds = userProjects.map(p => p._id);

    const now = new Date();
    const [
      totalTasks,
      myTasks,
      overdueTasks,
      byStatus,
      byPriority,
      recentTasks
    ] = await Promise.all([
      Task.countDocuments({ project: { $in: projectIds } }),
      Task.countDocuments({ project: { $in: projectIds }, assignee: req.user._id }),
      Task.countDocuments({ project: { $in: projectIds }, dueDate: { $lt: now }, status: { $ne: 'done' } }),
      Task.aggregate([
        { $match: { project: { $in: projectIds } } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      Task.aggregate([
        { $match: { project: { $in: projectIds }, status: { $ne: 'done' } } },
        { $group: { _id: '$priority', count: { $sum: 1 } } }
      ]),
      Task.find({ project: { $in: projectIds } })
        .populate('assignee', 'name avatarColor')
        .populate('project', 'name color')
        .sort('-createdAt')
        .limit(5)
    ]);

    const statusMap = { todo: 0, in_progress: 0, review: 0, done: 0 };
    byStatus.forEach(s => { statusMap[s._id] = s.count; });

    const priorityMap = { low: 0, medium: 0, high: 0, urgent: 0 };
    byPriority.forEach(p => { priorityMap[p._id] = p.count; });

    res.json({
      success: true,
      stats: { totalTasks, myTasks, overdueTasks, projectCount: userProjects.length },
      byStatus: statusMap,
      byPriority: priorityMap,
      recentTasks,
      projects: userProjects
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/tasks/:id
router.get('/:id', async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('assignee', 'name email avatarColor')
      .populate('creator', 'name email avatarColor')
      .populate('project', 'name color members')
      .populate('comments.author', 'name avatarColor');
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

    const access = await verifyProjectAccess(task.project._id, req.user._id);
    if (!access) return res.status(403).json({ success: false, message: 'Access denied' });

    res.json({ success: true, task });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/tasks - create task
router.post('/', [
  body('title').trim().notEmpty().withMessage('Title is required').isLength({ max: 200 }),
  body('description').optional().trim().isLength({ max: 2000 }),
  body('status').optional().isIn(['todo', 'in_progress', 'review', 'done']),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
  body('project').notEmpty().withMessage('Project is required').isMongoId(),
  body('assignee').optional().isMongoId(),
  body('dueDate').optional().isISO8601()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
  try {
    const access = await verifyProjectAccess(req.body.project, req.user._id);
    if (!access) return res.status(403).json({ success: false, message: 'Not a member of this project' });

    const task = await Task.create({ ...req.body, creator: req.user._id });
    await task.populate('assignee', 'name email avatarColor');
    await task.populate('creator', 'name email avatarColor');
    await task.populate('project', 'name color');
    res.status(201).json({ success: true, task });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/tasks/:id - update task
router.put('/:id', [
  body('title').optional().trim().notEmpty().isLength({ max: 200 }),
  body('status').optional().isIn(['todo', 'in_progress', 'review', 'done']),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
  body('assignee').optional({ nullable: true }).isMongoId(),
  body('dueDate').optional({ nullable: true }).isISO8601()
], async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

    const access = await verifyProjectAccess(task.project, req.user._id);
    if (!access) return res.status(403).json({ success: false, message: 'Access denied' });

    const allowed = ['title', 'description', 'status', 'priority', 'assignee', 'dueDate', 'tags'];
    allowed.forEach(field => {
      if (req.body[field] !== undefined) task[field] = req.body[field];
    });
    await task.save();
    await task.populate('assignee', 'name email avatarColor');
    await task.populate('creator', 'name email avatarColor');
    await task.populate('project', 'name color');
    res.json({ success: true, task });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/tasks/:id
router.delete('/:id', async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

    const access = await verifyProjectAccess(task.project, req.user._id);
    if (!access) return res.status(403).json({ success: false, message: 'Access denied' });

    // Only creator or admin can delete
    const isCreator = task.creator.toString() === req.user._id.toString();
    if (!isCreator && access.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only task creator or admin can delete' });
    }
    await task.deleteOne();
    res.json({ success: true, message: 'Task deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/tasks/:id/comments
router.post('/:id/comments', [
  body('text').trim().notEmpty().withMessage('Comment text is required').isLength({ max: 1000 })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

    const access = await verifyProjectAccess(task.project, req.user._id);
    if (!access) return res.status(403).json({ success: false, message: 'Access denied' });

    task.comments.push({ author: req.user._id, text: req.body.text });
    await task.save();
    await task.populate('comments.author', 'name avatarColor');
    res.status(201).json({ success: true, comments: task.comments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;