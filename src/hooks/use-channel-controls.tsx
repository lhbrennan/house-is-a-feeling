import { useState, useEffect } from "react";
import * as Tone from "tone";
import { ChannelName } from "@/constants";
import { ChannelControlsType } from "@/types";

export function useChannelControls(
  initialControls: Record<ChannelName, ChannelControlsType>,
  audioEngine: any,
  engineReady: boolean,
) {
  const [channelControls, setChannelControls] = useState(initialControls);

  // Apply channel controls whenever they change or engine becomes ready
  useEffect(() => {
    if (!engineReady) return;

    const anySolo = Object.values(channelControls).some((ctrl) => ctrl.solo);

    Object.entries(channelControls).forEach(
      ([channel, { mute, solo, volume, pan }]) => {
        const effectiveMute = mute || (anySolo && !solo);
        const volumeDb = effectiveMute ? -Infinity : Tone.gainToDb(volume);
        audioEngine.setChannelVolume(channel as ChannelName, volumeDb);
        audioEngine.setChannelPan(channel as ChannelName, pan);
      },
    );
  }, [channelControls, engineReady, audioEngine]);

  const onChangeChannel = (
    channel: ChannelName,
    partial: Partial<ChannelControlsType>,
  ) => {
    setChannelControls((prev) => {
      const next = { ...prev };
      next[channel] = { ...prev[channel], ...partial };
      return next;
    });
  };

  return {
    channelControls,
    setChannelControls,
    onChangeChannel,
  };
}
