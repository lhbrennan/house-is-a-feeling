import * as Tone from "tone";

let isInitialized = false;
let sampler: Tone.Sampler | null = null;
let scheduledEvents: Tone.Part[] = [];

interface ScheduleParams {
  pattern: number[]; // e.g. [1, 0, 1, 0]
  subdivision: string; // e.g. '16n'
  callback: (time: number, step: number) => void;
}

const audioEngine = {
  /**
   * Initializes the audio engine:
   *   - Starts the Tone.js AudioContext (after a user gesture).
   *   - Creates and loads any instruments (e.g. a Sampler).
   *   - Configures the Transport for BPM, looping, etc.
   */
  async init() {
    if (isInitialized) return;
    await Tone.start(); // Start AudioContext – must be done in response to a user gesture

    sampler = new Tone.Sampler({
      urls: {
        C2: "kick.wav",
        D2: "clap.wav",
        E2: "hat.wav",
      },
      baseUrl: "/samples/",
      onload: () => {
        console.log("Sampler loaded (local samples)!");
      },
    }).toDestination();
    
    await Tone.loaded(); // Wait until all audio buffers are fully loaded.
    console.log("All Tone buffers are loaded.");

    const transport = Tone.getTransport();
    transport.bpm.value = 120;
    transport.loop = true;
    transport.loopEnd = "1m"; // Loop a measure by default

    isInitialized = true;
  },

  startTransport() { // Starts the Transport, beginning playback of any scheduled events.
    if (!isInitialized) return;
    Tone.getTransport().start();
  },

  stopTransport() {
    Tone.getTransport().stop();
  },

  setBPM(bpm: number) {
    Tone.getTransport().bpm.value = bpm;
  },

  playNote(note: string, time: number) { // Triggers the specified note (using the appropriate sample) for an 8th note.
    if (sampler) {
      sampler.triggerAttackRelease(note, "8n", time); // TODO: this plays an 8th note - should it be 16th note?
    }
  },

  /**
   * Example scheduling method:
   *   - pattern: an array (e.g. [1, 0, 1, 0]) that indicates which steps to trigger.
   *   - subdivision: the duration of each step (e.g. '16n' for sixteenth notes).
   *   - callback: a function run each time a note is triggered.
   */
  schedulePattern({ pattern, subdivision, callback }: ScheduleParams) { // TODO: set default value for subdivision to '16n'
    if (!isInitialized) return;

    // Clear any previously scheduled events.
    this.clearScheduledEvents();

    // Create a Tone.Part that triggers a callback for each pattern index.
    const part = new Tone.Part(
      (time, stepIndex) => {
        if (pattern[stepIndex] === 1 && sampler) {
          sampler.triggerAttackRelease("C2", "8n", time);
          callback(time, stepIndex);
        }
      },
      // Map each index of the pattern to a time offset.
      pattern.map((_, i) => [i * Tone.Time(subdivision).toSeconds(), i]),
    );

    part.loop = true;
    part.loopEnd = `${pattern.length} * ${subdivision}`;

    scheduledEvents.push(part);
    part.start(0);
  },

  /**
   * Clears all scheduled events (e.g. Tone.Part, Tone.Loop) by disposing them.
   */
  clearScheduledEvents() {
    scheduledEvents.forEach((evt) => evt.dispose());
    scheduledEvents = [];
  },

  /**
   * Disposes of audio nodes and clears scheduled events.
   */
  dispose() {
    this.stopTransport();
    this.clearScheduledEvents();
    sampler?.dispose();
    sampler = null;
    isInitialized = false;
  },
};

export default audioEngine;
