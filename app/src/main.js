// Wires the studio: photos per panel, size and grade, caption lettering, drag
// to pan, undo, per-panel remove, and PNG export. A `?shot=` query sets up a
// fixed scene for a screenshot (./shots.js).
import { drawCoverArt, layoutPanels, panelAtPoint, panelBounds, EXPORT_SIZES } from './cover.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('previewCanvas');
const previewWrap = document.getElementById('previewWrap');
const selectionOverlay = document.getElementById('selectionOverlay');
const captionInput = document.getElementById('captionInput');
const taglineInput = document.getElementById('taglineInput');
const photoInput = document.getElementById('photoInput');
const zoomRange = document.getElementById('zoomRange');
const statusLine = document.getElementById('statusLine');
const undoButton = document.getElementById('undoButton');
const removePhotoButton = document.getElementById('removePhotoButton');

const state = {
  sizeKey: '1080x1080',
  grade: 'sunset',
  caption: captionInput.value,
  tagline: taglineInput.value,
  selected: 0,
  panels: [
    { img: null, zoom: 1, ox: 0, oy: 0 },
    { img: null, zoom: 1, ox: 0, oy: 0 },
    { img: null, zoom: 1, ox: 0, oy: 0 },
  ],
};

let layout = null;

// --- History: undo restores earlier panel states, newest first. ---
const HISTORY_LIMIT = 30;
const history = [];

/** A plain copy of the three panels, so later edits cannot mutate the past. */
function snapshotPanels() {
  return state.panels.map((panel) => ({ ...panel }));
}

/** Record the current panels before a change; drop the oldest past 30. */
function pushHistory() {
  history.push(snapshotPanels());
  if (history.length > HISTORY_LIMIT) history.shift();
  syncUndoButton();
}

function syncUndoButton() {
  if (undoButton) undoButton.disabled = history.length === 0;
}

/** Step back one change, if there is one to step back to. */
function undo() {
  const previous = history.pop();
  if (!previous) return;
  state.panels = previous.map((panel) => ({ ...panel }));
  zoomRange.value = String(state.panels[state.selected].zoom);
  statusLine.textContent = 'Undid the last change.';
  syncUndoButton();
  redraw();
}

/** Clear the selected panel back to its empty slot. */
function removeSelectedPhoto() {
  pushHistory();
  state.panels[state.selected] = { img: null, zoom: 1, ox: 0, oy: 0 };
  zoomRange.value = '1';
  statusLine.textContent = `Panel ${state.selected + 1} is empty again.`;
  redraw();
}

function resizeCanvas() {
  const [w, h] = EXPORT_SIZES[state.sizeKey];
  canvas.width = w;
  canvas.height = h;
}

function redraw() {
  resizeCanvas();
  layout = drawCoverArt(canvas, state);
  moveSelectionOverlay();
}

function moveSelectionOverlay() {
  if (!layout || document.body.classList.contains('shot-cover')) {
    selectionOverlay.hidden = true;
    return;
  }
  const rect = canvas.getBoundingClientRect();
  const wrapRect = previewWrap.getBoundingClientRect();
  const bounds = panelBounds(layout.panels, state.selected);
  const scaleX = rect.width / canvas.width;
  const scaleY = rect.height / canvas.height;
  selectionOverlay.hidden = false;
  selectionOverlay.style.left = `${rect.left - wrapRect.left + bounds.x * scaleX}px`;
  selectionOverlay.style.top = `${rect.top - wrapRect.top + bounds.y * scaleY}px`;
  selectionOverlay.style.width = `${bounds.width * scaleX}px`;
  selectionOverlay.style.height = `${bounds.height * scaleY}px`;
}

function selectPanel(index) {
  state.selected = index;
  document.querySelectorAll('.panel-button').forEach((button) => {
    button.classList.toggle('is-selected', Number(button.dataset.panel) === index);
  });
  zoomRange.value = String(state.panels[index].zoom);
  moveSelectionOverlay();
}

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

/** Put a bundled sample into the selected panel, replacing what was there. */
async function loadSample(name) {
  pushHistory();
  const img = await loadImage(`samples/${name}.jpg`);
  state.panels[state.selected].img = img;
  state.panels[state.selected].zoom = 1;
  state.panels[state.selected].ox = 0;
  state.panels[state.selected].oy = 0;
  zoomRange.value = '1';
  redraw();
}

photoInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  pushHistory();
  const img = await loadImage(URL.createObjectURL(file));
  state.panels[state.selected].img = img;
  state.panels[state.selected].zoom = 1;
  state.panels[state.selected].ox = 0;
  state.panels[state.selected].oy = 0;
  zoomRange.value = '1';
  statusLine.textContent = `Loaded ${file.name} into panel ${state.selected + 1}.`;
  redraw();
});

document.querySelectorAll('.sample-button').forEach((button) => {
  button.addEventListener('click', async () => {
    await loadSample(button.dataset.sample);
    statusLine.textContent = `Sample “${button.dataset.sample}” loaded into panel ${state.selected + 1}.`;
  });
});

document.getElementById('fillAllButton').addEventListener('click', () => {
  const source = state.panels[state.selected];
  if (!source.img) {
    statusLine.textContent = 'Load a photo into the selected panel first.';
    return;
  }
  pushHistory();
  state.panels.forEach((panel) => {
    panel.img = source.img;
    panel.zoom = source.zoom;
    panel.ox = source.ox;
    panel.oy = source.oy;
  });
  statusLine.textContent = 'One photo now fills all three panels.';
  redraw();
});

document.querySelectorAll('.panel-button').forEach((button) => {
  button.addEventListener('click', () => selectPanel(Number(button.dataset.panel)));
});

document.querySelectorAll('input[name="size"]').forEach((radio) => {
  radio.addEventListener('change', () => {
    state.sizeKey = radio.value;
    redraw();
  });
});

document.querySelectorAll('.grade-button').forEach((button) => {
  button.addEventListener('click', () => {
    state.grade = button.dataset.grade;
    document.querySelectorAll('.grade-button').forEach((b) => b.classList.toggle('is-active', b === button));
    redraw();
  });
});

captionInput.addEventListener('input', () => { state.caption = captionInput.value; redraw(); });
taglineInput.addEventListener('input', () => { state.tagline = taglineInput.value; redraw(); });

// A zoom drag fires many input events; record it once, on the first one, and
// start a fresh record when the drag ends (the change event).
let zoomGestureRecorded = false;
zoomRange.addEventListener('input', () => {
  if (!zoomGestureRecorded) {
    pushHistory();
    zoomGestureRecorded = true;
  }
  state.panels[state.selected].zoom = Number(zoomRange.value);
  redraw();
});
zoomRange.addEventListener('change', () => { zoomGestureRecorded = false; });

if (undoButton) undoButton.addEventListener('click', undo);
if (removePhotoButton) removePhotoButton.addEventListener('click', removeSelectedPhoto);

// Ctrl+Z undoes a panel change. The target can be the document itself (no
// matches method), so check the type first; and never steal the shortcut
// while the person is typing in a text field.
document.addEventListener('keydown', (e) => {
  if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== 'z' || e.shiftKey) return;
  const target = e.target;
  if (target instanceof Element && target.matches('input, textarea, select, [contenteditable="true"]')) return;
  e.preventDefault();
  undo();
});

/** Drag on the preview to pan the selected panel's photo; click a panel to select it. */
let dragging = null;
canvas.addEventListener('pointerdown', (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
  const y = ((e.clientY - rect.top) / rect.height) * canvas.height;
  const hit = panelAtPoint(layout.panels, x, y);
  if (hit === -1) return;
  if (hit !== state.selected) selectPanel(hit);
  dragging = { panel: state.panels[hit], startX: e.clientX, startY: e.clientY, ox: state.panels[hit].ox, oy: state.panels[hit].oy, recorded: false };
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove', (e) => {
  if (!dragging) return;
  if (!dragging.recorded) {
    pushHistory();
    dragging.recorded = true;
  }
  const rect = canvas.getBoundingClientRect();
  const scale = canvas.width / rect.width;
  dragging.panel.ox = dragging.ox + ((e.clientX - dragging.startX) * scale) / canvas.width;
  dragging.panel.oy = dragging.oy + ((e.clientY - dragging.startY) * scale) / canvas.height;
  redraw();
});
canvas.addEventListener('pointerup', () => { dragging = null; });

/** Exports the cover at its full post size as a PNG download. */
document.getElementById('exportButton').addEventListener('click', () => {
  redraw();
  canvas.toBlob((blob) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `neon-sunset-cover-${state.sizeKey}.png`;
    a.click();
    statusLine.textContent = `Saved neon-sunset-cover-${state.sizeKey}.png`;
  }, 'image/png');
});

window.addEventListener('resize', moveSelectionOverlay);

/** The current state, for the shot scenes and for tests. */
export function getState() {
  return state;
}

/** The undo history, for tests. */
export function getHistory() {
  return history;
}

/** Loads the bundled Anton display font before the first paint. */
async function boot() {
  try {
    await document.fonts.load('100px Anton');
    await document.fonts.ready;
  } catch {
    // Anton is bundled; if it fails to load the canvas falls back to a system bold face.
  }
  const query = new URLSearchParams(location.search);
  const shot = query.get('shot');
  if (shot) {
    await runShot(shot, query, state, loadSample, redraw, selectPanel);
  } else {
    await loadSample('boulevard');
    state.panels[1].img = state.panels[0].img;
    state.panels[2].img = state.panels[0].img;
    redraw();
  }
  syncUndoButton();
  if (shot) window.__shotReady = true;
}

boot();
