// Simple typed color map for use outside Tailwind utility classes.
export const AntivityColors = {
  purple: "#7D47B9",
  brightBlue: "#6CD3FF",
  secondaryBlue: "#50B0FF",
  green: "#62CD99",
  lightBlue: "#E2F9FF",
} as const

export type AntivityColorKey = keyof typeof AntivityColors
