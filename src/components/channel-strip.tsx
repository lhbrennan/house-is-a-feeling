import { Toggle } from "@/components/ui/toggle";
import { Slider } from "@/components/ui/slider";

type ChannelStripProps = {
  label: string;
  volume: number;
  mute: boolean;
  solo: boolean;
};

export function ChannelStrip({ label, volume, mute, solo }: ChannelStripProps) {
  return (
    <div className="flex h-10 items-center justify-end">
      <div className="capitalize mr-4">{label}</div>
      <Slider
        className="min-w-[80px] max-w-[120px]"
        value={[volume]}
        max={100}
        step={1}
      />
      <Toggle pressed={mute}>M</Toggle>
      <Toggle pressed={solo}>S</Toggle>
    </div>
  );
}
