import React, { useRef, useState, useEffect } from "react";
import * as Tone from "tone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Settings } from "lucide-react";

import audioEngine from "./audio-engine";
import { Grid } from "@/components/grid";
import { useGrid } from "./use-grid";
import { ChannelControls } from "@/components/channel-controls";
import { CHANNEL_NOTES, type ChannelNote } from "./constants";
import type { PadState } from "./types";
import type { LoopLength } from "./constants";

const NUM_CHANNELS = CHANNEL_NOTES.length;
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
  pan: number;    // -1..1
};

const initialChannelControls: Record<string, ChannelControlsType> =
  Object.fromEntries(
    CHANNEL_NOTES.map((note) => [
      note,
      { mute: false, solo: false, volume: 1, pan: 0 },
    ]),
  );

type ChannelEffectsType = {
  time: string; // TODO: rename this to delayTime // TODO: type this better
  wet: number; // TODO: rename this to delayWet
  feedback: number; // TODO: rename this to delayFeedback
  reverbSend: number;
};

const initialChannelEffects: Record<string, ChannelEffectsType> =
  Object.fromEntries(
    CHANNEL_NOTES.map((note) => [
      note,
      { time: "8n", wet: 0.0, feedback: 0.25, reverbSend: 0 },
    ]),
  );

type GlobalReverbSettings = {
  decay: number;
  preDelay: number;
  wet: number;
};

const initialGlobalReverbSettings: GlobalReverbSettings = {
  decay: 2.1,
  preDelay: 0.05,
  wet: 1,
};

function getNormalizedVelocity(padState: PadState) {
  switch (padState) {
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
  const [channelEffects, setChannelEffects] = useState(initialChannelEffects);
  const [globalReverbSettings, setGlobalReverbSettings] = useState(
    initialGlobalReverbSettings,
  );

  // Dialog states
  const [channelEffectsDialog, setChannelEffectsDialog] =
    useState<ChannelNote | null>(null);
  const [globalReverbDialog, setGlobalReverbDialog] = useState(false);

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
        const padState = row[step];
        if (padState > 0) {
          const gain = getNormalizedVelocity(padState);
          audioEngine.playNote(
            CHANNEL_NOTES[channelIndex],
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
      applyAllChannelEffects(channelEffects);
      applyGlobalReverbSettings(globalReverbSettings);
    }
    // We do NOT put channelControls/effects in the dep array
    // because we don't want to re-run for every update.
  }, [engineReady]);

  // ──────────────────────────────────────────────────────────────
  // Channel Controls\
  // ──────────────────────────────────────────────────────────────
  function applyAllChannelControls(controls: Record<string, ChannelControlsType>) {
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
  function applyAllChannelEffects(effects: Record<string, ChannelEffectsType>) {
    if (!engineReady) return;
    Object.entries(effects).forEach(([ch, fx]) => {
      audioEngine.setChannelDelayTime(ch, fx.time);
      audioEngine.setChannelDelayWet(ch, fx.wet);
      audioEngine.setChannelDelayFeedback(ch, fx.feedback);
      audioEngine.setChannelReverbSend(ch, fx.reverbSend);
    });
  }

  const handleChannelEffectsChange = (
    channel: string,
    field: keyof ChannelEffectsType,
    value: number | string,
  ) => {
    setChannelEffects((prev) => {
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

  const currentAdvancedSettings = channelEffectsDialog
    ? channelEffects[channelEffectsDialog]
    : null;
  const closeAdvancedModal = () => setChannelEffectsDialog(null);

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
            <Button onClick={() => setGlobalReverbDialog(true)}>
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
              <span>Swing:</span>
              <input
                type="range"
                min="0"
                max="0.5"
                step="0.01"
                value={swing}
                onChange={(e) => setSwing(parseFloat(e.target.value))}
                className="w-32"
              />
              <span>{Math.round(swing * 100)}%</span>
            </div>
          </div>
        </div>

        {/* ───────────────────────────────────────────────────── */}
        {/* Main Section: ChannelControls, Grid, & Effects */}
        {/* ───────────────────────────────────────────────────── */}
        <div className="flex">
          {/* Left: Channel Controls */}
          <ChannelControls
            channelNotes={CHANNEL_NOTES}
            channelControls={channelControls}
            onChangeChannel={onChangeChannel}
          />

          {/* Middle: Step Sequencer Grid */}
          <Grid
            grid={grid}
            toggleCell={toggleCell}
            numVisibleSteps={numVisibleSteps}
            currentStep={currentStep}
          />

          {/* Right: Quick Delay/Reverb Send Sliders */}
          <div className="ml-4 flex h-10 flex-col space-y-4">
            {CHANNEL_NOTES.map((channel) => {
              const { wet, reverbSend } = channelEffects[channel];
              return (
                <div key={channel} className="flex items-center space-x-4">
                  {/* Delay Wet */}
                  <div>
                    <Label className="mr-2">
                      Delay {(wet * 100).toFixed(0)}%
                    </Label>
                    <Slider
                      value={[wet]}
                      onValueChange={([val]) =>
                        handleChannelEffectsChange(channel, "wet", val)
                      }
                      min={0}
                      max={1}
                      step={0.01}
                    />
                  </div>

                  {/* Reverb Send */}
                  <div>
                    <Label className="mr-2">
                      Reverb {(reverbSend * 100).toFixed(0)}%
                    </Label>
                    <Slider
                      value={[reverbSend]}
                      onValueChange={([val]) =>
                        handleChannelEffectsChange(
                          channel,
                          "reverbSend",
                          val,
                        )
                      }
                      min={0}
                      max={1}
                      step={0.01}
                    />
                  </div>

                  {/* Button for advanced settings dialog */}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setChannelEffectsDialog(channel)}
                  >
                    <Settings className="h-4 w-4" />
                    <span className="sr-only">Advanced Settings</span>
                  </Button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom: Loop length + Duplicate Pattern */}
        <div className="flex items-center gap-3">
          <span>Loop Length:</span>
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

          <Button onClick={handleDuplicatePattern}>Duplicate Pattern</Button>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────── */}
      {/* Advanced Channel Effects Dialog*/}
      {/* ───────────────────────────────────────────────────── */}
      <Dialog
        open={!!channelEffectsDialog}
        onOpenChange={(open) => {
          if (!open) closeAdvancedModal();
        }}
      >
        <DialogContent onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>{channelEffectsDialog} Advanced Effects</DialogTitle>
            <DialogDescription>
              Customize delay time & feedback settings
            </DialogDescription>
          </DialogHeader>

          {currentAdvancedSettings && (
            <div className="space-y-4">
              {/* Delay Time */}
              <div>
                <Label className="mr-2 font-medium">Delay Time:</Label>
                <Select
                  value={currentAdvancedSettings.time.toString()}
                  onValueChange={(val) =>
                    handleChannelEffectsChange(
                      channelEffectsDialog!,
                      "time",
                      val,
                    )
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
                  Feedback: {currentAdvancedSettings.feedback.toFixed(2)}
                </Label>
                <Slider
                  value={[currentAdvancedSettings.feedback]}
                  onValueChange={([val]) =>
                    handleChannelEffectsChange(
                      channelEffectsDialog!,
                      "feedback",
                      val,
                    )
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
            <Button onClick={closeAdvancedModal}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ───────────────────────────────────────────────────── */}
      {/* Global Effects Dialog */}
      {/* ───────────────────────────────────────────────────── */}
      <Dialog open={globalReverbDialog} onOpenChange={setGlobalReverbDialog}>
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
          </div>

          <DialogFooter>
            <Button onClick={() => setGlobalReverbDialog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default App;