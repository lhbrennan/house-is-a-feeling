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
import type { LoopLength } from "./constants";

// ─── Constants ──────────────────────────────────────────────────
const NUM_CHANNELS = 3;
const GRID_RESOLUTION = "16n";
const STEPS_MAP: Record<string, number> = {
  "1m": 16,
  "2m": 32,
  "4m": 64,
};

type ChannelControlsType = {
  mute: boolean;
  solo: boolean;
  volume: number; // normalized 0 to 1 // TODO: can you type this in TS?
  pan: number; // -1 (left) to +1 (right) // TODO: can you type this in TS?
};

const initialChannelControls: Record<string, ChannelControlsType> = {
  Hat: { mute: false, solo: false, volume: 1, pan: 0 },
  Clap: { mute: false, solo: false, volume: 1, pan: 0 },
  Kick: { mute: false, solo: false, volume: 1, pan: 0 },
};

const defaultDelaySettings = {
  Hat: { time: "8n", wet: 0.0, feedback: 0.25 },
  Clap: { time: "8n", wet: 0.0, feedback: 0.25 },
  Kick: { time: "8n", wet: 0.0, feedback: 0.25 },
};

function App() {
  const [bpm, setBpm] = useState(120);
  const [loopLength, setLoopLength] = useState<LoopLength>("1m");
  const [currentStep, setCurrentStep] = useState<number | null>(null);
  const [swing, setSwing] = useState(0);
  const [channelControls, setChannelControls] = useState(
    initialChannelControls,
  );
  const [delaySettings, setDelaySettings] = useState(defaultDelaySettings);
  const [engineReady, setEngineReady] = useState(false);
  const [advancedChannel, setAdvancedChannel] = useState<ChannelNote | null>(
    null,
  ); // null = closed, or "Hat"/"Clap"/"Kick")

  const numVisibleSteps = STEPS_MAP[loopLength];
  const { grid, gridRef, toggleCell, duplicatePattern } = useGrid(NUM_CHANNELS);

  const loopRef = useRef<Tone.Loop | null>(null);
  const stepCounterRef = useRef(0);
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
        if (row[step]) {
          audioEngine.playNote(CHANNEL_NOTES[channelIndex], scheduledTime);
        }
      });

      Tone.getDraw().schedule(() => {
        setCurrentStep(step);
      }, scheduledTime);

      stepCounterRef.current = (step + 1) % numVisibleSteps;
    }, GRID_RESOLUTION);
  };

  // Whenever loopLength changes, recreate the loop
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
  // Transport Controls
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
  // Sync channel volumes & panning
  // ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const anySolo = Object.values(channelControls).some((ctrl) => ctrl.solo);
    Object.keys(channelControls).forEach((note) => {
      const { mute, solo, volume, pan } = channelControls[note];
      const effectiveMute = mute || (anySolo && !solo);
      const volumeDb = effectiveMute ? -Infinity : Tone.gainToDb(volume);
      audioEngine.setChannelVolume(note, volumeDb);
      audioEngine.setChannelPan(note, pan);
    });
  }, [channelControls]);

  // ──────────────────────────────────────────────────────────────
  // Apply delay settings to the audio engine
  // ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!engineReady) return;
    Object.entries(delaySettings).forEach(
      ([channel, { time, wet, feedback }]) => {
        audioEngine.setChannelDelayTime(channel, time);
        audioEngine.setChannelDelayWet(channel, wet);
        audioEngine.setChannelDelayFeedback(channel, feedback);
      },
    );
  }, [delaySettings, engineReady]);

  // Update a field in delaySettings for a given channel
  const handleDelayChange = (
    channel: string,
    field: "time" | "wet" | "feedback",
    value: string | number,
  ) => {
    setDelaySettings((prev) => ({
      ...prev,
      [channel]: {
        ...prev[channel],
        [field]: value,
      },
    }));
  };

  // Current advanced settings (for whichever channel is open)
  const currentAdvancedSettings = advancedChannel
    ? delaySettings[advancedChannel]
    : null;

  // Close the advanced modal
  const closeAdvancedModal = () => setAdvancedChannel(null);

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

            {/* BPM control */}
            <Label htmlFor="bpm">BPM:</Label>
            <Input
              id="bpm"
              type="number"
              value={bpm}
              onChange={handleBpmChange}
              className="w-20"
            />

            {/* Swing slider */}
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
            channelControls={channelControls}
            setChannelControls={setChannelControls}
            channelNotes={CHANNEL_NOTES}
          />

          {/* Middle: Step Sequencer Grid */}
          <Grid
            grid={grid}
            toggleCell={toggleCell}
            numVisibleSteps={numVisibleSteps}
            currentStep={currentStep}
          />

          {/* Right: Simple Delay "Wet" slider + Advanced button */}
          <div className="ml-4 flex flex-col space-y-4">
            {CHANNEL_NOTES.map((channel) => {
              const { wet } = delaySettings[channel];
              return (
                <div key={channel} className="flex rounded border p-3">
                  <div className="mb-2">
                    <Label className="mr-2">
                      Amount {(wet * 100).toFixed(0)}%
                    </Label>

                    {/* Replace <input type="range"> with shadcn/ui <Slider> */}
                    <Slider
                      value={[wet]}
                      onValueChange={([val]) =>
                        handleDelayChange(channel, "wet", val)
                      }
                      min={0}
                      max={1}
                      step={0.01}
                    />
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setAdvancedChannel(channel)}
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
            onValueChange={(value) =>
              handleLoopLengthChange(value as LoopLength)
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
      {/* Advanced Effects Dialog */}
      {/* ───────────────────────────────────────────────────── */}
      <Dialog
        open={!!advancedChannel}
        onOpenChange={(open) => {
          if (!open) closeAdvancedModal();
        }}
      >
        <DialogContent onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>{advancedChannel} Advanced Effects</DialogTitle>
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
                    handleDelayChange(advancedChannel!, "time", val)
                  }
                >
                  <SelectTrigger className="w-[160px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="4n">Quarter (4n)</SelectItem>
                    <SelectItem value="8n">Eighth (8n)</SelectItem>
                    <SelectItem value="8n.">Dotted Eighth (8n.)</SelectItem>
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
                    handleDelayChange(advancedChannel!, "feedback", val)
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
    </div>
  );
}

export default App;
