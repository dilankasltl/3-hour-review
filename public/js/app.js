// 3-Hour Tracking Sheet Application Logic

// Shift Time Definitions
const SHIFT_TEMPLATES = {
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

const BLOCK_LABELS = {
  DAY: [
    'Subtotal (07:00 - 10:00)',
    'Subtotal (10:00 - 13:00)',
    'Subtotal (13:00 - 16:00)',
    'Subtotal (16:00 - 19:00)'
  ],
  NIGHT: [
    'Subtotal (19:00 - 22:00)',
    'Subtotal (22:00 - 01:00)',
    'Subtotal (01:00 - 04:00)',
    'Subtotal (04:00 - 07:00)'
  ]
};

// Application State
const state = {
  date: getTodayDateString(),
  shiftType: detectShiftFromTime(),
  shiftCrew: 'A',
  hours: [],
  isSaving: false,
  saveTimeout: null,
  isInitialized: false,
  hasUnsavedChanges: false
};

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
  initClock();
  initDateAndShiftSelectors();
  initEventListeners();
  loadTrackingSheet();
});

// Format today's date as YYYY-MM-DD in local time
function getTodayDateString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Auto detect DAY or NIGHT shift based on current hour
function detectShiftFromTime() {
  const hour = new Date().getHours();
  return (hour >= 7 && hour < 19) ? 'DAY' : 'NIGHT';
}

// Live Clock
function initClock() {
  const clockEl = document.getElementById('liveClockDisplay');
  function update() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-GB'); // 24-hr format
    const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    clockEl.textContent = `${dateStr}  ${timeStr}`;
  }
  update();
  setInterval(update, 1000);
}

// Initialize Date, Shift, and Crew selectors
function initDateAndShiftSelectors() {
  const dateInput = document.getElementById('sheetDate');
  dateInput.value = state.date;

  dateInput.addEventListener('change', async (e) => {
    // If there were unsaved edits on the current sheet, save first
    if (state.hasUnsavedChanges) {
      await saveTrackingSheet(false);
    }
    state.date = e.target.value;
    loadTrackingSheet();
  });

  // Shift Buttons
  const btnDay = document.getElementById('btnDayShift');
  const btnNight = document.getElementById('btnNightShift');

  function updateShiftPills() {
    if (state.shiftType === 'DAY') {
      btnDay.classList.add('active', 'day-shift');
      btnNight.classList.remove('active', 'night-shift');
      document.getElementById('currentShiftBadge').textContent = 'DAY SHIFT';
      document.getElementById('currentShiftBadge').style.background = '#f59e0b';
      document.getElementById('currentShiftBadge').style.color = '#000';
    } else {
      btnNight.classList.add('active', 'night-shift');
      btnDay.classList.remove('active', 'day-shift');
      document.getElementById('currentShiftBadge').textContent = 'NIGHT SHIFT';
      document.getElementById('currentShiftBadge').style.background = '#6366f1';
      document.getElementById('currentShiftBadge').style.color = '#fff';
    }
  }

  updateShiftPills();

  btnDay.addEventListener('click', async () => {
    if (state.shiftType !== 'DAY') {
      if (state.hasUnsavedChanges) await saveTrackingSheet(false);
      state.shiftType = 'DAY';
      updateShiftPills();
      loadTrackingSheet();
    }
  });

  btnNight.addEventListener('click', async () => {
    if (state.shiftType !== 'NIGHT') {
      if (state.hasUnsavedChanges) await saveTrackingSheet(false);
      state.shiftType = 'NIGHT';
      updateShiftPills();
      loadTrackingSheet();
    }
  });

  // Crew Buttons (A, B, C)
  const crewButtons = document.querySelectorAll('.crew-pill');
  crewButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      crewButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.shiftCrew = btn.dataset.crew;
      state.hasUnsavedChanges = true;
      triggerAutoSave();
    });
  });
}

// Action Button Listeners
function initEventListeners() {
  document.getElementById('btnSaveNow').addEventListener('click', () => {
    saveTrackingSheet(true);
  });

  document.getElementById('btnExportExcel').addEventListener('click', () => {
    exportToExcel();
  });

  document.getElementById('btnPrint').addEventListener('click', () => {
    window.print();
  });

  // Clear / Reset Sheet Button
  const btnClear = document.getElementById('btnClearSheet');
  if (btnClear) {
    btnClear.addEventListener('click', async () => {
      if (confirm(`Are you sure you want to clear all data for ${state.date} (${state.shiftType} Shift)?`)) {
        await clearCurrentSheet();
      }
    });
  }

  // History modal
  const historyModal = document.getElementById('historyModal');
  document.getElementById('btnHistory').addEventListener('click', () => {
    openHistoryModal();
  });
  document.getElementById('btnCloseHistory').addEventListener('click', () => {
    historyModal.classList.remove('open');
  });
  historyModal.addEventListener('click', (e) => {
    if (e.target === historyModal) {
      historyModal.classList.remove('open');
    }
  });
}

// Create fresh default template - ALL VALUES NULL (EMPTY) BY DEFAULT
function createDefaultHours(shiftType) {
  const template = SHIFT_TEMPLATES[shiftType] || SHIFT_TEMPLATES.DAY;
  return template.map(item => ({
    hourKey: item.hourKey,
    blockIndex: item.blockIndex,
    plan: null,
    achievement: null,
    loss: null,
    defectScrap: '',
    flashKg: null,
    issues: [
      { problem: '', rootCause: '', containmentAction: '', pcNumber: '' },
      { problem: '', rootCause: '', containmentAction: '', pcNumber: '' },
      { problem: '', rootCause: '', containmentAction: '', pcNumber: '' },
      { problem: '', rootCause: '', containmentAction: '', pcNumber: '' },
      { problem: '', rootCause: '', containmentAction: '', pcNumber: '' }
    ]
  }));
}

// Fetch tracking sheet from API
async function loadTrackingSheet() {
  setSaveStatus('saving', 'Loading...');
  try {
    const res = await fetch(`/api/tracking?date=${state.date}&shiftType=${state.shiftType}`);
    const json = await res.json();

    if (json && json.data) {
      const data = json.data;
      state.shiftCrew = data.shiftCrew || 'A';
      state.hours = data.hours || createDefaultHours(state.shiftType);

      // Sync crew UI
      document.querySelectorAll('.crew-pill').forEach(b => {
        b.classList.toggle('active', b.dataset.crew === state.shiftCrew);
      });

      renderTable();
      updateKPISummaries();
      state.hasUnsavedChanges = false;
      setSaveStatus('saved', json.exists ? 'Loaded from Cloud' : 'Ready (Empty)');
    } else {
      state.hours = createDefaultHours(state.shiftType);
      renderTable();
      updateKPISummaries();
      state.hasUnsavedChanges = false;
      setSaveStatus('saved', 'Ready (Empty)');
    }
  } catch (err) {
    console.error('Error loading sheet:', err);
    state.hours = createDefaultHours(state.shiftType);
    renderTable();
    updateKPISummaries();
    setSaveStatus('error', 'Offline / Load error');
  }
}

// Clear current sheet from MongoDB & UI
async function clearCurrentSheet() {
  try {
    await fetch(`/api/tracking?date=${state.date}&shiftType=${state.shiftType}`, { method: 'DELETE' });
    state.hours = createDefaultHours(state.shiftType);
    renderTable();
    updateKPISummaries();
    state.hasUnsavedChanges = false;
    setSaveStatus('saved', 'Cleared to Empty');
  } catch (err) {
    alert('Error clearing sheet: ' + err.message);
  }
}

// Helper to format input value (displays blank if null)
function valOrEmpty(val) {
  return (val !== null && val !== undefined) ? val : '';
}

// Render the Spreadsheet Table
function renderTable() {
  const tbody = document.getElementById('tableBody');
  tbody.innerHTML = '';

  const blocks = [0, 1, 2, 3];

  blocks.forEach(blockIdx => {
    const blockHours = state.hours.filter(h => h.blockIndex === blockIdx);

    blockHours.forEach((hourData, hourIdxInBlock) => {
      const hourGlobalIdx = state.hours.indexOf(hourData);
      const isAltBg = (hourIdxInBlock % 2 === 1);
      const rowBgClass = isAltBg ? 'row-blue' : 'row-white';
      const numLines = Math.max(5, (hourData.issues || []).length);

      while (hourData.issues.length < numLines) {
        hourData.issues.push({ problem: '', rootCause: '', containmentAction: '', pcNumber: '' });
      }

      for (let lineIdx = 0; lineIdx < numLines; lineIdx++) {
        const tr = document.createElement('tr');
        tr.className = rowBgClass;

        const issue = hourData.issues[lineIdx] || { problem: '', rootCause: '', containmentAction: '', pcNumber: '' };

        if (lineIdx === 0) {
          // 1. Time Column
          const tdTime = document.createElement('td');
          tdTime.rowSpan = numLines;
          tdTime.innerHTML = `
            <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; gap:4px; padding:4px 2px;">
              <span class="time-cell-badge">${hourData.hourKey}</span>
              <button type="button" class="btn-add-issue" title="Add line" data-hour-idx="${hourGlobalIdx}">
                + Add Line
              </button>
            </div>
          `;
          tr.appendChild(tdTime);

          // 2. Plan (Pcs)
          const tdPlan = document.createElement('td');
          tdPlan.rowSpan = numLines;
          const planInput = document.createElement('input');
          planInput.type = 'number';
          planInput.className = 'cell-input cell-number';
          planInput.value = valOrEmpty(hourData.plan);
          planInput.addEventListener('input', (e) => {
            const raw = e.target.value.trim();
            hourData.plan = raw === '' ? null : Number(raw);
            computeHourLoss(hourData);
            updateLossCell(hourGlobalIdx);
            recalculateSubtotals();
            updateKPISummaries();
            state.hasUnsavedChanges = true;
            triggerAutoSave();
          });
          tdPlan.appendChild(planInput);
          tr.appendChild(tdPlan);

          // 3. Achievement (Pcs)
          const tdAch = document.createElement('td');
          tdAch.rowSpan = numLines;
          const achInput = document.createElement('input');
          achInput.type = 'number';
          achInput.className = 'cell-input cell-number';
          achInput.value = valOrEmpty(hourData.achievement);
          achInput.addEventListener('input', (e) => {
            const raw = e.target.value.trim();
            hourData.achievement = raw === '' ? null : Number(raw);
            computeHourLoss(hourData);
            updateLossCell(hourGlobalIdx);
            recalculateSubtotals();
            updateKPISummaries();
            state.hasUnsavedChanges = true;
            triggerAutoSave();
          });
          tdAch.appendChild(achInput);
          tr.appendChild(tdAch);

          // 4. Loss (Pcs)
          const tdLoss = document.createElement('td');
          tdLoss.rowSpan = numLines;
          tdLoss.id = `lossCell-${hourGlobalIdx}`;
          const lossInput = document.createElement('input');
          lossInput.type = 'number';
          lossInput.className = `cell-input cell-number ${getLossClass(hourData.loss)}`;
          lossInput.value = valOrEmpty(hourData.loss);
          lossInput.id = `lossInput-${hourGlobalIdx}`;
          lossInput.addEventListener('input', (e) => {
            const raw = e.target.value.trim();
            hourData.loss = raw === '' ? null : Number(raw);
            lossInput.className = `cell-input cell-number ${getLossClass(hourData.loss)}`;
            recalculateSubtotals();
            updateKPISummaries();
            state.hasUnsavedChanges = true;
            triggerAutoSave();
          });
          tdLoss.appendChild(lossInput);
          tr.appendChild(tdLoss);

          // 5. Defect / Scrap
          const tdDefect = document.createElement('td');
          tdDefect.rowSpan = numLines;
          const defectTextarea = document.createElement('textarea');
          defectTextarea.className = 'cell-textarea';
          defectTextarea.value = hourData.defectScrap || '';
          defectTextarea.addEventListener('input', (e) => {
            hourData.defectScrap = e.target.value;
            state.hasUnsavedChanges = true;
            triggerAutoSave();
          });
          tdDefect.appendChild(defectTextarea);
          tr.appendChild(tdDefect);

          // 6. Flash (Kg)
          const tdFlash = document.createElement('td');
          tdFlash.rowSpan = numLines;
          const flashInput = document.createElement('input');
          flashInput.type = 'number';
          flashInput.step = '0.1';
          flashInput.className = 'cell-input cell-number';
          flashInput.value = valOrEmpty(hourData.flashKg);
          flashInput.addEventListener('input', (e) => {
            const raw = e.target.value.trim();
            hourData.flashKg = raw === '' ? null : Number(raw);
            recalculateSubtotals();
            updateKPISummaries();
            state.hasUnsavedChanges = true;
            triggerAutoSave();
          });
          tdFlash.appendChild(flashInput);
          tr.appendChild(tdFlash);
        }

        // Issue Columns (1 per row)
        // 7. Problem . Issue
        const tdProblem = document.createElement('td');
        const probInput = document.createElement('input');
        probInput.type = 'text';
        probInput.className = 'cell-input cell-text';
        probInput.value = issue.problem || '';
        probInput.addEventListener('input', (e) => {
          issue.problem = e.target.value;
          state.hasUnsavedChanges = true;
          triggerAutoSave();
        });
        tdProblem.appendChild(probInput);
        tr.appendChild(tdProblem);

        // 8. Root Cause
        const tdRoot = document.createElement('td');
        const rootInput = document.createElement('input');
        rootInput.type = 'text';
        rootInput.className = 'cell-input cell-text';
        rootInput.value = issue.rootCause || '';
        rootInput.addEventListener('input', (e) => {
          issue.rootCause = e.target.value;
          state.hasUnsavedChanges = true;
          triggerAutoSave();
        });
        tdRoot.appendChild(rootInput);
        tr.appendChild(tdRoot);

        // 9. Containment Action
        const tdAction = document.createElement('td');
        const actInput = document.createElement('input');
        actInput.type = 'text';
        actInput.className = 'cell-input cell-text';
        actInput.value = issue.containmentAction || '';
        actInput.addEventListener('input', (e) => {
          issue.containmentAction = e.target.value;
          state.hasUnsavedChanges = true;
          triggerAutoSave();
        });
        tdAction.appendChild(actInput);
        tr.appendChild(tdAction);

        // 10. PC Number / I:R
        const tdPC = document.createElement('td');
        const pcContainer = document.createElement('div');
        pcContainer.className = 'issue-row-container';

        const pcInput = document.createElement('input');
        pcInput.type = 'text';
        pcInput.className = 'cell-input cell-text';
        pcInput.value = issue.pcNumber || '';
        pcInput.addEventListener('input', (e) => {
          issue.pcNumber = e.target.value;
          state.hasUnsavedChanges = true;
          triggerAutoSave();
        });
        pcContainer.appendChild(pcInput);

        if (numLines > 5 && lineIdx >= 5) {
          const btnDel = document.createElement('button');
          btnDel.type = 'button';
          btnDel.className = 'btn-del-issue';
          btnDel.title = 'Remove line';
          btnDel.innerHTML = '✕';
          btnDel.addEventListener('click', () => {
            hourData.issues.splice(lineIdx, 1);
            renderTable();
            state.hasUnsavedChanges = true;
            triggerAutoSave();
          });
          pcContainer.appendChild(btnDel);
        }

        tdPC.appendChild(pcContainer);
        tr.appendChild(tdPC);

        tbody.appendChild(tr);
      }
    });

    // Subtotal Row for this 3-hour Block
    const subtotalTr = document.createElement('tr');
    subtotalTr.className = 'subtotal-row';
    subtotalTr.id = `subtotalRow-${blockIdx}`;

    const subtotalStats = calculateBlockSubtotal(blockIdx);
    const blockLabel = (BLOCK_LABELS[state.shiftType] && BLOCK_LABELS[state.shiftType][blockIdx]) || `Subtotal (Block ${blockIdx + 1})`;

    subtotalTr.innerHTML = `
      <td class="subtotal-label">${blockLabel}</td>
      <td class="subtotal-val" id="subtotalPlan-${blockIdx}">${subtotalStats.planDisplay}</td>
      <td class="subtotal-val" id="subtotalAch-${blockIdx}">${subtotalStats.achDisplay}</td>
      <td class="subtotal-val" id="subtotalLoss-${blockIdx}">${subtotalStats.lossDisplay}</td>
      <td></td>
      <td class="subtotal-val" id="subtotalFlash-${blockIdx}">${subtotalStats.flashDisplay}</td>
      <td colspan="4" style="background:#000;"></td>
    `;
    tbody.appendChild(subtotalTr);
  });

  // Attach "+ Add Line" event handlers
  document.querySelectorAll('.btn-add-issue').forEach(btn => {
    btn.addEventListener('click', () => {
      const hourIdx = Number(btn.dataset.hourIdx);
      if (state.hours[hourIdx]) {
        state.hours[hourIdx].issues.push({ problem: '', rootCause: '', containmentAction: '', pcNumber: '' });
        renderTable();
        state.hasUnsavedChanges = true;
        triggerAutoSave();
      }
    });
  });

  renderGrandTotalRow();
}

// Compute Loss for an hour: Loss = Plan - Achievement (only when at least Plan or Ach is entered)
function computeHourLoss(hourData) {
  const p = hourData.plan;
  const a = hourData.achievement;

  if (p === null && a === null) {
    hourData.loss = null;
  } else {
    const pVal = (p !== null) ? p : 0;
    const aVal = (a !== null) ? a : 0;
    hourData.loss = pVal - aVal;
  }
}

// Helper to style Loss cell
function getLossClass(loss) {
  if (loss === null || loss === undefined) return '';
  if (loss > 0) return 'loss-positive';
  if (loss < 0) return 'loss-negative';
  return 'loss-neutral';
}

function updateLossCell(hourIdx) {
  const lossInput = document.getElementById(`lossInput-${hourIdx}`);
  if (lossInput && state.hours[hourIdx]) {
    lossInput.value = valOrEmpty(state.hours[hourIdx].loss);
    lossInput.className = `cell-input cell-number ${getLossClass(state.hours[hourIdx].loss)}`;
  }
}

// Calculate 3-hour block subtotal
function calculateBlockSubtotal(blockIdx) {
  const blockHours = state.hours.filter(h => h.blockIndex === blockIdx);

  let planSum = 0, hasPlan = false;
  let achSum = 0, hasAch = false;
  let lossSum = 0, hasLoss = false;
  let flashSum = 0, hasFlash = false;

  blockHours.forEach(h => {
    if (h.plan !== null && h.plan !== undefined) { planSum += Number(h.plan); hasPlan = true; }
    if (h.achievement !== null && h.achievement !== undefined) { achSum += Number(h.achievement); hasAch = true; }
    if (h.loss !== null && h.loss !== undefined) { lossSum += Number(h.loss); hasLoss = true; }
    if (h.flashKg !== null && h.flashKg !== undefined) { flashSum += Number(h.flashKg); hasFlash = true; }
  });

  return {
    planDisplay: hasPlan ? planSum : '—',
    achDisplay: hasAch ? achSum : '—',
    lossDisplay: hasLoss ? lossSum : '—',
    flashDisplay: hasFlash ? Number(flashSum.toFixed(2)) : '—',
    planSum: hasPlan ? planSum : 0,
    achSum: hasAch ? achSum : 0,
    lossSum: hasLoss ? lossSum : 0,
    flashSum: hasFlash ? flashSum : 0
  };
}

// Recalculate Subtotals without full table rebuild
function recalculateSubtotals() {
  [0, 1, 2, 3].forEach(blockIdx => {
    const stats = calculateBlockSubtotal(blockIdx);
    const planEl = document.getElementById(`subtotalPlan-${blockIdx}`);
    const achEl = document.getElementById(`subtotalAch-${blockIdx}`);
    const lossEl = document.getElementById(`subtotalLoss-${blockIdx}`);
    const flashEl = document.getElementById(`subtotalFlash-${blockIdx}`);
    if (planEl) planEl.textContent = stats.planDisplay;
    if (achEl) achEl.textContent = stats.achDisplay;
    if (lossEl) lossEl.textContent = stats.lossDisplay;
    if (flashEl) flashEl.textContent = stats.flashDisplay;
  });
  renderGrandTotalRow();
}

// Render Footer Grand Total Row
function renderGrandTotalRow() {
  const tfoot = document.getElementById('tableFoot');

  let totalPlan = 0, hasPlan = false;
  let totalAch = 0, hasAch = false;
  let totalLoss = 0, hasLoss = false;
  let totalFlash = 0, hasFlash = false;

  state.hours.forEach(h => {
    if (h.plan !== null && h.plan !== undefined) { totalPlan += Number(h.plan); hasPlan = true; }
    if (h.achievement !== null && h.achievement !== undefined) { totalAch += Number(h.achievement); hasAch = true; }
    if (h.loss !== null && h.loss !== undefined) { totalLoss += Number(h.loss); hasLoss = true; }
    if (h.flashKg !== null && h.flashKg !== undefined) { totalFlash += Number(h.flashKg); hasFlash = true; }
  });

  tfoot.innerHTML = `
    <tr class="grand-total-row">
      <td class="total-title">TOTAL</td>
      <td class="total-val">${hasPlan ? totalPlan : '—'}</td>
      <td class="total-val">${hasAch ? totalAch : '—'}</td>
      <td class="total-val">${hasLoss ? totalLoss : '—'}</td>
      <td></td>
      <td class="total-val">${hasFlash ? Number(totalFlash.toFixed(2)) : '—'}</td>
      <td colspan="4" style="background:#000;"></td>
    </tr>
  `;
}

// Update Top KPI Cards
function updateKPISummaries() {
  let totalPlan = 0, hasPlan = false;
  let totalAch = 0, hasAch = false;
  let totalLoss = 0, hasLoss = false;
  let totalFlash = 0, hasFlash = false;

  state.hours.forEach(h => {
    if (h.plan !== null && h.plan !== undefined) { totalPlan += Number(h.plan); hasPlan = true; }
    if (h.achievement !== null && h.achievement !== undefined) { totalAch += Number(h.achievement); hasAch = true; }
    if (h.loss !== null && h.loss !== undefined) { totalLoss += Number(h.loss); hasLoss = true; }
    if (h.flashKg !== null && h.flashKg !== undefined) { totalFlash += Number(h.flashKg); hasFlash = true; }
  });

  const rate = (hasPlan && totalPlan > 0) ? ((totalAch / totalPlan) * 100).toFixed(1) + '%' : '—';

  document.getElementById('kpiTotalPlan').innerHTML = hasPlan ? `${totalPlan} <small style="font-size:0.6em;color:#94a3b8">Pcs</small>` : '—';
  document.getElementById('kpiTotalAch').innerHTML = hasAch ? `${totalAch} <small style="font-size:0.6em;color:#94a3b8">Pcs</small>` : '—';
  document.getElementById('kpiTotalLoss').innerHTML = hasLoss ? `${totalLoss} <small style="font-size:0.6em;color:#94a3b8">Pcs</small>` : '—';
  document.getElementById('kpiTotalFlash').innerHTML = hasFlash ? `${Number(totalFlash.toFixed(2))} <small style="font-size:0.6em;color:#94a3b8">Kg</small>` : '—';
  document.getElementById('kpiAchRate').textContent = rate;
}

// Fast Auto-Save Trigger with 500ms Debounce
function triggerAutoSave() {
  setSaveStatus('saving', 'Saving...');
  if (state.saveTimeout) {
    clearTimeout(state.saveTimeout);
  }
  state.saveTimeout = setTimeout(() => {
    saveTrackingSheet(false);
  }, 500);
}

// Save to MongoDB API
async function saveTrackingSheet(isManual = false) {
  setSaveStatus('saving', 'Saving to Cloud...');
  try {
    const payload = {
      date: state.date,
      shiftType: state.shiftType,
      shiftCrew: state.shiftCrew,
      hours: state.hours
    };

    const res = await fetch('/api/tracking', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const json = await res.json();
    if (res.ok && json.success) {
      state.hasUnsavedChanges = false;
      setSaveStatus('saved', isManual ? 'Saved successfully!' : 'Saved');
    } else {
      setSaveStatus('error', json.error || 'Failed to save');
    }
  } catch (err) {
    console.error('Error saving:', err);
    setSaveStatus('error', 'Network error');
  }
}

// Save indicator UI
function setSaveStatus(status, text) {
  const dot = document.getElementById('saveDot');
  const textEl = document.getElementById('saveStatusText');
  dot.className = `indicator-dot ${status}`;
  textEl.textContent = text;
}

// Export to Excel (.xlsx) using SheetJS
function exportToExcel() {
  if (typeof XLSX === 'undefined') {
    alert('Excel export library not loaded.');
    return;
  }

  const wb = XLSX.utils.book_new();
  const rows = [];

  // Title & Metadata
  rows.push(['3 HRS. TRACKING REVIEW']);
  rows.push(['Date:', state.date, 'Shift:', `${state.shiftType} SHIFT`, 'Crew:', `Shift ${state.shiftCrew}`]);
  rows.push([]);

  // Column Headers
  rows.push([
    'Time',
    'Plan (Pcs)',
    'Achievement (Pcs)',
    'Loss (Pcs)',
    'Defect / Scrap',
    'Flash (Kg)',
    'Problem . Issue',
    'Root Cause',
    'Containment Action',
    'PC Number / I:R'
  ]);

  const blocks = [0, 1, 2, 3];
  blocks.forEach(blockIdx => {
    const blockHours = state.hours.filter(h => h.blockIndex === blockIdx);

    blockHours.forEach(hour => {
      const issues = hour.issues || [];
      const numLines = Math.max(1, issues.length);

      for (let i = 0; i < numLines; i++) {
        const issue = issues[i] || {};
        if (i === 0) {
          rows.push([
            hour.hourKey,
            valOrEmpty(hour.plan),
            valOrEmpty(hour.achievement),
            valOrEmpty(hour.loss),
            hour.defectScrap || '',
            valOrEmpty(hour.flashKg),
            issue.problem || '',
            issue.rootCause || '',
            issue.containmentAction || '',
            issue.pcNumber || ''
          ]);
        } else {
          rows.push([
            '', '', '', '', '', '',
            issue.problem || '',
            issue.rootCause || '',
            issue.containmentAction || '',
            issue.pcNumber || ''
          ]);
        }
      }
    });

    const subtotal = calculateBlockSubtotal(blockIdx);
    const blockLabel = (BLOCK_LABELS[state.shiftType] && BLOCK_LABELS[state.shiftType][blockIdx]) || `Subtotal Block ${blockIdx + 1}`;
    rows.push([
      blockLabel,
      subtotal.planDisplay,
      subtotal.achDisplay,
      subtotal.lossDisplay,
      '',
      subtotal.flashDisplay,
      '', '', '', ''
    ]);
  });

  const totalPlan = state.hours.reduce((acc, h) => acc + (Number(h.plan) || 0), 0);
  const totalAch = state.hours.reduce((acc, h) => acc + (Number(h.achievement) || 0), 0);
  const totalLoss = state.hours.reduce((acc, h) => acc + (Number(h.loss) || 0), 0);
  const totalFlash = Number(state.hours.reduce((acc, h) => acc + (Number(h.flashKg) || 0), 0).toFixed(2));

  rows.push([]);
  rows.push([
    'TOTAL',
    totalPlan,
    totalAch,
    totalLoss,
    '',
    totalFlash,
    '', '', '', ''
  ]);

  const ws = XLSX.utils.aoa_to_sheet(rows);

  ws['!cols'] = [
    { wch: 16 }, // Time
    { wch: 12 }, // Plan
    { wch: 16 }, // Achievement
    { wch: 12 }, // Loss
    { wch: 22 }, // Defect
    { wch: 12 }, // Flash
    { wch: 35 }, // Problem
    { wch: 35 }, // Root Cause
    { wch: 35 }, // Action
    { wch: 16 }  // PC No
  ];

  XLSX.utils.book_append_sheet(wb, ws, `${state.date}_${state.shiftType}`);
  XLSX.writeFile(wb, `3_Hour_Tracking_${state.date}_${state.shiftType}_Shift_${state.shiftCrew}.xlsx`);
}

// History & Past Records Modal
async function openHistoryModal() {
  const modal = document.getElementById('historyModal');
  const listEl = document.getElementById('historyList');
  modal.classList.add('open');
  listEl.innerHTML = '<p style="text-align: center; color: #94a3b8; padding: 20px;">Fetching past shift history from MongoDB...</p>';

  try {
    const res = await fetch('/api/history');
    const json = await res.json();

    if (json.success && json.history && json.history.length > 0) {
      listEl.innerHTML = '';
      json.history.forEach(item => {
        const div = document.createElement('div');
        div.className = 'history-item';
        const isDay = item.shiftType === 'DAY';
        const badgeClass = isDay ? 'badge-day' : 'badge-night';
        const shiftIcon = isDay ? '☀️' : '🌙';

        div.innerHTML = `
          <div class="history-item-left">
            <span class="history-date">${item.date}</span>
            <span class="history-badge ${badgeClass}">${shiftIcon} ${item.shiftType} (Crew ${item.shiftCrew || 'A'})</span>
          </div>
          <div class="history-stats">
            <span>Plan: <strong>${item.totalPlan}</strong></span>
            <span>Ach: <strong style="color:#059669">${item.totalAch}</strong></span>
            <span>Loss: <strong style="color:#dc2626">${item.totalLoss}</strong></span>
            <span>Flash: <strong>${item.totalFlash} Kg</strong></span>
          </div>
        `;

        div.addEventListener('click', async () => {
          if (state.hasUnsavedChanges) await saveTrackingSheet(false);

          state.date = item.date;
          state.shiftType = item.shiftType;
          state.shiftCrew = item.shiftCrew || 'A';
          document.getElementById('sheetDate').value = state.date;
          modal.classList.remove('open');

          const btnDay = document.getElementById('btnDayShift');
          const btnNight = document.getElementById('btnNightShift');
          if (state.shiftType === 'DAY') {
            btnDay.classList.add('active', 'day-shift');
            btnNight.classList.remove('active', 'night-shift');
          } else {
            btnNight.classList.add('active', 'night-shift');
            btnDay.classList.remove('active', 'day-shift');
          }

          loadTrackingSheet();
        });

        listEl.appendChild(div);
      });
    } else {
      listEl.innerHTML = '<p style="text-align:center; color:#64748b; padding:20px;">No saved shift records found in MongoDB yet.</p>';
    }
  } catch (err) {
    listEl.innerHTML = `<p style="text-align:center; color:#dc2626; padding:20px;">Error loading history: ${err.message}</p>`;
  }
}
