import { useState, useRef, useEffect } from "react";
import { createDefaultGrid } from "@/utils";
import type { GridState } from "./types";
import type { LoopLength } from "./constants";

const MAX_STEPS = 64;

export function useGrid(numChannels: number) {
  // Create master grid with MAX_STEPS columns
  const [grid, setGrid] = useState<GridState>(
    createDefaultGrid(numChannels, MAX_STEPS)
  );

  // Keep a ref for scheduling updates
  const gridRef = useRef(grid);
  useEffect(() => {
    gridRef.current = grid;
  }, [grid]);

  // Toggle a cell value using the same cycling logic as before.
  const toggleCell = (row: number, col: number) => {
    setGrid((prev) =>
      prev.map((r, rowIndex) =>
        rowIndex === row
          ? r.map((cell, colIndex) => {
              if (colIndex === col) {
                switch (cell) {
                  case 0:
                    return 3;
                  case 3:
                    return 2;
                  case 2:
                    return 1;
                  case 1:
                    return 0;
                  default:
                    return 0;
                }
              }
              return cell;
            })
          : r
      )
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
        })
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
        })
      );
    }
  };

  return { grid, gridRef, toggleCell, duplicatePattern, setGrid };
}