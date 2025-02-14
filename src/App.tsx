import React, { useRef, useState, useEffect } from "react";
import * as Tone from "tone";
import audioEngine from "./audio-engine";
import { Button } from "@/components/ui/button";
import type { LoopLength } from "./constants";
import { useGrid } from "./use-grid";

// Constants:
const NUM_CHANNELS = 3; // one per drum sample (C2, D2, E2)
const SUBDIVISION = "16n"; // grid resolution
const channelNotes = ["C2", "D2", "E2"];

// Map loop length (in measures) to # of steps in 4/4 time w/ 16th-note subdivisions
const loopMapping: Record<string, number> = {
  "1m": 16,
  "2m": 32,
  "4m": 64,
};


function App() {
  // BPM state.
  const [bpm, setBpm] = useState(120);
  // Loop length state: "1m", "2m", or "4m".
  const [loopLength, setLoopLength] = useState<LoopLength>("1m");
  const [swing, setSwing] = useState(0);
  // # of steps visible based on loop length.
  const numVisibleSteps = loopMapping[loopLength];

  // Use our custom grid hook.
  const { grid, gridRef, toggleCell, duplicatePattern } = useGrid(NUM_CHANNELS);

  // Tone.Loop instance, step counter, and swing value in refs.
  const loopRef = useRef<Tone.Loop | null>(null);
  const stepCounterRef = useRef(0);
  const swingRef = useRef(swing);
  useEffect(() => {
    swingRef.current = swing;
  }, [swing]);

  // NEW: Track which step is "current" for animation purposes
  const [currentStep, setCurrentStep] = useState<number | null>(null);

  // Create Tone.Loop
  const createToneLoop = () => {
    return new Tone.Loop((time) => {
      const step = stepCounterRef.current;
      let scheduledTime = time;
      // Apply swing on odd steps
      if (step % 2 === 1) {
        const swingDelay = swingRef.current * Tone.Time("16n").toSeconds();
        scheduledTime = time + swingDelay;
      }

      // Trigger notes in this step
      gridRef.current.forEach((row, channel) => {
        if (row[step]) {
          audioEngine.playNote(channelNotes[channel], scheduledTime);
        }
      });

      // Tone.Draw for frame-accurate UI updates
      Tone.getDraw().schedule(() => {
        // Update the current step so we can animate it
        setCurrentStep(step);
      }, scheduledTime);

      // Move to the next step
      stepCounterRef.current = (step + 1) % numVisibleSteps;
    }, SUBDIVISION);
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

  // BPM handler
  const handleBpmChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newBpm = parseInt(e.target.value, 10);
    setBpm(newBpm);
    audioEngine.setBPM(newBpm);
  };

  // Loop length handler
  const handleLoopLengthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setLoopLength(e.target.value as LoopLength);
  };

  // Duplicate pattern handler
  const handleDuplicatePattern = () => {
    duplicatePattern(loopLength);
    if (loopLength === "1m") {
      setLoopLength("2m");
    } else if (loopLength === "2m") {
      setLoopLength("4m");
    }
  };

  // Start transport
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

  // Stop transport
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

      {/* Bottom Section: Drum Grid */}
      <div className="rounded border p-4">
        {/* Show only the first numVisibleSteps columns of the master grid */}
        <div
          className="grid gap-1"
          style={{
            gridTemplateColumns: `repeat(${numVisibleSteps}, 2rem)`,
          }}
        >
          {grid.map((row, rowIndex) =>
            row.slice(0, numVisibleSteps).map((cell, colIndex) => {
              // Simple check: is this cell in the "current step"?
              const animate = colIndex === currentStep;
              return (
                <div
                  key={`${rowIndex}-${colIndex}`}
                  onClick={() => toggleCell(rowIndex, colIndex)}
                  data-animate={animate.toString()}
                  className={`h-8 w-8 cursor-pointer border ${
                    cell ? "bg-blue-500" : "bg-gray-200"
                  } ${animate ? "ring-2 ring-red-500" : ""}`}
                />
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

export default App;