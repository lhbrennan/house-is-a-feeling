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

import type { GlobalReverbSettings } from "@/types";

type Props = {
  isOpen: boolean;
  globalReverbSettings: GlobalReverbSettings;
  setOpen: (isOpen: boolean) => void;
  handleGlobalReverbChange: (
    field: keyof GlobalReverbSettings,
    value: number,
  ) => void;
};

function GlobalFxDialog({
  isOpen,
  setOpen,
  globalReverbSettings,
  handleGlobalReverbChange,
}: Props) {
  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      <DialogContent onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>Global Effects</DialogTitle>
          <DialogDescription>Adjust global reverb settings</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Reverb Decay */}
          <div>
            <Label className="mb-2 font-medium">
              Decay: {globalReverbSettings.decay.toFixed(2)}s
            </Label>
            <Slider
              value={[globalReverbSettings.decay]}
              onValueChange={([val]) => handleGlobalReverbChange("decay", val)}
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
        </div>

        <DialogFooter>
          <Button onClick={() => setOpen(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export { GlobalFxDialog };
