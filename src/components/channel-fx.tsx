import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";

import { CHANNEL_NAMES, ChannelName } from "@/constants";
import { ChannelFxState } from "@/types";
import { Knob } from "@/components/knob";

const logToLinear = (logValue: number, minFreq: number, maxFreq: number) => {
  // Convert a 0-1 value to a logarithmic frequency between minFreq and maxFreq
  return Math.pow(10, logValue * Math.log10(maxFreq / minFreq)) * minFreq;
};

const linearToLog = (linearValue: number, minFreq: number, maxFreq: number) => {
  // Convert a frequency value to a 0-1 logarithmic position
  return Math.log10(linearValue / minFreq) / Math.log10(maxFreq / minFreq);
};

// Format frequency to a readable string
const formatFrequency = (freq: number) => {
  return freq >= 1000
    ? `${(freq / 1000).toFixed(1)}kHz`
    : `${Math.round(freq)}Hz`;
};

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
  const MIN_HP = 20;
  const MAX_HP = 10000;

  const MIN_LP = 50;
  const MAX_LP = 20000;

  return (
    <div className="flex flex-col gap-[10px] pt-2">
      {CHANNEL_NAMES.map((channel) => {
        const { delayWet, reverbSend, highPassFreq, lowPassFreq } =
          channelFx[channel];

        const highPassLogValue = linearToLog(highPassFreq, MIN_HP, MAX_HP);
        const lowPassLogValue = linearToLog(lowPassFreq, MIN_LP, MAX_LP);

        return (
          <div
            key={channel}
            className="flex items-center justify-between space-x-2"
          >
            {/* High Pass Filter */}
            <Knob
              value={highPassLogValue}
              onValueChange={(val) => {
                const freqValue = logToLinear(val, MIN_HP, MAX_HP);
                handleChannelFxChange(channel, "highPassFreq", freqValue);
              }}
              valueVisibility="onHover"
              valueFormat={(val) =>
                formatFrequency(logToLinear(val, MIN_HP, MAX_HP))
              }
              min={0}
              max={1}
              step={0.01}
            />

            {/* Low Pass Filter */}
            <Knob
              value={lowPassLogValue}
              onValueChange={(val) => {
                const freqValue = logToLinear(val, MIN_LP, MAX_LP);
                handleChannelFxChange(channel, "lowPassFreq", freqValue);
              }}
              valueVisibility="onHover"
              valueFormat={(val) =>
                formatFrequency(logToLinear(val, MIN_LP, MAX_LP))
              }
              min={0}
              max={1}
              step={0.01}
              position="right"
            />

            {/* Delay Wet */}
            <Knob
              value={delayWet}
              onValueChange={(val) =>
                handleChannelFxChange(channel, "delayWet", val)
              }
              valueVisibility="onHover"
              valueFormat={(val) => `${Math.round(val * 100)}%`}
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
              valueVisibility="onHover"
              valueFormat={(val) => `${Math.round(val * 100)}%`}
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
