// Neon Sunset Cover Studio — the four shots.
//
// Each shot is one screenshot: which sample leads the hero panel, what the
// caption says, and which post size the cover is. A shot fills all four
// panels with a different sample each, so every cover shows four people.
// The app reads ?shot=<id> on load; the screenshot run loads each URL.

// The shots, in the order the screenshots are named.
export const SHOTS = [
  {
    id: "1-cover",
    label: "Square cover",
    size: "square",
    hero: "boulevard",
    caption: "NEON SUNSET",
  },
  {
    id: "2-editor",
    label: "Editor with a photo loaded",
    size: "portrait",
    hero: "rooftop",
    caption: "VICE CITY NIGHTS",
  },
  {
    id: "3-cover",
    label: "Portrait cover",
    size: "portrait",
    hero: "pier",
    caption: "SUNSET DRIVE",
  },
  {
    id: "4-cover",
    label: "Wide cover",
    size: "wide",
    hero: "skate",
    caption: "NEON SUNSET",
  },
];

/**
 * Apply a shot: fill the panels with its hero sample leading, set its
 * caption and size. fillAllSamples(hero) is the editor's own function,
 * so the shot uses the same path a person clicking would.
 */
export async function applyShot(fillAllSamples, shot) {
  await fillAllSamples(shot.hero);
}
