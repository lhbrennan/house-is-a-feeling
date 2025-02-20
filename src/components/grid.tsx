import { Pad, PAD_COLORS } from "./pad";
import type { GridState, PadVelocity } from "@/types";

type GridProps = {
  grid: GridState;
  toggleCell: (row: number, col: number, newState: PadVelocity) => void;
  numVisibleSteps?: number;
  currentStep: number | null;
};

export function Grid({
  grid,
  toggleCell,
  numVisibleSteps = 16,
  currentStep,
}: GridProps) {
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
            className="mx-auto flex max-w-max flex-shrink-0"
            style={{ gap: "clamp(6px, 3vw, 20px)" }}
          >
            {beats.map((beat, beatIndex) => {
              return (
                <div
                  key={beatIndex}
                  className="grid flex-shrink-0 grid-cols-4"
                  style={{ gap: "clamp(4px, 2vw, 10px)" }}
                >
                  {beat.map((cell, colIndex) => {
                    const animate =
                      beatIndex * 4 + colIndex === currentStep && cell !== 0;
                    return (
                      <Pad
                        key={colIndex}
                        animate={animate}
                        state={cell}
                        color={PAD_COLORS[rowIndex]}
                        onClick={(newState) =>
                          toggleCell(
                            rowIndex,
                            beatIndex * 4 + colIndex,
                            newState,
                          )
                        }
                      />
                    );
                  })}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
