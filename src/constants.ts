export type LoopLength = "1m" | "2m" | "4m";

export const CHANNEL_NAMES = [ // TODO: rename to CHANNEL_NAMES
  "Perc2",
  "Perc1",
  "OpenHat",
  "ClosedHat",
  "Snare",
  "Clap",
  "Kick2",
  "Kick1",
] as const;
export type ChannelNames = typeof CHANNEL_NAMES;
export type ChannelName = (typeof CHANNEL_NAMES)[number];
