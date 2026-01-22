export const fortisTokens = {
  brand: '46 211 198', // #2ED3C6
  brandForeground: '11 18 32', // #0B1220

  bg: '11 18 32', // #0B1220
  bg2: '17 26 46', // #111A2E
  surface: '22 31 51', // #161F33
  surface2: '28 40 66', // #1C2842
  border: '35 48 79', // #23304F

  text: '230 234 242', // #E6EAF2
  text2: '168 176 194', // #A8B0C2
  text3: '107 116 136', // #6B7488
  textDisabled: '74 82 102', // #4A5266

  success: '61 220 151', // #3DDC97
  warning: '244 196 48', // #F4C430
  error: '229 83 61', // #E5533D
  info: '77 136 255', // #4D88FF
} as const;

export type FortisTokenKey = keyof typeof fortisTokens;

export const tokenToCssVar = (key: FortisTokenKey) => `var(--${key.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase())})`;
