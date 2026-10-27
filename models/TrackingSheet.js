const mongoose = require('mongoose');

const IssueRowSchema = new mongoose.Schema({
  problem: { type: String, default: '' },
  rootCause: { type: String, default: '' },
  containmentAction: { type: String, default: '' },
  pcNumber: { type: String, default: '' }
}, { _id: false });

const HourDataSchema = new mongoose.Schema({
  hourKey: { type: String, required: true },
  blockIndex: { type: Number, required: true }, // 0: 1st 3hrs, 1: 2nd 3hrs, 2: 3rd 3hrs, 3: 4th 3hrs
  plan: { type: Number, default: 0 },
  achievement: { type: Number, default: 0 },
  loss: { type: Number, default: 0 },
  defectScrap: { type: String, default: '' },
  flashKg: { type: Number, default: 0 },
  issues: {
    type: [IssueRowSchema],
    default: () => [
      { problem: '', rootCause: '', containmentAction: '', pcNumber: '' },
      { problem: '', rootCause: '', containmentAction: '', pcNumber: '' },
      { problem: '', rootCause: '', containmentAction: '', pcNumber: '' },
      { problem: '', rootCause: '', containmentAction: '', pcNumber: '' },
      { problem: '', rootCause: '', containmentAction: '', pcNumber: '' }
    ]
  }
}, { _id: false });

const TrackingSheetSchema = new mongoose.Schema({
  date: { 
    type: String, 
    required: true,
    index: true 
  }, // Format: YYYY-MM-DD
  shiftType: { 
    type: String, 
    required: true, 
    enum: ['DAY', 'NIGHT'],
    index: true 
  },
  shiftCrew: { 
    type: String, 
    enum: ['A', 'B', 'C'], 
    default: 'A' 
  },
  hours: [HourDataSchema],
  lastSavedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

// Ensure unique document per date + shiftType
TrackingSheetSchema.index({ date: 1, shiftType: 1 }, { unique: true });

module.exports = mongoose.model('TrackingSheet', TrackingSheetSchema);
