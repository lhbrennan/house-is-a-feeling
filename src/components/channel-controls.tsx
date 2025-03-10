import * as RadixSlider from "@radix-ui/react-slider";

import { cn } from "@/lib/utils";
import { Toggle } from "@/components/ui/toggle";
import { Slider } from "@/components/ui/slider";

import { CycleSelect, CYCLE_SELECT_COLORS } from "./cycle-select";

import { SAMPLES, type ChannelNames, type ChannelName } from "@/constants";

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
  onChangeChannelSample: (channel: ChannelName, sampleIdx: number) => void;
  playNoteImmediately: (channel: ChannelName) => void;
};

function ChannelControls({
  channelControls,
  onChangeChannel,
  channelNames,
  selectedSampleIndexes,
  onChangeChannelSample,
  playNoteImmediately,
}: ChannelControlsProps) {
  return (
    <div className="flex flex-col gap-[10px]">
      {channelNames.map((channel, idx) => {
        const { volume, mute, solo, pan } = channelControls[channel];
        return (
          <div
            key={channel}
            className="flex items-center space-x-4 rounded pt-0 pr-2 pb-0"
          >
            <div className="flex h-10 min-w-md items-center justify-between">
              <PanSlider
                value={pan}
                onChange={(newPan) => onChangeChannel(channel, { pan: newPan })}
                className="mr-4"
              />

              <div className="mr-4 min-w-20 text-center capitalize">
                {channel}
              </div>

              <Slider
                className="mr-4 max-w-[100px] min-w-[80px]"
                value={[volume]}
                onValueChange={(newVolume: number[]) =>
                  onChangeChannel(channel, { volume: newVolume[0] })
                }
                min={0}
                max={1}
                step={0.01}
              />

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
              <CycleSelect
                options={SAMPLES[channel]}
                onChange={(newIdx) => onChangeChannelSample(channel, newIdx)}
                selectedSampleIdx={selectedSampleIndexes[channel]}
                onDotClick={() => {
                  playNoteImmediately(channel);
                }}
                color={CYCLE_SELECT_COLORS[idx]}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PanSlider({
  value,
  onChange,
  className,
}: {
  value: number;
  onChange: (value: number) => void;
  className?: string;
}) {
  // Map value from [-1, 1] to a percentage (0% to 100%).
  const thumbPercent = ((value + 1) / 2) * 100;

  let rangeStyle = {};
  if (value > 0) {
    rangeStyle = {
      left: "50%",
      width: `${thumbPercent - 50}%`,
    };
  } else if (value < 0) {
    rangeStyle = {
      left: `${thumbPercent}%`,
      width: `${50 - thumbPercent}%`,
    };
  } else {
    rangeStyle = { left: "50%", width: "0%" };
  }

  return (
    <div className={cn("relative min-w-16 py-2", className)}>
      <RadixSlider.Root
        className="relative flex w-full touch-none items-center select-none"
        value={[value]}
        onValueChange={(values) => onChange(values[0])}
        min={-1}
        max={1}
        step={0.25}
      >
        <RadixSlider.Track className="bg-primary/20 relative h-1.5 w-full grow overflow-hidden rounded-full">
          <div className="bg-primary absolute h-full" style={rangeStyle} />
        </RadixSlider.Track>
        <RadixSlider.Thumb className="border-primary/50 bg-background focus-visible:ring-ring block h-4 w-4 rounded-full border shadow transition-colors focus-visible:ring-1 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50" />
      </RadixSlider.Root>
    </div>
  );
}

export { ChannelControls, PanSlider };
