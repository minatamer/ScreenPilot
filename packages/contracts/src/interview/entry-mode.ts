import { z } from "zod";

export const ENTRY_MODES = ["cv_assisted", "conversation_first"] as const;

export const entryModeSchema = z.enum(ENTRY_MODES);

export type EntryMode = z.infer<typeof entryModeSchema>;
