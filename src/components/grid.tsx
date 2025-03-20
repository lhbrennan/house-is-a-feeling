import { Pad, PAD_COLORS } from "@/components/pad";
import type { GridState, PadVelocity } from "@/types";

type GridProps = {
  grid: GridState;
  toggleCell: (row: number, col: number, newState: PadVelocity) => void;
  currentStep: number | null;
};

export function Grid({ grid, toggleCell, currentStep }: GridProps) {
  const totalSteps = 16;
  const stepsPerBeat = 4;

  return (
    <div className="overflow-x-auto pr-1.5 pb-2 pl-1.5 pt-2">
      <div className="flex h-[390px] flex-col justify-between">
        {grid.map((row, rowIndex) => {
          // row = an array of 16 velocity values for this channel
          const beats: PadVelocity[][] = [];
          for (let i = 0; i < totalSteps; i += stepsPerBeat) {
            beats.push(row.slice(i, i + stepsPerBeat));
          }

          return (
            <div
              key={rowIndex}
              className="mx-auto flex max-w-max flex-shrink-0"
              style={{ gap: "clamp(6px, 3vw, 20px)" }}
            >
              {beats.map((beatSlice, beatIndex) => (
                <div
                  key={beatIndex}
                  className="grid flex-shrink-0 grid-cols-4"
                  style={{ gap: "clamp(4px, 2vw, 10px)" }}
                >
                  {beatSlice.map((cell, colIndex) => {
                    const globalCol = beatIndex * stepsPerBeat + colIndex;
                    const isActiveStep =
                      globalCol === currentStep && cell !== 0;

                    return (
                      <Pad
                        key={colIndex}
                        animate={isActiveStep}
                        state={cell}
                        color={PAD_COLORS[rowIndex]}
                        onClick={(newState) =>
                          toggleCell(rowIndex, globalCol, newState)
                        }
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
