import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import type { GlobalReverbSettings, BusCompressorSettings } from "@/types";

type Props = {
  isOpen: boolean;
  globalReverbSettings: GlobalReverbSettings;
  busCompressorSettings: BusCompressorSettings;
  setOpen: (isOpen: boolean) => void;
  handleGlobalReverbChange: (
    field: keyof GlobalReverbSettings,
    value: number,
  ) => void;
  handleBusCompressorChange: (
    field: keyof BusCompressorSettings,
    value: number | boolean,
  ) => void;
};

function GlobalFxDialog({
  isOpen,
  setOpen,
  globalReverbSettings,
  busCompressorSettings,
  handleGlobalReverbChange,
  handleBusCompressorChange,
}: Props) {
  const compressorDisabled = !busCompressorSettings.enabled;

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      <DialogContent onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>Global Effects</DialogTitle>
          <DialogDescription>Adjust global effects settings</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="reverb">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="reverb">Reverb</TabsTrigger>
            <TabsTrigger value="compressor">Bus Compressor</TabsTrigger>
          </TabsList>

          <TabsContent value="reverb" className="space-y-4">
            {/* Reverb Decay */}
            <div>
              <Label className="mb-2 font-medium">
                Decay: {globalReverbSettings.decay.toFixed(2)}s
              </Label>
              <Slider
                value={[globalReverbSettings.decay]}
                onValueChange={([val]) =>
                  handleGlobalReverbChange("decay", val)
                }
                min={0.1}
                max={10}
                step={0.1}
              />
            </div>

            {/* Reverb PreDelay */}
            <div>
              <Label className="mb-2 font-medium">
                PreDelay: {globalReverbSettings.preDelay.toFixed(2)}s
              </Label>
              <Slider
                value={[globalReverbSettings.preDelay]}
                onValueChange={([val]) =>
                  handleGlobalReverbChange("preDelay", val)
                }
                min={0}
                max={1}
                step={0.01}
              />
            </div>

            {/* Reverb Wet */}
            <div>
              <Label className="mb-2 font-medium">
                Wet: {Math.round(globalReverbSettings.wet * 100)}%
              </Label>
              <Slider
                value={[globalReverbSettings.wet]}
                onValueChange={([val]) => handleGlobalReverbChange("wet", val)}
                min={0}
                max={1}
                step={0.01}
              />
            </div>
          </TabsContent>

          <TabsContent value="compressor" className="space-y-4">
            {/* Enable/Disable Switch */}
            <div className="flex items-center justify-between">
              <Label className="font-medium">Compressor Enabled</Label>
              <Switch
                checked={busCompressorSettings.enabled}
                onCheckedChange={(checked) =>
                  handleBusCompressorChange("enabled", checked)
                }
              />
            </div>

            {/* Mix Control */}
            <div>
              <Label className="mb-2 font-medium">
                Mix: {Math.round(busCompressorSettings.mix * 100)}%
              </Label>
              <Slider
                value={[busCompressorSettings.mix]}
                onValueChange={([val]) => handleBusCompressorChange("mix", val)}
                min={0}
                max={1}
                step={0.01}
                disabled={compressorDisabled}
                className={compressorDisabled ? "opacity-50" : ""}
              />
              <p className="text-muted-foreground mt-1 text-sm">
                0% = no compression, 100% = full compression
              </p>
            </div>

            {/* Make-up Gain */}
            <div>
              <Label className="mb-2 font-medium">
                Make-up Gain: {busCompressorSettings.makeUpGain.toFixed(1)} dB
              </Label>
              <Slider
                value={[busCompressorSettings.makeUpGain]}
                onValueChange={([val]) =>
                  handleBusCompressorChange("makeUpGain", val)
                }
                min={0}
                max={24}
                step={0.5}
                disabled={compressorDisabled}
                className={compressorDisabled ? "opacity-50" : ""}
              />
              <p className="text-muted-foreground mt-1 text-sm">
                Compensates for volume reduction from compression
              </p>
            </div>

            {/* Threshold */}
            <div>
              <Label className="mb-2 font-medium">
                Threshold: {busCompressorSettings.threshold.toFixed(1)} dB
              </Label>
              <Slider
                value={[busCompressorSettings.threshold]}
                onValueChange={([val]) =>
                  handleBusCompressorChange("threshold", val)
                }
                min={-60}
                max={0}
                step={1}
                disabled={compressorDisabled}
                className={compressorDisabled ? "opacity-50" : ""}
              />
              <p className="text-muted-foreground mt-1 text-sm">
                Lower values = more compression
              </p>
            </div>

            {/* Ratio */}
            <div>
              <Label className="mb-2 font-medium">
                Ratio: {busCompressorSettings.ratio.toFixed(1)}:1
              </Label>
              <Slider
                value={[busCompressorSettings.ratio]}
                onValueChange={([val]) =>
                  handleBusCompressorChange("ratio", val)
                }
                min={1}
                max={20}
                step={0.5}
                disabled={compressorDisabled}
                className={compressorDisabled ? "opacity-50" : ""}
              />
              <p className="text-muted-foreground mt-1 text-sm">
                Higher values = stronger compression
              </p>
            </div>

            {/* Attack */}
            <div>
              <Label className="mb-2 font-medium">
                Attack: {(busCompressorSettings.attack * 1000).toFixed(0)} ms
              </Label>
              <Slider
                value={[busCompressorSettings.attack]}
                onValueChange={([val]) =>
                  handleBusCompressorChange("attack", val)
                }
                min={0.001}
                max={0.1}
                step={0.001}
                disabled={compressorDisabled}
                className={compressorDisabled ? "opacity-50" : ""}
              />
            </div>

            {/* Release */}
            <div>
              <Label className="mb-2 font-medium">
                Release: {(busCompressorSettings.release * 1000).toFixed(0)} ms
              </Label>
              <Slider
                value={[busCompressorSettings.release]}
                onValueChange={([val]) =>
                  handleBusCompressorChange("release", val)
                }
                min={0.01}
                max={1}
                step={0.01}
                disabled={compressorDisabled}
                className={compressorDisabled ? "opacity-50" : ""}
              />
            </div>

            {/* Knee */}
            <div>
              <Label className="mb-2 font-medium">
                Knee: {busCompressorSettings.knee.toFixed(1)} dB
              </Label>
              <Slider
                value={[busCompressorSettings.knee]}
                onValueChange={([val]) =>
                  handleBusCompressorChange("knee", val)
                }
                min={0}
                max={40}
                step={1}
                disabled={compressorDisabled}
                className={compressorDisabled ? "opacity-50" : ""}
              />
              <p className="text-muted-foreground mt-1 text-sm">
                Higher values = smoother transition
              </p>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button onClick={() => setOpen(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export { GlobalFxDialog };
