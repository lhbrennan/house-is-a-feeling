import React, { useRef, useState, useEffect } from "react";
import { Play, Octagon, Copy, ClipboardCheck } from "lucide-react";

import { ThemeProvider } from "@/components/theme-provider";
import * as Tone from "tone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Toggle } from "@/components/ui/toggle";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

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
  BusCompressorSettings,
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

const initialBusCompressorSettings: BusCompressorSettings = {
  enabled: false,
  threshold: -24,
  ratio: 4,
  attack: 0.005,
  release: 0.1,
  knee: 10,
  makeUpGain: 0,
  mix: 0,
};

const initialSelectedSampleIndexes: Record<ChannelName, number> =
  Object.fromEntries(CHANNEL_NAMES.map((channel) => [channel, 0])) as Record<
    ChannelName,
    number
  >;

/** Utility to convert pad velocity (1..3) to gain (0..1). */
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
  const [busCompressorSettings, setBusCompressorSettings] = useState(
    initialBusCompressorSettings,
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
  // Pattern Chain States, Moved to Refs
  // ──────────────────────────────────────────────────────────────
  // We keep the official "UI state" in normal React state,
  // but we also store them in refs so the Tone.Loop callback sees updates.
  const [chainEnabled, setChainEnabled] = useState(false);
  const chainEnabledRef = useRef(chainEnabled);
  useEffect(() => {
    chainEnabledRef.current = chainEnabled;
  }, [chainEnabled]);

  const [chainLength, setChainLength] = useState(4);
  const chainLengthRef = useRef(chainLength);
  useEffect(() => {
    chainLengthRef.current = chainLength;
  }, [chainLength]);

  const [patternChain, setPatternChain] = useState<
    Array<"A" | "B" | "C" | "D">
  >(["A", "A", "B", "B", "A", "A", "A", "A"]);
  const patternChainRef = useRef(patternChain);
  useEffect(() => {
    patternChainRef.current = patternChain;
  }, [patternChain]);

  // We'll track which measure is playing for UI highlight
  const measureCounterRef = useRef(0);
  const [chainMeasure, setChainMeasure] = useState(0);

  const getDisplayedPattern = (): "A" | "B" | "C" | "D" => {
    if (chainEnabled && isPlaying) {
      return patternChain[chainMeasure];
    }
    return currentPattern;
  };

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
  // Create the main loop once
  // ──────────────────────────────────────────────────────────────
  useEffect(() => {
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

      // Check if chain is enabled
      let activePattern: "A" | "B" | "C" | "D";
      if (chainEnabledRef.current) {
        // If chain is on, pick from patternChainRef
        const measureIndex = measureCounterRef.current;
        activePattern = patternChainRef.current[measureIndex];
      } else {
        // Otherwise use the single selected pattern
        activePattern = currentPatternRef.current;
      }

      const patternGrid = patternsRef.current[activePattern];
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
          setChainMeasure(measureCounterRef.current);
        }
      }, scheduledTime);

      stepCounterRef.current = (step + 1) % NUM_STEPS;

      if (step === NUM_STEPS - 1) {
        // End of measure, move to next chain measure if chain is on
        if (chainEnabledRef.current) {
          measureCounterRef.current =
            (measureCounterRef.current + 1) % chainLengthRef.current;
        } else {
          measureCounterRef.current = 0;
        }
      }
    }, "16n");

    loopRef.current.start(0);
  }, []); // no deps, we only create this loop once

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

    // When stopping with chain enabled, set the current pattern to match
    // the pattern that was playing when stopped
    if (chainEnabledRef.current) {
      // Get the current pattern from the chain
      const currentMeasure = measureCounterRef.current;
      const patternAtStop = patternChainRef.current[currentMeasure];
      console.log(
        "Stopping on measure",
        currentMeasure,
        "with pattern",
        patternAtStop,
      );
      setCurrentPattern(patternAtStop);
    }

    // Now stop the transport and reset playback state
    audioEngine.stopTransport();
    isPlayingRef.current = false;
    setIsPlaying(false);
    setCurrentStep(null);
    stepCounterRef.current = 0;
    measureCounterRef.current = 0;
    setChainMeasure(0);
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
      applyBusCompressorSettings(busCompressorSettings);
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
  // Bus Compressor
  // ──────────────────────────────────────────────────────────────
  const applyBusCompressorSettings = (settings: BusCompressorSettings) => {
    if (!engineReady) return;
    audioEngine.setBusCompressorEnabled(settings.enabled);
    audioEngine.setBusCompressorThreshold(settings.threshold);
    audioEngine.setBusCompressorRatio(settings.ratio);
    audioEngine.setBusCompressorAttack(settings.attack);
    audioEngine.setBusCompressorRelease(settings.release);
    audioEngine.setBusCompressorKnee(settings.knee);
    audioEngine.setBusCompressorMakeUpGain(settings.makeUpGain);
    audioEngine.setBusCompressorMix(settings.mix);
  };

  const handleBusCompressorChange = (
    field: keyof BusCompressorSettings,
    value: number | boolean,
  ) => {
    setBusCompressorSettings((prev) => {
      const next = { ...prev, [field]: value };

      if (engineReady) {
        switch (field) {
          case "enabled":
            audioEngine.setBusCompressorEnabled(value as boolean);
            break;
          case "threshold":
            audioEngine.setBusCompressorThreshold(value as number);
            break;
          case "ratio":
            audioEngine.setBusCompressorRatio(value as number);
            break;
          case "attack":
            audioEngine.setBusCompressorAttack(value as number);
            break;
          case "release":
            audioEngine.setBusCompressorRelease(value as number);
            break;
          case "knee":
            audioEngine.setBusCompressorKnee(value as number);
            break;
          case "makeUpGain":
            audioEngine.setBusCompressorMakeUpGain(value as number);
            break;
          case "mix":
            audioEngine.setBusCompressorMix(value as number);
            break;
        }
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
            <h1 className="text-foreground text-center font-[Chicle] text-4xl font-bold drop-shadow-lg">
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
                <Ruler
                  currentStep={currentStep}
                  numSteps={NUM_STEPS}
                  chainEnabled={chainEnabled}
                  chainMeasure={chainMeasure}
                />
                <Grid
                  grid={patterns[getDisplayedPattern()]}
                  toggleCell={(row, col, newVal) =>
                    toggleCell(getDisplayedPattern(), row, col, newVal)
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
            <div className="flex items-center justify-center gap-4">
              <div className="flex items-center justify-center gap-3">
                <Button
                  variant="outline"
                  onClick={() => shiftGrid(getDisplayedPattern(), "left")}
                >
                  Shift Left
                </Button>
                <Button
                  variant="outline"
                  onClick={() => shiftGrid(getDisplayedPattern(), "right")}
                >
                  Shift Right
                </Button>
              </div>
              <div className="flex gap-2">
                {(["A", "B", "C", "D"] as const).map((patternLabel) => {
                  // When chain mode is active and playing, show the current chain pattern as selected
                  // Otherwise show the manually selected pattern
                  const isSelected =
                    isPlaying && chainEnabled
                      ? patternChain[chainMeasure] === patternLabel
                      : currentPattern === patternLabel;

                  return (
                    <Toggle
                      key={patternLabel}
                      pressed={isSelected}
                      onPressedChange={() => {
                        // Only allow manual selection when not playing with chain enabled
                        if (!(isPlaying && chainEnabled)) {
                          setCurrentPattern(patternLabel);
                        }
                      }}
                    >
                      {patternLabel}
                    </Toggle>
                  );
                })}
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

            {/* ──────────────────────────────────────────────────────────────
    Pattern Chain UI
   ────────────────────────────────────────────────────────────── */}
            <div className="relative mt-4">
              {/* Base container */}
              <div
                className={`relative flex h-14 items-center overflow-hidden rounded-md border border-solid transition-all duration-300 ease-in-out ${chainEnabled ? "w-full" : "w-[150px]"} `}
              >
                {/* Chain toggle section */}
                <div className="flex h-full w-[150px] shrink-0 items-center px-3">
                  <Label className="mr-3 text-sm font-medium">Chain:</Label>
                  <Switch
                    checked={chainEnabled}
                    onCheckedChange={(val) => {
                      setChainEnabled(val);
                      measureCounterRef.current = 0;
                      setChainMeasure(0);
                    }}
                  />
                </div>

                {/* Divider line with animation */}
                <div
                  className={`h-14 self-stretch border-l transition-opacity duration-300 ease-in-out ${chainEnabled ? "opacity-100" : "opacity-0"} `}
                ></div>

                {/* Chain options that slide into view */}
                <div
                  className={`flex h-full flex-nowrap items-center gap-4 pr-3 pl-4 transition-all duration-300 ease-in-out ${chainEnabled ? "max-w-[2000px] opacity-100" : "max-w-0 overflow-hidden opacity-0"} `}
                >
                  <div className="flex shrink-0 items-center space-x-2">
                    <Label className="text-sm whitespace-nowrap">Length:</Label>
                    <Select
                      value={chainLength.toString()}
                      onValueChange={(val) => {
                        const newLen = parseInt(val, 10);
                        setChainLength(newLen);
                        measureCounterRef.current = 0;
                        setChainMeasure(0);
                      }}
                    >
                      <SelectTrigger className="h-8 w-[60px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[4, 5, 6, 7, 8].map((len) => (
                          <SelectItem key={len} value={len.toString()}>
                            {len}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="scrollbar-thin flex flex-nowrap items-center gap-2 overflow-x-auto">
                    {Array.from({ length: chainLength }).map((_, i) => {
                      const isActiveMeasure = isPlaying && chainMeasure === i;
                      return (
                        <div
                          key={i}
                          className={`flex flex-shrink-0 items-center space-x-1 rounded p-1 ${
                            isActiveMeasure
                              ? "bg-blue-100 dark:bg-blue-900"
                              : "bg-muted"
                          }`}
                        >
                          <Label className="w-4 text-center text-xs leading-none">
                            {i + 1}
                          </Label>
                          <Select
                            value={patternChain[i]}
                            onValueChange={(val) => {
                              setPatternChain((prev) => {
                                const next = [...prev];
                                next[i] = val as "A" | "B" | "C" | "D";
                                return next;
                              });
                            }}
                          >
                            <SelectTrigger className="h-7 w-[55px] px-2 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {(["A", "B", "C", "D"] as const).map((p) => (
                                <SelectItem key={p} value={p}>
                                  {p}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
            {/* ──────────────────────────────────────────────────────────────
    END: Final Pattern Chain UI
   ────────────────────────────────────────────────────────────── */}
          </div>

          {/* ChannelFx Dialog */}
          <ChannelFxDialog
            channel={activeChannelFxDialog}
            channelFx={
              activeChannelFxDialog && channelFx[activeChannelFxDialog]
            }
            handleChannelFxChange={handleChannelFxChange}
            onClose={() => setActiveChannelFxDialog(null)}
          />

          {/* GlobalFx Dialog */}
          <GlobalFxDialog
            isOpen={isGlobalReverbDialogOpen}
            globalReverbSettings={globalReverbSettings}
            busCompressorSettings={busCompressorSettings}
            handleGlobalReverbChange={handleGlobalReverbChange}
            handleBusCompressorChange={handleBusCompressorChange}
            setOpen={setIsGlobalReverbDialogOpen}
          />
        </div>
      </div>
    </ThemeProvider>
  );
}

export default App;
