import { useState, useRef, useEffect } from "react";
import { createDefaultGrid } from "@/utils";
import type { GridState, PadVelocity } from "./types";
import type { LoopLength } from "./constants";

const MAX_STEPS = 64;

export function useGrid(numChannels: number) {
  const [grid, setGrid] = useState<GridState>(
    createDefaultGrid(numChannels, MAX_STEPS),
  );

  const gridRef = useRef(grid);
  useEffect(() => {
    gridRef.current = grid;
  }, [grid]);

  const toggleCell = (row: number, col: number, newValue: PadVelocity) => {
    setGrid((prev) =>
      prev.map((r, rowIndex) =>
        rowIndex === row
          ? r.map((cell, colIndex) => (colIndex === col ? newValue : cell))
          : r,
      ),
    );
  };
  
  // Duplicate pattern logic based on the current loop length.
  // Note: This function only manipulates the grid.
  const duplicatePattern = (currentLoopLength: LoopLength) => {
    if (currentLoopLength === "1m") {
      // Duplicate first 16 steps into steps 16-31
      setGrid((prev) =>
        prev.map((row) => {
          const newRow = [...row];
          for (let i = 0; i < 16; i++) {
            newRow[i + 16] = newRow[i];
          }
          return newRow;
        }),
      );
    } else if (currentLoopLength === "2m") {
      // Duplicate first 32 steps into steps 32-63
      setGrid((prev) =>
        prev.map((row) => {
          const newRow = [...row];
          for (let i = 0; i < 32; i++) {
            newRow[i + 32] = newRow[i];
          }
          return newRow;
        }),
      );
    }
  };

  return { grid, gridRef, toggleCell, duplicatePattern, setGrid };
}
