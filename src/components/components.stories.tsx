import React from "react";
import '@/index.css'
import type { Story } from "@ladle/react";
import { Pad as BasePad } from "./pad";
import { PAD_STATES, type PadStates } from "@/constants";
import { createDefaultGrid } from "@/utils";
import { Grid as BaseGrid} from "./grid";

export const Pad: Story = () => {
  const [padState, setPadState] = React.useState<PadStates>(PAD_STATES.high);

  const handleSetPadState = () => {
    if (padState === PAD_STATES.off) {
      setPadState(PAD_STATES.high);
    } else if (padState === PAD_STATES.high) {
      setPadState(PAD_STATES.medium);
    } else if (padState === PAD_STATES.medium) {
      setPadState(PAD_STATES.low);
    } else {
      setPadState(PAD_STATES.off);
    }
  };

  return <BasePad state={padState} onClick={handleSetPadState} />;
};

export const Grid: Story = () => {
  const [grid, setGrid] = React.useState<boolean[][]>(createDefaultGrid(5, 16));

  return <BaseGrid grid={grid} />;
};
