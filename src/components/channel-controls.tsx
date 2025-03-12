import { Toggle } from "@/components/ui/toggle";
import { CycleSelect, CYCLE_SELECT_COLORS } from "@/components/cycle-select";
import ChannelNameButton from "@/components/channel-name-button";

import { SAMPLES, type ChannelNames, type ChannelName } from "@/constants";
import { Knob } from "@/components/knob";

const CHANNEL_ABREVIATIONS = {
  Kick1: "Kick 1",
  Kick2: "Kick 2",
  Clap: "Clap",
  Snare: "Snare",
  ClosedHat: "Cl Hat",
  OpenHat: "Op Hat",
  Perc1: "Perc 1",
  Perc2: "Perc 2",
};

export type ChannelControl = {
  mute: boolean;
  solo: boolean;
  volume: number; // normalized 0 to 1
  pan: number; // -1 (left) to 1 (right)
};

type ChannelControlsProps = {
  channelControls: Record<string, ChannelControl>;
  onChangeChannel: (
    channel: ChannelName,
    partial: Partial<ChannelControl>,
  ) => void;
  channelNames: ChannelNames;
  selectedSampleIndexes: Record<ChannelName, number>;
  onChangeSample: (channel: ChannelName, sampleIdx: number) => void;
  playNoteImmediately: (channel: ChannelName) => void;
};

export function ChannelControls({
  channelControls,
  onChangeChannel,
  channelNames,
  selectedSampleIndexes,
  onChangeSample,
  playNoteImmediately,
}: ChannelControlsProps) {
  return (
    <div className="flex flex-col gap-[10px]">
      {channelNames.map((channel, idx) => {
        const { volume, mute, solo, pan } = channelControls[channel];
        return (
          <div
            key={channel}
            className="flex h-10 w-fit items-center gap-3 rounded pr-2"
          >
            <div className="flex items-center">
              <Toggle
                pressed={mute}
                onPressedChange={() =>
                  onChangeChannel(channel, { mute: !mute })
                }
                variant="outline"
              >
                M
              </Toggle>

              <Toggle
                pressed={solo}
                onPressedChange={() =>
                  onChangeChannel(channel, { solo: !solo })
                }
                variant="outline"
              >
                S
              </Toggle>
            </div>

            <Knob
              value={pan}
              onValueChange={(val) => onChangeChannel(channel, { pan: val })}
              valueVisibility="hidden"
              min={-1}
              max={1}
              step={0.25}
              position="center"
            />

            <Knob
              value={volume}
              onValueChange={(val) => onChangeChannel(channel, { volume: val })}
              valueVisibility="hidden"
              min={0}
              max={1}
              step={0.01}
              position="right"
            />

            <CycleSelect
              options={SAMPLES[channel]}
              onChange={(newIdx) => onChangeSample(channel, newIdx)}
              selectedSampleIdx={selectedSampleIndexes[channel]}
              color={CYCLE_SELECT_COLORS[idx]}
            />

            <ChannelNameButton
              channelName={CHANNEL_ABREVIATIONS[channel]}
              onClick={() => playNoteImmediately(channel)}
              color={CYCLE_SELECT_COLORS[idx]}
            />
          </div>
        );
      })}
    </div>
  );
}
