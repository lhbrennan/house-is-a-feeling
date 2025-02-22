import * as Tone from "tone";
import { SAMPLES, type LoopLength, type ChannelName } from "./constants";

let isInitialized = false;

type Channel = {
  player: Tone.Player;
  volume: Tone.Volume;
  panner: Tone.Panner;
  delay: Tone.FeedbackDelay;
  reverbSend: Tone.Gain;
};

const channels: Partial<Record<ChannelName, Channel>> = {};

let globalReverb: Tone.Reverb;

const getSamplePath = (sample: string) => `/samples/${sample}.wav`;

const initialSamplePaths = Object.fromEntries(
  Object.entries(SAMPLES).map(([channel, sampleNames]) => [
    channel,
    getSamplePath(sampleNames[0]),
  ]),
);

const audioEngine = {
  // --------------------------------------------------------------------------
  // Initialize the audio engine
  // --------------------------------------------------------------------------
  async init() {
    if (isInitialized) return;
    await Tone.start();

    globalReverb = new Tone.Reverb().toDestination();

    // For each channel, use the first sample in the array as the default.
    const players = new Tone.Players(initialSamplePaths);

    // Create channel processing for each channel.
    Object.keys(SAMPLES).forEach((channelName) => {
      const player = players.player(channelName);
      const volume = new Tone.Volume(0);
      const panner = new Tone.Panner(0);
      const feedbackDelay = new Tone.FeedbackDelay();
      const reverbSend = new Tone.Gain(0);

      player.chain(volume, feedbackDelay, panner, Tone.getDestination());
      panner.connect(reverbSend);
      reverbSend.connect(globalReverb);

      channels[channelName as ChannelName] = {
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
  playNote(channelName: ChannelName, time: number, gain: number) {
    const channel = channels[channelName];
    if (!channel || gain <= 0) return;

    // Create an ephemeral Gain node and Player to modulate the note's gain
    const noteGain = new Tone.Gain(gain).connect(channel.volume);

    const p = new Tone.Player({
      url: channel.player.buffer,
    }).connect(noteGain);

    p.start(time);

    // Dispose of the ephemeral nodes after playback
    const sampleDuration = channel.player.buffer?.duration || 1;
    Tone.getTransport().scheduleOnce(() => {
      p.dispose();
      noteGain.dispose();
    }, time + sampleDuration);
  },

  // --------------------------------------------------------------------------
  // Channel-based parameter handlers
  // --------------------------------------------------------------------------
  setChannelVolume(channelName: ChannelName, volumeDb: number) {
    if (channels[channelName]) {
      channels[channelName]!.volume.volume.value = volumeDb;
    }
  },

  setChannelPan(channelName: ChannelName, panValue: number) {
    if (channels[channelName]) {
      channels[channelName]!.panner.pan.value = panValue;
    }
  },

  setChannelDelayTime(channelName: ChannelName, delayTime: string | number) {
    if (channels[channelName]) {
      channels[channelName]!.delay.delayTime.value = delayTime;
    }
  },

  setChannelDelayWet(channelName: ChannelName, wetValue: number) {
    if (channels[channelName]) {
      channels[channelName]!.delay.wet.value = wetValue;
    }
  },

  setChannelDelayFeedback(channelName: ChannelName, feedbackValue: number) {
    if (channels[channelName]) {
      channels[channelName]!.delay.feedback.value = feedbackValue;
    }
  },

  setChannelReverbSend(channelName: ChannelName, sendAmount: number) {
    if (channels[channelName]) {
      channels[channelName]!.reverbSend.gain.value = sendAmount;
    }
  },

  // --------------------------------------------------------------------------
  // Dynamic sample selection per channel
  // --------------------------------------------------------------------------
  async setChannelSample(channelName: ChannelName, newSampleIdx: number) {
    if (!isInitialized || !channels[channelName]) {
      console.error(
        "Audio engine not initialized or channel not found:",
        channelName,
      );
      return;
    }

    const availableSamples = SAMPLES[channelName];
    if (!availableSamples) {
      console.error(`No samples available for channel ${channelName}`);
      return;
    }

    if (newSampleIdx < 0 || newSampleIdx >= availableSamples.length) {
      console.error(
        `Invalid sample index for channel ${channelName}. Must be between 0 and ${availableSamples.length - 1}.`,
      );
      return;
    }

    const newSamplePath = getSamplePath(availableSamples[newSampleIdx]);

    // Use Tone.Player's load method to swap the sample.
    await channels[channelName]!.player.load(newSamplePath);
    console.log(`Channel ${channelName} updated with sample: ${newSamplePath}`);
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
    Object.values(channels).forEach((channel) => {
      if (channel) {
        channel.player.dispose();
        channel.volume.dispose();
        channel.panner.dispose();
        channel.delay.dispose();
        channel.reverbSend.dispose();
      }
    });
    if (globalReverb) {
      globalReverb.dispose();
    }
    isInitialized = false;
  },
};

export default audioEngine;
