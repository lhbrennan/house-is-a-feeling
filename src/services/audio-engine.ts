import * as Tone from "tone";
import { SAMPLES, type LoopLength, type ChannelName } from "@/constants";

let isInitialized = false;

type Channel = {
  player: Tone.Player;
  volume: Tone.Volume;
  panner: Tone.Panner;
  delay: Tone.FeedbackDelay;
  reverbSend: Tone.Gain;
  highPassFilter: Tone.Filter;
  lowPassFilter: Tone.Filter;
};

const channels: Partial<Record<ChannelName, Channel>> = {};

let globalReverb: Tone.Reverb;
let busCompressor: Tone.Compressor;
let compressorMakeUpGain: Tone.Gain;
let compressorWetGain: Tone.Gain;
let compressorDryGain: Tone.Gain;
let compressorBypass: Tone.Gain;
let preEffectsBus: Tone.Gain;

const getSamplePath = (sample: string) => `/samples/${sample}.wav`;

const initialSamplePaths = Object.fromEntries(
  Object.entries(SAMPLES).map(([channel, sampleNames]) => [
    channel,
    getSamplePath(sampleNames[0]),
  ]),
);

let storedCompressorMix = 0.5;

const audioEngine = {
  // --------------------------------------------------------------------------
  // Initialize the audio engine
  // --------------------------------------------------------------------------
  async init() {
    if (isInitialized) return;
    await Tone.start();

    preEffectsBus = new Tone.Gain(1);

    busCompressor = new Tone.Compressor({
      threshold: -24,
      ratio: 4,
      attack: 0.005,
      release: 0.1,
      knee: 10,
    });
    compressorMakeUpGain = new Tone.Gain(1);
    compressorWetGain = new Tone.Gain(0);
    compressorDryGain = new Tone.Gain(1);
    compressorBypass = new Tone.Gain(1);

    // Set up routing with parallel paths for dry/wet mixing:

    // Path 1 (Dry): mainBus -> compressorDryGain -> compressorBypass -> destination
    preEffectsBus.connect(compressorDryGain);
    compressorDryGain.connect(compressorBypass);

    // Path 2 (Wet): mainBus -> busCompressor -> compressorMakeUpGain -> compressorWetGain -> compressorBypass -> destination
    preEffectsBus.connect(busCompressor);
    busCompressor.connect(compressorMakeUpGain);
    compressorMakeUpGain.connect(compressorWetGain);
    compressorWetGain.connect(compressorBypass);

    // Final output
    compressorBypass.toDestination();

    globalReverb = new Tone.Reverb();
    globalReverb.connect(preEffectsBus);

    // For each channel, use the first sample in the array as the default.
    const players = new Tone.Players(initialSamplePaths);

    // Create channel processing for each channel.
    Object.keys(SAMPLES).forEach((channelName) => {
      const player = players.player(channelName);
      const volume = new Tone.Volume(0);
      const panner = new Tone.Panner(0);
      const feedbackDelay = new Tone.FeedbackDelay();
      const reverbSend = new Tone.Gain(0);
      const highPassFilter = new Tone.Filter(20, "highpass");
      const lowPassFilter = new Tone.Filter(20000, "lowpass");

      player.chain(
        highPassFilter,
        lowPassFilter,
        volume,
        feedbackDelay,
        panner,
        preEffectsBus,
      );

      panner.connect(reverbSend);
      reverbSend.connect(globalReverb);

      channels[channelName as ChannelName] = {
        player,
        volume,
        panner,
        delay: feedbackDelay,
        reverbSend,
        highPassFilter,
        lowPassFilter,
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

    // Create an ephemeral Gain node
    const noteGain = new Tone.Gain(gain);

    // Create a new player with the buffer from the original player
    const p = new Tone.Player({
      url: channel.player.buffer,
    });

    // Create temporary filters with the same settings as the channel filters
    const tempHighPass = new Tone.Filter(
      channel.highPassFilter.frequency.value,
      "highpass",
    );
    tempHighPass.Q.value = 0;

    const tempLowPass = new Tone.Filter(
      channel.lowPassFilter.frequency.value,
      "lowpass",
    );
    tempLowPass.Q.value = 0;

    // Connect through a completely independent chain
    p.chain(tempHighPass, tempLowPass, noteGain, channel.volume);

    p.start(time);

    // Dispose of all ephemeral nodes after playback
    const sampleDuration = channel.player.buffer?.duration || 1;
    Tone.getTransport().scheduleOnce(
      () => {
        p.dispose();
        noteGain.dispose();
        tempHighPass.dispose();
        tempLowPass.dispose();
      },
      time + sampleDuration + 0.1, // Add small buffer time to ensure complete playback before nodes are disposed
    );
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
  // Filter parameter handlers
  // --------------------------------------------------------------------------
  setChannelHighPassFreq(channelName: ChannelName, frequency: number) {
    if (channels[channelName]) {
      channels[channelName]!.highPassFilter.frequency.value = frequency;
    }
  },

  setChannelLowPassFreq(channelName: ChannelName, frequency: number) {
    if (channels[channelName]) {
      channels[channelName]!.lowPassFilter.frequency.value = frequency;
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
  // Bus Compressor parameter handlers
  // --------------------------------------------------------------------------
  setBusCompressorEnabled(enabled: boolean) {
    if (!isInitialized) return;

    if (!enabled) {
      // When disabled, set wet to 0 and dry to 1
      compressorWetGain.gain.value = 0;
      compressorDryGain.gain.value = 1;
    } else {
      // When enabled, restore the previous mix setting
      compressorWetGain.gain.value = storedCompressorMix;
      compressorDryGain.gain.value = 1 - storedCompressorMix;
    }
  },

  setBusCompressorThreshold(value: number) {
    if (busCompressor) {
      busCompressor.threshold.value = value;
    }
  },

  setBusCompressorRatio(value: number) {
    if (busCompressor) {
      busCompressor.ratio.value = value;
    }
  },

  setBusCompressorAttack(value: number) {
    if (busCompressor) {
      busCompressor.attack.value = value;
    }
  },

  setBusCompressorRelease(value: number) {
    if (busCompressor) {
      busCompressor.release.value = value;
    }
  },

  setBusCompressorKnee(value: number) {
    if (busCompressor) {
      busCompressor.knee.value = value;
    }
  },

  setBusCompressorMakeUpGain(gain: number) {
    if (!isInitialized) return;

    // Convert gain in dB to linear scale
    const linearGain = Tone.dbToGain(gain);
    compressorMakeUpGain.gain.value = linearGain;
  },

  setBusCompressorMix(mix: number) {
    if (!isInitialized) return;

    // Store the mix value for later use
    storedCompressorMix = mix;

    // Set the wet/dry balance
    compressorWetGain.gain.value = mix;
    compressorDryGain.gain.value = 1 - mix;
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
        channel.highPassFilter.dispose();
        channel.lowPassFilter.dispose();
      }
    });
    if (globalReverb) {
      globalReverb.dispose();
    }
    if (busCompressor) {
      busCompressor.dispose();
    }
    if (compressorMakeUpGain) {
      compressorMakeUpGain.dispose();
    }
    if (compressorWetGain) {
      compressorWetGain.dispose();
    }
    if (compressorDryGain) {
      compressorDryGain.dispose();
    }
    if (compressorBypass) {
      compressorBypass.dispose();
    }
    if (preEffectsBus) {
      preEffectsBus.dispose();
    }
    isInitialized = false;
  },
};

export default audioEngine;
