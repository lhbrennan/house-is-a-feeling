import "@/index.css";
import type { Story } from "@ladle/react";
import { Grid as BaseGrid } from "../grid";
import { useGrid } from "@/hooks/use-grid";

export const Grid: Story = () => {
  const { patterns, toggleCell } = useGrid(5);

  return (
    <BaseGrid
      toggleCell={(row, col, newVal) =>
        toggleCell('A', row, col, newVal)
      }
      grid={patterns.A}
      currentStep={0}
    />
  );
};
