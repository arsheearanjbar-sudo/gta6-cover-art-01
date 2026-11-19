// Fixed scenes for screenshots: `?shot=cover` renders one exported cover full-screen,
// `?shot=editor` opens the studio with photos already loaded. Only the bundled sample
// photos are used, so every shot is a real render of the app's own code.
import { layoutPanels, panelBounds, EXPORT_SIZES } from './cover.js';

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

  // Frame faces: the small side panels are wider than the photos, so a centred
  // cover-fit would crop the faces off the top. Shift those photos down so the
  // upper part of each photo — where the face is — stays in frame.
  const [coverWidth, coverHeight] = EXPORT_SIZES[state.sizeKey];
  const coverLayout = layoutPanels(coverWidth, coverHeight);
  state.panels.forEach((panel, i) => {
    if (i === 0 || !panel.img) return;
    const bounds = panelBounds(coverLayout.panels, i);
    const panelAspect = bounds.width / bounds.height;
    const photoAspect = panel.img.naturalWidth / panel.img.naturalHeight;
    panel.zoom = 1.05;
    panel.ox = 0;
    if (panelAspect > photoAspect) panel.oy = 0.18;
  });
  redraw();

  await document.fonts.ready;
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  window.__shotReady = true;
}
