// Design tokens matching the team's approved UI mockup.
// Keep every screen pulling colors/spacing from here so the whole app
// stays visually consistent as more screens get built by teammates.

export const colors = {
  primary: '#6C4CFF',        // vivid purple (brighter than a flat/dull purple)
  primaryDark: '#4E2FE0',
  primaryLight: '#EFE9FF',

  success: '#22C55E',        // vivid green for "confirmed"/"available" states
  successDark: '#16A34A',
  successLight: '#E7FAF0',

  warning: '#F59E0B',
  warningLight: '#FFF4E0',
  danger: '#EF4444',
  dangerLight: '#FDECEA',

  dark: '#14132B',           // dark screens (QR display, operator/admin)
  darkCard: '#211F42',

  background: '#F6F5FC',
  card: '#FFFFFF',
  border: '#ECE9F9',

  textPrimary: '#191833',
  textSecondary: '#6F6C90',
  textMuted: '#A5A2C4',
  white: '#FFFFFF'
};

// Gradient pairs — pass directly to <LinearGradient colors={...}>.
// This is what gives buttons/banners a "shiny", dimensional look instead
// of a single flat color fill.
export const gradients = {
  primary: ['#8467FF', '#5C3AF0'],
  primaryBanner: ['#7B5CFA', '#5333E8'],
  success: ['#34D976', '#1DA851']
};

export const spacing = {
  xs: 4, sm: 8, md: 16, lg: 24, xl: 32
};

export const radius = {
  sm: 8, md: 12, lg: 16, xl: 24, pill: 999
};

export const typography = {
  title: { fontSize: 20, fontWeight: '700', color: colors.textPrimary },
  subtitle: { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
  body: { fontSize: 14, color: colors.textPrimary },
  label: { fontSize: 12, fontWeight: '600', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 }
};

// Reusable shadow presets — gives cards/buttons a real "3D lift" instead of
// looking flat. shadow* props work on iOS, elevation works on Android; both
// are needed since RN doesn't unify them.
export const shadow = {
  card: {
    shadowColor: '#3B2E8A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 3
  },
  button: {
    shadowColor: '#5333E8',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6
  },
  buttonSuccess: {
    shadowColor: '#1DA851',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6
  }
};
