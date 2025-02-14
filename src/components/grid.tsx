import { Pad } from "./pad";

type GridProps = {
  grid: boolean[][];
  numVisibleSteps?: number;
};

// onClick={() => toggleCell(rowIndex, colIndex)}

export function Grid({ grid, numVisibleSteps }: GridProps) {
  return (
    <div className="grid grid-cols-16 gap-1">
      {grid.map((row, rowIndex) =>
        row
          .slice(0, numVisibleSteps || row.length)
          .map((cell, colIndex) => (
            <Pad
              state={"off"}
              key={`${rowIndex}-${colIndex}`}
              onClick={() => console.log(`clicked ${rowIndex} / ${colIndex}`)}
            />
          )),
      )}
    </div>
  );
}
