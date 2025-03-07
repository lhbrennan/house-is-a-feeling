import { Play, Octagon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";

type TransportControlsProps = {
  bpm: number;
  swing: number;
  isPlaying: boolean;
  onBpmChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSwingChange: (val: number) => void;
  onTogglePlay: () => void;
};

export function TransportControls({
  bpm,
  swing,
  isPlaying,
  onBpmChange,
  onSwingChange,
  onTogglePlay,
}: TransportControlsProps) {
  return (
    <div className="flex flex-wrap items-center space-x-4">
      <Label htmlFor="bpm">BPM:</Label>
      <Input
        id="bpm"
        type="number"
        value={bpm}
        onChange={onBpmChange}
        className="w-20"
      />

      <div className="flex items-center space-x-2">
        <Label htmlFor="swing">Swing:</Label>
        <Slider
          id="swing"
          value={[swing]}
          onValueChange={([val]) => onSwingChange(val)}
          max={0.5}
          step={0.01}
          className="w-32"
        />
        <span>{Math.round(swing * 100)}%</span>
      </div>

      <Button onClick={onTogglePlay}>
        {isPlaying ? (
          <>
            <Octagon className="mr-2 h-4 w-4" />
            Stop
          </>
        ) : (
          <>
            <Play className="mr-2 h-4 w-4" />
            Play
          </>
        )}
      </Button>
    </div>
  );
}
