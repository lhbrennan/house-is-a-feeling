import React, { useRef, useState, useEffect } from "react";
import { Play, Octagon, Copy, ClipboardCheck } from "lucide-react";

import { ThemeProvider } from "@/components/theme-provider";
import * as Tone from "tone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Toggle } from "@/components/ui/toggle";
import audioEngine from "./audio-engine";
import { Grid } from "@/components/grid";
import { Ruler } from "@/components/ruler";
import { ChannelControls } from "@/components/channel-controls";
import { ChannelFxDialog } from "@/components/channel-fx-dialog";
import { ThemeToggle } from "@/components/theme-toggle";
import { ChannelFx } from "@/components/channel-fx";
import { GlobalFxDialog } from "@/components/global-fx-dialog";
import { SAMPLES, CHANNEL_NAMES, type ChannelName } from "./constants";
import type {
  PadVelocity,
  ChannelFxState,
  GlobalReverbSettings,
  GridState,
} from "./types";
import { useGrid } from "./use-grid";

// ─────────────────────────────────────────────────────────────────
// Types & Constants
// ─────────────────────────────────────────────────────────────────
const NUM_CHANNELS = CHANNEL_NAMES.length;
const NUM_STEPS = 16;

export type ChannelControlsType = {
  mute: boolean;
  solo: boolean;
  volume: number; // normalized 0..1
  pan: number; // -1..1
};

const initialChannelControls: Record<ChannelName, ChannelControlsType> =
  Object.fromEntries(
    CHANNEL_NAMES.map((channel) => [
      channel,
      { mute: false, solo: false, volume: 1, pan: 0 },
    ]),
  ) as Record<ChannelName, ChannelControlsType>;

const initialChannelFx: Record<ChannelName, ChannelFxState> =
  Object.fromEntries(
    CHANNEL_NAMES.map((channel) => [
      channel,
      { time: "8n", wet: 0.0, feedback: 0.25, reverbSend: 0 },
    ]),
  ) as Record<ChannelName, ChannelFxState>;

const initialGlobalReverbSettings: GlobalReverbSettings = {
  decay: 2.1,
  preDelay: 0.05,
  wet: 1,
};

const initialSelectedSampleIndexes: Record<ChannelName, number> =
  Object.fromEntries(CHANNEL_NAMES.map((channel) => [channel, 0])) as Record<
    ChannelName,
    number
  >;

function getNormalizedVelocity(velocity: PadVelocity) {
  switch (velocity) {
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
  const [currentStep, setCurrentStep] = useState<number | null>(null);
  const [swing, setSwing] = useState(0);

  const [currentPattern, setCurrentPattern] = useState<"A" | "B" | "C" | "D">(
    "A",
  );
  const [copiedPattern, setCopiedPattern] = useState<GridState | null>(null);

  const [channelControls, setChannelControls] = useState(
    initialChannelControls,
  );
  const [channelFx, setChannelFx] = useState(initialChannelFx);
  const [globalReverbSettings, setGlobalReverbSettings] = useState(
    initialGlobalReverbSettings,
  );
  const [selectedSampleIndexes, setSelectedSampleIndexes] = useState(
    initialSelectedSampleIndexes,
  );

  // Dialog states
  const [activeChannelFxDialog, setActiveChannelFxDialog] =
    useState<ChannelName | null>(null);
  const [isGlobalReverbDialogOpen, setIsGlobalReverbDialogOpen] =
    useState(false);

  const { patterns, patternsRef, setPatterns, toggleCell, shiftGrid } =
    useGrid(NUM_CHANNELS);

  // Playback references
  const loopRef = useRef<Tone.Loop | null>(null);
  const stepCounterRef = useRef(0);
  const isPlayingRef = useRef(false);

  // We store swing in a ref so the loop callback can see it
  const swingRef = useRef(swing);
  const currentPatternRef = useRef<"A" | "B" | "C" | "D">(currentPattern);

  useEffect(() => {
    swingRef.current = swing;
  }, [swing]);

  useEffect(() => {
    currentPatternRef.current = currentPattern;
  }, [currentPattern]);

  const [isPlaying, setIsPlaying] = useState(false);

  // ──────────────────────────────────────────────────────────────
  // Auto-initialize audio engine
  // ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const initAudioEngine = async () => {
      await audioEngine.init();
      setEngineReady(true);
      console.log("Audio engine initialized via first user interaction.");
    };

    const handleFirstInteraction = () => {
      initAudioEngine();
      window.removeEventListener("click", handleFirstInteraction);
      window.removeEventListener("touchstart", handleFirstInteraction);
    };

    // Listen for the very first interaction.
    window.addEventListener("click", handleFirstInteraction);
    window.addEventListener("touchstart", handleFirstInteraction);

    return () => {
      window.removeEventListener("click", handleFirstInteraction);
      window.removeEventListener("touchstart", handleFirstInteraction);
    };
  }, []);

  // ──────────────────────────────────────────────────────────────
  // Create the main loop
  // ──────────────────────────────────────────────────────────────
  useEffect(() => {
    // If a loop exists, dispose it first
    if (loopRef.current) {
      loopRef.current.dispose();
    }

    loopRef.current = new Tone.Loop((time) => {
      const step = stepCounterRef.current;
      let scheduledTime = time;

      // Apply swing on odd steps
      if (step % 2 === 1) {
        const swingDelay = swingRef.current * Tone.Time("16n").toSeconds();
        scheduledTime = time + swingDelay;
      }

      const patternGrid = patternsRef.current[currentPatternRef.current];
      patternGrid.forEach((row, channelIndex) => {
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
        if (isPlayingRef.current) {
          setCurrentStep(step);
        }
      }, scheduledTime);

      stepCounterRef.current = (step + 1) % NUM_STEPS;
    }, "16n");

    loopRef.current.start(0);
  }, []); // No deps => create once

  // ──────────────────────────────────────────────────────────────
  // Transport
  // ──────────────────────────────────────────────────────────────
  const handleBpmChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newBpm = parseInt(e.target.value, 10);
    setBpm(newBpm);
    audioEngine.setBPM(newBpm);
  };

  const handleStart = async () => {
    if (Tone.getContext().state !== "running") {
      await Tone.getContext().resume();
    }
    isPlayingRef.current = true;
    setIsPlaying(true);
    audioEngine.startTransport();
  };

  const handleStop = () => {
    if (!isPlayingRef.current) return;
    audioEngine.stopTransport();
    isPlayingRef.current = false;
    setIsPlaying(false);
    setCurrentStep(null);
    stepCounterRef.current = 0;
  };

  const handleTogglePlay = async () => {
    if (!isPlaying) {
      await handleStart();
    } else {
      handleStop();
    }
  };

  // Spacebar toggles play/stop
  useEffect(() => {
    const handleSpaceKey = (e: KeyboardEvent) => {
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
    return () => window.removeEventListener("keydown", handleSpaceKey);
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
  }, [engineReady]);

  // ──────────────────────────────────────────────────────────────
  // Channel Controls
  // ──────────────────────────────────────────────────────────────
  function applyAllChannelControls(
    controls: Record<ChannelName, ChannelControlsType>,
  ) {
    if (!engineReady) return;
    const anySolo = Object.values(controls).some((ctrl) => ctrl.solo);

    Object.entries(controls).forEach(
      ([channel, { mute, solo, volume, pan }]) => {
        const effectiveMute = mute || (anySolo && !solo);
        const volumeDb = effectiveMute ? -Infinity : Tone.gainToDb(volume);
        audioEngine.setChannelVolume(channel as ChannelName, volumeDb);
        audioEngine.setChannelPan(channel as ChannelName, pan);
      },
    );
  }

  const onChangeChannel = (
    channel: ChannelName,
    partial: Partial<ChannelControlsType>,
  ) => {
    setChannelControls((prev) => {
      const next = { ...prev };
      next[channel] = { ...prev[channel], ...partial };
      applyAllChannelControls(next);
      return next;
    });
  };

  const handleChannelSampleChange = async (
    channel: ChannelName,
    sampleIdx: number,
  ) => {
    const safeIndex = sampleIdx % SAMPLES[channel].length;
    await audioEngine.setChannelSample(channel, safeIndex);
    setSelectedSampleIndexes((prev) => ({ ...prev, [channel]: safeIndex }));
  };

  // ──────────────────────────────────────────────────────────────
  // Channel FX
  // ──────────────────────────────────────────────────────────────
  function applyAllChannelFx(effects: Record<ChannelName, ChannelFxState>) {
    if (!engineReady) return;
    Object.entries(effects).forEach(([channel, fx]) => {
      audioEngine.setChannelDelayTime(channel as ChannelName, fx.time);
      audioEngine.setChannelDelayWet(channel as ChannelName, fx.wet);
      audioEngine.setChannelDelayFeedback(channel as ChannelName, fx.feedback);
      audioEngine.setChannelReverbSend(channel as ChannelName, fx.reverbSend);
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

  // ──────────────────────────────────────────────────────────────
  // Copy / Paste
  // ──────────────────────────────────────────────────────────────
  const handleCopy = () => {
    setCopiedPattern(patterns[currentPattern]);
  };

  const handlePaste = () => {
    if (!copiedPattern) return;
    setPatterns((prev) => ({
      ...prev,
      [currentPattern]: copiedPattern.map((row) => [...row]),
    }));
  };

  // ──────────────────────────────────────────────────────────────
  // Render
  // ──────────────────────────────────────────────────────────────
  return (
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
      <div className="relative h-screen">
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>

        <div className="flex h-full justify-center">
          <div className="space-y-6 p-4">
            <h1 className="text-center font-[Chicle] text-4xl font-bold text-black drop-shadow-lg dark:text-white">
              House is a Feeling
            </h1>

            {/* Top Section: Transport and BPM */}
            <div className="flex flex-wrap items-center space-x-4 pb-4">
              <Label htmlFor="bpm">BPM:</Label>
              <Input
                id="bpm"
                type="number"
                value={bpm}
                onChange={handleBpmChange}
                className="w-20"
              />

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

              <Button onClick={handleTogglePlay}>
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

              <Button
                onClick={() => setIsGlobalReverbDialogOpen(true)}
                className="ml-auto"
              >
                Global Effects
              </Button>
            </div>

            {/* Main Section: ChannelControls, Grid, & ChannelFx */}
            <div className="flex">
              <ChannelControls
                channelNames={CHANNEL_NAMES}
                channelControls={channelControls}
                onChangeChannel={onChangeChannel}
                selectedSampleIndexes={selectedSampleIndexes}
                onChangeChannelSample={handleChannelSampleChange}
                playNoteImmediately={(channel: ChannelName) =>
                  audioEngine.playNote(channel, Tone.now(), 1)
                }
              />

              <div className="relative">
                <Ruler currentStep={currentStep} numSteps={NUM_STEPS} />
                <Grid
                  grid={patterns[currentPattern]}
                  toggleCell={(row, col, newVal) =>
                    toggleCell(currentPattern, row, col, newVal)
                  }
                  currentStep={currentStep}
                />
              </div>

              <ChannelFx
                channelFx={channelFx}
                handleChannelFxChange={handleChannelFxChange}
                setActiveChannelFxDialog={setActiveChannelFxDialog}
              />
            </div>

            {/* Pattern controls */}
            <div className="flex justify-center items-center gap-4">
              <div className="flex items-center justify-center gap-3">
                <Button variant="outline" onClick={() => shiftGrid(currentPattern, "left")}>
                  Shift Left
                </Button>
                <Button variant="outline" onClick={() => shiftGrid(currentPattern, "right")}>
                  Shift Right
                </Button>
              </div>
              <div className="flex gap-2">
                {(["A", "B", "C", "D"] as const).map((patternLabel) => (
                  <Toggle
                    key={patternLabel}
                    pressed={currentPattern === patternLabel}
                    onPressedChange={() => setCurrentPattern(patternLabel)}
                  >
                    {patternLabel}
                  </Toggle>
                ))}
              </div>

              <div className="ml-4 flex gap-2">
                <Button variant="outline" onClick={handleCopy}>
                  <Copy className="mr-2 h-4 w-4" />
                  Copy
                </Button>
                <Button
                  variant="outline"
                  disabled={!copiedPattern}
                  onClick={handlePaste}
                >
                  <ClipboardCheck className="mr-2 h-4 w-4" />
                  Paste
                </Button>
              </div>
            </div>
          </div>

          <ChannelFxDialog
            channel={activeChannelFxDialog}
            channelFx={
              activeChannelFxDialog && channelFx[activeChannelFxDialog]
            }
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
      </div>
    </ThemeProvider>
  );
}

export default App;
