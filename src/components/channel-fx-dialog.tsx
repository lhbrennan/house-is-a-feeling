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
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";

import type { ChannelName } from "@/constants";
import type { ChannelFxState } from "@/types";

type Props = {
  channel: ChannelName | null;
  channelFx: ChannelFxState | null;
  handleChannelFxChange: (
    channel: string,
    field: keyof ChannelFxState,
    value: number | string,
  ) => void;
  onClose: () => void;
};

function ChannelFxDialog({
  channel,
  channelFx,
  handleChannelFxChange,
  onClose,
}: Props) {
  return (
    <Dialog
      open={!!channel}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>{channel} Advanced Effects</DialogTitle>
          <DialogDescription>
            Customize delay time & feedback settings
          </DialogDescription>
        </DialogHeader>

        {channelFx && (
          <div className="space-y-4">
            {/* Delay Time */}
            <div>
              <Label className="mr-2 font-medium">Delay Time:</Label>
              <Select
                value={channelFx.time.toString()}
                onValueChange={(val) =>
                  handleChannelFxChange(channel!, "time", val)
                }
              >
                <SelectTrigger className="w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="4n">Quarter (4n)</SelectItem>
                  <SelectItem value="8n">Eighth (8n)</SelectItem>
                  <SelectItem value="8n.">Dotted 8th (8n.)</SelectItem>
                  <SelectItem value="16n">Sixteenth (16n)</SelectItem>
                  <SelectItem value="0.25">0.25s</SelectItem>
                  <SelectItem value="0.5">0.5s</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Feedback */}
            <div>
              <Label className="mb-2 font-medium">
                Feedback: {channelFx.feedback.toFixed(2)}
              </Label>
              <Slider
                value={[channelFx.feedback]}
                onValueChange={([val]) =>
                  handleChannelFxChange(channel!, "feedback", val)
                }
                min={0}
                max={1}
                step={0.01}
              />
              <p className="text-muted-foreground mt-1 text-sm">
                Lower = fewer repeats; higher = longer echo tail.
              </p>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export { ChannelFxDialog };
