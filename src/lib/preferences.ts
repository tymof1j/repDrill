export type ArrowTheme = 'sapphire' | 'sage' | 'electric';
export type BoardBrushConfig = { key: string; color: string; opacity: number; lineWidth: number };
export type BoardBrushes = {
  green: BoardBrushConfig;
  red: BoardBrushConfig;
  blue: BoardBrushConfig;
  yellow: BoardBrushConfig;
  [color: string]: BoardBrushConfig;
};

export const ARROW_THEME_STORAGE_KEY = 'repdrill-arrow-theme';
export const PREFERENCES_EVENT = 'repdrill-preferences';

export const DEFAULT_ARROW_THEME: ArrowTheme = 'sapphire';

export function normalizeArrowTheme(value: string | null | undefined): ArrowTheme {
  if (value === 'sapphire' || value === 'sage' || value === 'electric') {
    return value;
  }
  if (value === 'default' || value === 'modern' || value === 'amber') return DEFAULT_ARROW_THEME;
  return DEFAULT_ARROW_THEME;
}

export function getArrowTheme(): ArrowTheme {
  if (typeof window === 'undefined') return DEFAULT_ARROW_THEME;
  return normalizeArrowTheme(window.localStorage.getItem(ARROW_THEME_STORAGE_KEY));
}

export function setArrowTheme(value: ArrowTheme) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(ARROW_THEME_STORAGE_KEY, value);
}

export function emitPreferencesChanged(detail?: { arrowTheme?: ArrowTheme }) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(PREFERENCES_EVENT, { detail }));
}

export function getArrowBrushes(theme: ArrowTheme): string[] {
  if (theme === 'sapphire') {
    return ['sapphireBlue', 'sapphireSoft', 'sapphireDeep', 'sapphirePale', 'sapphireInk', 'sapphireNight'];
  }
  if (theme === 'sage') {
    return ['sageDeep', 'sagePeridot', 'sageMint', 'sageSoft'];
  }
  if (theme === 'electric') {
    return ['electricGreen', 'electricRed', 'electricDeepGreen', 'electricBlue'];
  }
  return ['sapphireBlue', 'sapphireSoft', 'sapphireDeep', 'sapphirePale', 'sapphireInk', 'sapphireNight'];
}

export function getHintBrush(theme: ArrowTheme): string {
  if (theme === 'sapphire') return 'sapphirePale';
  if (theme === 'sage') return 'sageMint';
  if (theme === 'electric') return 'electricGreen';
  return 'sapphirePale';
}

export function getBoardBrushes(theme: ArrowTheme): BoardBrushes | undefined {
  const keyPrefix = theme === 'sapphire' ? 'sp' : theme === 'sage' ? 'sg' : 'el';
  const manualPalette = {
    sapphire: ['#0474C4', '#5379AE', '#A8C4EC', '#06457F'],
    sage: ['#345C32', '#9CAC54', '#A7F0DD', '#97CD97'],
    electric: ['#BEEF00', '#FF0028', '#657A00', '#1400C6'],
  }[theme];
  return {
    green: { key: `${keyPrefix}-g`, color: manualPalette[0], opacity: 0.95, lineWidth: 12 },
    red: { key: `${keyPrefix}-r`, color: manualPalette[1], opacity: 0.95, lineWidth: 12 },
    blue: { key: `${keyPrefix}-b`, color: manualPalette[2], opacity: 0.95, lineWidth: 12 },
    yellow: { key: `${keyPrefix}-y`, color: manualPalette[3], opacity: 0.95, lineWidth: 12 },
    paleBlue: { key: `${keyPrefix}-pb`, color: manualPalette[2], opacity: 0.45, lineWidth: 15 },
    paleGreen: { key: `${keyPrefix}-pg`, color: manualPalette[0], opacity: 0.45, lineWidth: 15 },
    paleRed: { key: `${keyPrefix}-pr`, color: manualPalette[1], opacity: 0.45, lineWidth: 15 },
    paleGrey: { key: `${keyPrefix}-pgr`, color: manualPalette[3], opacity: 0.35, lineWidth: 15 },
    purple: { key: `${keyPrefix}-purple`, color: manualPalette[3], opacity: 0.65, lineWidth: 10 },
    pink: { key: `${keyPrefix}-pink`, color: manualPalette[1], opacity: 0.5, lineWidth: 10 },
    white: { key: 'white', color: 'white', opacity: 1, lineWidth: 10 },
    sapphireBlue: { key: 'sapphireBlue', color: '#0474C4', opacity: 0.95, lineWidth: 12 },
    sapphireSoft: { key: 'sapphireSoft', color: '#5379AE', opacity: 0.95, lineWidth: 12 },
    sapphireDeep: { key: 'sapphireDeep', color: '#2C444C', opacity: 0.95, lineWidth: 12 },
    sapphirePale: { key: 'sapphirePale', color: '#A8C4EC', opacity: 0.95, lineWidth: 12 },
    sapphireInk: { key: 'sapphireInk', color: '#06457F', opacity: 0.95, lineWidth: 12 },
    sapphireNight: { key: 'sapphireNight', color: '#262B40', opacity: 0.95, lineWidth: 12 },
    sageDeep: { key: 'sageDeep', color: '#345C32', opacity: 0.95, lineWidth: 12 },
    sagePeridot: { key: 'sagePeridot', color: '#9CAC54', opacity: 0.95, lineWidth: 12 },
    sageMint: { key: 'sageMint', color: '#A7F0DD', opacity: 0.95, lineWidth: 12 },
    sageSoft: { key: 'sageSoft', color: '#97CD97', opacity: 0.95, lineWidth: 12 },
    electricGreen: { key: 'electricGreen', color: '#BEEF00', opacity: 0.95, lineWidth: 12 },
    electricRed: { key: 'electricRed', color: '#FF0028', opacity: 0.95, lineWidth: 12 },
    electricDeepGreen: { key: 'electricDeepGreen', color: '#657A00', opacity: 0.95, lineWidth: 12 },
    electricBlue: { key: 'electricBlue', color: '#1400C6', opacity: 0.95, lineWidth: 12 },
  };
}
