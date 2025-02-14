import { Pad } from "./pad";
import type { GridState } from "@/types";

type GridProps = {
  grid: GridState;
  toggleCell: (row: number, col: number, newState: number) => void;
  numVisibleSteps?: number;
};

export function Grid({ grid, toggleCell, numVisibleSteps = 16 }: GridProps) {
  return (
    <div className="flex flex-col gap-[10px]">
      {grid.map((row, rowIndex) => {
        const visibleSteps = row.slice(0, numVisibleSteps);
        const beats = [];
        for (let i = 0; i < visibleSteps.length; i += 4) {
          beats.push(visibleSteps.slice(i, i + 4));
        }
        return (
          <div
            key={rowIndex}
            className="max-w-max mx-auto flex flex-shrink-0"
            style={{ gap: "clamp(6px, 3vw, 20px)" }}
          >
            {beats.map((beat, beatIndex) => (
              <div
                key={beatIndex}
                className="grid grid-cols-4 flex-shrink-0"
                style={{ gap: "clamp(4px, 2vw, 10px)" }}
              >
                {beat.map((cell, colIndex) => (
                  <Pad
                    key={colIndex}
                    state={cell}
                    onClick={(newState) =>
                      toggleCell(rowIndex, beatIndex * 4 + colIndex, newState)
                    }
                  />
                ))}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}