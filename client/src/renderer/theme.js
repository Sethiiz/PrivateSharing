window.TDG = window.TDG || {};

TDG.theme = (() => {
  const PRESETS = {
    purple: { label: 'Roxo', accent: '#9184d9', bg: '#161826' },
    blue: { label: 'Azul', accent: '#5b8cff', bg: '#121a2b' },
    green: { label: 'Verde', accent: '#54d98a', bg: '#101f19' },
    red: { label: 'Vermelho', accent: '#e2666b', bg: '#211416' },
    orange: { label: 'Laranja', accent: '#f2a65a', bg: '#231a10' },
    pink: { label: 'Rosa', accent: '#e480c0', bg: '#201323' },
  };

  function hexToHsl(hex) {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const l = (max + min) / 2;
    let h = 0;
    let s = 0;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        default: h = (r - g) / d + 4;
      }
      h /= 6;
    }
    return [h * 360, s * 100, l * 100];
  }

  function hslToHex(h, s, l) {
    s /= 100;
    l /= 100;
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - c / 2;
    let rgb;
    if (h < 60) rgb = [c, x, 0];
    else if (h < 120) rgb = [x, c, 0];
    else if (h < 180) rgb = [0, c, x];
    else if (h < 240) rgb = [0, x, c];
    else if (h < 300) rgb = [x, 0, c];
    else rgb = [c, 0, x];
    const toHex = (v) => Math.round((v + m) * 255).toString(16).padStart(2, '0');
    return `#${toHex(rgb[0])}${toHex(rgb[1])}${toHex(rgb[2])}`;
  }

  // Espelha os degraus 100-900 do sistema de design (claro pra escuro) —
  // gerados a partir da tonalidade da cor de destaque escolhida.
  const RAMP_LIGHTNESS = { 100: 95, 200: 90, 300: 83, 400: 74, 500: 63, 600: 52, 700: 41, 800: 30, 900: 21 };

  function ramp(hex, satScale) {
    const [h, s] = hexToHsl(hex);
    const sat = Math.min(90, s * satScale + 10);
    const out = {};
    for (const [step, lightness] of Object.entries(RAMP_LIGHTNESS)) out[step] = hslToHex(h, sat, lightness);
    return out;
  }

  function apply(themeId) {
    const preset = PRESETS[themeId] || PRESETS.purple;
    const root = document.documentElement.style;

    const accentRamp = ramp(preset.accent, 1);
    const accent2Ramp = ramp(preset.accent, 0.85);
    root.setProperty('--color-accent', preset.accent);
    root.setProperty('--color-accent-2', accent2Ramp[500]);
    for (const [step, hex] of Object.entries(accentRamp)) root.setProperty(`--color-accent-${step}`, hex);
    for (const [step, hex] of Object.entries(accent2Ramp)) root.setProperty(`--color-accent-2-${step}`, hex);

    const [h, s, l] = hexToHsl(preset.bg);
    root.setProperty('--color-bg', preset.bg);
    root.setProperty('--color-surface', hslToHex(h, Math.min(60, s + 6), Math.min(95, l + 5)));
  }

  return { PRESETS, apply };
})();
