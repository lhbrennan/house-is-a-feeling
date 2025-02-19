import * as Tone from "tone";
import type { LoopLength } from "./constants";

let isInitialized = false;

const samples = {
  Perc2: "/samples/perc_2.wav",
  Perc1: "/samples/perc_1.wav",
  OpenHat: "/samples/open_hat_1.wav",
  ClosedHat: "/samples/closed_hat.wav",
  Snare: "/samples/snare.wav",
  Clap: "/samples/clap.wav",
  Kick2: "/samples/kick_thump.wav",
  Kick1: "/samples/kick.wav",
};

type Channel = {
  player: Tone.Player;
  volume: Tone.Volume;
  panner: Tone.Panner;
  delay: Tone.FeedbackDelay;
  reverbSend: Tone.Gain;
};

const channels: Record<string, Channel> = {};

let globalReverb: Tone.Reverb;

const audioEngine = {
  // --------------------------------------------------------------------------
  // Initialize the audio engine
  // --------------------------------------------------------------------------
  async init() {
    if (isInitialized) return;
    await Tone.start();

    globalReverb = new Tone.Reverb().toDestination();

    const players = new Tone.Players(samples);

    // Create channel processing for each channel
    Object.keys(samples).forEach((note) => {
      const player = players.player(note);
      const volume = new Tone.Volume(0);
      const panner = new Tone.Panner(0);

      const feedbackDelay = new Tone.FeedbackDelay();

      const reverbSend = new Tone.Gain(0);

      player.chain(volume, feedbackDelay, panner, Tone.getDestination());
      panner.connect(reverbSend);
      reverbSend.connect(globalReverb);

      channels[note] = {
        player,
        volume,
        panner,
        delay: feedbackDelay,
        reverbSend,
      };
    });

    await Tone.loaded();
    console.log("All ToneJS buffers are loaded.");

    // --------------------------------------------------------------------------
    // Configure Global Transport
    // --------------------------------------------------------------------------
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

  // --------------------------------------------------------------------------
  // Trigger Note
  // --------------------------------------------------------------------------
  playNote(note: string, time: number, gain: number) {
    const channel = channels[note];
    if (!channel || gain <= 0) return;

    // create an ephemeral Gain node and Player to modulate the note's gain based on velocity value
    const noteGain = new Tone.Gain(gain).connect(channel.volume);

    const p = new Tone.Player({
      url: channel.player.buffer,
    }).connect(noteGain);

    p.start(time);

    // dispose after it finishes
    const sampleDuration = channel.player.buffer?.duration || 1;
    Tone.getTransport().scheduleOnce(() => {
      p.dispose();
      noteGain.dispose();
    }, time + sampleDuration);
  },

  // --------------------------------------------------------------------------
  // Channel-based paramter handlers
  // --------------------------------------------------------------------------
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

  setChannelDelayFeedback(note: string, feedbackValue: number) {
    if (channels[note]) {
      channels[note].delay.feedback.value = feedbackValue;
    }
  },

  setChannelReverbSend(note: string, sendAmount: number) {
    if (channels[note]) {
      channels[note].reverbSend.gain.value = sendAmount;
    }
  },

  // --------------------------------------------------------------------------
  // Global parameter handlers
  // --------------------------------------------------------------------------
  setGlobalReverbDecay(value: number) {
    if (globalReverb) {
      globalReverb.decay = value;
    }
  },

  setGlobalReverbPreDelay(value: number) {
    if (globalReverb) {
      globalReverb.preDelay = value;
    }
  },

  setGlobalReverbWet(value: number) {
    if (globalReverb) {
      globalReverb.wet.value = value;
    }
  },

  // --------------------------------------------------------------------------
  // Disposal
  // --------------------------------------------------------------------------
  dispose() {
    this.stopTransport();
    Object.values(channels).forEach(
      ({ player, volume, panner, delay, reverbSend }) => {
        player.dispose();
        volume.dispose();
        panner.dispose();
        delay.dispose();
        reverbSend.dispose();
      },
    );
    if (globalReverb) {
      globalReverb.dispose();
    }
    isInitialized = false;
  },
};

export default audioEngine;
