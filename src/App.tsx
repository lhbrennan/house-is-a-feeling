import React, { useRef, useState, useEffect } from "react";
import { Play, Octagon } from "lucide-react";
import { ThemeProvider } from "@/components/theme-provider";
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
import { Ruler } from "@/components/ruler";
import { useGrid } from "./use-grid";
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

const initialSelectedSampleIndexes = Object.fromEntries(
  CHANNEL_NAMES.map((channel) => [channel, 0]),
) as Record<ChannelName, number>;

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
  const [selectedSampleIndexes, setSelectedSampleIndexes] = useState(
    initialSelectedSampleIndexes,
  );

  // Dialog states
  const [activeChannelFxDialog, setActiveChannelFxDialog] =
    useState<ChannelName | null>(null);
  const [isGlobalReverbDialogOpen, setIsGlobalReverbDialogOpen] =
    useState(false);

  // Sequencer grid
  const { grid, gridRef, toggleCell, duplicateGrid, shiftGrid } =
    useGrid(NUM_CHANNELS);
  const loopRef = useRef<Tone.Loop | null>(null);
  const stepCounterRef = useRef(0);
  const numVisibleSteps = STEPS_MAP[loopLength];

  // We store swing in a ref so the loop callback can see it
  const swingRef = useRef(swing);
  useEffect(() => {
    swingRef.current = swing;
  }, [swing]);

  // Track if currently playing in both a ref and a state variable
  const [isPlaying, setIsPlaying] = useState(false);
  const isPlayingRef = useRef(false);

  // --------------------------------------------------------------------------
  // Auto-initialize the audio engine on first user interaction
  // --------------------------------------------------------------------------
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
        if (isPlayingRef.current) {
          setCurrentStep(step);
        }
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
    duplicateGrid(loopLength);
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
    isPlayingRef.current = true;
    setIsPlaying(true);

    if (!loopRef.current) {
      loopRef.current = createToneLoop();
      loopRef.current.start(0);
    }
    audioEngine.startTransport();
  };

  const handleStop = () => {
    if (isPlayingRef.current === false) {
      return;
    }
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

  // ──────────────────────────────────────────────────────────────
  // Spacebar listener to Start/Stop
  // ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const handleSpaceKey = (e: KeyboardEvent) => {
      // prevent conflicts when typing in an input
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
  }, [engineReady]);

  // ──────────────────────────────────────────────────────────────
  // Channel Controls
  // ──────────────────────────────────────────────────────────────
  function applyAllChannelControls(
    controls: Record<string, ChannelControlsType>,
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
    channel: string,
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
  // Channel Effects (Delay, Reverb Send)
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
            <div className="flex flex-col space-y-4 p-4">
              <div className="flex items-center space-x-4">
                <Button onClick={() => setIsGlobalReverbDialogOpen(true)}>
                  Global Effects
                </Button>

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
              </div>
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
                <Ruler currentStep={currentStep} numSteps={numVisibleSteps} />
                <Grid
                  grid={grid}
                  toggleCell={toggleCell}
                  numVisibleSteps={numVisibleSteps}
                  currentStep={currentStep}
                />
              </div>

              <ChannelFx
                channelFx={channelFx}
                handleChannelFxChange={handleChannelFxChange}
                setActiveChannelFxDialog={setActiveChannelFxDialog}
              />
            </div>

            {/* Bottom: Loop length + Duplicate Pattern */}
            <div className="flex items-center gap-3">
              <Select
                value={loopLength}
                onValueChange={(val) =>
                  handleLoopLengthChange(val as LoopLength)
                }
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

              <Button onClick={handleDuplicatePattern}>Duplicate</Button>

              <div className="flex items-center gap-3">
                <Button onClick={() => shiftGrid("left", numVisibleSteps)}>
                  Shift Left
                </Button>
                <Button onClick={() => shiftGrid("right", numVisibleSteps)}>
                  Shift Right
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
