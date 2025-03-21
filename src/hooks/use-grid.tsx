import { useState, useRef, useEffect } from "react";
import type { GridState, PadVelocity, PatternId } from "@/types";

function createEmptyGrid(numChannels: number, numSteps: number): GridState {
  return Array.from({ length: numChannels }).map(() =>
    Array.from({ length: numSteps }).map(() => 0),
  );
}

/**
 * This hook manages four separate patterns (A, B, C, D), each 16 steps,
 * plus functions to toggle cells, shift, duplicate, etc.
 */
export function useGrid(numChannels: number) {
  const [patterns, setPatterns] = useState<{
    A: GridState;
    B: GridState;
    C: GridState;
    D: GridState;
  }>({
    A: createEmptyGrid(numChannels, 16),
    B: createEmptyGrid(numChannels, 16),
    C: createEmptyGrid(numChannels, 16),
    D: createEmptyGrid(numChannels, 16),
  });

  // Provide access to the latest patterns for closures that would otherwise capture stale state values
  const patternsRef = useRef(patterns);
  useEffect(() => {
    patternsRef.current = patterns;
  }, [patterns]);
  const getLatestPatterns = () => patternsRef.current;

  const toggleCell = (
    pattern: PatternId,
    row: number,
    col: number,
    newValue: PadVelocity,
  ) => {
    setPatterns((prev) => {
      const next = structuredClone(prev);
      next[pattern][row][col] = newValue;
      return next;
    });
  };

  const shiftGrid = (pattern: PatternId, direction: "left" | "right") => {
    setPatterns((prev) => {
      const next = { ...prev };
      const clonedPattern = next[pattern].map((row) => [...row]);

      for (let i = 0; i < clonedPattern.length; i++) {
        if (direction === "left") {
          clonedPattern[i].push(clonedPattern[i].shift()!);
        } else {
          clonedPattern[i].unshift(clonedPattern[i].pop()!);
        }
      }
      next[pattern] = clonedPattern;
      return next;
    });
  };

  return {
    patterns,
    getLatestPatterns,
    setPatterns,
    toggleCell,
    shiftGrid,
  };
}
