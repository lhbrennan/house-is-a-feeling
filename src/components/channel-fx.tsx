import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Settings } from "lucide-react";

import { CHANNEL_NAMES, ChannelName } from "@/constants";
import { ChannelFxState } from "@/types";

type Props = {
  channelFx: Record<string, ChannelFxState>;
  handleChannelFxChange: (
    channel: ChannelName,
    field: keyof ChannelFxState,
    value: number | string,
  ) => void;
  setActiveChannelFxDialog: (channelName: ChannelName) => void;
};

function ChannelFx({
  channelFx,
  handleChannelFxChange,
  setActiveChannelFxDialog,
}: Props) {
  return (
    <div className="ml-2 flex h-[390px] flex-col items-center justify-between">
      {CHANNEL_NAMES.map((channel) => {
        const { delayWet, reverbSend } = channelFx[channel];
        return (
          <div
            key={channel}
            className="flex items-center justify-between space-x-4 rounded pl-2"
          >
            {/* Delay Wet */}
            <div className="flex grow">
              <Label className="mr-2">D</Label>
              <Slider
                value={[delayWet]}
                onValueChange={([val]) =>
                  handleChannelFxChange(channel, "delayWet", val)
                }
                min={0}
                max={1}
                step={0.01}
                className="w-16"
              />
            </div>

            {/* Button for advanced settings dialog */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setActiveChannelFxDialog(channel)}
            >
              <Settings className="h-4 w-4" />
              <span className="sr-only">Advanced Settings</span>
            </Button>

            {/* Reverb Send */}
            <div className="flex">
              <Label className="mr-2">R</Label>
              <Slider
                value={[reverbSend]}
                onValueChange={([val]) =>
                  handleChannelFxChange(channel, "reverbSend", val)
                }
                min={0}
                max={1}
                step={0.01}
                className="w-16"
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export { ChannelFx };
