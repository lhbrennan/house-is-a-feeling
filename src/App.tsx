import React, { useRef, useState, useEffect } from "react";
import * as Tone from "tone";
import audioEngine from "./audio-engine";
import { Button } from "@/components/ui/button";
import { Pad } from "@/components/pad";
import { createDefaultGrid } from "@/utils";
import type { LoopLength } from "./constants";

// Constants:
const NUM_CHANNELS = 3; // one per drum sample (assumed order: C2, D2, E2)
const SUBDIVISION = "16n"; // grid resolution
const channelNotes = ["C2", "D2", "E2"];

// Map loop length (in measures) to the number of steps in a 4/4 time signature,
// using 16th-note subdivisions (4 beats per measure × 4 steps per beat)
const loopMapping: Record<string, number> = {
  "1m": 16,
  "2m": 32,
  "4m": 64,
};

// Always maintain a master grid with MAX_STEPS columns.
const MAX_STEPS = 64;

function App() {
  // BPM state.
  const [bpm, setBpm] = useState(120);
  // Loop length state: "1m", "2m", or "4m". This also determines how many steps are visible.
  const [loopLength, setLoopLength] = useState<LoopLength>("1m");
  // Swing state: 0 means no swing, 0.1 means 10% swing delay, etc.
  const [swing, setSwing] = useState(0);
  // Number of steps visible (and scheduled) based on the current loop length.
  const numVisibleSteps = loopMapping[loopLength];

  // Master grid state: always MAX_STEPS columns for each channel.
  const [grid, setGrid] = useState<boolean[][]>(
    createDefaultGrid(NUM_CHANNELS, MAX_STEPS),
  );

  // A ref to hold the latest grid for scheduling.
  const gridRef = useRef(grid);
  useEffect(() => {
    gridRef.current = grid;
  }, [grid]);

  // Refs for the Tone.Loop instance, step counter, and swing value.
  const loopRef = useRef<Tone.Loop | null>(null);
  const stepCounterRef = useRef(0);
  const swingRef = useRef(swing);
  useEffect(() => {
    swingRef.current = swing;
  }, [swing]);

  // When loopLength (or numVisibleSteps) changes, update the transport and re-create the Tone.Loop.
  useEffect(() => {
    audioEngine.setLoopLength(loopLength);
    stepCounterRef.current = 0;
    if (loopRef.current) {
      loopRef.current.dispose();
    }
    loopRef.current = new Tone.Loop((time) => {
      const step = stepCounterRef.current;
      let scheduledTime = time;
      // Apply swing on odd steps.
      if (step % 2 === 1) {
        const swingDelay = swingRef.current * Tone.Time("16n").toSeconds();
        scheduledTime = time + swingDelay;
      }
      gridRef.current.forEach((row, channel) => {
        if (row[step]) {
          audioEngine.playNote(channelNotes[channel], scheduledTime);
        }
      });
      stepCounterRef.current = (step + 1) % numVisibleSteps;
    }, SUBDIVISION);
    loopRef.current.start(0);
  }, [loopLength, numVisibleSteps]);

  // Handler for BPM changes.
  const handleBpmChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newBpm = parseInt(e.target.value, 10);
    setBpm(newBpm);
    audioEngine.setBPM(newBpm);
  };

  // Handler for loop length selection.
  const handleLoopLengthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setLoopLength(e.target.value as LoopLength);
  };

  // Duplicate Pattern:
  // If loopLength is "1m", copy steps 0-15 into steps 16-31 and set loopLength to "2m".
  // If loopLength is "2m", copy steps 0-31 into steps 32-63 and set loopLength to "4m".
  const duplicatePattern = () => {
    if (loopLength === "1m") {
      // Duplicate first 16 steps into steps 16-31.
      setGrid((prev) =>
        prev.map((row) => {
          const newRow = [...row];
          for (let i = 0; i < 16; i++) {
            newRow[i + 16] = newRow[i];
          }
          return newRow;
        }),
      );
      setLoopLength("2m");
    } else if (loopLength === "2m") {
      // Duplicate first 32 steps into steps 32-63.
      setGrid((prev) =>
        prev.map((row) => {
          const newRow = [...row];
          for (let i = 0; i < 32; i++) {
            newRow[i + 32] = newRow[i];
          }
          return newRow;
        }),
      );
      setLoopLength("4m");
    }
  };

  // Start transport and create the Tone.Loop if needed.
  const handleStart = async () => {
    if (Tone.getContext().state !== "running") {
      await Tone.getContext().resume();
    }
    await audioEngine.init();
    if (!loopRef.current) {
      loopRef.current = new Tone.Loop((time) => {
        const step = stepCounterRef.current;
        let scheduledTime = time;
        if (step % 2 === 1) {
          const swingDelay = swingRef.current * Tone.Time("16n").toSeconds();
          scheduledTime = time + swingDelay;
        }
        gridRef.current.forEach((row, channel) => {
          if (row[step]) {
            audioEngine.playNote(channelNotes[channel], scheduledTime);
          }
        });
        stepCounterRef.current = (step + 1) % numVisibleSteps;
      }, SUBDIVISION);
      loopRef.current.start(0);
    }
    audioEngine.startTransport();
  };

  // Stop transport.
  const handleStop = () => {
    audioEngine.stopTransport();
  };

  // Toggle a cell in the master grid.
  const toggleCell = (row: number, col: number) => {
    setGrid((prev) =>
      prev.map((r, rowIndex) =>
        rowIndex === row
          ? r.map((cell, colIndex) => (colIndex === col ? !cell : cell))
          : r,
      ),
    );
  };

  return (
    <div className="space-y-6 p-4">
      {/* Top Section: Transport and Settings */}
      <div className="flex flex-col space-y-4 rounded border p-4">
        <div className="flex items-center space-x-4">
          <Pad state="high" onClick={() => {}} />
          <Button
            onClick={handleStart}
            // className="rounded bg-green-500 px-4 py-2 text-white"
          >
            Start
          </Button>
          <Button
            onClick={handleStop}
            // className="rounded bg-red-500 px-4 py-2 text-white"
          >
            Stop
          </Button>
          <label className="flex items-center space-x-2">
            <span>BPM:</span>
            <input
              type="number"
              value={bpm}
              onChange={handleBpmChange}
              // className="w-20 rounded border p-1"
            />
          </label>
        </div>
        <div className="flex items-center space-x-2">
          <span>Loop Length:</span>
          <select
            value={loopLength}
            onChange={handleLoopLengthChange}
            // className="rounded border p-1"
          >
            <option value="1m">1 Measure</option>
            <option value="2m">2 Measures</option>
            <option value="4m">4 Measures</option>
          </select>
          <Button
            onClick={duplicatePattern}
            // className="rounded bg-blue-500 px-4 py-2 text-white"
          >
            Duplicate Pattern
          </Button>
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
        {/* Display only the first numVisibleSteps columns of the master grid */}
        <div
          className="grid gap-1"
          style={{ gridTemplateColumns: `repeat(${numVisibleSteps}, 2rem)` }}
        >
          {grid.map((row, rowIndex) =>
            row
              .slice(0, numVisibleSteps)
              .map((cell, colIndex) => (
                <div
                  key={`${rowIndex}-${colIndex}`}
                  onClick={() => toggleCell(rowIndex, colIndex)}
                  className={`h-8 w-8 cursor-pointer border ${
                    cell ? "bg-blue-500" : "bg-gray-200"
                  }`}
                />
              )),
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
