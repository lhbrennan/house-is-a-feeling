import { Pad } from "./pad";
import type { GridState } from "@/types";

type GridProps = {
  grid: GridState;
  toggleCell: (row: number, col: number) => void;
  numVisibleSteps?: number;
};

export function Grid({ grid, toggleCell, numVisibleSteps = 16}: GridProps) {
  return (
    <div className="grid grid-cols-16 gap-1">
      {grid.map((row, rowIndex) =>
        row
          .slice(0, numVisibleSteps || row.length)
          .map((cell, colIndex) => (
            <Pad
              state={cell}
              onClick={() => toggleCell(rowIndex, colIndex)}
              key={`${rowIndex}-${colIndex}`}
            />
          )),
      )}
    </div>
  );
}
