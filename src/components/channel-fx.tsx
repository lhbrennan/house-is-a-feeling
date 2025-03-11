import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";

import { CHANNEL_NAMES, ChannelName } from "@/constants";
import { ChannelFxState } from "@/types";
import { Knob } from "@/components/knob";

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
    <div className="flex h-[390px] flex-col items-center justify-between">
      {CHANNEL_NAMES.map((channel) => {
        const { delayWet, reverbSend } = channelFx[channel];
        return (
          <div
            key={channel}
            className="flex items-center justify-between space-x-4"
          >
            {/* Delay Wet */}

            <Knob
              value={delayWet}
              onValueChange={(val) =>
                handleChannelFxChange(channel, "delayWet", val)
              }
              valueVisibility="hidden"
              min={0}
              max={1}
              step={0.01}
            />

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
            <Knob
              value={reverbSend}
              onValueChange={(val) =>
                handleChannelFxChange(channel, "reverbSend", val)
              }
              valueVisibility="hidden"
              min={0}
              max={1}
              step={0.01}
            />
          </div>
        );
      })}
    </div>
  );
}

export { ChannelFx };
