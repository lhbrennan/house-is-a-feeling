import React from "react";
import "@/index.css";
import type { Story } from "@ladle/react";
import { Pad as BasePad } from "../pad";
import type { PadVelocity } from "@/types";

export const Pad: Story = () => {
  const [padVelocity, setPadVelocity] = React.useState<PadVelocity>(3);

  return <BasePad state={padVelocity} onClick={setPadVelocity} color="cyan" />;
};
