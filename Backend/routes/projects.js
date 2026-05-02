const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Project = require('../models/Project');
const Task = require('../models/Task');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

// All routes require authentication
router.use(protect);

// Helper: get project and check membership
const getProjectForUser = async (projectId, userId) => {
  const project = await Project.findById(projectId).populate('members.user', 'name email avatarColor');
  if (!project) return null;
  const isMember = project.members.some(m => m.user._id.toString() === userId.toString());
  return isMember ? project : null;
};

const getUserRole = (project, userId) => {
  const member = project.members.find(m => m.user._id.toString() === userId.toString());
  return member ? member.role : null;
};

// GET /api/projects - list all projects for current user
router.get('/', async (req, res) => {
  try {
    const projects = await Project.find({ 'members.user': req.user._id })
      .populate('owner', 'name email avatarColor')
      .populate('members.user', 'name email avatarColor')
      .sort('-createdAt');
    res.json({ success: true, projects });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/projects - create project
router.post('/', [
  body('name').trim().notEmpty().withMessage('Project name is required').isLength({ max: 100 }),
  body('description').optional().trim().isLength({ max: 500 }),
  body('color').optional().matches(/^#[0-9A-Fa-f]{6}$/).withMessage('Invalid color format')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
  try {
    const { name, description, color } = req.body;
    const project = await Project.create({ name, description, color, owner: req.user._id });
    await project.populate('members.user', 'name email avatarColor');
    await project.populate('owner', 'name email avatarColor');
    res.status(201).json({ success: true, project });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/projects/:id - get single project
router.get('/:id', async (req, res) => {
  try {
    const project = await getProjectForUser(req.params.id, req.user._id);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    await project.populate('owner', 'name email avatarColor');
    const role = getUserRole(project, req.user._id);
    res.json({ success: true, project, role });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/projects/:id - update project (admin only)
router.put('/:id', [
  body('name').optional().trim().notEmpty().isLength({ max: 100 }),
  body('description').optional().trim().isLength({ max: 500 }),
  body('color').optional().matches(/^#[0-9A-Fa-f]{6}$/)
], async (req, res) => {
  try {
    const project = await getProjectForUser(req.params.id, req.user._id);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    if (getUserRole(project, req.user._id) !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }
    const { name, description, color } = req.body;
    if (name) project.name = name;
    if (description !== undefined) project.description = description;
    if (color) project.color = color;
    await project.save();
    res.json({ success: true, project });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/projects/:id - delete project (owner only)
router.delete('/:id', async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    if (project.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only project owner can delete' });
    }
    await Task.deleteMany({ project: project._id });
    await project.deleteOne();
    res.json({ success: true, message: 'Project deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/projects/:id/members - add member by email (admin only)
router.post('/:id/members', [
  body('email').isEmail().normalizeEmail(),
  body('role').optional().isIn(['admin', 'member'])
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
  try {
    const project = await getProjectForUser(req.params.id, req.user._id);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    if (getUserRole(project, req.user._id) !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }
    const { email, role = 'member' } = req.body;
    const userToAdd = await User.findOne({ email });
    if (!userToAdd) return res.status(404).json({ success: false, message: 'User not found with that email' });

    const alreadyMember = project.members.some(m => m.user._id.toString() === userToAdd._id.toString());
    if (alreadyMember) return res.status(400).json({ success: false, message: 'User is already a member' });

    project.members.push({ user: userToAdd._id, role });
    await project.save();
    await project.populate('members.user', 'name email avatarColor');
    res.json({ success: true, project });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/projects/:id/members/:userId - remove member (admin only)
router.delete('/:id/members/:userId', async (req, res) => {
  try {
    const project = await getProjectForUser(req.params.id, req.user._id);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    if (getUserRole(project, req.user._id) !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }
    if (req.params.userId === project.owner.toString()) {
      return res.status(400).json({ success: false, message: 'Cannot remove project owner' });
    }
    project.members = project.members.filter(m => m.user._id.toString() !== req.params.userId);
    await project.save();
    res.json({ success: true, message: 'Member removed' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/projects/:id/members/:userId/role - change member role (admin only)
router.put('/:id/members/:userId/role', [
  body('role').isIn(['admin', 'member'])
], async (req, res) => {
  try {
    const project = await getProjectForUser(req.params.id, req.user._id);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    if (getUserRole(project, req.user._id) !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }
    const member = project.members.find(m => m.user._id.toString() === req.params.userId);
    if (!member) return res.status(404).json({ success: false, message: 'Member not found' });
    member.role = req.body.role;
    await project.save();
    await project.populate('members.user', 'name email avatarColor');
    res.json({ success: true, project });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;