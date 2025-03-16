import { Midi } from "@tonejs/midi";
import { CHANNEL_NAMES, type ChannelName } from "@/constants";
import type { GridState, PadVelocity } from "@/types";

// Mapping from our velocity values (0-3) to MIDI velocity values (0-127)
function mapVelocityToMidi(velocity: PadVelocity): number {
  switch (velocity) {
    case 0:
      return 0;
    case 1:
      return 40; // Low velocity
    case 2:
      return 80; // Medium velocity
    case 3:
      return 120; // High velocity
    default:
      return 0;
  }
}

// Map our channel names to standard MIDI drum note numbers
// Based on General MIDI drum map where possible
const MIDI_NOTE_MAP: Record<ChannelName, number> = {
  Kick1: 36, // Bass Drum 1
  Kick2: 35, // Bass Drum 2
  Snare: 38, // Snare
  Clap: 39, // Hand Clap
  ClosedHat: 42, // Closed Hi-Hat
  OpenHat: 46, // Open Hi-Hat
  Perc1: 37, // Sidestick
  Perc2: 53, // Claves (using as generic percussion)
};

// Helper function to check if a pattern has any notes
export function patternHasNotes(pattern: GridState): boolean {
  return pattern.some((row) => row.some((cell) => cell > 0));
}

// Create a MIDI file from the current pattern grid
export function exportPatternToMidi(
  pattern: GridState,
  bpm: number,
  patternName = "House is a Feeling",
): Blob {
  // Create a new MIDI file
  const midi = new Midi();

  // Set the tempo
  midi.header.setTempo(bpm);

  // Set time signature to 4/4
  midi.header.timeSignatures.push({
    ticks: 0,
    timeSignature: [4, 4],
  });

  // Add a name
  midi.header.name = patternName;

  // Create a drum track
  const track = midi.addTrack();
  track.channel = 9; // Channel 10 (0-indexed as 9) is the standard drum channel
  track.name = "Drums";

  // A single measure in 16 steps, duration is based on 16th notes
  const stepDuration = 1 / 4; // Quarter note is 1, so 16th note is 1/4

  // Count notes to ensure we're not creating an empty MIDI file
  let noteCount = 0;

  // Add notes for each channel
  CHANNEL_NAMES.forEach((channelName, channelIndex) => {
    const channelRow = pattern[channelIndex];

    // Get the MIDI note number for this channel
    const midiNote = MIDI_NOTE_MAP[channelName];

    // Add notes for this channel
    channelRow.forEach((velocity, stepIndex) => {
      if (velocity > 0) {
        const midiVelocity = mapVelocityToMidi(velocity);
        const startTime = stepIndex * stepDuration;

        // Add the note (with a short duration, as these are drum hits)
        track.addNote({
          midi: midiNote,
          time: startTime,
          duration: 0.1, // Short duration for drum hits
          velocity: midiVelocity / 127, // tonejs-midi uses 0-1 for velocity
        });

        noteCount++;
      }
    });
  });

  console.log(`MIDI file created with ${noteCount} notes`);

  // We no longer add a placeholder note - if there are no notes,
  // the download function will block the export entirely

  // Convert to a blob
  const midiData = midi.toArray();
  console.log("MIDI data array length:", midiData.length);

  return new Blob([midiData], { type: "audio/mid" });
}

// Helper function to trigger a download of the MIDI file
export function downloadMidi(
  pattern: GridState,
  bpm: number,
  filename = "drum-pattern",
): void {
  console.log("Starting MIDI download process for pattern:", pattern);
  console.log("BPM:", bpm, "Filename:", filename);

  // Check if pattern has any notes before proceeding
  if (!patternHasNotes(pattern)) {
    console.warn("Cannot export empty pattern - no notes to export");
    return;
  }

  try {
    const midiBlob = exportPatternToMidi(pattern, bpm, filename);
    console.log("MIDI blob created successfully:", midiBlob);

    // Create a download link
    const url = URL.createObjectURL(midiBlob);
    console.log("Object URL created:", url);

    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}.mid`;

    // Trigger the download
    document.body.appendChild(a);
    console.log("Download link added to document");

    a.click();
    console.log("Download link clicked");

    // Clean up
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    console.log("Cleanup completed");
  } catch (error) {
    console.error("Error in MIDI download process:", error);
  }
}
