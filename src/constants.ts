export type LoopLength = "1m" | "2m" | "4m";

export const CHANNEL_NAMES = [
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

export const SAMPLES: Record<ChannelName, string[]> = {
  Perc2: ["perc_2", "reverse_hat", "long_hat"],
  Perc1: ["perc_1", "rim"],
  OpenHat: [
    "open_hat_1",
    "open_hat_2",
    "open_hat_3",
    "open_hat_4",
    "open_hat_techno",
  ],
  ClosedHat: ["closed_hat", "closed_hat_2", "closed_hat_3"],
  Snare: ["snare", "snare_disco"],
  Clap: ["clap", "clap_kshmr"],
  Kick2: ["kick_thump"],
  Kick1: ["kick", "kick_techno", "kick_leftfield"],
};
