import React from "react";
import { ChannelStrip } from "@/components/channel-strip";

export type ChannelControl = {
  mute: boolean;
  solo: boolean;
  volume: number; // normalized 0 to 1
  pan: number; // -1 (left) to 1 (right)
};

type ChannelControlsProps = {
  channelControls: Record<string, ChannelControl>;
  setChannelControls: React.Dispatch<
    React.SetStateAction<Record<string, ChannelControl>>
  >;
  channelNotes: string[];
};

export function ChannelControls({
  channelControls,
  setChannelControls,
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
                setChannelControls((prev) => ({
                  ...prev,
                  [note]: {
                    ...prev[note],
                    volume: newVolume,
                  },
                }))
              }
              mute={mute}
              toggleMute={() =>
                setChannelControls((prev) => ({
                  ...prev,
                  [note]: { ...prev[note], mute: !prev[note].mute },
                }))
              }
              solo={solo}
              toggleSolo={() =>
                setChannelControls((prev) => ({
                  ...prev,
                  [note]: { ...prev[note], solo: !prev[note].solo },
                }))
              }
              pan={pan}
              changePan={(newPan) =>
                setChannelControls((prev) => ({
                  ...prev,
                  [note]: {
                    ...prev[note],
                    pan: newPan,
                  },
                }))
              }
            />
          </div>
        );
      })}
    </div>
  );
}