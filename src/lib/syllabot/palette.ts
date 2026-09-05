export const COURSE_PALETTE = [
  { color: "#e85d46", bg: "#fff0ec" },
  { color: "#6c63d9", bg: "#efedff" },
  { color: "#16856b", bg: "#e8f7f1" },
  { color: "#c58a1b", bg: "#fff7df" },
  { color: "#3b6ea8", bg: "#eaf2fb" },
  { color: "#9b4d80", bg: "#f8ebf3" },
] as const;

export function paletteForIndex(index: number) {
  return COURSE_PALETTE[index % COURSE_PALETTE.length];
}
