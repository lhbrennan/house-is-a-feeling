export type LoopLength = "1m" | "2m" | "4m";

export const CHANNEL_NOTES = [
  "Perc2",
  "Perc1",
  "OpenHat",
  "ClosedHat",
  "Snare",
  "Clap",
  "Kick2",
  "Kick1",
] as const;
export type ChannelNote = (typeof CHANNEL_NOTES)[number];
