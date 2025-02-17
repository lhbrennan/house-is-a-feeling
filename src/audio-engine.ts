import * as Tone from "tone";
import type { LoopLength } from "./constants";

let isInitialized = false;

type Channel = {
  player: Tone.Player;
  volume: Tone.Volume;
  panner: Tone.Panner;
  delay: Tone.FeedbackDelay;
};

const samples = {
  Perc2:"/samples/perc_2.wav",
  Perc1:"/samples/perc_1.wav",
  OpenHat:"/samples/open_hat_1.wav",
  ClosedHat:"/samples/closed_hat.wav",
  Snare:"/samples/snare.wav",
  Clap:"/samples/clap.wav",
  Kick2:"/samples/kick_thump.wav",
  Kick1:"/samples/kick.wav",
};

const channels: Record<string, Channel> = {};

const audioEngine = {
  /**
   * Initializes the audio engine:
   *  - Starts the AudioContext (must be done on a user gesture)
   *  - Creates a Tone.Players instance to load local samples.
   *  - Sets up a per-channel chain (Player -> Volume -> Delay -> Panner -> Destination). // TODO: are you sure you want Panner after Delay? If yes, update UI to reflect this path
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

      // First argument: Delay time (e.g. "8n" = eighth note)
      // Second argument: Feedback amount (0.5 = 50%)
      const feedbackDelay = new Tone.FeedbackDelay("8n", 0.5);
      player.chain(volume, feedbackDelay, panner, Tone.getDestination());

      channels[note] = {
        player,
        volume,
        panner,
        delay: feedbackDelay,
      };
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

  setChannelDelayTime(note: string, delayTime: string | number) {
    if (channels[note]) {
      channels[note].delay.delayTime.value = delayTime;
    }
  },

  setChannelDelayWet(note: string, wetValue: number) {
    if (channels[note]) {
      channels[note].delay.wet.value = wetValue;
    }
  },

  setChannelDelayFeedback(note: string, feedbackValue: number) { // 0.2–0.6 is a good range. 0.0 = no repeats, 1.0 = infinite repeats
    if (channels[note]) {
      channels[note].delay.feedback.value = feedbackValue;
    }
  },

  dispose() {
    this.stopTransport();
    Object.values(channels).forEach(({ player, volume, panner, delay }) => {
      player.dispose();
      volume.dispose();
      panner.dispose();
      delay.dispose();
    });
    isInitialized = false;
  },
};

export default audioEngine;