export type PadVelocity = 0 | 1 | 2 | 3;
export type GridState = Array<Array<PadVelocity>>;
export type ChannelFxState = {
  time: string; // TODO: rename this to delayTime // TODO: type this better
  wet: number; // TODO: rename this to delayWet
  feedback: number; // TODO: rename this to delayFeedback
  reverbSend: number;
};
export type GlobalReverbSettings = {
  decay: number;
  preDelay: number;
  wet: number;
};
