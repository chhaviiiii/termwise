import { mkdirSync, readFileSync, readdirSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";

type StoredCalendar = { ics: string; createdAt: number };

const TTL_MS = 1000 * 60 * 60 * 24;
const DIR = join("/tmp", "termwise-calendars");
const memory = new Map<string, StoredCalendar>();

function ensureDir() {
  mkdirSync(DIR, { recursive: true });
}

function expired(createdAt: number) {
  return Date.now() - createdAt > TTL_MS;
}

function prune() {
  for (const [id, value] of memory) {
    if (expired(value.createdAt)) memory.delete(id);
  }
  try {
    ensureDir();
    for (const file of readdirSync(DIR)) {
      if (!file.endsWith(".json")) continue;
      const path = join(DIR, file);
      try {
        const stored = JSON.parse(readFileSync(path, "utf8")) as StoredCalendar;
        if (expired(stored.createdAt)) unlinkSync(path);
      } catch {
        unlinkSync(path);
      }
    }
  } catch {
    /* /tmp may be unavailable; in-memory is enough in-process */
  }
}

export function publishCalendarIcs(ics: string) {
  prune();
  const id = crypto.randomUUID().slice(0, 8);
  const record = { ics, createdAt: Date.now() };
  memory.set(id, record);
  try {
    ensureDir();
    writeFileSync(join(DIR, `${id}.json`), JSON.stringify(record), "utf8");
  } catch {
    /* keep the in-memory copy */
  }
  return id;
}

export function getPublishedCalendar(id: string) {
  prune();
  const cached = memory.get(id);
  if (cached && !expired(cached.createdAt)) return cached;
  try {
    const stored = JSON.parse(readFileSync(join(DIR, `${id}.json`), "utf8")) as StoredCalendar;
    if (!stored.ics || expired(stored.createdAt)) return null;
    memory.set(id, stored);
    return stored;
  } catch {
    return null;
  }
}
