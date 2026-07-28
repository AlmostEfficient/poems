import { useColorScheme } from 'react-native';

export const palette = {
  light: {
    canvas: '#F8F6F2',
    surface: '#FFFFFF',
    surfaceMuted: '#F1EEE8',
    ink: '#26231F',
    secondary: '#746E66',
    tertiary: '#A39C92',
    border: 'rgba(74, 64, 54, 0.12)',
    accent: '#D85E4F',
    accentSoft: '#F7E4DF',
    success: '#46745B',
    danger: '#B34B43',
  },
  dark: {
    canvas: '#171614',
    surface: '#23211E',
    surfaceMuted: '#2D2A26',
    ink: '#F7F3EC',
    secondary: '#B9B1A6',
    tertiary: '#827A70',
    border: 'rgba(255, 245, 232, 0.12)',
    accent: '#F17A68',
    accentSoft: '#442B27',
    success: '#77A98A',
    danger: '#ED8479',
  },
} as const;

export interface AppColors {
  canvas: string;
  surface: string;
  surfaceMuted: string;
  ink: string;
  secondary: string;
  tertiary: string;
  border: string;
  accent: string;
  accentSoft: string;
  success: string;
  danger: string;
}

export function useAppColors(): AppColors {
  return useColorScheme() === 'dark' ? palette.dark : palette.light;
}

export const type = {
  display: 'Georgia',
  prose: 'Georgia',
} as const;
