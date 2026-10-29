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

function formatMrName(name) {
  let trimmed = (name || '').trim();
  if (!trimmed) return '';
  if (!/^mr\.?\s+/i.test(trimmed)) {
    trimmed = 'Mr. ' + trimmed;
  } else {
    trimmed = trimmed.replace(/^mr\.?\s*/i, 'Mr. ');
  }
  return trimmed;
}

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
      { defectScrap: '', problem: '', rootCause: '', containmentAction: '', pcNumber: '', enteredBy: '', actionTakenBy: '' },
      { defectScrap: '', problem: '', rootCause: '', containmentAction: '', pcNumber: '', enteredBy: '', actionTakenBy: '' },
      { defectScrap: '', problem: '', rootCause: '', containmentAction: '', pcNumber: '', enteredBy: '', actionTakenBy: '' },
      { defectScrap: '', problem: '', rootCause: '', containmentAction: '', pcNumber: '', enteredBy: '', actionTakenBy: '' },
      { defectScrap: '', problem: '', rootCause: '', containmentAction: '', pcNumber: '', enteredBy: '', actionTakenBy: '' }
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
          pcNumber: String(i.pcNumber || ''),
          enteredBy: i.enteredBy ? formatMrName(i.enteredBy) : '',
          actionTakenBy: i.actionTakenBy ? formatMrName(i.actionTakenBy) : ''
        }));
        // If hour has legacy single defectScrap and 1st issue doesn't have it, copy over
        if (found.defectScrap && currentIssues.length > 0 && !currentIssues[0].defectScrap) {
          currentIssues[0].defectScrap = found.defectScrap;
        }
        while (currentIssues.length < 5) {
          currentIssues.push({ defectScrap: '', problem: '', rootCause: '', containmentAction: '', pcNumber: '', enteredBy: '', actionTakenBy: '' });
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
            { defectScrap: '', problem: '', rootCause: '', containmentAction: '', pcNumber: '', enteredBy: '', actionTakenBy: '' },
            { defectScrap: '', problem: '', rootCause: '', containmentAction: '', pcNumber: '', enteredBy: '', actionTakenBy: '' },
            { defectScrap: '', problem: '', rootCause: '', containmentAction: '', pcNumber: '', enteredBy: '', actionTakenBy: '' },
            { defectScrap: '', problem: '', rootCause: '', containmentAction: '', pcNumber: '', enteredBy: '', actionTakenBy: '' },
            { defectScrap: '', problem: '', rootCause: '', containmentAction: '', pcNumber: '', enteredBy: '', actionTakenBy: '' }
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

    const defaultHours = SHIFT_HOURS[normalizedShift] || SHIFT_HOURS.DAY;
    const sentHoursMap = new Map();
    (hours || []).forEach(h => sentHoursMap.set(h.hourKey, h));

    const processedHours = defaultHours.map(def => {
      const h = sentHoursMap.get(def.hourKey) || { hourKey: def.hourKey, blockIndex: def.blockIndex, issues: [] };
      const plan = parseNullableNumber(h.plan);
      const achievement = parseNullableNumber(h.achievement);
      let loss = parseNullableNumber(h.loss);

      if (loss === null && plan !== null && achievement !== null) {
        loss = plan - achievement;
      }

      const issues = (h.issues || []).map(i => ({
        defectScrap: String(i.defectScrap || ''),
        problem: String(i.problem || ''),
        rootCause: String(i.rootCause || ''),
        containmentAction: String(i.containmentAction || ''),
        pcNumber: String(i.pcNumber || ''),
        enteredBy: i.enteredBy ? formatMrName(i.enteredBy) : '',
        actionTakenBy: i.actionTakenBy ? formatMrName(i.actionTakenBy) : '',
        createdAt: i.createdAt || new Date()
      }));

      while (issues.length < 5) {
        issues.push({ defectScrap: '', problem: '', rootCause: '', containmentAction: '', pcNumber: '', enteredBy: '', actionTakenBy: '', createdAt: new Date() });
      }

      return {
        hourKey: def.hourKey,
        blockIndex: def.blockIndex,
        plan: plan,
        achievement: achievement,
        loss: loss,
        defectScrap: String(h.defectScrap || ''),
        flashKg: parseNullableNumber(h.flashKg),
        issues: issues
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
      { upsert: true, new: true, setDefaultsOnInsert: true }
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

// POST /api/issue/entry - Add a new production problem/issue
// Ensures that if multiple entries are submitted for the same hour concurrently,
// they occupy separate ruled lines without overwriting each other.
router.post('/issue/entry', async (req, res) => {
  try {
    const { date, shiftType, hourKey, problem, rootCause, containmentAction, defectScrap, pcNumber, name } = req.body;
    if (!date || !shiftType || !hourKey || !problem || !name) {
      return res.status(400).json({ error: 'Date, shiftType, hourKey, problem, and name are required' });
    }

    const formattedName = formatMrName(name);
    const normalizedShift = shiftType.toUpperCase();

    let sheet = await TrackingSheet.findOne({ date, shiftType: normalizedShift });
    if (!sheet) {
      sheet = new TrackingSheet({
        date,
        shiftType: normalizedShift,
        shiftCrew: 'A',
        hours: createDefaultHours(normalizedShift)
      });
    }

    // Ensure all 12 hours exist in sheet.hours
    const defaultHours = SHIFT_HOURS[normalizedShift] || SHIFT_HOURS.DAY;
    const existingKeys = new Set((sheet.hours || []).map(h => h.hourKey));
    defaultHours.forEach(def => {
      if (!existingKeys.has(def.hourKey)) {
        sheet.hours.push({
          hourKey: def.hourKey,
          blockIndex: def.blockIndex,
          plan: null,
          achievement: null,
          loss: null,
          defectScrap: '',
          flashKg: null,
          issues: [
            { defectScrap: '', problem: '', rootCause: '', containmentAction: '', pcNumber: '', enteredBy: '', actionTakenBy: '' },
            { defectScrap: '', problem: '', rootCause: '', containmentAction: '', pcNumber: '', enteredBy: '', actionTakenBy: '' },
            { defectScrap: '', problem: '', rootCause: '', containmentAction: '', pcNumber: '', enteredBy: '', actionTakenBy: '' },
            { defectScrap: '', problem: '', rootCause: '', containmentAction: '', pcNumber: '', enteredBy: '', actionTakenBy: '' },
            { defectScrap: '', problem: '', rootCause: '', containmentAction: '', pcNumber: '', enteredBy: '', actionTakenBy: '' }
          ]
        });
      }
    });

    let hour = sheet.hours.find(h => h.hourKey === hourKey);
    if (!hour) {
      const template = defaultHours.find(t => t.hourKey === hourKey);
      const blockIndex = template ? template.blockIndex : 0;
      sheet.hours.push({
        hourKey,
        blockIndex,
        plan: null,
        achievement: null,
        loss: null,
        defectScrap: '',
        flashKg: null,
        issues: []
      });
      hour = sheet.hours[sheet.hours.length - 1];
    }

    if (!hour.issues) hour.issues = [];
    while (hour.issues.length < 5) {
      hour.issues.push({ defectScrap: '', problem: '', rootCause: '', containmentAction: '', pcNumber: '', enteredBy: '', actionTakenBy: '' });
    }

    // Find the first issue row that has no problem entered
    let targetIssue = hour.issues.find(i => (!i.problem || i.problem.trim() === ''));

    const hasAction = Boolean(containmentAction && containmentAction.trim() !== '');

    const newIssueData = {
      defectScrap: defectScrap || '',
      problem: problem.trim(),
      rootCause: (rootCause || '').trim(),
      containmentAction: (containmentAction || '').trim(),
      pcNumber: pcNumber || '',
      enteredBy: formattedName,
      actionTakenBy: hasAction ? formattedName : '',
      createdAt: new Date()
    };

    if (targetIssue) {
      targetIssue.defectScrap = newIssueData.defectScrap;
      targetIssue.problem = newIssueData.problem;
      targetIssue.rootCause = newIssueData.rootCause;
      targetIssue.containmentAction = newIssueData.containmentAction;
      targetIssue.pcNumber = newIssueData.pcNumber;
      targetIssue.enteredBy = newIssueData.enteredBy;
      targetIssue.actionTakenBy = newIssueData.actionTakenBy;
      targetIssue.createdAt = newIssueData.createdAt;
    } else {
      // If all rows have problems, push a new line so concurrent submissions get their own separate line
      hour.issues.push(newIssueData);
    }

    sheet.lastSavedAt = new Date();
    sheet.markModified('hours');
    await sheet.save();

    res.json({
      success: true,
      message: 'Issue recorded successfully',
      data: sheet
    });
  } catch (err) {
    console.error('Error in /api/issue/entry:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/issue - Delete a problem, rootCause, or containmentAction
router.delete('/issue', async (req, res) => {
  try {
    const { date, shiftType, hourKey, lineIdx, field } = req.body;
    if (!date || !shiftType || !hourKey || lineIdx === undefined) {
      return res.status(400).json({ error: 'Date, shiftType, hourKey, and lineIdx are required' });
    }

    const sheet = await TrackingSheet.findOne({ date, shiftType: shiftType.toUpperCase() });
    if (!sheet) {
      return res.status(404).json({ error: 'Sheet not found' });
    }

    const hour = (sheet.hours || []).find(h => h.hourKey === hourKey);
    if (!hour || !hour.issues || !hour.issues[lineIdx]) {
      return res.status(404).json({ error: 'Hour or line not found' });
    }

    const issue = hour.issues[lineIdx];

    if (field === 'rootCause') {
      // Delete ONLY Root Cause
      issue.rootCause = '';
    } else if (field === 'containmentAction') {
      // Delete ONLY Containment Action
      issue.containmentAction = '';
      issue.actionTakenBy = '';
    } else {
      // Delete Problem (also deletes Root Cause and Containment Action for this line)
      if (hour.issues.length > 5 && lineIdx >= 5) {
        hour.issues.splice(lineIdx, 1);
      } else {
        issue.problem = '';
        issue.rootCause = '';
        issue.containmentAction = '';
        issue.defectScrap = '';
        issue.pcNumber = '';
        issue.enteredBy = '';
        issue.actionTakenBy = '';
        issue.createdAt = new Date();
      }
    }

    sheet.lastSavedAt = new Date();
    sheet.markModified('hours');
    await sheet.save();

    res.json({ success: true, message: 'Deleted successfully', sheet });
  } catch (err) {
    console.error('Error deleting issue:', err);
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/issue/update-problem - Edit an existing problem row
router.patch('/issue/update-problem', async (req, res) => {
  try {
    const { date, shiftType, hourKey, lineIdx, problem, rootCause, containmentAction, defectScrap, pcNumber, name } = req.body;
    if (!date || !shiftType || !hourKey || lineIdx === undefined || !name || !problem) {
      return res.status(400).json({ error: 'Date, shiftType, hourKey, lineIdx, name, and problem are required' });
    }

    const formattedName = formatMrName(name);
    const sheet = await TrackingSheet.findOne({ date, shiftType: shiftType.toUpperCase() });
    if (!sheet) {
      return res.status(404).json({ error: 'Sheet not found' });
    }

    const hour = (sheet.hours || []).find(h => h.hourKey === hourKey);
    if (!hour || !hour.issues || !hour.issues[lineIdx]) {
      return res.status(404).json({ error: 'Hour or line not found' });
    }

    const issue = hour.issues[lineIdx];
    issue.problem = problem.trim();
    if (rootCause !== undefined) issue.rootCause = (rootCause || '').trim();
    if (containmentAction !== undefined) {
      issue.containmentAction = (containmentAction || '').trim();
      if (issue.containmentAction) {
        issue.actionTakenBy = formattedName;
      } else {
        issue.actionTakenBy = '';
      }
    }
    if (defectScrap !== undefined) issue.defectScrap = (defectScrap || '').trim();
    if (pcNumber !== undefined) issue.pcNumber = (pcNumber || '').trim();
    issue.enteredBy = formattedName;

    sheet.lastSavedAt = new Date();
    sheet.markModified('hours');
    await sheet.save();

    res.json({ success: true, message: 'Problem updated successfully', issue });
  } catch (err) {
    console.error('Error updating problem:', err);
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/issue/update-action - Update Root Cause and/or Containment Action for an existing issue
router.patch('/issue/update-action', async (req, res) => {
  try {
    const { date, shiftType, hourKey, lineIdx, rootCause, containmentAction, name } = req.body;
    if (!date || !shiftType || !hourKey || lineIdx === undefined || !name) {
      return res.status(400).json({ error: 'Date, shiftType, hourKey, lineIdx, and name are required' });
    }

    const formattedName = formatMrName(name);
    const sheet = await TrackingSheet.findOne({ date, shiftType: shiftType.toUpperCase() });
    if (!sheet) {
      return res.status(404).json({ error: 'Sheet not found' });
    }

    const hour = (sheet.hours || []).find(h => h.hourKey === hourKey);
    if (!hour || !hour.issues || !hour.issues[lineIdx]) {
      return res.status(404).json({ error: 'Hour or line not found' });
    }

    const issue = hour.issues[lineIdx];
    if (rootCause !== undefined && rootCause !== null && rootCause.trim() !== '') {
      issue.rootCause = rootCause.trim();
    }
    if (containmentAction !== undefined && containmentAction !== null && containmentAction.trim() !== '') {
      issue.containmentAction = containmentAction.trim();
      issue.actionTakenBy = formattedName;
    }
    if (!issue.enteredBy) {
      issue.enteredBy = formattedName;
    }

    sheet.lastSavedAt = new Date();
    sheet.markModified('hours');
    await sheet.save();

    res.json({ success: true, message: 'Action saved successfully', issue });
  } catch (err) {
    console.error('Error updating issue action:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/missing-actions - Get list of issues missing containment actions across saved sheets
router.get('/missing-actions', async (req, res) => {
  try {
    const sheets = await TrackingSheet.find({}, 'date shiftType shiftCrew hours')
      .sort({ date: -1 });

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
              pcNumber: issue.pcNumber || '',
              enteredBy: issue.enteredBy || '',
              actionTakenBy: issue.actionTakenBy || ''
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

// GET /api/taken-actions - Get list of completed / taken containment actions across saved sheets
router.get('/taken-actions', async (req, res) => {
  try {
    const sheets = await TrackingSheet.find({}, 'date shiftType shiftCrew hours')
      .sort({ date: -1 });

    const takenList = [];
    sheets.forEach(sheet => {
      (sheet.hours || []).forEach(h => {
        (h.issues || []).forEach((issue, idx) => {
          const problem = (issue.problem || '').trim();
          const containmentAction = (issue.containmentAction || '').trim();
          if (problem !== '' && containmentAction !== '') {
            takenList.push({
              sheetId: sheet._id,
              date: sheet.date,
              shiftType: sheet.shiftType,
              shiftCrew: sheet.shiftCrew,
              hourKey: h.hourKey,
              lineIdx: idx,
              problem: issue.problem,
              rootCause: issue.rootCause || '',
              containmentAction: issue.containmentAction,
              defectScrap: issue.defectScrap || '',
              pcNumber: issue.pcNumber || '',
              enteredBy: issue.enteredBy || '',
              actionTakenBy: issue.actionTakenBy || issue.enteredBy || ''
            });
          }
        });
      });
    });

    res.json({ success: true, count: takenList.length, taken: takenList });
  } catch (err) {
    console.error('Error fetching taken actions:', err);
    res.status(500).json({ error: 'Server error fetching taken actions' });
  }
});

// PATCH /api/containment-action - Quick update containment action for a specific hour and line
router.patch('/containment-action', async (req, res) => {
  try {
    const { date, shiftType, hourKey, lineIdx, containmentAction, name } = req.body;
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
    if (name) {
      hour.issues[lineIdx].actionTakenBy = formatMrName(name);
    }
    sheet.lastSavedAt = new Date();
    sheet.markModified('hours');
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
