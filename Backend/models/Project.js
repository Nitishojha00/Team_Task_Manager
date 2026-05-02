const mongoose = require('mongoose');

const memberSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  role: { type: String, enum: ['admin', 'member'], default: 'member' },
  joinedAt: { type: Date, default: Date.now }
}, { _id: false });

const projectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Project name is required'],
    trim: true,
    maxlength: [100, 'Project name cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  color: {
    type: String,
    default: '#6366f1'
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  members: [memberSchema]
}, { timestamps: true });

// Auto-add owner as admin member
projectSchema.pre('save', function(next) {
  if (this.isNew) {
    const ownerAlreadyMember = this.members.some(
      m => m.user.toString() === this.owner.toString()
    );
    if (!ownerAlreadyMember) {
      this.members.push({ user: this.owner, role: 'admin' });
    }
  }
  next();
});

// Virtual: member count
projectSchema.virtual('memberCount').get(function() {
  return this.members.length;
});

module.exports = mongoose.model('Project', projectSchema);