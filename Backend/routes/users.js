const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect } = require('../middleware/auth');

router.use(protect);

// GET /api/users/search?email=...
router.get('/search', async (req, res) => {
  try {
    const { email, name } = req.query;
    const filter = {};
    if (email) filter.email = { $regex: email, $options: 'i' };
    if (name) filter.name = { $regex: name, $options: 'i' };
    if (!email && !name) return res.status(400).json({ success: false, message: 'Provide email or name to search' });

    const users = await User.find(filter).select('name email avatarColor').limit(10);
    res.json({ success: true, users });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;