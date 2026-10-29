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
  fetchMissingActionsFromDB();
  fetchTakenActionsFromDB();
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

  // History modal (if present)
  const historyModal = document.getElementById('historyModal');
  const btnHistory = document.getElementById('btnHistory');
  if (btnHistory && historyModal) {
    btnHistory.addEventListener('click', () => {
      openHistoryModal();
    });
  }
  const btnCloseHistory = document.getElementById('btnCloseHistory');
  if (btnCloseHistory && historyModal) {
    btnCloseHistory.addEventListener('click', () => {
      historyModal.classList.remove('open');
    });
    historyModal.addEventListener('click', (e) => {
      if (e.target === historyModal) {
        historyModal.classList.remove('open');
      }
    });
  }

  // Enter Data Modal
  const enterDataModal = document.getElementById('enterDataModal');
  const btnOpenEnterData = document.getElementById('btnOpenEnterData');
  if (btnOpenEnterData && enterDataModal) {
    btnOpenEnterData.addEventListener('click', () => {
      openEnterDataModal();
    });
  }
  const btnCloseEnterData = document.getElementById('btnCloseEnterData');
  const btnCancelEnterData = document.getElementById('btnCancelEnterData');
  [btnCloseEnterData, btnCancelEnterData].forEach(btn => {
    if (btn && enterDataModal) {
      btn.addEventListener('click', () => {
        enterDataModal.classList.remove('open');
      });
    }
  });
  if (enterDataModal) {
    enterDataModal.addEventListener('click', (e) => {
      if (e.target === enterDataModal) enterDataModal.classList.remove('open');
    });
  }

  // Shift radio changes in Enter Data modal
  const formShiftDay = document.getElementById('formShiftDay');
  const formShiftNight = document.getElementById('formShiftNight');
  if (formShiftDay && formShiftNight) {
    formShiftDay.addEventListener('change', () => populateEnterDataHours('DAY'));
    formShiftNight.addEventListener('change', () => populateEnterDataHours('NIGHT'));
  }

  // Enter Data Form Submit
  const enterDataForm = document.getElementById('enterDataForm');
  if (enterDataForm) {
    enterDataForm.addEventListener('submit', handleEnterDataSubmit);
  }

  // Inline Action Modal
  const inlineActionModal = document.getElementById('inlineActionModal');
  const btnCloseInlineAction = document.getElementById('btnCloseInlineAction');
  const btnCancelInlineAction = document.getElementById('btnCancelInlineAction');
  [btnCloseInlineAction, btnCancelInlineAction].forEach(btn => {
    if (btn && inlineActionModal) {
      btn.addEventListener('click', () => {
        inlineActionModal.classList.remove('open');
      });
    }
  });
  if (inlineActionModal) {
    inlineActionModal.addEventListener('click', (e) => {
      if (e.target === inlineActionModal) inlineActionModal.classList.remove('open');
    });
  }

  // Inline Action Form Submit
  const inlineActionForm = document.getElementById('inlineActionForm');
  if (inlineActionForm) {
    inlineActionForm.addEventListener('submit', handleInlineActionSubmit);
  }

  // Taken Actions Modal
  const takenModal = document.getElementById('takenActionsModal');
  const btnTaken = document.getElementById('btnTakenActions');
  if (btnTaken && takenModal) {
    btnTaken.addEventListener('click', () => {
      openTakenActionsModal();
    });
  }
  const btnCloseTaken = document.getElementById('btnCloseTakenActions');
  if (btnCloseTaken && takenModal) {
    btnCloseTaken.addEventListener('click', () => {
      takenModal.classList.remove('open');
    });
    takenModal.addEventListener('click', (e) => {
      if (e.target === takenModal) takenModal.classList.remove('open');
    });
  }

  // Missing Containment Actions Modal
  const missingModal = document.getElementById('missingActionsModal');
  const btnMissing = document.getElementById('btnMissingActions');
  if (btnMissing) {
    btnMissing.addEventListener('click', () => {
      openMissingActionsModal();
    });
  }
  const btnCloseMissing = document.getElementById('btnCloseMissingActions');
  if (btnCloseMissing && missingModal) {
    btnCloseMissing.addEventListener('click', () => {
      missingModal.classList.remove('open');
    });
    missingModal.addEventListener('click', (e) => {
      if (e.target === missingModal) {
        missingModal.classList.remove('open');
      }
    });
  }

  const tabCurrent = document.getElementById('tabCurrentSheet');
  const tabAll = document.getElementById('tabAllSheets');
  if (tabCurrent && tabAll) {
    tabCurrent.addEventListener('click', () => {
      tabCurrent.classList.add('active');
      tabAll.classList.remove('active');
      renderCurrentSheetMissingActions();
    });
    tabAll.addEventListener('click', () => {
      tabAll.classList.add('active');
      tabCurrent.classList.remove('active');
      renderAllSheetsMissingActions();
    });
  }
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
      { defectScrap: '', problem: '', rootCause: '', containmentAction: '', pcNumber: '', enteredBy: '', actionTakenBy: '' },
      { defectScrap: '', problem: '', rootCause: '', containmentAction: '', pcNumber: '', enteredBy: '', actionTakenBy: '' },
      { defectScrap: '', problem: '', rootCause: '', containmentAction: '', pcNumber: '', enteredBy: '', actionTakenBy: '' },
      { defectScrap: '', problem: '', rootCause: '', containmentAction: '', pcNumber: '', enteredBy: '', actionTakenBy: '' },
      { defectScrap: '', problem: '', rootCause: '', containmentAction: '', pcNumber: '', enteredBy: '', actionTakenBy: '' }
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

      // Ensure every issue has defectScrap initialized
      (state.hours || []).forEach(h => {
        if (h.defectScrap && h.issues && h.issues.length > 0 && !h.issues[0].defectScrap) {
          h.issues[0].defectScrap = h.defectScrap;
        }
        (h.issues || []).forEach(i => {
          if (i.defectScrap === undefined) i.defectScrap = '';
        });
      });

      // Sync crew UI
      document.querySelectorAll('.crew-pill').forEach(b => {
        b.classList.toggle('active', b.dataset.crew === state.shiftCrew);
      });

      renderTable();
      updateKPISummaries();
      updateMissingActionsBadge();
      updateTakenActionsBadge();
      fetchMissingActionsFromDB();
      fetchTakenActionsFromDB();
      state.hasUnsavedChanges = false;
      setSaveStatus('saved', json.exists ? 'Loaded from Cloud' : 'Ready (Empty)');
    } else {
      state.hours = createDefaultHours(state.shiftType);
      renderTable();
      updateKPISummaries();
      updateMissingActionsBadge();
      updateTakenActionsBadge();
      fetchMissingActionsFromDB();
      fetchTakenActionsFromDB();
      state.hasUnsavedChanges = false;
      setSaveStatus('saved', 'Ready (Empty)');
    }
  } catch (err) {
    console.error('Error loading sheet:', err);
    state.hours = createDefaultHours(state.shiftType);
    renderTable();
    updateKPISummaries();
    updateMissingActionsBadge();
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

// Helper to auto-resize textareas so text wraps cleanly to 2nd, 3rd lines without any dots (...)
function autoResizeTextarea(el) {
  el.style.height = 'auto';
  el.style.height = Math.max(28, el.scrollHeight) + 'px';
}

function createIssueTextarea(val, onInputCallback) {
  const ta = document.createElement('textarea');
  ta.rows = 1;
  ta.className = 'cell-textarea-row';
  ta.value = val || '';
  ta.addEventListener('input', (e) => {
    autoResizeTextarea(ta);
    onInputCallback(e.target.value);
  });
  // Auto-resize on initial render
  setTimeout(() => autoResizeTextarea(ta), 0);
  return ta;
}

// Visual highlight when Problem is entered but Containment Action is empty
function updateActionHighlight(problemVal, actionVal, tdEl, inputEl) {
  const hasProblem = (problemVal || '').trim() !== '';
  const hasAction = (actionVal || '').trim() !== '';
  const isMissing = hasProblem && !hasAction;

  if (isMissing) {
    tdEl.classList.add('cell-missing-action');
    inputEl.classList.add('missing-containment-action');
    inputEl.placeholder = '⚠️ Action required!';
  } else {
    tdEl.classList.remove('cell-missing-action');
    inputEl.classList.remove('missing-containment-action');
    inputEl.placeholder = '';
  }
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
        hourData.issues.push({ defectScrap: '', problem: '', rootCause: '', containmentAction: '', pcNumber: '' });
      }

      for (let lineIdx = 0; lineIdx < numLines; lineIdx++) {
        const tr = document.createElement('tr');
        tr.className = rowBgClass;

        const issue = hourData.issues[lineIdx] || { defectScrap: '', problem: '', rootCause: '', containmentAction: '', pcNumber: '' };

        if (lineIdx === 0) {
          // 1. Time Column (rowspan = numLines)
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

          // 2. Plan (Pcs) (rowspan = numLines)
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

          // 3. Achievement (Pcs) (rowspan = numLines)
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

          // 4. Loss (Pcs) (rowspan = numLines)
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

          // 5. Defect / Scrap (Ruled line 0, rowspan = 1)
          const tdDefect = document.createElement('td');
          const defectInput = createIssueTextarea(issue.defectScrap, (val) => {
            issue.defectScrap = val;
            state.hasUnsavedChanges = true;
            triggerAutoSave();
          });
          tdDefect.appendChild(defectInput);
          tr.appendChild(tdDefect);

          // 6. Flash (Kg) (rowspan = numLines)
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
        } else {
          // When lineIdx > 0:
          // Defect / Scrap (Ruled line lineIdx, rowspan = 1)
          const tdDefect = document.createElement('td');
          const defectInput = createIssueTextarea(issue.defectScrap, (val) => {
            issue.defectScrap = val;
            state.hasUnsavedChanges = true;
            triggerAutoSave();
          });
          tdDefect.appendChild(defectInput);
          tr.appendChild(tdDefect);
        }

        // Issue Columns (1 per row)
        // 7. Problem . Issue (Read-only on ruled cells, entered via 'Enter Data' button)
        const tdProblem = document.createElement('td');
        const hasProb = Boolean(issue.problem && issue.problem.trim() !== '');
        if (hasProb) {
          const author = issue.enteredBy ? formatMrName(issue.enteredBy) : '';
          tdProblem.innerHTML = `
            <div class="cell-read-only-content">
              <div class="cell-issue-text">${escapeHtml(issue.problem)}</div>
              ${author ? `<div class="cell-author-tag">👤 ${escapeHtml(author)}</div>` : ''}
            </div>
          `;
        } else {
          tdProblem.innerHTML = '';
        }
        tr.appendChild(tdProblem);

        // 8. Root Cause (Read-only, or button to enter cause if problem exists)
        const tdRoot = document.createElement('td');
        const hasRoot = Boolean(issue.rootCause && issue.rootCause.trim() !== '');
        if (hasRoot) {
          tdRoot.innerHTML = `
            <div class="cell-read-only-content">
              <div class="cell-issue-text">${escapeHtml(issue.rootCause)}</div>
            </div>
          `;
        } else if (hasProb) {
          tdRoot.innerHTML = `
            <div class="cell-read-only-content" style="align-items: center; justify-content: center;">
              <button type="button" class="btn-table-inline btn-inline-cause" data-hour-key="${hourData.hourKey}" data-line-idx="${lineIdx}">
                + Cause
              </button>
            </div>
          `;
        } else {
          tdRoot.innerHTML = '';
        }
        tr.appendChild(tdRoot);

        // 9. Containment Action (Read-only, or alert button if missing)
        const tdAction = document.createElement('td');
        const hasAct = Boolean(issue.containmentAction && issue.containmentAction.trim() !== '');
        if (hasAct) {
          const actionAuthor = issue.actionTakenBy ? formatMrName(issue.actionTakenBy) : (issue.enteredBy ? formatMrName(issue.enteredBy) : '');
          tdAction.classList.remove('cell-missing-action');
          tdAction.innerHTML = `
            <div class="cell-read-only-content">
              <div class="cell-issue-text cell-action-success">✅ ${escapeHtml(issue.containmentAction)}</div>
              ${actionAuthor ? `<div class="cell-author-tag">👤 ${escapeHtml(actionAuthor)}</div>` : ''}
            </div>
          `;
        } else if (hasProb) {
          tdAction.classList.add('cell-missing-action');
          tdAction.innerHTML = `
            <div class="cell-read-only-content" style="align-items: center; justify-content: center;">
              <button type="button" class="btn-table-inline btn-inline-action" data-hour-key="${hourData.hourKey}" data-line-idx="${lineIdx}">
                ⚠️ + Enter Action
              </button>
            </div>
          `;
        } else {
          tdAction.classList.remove('cell-missing-action');
          tdAction.innerHTML = '';
        }
        tr.appendChild(tdAction);

        // 10. PC Number / I:R
        const tdPC = document.createElement('td');
        const pcContainer = document.createElement('div');
        pcContainer.className = 'issue-row-container';

        const pcInput = createIssueTextarea(issue.pcNumber, (val) => {
          issue.pcNumber = val;
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
        state.hours[hourIdx].issues.push({ defectScrap: '', problem: '', rootCause: '', containmentAction: '', pcNumber: '' });
        renderTable();
        state.hasUnsavedChanges = true;
        triggerAutoSave();
      }
    });
  });

  // Attach inline action button handlers (+ Cause and + Enter Action)
  document.querySelectorAll('.btn-inline-action, .btn-inline-cause').forEach(btn => {
    btn.addEventListener('click', () => {
      const hourKey = btn.dataset.hourKey;
      const lineIdx = Number(btn.dataset.lineIdx);
      openInlineActionModal(hourKey, lineIdx);
    });
  });

  renderGrandTotalRow();
  updateMissingActionsBadge();
  updateTakenActionsBadge();
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
      fetchMissingActionsFromDB();
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
            issue.defectScrap || hour.defectScrap || '',
            valOrEmpty(hour.flashKg),
            issue.problem || '',
            issue.rootCause || '',
            issue.containmentAction || '',
            issue.pcNumber || ''
          ]);
        } else {
          rows.push([
            '', '', '', '',
            issue.defectScrap || '',
            '',
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

// State for cached DB missing actions
let dbMissingActionsCache = [];

// Get all current in-memory missing containment actions for active sheet
function getCurrentSheetMissingActions() {
  const currentMissing = [];
  (state.hours || []).forEach(h => {
    (h.issues || []).forEach((issue, idx) => {
      const prob = (issue.problem || '').trim();
      const act = (issue.containmentAction || '').trim();
      if (prob !== '' && act === '') {
        currentMissing.push({
          date: state.date,
          shiftType: state.shiftType,
          shiftCrew: state.shiftCrew,
          hourKey: h.hourKey,
          lineIdx: idx,
          problem: issue.problem,
          rootCause: issue.rootCause || '',
          defectScrap: issue.defectScrap || '',
          pcNumber: issue.pcNumber || '',
          isCurrentSheet: true,
          issueRef: issue
        });
      }
    });
  });
  return currentMissing;
}

// Combine all missing actions: other dates from DB + current date from memory
function getAllMissingActionsCombined() {
  const currentMissing = getCurrentSheetMissingActions();
  // Filter out the active sheet from db cache to avoid stale/duplicate items
  const otherDatesMissing = dbMissingActionsCache.filter(item => 
    !(item.date === state.date && item.shiftType === state.shiftType)
  );
  // Return combined list sorted by date descending
  return [...currentMissing, ...otherDatesMissing].sort((a, b) => {
    if (a.date !== b.date) return b.date.localeCompare(a.date);
    if (a.shiftType !== b.shiftType) return a.shiftType.localeCompare(b.shiftType);
    return a.hourKey.localeCompare(b.hourKey);
  });
}

// Update the badge count of missing containment actions (GLOBAL ACROSS ALL DATES)
function updateMissingActionsBadge() {
  const allMissing = getAllMissingActionsCombined();
  const currentMissing = getCurrentSheetMissingActions();
  const totalCount = allMissing.length;

  const badge = document.getElementById('missingActionsCount');
  if (badge) {
    badge.textContent = totalCount;
    badge.style.display = totalCount > 0 ? 'inline-flex' : 'none';
  }

  const tabCountAll = document.getElementById('tabCountAll');
  if (tabCountAll) {
    tabCountAll.textContent = totalCount;
  }

  const tabCountCur = document.getElementById('tabCountCurrent');
  if (tabCountCur) {
    tabCountCur.textContent = currentMissing.length;
  }
}

// Fetch total missing actions across all dates from MongoDB
async function fetchMissingActionsFromDB() {
  try {
    const res = await fetch('/api/missing-actions');
    const json = await res.json();
    if (json.success && Array.isArray(json.missing)) {
      dbMissingActionsCache = json.missing;
      updateMissingActionsBadge();
    }
  } catch (err) {
    console.error('Error fetching missing actions from DB:', err);
  }
}

// Missing Containment Actions Modal Logic
async function openMissingActionsModal() {
  const modal = document.getElementById('missingActionsModal');
  if (!modal) return;
  modal.classList.add('open');

  const tabAll = document.getElementById('tabAllSheets');
  const tabCurrent = document.getElementById('tabCurrentSheet');
  if (tabAll) tabAll.classList.add('active');
  if (tabCurrent) tabCurrent.classList.remove('active');

  // Immediately refresh database missing actions and render All Dates
  await fetchMissingActionsFromDB();
  renderAllSheetsMissingActions();
}

function renderAllSheetsMissingActions() {
  const listEl = document.getElementById('missingActionsList');
  if (!listEl) return;

  const allMissing = getAllMissingActionsCombined();
  const currentMissing = getCurrentSheetMissingActions();

  const tabCountAll = document.getElementById('tabCountAll');
  if (tabCountAll) tabCountAll.textContent = allMissing.length;
  const tabCountCur = document.getElementById('tabCountCurrent');
  if (tabCountCur) tabCountCur.textContent = currentMissing.length;

  if (allMissing.length === 0) {
    listEl.innerHTML = `
      <div style="text-align: center; padding: 40px 20px; color: #16a34a;">
        <div style="font-size: 2.5rem; margin-bottom: 8px;">🎉</div>
        <div style="font-weight: 800; font-size: 1.1rem;">Zero missing containment actions across all recorded dates!</div>
        <div style="color: #64748b; font-size: 0.85rem; margin-top: 4px;">Great job! All issues have logged containment actions.</div>
      </div>
    `;
    return;
  }

  listEl.innerHTML = '';
  allMissing.forEach(item => {
    const isCurrent = (item.date === state.date && item.shiftType === state.shiftType);
    const card = document.createElement('div');
    card.className = 'missing-item-card';

    const isDay = item.shiftType === 'DAY';
    const shiftBadge = isDay ? '☀️ DAY' : '🌙 NIGHT';

    card.innerHTML = `
      <div class="missing-header-row">
        <div class="missing-badges">
          <span class="badge-info badge-date" style="font-weight: 900; font-size: 0.82rem;">📅 ${item.date}</span>
          <span class="badge-info">${shiftBadge} (Crew ${item.shiftCrew || 'A'})</span>
          <span class="badge-info badge-hour">⏰ ${item.hourKey} - Line #${item.lineIdx + 1}</span>
          ${isCurrent ? '<span class="badge-info" style="background:#10b981; color:#fff; font-weight:800;">ACTIVE SHEET</span>' : ''}
        </div>
        <div>
          ${!isCurrent ? '<button type="button" class="btn-jump-sheet" title="Open this date\'s sheet">🔍 Open Sheet</button>' : ''}
        </div>
      </div>
      <div class="missing-body-grid">
        <div>
          <div class="missing-field-label">Problem / Issue:</div>
          <div class="missing-field-val problem-val">⚠️ ${escapeHtml(item.problem)}</div>
        </div>
        <div>
          <div class="missing-field-label">Root Cause:</div>
          <div class="missing-field-val">${escapeHtml(item.rootCause || '—')}</div>
        </div>
      </div>
      <div class="missing-input-row">
        <input type="text" class="missing-input-action" placeholder="Enter Containment Action here..." value="${escapeHtml(item.containmentAction || (item.issueRef && item.issueRef.containmentAction) || '')}">
        <button type="button" class="btn-save-inline">💾 Save Action</button>
      </div>
    `;

    const input = card.querySelector('.missing-input-action');
    const btnSave = card.querySelector('.btn-save-inline');
    const btnJump = card.querySelector('.btn-jump-sheet');

    btnSave.addEventListener('click', async () => {
      const val = input.value.trim();
      if (!val) {
        alert('Please enter a containment action.');
        return;
      }
      btnSave.disabled = true;
      btnSave.textContent = 'Saving...';

      if (isCurrent && item.issueRef) {
        item.issueRef.containmentAction = val;
        state.hasUnsavedChanges = true;
        await saveTrackingSheet(false);
        renderTable();
        await fetchMissingActionsFromDB();
        renderAllSheetsMissingActions();
      } else {
        try {
          const updateRes = await fetch('/api/containment-action', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              date: item.date,
              shiftType: item.shiftType,
              hourKey: item.hourKey,
              lineIdx: item.lineIdx,
              containmentAction: val
            })
          });
          const updateJson = await updateRes.json();
          if (updateRes.ok && updateJson.success) {
            await fetchMissingActionsFromDB();
            renderAllSheetsMissingActions();
          } else {
            alert('Failed to save: ' + (updateJson.error || 'Server error'));
            btnSave.disabled = false;
            btnSave.textContent = '💾 Save Action';
          }
        } catch (err) {
          alert('Network error: ' + err.message);
          btnSave.disabled = false;
          btnSave.textContent = '💾 Save Action';
        }
      }
    });

    if (btnJump) {
      btnJump.addEventListener('click', async () => {
        if (state.hasUnsavedChanges) await saveTrackingSheet(false);
        state.date = item.date;
        state.shiftType = item.shiftType;
        state.shiftCrew = item.shiftCrew || 'A';
        document.getElementById('sheetDate').value = state.date;

        const btnDay = document.getElementById('btnDayShift');
        const btnNight = document.getElementById('btnNightShift');
        if (state.shiftType === 'DAY') {
          btnDay.classList.add('active', 'day-shift');
          btnNight.classList.remove('active', 'night-shift');
        } else {
          btnNight.classList.add('active', 'night-shift');
          btnDay.classList.remove('active', 'day-shift');
        }

        const modal = document.getElementById('missingActionsModal');
        if (modal) modal.classList.remove('open');

        await loadTrackingSheet();
      });
    }

    listEl.appendChild(card);
  });
}

function renderCurrentSheetMissingActions() {
  const listEl = document.getElementById('missingActionsList');
  if (!listEl) return;

  const currentMissing = getCurrentSheetMissingActions();
  const allMissing = getAllMissingActionsCombined();

  const tabCountAll = document.getElementById('tabCountAll');
  if (tabCountAll) tabCountAll.textContent = allMissing.length;
  const tabCountCur = document.getElementById('tabCountCurrent');
  if (tabCountCur) tabCountCur.textContent = currentMissing.length;

  if (currentMissing.length === 0) {
    listEl.innerHTML = `
      <div style="text-align: center; padding: 40px 20px; color: #16a34a;">
        <div style="font-size: 2.5rem; margin-bottom: 8px;">✅</div>
        <div style="font-weight: 800; font-size: 1.1rem;">All containment actions are filled for ${state.date} (${state.shiftType})!</div>
        <div style="color: #64748b; font-size: 0.85rem; margin-top: 4px;">Click the "All Dates" tab to check other dates.</div>
      </div>
    `;
    return;
  }

  listEl.innerHTML = '';
  currentMissing.forEach(item => {
    const card = document.createElement('div');
    card.className = 'missing-item-card';

    card.innerHTML = `
      <div class="missing-header-row">
        <div class="missing-badges">
          <span class="badge-info badge-date" style="font-weight: 900; font-size: 0.82rem;">📅 ${item.date}</span>
          <span class="badge-info">Shift: ${item.shiftType} (${item.shiftCrew})</span>
          <span class="badge-info badge-hour">⏰ ${item.hourKey} - Line #${item.lineIdx + 1}</span>
          <span class="badge-info" style="background:#10b981; color:#fff; font-weight:800;">ACTIVE SHEET</span>
        </div>
      </div>
      <div class="missing-body-grid">
        <div>
          <div class="missing-field-label">Problem / Issue:</div>
          <div class="missing-field-val problem-val">⚠️ ${escapeHtml(item.problem)}</div>
        </div>
        <div>
          <div class="missing-field-label">Root Cause:</div>
          <div class="missing-field-val">${escapeHtml(item.rootCause || '—')}</div>
        </div>
      </div>
      <div class="missing-input-row">
        <input type="text" class="missing-input-action" placeholder="Enter Containment Action here..." value="${escapeHtml(item.issueRef.containmentAction || '')}">
        <button type="button" class="btn-save-inline">💾 Save Action</button>
      </div>
    `;

    const input = card.querySelector('.missing-input-action');
    const btnSave = card.querySelector('.btn-save-inline');

    btnSave.addEventListener('click', async () => {
      const val = input.value.trim();
      if (!val) {
        alert('Please enter a containment action.');
        return;
      }
      item.issueRef.containmentAction = val;
      state.hasUnsavedChanges = true;
      await saveTrackingSheet(false);
      renderTable();
      await fetchMissingActionsFromDB();
      renderCurrentSheetMissingActions();
    });

    listEl.appendChild(card);
  });
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Global cached taken actions
let dbTakenActionsCache = [];

// Fetch taken actions from MongoDB
async function fetchTakenActionsFromDB() {
  try {
    const res = await fetch('/api/taken-actions');
    const json = await res.json();
    if (json.success && Array.isArray(json.taken)) {
      dbTakenActionsCache = json.taken;
      updateTakenActionsBadge();
    }
  } catch (err) {
    console.error('Error fetching taken actions:', err);
  }
}

// Update the badge count for completed / taken actions
function updateTakenActionsBadge() {
  const badge = document.getElementById('takenActionsCount');
  if (badge) {
    badge.textContent = dbTakenActionsCache.length;
  }
}

// Populate the hour dropdown in Enter Data modal
function populateEnterDataHours(shiftType) {
  const select = document.getElementById('formHourSelect');
  if (!select) return;
  select.innerHTML = '';
  const template = SHIFT_TEMPLATES[shiftType] || SHIFT_TEMPLATES.DAY;
  template.forEach(item => {
    const opt = document.createElement('option');
    opt.value = item.hourKey;
    opt.textContent = item.hourKey;
    select.appendChild(opt);
  });
}

// Open the Enter Data Modal
function openEnterDataModal(preselectedHourKey = null) {
  const modal = document.getElementById('enterDataModal');
  if (!modal) return;

  const dateInput = document.getElementById('formDataDate');
  if (dateInput) {
    dateInput.value = state.date || getTodayDateString();
  }

  const formShiftDay = document.getElementById('formShiftDay');
  const formShiftNight = document.getElementById('formShiftNight');
  if (state.shiftType === 'NIGHT') {
    if (formShiftNight) formShiftNight.checked = true;
    populateEnterDataHours('NIGHT');
  } else {
    if (formShiftDay) formShiftDay.checked = true;
    populateEnterDataHours('DAY');
  }

  const hourSelect = document.getElementById('formHourSelect');
  if (hourSelect && preselectedHourKey) {
    hourSelect.value = preselectedHourKey;
  }

  // Pre-fill operator name from localStorage if available
  const nameInput = document.getElementById('formPersonName');
  if (nameInput) {
    let savedName = localStorage.getItem('savedOperatorName') || '';
    if (savedName.startsWith('Mr. ')) savedName = savedName.substring(4);
    nameInput.value = savedName;
  }

  const formProblem = document.getElementById('formProblem');
  if (formProblem) formProblem.value = '';
  const formRootCause = document.getElementById('formRootCause');
  if (formRootCause) formRootCause.value = '';
  const formContainmentAction = document.getElementById('formContainmentAction');
  if (formContainmentAction) formContainmentAction.value = '';
  const formDefectScrap = document.getElementById('formDefectScrap');
  if (formDefectScrap) formDefectScrap.value = '';
  const formPcNumber = document.getElementById('formPcNumber');
  if (formPcNumber) formPcNumber.value = '';

  modal.classList.add('open');
}

// Handle submission of Enter Data modal
async function handleEnterDataSubmit(e) {
  e.preventDefault();
  const nameInput = document.getElementById('formPersonName');
  const dateInput = document.getElementById('formDataDate');
  const hourSelect = document.getElementById('formHourSelect');
  const formProblem = document.getElementById('formProblem');
  const formRootCause = document.getElementById('formRootCause');
  const formContainmentAction = document.getElementById('formContainmentAction');
  const formDefectScrap = document.getElementById('formDefectScrap');
  const formPcNumber = document.getElementById('formPcNumber');

  const shiftRadio = document.querySelector('input[name="formShiftType"]:checked');
  const shiftType = shiftRadio ? shiftRadio.value : 'DAY';

  const rawName = (nameInput ? nameInput.value : '').trim();
  if (!rawName) {
    alert('Please enter your Name (e.g. Mr. Kamal).');
    if (nameInput) nameInput.focus();
    return;
  }

  const problem = (formProblem ? formProblem.value : '').trim();
  if (!problem) {
    alert('Please enter the Problem / Issue description.');
    if (formProblem) formProblem.focus();
    return;
  }

  const formattedName = formatMrName(rawName);
  localStorage.setItem('savedOperatorName', formattedName);

  const payload = {
    date: dateInput ? dateInput.value : state.date,
    shiftType: shiftType,
    hourKey: hourSelect ? hourSelect.value : '',
    problem: problem,
    rootCause: formRootCause ? formRootCause.value.trim() : '',
    containmentAction: formContainmentAction ? formContainmentAction.value.trim() : '',
    defectScrap: formDefectScrap ? formDefectScrap.value.trim() : '',
    pcNumber: formPcNumber ? formPcNumber.value.trim() : '',
    name: formattedName
  };

  const btnSubmit = document.getElementById('btnSubmitEnterData');
  if (btnSubmit) {
    btnSubmit.disabled = true;
    btnSubmit.textContent = 'Saving...';
  }

  try {
    const res = await fetch('/api/issue/entry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const json = await res.json();

    if (res.ok && json.success) {
      const modal = document.getElementById('enterDataModal');
      if (modal) modal.classList.remove('open');

      // If entered for currently active sheet, reload it
      if (payload.date === state.date && payload.shiftType === state.shiftType) {
        await loadTrackingSheet();
      }

      await fetchMissingActionsFromDB();
      await fetchTakenActionsFromDB();
    } else {
      alert('Error saving issue: ' + (json.error || 'Server error'));
    }
  } catch (err) {
    alert('Network error saving issue: ' + err.message);
  } finally {
    if (btnSubmit) {
      btnSubmit.disabled = false;
      btnSubmit.textContent = '💾 Submit Entry';
    }
  }
}

// Open Inline Action Modal (when user clicks "+ Cause" or "⚠️ + Enter Action" on the table)
function openInlineActionModal(hourKey, lineIdx) {
  const modal = document.getElementById('inlineActionModal');
  if (!modal) return;

  const hourData = (state.hours || []).find(h => h.hourKey === hourKey);
  if (!hourData || !hourData.issues || !hourData.issues[lineIdx]) return;

  const issue = hourData.issues[lineIdx];

  document.getElementById('inlineActionHourKey').value = hourKey;
  document.getElementById('inlineActionLineIdx').value = lineIdx;

  const dateBadge = document.getElementById('inlineActionDateBadge');
  if (dateBadge) dateBadge.textContent = '📅 ' + state.date;
  const hourBadge = document.getElementById('inlineActionHourBadge');
  if (hourBadge) hourBadge.textContent = '⏰ ' + hourKey + ' - Line #' + (Number(lineIdx) + 1);
  const authorBadge = document.getElementById('inlineActionAuthorBadge');
  if (authorBadge) authorBadge.textContent = '👤 ' + (issue.enteredBy ? formatMrName(issue.enteredBy) : 'Mr. Operator');

  const problemText = document.getElementById('inlineActionProblemText');
  if (problemText) problemText.textContent = issue.problem || '—';

  const nameInput = document.getElementById('inlineActionName');
  if (nameInput) {
    let savedName = localStorage.getItem('savedOperatorName') || '';
    if (savedName.startsWith('Mr. ')) savedName = savedName.substring(4);
    nameInput.value = savedName;
  }

  const rootCauseInput = document.getElementById('inlineActionRootCause');
  if (rootCauseInput) rootCauseInput.value = issue.rootCause || '';

  const containmentInput = document.getElementById('inlineActionContainment');
  if (containmentInput) {
    containmentInput.value = issue.containmentAction || '';
    containmentInput.focus();
  }

  modal.classList.add('open');
}

// Handle Inline Action Form Submit
async function handleInlineActionSubmit(e) {
  e.preventDefault();
  const hourKey = document.getElementById('inlineActionHourKey').value;
  const lineIdx = Number(document.getElementById('inlineActionLineIdx').value);
  const nameInput = document.getElementById('inlineActionName');
  const rootCauseInput = document.getElementById('inlineActionRootCause');
  const containmentInput = document.getElementById('inlineActionContainment');

  const rawName = (nameInput ? nameInput.value : '').trim();
  if (!rawName) {
    alert('Please enter your Name (e.g. Mr. Kamal).');
    if (nameInput) nameInput.focus();
    return;
  }

  const actionVal = (containmentInput ? containmentInput.value : '').trim();
  const rootVal = (rootCauseInput ? rootCauseInput.value : '').trim();

  if (!actionVal && !rootVal) {
    alert('Please enter Containment Action or Root Cause.');
    return;
  }

  const formattedName = formatMrName(rawName);
  localStorage.setItem('savedOperatorName', formattedName);

  const btnSave = document.getElementById('btnSaveInlineAction');
  if (btnSave) {
    btnSave.disabled = true;
    btnSave.textContent = 'Saving...';
  }

  try {
    const res = await fetch('/api/issue/update-action', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date: state.date,
        shiftType: state.shiftType,
        hourKey: hourKey,
        lineIdx: lineIdx,
        rootCause: rootVal,
        containmentAction: actionVal,
        name: formattedName
      })
    });

    const json = await res.json();
    if (res.ok && json.success) {
      const modal = document.getElementById('inlineActionModal');
      if (modal) modal.classList.remove('open');

      // Update in memory
      const hourData = (state.hours || []).find(h => h.hourKey === hourKey);
      if (hourData && hourData.issues && hourData.issues[lineIdx]) {
        if (rootVal) hourData.issues[lineIdx].rootCause = rootVal;
        if (actionVal) {
          hourData.issues[lineIdx].containmentAction = actionVal;
          hourData.issues[lineIdx].actionTakenBy = formattedName;
        }
      }

      renderTable();
      await fetchMissingActionsFromDB();
      await fetchTakenActionsFromDB();
    } else {
      alert('Error saving action: ' + (json.error || 'Server error'));
    }
  } catch (err) {
    alert('Network error saving action: ' + err.message);
  } finally {
    if (btnSave) {
      btnSave.disabled = false;
      btnSave.textContent = '💾 Save Action';
    }
  }
}

// Open Taken Actions Modal
async function openTakenActionsModal() {
  const modal = document.getElementById('takenActionsModal');
  if (!modal) return;
  modal.classList.add('open');

  const listEl = document.getElementById('takenActionsList');
  if (!listEl) return;
  listEl.innerHTML = '<p style="text-align: center; color: #94a3b8; padding: 30px;">Loading completed containment actions from MongoDB...</p>';

  try {
    const res = await fetch('/api/taken-actions');
    const json = await res.json();

    if (!json.success || !json.taken || json.taken.length === 0) {
      listEl.innerHTML = `
        <div style="text-align: center; padding: 40px 20px; color: #64748b;">
          <div style="font-size: 2.5rem; margin-bottom: 8px;">📋</div>
          <div style="font-weight: 800; font-size: 1.1rem;">No completed containment actions recorded yet.</div>
          <div style="color: #94a3b8; font-size: 0.85rem; margin-top: 4px;">Completed actions will appear here once containment actions are entered.</div>
        </div>
      `;
      return;
    }

    dbTakenActionsCache = json.taken;
    updateTakenActionsBadge();

    listEl.innerHTML = '';
    json.taken.forEach(item => {
      const isDay = item.shiftType === 'DAY';
      const shiftBadge = isDay ? '☀️ DAY' : '🌙 NIGHT';
      const isCurrent = (item.date === state.date && item.shiftType === state.shiftType);

      const card = document.createElement('div');
      card.className = 'taken-item-card';

      card.innerHTML = `
        <div class="missing-header-row">
          <div class="missing-badges">
            <span class="badge-info badge-date" style="font-weight: 900; font-size: 0.82rem;">📅 ${item.date}</span>
            <span class="badge-info">${shiftBadge} (Crew ${item.shiftCrew || 'A'})</span>
            <span class="badge-info badge-hour">⏰ ${item.hourKey} - Line #${item.lineIdx + 1}</span>
            ${isCurrent ? '<span class="badge-info" style="background:#10b981; color:#fff; font-weight:800;">ACTIVE SHEET</span>' : ''}
          </div>
          <div>
            ${!isCurrent ? '<button type="button" class="btn-jump-sheet" title="Open this sheet">🔍 Open Sheet</button>' : ''}
          </div>
        </div>
        <div class="missing-body-grid">
          <div>
            <div class="missing-field-label">Problem . Issue:</div>
            <div class="missing-field-val">${escapeHtml(item.problem)}</div>
            ${item.enteredBy ? `<div class="cell-author-tag" style="margin-top:4px;">👤 Logged by: ${escapeHtml(formatMrName(item.enteredBy))}</div>` : ''}
          </div>
          <div>
            <div class="missing-field-label">Root Cause:</div>
            <div class="missing-field-val">${escapeHtml(item.rootCause || '—')}</div>
          </div>
        </div>
        <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 6px; padding: 8px 12px;">
          <div class="missing-field-label" style="color: #047857;">Containment Action Taken:</div>
          <div style="font-size: 0.92rem; font-weight: 850; color: #065f46; word-break: break-word;">
            ✅ ${escapeHtml(item.containmentAction)}
          </div>
          ${item.actionTakenBy ? `<div class="cell-author-tag" style="color: #047857; margin-top: 4px;">👤 Action by: ${escapeHtml(formatMrName(item.actionTakenBy))}</div>` : ''}
        </div>
      `;

      const btnJump = card.querySelector('.btn-jump-sheet');
      if (btnJump) {
        btnJump.addEventListener('click', async () => {
          if (state.hasUnsavedChanges) await saveTrackingSheet(false);
          state.date = item.date;
          state.shiftType = item.shiftType;
          state.shiftCrew = item.shiftCrew || 'A';
          document.getElementById('sheetDate').value = state.date;

          const btnDay = document.getElementById('btnDayShift');
          const btnNight = document.getElementById('btnNightShift');
          if (state.shiftType === 'DAY') {
            btnDay.classList.add('active', 'day-shift');
            btnNight.classList.remove('active', 'night-shift');
          } else {
            btnNight.classList.add('active', 'night-shift');
            btnDay.classList.remove('active', 'day-shift');
          }

          modal.classList.remove('open');
          await loadTrackingSheet();
        });
      }

      listEl.appendChild(card);
    });
  } catch (err) {
    listEl.innerHTML = `<p style="text-align: center; color: #dc2626; padding: 20px;">Error: ${err.message}</p>`;
  }
}
