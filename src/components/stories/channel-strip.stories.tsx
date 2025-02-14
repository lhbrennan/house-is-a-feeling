import React from "react";
import "@/index.css";
import type { Story } from "@ladle/react";
import { ChannelStrip as BaseChannelStrip } from "../channel-strip";

export const ChannelStrip: Story = () => {
    const [volume, setVolume] = React.useState(90);
  return <BaseChannelStrip label="kick" volume={volume} mute={false} solo={false}/>;
};
