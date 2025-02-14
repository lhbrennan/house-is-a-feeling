import "@/index.css";
import type { Story } from "@ladle/react";
import { Grid as BaseGrid } from "../grid";
import { useGrid } from "@/use-grid";

export const Grid: Story = () => {
  const { grid, toggleCell } = useGrid(5);

  return <BaseGrid toggleCell={toggleCell} grid={grid} />;
};
