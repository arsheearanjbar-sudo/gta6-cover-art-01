// Wires the studio: photos per panel, size and grade, caption lettering, drag to pan,
// and PNG export. A `?shot=` query sets up a fixed scene for a screenshot (./shots.js).
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

async function loadSample(name) {
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
zoomRange.addEventListener('input', () => {
  state.panels[state.selected].zoom = Number(zoomRange.value);
  redraw();
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
  dragging = { panel: state.panels[hit], startX: e.clientX, startY: e.clientY, ox: state.panels[hit].ox, oy: state.panels[hit].oy };
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove', (e) => {
  if (!dragging) return;
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
}

boot();
