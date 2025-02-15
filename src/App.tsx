import React, { useRef, useState, useEffect } from "react";
import * as Tone from "tone";
import audioEngine from "./audio-engine";
import { Button } from "@/components/ui/button";
import { ChannelStrip } from "@/components/channel-strip";
import { Grid } from "@/components/grid";
import { useGrid } from "./use-grid";
import type { LoopLength } from "./constants";

const NUM_CHANNELS = 3; // one per drum sample (C2, D2, E2)
const GRID_RESOLUTION = "16n"; // 16th notes
const CHANNEL_NOTES = ["Hat", "Clap", "Kick"];
const STEPS_MAP: Record<string, number> = {
  "1m": 16,
  "2m": 32,
  "4m": 64,
};

type ChannelControls = {
  mute: boolean;
  solo: boolean;
  volume: number; // normalized 0 to 1
  pan: number; // -1 (left) to 1 (right)
};

const initialChannelControls: Record<string, ChannelControls> = {
  Hat: { mute: false, solo: false, volume: 1, pan: 0 },
  Clap: { mute: false, solo: false, volume: 1, pan: 0 },
  Kick: { mute: false, solo: false, volume: 1, pan: 0 },
};

function App() {
  const [bpm, setBpm] = useState(120);
  const [loopLength, setLoopLength] = useState<LoopLength>("1m");
  const [currentStep, setCurrentStep] = useState<number | null>(null);
  const [swing, setSwing] = useState(0);
  const [channelControls, setChannelControls] = useState(
    initialChannelControls,
  );
  const numVisibleSteps = STEPS_MAP[loopLength];

  const { grid, gridRef, toggleCell, duplicatePattern } = useGrid(NUM_CHANNELS);

  const loopRef = useRef<Tone.Loop | null>(null);
  const stepCounterRef = useRef(0);
  const swingRef = useRef(swing);
  useEffect(() => {
    swingRef.current = swing;
  }, [swing]);

  const createToneLoop = () => {
    return new Tone.Loop((time) => {
      const step = stepCounterRef.current;
      let scheduledTime = time;
      // Apply swing on odd steps
      if (step % 2 === 1) {
        const swingDelay = swingRef.current * Tone.Time("16n").toSeconds();
        scheduledTime = time + swingDelay;
      }

      gridRef.current.forEach((row, channel) => {
        if (row[step]) {
          audioEngine.playNote(CHANNEL_NOTES[channel], scheduledTime);
        }
      });

      Tone.getDraw().schedule(() => {
        setCurrentStep(step);
      }, scheduledTime);

      stepCounterRef.current = (step + 1) % numVisibleSteps;
    }, GRID_RESOLUTION);
  };

  // When loopLength changes, update transport and recreate loop.
  useEffect(() => {
    audioEngine.setLoopLength(loopLength);
    stepCounterRef.current = 0;
    if (loopRef.current) {
      loopRef.current.dispose();
    }
    loopRef.current = createToneLoop();
    loopRef.current.start(0);
  }, [loopLength, numVisibleSteps]);

  const handleBpmChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newBpm = parseInt(e.target.value, 10);
    setBpm(newBpm);
    audioEngine.setBPM(newBpm);
  };

  const handleLoopLengthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setLoopLength(e.target.value as LoopLength);
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
    await audioEngine.init();
    if (!loopRef.current) {
      loopRef.current = createToneLoop();
      loopRef.current.start(0);
    }
    audioEngine.startTransport();
  };

  const handleStop = () => {
    audioEngine.stopTransport();
  };

  // Effect to synchronize channel controls with the audio engine.
  useEffect(() => {
    const anySolo = Object.values(channelControls).some((ctrl) => ctrl.solo);

    // For each channel, compute effective mute and update the engine.
    Object.keys(channelControls).forEach((note) => {
      const { mute, solo, volume, pan } = channelControls[note];
      // Compute effective mute: mute if the channel's mute is true, or if any channel is soloed and this one isn't soloed.
      const effectiveMute = mute || (anySolo && !solo);
      const volumeDb = effectiveMute ? -Infinity : Tone.gainToDb(volume);
      console.log(`Setting ${note} volume to ${volumeDb} dB`);
      audioEngine.setChannelVolume(note, volumeDb);
      audioEngine.setChannelPan(note, pan);
    });
  }, [channelControls]);

  return (
    <div className="space-y-6 p-4">
      {/* Top Section: Transport and Settings */}
      <div className="flex flex-col space-y-4 rounded border p-4">
        <div className="flex items-center space-x-4">
          <Button onClick={handleStart}>Start</Button>
          <Button onClick={handleStop}>Stop</Button>
          <label className="flex items-center space-x-2">
            <span>BPM:</span>
            <input
              type="number"
              value={bpm}
              onChange={handleBpmChange}
              className="w-20 rounded border p-1"
            />
          </label>
        </div>
        <div className="flex items-center space-x-2">
          <span>Loop Length:</span>
          <select
            value={loopLength}
            onChange={handleLoopLengthChange}
            className="rounded border p-1"
          >
            <option value="1m">1 Measure</option>
            <option value="2m">2 Measures</option>
            <option value="4m">4 Measures</option>
          </select>
          <Button onClick={handleDuplicatePattern}>Duplicate Pattern</Button>
        </div>
      </div>

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

      <div className="flex">
        {/* Channel Controls */}
        <div className="space-y-4 rounded border p-4">
          {CHANNEL_NOTES.map((note) => {
            const { volume, mute, solo, pan } = channelControls[note];
            return (
              <div key={note} className="flex items-center space-x-4">
                <ChannelStrip
                  label={note}
                  volume={volume}
                  changeVolume={(volume) =>
                    setChannelControls((prev) => ({
                      ...prev,
                      [note]: {
                        ...prev[note],
                        volume,
                      },
                    }))
                  }
                  mute={mute}
                  toggleMute={() =>
                    setChannelControls((prev) => ({
                      ...prev,
                      [note]: { ...prev[note], mute: !prev[note].mute },
                    }))
                  }
                  solo={solo}
                  toggleSolo={() =>
                    setChannelControls((prev) => ({
                      ...prev,
                      [note]: { ...prev[note], solo: !prev[note].solo },
                    }))
                  }
                  pan={pan}
                  changePan={(newValue) =>
                    setChannelControls((prev) => ({
                      ...prev,
                      [note]: {
                        ...prev[note],
                        pan: newValue,
                      },
                    }))
                  }
                />
              </div>
            );
          })}
        </div>

        <Grid
          grid={grid}
          toggleCell={toggleCell}
          numVisibleSteps={numVisibleSteps}
          currentStep={currentStep}
        />
      </div>
    </div>
  );
}

export default App;
