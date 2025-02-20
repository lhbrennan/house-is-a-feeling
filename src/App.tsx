import React, { useRef, useState, useEffect } from "react";
import * as Tone from "tone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";

import audioEngine from "./audio-engine";
import { Grid } from "@/components/grid";
import { useGrid } from "./use-grid";
import { ChannelControls } from "@/components/channel-controls";
import { ChannelFxDialog } from "@/components/channel-fx-dialog";
import { ChannelFx } from "@/components/channel-fx";
import { GlobalFxDialog } from "@/components/global-fx-dialog";
import { CHANNEL_NAMES, type ChannelName } from "./constants";
import type {
  PadVelocity,
  ChannelFxState,
  GlobalReverbSettings,
} from "./types";
import type { LoopLength } from "./constants";

const NUM_CHANNELS = CHANNEL_NAMES.length;
const GRID_RESOLUTION = "16n";
const STEPS_MAP: Record<string, number> = {
  "1m": 16,
  "2m": 32,
  "4m": 64,
};

export type ChannelControlsType = {
  mute: boolean;
  solo: boolean;
  volume: number; // normalized 0..1
  pan: number; // -1..1
};

const initialChannelControls: Record<string, ChannelControlsType> =
  Object.fromEntries(
    CHANNEL_NAMES.map((note) => [
      note,
      { mute: false, solo: false, volume: 1, pan: 0 },
    ]),
  );

const initialChannelFx: Record<string, ChannelFxState> = Object.fromEntries(
  CHANNEL_NAMES.map((note) => [
    note,
    { time: "8n", wet: 0.0, feedback: 0.25, reverbSend: 0 },
  ]),
);

const initialGlobalReverbSettings: GlobalReverbSettings = {
  decay: 2.1,
  preDelay: 0.05,
  wet: 1,
};

function getNormalizedVelocity(padVelocity: PadVelocity) {
  switch (padVelocity) {
    case 3:
      return 1.0;
    case 2:
      return 0.6;
    case 1:
      return 0.2;
    default:
      return 0;
  }
}

function App() {
  // ──────────────────────────────────────────────────────────────
  // State
  // ──────────────────────────────────────────────────────────────
  const [engineReady, setEngineReady] = useState(false);
  const [bpm, setBpm] = useState(120);
  const [loopLength, setLoopLength] = useState<LoopLength>("1m");
  const [currentStep, setCurrentStep] = useState<number | null>(null);
  const [swing, setSwing] = useState(0);

  const [channelControls, setChannelControls] = useState(
    initialChannelControls,
  );
  const [channelFx, setChannelFx] = useState(initialChannelFx);
  const [globalReverbSettings, setGlobalReverbSettings] = useState(
    initialGlobalReverbSettings,
  );

  // Dialog states
  const [activeChannelFxDialog, setActiveChannelFxDialog] =
    useState<ChannelName | null>(null);
  const [isGlobalReverbDialogOpen, setIsGlobalReverbDialogOpen] =
    useState(false);

  // Sequencer grid
  const { grid, gridRef, toggleCell, duplicatePattern } = useGrid(NUM_CHANNELS);
  const loopRef = useRef<Tone.Loop | null>(null);
  const stepCounterRef = useRef(0);
  const numVisibleSteps = STEPS_MAP[loopLength];

  // We store swing in a ref so the loop callback can see it
  const swingRef = useRef(swing);
  useEffect(() => {
    swingRef.current = swing;
  }, [swing]);

  // ──────────────────────────────────────────────────────────────
  // Create the main loop
  // ──────────────────────────────────────────────────────────────
  const createToneLoop = () => {
    return new Tone.Loop((time) => {
      const step = stepCounterRef.current;
      let scheduledTime = time;

      // Apply swing on odd steps
      if (step % 2 === 1) {
        const swingDelay = swingRef.current * Tone.Time("16n").toSeconds();
        scheduledTime = time + swingDelay;
      }

      gridRef.current.forEach((row, channelIndex) => {
        const padVelocity = row[step];
        if (padVelocity > 0) {
          const gain = getNormalizedVelocity(padVelocity);
          audioEngine.playNote(
            CHANNEL_NAMES[channelIndex],
            scheduledTime,
            gain,
          );
        }
      });

      Tone.getDraw().schedule(() => {
        setCurrentStep(step);
      }, scheduledTime);

      stepCounterRef.current = (step + 1) % numVisibleSteps;
    }, GRID_RESOLUTION);
  };

  // Re-create the loop whenever loopLength changes
  useEffect(() => {
    audioEngine.setLoopLength(loopLength);
    stepCounterRef.current = 0;

    if (loopRef.current) {
      loopRef.current.dispose();
    }
    loopRef.current = createToneLoop();
    loopRef.current.start(0);
  }, [loopLength, numVisibleSteps]);

  // ──────────────────────────────────────────────────────────────
  // Transport
  // ──────────────────────────────────────────────────────────────
  const handleBpmChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newBpm = parseInt(e.target.value, 10);
    setBpm(newBpm);
    audioEngine.setBPM(newBpm);
  };

  const handleLoopLengthChange = (length: LoopLength) => {
    setLoopLength(length);
  };

  const handleDuplicatePattern = () => {
    duplicatePattern(loopLength);
    if (loopLength === "1m") {
      setLoopLength("2m");
    } else if (loopLength === "2m") {
      setLoopLength("4m");
    }
  };

  const handleStart = async () => {
    if (Tone.getContext().state !== "running") {
      await Tone.getContext().resume();
    }

    if (!engineReady) {
      await audioEngine.init();
      setEngineReady(true);
    }

    if (!loopRef.current) {
      loopRef.current = createToneLoop();
      loopRef.current.start(0);
    }

    audioEngine.startTransport();
  };

  const handleStop = () => {
    audioEngine.stopTransport();
  };

  // ──────────────────────────────────────────────────────────────
  // Spacebar listener to Start/Stop
  // ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const handleSpaceKey = (e: KeyboardEvent) => {
      // Avoid toggling if user is typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      if (e.code === "Space") {
        e.preventDefault();
        if (Tone.getTransport().state === "started") {
          handleStop();
        } else {
          handleStart();
        }
      }
    };
    window.addEventListener("keydown", handleSpaceKey);
    return () => {
      window.removeEventListener("keydown", handleSpaceKey);
    };
  }, []);

  // ──────────────────────────────────────────────────────────────
  // One-time parameter sync after audio engine is ready
  // ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (engineReady) {
      applyAllChannelControls(channelControls);
      applyAllChannelFx(channelFx);
      applyGlobalReverbSettings(globalReverbSettings);
    }
    // We do NOT put channelControls/effects in the dep array
    // because we don't want to re-run for every update.
  }, [engineReady]);

  // ──────────────────────────────────────────────────────────────
  // Channel Controls
  // ──────────────────────────────────────────────────────────────
  function applyAllChannelControls(
    controls: Record<string, ChannelControlsType>,
  ) {
    if (!engineReady) return;
    const anySolo = Object.values(controls).some((ctrl) => ctrl.solo);

    Object.entries(controls).forEach(([note, { mute, solo, volume, pan }]) => {
      const effectiveMute = mute || (anySolo && !solo);
      const volumeDb = effectiveMute ? -Infinity : Tone.gainToDb(volume);
      audioEngine.setChannelVolume(note, volumeDb);
      audioEngine.setChannelPan(note, pan);
    });
  }

  const onChangeChannel = (
    note: string,
    partial: Partial<ChannelControlsType>,
  ) => {
    setChannelControls((prev) => {
      const next = { ...prev };
      next[note] = { ...prev[note], ...partial };

      applyAllChannelControls(next);

      return next;
    });
  };

  // ──────────────────────────────────────────────────────────────
  // Channel Effects (Delay, Reverb Send)
  // ──────────────────────────────────────────────────────────────
  function applyAllChannelFx(effects: Record<string, ChannelFxState>) {
    if (!engineReady) return;
    Object.entries(effects).forEach(([ch, fx]) => {
      audioEngine.setChannelDelayTime(ch, fx.time);
      audioEngine.setChannelDelayWet(ch, fx.wet);
      audioEngine.setChannelDelayFeedback(ch, fx.feedback);
      audioEngine.setChannelReverbSend(ch, fx.reverbSend);
    });
  }

  const handleChannelFxChange = (
    channel: ChannelName,
    field: keyof ChannelFxState,
    value: number | string,
  ) => {
    setChannelFx((prev) => {
      const updated = { ...prev };
      updated[channel] = { ...updated[channel], [field]: value };

      if (engineReady) {
        audioEngine.setChannelDelayTime(channel, updated[channel].time);
        audioEngine.setChannelDelayWet(channel, updated[channel].wet);
        audioEngine.setChannelDelayFeedback(channel, updated[channel].feedback);
        audioEngine.setChannelReverbSend(channel, updated[channel].reverbSend);
      }
      return updated;
    });
  };

  // ──────────────────────────────────────────────────────────────
  // Global Reverb
  // ──────────────────────────────────────────────────────────────
  const applyGlobalReverbSettings = (settings: GlobalReverbSettings) => {
    if (!engineReady) return;
    audioEngine.setGlobalReverbDecay(settings.decay);
    audioEngine.setGlobalReverbPreDelay(settings.preDelay);
    audioEngine.setGlobalReverbWet(settings.wet);
  };

  const handleGlobalReverbChange = (
    field: keyof GlobalReverbSettings,
    value: number,
  ) => {
    setGlobalReverbSettings((prev) => {
      const next = { ...prev, [field]: value };
      if (engineReady) {
        audioEngine.setGlobalReverbDecay(next.decay);
        audioEngine.setGlobalReverbPreDelay(next.preDelay);
        audioEngine.setGlobalReverbWet(next.wet);
      }
      return next;
    });
  };

  return (
    <div className="flex h-screen justify-center">
      <div className="space-y-6 p-4">
        {/* ───────────────────────────────────────────────────── */}
        {/* Top Section: Transport and BPM */}
        {/* ───────────────────────────────────────────────────── */}
        <div className="flex flex-col space-y-4 rounded border p-4">
          <div className="flex items-center space-x-4">
            <Button onClick={handleStart}>Start</Button>
            <Button onClick={handleStop}>Stop</Button>

            {/* Global Effects */}
            <Button onClick={() => setIsGlobalReverbDialogOpen(true)}>
              Global Effects
            </Button>

            {/* BPM */}
            <Label htmlFor="bpm">BPM:</Label>
            <Input
              id="bpm"
              type="number"
              value={bpm}
              onChange={handleBpmChange}
              className="w-20"
            />

            {/* Swing */}
            <div className="flex items-center space-x-2">
              <Label htmlFor="swing">Swing:</Label>
              <Slider
                id="swing"
                value={[swing]}
                onValueChange={([val]) => setSwing(val)}
                max={0.5}
                step={0.01}
                className="w-32"
              />
              <span>{Math.round(swing * 100)}%</span>
            </div>
          </div>
        </div>

        {/* ───────────────────────────────────────────────────── */}
        {/* Main Section: ChannelControls, Grid, & ChannelFx */}
        {/* ───────────────────────────────────────────────────── */}
        <div className="flex">
          <ChannelControls
            channelNames={CHANNEL_NAMES}
            channelControls={channelControls}
            onChangeChannel={onChangeChannel}
          />

          <Grid
            grid={grid}
            toggleCell={toggleCell}
            numVisibleSteps={numVisibleSteps}
            currentStep={currentStep}
          />

          <ChannelFx
            channelFx={channelFx}
            handleChannelFxChange={handleChannelFxChange}
            setActiveChannelFxDialog={setActiveChannelFxDialog}
          />
        </div>

        {/* Bottom: Loop length + Duplicate Pattern */}
        <div className="flex items-center gap-3">
          <span>Loop Length:</span>
          <Select
            value={loopLength}
            onValueChange={(val) => handleLoopLengthChange(val as LoopLength)}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1m">1 Measure</SelectItem>
              <SelectItem value="2m">2 Measures</SelectItem>
              <SelectItem value="4m">4 Measures</SelectItem>
            </SelectContent>
          </Select>

          <Button onClick={handleDuplicatePattern}>Duplicate Pattern</Button>
        </div>
      </div>

      <ChannelFxDialog
        channel={activeChannelFxDialog}
        channelFx={activeChannelFxDialog && channelFx[activeChannelFxDialog]}
        handleChannelFxChange={handleChannelFxChange}
        onClose={() => setActiveChannelFxDialog(null)}
      />

      <GlobalFxDialog
        isOpen={isGlobalReverbDialogOpen}
        globalReverbSettings={globalReverbSettings}
        handleGlobalReverbChange={handleGlobalReverbChange}
        setOpen={setIsGlobalReverbDialogOpen}
      />
    </div>
  );
}

export default App;