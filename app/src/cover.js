// Draws the multi-panel GTA-style cover: three photo panels with diagonal white gutters,
// a colour grade, and bold Anton caption lettering. Pure canvas, no network, no fonts
// beyond the Anton file shipped under app/fonts/.

/** The three post sizes the app exports, keyed by their label. */
export const EXPORT_SIZES = {
  '1080x1080': [1080, 1080],
  '1080x1350': [1080, 1350],
  '1920x1080': [1920, 1080],
};

/** The colour grades: a wash over the panels plus a vignette. */
export const GRADES = {
  sunset: { name: 'Sunset', wash: ['rgba(255, 122, 60, 0.28)', 'rgba(200, 30, 120, 0.42)'], glow: 'rgba(255, 196, 92, 0.55)' },
  neon: { name: 'Neon Nights', wash: ['rgba(55, 224, 255, 0.30)', 'rgba(255, 79, 168, 0.40)'], glow: 'rgba(55, 224, 255, 0.45)' },
  dusk: { name: 'Palm Dusk', wash: ['rgba(120, 60, 200, 0.30)', 'rgba(255, 170, 60, 0.30)'], glow: 'rgba(255, 190, 110, 0.40)' },
  mono: { name: 'Mono', wash: ['rgba(255, 255, 255, 0.00)', 'rgba(0, 0, 0, 0.18)'], glow: 'rgba(255, 255, 255, 0.25)' },
};

/**
 * The three panel polygons for a cover of this size, plus the caption band.
 * The hero panel takes the left; two panels stack on the right. The hero's
 * right edge slants, so the white gutter between the panels runs diagonally.
 */
export function layoutPanels(width, height) {
  const wide = width > height;
  const heroTop = (wide ? 0.46 : 0.58) * width;
  const heroBottom = heroTop - 0.04 * width;
  const gutter = Math.max(6, Math.round(width * 0.008));
  const midY = 0.5 * height;
  const heroMid = heroTop - 0.04 * width * 0.5;
  const panels = [
    [[0, 0], [heroTop, 0], [heroBottom, height], [0, height]],
    [[heroTop + gutter, 0], [width, 0], [width, midY], [heroMid + gutter, midY]],
    [[heroMid + gutter, midY + gutter], [width, midY + gutter], [width, height], [heroBottom + gutter, height]],
  ];
  const band = { x: 0, y: height * 0.80, width, height: height * 0.20 };
  const seams = [
    [[heroTop, 0], [heroBottom, height]],
    [[heroMid, midY], [width, midY]],
  ];
  return { panels, band, seams, gutter };
}

/** Ray-casting point-in-polygon test, for picking a panel under the pointer. */
export function panelAtPoint(panels, x, y) {
  for (let i = panels.length - 1; i >= 0; i--) {
    const poly = panels[i];
    let inside = false;
    for (let a = 0, b = poly.length - 1; a < poly.length; b = a++) {
      const [ax, ay] = poly[a];
      const [bx, by] = poly[b];
      if ((ay > y) !== (by > y) && x < ((bx - ax) * (y - ay)) / (by - ay) + ax) inside = !inside;
    }
    if (inside) return i;
  }
  return -1;
}

/** The bounding box of one panel, for the editor's selection overlay. */
export function panelBounds(panels, index) {
  const poly = panels[index];
  const xs = poly.map((p) => p[0]);
  const ys = poly.map((p) => p[1]);
  return {
    x: Math.min(...xs),
    y: Math.min(...ys),
    width: Math.max(...xs) - Math.min(...xs),
    height: Math.max(...ys) - Math.min(...ys),
  };
}

/** Draws one photo cover-fit inside a polygon, with zoom and pan offsets. */
function drawPanelPhoto(ctx, poly, photo, zoom, offsetX, offsetY) {
  const xs = poly.map((p) => p[0]);
  const ys = poly.map((p) => p[1]);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  const w = Math.max(...xs) - x;
  const h = Math.max(...ys) - y;
  ctx.save();
  ctx.beginPath();
  poly.forEach(([px, py], i) => (i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)));
  ctx.closePath();
  ctx.clip();
  if (photo) {
    const scale = Math.max(w / photo.naturalWidth, h / photo.naturalHeight) * zoom;
    const dw = photo.naturalWidth * scale;
    const dh = photo.naturalHeight * scale;
    const maxX = Math.max(0, (dw - w) / 2 / dw);
    const maxY = Math.max(0, (dh - h) / 2 / dh);
    const ox = Math.max(-maxX, Math.min(maxX, offsetX));
    const oy = Math.max(-maxY, Math.min(maxY, offsetY));
    ctx.drawImage(photo, x + (w - dw) / 2 + ox * dw, y + (h - dh) / 2 + oy * dh, dw, dh);
  } else {
    ctx.fillStyle = '#2a1638';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#5c4a72';
    ctx.font = `600 ${Math.round(h * 0.045)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('ADD A PHOTO', x + w / 2, y + h / 2);
  }
  ctx.restore();
}

/** The grade wash, sun glow and vignette over the whole cover. */
function applyGrade(ctx, width, height, grade) {
  const wash = ctx.createLinearGradient(0, 0, width * 0.25, height);
  wash.addColorStop(0, grade.wash[0]);
  wash.addColorStop(1, grade.wash[1]);
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, width, height);
  const glow = ctx.createRadialGradient(
    width * 0.74, height * 0.16, 0,
    width * 0.74, height * 0.16, width * 0.34,
  );
  glow.addColorStop(0, grade.glow);
  glow.addColorStop(1, 'rgba(255, 196, 92, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);
  const vignette = ctx.createRadialGradient(
    width / 2, height / 2, Math.min(width, height) * 0.36,
    width / 2, height / 2, Math.max(width, height) * 0.72,
  );
  vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vignette.addColorStop(1, 'rgba(0, 0, 0, 0.38)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, width, height);
}

/** Splits a caption into at most two lines that fit the cover width. */
function wrapCaption(ctx, text, maxWidth) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width <= maxWidth || !line) {
      line = next;
    } else {
      lines.push(line);
      line = word;
    }
    if (lines.length === 1 && line && ctx.measureText(line).width > maxWidth) {
      lines.push(line);
      line = '';
      break;
    }
  }
  if (line) lines.push(line);
  return lines.slice(0, 2);
}

/** The tagline up top and the big caption across the foot of the cover. */
function drawCaptionLettering(ctx, width, height, band, caption, tagline) {
  const shade = ctx.createLinearGradient(0, band.y - height * 0.06, 0, height);
  shade.addColorStop(0, 'rgba(8, 3, 16, 0)');
  shade.addColorStop(1, 'rgba(8, 3, 16, 0.88)');
  ctx.fillStyle = shade;
  ctx.fillRect(0, band.y - height * 0.06, width, height - band.y + height * 0.06);

  const tag = tagline.trim().toUpperCase();
  if (tag) {
    const tagSize = Math.round(height * 0.024);
    ctx.font = `700 ${tagSize}px system-ui, sans-serif`;
    try { ctx.letterSpacing = '6px'; } catch { /* older canvas: no tracking */ }
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffd9ec';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = tagSize * 0.4;
    ctx.fillText(tag, width * 0.035, height * 0.055);
    ctx.shadowBlur = 0;
    try { ctx.letterSpacing = '0px'; } catch { /* reset */ }
    ctx.fillStyle = '#ff4fa8';
    ctx.fillRect(width * 0.035, height * 0.068, width * 0.12, Math.max(3, height * 0.004));
  }

  const text = caption.trim().toUpperCase() || 'SUNSET HEIST';
  let size = Math.round(height * 0.115);
  ctx.font = `${size}px Anton, "Arial Black", sans-serif`;
  const maxWidth = width * 0.92;
  let lines = wrapCaption(ctx, text, maxWidth);
  while ((lines.length > 2 || lines.some((l) => ctx.measureText(l).width > maxWidth)) && size > 24) {
    size -= 4;
    ctx.font = `${size}px Anton, "Arial Black", sans-serif`;
    lines = wrapCaption(ctx, text, maxWidth);
  }
  ctx.textAlign = 'center';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#12061c';
  ctx.lineWidth = Math.max(4, size * 0.14);
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
  ctx.shadowBlur = size * 0.18;
  ctx.shadowOffsetY = size * 0.05;
  const lineHeight = size * 1.02;
  const firstBaseline = height - height * 0.045 - (lines.length - 1) * lineHeight;
  lines.forEach((lineText, i) => {
    const baseline = firstBaseline + i * lineHeight;
    ctx.strokeText(lineText, width / 2, baseline);
    ctx.fillText(lineText, width / 2, baseline);
  });
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
}

/**
 * Draws the whole cover onto a canvas at the canvas's own size.
 * `state` is { sizeKey, grade, caption, tagline, panels: [{ img, zoom, ox, oy }] }.
 * A panel with no image draws an empty slot. Mono desaturates the panels.
 */
export function drawCoverArt(canvas, state) {
  const ctx = canvas.getContext('2d');
  const { width, height } = canvas;
  const layout = layoutPanels(width, height);
  ctx.fillStyle = '#160a24';
  ctx.fillRect(0, 0, width, height);
  state.panels.forEach((panel, i) => {
    drawPanelPhoto(ctx, layout.panels[i], panel.img, panel.zoom, panel.ox, panel.oy);
  });
  if (state.grade === 'mono') {
    ctx.save();
    ctx.globalCompositeOperation = 'saturation';
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }
  applyGrade(ctx, width, height, GRADES[state.grade] ?? GRADES.sunset);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = layout.gutter;
  ctx.lineCap = 'round';
  layout.seams.forEach(([a, b]) => {
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
    ctx.stroke();
  });
  drawCaptionLettering(ctx, width, height, layout.band, state.caption, state.tagline);
  return layout;
}
