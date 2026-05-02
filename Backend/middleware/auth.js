const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    if (!token) {
      return res.status(401).json({ success: false, message: 'Not authorized, no token' });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id);
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Not authorized, invalid token' });
  }
};

// Check if user is admin of a project
const requireProjectAdmin = (getProjectFn) => async (req, res, next) => {
  try {
    const project = await getProjectFn(req);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    const member = project.members.find(m => m.user.toString() === req.user._id.toString());
    if (!member || member.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }
    req.project = project;
    next();
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Check if user is a member of a project
const requireProjectMember = (getProjectFn) => async (req, res, next) => {
  try {
    const project = await getProjectFn(req);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    const isMember = project.members.some(m => m.user.toString() === req.user._id.toString());
    if (!isMember) {
      return res.status(403).json({ success: false, message: 'Project access denied' });
    }
    req.project = project;
    next();
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { protect, requireProjectAdmin, requireProjectMember };