import React from "react";
import '@/index.css'
import type { Story } from "@ladle/react";
import { Pad as BasePad } from "./pad";
import { createDefaultGrid } from "@/utils";
import { Grid as BaseGrid} from "./grid";
import type { GridState, PadState } from "@/types";

export const Pad: Story = () => {
  const [padState, setPadState] = React.useState<PadState>(3);

  // 0 = off, 1 = low velicity, 2 = medium velocity, 3 = high velocity
  const handleSetPadState = () => {
    if (padState === 0) {
      setPadState(3);
    } else if (padState === 3) {
      setPadState(2);
    } else if (padState === 2) {
      setPadState(1);
    } else {
      setPadState(0);
    }
  };

  return <BasePad state={padState} onClick={handleSetPadState} />;
};

export const Grid: Story = () => {
  const [grid, setGrid] = React.useState<GridState>(createDefaultGrid(5, 16));

  return <BaseGrid grid={grid} />;
};
