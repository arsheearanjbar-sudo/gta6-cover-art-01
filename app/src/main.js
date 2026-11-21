// Neon Sunset Cover Studio — the editor wiring.
//
// Samples, your own photo, the four panels, the caption, the export sizes,
// Undo (button and Ctrl+Z) and per-panel Remove. State is kept as plain
// data so Undo can snapshot and restore it; images are reloaded from the
// stored source (a sample name or a data URL) on restore.

import { drawCover, FOCUS_POINTS, SIZES } from "./cover.js";
import { SHOTS, applyShot } from "./shots.js";

const SAMPLE_NAMES = ["boulevard", "pier", "rooftop", "skate"];
const PANEL_NAMES = ["Hero", "Panel 2", "Panel 3", "Panel 4"];
const HISTORY_CAP = 30;

const canvas = document.getElementById("cover");
const captionInput = document.getElementById("captionInput");
const panelList = document.getElementById("panelList");
const undoBtn = document.getElementById("undoBtn");
const exportBtn = document.getElementById("exportBtn");
const photoInput = document.getElementById("photoInput");

const state = {
  size: "portrait",
  caption: "NEON SUNSET",
  panels: [null, null, null, null],
  selected: 0,
  history: [],
};

/** Load an image from a sample name or a data URL. */
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`could not load ${src.slice(0, 40)}`));
    img.src = src.startsWith("data:") ? src : `samples/${src}.jpg`;
  });
}

/** A panel as plain data: { src, focusY } or null. */
function snapshotPanels() {
  return state.panels.map((p) => (p ? { src: p.src, focusY: p.focusY } : null));
}

function pushHistory() {
  state.history.push({
    size: state.size,
    caption: state.caption,
    panels: snapshotPanels(),
  });
  if (state.history.length > HISTORY_CAP) state.history.shift();
}

/** Restore a snapshot, reloading its images. */
async function restore(snapshot) {
  state.size = snapshot.size;
  state.caption = snapshot.caption;
  captionInput.value = snapshot.caption;
  state.panels = await Promise.all(
    snapshot.panels.map(async (p) => {
      if (!p) return null;
      const img = await loadImage(p.src);
      return { img, src: p.src, focusY: p.focusY };
    }),
  );
  render();
}

async function undo() {
  const snapshot = state.history.pop();
  if (!snapshot) return;
  await restore(snapshot);
}

/** Whether the key event's target is a field the user is typing in. */
function isTypingTarget(event) {
  const target = event.target;
  if (!(target instanceof Element)) return false;
  if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return true;
  if (target instanceof HTMLElement && target.isContentEditable) return true;
  return false;
}

function render() {
  drawCover(canvas, state);
  undoBtn.disabled = state.history.length === 0;
  document.querySelectorAll(".size").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.size === state.size));
  });
  renderPanelList();
}

function renderPanelList() {
  panelList.replaceChildren();
  state.panels.forEach((panel, i) => {
    const item = document.createElement("li");
    item.className = "panel-card";
    item.setAttribute("aria-pressed", String(state.selected === i));
    item.addEventListener("click", () => {
      state.selected = i;
      renderPanelList();
    });
    const name = document.createElement("span");
    name.className = "name";
    name.textContent = PANEL_NAMES[i];
    const photo = document.createElement("span");
    photo.className = "photo";
    photo.textContent = panel ? photoLabel(panel) : "Empty — neon";
    const remove = document.createElement("button");
    remove.className = "remove";
    remove.type = "button";
    remove.textContent = "Remove";
    remove.disabled = !panel;
    remove.addEventListener("click", (event) => {
      event.stopPropagation();
      removePanel(i);
    });
    item.append(name, photo, remove);
    panelList.append(item);
  });
}

function photoLabel(panel) {
  if (panel.src.startsWith("data:")) return "Your photo";
  return panel.src.charAt(0).toUpperCase() + panel.src.slice(1);
}

async function fillSelected(src, focusY) {
  pushHistory();
  const img = await loadImage(src);
  state.panels[state.selected] = { img, src, focusY };
  render();
}

async function removePanel(i) {
  if (!state.panels[i]) return;
  pushHistory();
  state.panels[i] = null;
  render();
}

function setCaption(text) {
  if (text === state.caption) return;
  pushHistory();
  state.caption = text;
  render();
}

function setSize(size) {
  if (!SIZES[size] || size === state.size) return;
  state.size = size;
  render();
}

function exportPng() {
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `neon-sunset-cover-${state.size}.png`;
    link.click();
    URL.revokeObjectURL(url);
  }, "image/png");
}

document.querySelectorAll(".sample").forEach((button) => {
  button.addEventListener("click", () => {
    const name = button.dataset.sample;
    fillSelected(name, FOCUS_POINTS[name] ?? 0.5).catch(() => {});
  });
});

photoInput.addEventListener("change", () => {
  const file = photoInput.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const dataUrl = String(reader.result);
    fillSelected(dataUrl, 0.5).catch(() => {});
  };
  reader.readAsDataURL(file);
  photoInput.value = "";
});

document.querySelectorAll(".size").forEach((button) => {
  button.addEventListener("click", () => setSize(button.dataset.size));
});

captionInput.addEventListener("input", () => setCaption(captionInput.value));

undoBtn.addEventListener("click", () => {
  undo().catch(() => {});
});

exportBtn.addEventListener("click", exportPng);

document.addEventListener("keydown", (event) => {
  const isUndo = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z";
  if (!isUndo || isTypingTarget(event)) return;
  event.preventDefault();
  undo().catch(() => {});
});

/** Fill the four panels with a different sample each, hero first. */
async function fillAllSamples(hero) {
  const order = [hero, ...SAMPLE_NAMES.filter((name) => name !== hero)];
  state.panels = await Promise.all(
    order.map(async (name) => {
      const img = await loadImage(name);
      return { img, src: name, focusY: FOCUS_POINTS[name] ?? 0.5 };
    }),
  );
}

// Start: the Anton face, then the shot from the URL (for screenshots) or
// the default cover with every panel filled.
async function start() {
  try {
    await document.fonts.load('40px Anton');
  } catch {
    // The caption falls back to Arial Black; the cover still draws.
  }
  const shotId = new URLSearchParams(location.search).get("shot");
  const shot = SHOTS.find((s) => s.id === shotId);
  if (shot) {
    state.size = shot.size;
    state.caption = shot.caption;
    await applyShot(fillAllSamples, shot);
  } else {
    await fillAllSamples("boulevard");
  }
  render();
}

start().catch(() => render());
