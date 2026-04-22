export const tokens = {
  colors: {
    background: "#F9F9F9",
    surface: "#F9F9F9",
    surfaceAlt: "#F3F3F3",       // level 1
    surfaceContainerLowest: "#FFFFFF",
    surfaceContainerLow: "#F3F3F3",
    surfaceContainerHighest: "#E2E2E2",
    textPrimary: "#1A1C1C",
    textSecondary: "#5d5d5d",
    textMuted: "#8c8c8c",
    border: "#E2E2E2",           // minimal use, usually outline_variant
    brand: "#F64509",            // Orange
    brandDark: "#111111",
    brandSoft: "#fff2ab",
    primary: "#AD2B00",
    primaryContainer: "#D93900",
    secondaryContainer: "#333333", // sturdy neutral
    success: "#2f9e44",
    warning: "#f59f00",
    danger: "#d64545",
    info: "#2b6cb0",
    inverse: "#ffffff",
    disabled: "#b8c1cc",
    shadow: "#1A1C1C",
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
  },
  radius: {
    sm: 0,   // brutally sharp
    md: 4,
    lg: 12,  // xl in spec (0.75rem)
    xl: 16,
    full: 9999, // action chips
  },
  typography: {
    caption: { fontFamily: "Manrope_400Regular", fontSize: 12, lineHeight: 16 },
    body: { fontFamily: "Manrope_500Medium", fontSize: 14, lineHeight: 20 },
    bodyStrong: { fontFamily: "Manrope_700Bold", fontSize: 14, lineHeight: 20 },
    title: { fontFamily: "SpaceGrotesk_600SemiBold", fontSize: 18, lineHeight: 24 },
    hero: { fontFamily: "SpaceGrotesk_700Bold", fontSize: 24, lineHeight: 32 },
    displayLg: { fontFamily: "SpaceGrotesk_700Bold", fontSize: 32, lineHeight: 40 },
    headlineSm: { fontFamily: "SpaceGrotesk_700Bold", fontSize: 20, lineHeight: 28 },
    labelMd: { fontFamily: "Manrope_600SemiBold", fontSize: 14, lineHeight: 20 },
  },
  shadows: {
    card: {
      shadowColor: "#1A1C1C",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.08,
      shadowRadius: 32,
      elevation: 0, // usually rely on tonal layering instead of strict android shadows
    },
  },
};
