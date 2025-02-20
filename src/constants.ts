export type LoopLength = "1m" | "2m" | "4m";

export const CHANNEL_NOTES = [ // TODO: rename to CHANNEL_NAMES
  "Perc2",
  "Perc1",
  "OpenHat",
  "ClosedHat",
  "Snare",
  "Clap",
  "Kick2",
  "Kick1",
] as const;
export type ChannelNotes = typeof CHANNEL_NOTES;
export type ChannelNote = (typeof CHANNEL_NOTES)[number];
