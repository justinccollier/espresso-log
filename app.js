(() => {
  'use strict';

  /* =========================================================
     STORAGE
  ========================================================= */
  const STORAGE_KEYS = { roasts: 'extract_roasts_v1', shots: 'extract_shots_v1' };

  function loadRoasts() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEYS.roasts)) || []; }
    catch (e) { return []; }
  }
  function saveRoasts(roasts) {
    localStorage.setItem(STORAGE_KEYS.roasts, JSON.stringify(roasts));
  }
  function loadShots() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEYS.shots)) || []; }
    catch (e) { return []; }
  }
  function saveShots(shots) {
    localStorage.setItem(STORAGE_KEYS.shots, JSON.stringify(shots));
  }

  let roasts = loadRoasts();
  let shots = loadShots();

  let selectedRoastId = roasts[0] ? roasts[0].id : null;
  let pendingEntry = null; // holds form values while timer/notes flow is in progress

  /* =========================================================
     ELEMENT REFS
  ========================================================= */
  const $ = (id) => document.getElementById(id);

  const dateInput = $('dateInput');
  const coffeeSelect = $('coffeeSelect');
  const roastMeta = $('roastMeta');
  const grindSlider = $('grindSlider');
  const grindValue = $('grindValue');
  const grindDec = $('grindDec');
  const grindInc = $('grindInc');
  const doseInput = $('doseInput');
  const doseDec = $('doseDec');
  const doseInc = $('doseInc');
  const shotSegment = $('shotSegment');
  const beginBtn = $('beginBtn');
  const formError = $('formError');

  const timerDisplay = $('timerDisplay');
  const timerSub = $('timerSub');
  const startStopBtn = $('startStopBtn');
  const abortBtn = $('abortBtn');

  const resultTime = $('resultTime');
  const yieldInput = $('yieldInput');
  const yieldDec = $('yieldDec');
  const yieldInc = $('yieldInc');
  const ratioReadout = $('ratioReadout');
  const notesInput = $('notesInput');
  const skipNotesBtn = $('skipNotesBtn');
  const saveNotesBtn = $('saveNotesBtn');

  const logList = $('logList');
  const logCount = $('logCount');
  const exportCsvBtn = $('exportCsvBtn');
  const exportJsonBtn = $('exportJsonBtn');
  const importJsonBtn = $('importJsonBtn');
  const importFileInput = $('importFileInput');

  const modalOverlay = $('modalOverlay');
  const modalTitle = $('modalTitle');
  const newRoastName = $('newRoastName');
  const newRoastRoaster = $('newRoastRoaster');
  const modalError = $('modalError');
  const saveRoastBtn = $('saveRoastBtn');
  const cancelRoastBtn = $('cancelRoastBtn');

  const bottomNav = $('bottomNav');
  const navNew = $('navNew');
  const navLog = $('navLog');
  const navRoasts = $('navRoasts');
  const roastsList = $('roastsList');
  const roastCount = $('roastCount');
  const addRoastBtn = $('addRoastBtn');

  let shotType = 'Single';
  let grind = 5.0;

  /* =========================================================
     SCREEN NAVIGATION
  ========================================================= */
  function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    $(id).classList.add('active');
    const showNav = (id === 'screen-new' || id === 'screen-log' || id === 'screen-roasts');
    bottomNav.classList.toggle('hidden', !showNav);
    if (showNav) {
      navNew.classList.toggle('active', id === 'screen-new');
      navLog.classList.toggle('active', id === 'screen-log');
      navRoasts.classList.toggle('active', id === 'screen-roasts');
    }
    if (id === 'screen-log') renderLog();
    if (id === 'screen-roasts') renderRoastsList();
  }

  navNew.addEventListener('click', () => showScreen('screen-new'));
  navLog.addEventListener('click', () => showScreen('screen-log'));
  navRoasts.addEventListener('click', () => showScreen('screen-roasts'));

  /* =========================================================
     INIT FORM DEFAULTS
  ========================================================= */
  function todayISO() {
    const d = new Date();
    const off = d.getTimezoneOffset();
    const local = new Date(d.getTime() - off * 60000);
    return local.toISOString().slice(0, 10);
  }
  function resetDate() { dateInput.value = todayISO(); }
  resetDate();

  /* =========================================================
     COFFEE / ROASTS
  ========================================================= */
  function renderRoastSelect() {
    coffeeSelect.innerHTML = '';
    if (roasts.length === 0) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.disabled = true;
      opt.selected = true;
      opt.textContent = 'No roasts yet — add one below';
      coffeeSelect.appendChild(opt);
    } else {
      roasts.forEach(r => {
        const opt = document.createElement('option');
        opt.value = r.id;
        opt.textContent = r.name;
        if (r.id === selectedRoastId) opt.selected = true;
        coffeeSelect.appendChild(opt);
      });
    }
    const addOpt = document.createElement('option');
    addOpt.value = '__add__';
    addOpt.textContent = '+ ADD NEW ROAST';
    coffeeSelect.appendChild(addOpt);
    updateRoastMeta();
  }

  function updateRoastMeta() {
    const r = roasts.find(r => r.id === selectedRoastId);
    roastMeta.textContent = r ? `Roaster — ${r.roaster || 'Unspecified'}` : '';
  }

  coffeeSelect.addEventListener('change', () => {
    if (coffeeSelect.value === '__add__') {
      openRoastModal();
      renderRoastSelect(); // revert visible selection until modal saved
      return;
    }
    selectedRoastId = coffeeSelect.value;
    updateRoastMeta();
  });

  let editingRoastId = null;

  function openRoastModal(editId) {
    editingRoastId = editId || null;
    if (editingRoastId) {
      const r = roasts.find(r => r.id === editingRoastId);
      modalTitle.textContent = 'Edit Roast';
      saveRoastBtn.textContent = 'SAVE CHANGES';
      newRoastName.value = r ? r.name : '';
      newRoastRoaster.value = r ? r.roaster : '';
    } else {
      modalTitle.textContent = 'Add Roast';
      saveRoastBtn.textContent = 'SAVE ROAST';
      newRoastName.value = '';
      newRoastRoaster.value = '';
    }
    modalError.textContent = '';
    modalOverlay.classList.add('active');
    setTimeout(() => newRoastName.focus(), 50);
  }
  function closeRoastModal() { modalOverlay.classList.remove('active'); editingRoastId = null; }

  cancelRoastBtn.addEventListener('click', closeRoastModal);
  modalOverlay.addEventListener('click', (e) => { if (e.target === modalOverlay) closeRoastModal(); });

  saveRoastBtn.addEventListener('click', () => {
    const name = newRoastName.value.trim();
    const roaster = newRoastRoaster.value.trim();
    if (!name) { modalError.textContent = 'ROAST NAME REQUIRED'; return; }

    if (editingRoastId) {
      const r = roasts.find(r => r.id === editingRoastId);
      if (r) { r.name = name; r.roaster = roaster; }
      saveRoasts(roasts);
      renderRoastSelect();
      renderRoastsList();
    } else {
      const roast = { id: 'r_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), name, roaster };
      roasts.push(roast);
      saveRoasts(roasts);
      selectedRoastId = roast.id;
      renderRoastSelect();
      renderRoastsList();
    }
    closeRoastModal();
  });

  addRoastBtn.addEventListener('click', () => openRoastModal());

  function renderRoastsList() {
    roastCount.textContent = String(roasts.length);
    roastsList.innerHTML = '';
    if (roasts.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'log-empty';
      empty.textContent = 'NO ROASTS YET — ADD ONE ABOVE';
      roastsList.appendChild(empty);
      return;
    }
    roasts.forEach(r => {
      const card = document.createElement('div');
      card.className = 'roast-card';
      card.innerHTML = `
        <div class="roast-card-info">
          <div class="roast-card-name">${escapeHtml(r.name)}</div>
          <div class="roast-card-roaster">${escapeHtml(r.roaster || 'Unspecified roaster')}</div>
        </div>
        <div class="roast-card-actions">
          <button class="roast-action-btn" data-action="edit" data-id="${r.id}">EDIT</button>
          <button class="roast-action-btn danger" data-action="delete" data-id="${r.id}">DELETE</button>
        </div>
      `;
      roastsList.appendChild(card);
    });
  }

  roastsList.addEventListener('click', (e) => {
    const btn = e.target.closest('.roast-action-btn');
    if (!btn) return;
    const id = btn.dataset.id;
    if (btn.dataset.action === 'edit') {
      openRoastModal(id);
    } else if (btn.dataset.action === 'delete') {
      const r = roasts.find(r => r.id === id);
      const usedCount = shots.filter(s => s.coffeeId === id).length;
      const warning = usedCount > 0
        ? ` It is referenced by ${usedCount} existing log ${usedCount === 1 ? 'entry' : 'entries'} — those entries will keep their recorded values.`
        : '';
      if (confirm(`Delete "${r ? r.name : 'this roast'}"?${warning}`)) {
        roasts = roasts.filter(r => r.id !== id);
        saveRoasts(roasts);
        if (selectedRoastId === id) selectedRoastId = roasts[0] ? roasts[0].id : null;
        renderRoastSelect();
        renderRoastsList();
      }
    }
  });

  /* =========================================================
     GRIND SIZE
  ========================================================= */
  function setGrind(val) {
    val = Math.min(10, Math.max(1, Math.round(val * 2) / 2));
    grind = val;
    grindSlider.value = val;
    grindValue.textContent = val.toFixed(1);
  }
  grindSlider.addEventListener('input', () => setGrind(parseFloat(grindSlider.value)));
  grindDec.addEventListener('click', () => setGrind(grind - 0.5));
  grindInc.addEventListener('click', () => setGrind(grind + 0.5));
  setGrind(5);

  /* =========================================================
     DOSE
  ========================================================= */
  function setDose(val) {
    val = Math.max(0, Math.round(val * 10) / 10);
    doseInput.value = val.toFixed(1);
  }
  doseDec.addEventListener('click', () => setDose(parseFloat(doseInput.value || 0) - 0.5));
  doseInc.addEventListener('click', () => setDose(parseFloat(doseInput.value || 0) + 0.5));
  doseInput.addEventListener('blur', () => setDose(parseFloat(doseInput.value || 0)));

  /* =========================================================
     YIELD (post-shot)
  ========================================================= */
  function updateRatio() {
    const dose = pendingEntry ? pendingEntry.dose : 0;
    const y = parseFloat(yieldInput.value) || 0;
    ratioReadout.textContent = (dose > 0 && y > 0) ? `RATIO 1 : ${(y / dose).toFixed(1)}` : 'RATIO —';
  }
  function setYield(val) {
    val = Math.max(0, Math.round(val * 10) / 10);
    yieldInput.value = val.toFixed(1);
    updateRatio();
  }
  yieldDec.addEventListener('click', () => setYield(parseFloat(yieldInput.value || 0) - 0.5));
  yieldInc.addEventListener('click', () => setYield(parseFloat(yieldInput.value || 0) + 0.5));
  yieldInput.addEventListener('input', updateRatio);
  yieldInput.addEventListener('blur', () => setYield(parseFloat(yieldInput.value || 0)));

  /* =========================================================
     SHOT TYPE (segmented control)
  ========================================================= */
  shotSegment.addEventListener('click', (e) => {
    const btn = e.target.closest('.seg-btn');
    if (!btn) return;
    shotSegment.querySelectorAll('.seg-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    shotType = btn.dataset.value;
  });

  /* =========================================================
     BEGIN EXTRACTION -> TIMER
  ========================================================= */
  beginBtn.addEventListener('click', () => {
    formError.textContent = '';
    if (!selectedRoastId || !roasts.find(r => r.id === selectedRoastId)) {
      formError.textContent = 'SELECT OR ADD A COFFEE ROAST TO CONTINUE';
      return;
    }
    const dose = parseFloat(doseInput.value);
    if (!dose || dose <= 0) {
      formError.textContent = 'ENTER A VALID DOSE';
      return;
    }
    const roast = roasts.find(r => r.id === selectedRoastId);
    pendingEntry = {
      date: dateInput.value || todayISO(),
      coffeeId: roast.id,
      coffeeName: roast.name,
      roaster: roast.roaster,
      grind: grind,
      dose: dose,
      shotType: shotType
    };
    resetTimerUI();
    showScreen('screen-timer');
  });

  /* =========================================================
     TIMER
  ========================================================= */
  let timerRunning = false;
  let timerStart = 0;
  let elapsedMs = 0;
  let rafId = null;

  function formatTime(ms) {
    const totalTenths = Math.floor(ms / 100);
    const tenths = totalTenths % 10;
    const totalSeconds = Math.floor(totalTenths / 10);
    const seconds = totalSeconds % 60;
    const minutes = Math.floor(totalSeconds / 60);
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${tenths}`;
  }

  function resetTimerUI() {
    timerRunning = false;
    elapsedMs = 0;
    timerDisplay.textContent = '00:00.0';
    timerSub.textContent = 'STANDBY';
    startStopBtn.textContent = 'START';
    startStopBtn.classList.remove('running');
    if (rafId) cancelAnimationFrame(rafId);
  }

  function tick() {
    elapsedMs = performance.now() - timerStart;
    timerDisplay.textContent = formatTime(elapsedMs);
    rafId = requestAnimationFrame(tick);
  }

  startStopBtn.addEventListener('click', () => {
    if (!timerRunning) {
      timerRunning = true;
      timerStart = performance.now() - elapsedMs;
      timerSub.textContent = 'EXTRACTING';
      startStopBtn.textContent = 'STOP';
      startStopBtn.classList.add('running');
      rafId = requestAnimationFrame(tick);
    } else {
      timerRunning = false;
      cancelAnimationFrame(rafId);
      timerSub.textContent = 'COMPLETE';
      const finalSeconds = Math.round(elapsedMs / 100) / 10;
      pendingEntry.extractionTime = finalSeconds;
      resultTime.textContent = formatTime(elapsedMs);
      setYield(Math.round(pendingEntry.dose * 2 * 10) / 10);
      notesInput.value = '';
      showScreen('screen-notes');
    }
  });

  abortBtn.addEventListener('click', () => {
    if (rafId) cancelAnimationFrame(rafId);
    pendingEntry = null;
    showScreen('screen-new');
  });

  /* =========================================================
     NOTES -> SAVE ENTRY
  ========================================================= */
  function commitEntry(notes) {
    if (!pendingEntry) { showScreen('screen-new'); return; }
    const entry = Object.assign({}, pendingEntry, {
      id: 's_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      createdAt: Date.now(),
      yield: parseFloat(yieldInput.value) || 0,
      notes: notes || ''
    });
    shots.push(entry);
    saveShots(shots);
    pendingEntry = null;
    resetDate();
    showScreen('screen-new');
  }

  skipNotesBtn.addEventListener('click', () => commitEntry(''));
  saveNotesBtn.addEventListener('click', () => commitEntry(notesInput.value.trim()));

  /* =========================================================
     LOG
  ========================================================= */
  function fmtDate(iso) {
    const [y, m, d] = iso.split('-');
    return `${m}/${d}/${y.slice(2)}`;
  }

  function renderLog() {
    const sorted = [...shots].sort((a, b) => b.createdAt - a.createdAt);
    logCount.textContent = `${sorted.length} ENTR${sorted.length === 1 ? 'Y' : 'IES'}`;
    logList.innerHTML = '';
    if (sorted.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'log-empty';
      empty.textContent = 'NO ENTRIES YET — RECORD YOUR FIRST SHOT';
      logList.appendChild(empty);
      return;
    }
    sorted.forEach(s => {
      const card = document.createElement('div');
      card.className = 'log-card';
      card.innerHTML = `
        <button class="log-delete" data-id="${s.id}" aria-label="Delete entry">&times;</button>
        <div class="log-card-top">
          <span class="log-date">${fmtDate(s.date)}</span>
          <span class="log-time">${s.extractionTime.toFixed(1)}s</span>
        </div>
        <div class="log-coffee">${escapeHtml(s.coffeeName)}</div>
        <div class="log-roaster">${escapeHtml(s.roaster || 'Unspecified roaster')}</div>
        <div class="log-stats">
          <span>GRIND <b>${s.grind.toFixed(1)}</b></span>
          <span>DOSE <b>${s.dose.toFixed(1)}g</b></span>
          <span>YIELD <b>${(s.yield || 0).toFixed(1)}g</b></span>
          <span>SHOT <b>${s.shotType.toUpperCase()}</b></span>
        </div>
        <div class="log-stats">
          <span>RATIO <b>1 : ${s.dose > 0 ? (s.yield / s.dose).toFixed(1) : '—'}</b></span>
        </div>
        ${s.notes ? `<div class="log-notes">${escapeHtml(s.notes)}</div>` : ''}
      `;
      logList.appendChild(card);
    });
  }

  logList.addEventListener('click', (e) => {
    const btn = e.target.closest('.log-delete');
    if (!btn) return;
    const id = btn.dataset.id;
    if (confirm('Delete this log entry? This cannot be undone.')) {
      shots = shots.filter(s => s.id !== id);
      saveShots(shots);
      renderLog();
    }
  });

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  /* =========================================================
     CSV EXPORT
  ========================================================= */
  function csvEscape(val) {
    const s = String(val ?? '');
    if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  }

  exportCsvBtn.addEventListener('click', () => {
    const header = ['Date', 'Coffee', 'Roaster', 'Grind Size', 'Dose (g)', 'Yield (g)', 'Ratio', 'Shot Type', 'Extraction Time (s)', 'Notes'];
    const rows = [...shots].sort((a, b) => a.createdAt - b.createdAt).map(s => [
      s.date, s.coffeeName, s.roaster, s.grind, s.dose, s.yield || 0,
      s.dose > 0 ? `1:${(s.yield / s.dose).toFixed(1)}` : '', s.shotType, s.extractionTime, s.notes
    ]);
    const csv = [header, ...rows].map(r => r.map(csvEscape).join(',')).join('\n');
    downloadFile(csv, `extract-log-${todayISO()}.csv`, 'text/csv');
  });

  function downloadFile(content, filename, mime) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /* =========================================================
     JSON BACKUP / RESTORE
  ========================================================= */
  exportJsonBtn.addEventListener('click', () => {
    const payload = JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), roasts, shots }, null, 2);
    downloadFile(payload, `extract-backup-${todayISO()}.json`, 'application/json');
  });

  importJsonBtn.addEventListener('click', () => importFileInput.click());

  importFileInput.addEventListener('change', () => {
    const file = importFileInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (!Array.isArray(data.roasts) || !Array.isArray(data.shots)) throw new Error('bad shape');
        if (!confirm('This will replace your current log and roasts with the imported backup. Continue?')) return;
        roasts = data.roasts;
        shots = data.shots;
        saveRoasts(roasts);
        saveShots(shots);
        selectedRoastId = roasts[0] ? roasts[0].id : null;
        renderRoastSelect();
        renderLog();
        alert('Backup restored.');
      } catch (e) {
        alert('Could not read this file — it does not look like a valid EXTRACT backup.');
      }
    };
    reader.readAsText(file);
    importFileInput.value = '';
  });

  /* =========================================================
     INITIAL RENDER
  ========================================================= */
  renderRoastSelect();
  showScreen('screen-new');

})();
