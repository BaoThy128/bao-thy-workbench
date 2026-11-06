(() => {
  'use strict';

  const STORAGE_KEY = 'bao-thy-planner-v1';
  const moodSymbols = { Bright: '☀', Okay: '◡', Tender: '♡', Tired: '☾', Heavy: '☁' };
  const moodNames = Object.keys(moodSymbols);
  const today = new Date();
  const dateKey = localDateKey(today);
  const byId = (id) => document.getElementById(id);

  function localDateKey(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function newId() {
    return window.crypto && typeof window.crypto.randomUUID === 'function'
      ? window.crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (character) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[character]));
  }

  function loadState() {
    const fallback = { tasks: [], goals: [], checkins: {}, notes: [], activeNoteId: null };
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (!saved || typeof saved !== 'object') return fallback;
      return {
        tasks: Array.isArray(saved.tasks) ? saved.tasks : [],
        goals: Array.isArray(saved.goals) ? saved.goals : [],
        checkins: saved.checkins && typeof saved.checkins === 'object' ? saved.checkins : {},
        notes: Array.isArray(saved.notes) ? saved.notes : [],
        activeNoteId: saved.activeNoteId || null
      };
    } catch (error) {
      return fallback;
    }
  }

  let state = loadState();
  let selectedMood = state.checkins[dateKey]?.mood || '';
  let taskFilter = 'all';

  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      return true;
    } catch (error) {
      const status = byId('note-saved-status');
      if (status) status.textContent = 'Could not save in this browser. Check storage settings.';
      return false;
    }
  }

  function formatDate(date, options = { weekday: 'long', month: 'long', day: 'numeric' }) {
    return new Intl.DateTimeFormat('en', options).format(date);
  }

  function formatDueDate(value) {
    if (!value) return '';
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    if (value === dateKey) return 'Today';
    return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(date);
  }

  function setView(view) {
    const validViews = ['today', 'tasks', 'goals', 'checkin', 'notes'];
    if (!validViews.includes(view)) view = 'today';
    document.querySelectorAll('[data-view-panel]').forEach((panel) => {
      const visible = panel.dataset.viewPanel === view;
      panel.hidden = !visible;
      panel.classList.toggle('is-visible', visible);
    });
    document.querySelectorAll('.nav-item[data-view]').forEach((button) => {
      button.classList.toggle('is-active', button.dataset.view === view);
      if (button.dataset.view === view) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    });
    if (view === 'notes') renderNotes();
    if (view === 'checkin') renderCheckin();
  }

  function taskRows(tasks, compact = false) {
    if (!tasks.length) return '';
    return tasks.map((task) => {
      const due = task.dueDate ? `<span class="task-meta">${escapeHtml(formatDueDate(task.dueDate))}</span>` : '';
      const priority = task.priority && task.priority !== 'gentle'
        ? `<span class="task-priority">${task.priority === 'today' ? 'Today' : 'Focus'}</span>` : '';
      return `<div class="task-row${task.done ? ' is-done' : ''}" data-task-row="${escapeHtml(task.id)}">
        <input class="task-check" type="checkbox" data-task-action="toggle" data-id="${escapeHtml(task.id)}" aria-label="Mark ${escapeHtml(task.title)} complete" ${task.done ? 'checked' : ''}>
        <div class="task-content"><div class="task-title">${escapeHtml(task.title)}${priority}</div>${due}</div>
        ${compact ? '' : `<button class="delete-button" type="button" data-task-action="delete" data-id="${escapeHtml(task.id)}" aria-label="Delete ${escapeHtml(task.title)}">×</button>`}
      </div>`;
    }).join('');
  }

  function renderTasks() {
    const list = byId('all-task-list');
    if (list) {
      const shown = state.tasks.filter((task) => taskFilter === 'all' || (taskFilter === 'done' ? task.done : !task.done));
      list.innerHTML = taskRows(shown);
      byId('tasks-empty').classList.toggle('is-visible', shown.length === 0);
      byId('tasks-total').textContent = String(state.tasks.length);
    }
    const todayList = byId('today-task-list');
    if (todayList) {
      const todayTasks = state.tasks.filter((task) => !task.done && (!task.dueDate || task.dueDate <= dateKey)).slice(0, 5);
      todayList.innerHTML = taskRows(todayTasks, true) || '<p class="muted-copy">Your list is clear for now. Enjoy the breathing room.</p>';
    }
    const openCount = state.tasks.filter((task) => !task.done).length;
    const doneToday = state.tasks.filter((task) => task.done && task.completedAt === dateKey).length;
    byId('today-open-count').textContent = String(openCount);
    byId('today-done-count').textContent = String(doneToday);
    byId('task-count').textContent = String(openCount);
  }

  function addTask(title, dueDate = '', priority = 'gentle') {
    const cleanTitle = title.trim();
    if (!cleanTitle) return;
    state.tasks.unshift({ id: newId(), title: cleanTitle, dueDate, priority, done: false, createdAt: Date.now(), completedAt: null });
    persist();
    renderTasks();
  }

  function addGoal(title) {
    const cleanTitle = title.trim();
    if (!cleanTitle) return;
    state.goals.unshift({ id: newId(), title: cleanTitle, steps: [], createdAt: Date.now() });
    persist();
    renderGoals();
  }

  function renderGoals() {
    const root = byId('goal-list');
    const empty = byId('goals-empty');
    root.innerHTML = state.goals.map((goal) => {
      const steps = Array.isArray(goal.steps) ? goal.steps : [];
      const completed = steps.filter((step) => step.done).length;
      const percent = steps.length ? Math.round((completed / steps.length) * 100) : 0;
      return `<article class="paper-card goal-card" data-goal="${escapeHtml(goal.id)}">
        <div class="goal-card-header"><div><h2>${escapeHtml(goal.title)}</h2><p class="goal-progress-label">${completed} of ${steps.length} steps · ${percent}%</p></div><button class="delete-button" type="button" data-goal-action="delete" data-id="${escapeHtml(goal.id)}" aria-label="Delete goal ${escapeHtml(goal.title)}">×</button></div>
        <div class="progress-track" role="progressbar" aria-label="${escapeHtml(goal.title)} progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${percent}"><div class="progress-fill" style="width:${percent}%"></div></div>
        <div class="goal-steps">${steps.map((step) => `<div class="goal-step${step.done ? ' is-done' : ''}"><input type="checkbox" data-goal-action="toggle-step" data-goal-id="${escapeHtml(goal.id)}" data-step-id="${escapeHtml(step.id)}" id="step-${escapeHtml(step.id)}" ${step.done ? 'checked' : ''}><label for="step-${escapeHtml(step.id)}">${escapeHtml(step.title)}</label><button class="step-delete" type="button" data-goal-action="delete-step" data-goal-id="${escapeHtml(goal.id)}" data-step-id="${escapeHtml(step.id)}" aria-label="Delete step">×</button></div>`).join('')}</div>
        <form class="add-step-form" data-goal-form="${escapeHtml(goal.id)}"><label class="sr-only" for="step-input-${escapeHtml(goal.id)}">Add a small step</label><input id="step-input-${escapeHtml(goal.id)}" maxlength="120" placeholder="Add a small step…" required><button type="submit">Add step</button></form>
      </article>`;
    }).join('');
    empty.classList.toggle('is-visible', state.goals.length === 0);
    byId('today-goal-count').textContent = String(state.goals.length);
    byId('today-goal-list').innerHTML = state.goals.slice(0, 4).map((goal) => {
      const steps = Array.isArray(goal.steps) ? goal.steps : [];
      const completed = steps.filter((step) => step.done).length;
      const percent = steps.length ? Math.round((completed / steps.length) * 100) : 0;
      return `<div class="mini-goal"><strong>${escapeHtml(goal.title)}</strong><div class="progress-track"><div class="progress-fill" style="width:${percent}%"></div></div><small>${completed} of ${steps.length} small steps</small></div>`;
    }).join('') || '<p class="muted-copy">Your goals will grow here, at your own pace.</p>';
  }

  function renderMoodSelections() {
    document.querySelectorAll('.mood-choice').forEach((button) => {
      button.classList.toggle('is-selected', button.dataset.mood === selectedMood);
      button.setAttribute('aria-pressed', button.dataset.mood === selectedMood ? 'true' : 'false');
    });
  }

  function renderCheckin() {
    const entry = state.checkins[dateKey];
    if (entry) {
      selectedMood = entry.mood || selectedMood;
      byId('checkin-note').value = entry.note || '';
      byId('today-checkin-note').value = entry.note || '';
    } else {
      byId('checkin-note').value = '';
      byId('today-checkin-note').value = '';
    }
    renderMoodSelections();
    const history = byId('checkin-history');
    const entries = Object.entries(state.checkins).sort(([a], [b]) => b.localeCompare(a)).slice(0, 10);
    history.innerHTML = entries.map(([date, item]) => {
      const [year, month, day] = date.split('-').map(Number);
      const label = new Intl.DateTimeFormat('en', { weekday: 'short', month: 'short', day: 'numeric' }).format(new Date(year, month - 1, day));
      return `<article class="checkin-entry"><time>${escapeHtml(label)}</time><span class="checkin-mood">${escapeHtml(moodSymbols[item.mood] || '♡')} ${escapeHtml(item.mood || 'Check-in')}</span><p>${escapeHtml(item.note || 'A quiet moment, saved.')}</p></article>`;
    }).join('');
    byId('checkins-empty').classList.toggle('is-visible', entries.length === 0);
  }

  function saveCheckin(note, feedbackId) {
    if (!selectedMood || !moodNames.includes(selectedMood)) {
      byId(feedbackId).textContent = 'Choose a feeling first.';
      return;
    }
    state.checkins[dateKey] = { mood: selectedMood, note: note.trim().slice(0, 500), updatedAt: Date.now() };
    persist();
    renderCheckin();
    byId(feedbackId).textContent = 'Saved for today.';
    window.setTimeout(() => { byId(feedbackId).textContent = ''; }, 2400);
  }

  function renderNotes() {
    if (!state.notes.length) state.activeNoteId = null;
    if (state.activeNoteId && !state.notes.some((note) => note.id === state.activeNoteId)) {
      state.activeNoteId = state.notes[0]?.id || null;
    }
    const active = state.notes.find((note) => note.id === state.activeNoteId);
    byId('notes-list').innerHTML = state.notes.map((note) => {
      const date = new Date(note.updatedAt || note.createdAt || Date.now());
      return `<button class="note-select${note.id === state.activeNoteId ? ' is-active' : ''}" type="button" data-note-id="${escapeHtml(note.id)}"><strong>${escapeHtml(note.title || 'Untitled note')}</strong><small>${escapeHtml(formatDate(date, { month: 'short', day: 'numeric' }))}</small></button>`;
    }).join('');
    byId('notes-empty').classList.toggle('is-visible', state.notes.length === 0);
    byId('note-title').value = active?.title || '';
    byId('note-body').value = active?.body || '';
    byId('delete-note').disabled = !active;
    byId('note-saved-status').textContent = active ? 'Saved in this browser' : 'Create a note to get started';
  }

  function createNote() {
    const note = { id: newId(), title: '', body: '', createdAt: Date.now(), updatedAt: Date.now() };
    state.notes.unshift(note);
    state.activeNoteId = note.id;
    persist();
    renderNotes();
    byId('note-title').focus();
  }

  function updateActiveNote(field, value) {
    const note = state.notes.find((item) => item.id === state.activeNoteId);
    if (!note) return;
    note[field] = value;
    note.updatedAt = Date.now();
    persist();
    byId('note-saved-status').textContent = 'Saved just now';
    renderNotesListOnly();
  }

  function renderNotesListOnly() {
    const activeId = state.activeNoteId;
    byId('notes-list').innerHTML = state.notes.map((note) => {
      const date = new Date(note.updatedAt || note.createdAt || Date.now());
      return `<button class="note-select${note.id === activeId ? ' is-active' : ''}" type="button" data-note-id="${escapeHtml(note.id)}"><strong>${escapeHtml(note.title || 'Untitled note')}</strong><small>${escapeHtml(formatDate(date, { month: 'short', day: 'numeric' }))}</small></button>`;
    }).join('');
    byId('notes-empty').classList.toggle('is-visible', state.notes.length === 0);
  }

  function handleTaskAction(event) {
    const control = event.target.closest('[data-task-action]');
    if (!control) return;
    const task = state.tasks.find((item) => item.id === control.dataset.id);
    if (!task) return;
    if (control.dataset.taskAction === 'toggle') {
      task.done = control.checked;
      task.completedAt = task.done ? dateKey : null;
    } else if (control.dataset.taskAction === 'delete') {
      state.tasks = state.tasks.filter((item) => item.id !== task.id);
    }
    persist();
    renderTasks();
  }

  document.querySelectorAll('.nav-item[data-view]').forEach((button) => {
    button.addEventListener('click', () => setView(button.dataset.view));
  });
  document.querySelectorAll('[data-go-view]').forEach((button) => {
    button.addEventListener('click', () => setView(button.dataset.goView));
  });
  document.querySelectorAll('[data-task-filter]').forEach((button) => {
    button.addEventListener('click', () => {
      taskFilter = button.dataset.taskFilter;
      document.querySelectorAll('[data-task-filter]').forEach((item) => item.classList.toggle('is-selected', item === button));
      renderTasks();
    });
  });

  byId('task-form').addEventListener('submit', (event) => {
    event.preventDefault();
    addTask(byId('task-title').value, byId('task-date').value, byId('task-priority').value);
    byId('task-form').reset();
    byId('task-title').focus();
  });
  byId('quick-task-form').addEventListener('submit', (event) => {
    event.preventDefault();
    addTask(byId('quick-task-title').value);
    byId('quick-task-form').reset();
  });
  byId('all-task-list').addEventListener('click', handleTaskAction);
  byId('all-task-list').addEventListener('change', handleTaskAction);
  byId('today-task-list').addEventListener('change', handleTaskAction);
  byId('today-task-list').addEventListener('click', handleTaskAction);

  byId('goal-form').addEventListener('submit', (event) => {
    event.preventDefault();
    addGoal(byId('goal-title').value);
    byId('goal-form').reset();
    byId('goal-title').focus();
  });
  byId('goal-list').addEventListener('submit', (event) => {
    const form = event.target.closest('[data-goal-form]');
    if (!form) return;
    event.preventDefault();
    const goal = state.goals.find((item) => item.id === form.dataset.goalForm);
    const input = form.querySelector('input');
    if (!goal || !input.value.trim()) return;
    goal.steps.push({ id: newId(), title: input.value.trim(), done: false });
    persist();
    renderGoals();
  });
  byId('goal-list').addEventListener('click', (event) => {
    const button = event.target.closest('[data-goal-action]');
    if (!button) return;
    const goal = state.goals.find((item) => item.id === button.dataset.id || item.id === button.dataset.goalId);
    if (!goal) return;
    if (button.dataset.goalAction === 'delete') state.goals = state.goals.filter((item) => item.id !== goal.id);
    if (button.dataset.goalAction === 'delete-step') goal.steps = goal.steps.filter((step) => step.id !== button.dataset.stepId);
    persist();
    renderGoals();
  });
  byId('goal-list').addEventListener('change', (event) => {
    const input = event.target.closest('[data-goal-action="toggle-step"]');
    if (!input) return;
    const goal = state.goals.find((item) => item.id === input.dataset.goalId);
    const step = goal?.steps.find((item) => item.id === input.dataset.stepId);
    if (!step) return;
    step.done = input.checked;
    persist();
    renderGoals();
  });

  document.querySelectorAll('.mood-choice').forEach((button) => {
    button.addEventListener('click', () => {
      selectedMood = button.dataset.mood;
      renderMoodSelections();
    });
  });
  byId('save-checkin').addEventListener('click', () => saveCheckin(byId('checkin-note').value, 'checkin-feedback'));
  byId('save-today-checkin').addEventListener('click', () => saveCheckin(byId('today-checkin-note').value, 'today-checkin-feedback'));

  byId('new-note').addEventListener('click', createNote);
  byId('notes-list').addEventListener('click', (event) => {
    const button = event.target.closest('[data-note-id]');
    if (!button) return;
    state.activeNoteId = button.dataset.noteId;
    persist();
    renderNotes();
  });
  byId('note-title').addEventListener('input', (event) => updateActiveNote('title', event.target.value));
  byId('note-body').addEventListener('input', (event) => updateActiveNote('body', event.target.value));
  byId('delete-note').addEventListener('click', () => {
    if (!state.activeNoteId) return;
    state.notes = state.notes.filter((note) => note.id !== state.activeNoteId);
    state.activeNoteId = state.notes[0]?.id || null;
    persist();
    renderNotes();
  });

  byId('today-date').textContent = formatDate(today);
  byId('checkin-date-label').textContent = formatDate(today);
  renderTasks();
  renderGoals();
  renderCheckin();
  renderNotes();
  const initialView = window.location.hash.replace('#', '');
  setView(initialView || 'today');
})();

