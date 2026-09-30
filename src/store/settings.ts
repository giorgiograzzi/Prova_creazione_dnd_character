import { z } from "zod";
import { DEFAULT_SETTINGS, type Settings } from "../engine/settings";

// Impostazioni dell'app: regole di gioco + preferenze di salvataggio
export interface AppSettings extends Settings {
  backupReminderDays: number; // 0 = promemoria disattivato
  lastBackupAt: number | null;
}
export const DEFAULT_APP_SETTINGS: AppSettings = { ...DEFAULT_SETTINGS, backupReminderDays: 30, lastBackupAt: null };

const schema = z.object({
  weaponSwap: z.enum(["official", "house"]).catch(DEFAULT_APP_SETTINGS.weaponSwap),
  backupReminderDays: z.number().int().min(0).max(365).catch(DEFAULT_APP_SETTINGS.backupReminderDays),
  lastBackupAt: z.number().nullable().catch(null),
});

// Tollerante: valori mancanti o sbagliati tornano al default (impostazioni scritte da versioni diverse)
export function normalizeSettings(raw: unknown): AppSettings {
  return schema.parse(typeof raw === "object" && raw !== null ? raw : {});
}

export function backupDue(s: AppSettings, now = Date.now()): boolean {
  if (s.backupReminderDays === 0) return false;
  if (s.lastBackupAt === null) return true;
  return now - s.lastBackupAt >= s.backupReminderDays * 86_400_000;
}
