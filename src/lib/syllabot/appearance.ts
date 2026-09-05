import { isDestination, type CalendarDestination } from "./destinations";

export type ThemeId = "paper" | "concrete" | "olive" | "night";
export type WidgetId = "term" | "collision" | "due" | "brief" | "courses";

export type WidgetPref = { id: WidgetId; label: string; visible: boolean };

export type Appearance = {
  theme: ThemeId;
  accent: string;
  density: "comfortable" | "compact";
  destination: CalendarDestination;
  widgets: WidgetPref[];
  courseColors: Record<string, string>;
};

export const THEMES: { id: ThemeId; label: string; note: string }[] = [
  { id: "paper", label: "Paper", note: "Warm page, rust ink" },
  { id: "concrete", label: "Concrete", note: "Gallery white, black" },
  { id: "olive", label: "Olive", note: "Studio green" },
  { id: "night", label: "Night", note: "Dim desk lamp" },
];

export const ACCENTS = ["#b42318", "#171614", "#1f4d3a", "#1d3a6e", "#8a5a12", "#6b2d5b"];

export const DEFAULT_WIDGETS: WidgetPref[] = [
  { id: "term", label: "Term progress", visible: true },
  { id: "collision", label: "Pileups", visible: true },
  { id: "due", label: "Due this week", visible: true },
  { id: "brief", label: "Sunday brief", visible: true },
  { id: "courses", label: "Courses", visible: true },
];

export const DEFAULT_APPEARANCE: Appearance = {
  theme: "paper",
  accent: "#b42318",
  density: "comfortable",
  destination: "google",
  widgets: DEFAULT_WIDGETS,
  courseColors: {},
};

const KEY = "termwise-appearance-v1";
const LEGACY_KEYS = ["syllabot-appearance-v1"];
let cache: Appearance = DEFAULT_APPEARANCE;
const listeners = new Set<() => void>();

function normalize(value: Partial<Appearance> | null): Appearance {
  const widgets = DEFAULT_WIDGETS.map((widget) => {
    const saved = value?.widgets?.find((item) => item.id === widget.id);
    return saved ? { ...widget, visible: saved.visible } : widget;
  });
  return {
    ...DEFAULT_APPEARANCE,
    ...value,
    destination: isDestination(value?.destination) ? value.destination : DEFAULT_APPEARANCE.destination,
    widgets,
    courseColors: value?.courseColors ?? {},
  };
}

function readStoredAppearance() {
  if (typeof window === "undefined") return null;
  const current = window.localStorage.getItem(KEY);
  if (current) return current;
  for (const key of LEGACY_KEYS) {
    const legacy = window.localStorage.getItem(key);
    if (legacy) {
      window.localStorage.setItem(KEY, legacy);
      return legacy;
    }
  }
  return null;
}

if (typeof window !== "undefined") {
  try {
    const saved = readStoredAppearance();
    if (saved) cache = normalize(JSON.parse(saved));
  } catch {
    cache = DEFAULT_APPEARANCE;
  }
}

export function getAppearance() {
  return cache;
}

export function subscribeAppearance(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function writeAppearance(next: Appearance | ((current: Appearance) => Appearance)) {
  cache = typeof next === "function" ? next(cache) : next;
  if (typeof window !== "undefined") window.localStorage.setItem(KEY, JSON.stringify(cache));
  listeners.forEach((listener) => listener());
}

export function removeCourseColor(courseId: string) {
  writeAppearance((current) => {
    if (!(courseId in current.courseColors)) return current;
    const courseColors = { ...current.courseColors };
    delete courseColors[courseId];
    return { ...current, courseColors };
  });
}

export function moveWidget(widgets: WidgetPref[], id: WidgetId, direction: -1 | 1) {
  const index = widgets.findIndex((widget) => widget.id === id);
  const nextIndex = index + direction;
  if (index < 0 || nextIndex < 0 || nextIndex >= widgets.length) return widgets;
  const copy = [...widgets];
  const [item] = copy.splice(index, 1);
  copy.splice(nextIndex, 0, item);
  return copy;
}
