import * as Tone from "tone";
import type { LoopLength } from "./constants";

let isInitialized = false;

type Channel = {
  player: Tone.Player;
  volume: Tone.Volume;
  panner: Tone.Panner;
};

const samples = {
  Hat: "/samples/hat.wav",
  Clap: "/samples/clap.wav",
  Kick: "/samples/kick.wav",
};

const channels: Record<string, Channel> = {};

const audioEngine = {
  /**
   * Initializes the audio engine:
   *  - Starts the AudioContext (must be done on a user gesture)
   *  - Creates a Tone.Players instance to load local samples.
   *  - Sets up a per-channel chain (Player -> Volume -> Panner -> Destination).
   *  - Configures the global Transport.
   */
  async init() {
    if (isInitialized) return;
    await Tone.start();

    const players = new Tone.Players(
      samples,
      () => {
        console.log("All players loaded (local samples)!");
      }
    );

    Object.keys(samples).forEach((note) => {
      const player = players.player(note);
      const volume = new Tone.Volume(0);
      const panner = new Tone.Panner(0);
      
      // Chain the nodes: player -> volume -> panner -> destination.
      player.chain(volume, panner, Tone.getDestination());
      
      // Store the channel for later control.
      channels[note] = { player, volume, panner };
    });

    // Wait for all Tone buffers (players) to be loaded.
    await Tone.loaded();
    console.log("All Tone buffers are loaded.");

    // Configure the global transport.
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
    if (channels[note]) {
      channels[note].player.start(time);
    }
  },

  setChannelVolume(note: string, volumeDb: number) {
    if (channels[note]) {
      channels[note].volume.volume.value = volumeDb;
    }
  },

  setChannelPan(note: string, panValue: number) {
    if (channels[note]) {
      channels[note].panner.pan.value = panValue;
    }
  },

  dispose() {
    this.stopTransport();
    Object.values(channels).forEach(({ player, volume, panner }) => {
      player.dispose();
      volume.dispose();
      panner.dispose();
    });
    isInitialized = false;
  },
};

export default audioEngine;