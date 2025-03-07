export type PadVelocity = 0 | 1 | 2 | 3;
export type GridState = Array<Array<PadVelocity>>;
export type ChannelFxState = {
  delayTime: string;
  delayWet: number;
  delayFeedback: number;
  reverbSend: number;
};
export type GlobalReverbSettings = {
  decay: number;
  preDelay: number;
  wet: number;
};
export type BusCompressorSettings = {
  enabled: boolean;
  threshold: number;
  ratio: number;
  attack: number;
  release: number;
  knee: number;
  makeUpGain: number;
  mix: number;
};
export type PatternId = "A" | "B" | "C" | "D";
