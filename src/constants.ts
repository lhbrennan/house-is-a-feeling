export type LoopLength = "1m" | "2m" | "4m";

export const PAD_STATES = {
  off: "off",
  low: "low",
  medium: "medium",
  high: "high",
} as const;

export type PadStates = keyof typeof PAD_STATES;