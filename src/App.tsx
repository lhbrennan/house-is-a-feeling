import React, { useRef, useState, useEffect } from "react";
import * as Tone from "tone";
import audioEngine from "./audio-engine";
import { Button } from "@/components/ui/button";
import type { LoopLength } from "./constants";
import { useGrid } from "./use-grid";
import { Grid } from "./components/grid";

const NUM_CHANNELS = 3; // one per drum sample (C2, D2, E2)
const GRID_RESOLUTION = "16n"; // 16th notes
const CHANNEL_NOTES = ["C2", "D2", "E2"];
const STEPS_MAP: Record<string, number> = {
  // Map loop length in measures to # of steps
  "1m": 16,
  "2m": 32,
  "4m": 64,
};

function App() {
  const [bpm, setBpm] = useState(120);
  const [loopLength, setLoopLength] = useState<LoopLength>("1m");
  const [currentStep, setCurrentStep] = useState<number | null>(null);
  const [swing, setSwing] = useState(0);
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
        setCurrentStep(step); // Update the current step so we can animate it
      }, scheduledTime);

      stepCounterRef.current = (step + 1) % numVisibleSteps;
    }, GRID_RESOLUTION);
  };

  // When loopLength changes, update transport and recreate loop
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

      <Grid
        grid={grid}
        toggleCell={toggleCell}
        numVisibleSteps={numVisibleSteps}
        currentStep={currentStep}
      />
    </div>
  );
}

export default App;
