// Fixed scenes for screenshots: `?shot=cover` renders one exported cover full-screen,
// `?shot=editor` opens the studio with photos already loaded. Only the bundled sample
// photos are used, so every shot is a real render of the app's own code.
import { layoutPanels, panelBounds, EXPORT_SIZES } from './cover.js';

/**
 * Where each sample photo's face centre sits, as a fraction of the photo's
 * height, measured from the photos themselves. The framing below reads this
 * table instead of one fixed shift for every photo.
 */
const FACE_FOCUS = {
  boulevard: 0.22,
  pier: 0.25,
  rooftop: 0.30,
  skate: 0.44,
};

/**
 * Nudges a panel's photo so its face lands slightly above the panel centre
 * (42% down the panel). Only applies when the panel is wider than the photo,
 * which is when cover-fit leaves vertical slack to spend; otherwise the photo
 * is already cropped side to side and there is nothing to shift.
 */
function frameFace(panel, bounds, sampleName) {
  if (!panel.img) return;
  const panelAspect = bounds.width / bounds.height;
  const photoAspect = panel.img.naturalWidth / panel.img.naturalHeight;
  if (panelAspect <= photoAspect) return;
  const scale = Math.max(bounds.width / panel.img.naturalWidth, bounds.height / panel.img.naturalHeight) * panel.zoom;
  const drawnH = panel.img.naturalHeight * scale;
  const focus = FACE_FOCUS[sampleName] ?? 0.3;
  const wanted = 0.5 - focus - 0.08 * (bounds.height / drawnH);
  const maxShift = Math.max(0, (drawnH - bounds.height) / 2 / drawnH);
  panel.oy = Math.max(-maxShift, Math.min(maxShift, wanted));
  panel.ox = 0;
}

/**
 * Sets up a fixed scene from the page query. `state` is the studio state from
 * main.js; `loadSample` loads a bundled sample into the selected panel; `redraw`
 * repaints the preview; `selectPanel` picks the panel the next sample goes into.
 */
export async function runShot(shot, query, state, loadSample, redraw, selectPanel) {
  const caption = query.get('caption');
  const tagline = query.get('tagline');
  const grade = query.get('grade');
  const size = query.get('size');
  const photo = query.get('photo') || 'boulevard';
  const photo2 = query.get('photo2') || photo;
  const photo3 = query.get('photo3') || photo;
  const photos = [photo, photo2, photo3];

  if (size && ['1080x1080', '1080x1350', '1920x1080'].includes(size)) {
    state.sizeKey = size;
    const radio = document.querySelector(`input[name="size"][value="${size}"]`);
    if (radio) radio.checked = true;
  }
  if (grade && ['sunset', 'neon', 'dusk', 'mono'].includes(grade)) {
    state.grade = grade;
    document.querySelectorAll('.grade-button').forEach((b) => {
      b.classList.toggle('is-active', b.dataset.grade === grade);
    });
  }
  if (caption !== null) {
    state.caption = caption;
    document.getElementById('captionInput').value = caption;
  }
  if (tagline !== null) {
    state.tagline = tagline;
    document.getElementById('taglineInput').value = tagline;
  }

  if (shot === 'cover') {
    document.body.classList.add('shot-cover');
  }

  selectPanel(0);
  await loadSample(photo);
  selectPanel(1);
  await loadSample(photo2);
  selectPanel(2);
  await loadSample(photo3);
  selectPanel(0);

  // Frame every face: a slight zoom for a tighter crop, then shift each photo
  // so its face sits just above the middle of its panel.
  const [coverWidth, coverHeight] = EXPORT_SIZES[state.sizeKey];
  const coverLayout = layoutPanels(coverWidth, coverHeight);
  state.panels.forEach((panel, i) => {
    if (!panel.img) return;
    const bounds = panelBounds(coverLayout.panels, i);
    panel.zoom = 1.05;
    frameFace(panel, bounds, photos[i]);
  });
  redraw();

  await document.fonts.ready;
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  // Note: window.__shotReady is set by boot() in main.js, after the undo
  // button state is synced, so the screenshot never catches it mid-update.
}
