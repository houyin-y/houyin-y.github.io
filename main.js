/* ==========================================================================
   Paper Craft Weekly Timetable — application logic
   ========================================================================== */

// --- APP STATE & CONSTANTS ---
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const CATEGORY_ICONS = Object.freeze({
  Class: '📚',
  Study: '✏️',
  Work: '💼',
  Fitness: '🏋️',
  Personal: '🌿'
});

const VALID_CATEGORIES = Object.keys(CATEGORY_ICONS);
const STICKY_COLORS = Object.freeze(['yellow', 'pink', 'blue', 'mint', 'purple', 'orange']);
const STORAGE_KEY = 'paper_timetable_events';

// First-run example notes. These objects are frozen and cloned before use so
// moving or editing a note can never mutate the originals.
const DEFAULT_EVENTS = Object.freeze([
  Object.freeze({ id: 'def-1', title: 'Calculus II', day: 0, startHour: 9, duration: 2, color: 'yellow', category: 'Class' }),
  Object.freeze({ id: 'def-2', title: 'Morning Gym', day: 1, startHour: 7, duration: 1, color: 'mint', category: 'Fitness' }),
  Object.freeze({ id: 'def-3', title: 'Physics Lab', day: 2, startHour: 13, duration: 3, color: 'blue', category: 'Class' }),
  Object.freeze({ id: 'def-4', title: 'Study Group', day: 3, startHour: 15, duration: 2, color: 'purple', category: 'Study' }),
  Object.freeze({ id: 'def-5', title: 'Part-time Shift', day: 4, startHour: 11, duration: 4, color: 'orange', category: 'Work' }),
  Object.freeze({ id: 'def-6', title: 'Coffee & Reading', day: 5, startHour: 10, duration: 2, color: 'pink', category: 'Personal' }),
  Object.freeze({ id: 'def-7', title: 'Unassigned Task', day: null, startHour: null, duration: 1, color: 'yellow', category: 'Study' })
]);

// --- MUTABLE STATE ---
let events = [];
let draggedEventId = null;
let forceLayoutMode = 'AUTO'; // 'AUTO', 'DESKTOP', 'MOBILE'
let lastFocusedElement = null;
let toastTimer = null;
let pointerDrag = null;
let resizeFrame = null;
let dragStartTimer = null;
let dragSourceNote = null;

// --- DOM ELEMENTS ---
const gridContainer = document.getElementById('gridContainer');
const scratchpadArea = document.getElementById('scratchpadArea');
const scratchCount = document.getElementById('scratchCount');
const createForm = document.getElementById('createNoteForm');
const noteTitleInput = document.getElementById('noteTitle');
const noteDaySelect = document.getElementById('noteDay');
const noteStartSelect = document.getElementById('noteStart');
const noteDurationSelect = document.getElementById('noteDuration');
const noteCategorySelect = document.getElementById('noteCategory');
const categoryFilter = document.getElementById('categoryFilter');
const toggleLayoutBtn = document.getElementById('toggleLayoutBtn');
const layoutToggleLabel = document.getElementById('layoutToggleLabel');
const clearAllBtn = document.getElementById('clearAllBtn');
const printBtn = document.getElementById('printBtn');
const trashZone = document.getElementById('trashZone');
const toast = document.getElementById('toast');

// Edit modal elements
const editModal = document.getElementById('editModal');
const editNoteId = document.getElementById('editNoteId');
const editNoteTitle = document.getElementById('editNoteTitle');
const editNoteCategory = document.getElementById('editNoteCategory');
const editNoteColor = document.getElementById('editNoteColor');
const editNoteDay = document.getElementById('editNoteDay');
const editNoteStart = document.getElementById('editNoteStart');
const editNoteDuration = document.getElementById('editNoteDuration');
const saveEditBtn = document.getElementById('saveEditBtn');
const cancelEditBtn = document.getElementById('cancelEditBtn');
const deleteNoteBtn = document.getElementById('deleteNoteBtn');

// --- INIT ---
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init, { once: true });
} else {
  init();
}

function init() {
  populateHourOptions(noteStartSelect);
  populateHourOptions(editNoteStart);
  loadEventsFromStorage();
  applyLayoutMode();
  renderGridHeadersAndCells();
  renderAll();
  setupEventListeners();
  highlightCurrentDay();
}

function populateHourOptions(select) {
  if (!select) return;

  select.replaceChildren();
  for (let hour = 0; hour < 24; hour += 1) {
    const option = document.createElement('option');
    option.value = String(hour);
    option.textContent = `${padHour(hour)}:00`;
    if (hour === 9) option.selected = true;
    select.appendChild(option);
  }
}

// --- SMALL HELPERS ---
function padHour(hour) {
  return String(hour).padStart(2, '0');
}

function isUnassigned(evt) {
  return evt.day === null || evt.day === undefined;
}

function generateId() {
  if (window.crypto && typeof window.crypto.randomUUID === 'function') {
    return window.crypto.randomUUID();
  }
  return `evt-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function cloneDefaults() {
  return DEFAULT_EVENTS.map(evt => ({ ...evt }));
}

// --- LOCAL STORAGE HANDLING ---
function isValidStoredEvent(evt) {
  if (!evt || typeof evt !== 'object' || Array.isArray(evt)) return false;
  if (typeof evt.id !== 'string' || !evt.id.trim()) return false;
  if (typeof evt.title !== 'string' || !evt.title.trim()) return false;
  if (!STICKY_COLORS.includes(evt.color)) return false;
  if (!VALID_CATEGORIES.includes(evt.category)) return false;
  if (!Number.isInteger(evt.duration) || evt.duration < 1 || evt.duration > 4) return false;

  if (evt.day === null) {
    return evt.startHour === null;
  }

  return Number.isInteger(evt.day) && evt.day >= 0 && evt.day <= 6
    && Number.isInteger(evt.startHour) && evt.startHour >= 0 && evt.startHour <= 23
    && evt.startHour + evt.duration <= 24;
}

function loadEventsFromStorage() {
  let raw = null;

  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch (error) {
    console.warn('Could not read local storage.', error);
  }

  if (raw !== null) {
    try {
      const parsed = JSON.parse(raw);

      if (Array.isArray(parsed)) {
        let needsSave = false;
        const seenIds = new Set();
        const validEvents = [];

        parsed.forEach(candidate => {
          if (!isValidStoredEvent(candidate)) {
            needsSave = true;
            return;
          }

          const id = seenIds.has(candidate.id) ? generateId() : candidate.id;
          if (id !== candidate.id) needsSave = true;
          seenIds.add(id);

          validEvents.push({
            id,
            title: candidate.title.trim(),
            day: candidate.day,
            startHour: candidate.startHour,
            duration: candidate.duration,
            color: candidate.color,
            category: candidate.category
          });
        });

        // Keep an intentionally empty board, but replace data that is entirely invalid.
        if (parsed.length === 0 || validEvents.length > 0) {
          events = validEvents;
          if (needsSave) saveEventsToStorage();
          return;
        }
      }
    } catch (error) {
      console.warn('Saved timetable data was invalid; loading example notes instead.', error);
    }
  }

  events = cloneDefaults();
  saveEventsToStorage();
}

function saveEventsToStorage() {
  let saved = true;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  } catch (error) {
    saved = false;
    console.warn('Could not save timetable data.', error);
    showToast('Your changes could not be saved in this browser. They may be lost on reload.', 'error');
  }

  updateScratchpadCount();
  return saved;
}

function updateScratchpadCount() {
  const filter = categoryFilter.value;
  const count = events.filter(evt =>
    isUnassigned(evt) && (filter === 'ALL' || evt.category === filter)
  ).length;

  scratchCount.textContent = `${count} item${count === 1 ? '' : 's'}`;
}

// --- RESPONSIVE / LAYOUT SWITCHING ---
function applyLayoutMode() {
  const useMobile = forceLayoutMode === 'MOBILE'
    || (forceLayoutMode === 'AUTO' && window.innerWidth <= 768);

  document.body.classList.toggle('desktop-layout', !useMobile);
  document.body.classList.toggle('mobile-layout', useMobile);

  const viewName = useMobile ? 'Mobile Flip' : 'Desktop';
  const source = forceLayoutMode === 'AUTO' ? 'Auto' : 'Forced';
  layoutToggleLabel.textContent = `View: ${viewName} (${source})`;
}

function handleResize() {
  if (forceLayoutMode !== 'AUTO' || resizeFrame !== null) return;

  resizeFrame = window.requestAnimationFrame(() => {
    resizeFrame = null;
    applyLayoutMode();
  });
}

// --- GRID GENERATION ---
function renderGridHeadersAndCells() {
  const fragment = document.createDocumentFragment();

  // 1. Top-left corner header cell
  const cornerCell = document.createElement('div');
  cornerCell.className = 'border-b-2 border-r-2 border-paper-border font-sketch font-bold text-center py-2 text-xs uppercase bg-paper-bg sticky top-0 left-0 z-30 flex items-center justify-center';
  cornerCell.textContent = 'Days \\ Hrs';
  fragment.appendChild(cornerCell);

  // 2. 24 hour header columns (00:00 to 23:00)
  for (let hour = 0; hour < 24; hour += 1) {
    const hourHeader = document.createElement('div');
    hourHeader.className = 'border-b-2 border-r border-paper-line font-sketch font-bold text-center py-2 text-xs bg-paper-bg sticky top-0 z-20 flex items-center justify-center';
    hourHeader.textContent = `${padHour(hour)}:00`;
    fragment.appendChild(hourHeader);
  }

  // 3. Seven day rows and 24 cells per row
  DAYS.forEach((dayName, dayIndex) => {
    const dayHeader = document.createElement('div');
    dayHeader.className = 'border-b border-r-2 border-paper-border font-sketch font-bold p-2 text-sm bg-paper-bg sticky left-0 z-20 flex items-center justify-center text-center';

    const dayLabel = document.createElement('span');
    dayLabel.textContent = dayName.substring(0, 3);
    dayHeader.appendChild(dayLabel);
    fragment.appendChild(dayHeader);

    for (let hour = 0; hour < 24; hour += 1) {
      const slot = document.createElement('div');
      slot.className = 'timetable-slot border-b border-r border-paper-line relative min-h-[80px] transition-colors';
      slot.dataset.day = String(dayIndex);
      slot.dataset.hour = String(hour);

      slot.addEventListener('dragover', handleDragOver);
      slot.addEventListener('dragenter', handleDragEnter);
      slot.addEventListener('dragleave', handleDragLeave);
      slot.addEventListener('drop', handleDrop);

      fragment.appendChild(slot);
    }
  });

  gridContainer.replaceChildren(fragment);
}

function highlightCurrentDay() {
  const todayIndex = (new Date().getDay() + 6) % 7; // Convert Sun=0 to Mon=0
  const currentNotice = document.getElementById('currentDayNotice');
  if (!currentNotice) return;

  const badge = document.createElement('span');
  badge.className = 'text-xs bg-amber-200 px-2 py-0.5 rounded sketch-border-sm ml-2';
  badge.textContent = `Today: ${DAYS[todayIndex]}`;

  currentNotice.replaceChildren(document.createTextNode('Weekly Schedule Overview '), badge);
}

// --- OVERLAP LAYOUT ---
// Notes that overlap in time are placed in separate vertical lanes inside
// their day row, so no note is hidden underneath another one.
function computeOverlapLayout(eventList) {
  const layout = new Map();

  for (let dayIndex = 0; dayIndex < DAYS.length; dayIndex += 1) {
    const dayEvents = eventList
      .filter(evt => evt.day === dayIndex && Number.isInteger(evt.startHour))
      .sort((a, b) =>
        a.startHour - b.startHour
        || (b.startHour + b.duration) - (a.startHour + a.duration)
      );

    let cluster = [];
    let clusterEnd = -Infinity;

    const flushCluster = () => {
      if (!cluster.length) return;

      const laneEnds = [];
      cluster.forEach(evt => {
        let lane = laneEnds.findIndex(end => end <= evt.startHour);
        if (lane === -1) {
          lane = laneEnds.length;
          laneEnds.push(0);
        }

        laneEnds[lane] = evt.startHour + evt.duration;
        layout.set(evt.id, { lane, laneCount: 0 });
      });

      const laneCount = laneEnds.length;
      cluster.forEach(evt => {
        const entry = layout.get(evt.id);
        if (entry) entry.laneCount = laneCount;
      });

      cluster = [];
      clusterEnd = -Infinity;
    };

    dayEvents.forEach(evt => {
      const end = evt.startHour + evt.duration;
      if (cluster.length && evt.startHour >= clusterEnd) flushCluster();

      cluster.push(evt);
      clusterEnd = Math.max(clusterEnd, end);
    });

    flushCluster();
  }

  return layout;
}

// --- RENDER STICKY NOTES ON GRID & SCRATCHPAD ---
function renderAll() {
  document.querySelectorAll('.timetable-slot').forEach(slot => slot.replaceChildren());
  scratchpadArea.replaceChildren();

  const filter = categoryFilter.value;
  const visibleEvents = events.filter(evt => filter === 'ALL' || evt.category === filter);
  const overlapLayout = computeOverlapLayout(visibleEvents);

  visibleEvents.forEach(evt => {
    const noteEl = createStickyNoteDOM(evt);

    if (Number.isInteger(evt.day) && Number.isInteger(evt.startHour)) {
      const targetSlot = document.querySelector(`.timetable-slot[data-day="${evt.day}"][data-hour="${evt.startHour}"]`);
      if (!targetSlot) return;

      noteEl.classList.add('grid-note');
      noteEl.style.width = `calc(${evt.duration * 100}% + ${evt.duration - 1}px)`;

      const lanes = overlapLayout.get(evt.id) || { lane: 0, laneCount: 1 };
      if (lanes.laneCount > 1) {
        const laneHeight = 100 / lanes.laneCount;
        noteEl.style.top = `calc(${lanes.lane * laneHeight}% + 1px)`;
        noteEl.style.height = `calc(${laneHeight}% - 2px)`;
      } else {
        noteEl.style.top = '0';
        noteEl.style.height = '100%';
      }

      targetSlot.appendChild(noteEl);
    } else {
      scratchpadArea.appendChild(noteEl);
    }
  });

  updateScratchpadCount();
}

function buildNoteLabel(evt) {
  const dayLabel = isUnassigned(evt) ? 'Scratchpad' : DAYS[evt.day];
  const timeLabel = Number.isInteger(evt.startHour)
    ? `${padHour(evt.startHour)}:00, ${evt.duration} hour${evt.duration === 1 ? '' : 's'}`
    : 'unassigned';

  return `${evt.title}. ${evt.category}. ${dayLabel}, ${timeLabel}. Press Enter to edit.`;
}

function createStickyNoteDOM(evt) {
  const note = document.createElement('div');
  note.id = `note-${evt.id}`;
  note.className = `sticky-note sticky-${evt.color} p-2 flex flex-col justify-between overflow-hidden select-none`;
  note.draggable = true;
  note.dataset.id = evt.id;
  note.tabIndex = 0;
  note.setAttribute('role', 'group');
  note.setAttribute('aria-label', buildNoteLabel(evt));

  const topRow = document.createElement('div');
  topRow.className = 'flex items-start justify-between gap-1';

  // textContent is used for all user-provided text, preventing HTML injection.
  const title = document.createElement('span');
  title.className = 'font-hand text-base font-bold leading-tight text-gray-900 line-clamp-2 break-words min-w-0';
  title.textContent = evt.title;

  const editBtn = document.createElement('button');
  editBtn.type = 'button';
  editBtn.className = 'edit-btn text-xs opacity-60 hover:opacity-100 p-0.5 text-gray-800';
  editBtn.title = 'Edit note';
  editBtn.setAttribute('aria-label', `Edit ${evt.title}`);

  const editIcon = document.createElement('i');
  editIcon.className = 'fa-solid fa-pen';
  editIcon.setAttribute('aria-hidden', 'true');
  editBtn.appendChild(editIcon);

  topRow.append(title, editBtn);

  const bottomRow = document.createElement('div');
  bottomRow.className = 'note-meta flex items-center justify-between gap-1 text-[11px] font-semibold text-gray-700 pt-1';

  const category = document.createElement('span');
  category.textContent = `${CATEGORY_ICONS[evt.category] || '📌'} ${evt.category}`;
  bottomRow.appendChild(category);

  if (Number.isInteger(evt.startHour)) {
    const time = document.createElement('span');
    time.textContent = `${padHour(evt.startHour)}:00 (${evt.duration}h)`;
    bottomRow.appendChild(time);
  }

  note.append(topRow, bottomRow);

  note.addEventListener('dragstart', handleDragStart);
  note.addEventListener('dragend', handleDragEnd);
  note.addEventListener('pointerdown', handlePointerDragStart);
  note.addEventListener('keydown', event => {
    if (event.target !== note) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openEditModal(evt.id);
    }
  });

  editBtn.addEventListener('click', event => {
    event.stopPropagation();
    openEditModal(evt.id);
  });

  return note;
}

// --- DESKTOP DRAG AND DROP ---
function handleDragStart(event) {
  if (!event.dataTransfer) return;

  resetNativeDragState();
  const note = this;
  dragSourceNote = note;
  draggedEventId = note.dataset.id;
  event.dataTransfer.setData('text/plain', draggedEventId);
  event.dataTransfer.effectAllowed = 'move';

  window.clearTimeout(dragStartTimer);
  dragStartTimer = window.setTimeout(() => note.classList.add('is-dragging'), 10);
}

function handleDragEnd() {
  resetNativeDragState();
}

function resetNativeDragState() {
  window.clearTimeout(dragStartTimer);
  dragStartTimer = null;

  if (dragSourceNote) {
    dragSourceNote.classList.remove('is-dragging');
    dragSourceNote = null;
  }

  draggedEventId = null;
  clearDropHighlights();
}

function handleDragOver(event) {
  event.preventDefault();
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';

  // A long note can cover other slots. Use the pointer position so the
  // highlighted cell and the drop target always agree.
  if (!Number.isFinite(event.clientX) || !Number.isFinite(event.clientY)) return;

  const target = findDropTarget(event.clientX, event.clientY);
  if (!target || target.type !== 'slot') return;
  if (target.element.classList.contains('drop-target-hover')) return;

  clearDropHighlights();
  target.element.classList.add('drop-target-hover');
}

function handleDragEnter(event) {
  event.preventDefault();
  const slot = event.target.closest('.timetable-slot');
  if (!slot) return;

  clearDropHighlights();
  slot.classList.add('drop-target-hover');
}

function handleDragLeave(event) {
  const slot = event.target.closest('.timetable-slot');
  if (!slot) return;
  if (event.relatedTarget && slot.contains(event.relatedTarget)) return;

  slot.classList.remove('drop-target-hover');
}

function clearDropHighlights() {
  document.querySelectorAll('.drop-target-hover, .drop-target-danger').forEach(el => {
    el.classList.remove('drop-target-hover', 'drop-target-danger');
  });
}

function handleDrop(event) {
  event.preventDefault();

  const id = (event.dataTransfer && event.dataTransfer.getData('text/plain')) || draggedEventId;
  resetNativeDragState();
  if (!id) return;

  const hasCoordinates = Number.isFinite(event.clientX) && Number.isFinite(event.clientY);
  const target = hasCoordinates ? findDropTarget(event.clientX, event.clientY) : null;

  if (target) {
    if (target.type === 'trash') {
      deleteEventById(id);
    } else if (target.type === 'scratch') {
      moveEventToScratchpad(id);
    } else {
      moveEventToSlot(id, target.day, target.hour);
    }
    return;
  }

  const slot = event.target.closest('.timetable-slot');
  if (!slot) return;

  moveEventToSlot(id, Number(slot.dataset.day), Number(slot.dataset.hour));
}

// --- TOUCH / PEN DRAGGING ---
function handlePointerDragStart(event) {
  if (event.pointerType === 'mouse' || event.button !== 0) return;
  if (pointerDrag) return;
  if (event.target.closest('.edit-btn')) return;

  const note = event.currentTarget;
  if (!note.dataset.id) return;

  event.preventDefault();
  pointerDrag = {
    id: note.dataset.id,
    note,
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    rect: note.getBoundingClientRect(),
    moved: false,
    ghost: null,
    target: null
  };

  window.addEventListener('pointermove', handlePointerDragMove, { passive: false });
  window.addEventListener('pointerup', handlePointerDragEnd);
  window.addEventListener('pointercancel', handlePointerDragCancel);
}

function handlePointerDragMove(event) {
  if (!pointerDrag || event.pointerId !== pointerDrag.pointerId) return;

  const drag = pointerDrag;
  const dx = event.clientX - drag.startX;
  const dy = event.clientY - drag.startY;

  if (!drag.moved) {
    if (Math.hypot(dx, dy) < 8) return;
    drag.moved = true;
    drag.ghost = createDragGhost(drag.note, drag.rect);
    drag.note.classList.add('is-dragging');
  }

  event.preventDefault();
  if (!drag.ghost) return;

  drag.ghost.style.left = `${drag.rect.left + dx}px`;
  drag.ghost.style.top = `${drag.rect.top + dy}px`;

  const target = findDropTarget(event.clientX, event.clientY);
  if (!drag.target || !target || drag.target.element !== target.element) {
    drag.target = target;
    highlightDropTarget(target);
  }
}

function handlePointerDragEnd(event) {
  if (!pointerDrag || event.pointerId !== pointerDrag.pointerId) return;

  const drag = pointerDrag;
  const id = drag.id;
  const moved = drag.moved;
  const { clientX, clientY } = event;

  cleanupPointerDrag();

  if (!moved) {
    openEditModal(id);
    return;
  }

  const target = findDropTarget(clientX, clientY);
  if (!target) return;

  if (target.type === 'trash') {
    deleteEventById(id);
  } else if (target.type === 'scratch') {
    moveEventToScratchpad(id);
  } else {
    moveEventToSlot(id, target.day, target.hour);
  }
}

function handlePointerDragCancel(event) {
  if (!pointerDrag || event.pointerId !== pointerDrag.pointerId) return;
  cleanupPointerDrag();
}

function cleanupPointerDrag() {
  if (!pointerDrag) return;

  if (pointerDrag.ghost) pointerDrag.ghost.remove();
  pointerDrag.note.classList.remove('is-dragging');

  clearDropHighlights();
  window.removeEventListener('pointermove', handlePointerDragMove);
  window.removeEventListener('pointerup', handlePointerDragEnd);
  window.removeEventListener('pointercancel', handlePointerDragCancel);
  pointerDrag = null;
}

function createDragGhost(note, rect) {
  const ghost = note.cloneNode(true);
  ghost.removeAttribute('id');
  ghost.removeAttribute('tabindex');
  ghost.removeAttribute('aria-label');
  ghost.classList.remove('is-dragging', 'just-dropped');
  ghost.classList.add('drag-ghost');
  ghost.querySelectorAll('button').forEach(button => button.remove());

  ghost.style.position = 'fixed';
  ghost.style.left = `${rect.left}px`;
  ghost.style.top = `${rect.top}px`;
  ghost.style.width = `${rect.width}px`;
  ghost.style.height = `${rect.height}px`;
  ghost.setAttribute('aria-hidden', 'true');

  document.body.appendChild(ghost);
  return ghost;
}

function findDropTarget(x, y) {
  const elements = typeof document.elementsFromPoint === 'function'
    ? document.elementsFromPoint(x, y)
    : [document.elementFromPoint(x, y)].filter(Boolean);

  for (const element of elements) {
    if (element.id === 'trashZone') {
      return { type: 'trash', element };
    }

    if (element.id === 'scratchpadArea') {
      return { type: 'scratch', element };
    }

    if (element.classList && element.classList.contains('timetable-slot')) {
      const rect = element.getBoundingClientRect();
      const hasLayout = rect.width > 0 || rect.height > 0;
      if (hasLayout && (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom)) {
        continue;
      }

      return {
        type: 'slot',
        element,
        day: Number(element.dataset.day),
        hour: Number(element.dataset.hour)
      };
    }
  }

  return null;
}

function highlightDropTarget(target) {
  clearDropHighlights();
  if (!target) return;

  if (target.type === 'trash') {
    target.element.classList.add('drop-target-danger');
  } else {
    target.element.classList.add('drop-target-hover');
  }
}

function handleWindowBlur() {
  resetNativeDragState();
  if (pointerDrag) cleanupPointerDrag();
}

// --- EVENT MOVEMENT / DELETION ---
function moveEventToSlot(id, day, startHour) {
  const evt = events.find(item => item.id === id);
  if (!evt) return false;

  if (!Number.isInteger(day) || day < 0 || day > 6
      || !Number.isInteger(startHour) || startHour < 0 || startHour > 23) {
    return false;
  }

  if (startHour + evt.duration > 24) {
    showToast('That note would run past 24:00. Choose an earlier slot or a shorter duration.', 'error');
    return false;
  }

  evt.day = day;
  evt.startHour = startHour;
  saveEventsToStorage();
  renderAll();
  animateDropped(id);
  return true;
}

function moveEventToScratchpad(id) {
  const evt = events.find(item => item.id === id);
  if (!evt) return;

  evt.day = null;
  evt.startHour = null;
  saveEventsToStorage();
  renderAll();
}

function deleteEventById(id) {
  const previousLength = events.length;
  events = events.filter(item => item.id !== id);
  if (events.length === previousLength) return;

  const saved = saveEventsToStorage();
  renderAll();
  if (saved) showToast('Note deleted.', 'success');
}

function animateDropped(id) {
  const note = document.getElementById(`note-${id}`);
  if (!note) return;

  note.classList.add('just-dropped');
  window.setTimeout(() => note.classList.remove('just-dropped'), 400);
}

// --- CREATE NEW STICKY NOTE ---
function handleCreateSubmit(event) {
  event.preventDefault();

  const title = noteTitleInput.value.trim();
  const day = Number.parseInt(noteDaySelect.value, 10);
  const startHour = Number.parseInt(noteStartSelect.value, 10);
  const duration = Number.parseInt(noteDurationSelect.value, 10);
  const category = VALID_CATEGORIES.includes(noteCategorySelect.value)
    ? noteCategorySelect.value
    : 'Personal';
  const colorInput = createForm.querySelector('input[name="noteColor"]:checked');
  const color = colorInput && STICKY_COLORS.includes(colorInput.value)
    ? colorInput.value
    : 'yellow';

  if (!title) {
    showToast('Please enter a title for the note.', 'error');
    noteTitleInput.focus();
    return;
  }

  if (!Number.isInteger(day) || day < 0 || day > 6
      || !Number.isInteger(startHour) || startHour < 0 || startHour > 23
      || !Number.isInteger(duration) || duration < 1 || duration > 4) {
    showToast('Please choose a valid day, start time, and duration.', 'error');
    return;
  }

  if (startHour + duration > 24) {
    showToast('This note would end after 24:00. Choose an earlier start or a shorter duration.', 'error');
    return;
  }

  events.push({
    id: generateId(),
    title,
    day,
    startHour,
    duration,
    color,
    category
  });

  // Make sure a newly created note is not hidden by an active filter.
  if (categoryFilter.value !== 'ALL' && categoryFilter.value !== category) {
    categoryFilter.value = 'ALL';
  }

  const saved = saveEventsToStorage();
  renderAll();
  noteTitleInput.value = '';
  noteTitleInput.focus();
  if (saved) showToast('Note added to the timetable.', 'success');
}

// --- EDIT MODAL LOGIC ---
function openEditModal(id) {
  const evt = events.find(item => item.id === id);
  if (!evt) return;

  lastFocusedElement = editModal.hidden
    ? (document.activeElement instanceof HTMLElement ? document.activeElement : null)
    : lastFocusedElement;

  editNoteId.value = evt.id;
  editNoteTitle.value = evt.title;
  editNoteCategory.value = evt.category;
  editNoteColor.value = evt.color;
  editNoteDay.value = isUnassigned(evt) ? 'scratch' : String(evt.day);
  editNoteStart.value = Number.isInteger(evt.startHour) ? String(evt.startHour) : '9';
  editNoteDuration.value = String(evt.duration);
  syncEditTimeState();

  editModal.hidden = false;
  document.body.classList.add('modal-open');
  editNoteTitle.focus();
  editNoteTitle.select();
}

function closeEditModal() {
  if (editModal.hidden) return;

  editModal.hidden = true;
  document.body.classList.remove('modal-open');

  if (lastFocusedElement && lastFocusedElement.isConnected) {
    lastFocusedElement.focus();
  }
  lastFocusedElement = null;
}

function syncEditTimeState() {
  const isScratch = editNoteDay.value === 'scratch';
  editNoteStart.disabled = isScratch;
}

function handleSaveEdit() {
  const id = editNoteId.value;
  const eventIndex = events.findIndex(item => item.id === id);

  if (eventIndex === -1) {
    closeEditModal();
    return;
  }

  const title = editNoteTitle.value.trim();
  if (!title) {
    showToast('Please enter a title for the note.', 'error');
    editNoteTitle.focus();
    return;
  }

  const category = VALID_CATEGORIES.includes(editNoteCategory.value)
    ? editNoteCategory.value
    : events[eventIndex].category;
  const color = STICKY_COLORS.includes(editNoteColor.value)
    ? editNoteColor.value
    : events[eventIndex].color;

  const isScratch = editNoteDay.value === 'scratch';
  const day = isScratch ? null : Number.parseInt(editNoteDay.value, 10);
  const startHour = isScratch ? null : Number.parseInt(editNoteStart.value, 10);
  const duration = Number.parseInt(editNoteDuration.value, 10);

  if (!Number.isInteger(duration) || duration < 1 || duration > 4) {
    showToast('Please choose a duration between 1 and 4 hours.', 'error');
    return;
  }

  if (!isScratch) {
    if (!Number.isInteger(day) || day < 0 || day > 6
        || !Number.isInteger(startHour) || startHour < 0 || startHour > 23) {
      showToast('Please choose a valid day and start time.', 'error');
      return;
    }

    if (startHour + duration > 24) {
      showToast('This note would end after 24:00. Choose an earlier start or a shorter duration.', 'error');
      return;
    }
  }

  events[eventIndex] = {
    ...events[eventIndex],
    title,
    category,
    color,
    day,
    startHour,
    duration
  };

  // Do not let a category change hide the note behind the active filter.
  if (categoryFilter.value !== 'ALL' && categoryFilter.value !== events[eventIndex].category) {
    categoryFilter.value = 'ALL';
  }

  const saved = saveEventsToStorage();
  renderAll();
  closeEditModal();

  const updatedNote = document.getElementById(`note-${id}`);
  if (updatedNote) updatedNote.focus();
  if (saved) showToast('Note updated.', 'success');
}

function handleModalKeydown(event) {
  if (event.key === 'Enter' && event.target === editNoteTitle && !event.isComposing) {
    event.preventDefault();
    handleSaveEdit();
    return;
  }

  if (event.key === 'Escape') {
    event.preventDefault();
    closeEditModal();
    return;
  }

  if (event.key !== 'Tab') return;

  const focusable = Array.from(editModal.querySelectorAll(
    'button, input:not([type="hidden"]), select, textarea, [tabindex]:not([tabindex="-1"])'
  )).filter(element => !element.disabled);

  if (!focusable.length) return;

  const first = focusable[0];
  const last = focusable[focusable.length - 1];

  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

// --- QUICK ACTION BUTTONS ---
function handleClearAll() {
  if (!window.confirm('Clear all sticky notes from the board?')) return;

  events = [];
  const saved = saveEventsToStorage();
  renderAll();
  if (saved) showToast('All notes cleared.', 'success');
}

// --- TOAST NOTIFICATIONS ---
function showToast(message, type = 'success') {
  if (!toast) return;

  toast.hidden = false;
  toast.textContent = message;
  toast.className = type === 'error' ? 'toast-error' : 'toast-success';

  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    toast.hidden = true;
  }, type === 'error' ? 5000 : 3000);
}

// --- EVENT LISTENERS ---
function setupEventListeners() {
  toggleLayoutBtn.addEventListener('click', () => {
    if (forceLayoutMode === 'AUTO') forceLayoutMode = 'DESKTOP';
    else if (forceLayoutMode === 'DESKTOP') forceLayoutMode = 'MOBILE';
    else forceLayoutMode = 'AUTO';

    applyLayoutMode();
  });

  categoryFilter.addEventListener('change', () => {
    renderAll();
  });

  clearAllBtn.addEventListener('click', handleClearAll);
  printBtn.addEventListener('click', () => window.print());
  createForm.addEventListener('submit', handleCreateSubmit);
  saveEditBtn.addEventListener('click', handleSaveEdit);
  cancelEditBtn.addEventListener('click', closeEditModal);
  deleteNoteBtn.addEventListener('click', () => {
    const id = editNoteId.value;
    if (!id) return;
    if (!window.confirm('Delete this note?')) return;

    deleteEventById(id);
    closeEditModal();
  });
  editNoteDay.addEventListener('change', syncEditTimeState);

  editModal.addEventListener('click', event => {
    if (event.target === editModal) closeEditModal();
  });
  editModal.addEventListener('keydown', handleModalKeydown);

  // Scratchpad drop target
  scratchpadArea.addEventListener('dragover', event => {
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
  });
  scratchpadArea.addEventListener('dragenter', event => {
    event.preventDefault();
    clearDropHighlights();
    scratchpadArea.classList.add('drop-target-hover');
  });
  scratchpadArea.addEventListener('dragleave', event => {
    if (event.relatedTarget && scratchpadArea.contains(event.relatedTarget)) return;
    scratchpadArea.classList.remove('drop-target-hover');
  });
  scratchpadArea.addEventListener('drop', event => {
    event.preventDefault();

    const id = (event.dataTransfer && event.dataTransfer.getData('text/plain')) || draggedEventId;
    resetNativeDragState();
    if (id) moveEventToScratchpad(id);
  });

  // Trash drop target
  trashZone.addEventListener('dragover', event => {
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
  });
  trashZone.addEventListener('dragenter', event => {
    event.preventDefault();
    clearDropHighlights();
    trashZone.classList.add('drop-target-danger');
  });
  trashZone.addEventListener('dragleave', event => {
    if (event.relatedTarget && trashZone.contains(event.relatedTarget)) return;
    trashZone.classList.remove('drop-target-danger');
  });
  trashZone.addEventListener('drop', event => {
    event.preventDefault();

    const id = (event.dataTransfer && event.dataTransfer.getData('text/plain')) || draggedEventId;
    resetNativeDragState();
    if (id) deleteEventById(id);
  });

  window.addEventListener('resize', handleResize);
  window.addEventListener('blur', handleWindowBlur);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) handleWindowBlur();
  });
}
