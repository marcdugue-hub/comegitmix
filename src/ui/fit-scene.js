// Fits the panel + scene layout to the window. The scene keeps its 1012 x 796 coordinate frame and is
// zoomed as a whole (CSS `zoom: var(--scene-scale)`); the panel widens a little on large screens.
// Below the reference size the scale stops at MIN_SCALE and the page scrolls, as before.

export const REF = { panel: 368, sceneW: 1012, sceneH: 796, gap: 20, pad: 20 };
const MIN_SCALE = 0.8;
const MAX_SCALE = 2;
const MAX_PANEL_SCALE = 1.2;

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/**
 * Scale for the scene and the panel, given the room left for the layout.
 * @param {{ width: number, height: number }} room width of the page, height below the header
 * @returns {{ scene: number, panel: number }}
 */
export function computeScale({ width, height }) {
  const fit = (panel) => Math.min(
    (width - 2 * REF.pad - REF.gap - REF.panel * panel) / REF.sceneW,
    (height - 2 * REF.pad) / REF.sceneH,
  );
  // the panel grows with the scene but less; one refinement step is enough
  const panel = clamp(fit(1), 1, MAX_PANEL_SCALE);
  let scene = clamp(fit(panel), MIN_SCALE, MAX_SCALE);
  if (Math.abs(scene - 1) < 0.02) scene = 1; // the reference screen stays pixel-exact
  return { scene: Math.round(scene * 1000) / 1000, panel: Math.round(Math.min(panel, Math.max(1, scene)) * 1000) / 1000 };
}

/** Keeps --scene-scale and --panel-scale on <html> in step with the window size. */
export function startSceneFit(doc = document, win = window) {
  const root = doc.documentElement;
  const update = () => {
    const header = doc.querySelector('.app-header');
    const top = header ? header.getBoundingClientRect().bottom + win.scrollY : 0;
    const { scene, panel } = computeScale({ width: root.clientWidth, height: win.innerHeight - top });
    root.style.setProperty('--scene-scale', String(scene));
    root.style.setProperty('--panel-scale', String(panel));
  };
  update();
  win.addEventListener('resize', update);
  return update;
}
