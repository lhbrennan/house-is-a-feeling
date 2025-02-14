import React from "react";
import "@/index.css";
import type { Story } from "@ladle/react";
import { Pad as BasePad } from "../pad";
import type { PadState } from "@/types";

export const Pad: Story = () => {
  const [padState, setPadState] = React.useState<PadState>(3);

  return <BasePad state={padState} onClick={setPadState} />;
};
