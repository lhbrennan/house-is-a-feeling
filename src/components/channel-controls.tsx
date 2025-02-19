import React from "react";
import { ChannelStrip } from "@/components/channel-strip";
import type { ChannelNotes } from "@/constants";

export type ChannelControl = {
  mute: boolean;
  solo: boolean;
  volume: number; // normalized 0 to 1
  pan: number; // -1 (left) to 1 (right)
};

type ChannelControlsProps = {
  channelControls: Record<string, ChannelControl>;
  onChangeChannel: (note: string, partial: Partial<ChannelControl>) => void;
  channelNotes: ChannelNotes;
};

export function ChannelControls({
  channelControls,
  onChangeChannel,
  channelNotes,
}: ChannelControlsProps) {
  return (
    <div className="flex flex-col gap-[10px]">
      {channelNotes.map((note) => {
        const { volume, mute, solo, pan } = channelControls[note];
        return (
          <div key={note} className="flex items-center space-x-4">
            <ChannelStrip
              label={note}
              volume={volume}
              changeVolume={(newVolume) =>
                onChangeChannel(note, { volume: newVolume })
              }
              mute={mute}
              toggleMute={() =>
                onChangeChannel(note, { mute: !mute })
              }
              solo={solo}
              toggleSolo={() =>
                onChangeChannel(note, { solo: !solo })
              }
              pan={pan}
              changePan={(newPan) =>
                onChangeChannel(note, { pan: newPan })
              }
            />
          </div>
        );
      })}
    </div>
  );
}