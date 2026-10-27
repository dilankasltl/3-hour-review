const express = require('express');
const router = express.Router();
const TrackingSheet = require('../models/TrackingSheet');

// Hours definition
const SHIFT_HOURS = {
  DAY: [
    { hourKey: '07:00 - 08:00', blockIndex: 0 },
    { hourKey: '08:00 - 09:00', blockIndex: 0 },
    { hourKey: '09:00 - 10:00', blockIndex: 0 },
    { hourKey: '10:00 - 11:00', blockIndex: 1 },
    { hourKey: '11:00 - 12:00', blockIndex: 1 },
    { hourKey: '12:00 - 13:00', blockIndex: 1 },
    { hourKey: '13:00 - 14:00', blockIndex: 2 },
    { hourKey: '14:00 - 15:00', blockIndex: 2 },
    { hourKey: '15:00 - 16:00', blockIndex: 2 },
    { hourKey: '16:00 - 17:00', blockIndex: 3 },
    { hourKey: '17:00 - 18:00', blockIndex: 3 },
    { hourKey: '18:00 - 19:00', blockIndex: 3 },
  ],
  NIGHT: [
    { hourKey: '19:00 - 20:00', blockIndex: 0 },
    { hourKey: '20:00 - 21:00', blockIndex: 0 },
    { hourKey: '21:00 - 22:00', blockIndex: 0 },
    { hourKey: '22:00 - 23:00', blockIndex: 1 },
    { hourKey: '23:00 - 00:00', blockIndex: 1 },
    { hourKey: '00:00 - 01:00', blockIndex: 1 },
    { hourKey: '01:00 - 02:00', blockIndex: 2 },
    { hourKey: '02:00 - 03:00', blockIndex: 2 },
    { hourKey: '03:00 - 04:00', blockIndex: 2 },
    { hourKey: '04:00 - 05:00', blockIndex: 3 },
    { hourKey: '05:00 - 06:00', blockIndex: 3 },
    { hourKey: '06:00 - 07:00', blockIndex: 3 },
  ]
};

function createDefaultHours(shiftType) {
  const template = SHIFT_HOURS[shiftType] || SHIFT_HOURS.DAY;
  return template.map(item => ({
    hourKey: item.hourKey,
    blockIndex: item.blockIndex,
    plan: null,
    achievement: null,
    loss: null,
    defectScrap: '',
    flashKg: null,
    issues: [
      { defectScrap: '', problem: '', rootCause: '', containmentAction: '', pcNumber: '' },
      { defectScrap: '', problem: '', rootCause: '', containmentAction: '', pcNumber: '' },
      { defectScrap: '', problem: '', rootCause: '', containmentAction: '', pcNumber: '' },
      { defectScrap: '', problem: '', rootCause: '', containmentAction: '', pcNumber: '' },
      { defectScrap: '', problem: '', rootCause: '', containmentAction: '', pcNumber: '' }
    ]
  }));
}

// GET /api/tracking?date=YYYY-MM-DD&shiftType=DAY|NIGHT
router.get('/tracking', async (req, res) => {
  try {
    const { date, shiftType } = req.query;
    if (!date || !shiftType) {
      return res.status(400).json({ error: 'Date and shiftType parameters are required' });
    }

    const normalizedShift = shiftType.toUpperCase();
    if (!['DAY', 'NIGHT'].includes(normalizedShift)) {
      return res.status(400).json({ error: 'Invalid shiftType. Must be DAY or NIGHT' });
    }

    let record = await TrackingSheet.findOne({ date, shiftType: normalizedShift });

    if (!record) {
      return res.json({
        exists: false,
        data: {
          date,
          shiftType: normalizedShift,
          shiftCrew: 'A',
          hours: createDefaultHours(normalizedShift)
        }
      });
    }

    // Ensure all 12 hours and at least 5 issue rows exist
    const defaultHours = SHIFT_HOURS[normalizedShift];
    const existingHoursMap = new Map();
    record.hours.forEach(h => existingHoursMap.set(h.hourKey, h));

    const mergedHours = defaultHours.map(def => {
      const found = existingHoursMap.get(def.hourKey);
      if (found) {
        const currentIssues = (found.issues || []).map(i => ({
          defectScrap: i.defectScrap !== undefined ? String(i.defectScrap || '') : '',
          problem: String(i.problem || ''),
          rootCause: String(i.rootCause || ''),
          containmentAction: String(i.containmentAction || ''),
          pcNumber: String(i.pcNumber || '')
        }));
        // If hour has legacy single defectScrap and 1st issue doesn't have it, copy over
        if (found.defectScrap && currentIssues.length > 0 && !currentIssues[0].defectScrap) {
          currentIssues[0].defectScrap = found.defectScrap;
        }
        while (currentIssues.length < 5) {
          currentIssues.push({ defectScrap: '', problem: '', rootCause: '', containmentAction: '', pcNumber: '' });
        }
        return {
          hourKey: def.hourKey,
          blockIndex: def.blockIndex,
          plan: (found.plan !== undefined && found.plan !== null) ? found.plan : null,
          achievement: (found.achievement !== undefined && found.achievement !== null) ? found.achievement : null,
          loss: (found.loss !== undefined && found.loss !== null) ? found.loss : null,
          defectScrap: found.defectScrap || '',
          flashKg: (found.flashKg !== undefined && found.flashKg !== null) ? found.flashKg : null,
          issues: currentIssues
        };
      } else {
        return {
          hourKey: def.hourKey,
          blockIndex: def.blockIndex,
          plan: null,
          achievement: null,
          loss: null,
          defectScrap: '',
          flashKg: null,
          issues: [
            { defectScrap: '', problem: '', rootCause: '', containmentAction: '', pcNumber: '' },
            { defectScrap: '', problem: '', rootCause: '', containmentAction: '', pcNumber: '' },
            { defectScrap: '', problem: '', rootCause: '', containmentAction: '', pcNumber: '' },
            { defectScrap: '', problem: '', rootCause: '', containmentAction: '', pcNumber: '' },
            { defectScrap: '', problem: '', rootCause: '', containmentAction: '', pcNumber: '' }
          ]
        };
      }
    });

    res.json({
      exists: true,
      data: {
        _id: record._id,
        date: record.date,
        shiftType: record.shiftType,
        shiftCrew: record.shiftCrew,
        hours: mergedHours,
        lastSavedAt: record.lastSavedAt,
        updatedAt: record.updatedAt
      }
    });
  } catch (err) {
    console.error('Error fetching tracking sheet:', err);
    res.status(500).json({ error: 'Server error fetching sheet: ' + err.message });
  }
});

// Helper to parse nullable number
function parseNullableNumber(val) {
  if (val === null || val === undefined || val === '') return null;
  const num = Number(val);
  return isNaN(num) ? null : num;
}

// POST /api/tracking
router.post('/tracking', async (req, res) => {
  try {
    const { date, shiftType, shiftCrew, hours } = req.body;

    if (!date || !shiftType) {
      return res.status(400).json({ error: 'Date and shiftType are required' });
    }

    const normalizedShift = shiftType.toUpperCase();
    if (!['DAY', 'NIGHT'].includes(normalizedShift)) {
      return res.status(400).json({ error: 'Invalid shiftType' });
    }

    const processedHours = (hours || []).map(h => {
      const plan = parseNullableNumber(h.plan);
      const achievement = parseNullableNumber(h.achievement);
      let loss = parseNullableNumber(h.loss);

      if (loss === null && plan !== null && achievement !== null) {
        loss = plan - achievement;
      }

      return {
        hourKey: h.hourKey,
        blockIndex: Number(h.blockIndex) || 0,
        plan: plan,
        achievement: achievement,
        loss: loss,
        defectScrap: String(h.defectScrap || ''),
        flashKg: parseNullableNumber(h.flashKg),
        issues: (h.issues || []).map(i => ({
          defectScrap: String(i.defectScrap || ''),
          problem: String(i.problem || ''),
          rootCause: String(i.rootCause || ''),
          containmentAction: String(i.containmentAction || ''),
          pcNumber: String(i.pcNumber || '')
        }))
      };
    });

    const updated = await TrackingSheet.findOneAndUpdate(
      { date, shiftType: normalizedShift },
      {
        $set: {
          shiftCrew: shiftCrew || 'A',
          hours: processedHours,
          lastSavedAt: new Date()
        }
      },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    );

    res.json({
      success: true,
      message: 'Sheet saved successfully',
      data: updated
    });
  } catch (err) {
    console.error('Error saving tracking sheet:', err);
    res.status(500).json({ error: 'Server error saving sheet: ' + err.message });
  }
});

// GET /api/missing-actions - Get list of issues missing containment actions across saved sheets
router.get('/missing-actions', async (req, res) => {
  try {
    const sheets = await TrackingSheet.find({}, 'date shiftType shiftCrew hours')
      .sort({ date: -1 })
      .limit(60);

    const missingList = [];
    sheets.forEach(sheet => {
      (sheet.hours || []).forEach(h => {
        (h.issues || []).forEach((issue, idx) => {
          const problem = (issue.problem || '').trim();
          const containmentAction = (issue.containmentAction || '').trim();
          if (problem !== '' && containmentAction === '') {
            missingList.push({
              sheetId: sheet._id,
              date: sheet.date,
              shiftType: sheet.shiftType,
              shiftCrew: sheet.shiftCrew,
              hourKey: h.hourKey,
              lineIdx: idx,
              problem: issue.problem,
              rootCause: issue.rootCause || '',
              defectScrap: issue.defectScrap || '',
              pcNumber: issue.pcNumber || ''
            });
          }
        });
      });
    });

    res.json({ success: true, count: missingList.length, missing: missingList });
  } catch (err) {
    console.error('Error fetching missing actions:', err);
    res.status(500).json({ error: 'Server error fetching missing actions' });
  }
});

// PATCH /api/containment-action - Quick update containment action for a specific hour and line
router.patch('/containment-action', async (req, res) => {
  try {
    const { date, shiftType, hourKey, lineIdx, containmentAction } = req.body;
    if (!date || !shiftType || !hourKey || lineIdx === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const sheet = await TrackingSheet.findOne({ date, shiftType: shiftType.toUpperCase() });
    if (!sheet) {
      return res.status(404).json({ error: 'Sheet not found' });
    }
    const hour = (sheet.hours || []).find(h => h.hourKey === hourKey);
    if (!hour || !hour.issues || !hour.issues[lineIdx]) {
      return res.status(404).json({ error: 'Hour or line not found' });
    }
    hour.issues[lineIdx].containmentAction = containmentAction || '';
    sheet.lastSavedAt = new Date();
    await sheet.save();
    res.json({ success: true, message: 'Containment action saved successfully' });
  } catch (err) {
    console.error('Error updating containment action:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/history - Get list of saved dates & summary stats
router.get('/history', async (req, res) => {
  try {
    const sheets = await TrackingSheet.find({}, 'date shiftType shiftCrew updatedAt lastSavedAt hours')
      .sort({ date: -1, shiftType: 1 })
      .limit(60);

    const summary = sheets.map(s => {
      const totalPlan = (s.hours || []).reduce((acc, h) => acc + (h.plan || 0), 0);
      const totalAch = (s.hours || []).reduce((acc, h) => acc + (h.achievement || 0), 0);
      const totalLoss = (s.hours || []).reduce((acc, h) => acc + (h.loss || 0), 0);
      const totalFlash = Number((s.hours || []).reduce((acc, h) => acc + (h.flashKg || 0), 0).toFixed(2));
      return {
        _id: s._id,
        date: s.date,
        shiftType: s.shiftType,
        shiftCrew: s.shiftCrew,
        totalPlan,
        totalAch,
        totalLoss,
        totalFlash,
        lastSavedAt: s.lastSavedAt || s.updatedAt
      };
    });

    res.json({ success: true, count: summary.length, history: summary });
  } catch (err) {
    console.error('Error fetching history:', err);
    res.status(500).json({ error: 'Server error fetching history' });
  }
});

// DELETE /api/tracking - Reset / clear a day's sheet if user wants fresh
router.delete('/tracking', async (req, res) => {
  try {
    const { date, shiftType } = req.query;
    if (!date || !shiftType) {
      return res.status(400).json({ error: 'Date and shiftType required' });
    }
    await TrackingSheet.deleteOne({ date, shiftType: shiftType.toUpperCase() });
    res.json({ success: true, message: 'Cleared successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
