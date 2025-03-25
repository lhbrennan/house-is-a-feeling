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

type PooledPlayer = {
  player: Tone.Player;
  gain: Tone.Gain;
  inUse: boolean;
  lastUsedTime: number;
};

const channels: Partial<Record<ChannelName, Channel>> = {};
const playerPools: Record<string, PooledPlayer[]> = {};
const PLAYERS_PER_CHANNEL = 8;

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

    // Create main signal path
    preEffectsBus = new Tone.Gain(1);

    // Compressor setup
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

    // Setup parallel compression paths
    preEffectsBus.connect(compressorDryGain);
    compressorDryGain.connect(compressorBypass);

    preEffectsBus.connect(busCompressor);
    busCompressor.connect(compressorMakeUpGain);
    compressorMakeUpGain.connect(compressorWetGain);
    compressorWetGain.connect(compressorBypass);

    compressorBypass.toDestination();

    // Create and connect reverb
    globalReverb = new Tone.Reverb({
      decay: 2.5,
      preDelay: 0.05,
      wet: 1,
    });
    globalReverb.connect(preEffectsBus);

    // Create channel processing chains
    for (const channelName of Object.keys(SAMPLES)) {
      const channel = channelName as ChannelName;

      // Create main channel processing nodes
      const player = new Tone.Player();
      const volume = new Tone.Volume(0);
      const panner = new Tone.Panner(0);
      const feedbackDelay = new Tone.FeedbackDelay();
      const reverbSend = new Tone.Gain(0);
      const highPassFilter = new Tone.Filter(20, "highpass");
      const lowPassFilter = new Tone.Filter(20000, "lowpass");

      // Connect channel processing chain
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

      // Store channel references
      channels[channel] = {
        player,
        volume,
        panner,
        delay: feedbackDelay,
        reverbSend,
        highPassFilter,
        lowPassFilter,
      };

      // Load initial sample
      const initialSamplePath = initialSamplePaths[channel];
      try {
        console.log(`Loading sample for ${channel}: ${initialSamplePath}`);
        await player.load(initialSamplePath);
        console.log(`Sample loaded for ${channel}`);
      } catch (error) {
        console.error(`Error loading sample for ${channel}:`, error);
      }

      // Initialize player pool for this channel
      this.initPlayerPool(channel);
    }

    // Configure Global Transport
    const transport = Tone.getTransport();
    transport.bpm.value = 120;
    transport.loop = true;
    transport.loopEnd = "1m";

    isInitialized = true;
    console.log("Audio engine initialization complete!");
  },

  // --------------------------------------------------------------------------
  // Player Pool Management
  // --------------------------------------------------------------------------
  initPlayerPool(channelName: ChannelName) {
    console.log(`Initializing player pool for ${channelName}`);
    playerPools[channelName] = [];

    const channel = channels[channelName];
    if (!channel) {
      console.error(`Channel ${channelName} not found`);
      return;
    }

    for (let i = 0; i < PLAYERS_PER_CHANNEL; i++) {
      // We won't set the buffer now - will be set on first play
      const player = new Tone.Player();

      // Create gain node for velocity control
      const gain = new Tone.Gain(1);

      // Connect player to gain, then gain to the filters
      player.connect(gain);
      gain.connect(channel.highPassFilter);

      // Add to pool
      playerPools[channelName].push({
        player,
        gain,
        inUse: false,
        lastUsedTime: 0,
      });
    }

    console.log(
      `Pool for ${channelName} initialized with ${PLAYERS_PER_CHANNEL} players`,
    );
  },

  getFreePlayerFromPool(channelName: ChannelName): PooledPlayer | null {
    const pool = playerPools[channelName];
    if (!pool) {
      console.error(`No player pool exists for channel ${channelName}`);
      return null;
    }

    const now = Tone.now();

    // First, look for any player that's completely free
    for (let i = 0; i < pool.length; i++) {
      if (!pool[i].inUse) {
        pool[i].inUse = true;
        pool[i].lastUsedTime = now;
        return pool[i];
      }
    }

    // If all are in use, find the oldest used player
    let oldestIndex = 0;
    let oldestTime = Infinity;

    for (let i = 0; i < pool.length; i++) {
      if (pool[i].lastUsedTime < oldestTime) {
        oldestTime = pool[i].lastUsedTime;
        oldestIndex = i;
      }
    }

    if (now - oldestTime < 0.05) {
      console.warn(
        `All ${PLAYERS_PER_CHANNEL} players for ${channelName} are being used simultaneously.`,
      );
    }

    // Reuse the oldest player - it's likely finished playing already
    pool[oldestIndex].inUse = true;
    pool[oldestIndex].lastUsedTime = now;
    return pool[oldestIndex];
  },

  // Release player back to the pool
  releasePlayer(pooledPlayer: PooledPlayer, delay = 0.2) {
    // Schedule release a bit later to ensure note has fully played
    setTimeout(() => {
      pooledPlayer.inUse = false;
    }, delay * 1000);
  },

  // --------------------------------------------------------------------------
  // Transport Controls
  // --------------------------------------------------------------------------
  startTransport() {
    if (!isInitialized) return;
    Tone.getTransport().start();
  },

  stopTransport() {
    Tone.getTransport().stop();

    // Reset all players in the pool
    Object.keys(playerPools).forEach((channelName) => {
      playerPools[channelName].forEach((node) => {
        node.inUse = false;
      });
    });
  },

  setBPM(bpm: number) {
    Tone.getTransport().bpm.value = bpm;
  },

  setLoopLength(loopLength: LoopLength) {
    Tone.getTransport().loopEnd = loopLength;
  },

  // --------------------------------------------------------------------------
  // Trigger Note using Player Pool
  // --------------------------------------------------------------------------
  playNote(channelName: ChannelName, time: number, gain: number) {
    const channel = channels[channelName];
    if (!channel || gain <= 0) return;

    // Get a free player from the pool
    const pooledNode = this.getFreePlayerFromPool(channelName);
    if (!pooledNode) return;

    pooledNode.gain.gain.value = gain;

    // Share the buffer from the main channel player
    if (
      channel.player.buffer &&
      pooledNode.player.buffer !== channel.player.buffer
    ) {
      pooledNode.player.buffer = channel.player.buffer;
    }

    // If we don't have a buffer yet, we can't play
    if (!pooledNode.player.buffer) {
      console.warn(`No buffer available for ${channelName}`);
      this.releasePlayer(pooledNode, 0);
      return;
    }

    // Start the player
    try {
      pooledNode.player.start(time);

      // Calculate actual release time based on when the note should be played
      const releaseDelay =
        (typeof time === "number" ? time - Tone.now() : 0) +
        pooledNode.player.buffer.duration +
        0.1;

      // Release the player after it finishes playing
      this.releasePlayer(pooledNode, releaseDelay);
    } catch (error) {
      console.error(`Error playing note on ${channelName}:`, error);
      this.releasePlayer(pooledNode, 0);
    }
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

    try {
      // Load the new sample into the main channel player
      await channels[channelName]!.player.load(newSamplePath);
      console.log(`Sample loaded successfully for ${channelName}`);
    } catch (error) {
      console.error(`Error loading sample for ${channelName}:`, error);
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

    // Dispose all pooled players
    Object.keys(playerPools).forEach((channelName) => {
      playerPools[channelName].forEach((node) => {
        node.player.dispose();
        node.gain.dispose();
      });
      delete playerPools[channelName];
    });

    // Dispose channel nodes
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
