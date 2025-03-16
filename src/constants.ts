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
  Snare: ["S_March", "S_Disco", "S_Pap", "S_Punch", "S_Verb", "S_Alien"],
  Clap: [
    "C_Chuck",
    "C_Kerplap",
    "C_Nautilus",
    "C_Slock",
    "C_Spank",
    "C_Slap",
    "C_Kash",
  ],
  Kick2: [
    "K2_Thump",
    "K2_Short",
    "K2_Vinyl",
    "K2_Tonic",
    "K2_Rudebot",
  ],
  Kick1: [
    "K1_Coffee",
    "K1_Peggy",
    "K1_Mouse",
    "K1_Charlotte",
    "K1_Thunk",
    "K1_Hard",
    "K1_Leftfield",
  ],
};
