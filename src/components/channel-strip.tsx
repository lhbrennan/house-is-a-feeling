import * as RadixSlider from "@radix-ui/react-slider";
import { Toggle } from "@/components/ui/toggle";
import { Slider } from "@/components/ui/slider";
import type { ChannelNote } from "@/constants";

type ChannelStripProps = {
  label: ChannelNote;
  volume: number;
  changeVolume: (volume: number) => void;
  mute: boolean;
  toggleMute: () => void;
  solo: boolean;
  toggleSolo: () => void;
  pan: number;
  changePan: (pan: number) => void;
};

export function ChannelStrip({
  label,
  volume,
  changeVolume,
  mute,
  toggleMute,
  solo,
  toggleSolo,
  pan,
  changePan,
}: ChannelStripProps) {
  return (
    <div className="flex h-10 items-center justify-between min-w-md">
      <PanSlider value={pan} onChange={changePan} />
      <div className="mr-4 capitalize">{label}</div>
      <Slider
        className="max-w-[120px] min-w-[80px]"
        value={[volume]}
        onValueChange={(newVolume: number[]) => changeVolume(newVolume[0])}
        min={0}
        max={1}
        step={0.01}
      />
      <Toggle pressed={mute} onPressedChange={toggleMute}>
        M
      </Toggle>
      <Toggle pressed={solo} onPressedChange={toggleSolo}>
        S
      </Toggle>
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
    <div className="w-32 relative py-4">
      <RadixSlider.Root
        className="relative flex items-center w-full"
        value={[value]}
        onValueChange={(values) => onChange(values[0])}
        min={-1}
        max={1}
        step={0.25}
      >
        <RadixSlider.Track className="relative w-full h-2 rounded-full bg-gray-300">
          {/* Custom fill indicator from the center */}
          <div
            className="absolute h-full bg-blue-500 rounded-full"
            style={fillStyle}
          />
        </RadixSlider.Track>
        <RadixSlider.Thumb className="block w-4 h-4 bg-white rounded-full shadow-md border border-gray-400" />
      </RadixSlider.Root>
    </div>
  );
}