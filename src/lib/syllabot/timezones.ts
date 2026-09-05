export const TIMEZONES = [
  { id: "America/Los_Angeles", label: "Pacific (Los Angeles)" },
  { id: "America/Denver", label: "Mountain (Denver)" },
  { id: "America/Chicago", label: "Central (Chicago)" },
  { id: "America/New_York", label: "Eastern (New York)" },
  { id: "America/Phoenix", label: "Arizona" },
  { id: "Pacific/Honolulu", label: "Hawaii" },
  { id: "America/Anchorage", label: "Alaska" },
] as const;

export type TimeZoneId = (typeof TIMEZONES)[number]["id"];

export function isTimeZone(value: unknown): value is TimeZoneId {
  return typeof value === "string" && TIMEZONES.some((zone) => zone.id === value);
}
