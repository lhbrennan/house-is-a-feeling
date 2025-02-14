import * as Tone from "tone";
import type { LoopLength } from "./constants";

let isInitialized = false;
let sampler: Tone.Sampler | null = null;

const audioEngine = {
  /**
   * Initializes the audio engine:
   *  - Starts the AudioContext (must be done on a user gesture)
   *  - Creates a Sampler with local samples and waits for the buffers to load.
   *  - Sets up the global Transport (BPM, looping, etc.).
   */
  async init() {
    if (isInitialized) return;
    await Tone.start();

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

    await Tone.loaded();
    console.log("All Tone buffers are loaded.");

    const transport = Tone.getTransport();
    transport.bpm.value = 120;
    transport.loop = true;
    transport.loopEnd = "1m";

    isInitialized = true;
  },

  startTransport() {
    if (!isInitialized) return;
    Tone.getTransport().start();
  },

  stopTransport() {
    Tone.getTransport().stop();
  },

  setBPM(bpm: number) {
    Tone.getTransport().bpm.value = bpm;
  },

  setLoopLength(loopLength: LoopLength) {
    Tone.getTransport().loopEnd = loopLength;
    console.log(`Loop length set to ${loopLength}`);
  },

  playNote(note: string, time: number) {
    if (sampler) {
      sampler.triggerAttackRelease(note, "16n", time);
    }
  },

  dispose() {
    this.stopTransport();
    sampler?.dispose();
    sampler = null;
    isInitialized = false;
  },
};

export default audioEngine;
