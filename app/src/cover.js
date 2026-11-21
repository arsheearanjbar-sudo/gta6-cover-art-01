// Neon Sunset Cover Studio — the cover renderer.
//
// Draws the multi-panel poster on a canvas: each photo cover-fit into its
// panel with a face focus point, a light cyan wash and a magenta sunset
// fade, then the caption strip with bold Anton lettering. The grade is
// deliberately light so skin stays natural and hair stays brown.

// Where each sample photo's face sits, as a fraction of the photo's
// height. The crop keeps the face in frame instead of centring blindly.
export const FOCUS_POINTS = {
  boulevard: 0.22,
  pier: 0.25,
  rooftop: 0.30,
  skate: 0.44,
};

// The three post sizes the app exports.
export const SIZES = {
  square: { w: 1080, h: 1080, label: "1080 x 1080" },
  portrait: { w: 1080, h: 1350, label: "1080 x 1350" },
  wide: { w: 1920, h: 1080, label: "1920 x 1080" },
};

// The caption strip: the bottom 16% of the poster, a solid deep-violet
// band with a 4px magenta rule on its top edge. The panels live above it,
// so no face ever sits under the caption.
export const STRIP = { bg: "#12061c", rule: "#ff4fa8", height: 0.16, rulePx: 4 };

// The neon grade: a light cyan wash (0.14, so skin stays natural and hair
// stays brown) and a magenta glow for the lettering and the sunset fade.
export const NEON = {
  cyan: "rgba(0, 229, 255, 0.14)",
  glow: "rgba(255, 79, 168, 0.42)",
  fade: "rgba(255, 79, 168, 0.30)",
};

/**
 * The four panel rectangles for a cover of size w x h: one wide hero on
 * top and three panels in a row beneath it, all above the caption strip.
 * Returns [{x, y, w, h}, ...] in panel order.
 */
export function panelLayout(w, h) {
  const stripH = h * STRIP.height;
  const panelsH = h - stripH;
  const heroH = panelsH * 0.62;
  const rowH = panelsH - heroH;
  const third = w / 3;
  return [
    { x: 0, y: 0, w, h: heroH },
    { x: 0, y: heroH, w: third, h: rowH },
    { x: third, y: heroH, w: third, h: rowH },
    { x: third * 2, y: heroH, w: third, h: rowH },
  ];
}

/**
 * The source rectangle that cover-fits an image of iw x ih into a w x h
 * panel, keeping the point at focusY (a fraction of the image height,
 * where the face is) visible. The crop is centred horizontally.
 */
export function fitSource(iw, ih, w, h, focusY) {
  const scale = Math.max(w / iw, h / ih);
  const sw = w / scale;
  const sh = h / scale;
  const sx = Math.max(0, Math.min(iw - sw, (iw - sw) / 2));
  const anchor = focusY * ih;
  const sy = Math.max(0, Math.min(ih - sh, anchor - sh / 2));
  return { sx, sy, sw, sh };
}

/**
 * A sunset fade over a rectangle: magenta at the bottom edge fading to
 * clear two thirds of the way up. Gives the Vice City dusk feel without
 * washing the photo out.
 */
export function fadeToClear(ctx, x, y, w, h) {
  const g = ctx.createLinearGradient(0, y + h, 0, y + h * 0.33);
  g.addColorStop(0, NEON.fade);
  g.addColorStop(1, "rgba(255, 79, 168, 0)");
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
}

/** The neon grade over a panel: a light cyan wash, then the sunset fade. */
function gradePanel(ctx, x, y, w, h) {
  ctx.fillStyle = NEON.cyan;
  ctx.fillRect(x, y, w, h);
  fadeToClear(ctx, x, y, w, h);
}

/** An empty panel: a deep-violet neon gradient, no photo, no fake face. */
function drawEmptyPanel(ctx, x, y, w, h) {
  const g = ctx.createLinearGradient(x, y, x + w, y + h);
  g.addColorStop(0, "#2a1140");
  g.addColorStop(0.55, "#1d0b2e");
  g.addColorStop(1, "#12061c");
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
  gradePanel(ctx, x, y, w, h);
}

/**
 * One panel: the photo cover-fit with its focus point, the neon grade,
 * and a thin dark seam so neighbouring panels read apart.
 */
export function drawPanel(ctx, panel, rect) {
  const { x, y, w, h } = rect;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  if (panel && panel.img) {
    const src = fitSource(panel.img.naturalWidth, panel.img.naturalHeight, w, h, panel.focusY ?? 0.5);
    ctx.drawImage(panel.img, src.sx, src.sy, src.sw, src.sh, x, y, w, h);
    gradePanel(ctx, x, y, w, h);
  } else {
    drawEmptyPanel(ctx, x, y, w, h);
  }
  ctx.restore();
  ctx.strokeStyle = "rgba(18, 6, 28, 0.9)";
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
}

/** Split a caption into at most two lines that each fit maxWidth. */
function wrapCaption(ctx, caption, maxWidth) {
  const words = caption.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [""];
  const lines = [words[0]];
  for (const word of words.slice(1)) {
    const last = lines[lines.length - 1];
    if (lines.length < 2 && ctx.measureText(`${last} ${word}`).width <= maxWidth) {
      lines[lines.length - 1] = `${last} ${word}`;
    } else if (lines.length < 2) {
      lines.push(word);
    } else {
      lines[lines.length - 1] = `${lines[lines.length - 1]} ${word}`;
    }
  }
  return lines;
}

/**
 * The caption strip: the solid band, its magenta rule, and the caption in
 * Anton, white with a magenta glow, centred, shrunk until it fits.
 */
export function drawStrip(ctx, caption, w, h) {
  const stripH = h * STRIP.height;
  const y = h - stripH;
  ctx.fillStyle = STRIP.bg;
  ctx.fillRect(0, y, w, stripH);
  ctx.fillStyle = STRIP.rule;
  ctx.fillRect(0, y, w, STRIP.rulePx);
  const text = (caption || "").trim().toUpperCase();
  if (text === "") return;
  const maxWidth = w * 0.9;
  let size = Math.round(stripH * 0.52);
  let lines = [text];
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (;;) {
    ctx.font = `${size}px Anton, "Arial Black", sans-serif`;
    lines = wrapCaption(ctx, text, maxWidth);
    const widest = Math.max(...lines.map((line) => ctx.measureText(line).width));
    const fitsWidth = widest <= maxWidth;
    const fitsHeight = lines.length * size * 1.15 <= stripH - STRIP.rulePx - 8;
    if ((fitsWidth && fitsHeight) || size <= 18) break;
    size = Math.max(18, Math.round(size * 0.92));
  }
  ctx.font = `${size}px Anton, "Arial Black", sans-serif`;
  ctx.shadowColor = NEON.glow;
  ctx.shadowBlur = Math.round(stripH * 0.16);
  ctx.fillStyle = "#fff7ec";
  const gap = size * 1.12;
  const firstY = y + stripH / 2 - ((lines.length - 1) * gap) / 2;
  lines.forEach((line, i) => ctx.fillText(line, w / 2, firstY + i * gap));
  ctx.shadowBlur = 0;
}

/**
 * Draw the whole cover on canvas from state:
 * { size, caption, panels: [{ img, focusY } | null, ...] }.
 * Resizes the canvas to the chosen export size first.
 */
export function drawCover(canvas, state) {
  const size = SIZES[state.size] ?? SIZES.portrait;
  canvas.width = size.w;
  canvas.height = size.h;
  const ctx = canvas.getContext("2d");
  const rects = panelLayout(size.w, size.h);
  rects.forEach((rect, i) => drawPanel(ctx, state.panels[i] ?? null, rect));
  drawStrip(ctx, state.caption, size.w, size.h);
  return { w: size.w, h: size.h };
}
