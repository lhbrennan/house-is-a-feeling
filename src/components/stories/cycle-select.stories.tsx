import React from "react";
import "@/index.css";
import type { Story } from "@ladle/react";
import { CycleSelect as BaseCycleSelect } from "../cycle-select";

const options = ["Kick 1", "Kick 2", "Kick 3", "Kick 4", "Kick 5", "Kick 6"];

export const CycleSelect: Story = () => {
  const [selected, setSelected] = React.useState<string>(options[0]);
  return (
    <BaseCycleSelect
      options={options}
      onChange={setSelected}
      selectedValue={selected}
      onDotClick={() => {
        console.log("Dot clicked");
      }}
    />
  );
};
