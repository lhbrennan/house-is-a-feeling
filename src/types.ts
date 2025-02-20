export type PadState = 0 | 1 | 2 | 3;
export type GridState = Array<Array<PadState>>;
export type ChannelFxType = {
  time: string; // TODO: rename this to delayTime // TODO: type this better
  wet: number; // TODO: rename this to delayWet
  feedback: number; // TODO: rename this to delayFeedback
  reverbSend: number;
};