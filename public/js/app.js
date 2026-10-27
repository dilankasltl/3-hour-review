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
  isInitialized: false
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
  // 07:00 to 18:59:59 is DAY shift; 19:00 to 06:59:59 is NIGHT shift
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

  dateInput.addEventListener('change', (e) => {
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

  btnDay.addEventListener('click', () => {
    if (state.shiftType !== 'DAY') {
      state.shiftType = 'DAY';
      updateShiftPills();
      loadTrackingSheet();
    }
  });

  btnNight.addEventListener('click', () => {
    if (state.shiftType !== 'NIGHT') {
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

// Create fresh default template
function createDefaultHours(shiftType) {
  const template = SHIFT_TEMPLATES[shiftType] || SHIFT_TEMPLATES.DAY;
  return template.map(item => ({
    hourKey: item.hourKey,
    blockIndex: item.blockIndex,
    plan: 0,
    achievement: 0,
    loss: 0,
    defectScrap: '',
    flashKg: 0,
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
      setSaveStatus('saved', json.exists ? 'Loaded from Cloud' : 'New Sheet Ready');
    } else {
      state.hours = createDefaultHours(state.shiftType);
      renderTable();
      updateKPISummaries();
      setSaveStatus('saved', 'New Sheet Ready');
    }
  } catch (err) {
    console.error('Error loading sheet:', err);
    state.hours = createDefaultHours(state.shiftType);
    renderTable();
    updateKPISummaries();
    setSaveStatus('error', 'Offline / Load error');
  }
}

// Render the Spreadsheet Table
function renderTable() {
  const tbody = document.getElementById('tableBody');
  tbody.innerHTML = '';

  // Group hours by 3-hour blocks (0, 1, 2, 3)
  const blocks = [0, 1, 2, 3];

  blocks.forEach(blockIdx => {
    const blockHours = state.hours.filter(h => h.blockIndex === blockIdx);

    // Render each hour in this block
    blockHours.forEach((hourData, hourIdxInBlock) => {
      const hourGlobalIdx = state.hours.indexOf(hourData);
      const isAltBg = (hourIdxInBlock % 2 === 1);
      const rowBgClass = isAltBg ? 'row-blue' : 'row-white';
      const numLines = Math.max(5, (hourData.issues || []).length);

      // Ensure state has at least numLines
      while (hourData.issues.length < numLines) {
        hourData.issues.push({ problem: '', rootCause: '', containmentAction: '', pcNumber: '' });
      }

      for (let lineIdx = 0; lineIdx < numLines; lineIdx++) {
        const tr = document.createElement('tr');
        tr.className = rowBgClass;

        const issue = hourData.issues[lineIdx] || { problem: '', rootCause: '', containmentAction: '', pcNumber: '' };

        // For the first line of the hour, render the spanning columns (rowspan = numLines)
        if (lineIdx === 0) {
          // 1. Time Column
          const tdTime = document.createElement('td');
          tdTime.rowSpan = numLines;
          tdTime.innerHTML = `
            <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; gap:6px;">
              <span class="time-cell-badge">${hourData.hourKey}</span>
              <button type="button" class="btn-add-issue" title="Add line for this hour" data-hour-idx="${hourGlobalIdx}">
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
          planInput.value = hourData.plan || '';
          planInput.placeholder = '0';
          planInput.addEventListener('input', (e) => {
            hourData.plan = Number(e.target.value) || 0;
            // Auto calculate Loss = Plan - Achievement
            hourData.loss = (hourData.plan || 0) - (hourData.achievement || 0);
            updateLossCell(hourGlobalIdx);
            recalculateSubtotals();
            updateKPISummaries();
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
          achInput.value = hourData.achievement || '';
          achInput.placeholder = '0';
          achInput.addEventListener('input', (e) => {
            hourData.achievement = Number(e.target.value) || 0;
            // Auto calculate Loss = Plan - Achievement
            hourData.loss = (hourData.plan || 0) - (hourData.achievement || 0);
            updateLossCell(hourGlobalIdx);
            recalculateSubtotals();
            updateKPISummaries();
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
          lossInput.value = hourData.loss !== undefined ? hourData.loss : '';
          lossInput.placeholder = '0';
          lossInput.id = `lossInput-${hourGlobalIdx}`;
          lossInput.addEventListener('input', (e) => {
            hourData.loss = Number(e.target.value) || 0;
            lossInput.className = `cell-input cell-number ${getLossClass(hourData.loss)}`;
            recalculateSubtotals();
            updateKPISummaries();
            triggerAutoSave();
          });
          tdLoss.appendChild(lossInput);
          tr.appendChild(tdLoss);

          // 5. Defect / Scrap
          const tdDefect = document.createElement('td');
          tdDefect.rowSpan = numLines;
          const defectTextarea = document.createElement('textarea');
          defectTextarea.className = 'cell-textarea';
          defectTextarea.placeholder = 'Defects list...';
          defectTextarea.value = hourData.defectScrap || '';
          defectTextarea.addEventListener('input', (e) => {
            hourData.defectScrap = e.target.value;
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
          flashInput.value = hourData.flashKg || '';
          flashInput.placeholder = '0';
          flashInput.addEventListener('input', (e) => {
            hourData.flashKg = Number(e.target.value) || 0;
            recalculateSubtotals();
            updateKPISummaries();
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
          triggerAutoSave();
        });
        tdAction.appendChild(actInput);
        tr.appendChild(tdAction);

        // 10. PC Number / I:R (with optional delete line if lineIdx >= 5)
        const tdPC = document.createElement('td');
        const pcContainer = document.createElement('div');
        pcContainer.className = 'issue-row-container';

        const pcInput = document.createElement('input');
        pcInput.type = 'text';
        pcInput.className = 'cell-input cell-text';
        pcInput.value = issue.pcNumber || '';
        pcInput.addEventListener('input', (e) => {
          issue.pcNumber = e.target.value;
          triggerAutoSave();
        });
        pcContainer.appendChild(pcInput);

        if (numLines > 5 && lineIdx >= 5) {
          const btnDel = document.createElement('button');
          btnDel.type = 'button';
          btnDel.className = 'btn-del-issue';
          btnDel.title = 'Remove extra line';
          btnDel.innerHTML = '✕';
          btnDel.addEventListener('click', () => {
            hourData.issues.splice(lineIdx, 1);
            renderTable();
            triggerAutoSave();
          });
          pcContainer.appendChild(btnDel);
        }

        tdPC.appendChild(pcContainer);
        tr.appendChild(tdPC);

        tbody.appendChild(tr);
      }
    });

    // Subtotal Row for this 3-hour Block (Black row matching image!)
    const subtotalTr = document.createElement('tr');
    subtotalTr.className = 'subtotal-row';
    subtotalTr.id = `subtotalRow-${blockIdx}`;

    const subtotalStats = calculateBlockSubtotal(blockIdx);
    const blockLabel = (BLOCK_LABELS[state.shiftType] && BLOCK_LABELS[state.shiftType][blockIdx]) || `Subtotal (Block ${blockIdx + 1})`;

    subtotalTr.innerHTML = `
      <td class="subtotal-label" style="text-align:center;">${blockLabel}</td>
      <td class="subtotal-val" id="subtotalPlan-${blockIdx}">${subtotalStats.plan}</td>
      <td class="subtotal-val" id="subtotalAch-${blockIdx}">${subtotalStats.achievement}</td>
      <td class="subtotal-val" id="subtotalLoss-${blockIdx}">${subtotalStats.loss}</td>
      <td></td>
      <td class="subtotal-val" id="subtotalFlash-${blockIdx}">${subtotalStats.flashKg}</td>
      <td colspan="4" style="background:#000;"></td>
    `;
    tbody.appendChild(subtotalTr);
  });

  // Attach "+ Add Line" event handlers
  document.querySelectorAll('.btn-add-issue').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const hourIdx = Number(btn.dataset.hourIdx);
      if (state.hours[hourIdx]) {
        state.hours[hourIdx].issues.push({ problem: '', rootCause: '', containmentAction: '', pcNumber: '' });
        renderTable();
        triggerAutoSave();
      }
    });
  });

  // Render Footer Grand Total Row
  renderGrandTotalRow();
}

// Helper to style Loss cell
function getLossClass(loss) {
  if (loss > 0) return 'loss-positive';
  if (loss < 0) return 'loss-negative';
  return 'loss-neutral';
}

function updateLossCell(hourIdx) {
  const lossInput = document.getElementById(`lossInput-${hourIdx}`);
  if (lossInput && state.hours[hourIdx]) {
    lossInput.value = state.hours[hourIdx].loss;
    lossInput.className = `cell-input cell-number ${getLossClass(state.hours[hourIdx].loss)}`;
  }
}

// Calculate 3-hour block subtotal
function calculateBlockSubtotal(blockIdx) {
  const blockHours = state.hours.filter(h => h.blockIndex === blockIdx);
  const plan = blockHours.reduce((acc, h) => acc + (Number(h.plan) || 0), 0);
  const achievement = blockHours.reduce((acc, h) => acc + (Number(h.achievement) || 0), 0);
  const loss = blockHours.reduce((acc, h) => acc + (Number(h.loss) || 0), 0);
  const flashKg = Number(blockHours.reduce((acc, h) => acc + (Number(h.flashKg) || 0), 0).toFixed(2));
  return { plan, achievement, loss, flashKg };
}

// Recalculate Subtotals without full table rebuild
function recalculateSubtotals() {
  [0, 1, 2, 3].forEach(blockIdx => {
    const stats = calculateBlockSubtotal(blockIdx);
    const planEl = document.getElementById(`subtotalPlan-${blockIdx}`);
    const achEl = document.getElementById(`subtotalAch-${blockIdx}`);
    const lossEl = document.getElementById(`subtotalLoss-${blockIdx}`);
    const flashEl = document.getElementById(`subtotalFlash-${blockIdx}`);
    if (planEl) planEl.textContent = stats.plan;
    if (achEl) achEl.textContent = stats.achievement;
    if (lossEl) lossEl.textContent = stats.loss;
    if (flashEl) flashEl.textContent = stats.flashKg;
  });
  renderGrandTotalRow();
}

// Render Footer Grand Total Row
function renderGrandTotalRow() {
  const tfoot = document.getElementById('tableFoot');
  const totalPlan = state.hours.reduce((acc, h) => acc + (Number(h.plan) || 0), 0);
  const totalAch = state.hours.reduce((acc, h) => acc + (Number(h.achievement) || 0), 0);
  const totalLoss = state.hours.reduce((acc, h) => acc + (Number(h.loss) || 0), 0);
  const totalFlash = Number(state.hours.reduce((acc, h) => acc + (Number(h.flashKg) || 0), 0).toFixed(2));

  tfoot.innerHTML = `
    <tr class="grand-total-row">
      <td class="total-title">TOTAL</td>
      <td class="total-val">${totalPlan}</td>
      <td class="total-val">${totalAch}</td>
      <td class="total-val">${totalLoss}</td>
      <td></td>
      <td class="total-val">${totalFlash}</td>
      <td colspan="4" style="background:#000;"></td>
    </tr>
  `;
}

// Update Top KPI Cards
function updateKPISummaries() {
  const totalPlan = state.hours.reduce((acc, h) => acc + (Number(h.plan) || 0), 0);
  const totalAch = state.hours.reduce((acc, h) => acc + (Number(h.achievement) || 0), 0);
  const totalLoss = state.hours.reduce((acc, h) => acc + (Number(h.loss) || 0), 0);
  const totalFlash = Number(state.hours.reduce((acc, h) => acc + (Number(h.flashKg) || 0), 0).toFixed(2));
  const rate = totalPlan > 0 ? ((totalAch / totalPlan) * 100).toFixed(1) : '0.0';

  document.getElementById('kpiTotalPlan').innerHTML = `${totalPlan} <small style="font-size:0.6em;color:#94a3b8">Pcs</small>`;
  document.getElementById('kpiTotalAch').innerHTML = `${totalAch} <small style="font-size:0.6em;color:#94a3b8">Pcs</small>`;
  document.getElementById('kpiTotalLoss').innerHTML = `${totalLoss} <small style="font-size:0.6em;color:#94a3b8">Pcs</small>`;
  document.getElementById('kpiTotalFlash').innerHTML = `${totalFlash} <small style="font-size:0.6em;color:#94a3b8">Kg</small>`;
  document.getElementById('kpiAchRate').textContent = `${rate}%`;
}

// Auto Save Handler with Debounce
function triggerAutoSave() {
  setSaveStatus('saving', 'Saving...');
  if (state.saveTimeout) {
    clearTimeout(state.saveTimeout);
  }
  state.saveTimeout = setTimeout(() => {
    saveTrackingSheet(false);
  }, 1200);
}

// Save to MongoDB API
async function saveTrackingSheet(isManual = false) {
  setSaveStatus('saving', 'Saving to MongoDB...');
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
    alert('Excel export library not loaded. Please ensure js/xlsx.full.min.js is present.');
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

  // Data Rows grouped by blocks
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
            hour.plan || 0,
            hour.achievement || 0,
            hour.loss || 0,
            hour.defectScrap || '',
            hour.flashKg || 0,
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

    // Subtotal Row
    const subtotal = calculateBlockSubtotal(blockIdx);
    const blockLabel = (BLOCK_LABELS[state.shiftType] && BLOCK_LABELS[state.shiftType][blockIdx]) || `Subtotal Block ${blockIdx + 1}`;
    rows.push([
      blockLabel,
      subtotal.plan,
      subtotal.achievement,
      subtotal.loss,
      '',
      subtotal.flashKg,
      '', '', '', ''
    ]);
  });

  // Grand Total Row
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

  // Set column widths
  ws['!cols'] = [
    { wch: 18 }, // Time
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

        div.addEventListener('click', () => {
          state.date = item.date;
          state.shiftType = item.shiftType;
          state.shiftCrew = item.shiftCrew || 'A';
          document.getElementById('sheetDate').value = state.date;
          modal.classList.remove('open');

          // Update shift button UI
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
