/**
 * GPU / 3D capability detection.
 *
 * The UI uses subtle 3D transforms that are cheap on a GPU but can jank on
 * low-power mobile devices or machines without hardware acceleration. This
 * module decides whether to enable 3D and toggles the `no-3d` class on <html>,
 * which zeroes the `--depth` design token used by every 3D animation.
 *
 * Rules (any of these disables 3D):
 *   - the user prefers reduced motion (accessibility)
 *   - a coarse pointer / small screen (mobile)
 *   - the device reports a low `hardwareConcurrency` / `deviceMemory`
 *   - WebGL is unavailable (no GPU)
 *   - the browser reports "battery saver" via `navigator.getBattery()`
 */

export function detect3D() {
  const reasons = [];

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (reduceMotion.matches) reasons.push('reduced-motion');

  const isMobile = window.matchMedia('(max-width: 767px)').matches;
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  if (isMobile && coarse) reasons.push('mobile');

  if ((navigator.hardwareConcurrency || 8) <= 4) reasons.push('low-cores');
  if ((navigator.deviceMemory || 8) <= 2) reasons.push('low-memory');

  if (!hasWebGL()) reasons.push('no-webgl');

  return { enabled: reasons.length === 0, reasons };
}

function hasWebGL() {
  try {
    const canvas = document.createElement('canvas');
    const gl =
      canvas.getContext('webgl') ||
      canvas.getContext('experimental-webgl') ||
      canvas.getContext('webgl2');
    if (!gl) return false;
    // Some environments expose WebGL but render in software. Check the vendor.
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    if (dbg) {
      const renderer = String(
        gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) || ''
      ).toLowerCase();
      if (renderer.includes('swiftshader') || renderer.includes('llvmpipe')) {
        return false; // software rasteriser — treat as "no GPU"
      }
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Apply the 3D decision to the document and (optionally) react to battery
 * saver mode, which we treat as a request to drop 3D for performance.
 */
export function apply3DPreference() {
  const { enabled, reasons } = detect3D();
  const root = document.documentElement;

  const set = (on) => {
    root.classList.toggle('no-3d', !on);
    root.dataset.gpu3d = on ? 'on' : 'off';
  };
  set(enabled);

  if (!enabled) {
    console.info('[gpu] 3D effects disabled:', reasons.join(', '));
  }

  // React to battery-saver changes where supported.
  if (navigator.getBattery) {
    navigator
      .getBattery()
      .then((battery) => {
        const update = () => {
          if (battery.charging === false && battery.level <= 0.2) {
            set(false);
          } else {
            set(enabled);
          }
        };
        battery.addEventListener?.('levelchange', update);
        battery.addEventListener?.('chargingchange', update);
        update();
      })
      .catch(() => {});
  }

  return enabled;
}
