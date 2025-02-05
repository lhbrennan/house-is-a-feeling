import React, { useRef, useState, useEffect } from "react";
import * as Tone from "tone";
import audioEngine from "./audio-engine";

const NUM_CHANNELS = 3; // one per drum sample (assumed order: C2, D2, E2)
const NUM_STEPS = 32;   // 2 bars of 16th notes (16 per bar)
const SUBDIVISION = "16n";

// Map each channel (row) to the corresponding note that the sampler uses.
const channelNotes = ["C2", "D2", "E2"];

const App: React.FC = () => {
  const [bpm, setBpm] = useState(120);
  // Grid state: an array for each channel, each with 32 boolean steps.
  const [grid, setGrid] = useState<boolean[][]>(
    Array.from({ length: NUM_CHANNELS }, () => Array(NUM_STEPS).fill(false))
  );

  // Ref to always have the latest grid in our Tone.Loop callback.
  const gridRef = useRef(grid);
  useEffect(() => {
    gridRef.current = grid;
  }, [grid]);

  // Ref to hold our Tone.Loop instance.
  const loopRef = useRef<Tone.Loop | null>(null);
  // Ref to hold the current step count.
  const stepCounterRef = useRef(0);

  // Removed audioEngine.init() from useEffect.
  // We'll initialize the engine in the start button click handler.

  // Handle BPM changes.
  const handleBpmChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newBpm = parseInt(e.target.value, 10);
    setBpm(newBpm);
    audioEngine.setBPM(newBpm);
  };

  // Start transport and (if needed) create the sequencer loop.
  // This function is now async so we can resume the AudioContext.
  const handleStart = async () => {
    // If the AudioContext is suspended, resume it.
    if (Tone.context.state !== "running") {
      await Tone.context.resume();
    }
    // Initialize the audio engine (this will now run in response to a user gesture)
    await audioEngine.init();
    
    // Create and schedule our Tone.Loop if not already created.
    if (!loopRef.current) {
      loopRef.current = new Tone.Loop((time) => {
        const step = stepCounterRef.current;
        // For each channel, check if the current step is active.
        gridRef.current.forEach((row, channel) => {
          if (row[step]) {
            // Play the note for this channel at the scheduled time.
            audioEngine.playNote(channelNotes[channel], time);
          }
        });
        // Increment step counter modulo NUM_STEPS.
        stepCounterRef.current = (step + 1) % NUM_STEPS;
      }, SUBDIVISION);
      loopRef.current.start(0);
    }
    // Start the global transport.
    audioEngine.startTransport();
  };

  // Stop the transport.
  const handleStop = () => {
    audioEngine.stopTransport();
  };

  // Toggle a cell in the grid when the user clicks it.
  const toggleCell = (row: number, col: number) => {
    setGrid((prev) =>
      prev.map((r, rowIndex) =>
        rowIndex === row
          ? r.map((cell, colIndex) => (colIndex === col ? !cell : cell))
          : r
      )
    );
  };

  return (
    <div className="p-4 space-y-6">
      {/* Top Section: Transport Controls */}
      <div className="border p-4 rounded">
        <div className="flex items-center space-x-4">
          <button
            onClick={handleStart}
            className="px-4 py-2 bg-green-500 rounded text-white"
          >
            Start
          </button>
          <button
            onClick={handleStop}
            className="px-4 py-2 bg-red-500 rounded text-white"
          >
            Stop
          </button>
          <label className="flex items-center space-x-2">
            <span>BPM:</span>
            <input
              type="number"
              value={bpm}
              onChange={handleBpmChange}
              className="border rounded p-1 w-20"
            />
          </label>
        </div>
      </div>

      {/* Bottom Section: Drum Grid */}
      <div className="border p-4 rounded">
        <div className="grid grid-cols-32 gap-1">
          {grid.map((row, rowIndex) =>
            row.map((cell, colIndex) => (
              <div
                key={`${rowIndex}-${colIndex}`}
                onClick={() => toggleCell(rowIndex, colIndex)}
                className={`w-8 h-8 border cursor-pointer ${
                  cell ? "bg-blue-500" : "bg-gray-200"
                }`}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default App;