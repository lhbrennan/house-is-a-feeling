import * as RadixSlider from "@radix-ui/react-slider";
import { Toggle } from "@/components/ui/toggle";
import { Slider } from "@/components/ui/slider";

import { CycleSelect } from "./cycle-select";

import type { ChannelNames } from "@/constants";

export type ChannelControl = {
  mute: boolean;
  solo: boolean;
  volume: number; // normalized 0 to 1
  pan: number; // -1 (left) to 1 (right)
};

type ChannelControlsProps = {
  channelControls: Record<string, ChannelControl>;
  onChangeChannel: (note: string, partial: Partial<ChannelControl>) => void;
  channelNames: ChannelNames;
};

export function ChannelControls({
  channelControls,
  onChangeChannel,
  channelNames,
}: ChannelControlsProps) {
  return (
    <div className="mr-4 flex flex-col gap-[10px]">
      {channelNames.map((channel) => {
        const { volume, mute, solo, pan } = channelControls[channel];
        return (
          <div key={channel} className="flex items-center space-x-4">
            <div className="flex h-10 min-w-md items-center justify-between">
              <PanSlider
                value={pan}
                onChange={(newPan) => onChangeChannel(channel, { pan: newPan })}
              />

              <div className="mr-4 w-20 text-center capitalize">{channel}</div>

              <CycleSelect
                options={["kick 1", "kick 2", "kick 3"]}
                onChange={() => {}}
                selectedValue={"kick 1"}
                onDotClick={() => {
                  console.log("Dot clicked");
                }}
                className="mr-4"
              />
              <Slider
                className="max-w-[120px] min-w-[80px]"
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
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  // Map value from [-1, 1] to a percentage (0% to 100%).
  const thumbPercent = ((value + 1) / 2) * 100;

  let fillStyle = {};
  if (value > 0) {
    fillStyle = {
      left: "50%",
      width: `${thumbPercent - 50}%`,
    };
  } else if (value < 0) {
    fillStyle = {
      left: `${thumbPercent}%`,
      width: `${50 - thumbPercent}%`,
    };
  } else {
    fillStyle = { left: "50%", width: "0%" };
  }

  return (
    <div className="relative w-32 py-4">
      <RadixSlider.Root
        className="relative flex w-full items-center"
        value={[value]}
        onValueChange={(values) => onChange(values[0])}
        min={-1}
        max={1}
        step={0.25}
      >
        <RadixSlider.Track className="relative h-2 w-full rounded-full bg-gray-300">
          {/* Custom fill indicator from the center */}
          <div
            className="absolute h-full rounded-full bg-blue-500"
            style={fillStyle}
          />
        </RadixSlider.Track>
        <RadixSlider.Thumb className="block h-4 w-4 rounded-full border border-gray-400 bg-white shadow-md" />
      </RadixSlider.Root>
    </div>
  );
}
