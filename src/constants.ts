export type LoopLength = "1m" | "2m" | "4m";

export const CHANNEL_NOTES = ["Hat", "Clap", "Kick"] as const;
export type ChannelNote = typeof CHANNEL_NOTES[number];

