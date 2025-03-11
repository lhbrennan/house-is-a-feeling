import { GridState } from "@/types";

export function createDefaultGrid(
  numChannels: number,
  maxSteps: number,
): GridState {
  return Array.from({ length: numChannels }, () => Array(maxSteps).fill(0));
}
