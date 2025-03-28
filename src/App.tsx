import React, { useRef, useState, useEffect } from "react";
import * as Tone from "tone";
import { Save, Folder, FilePlus2, Headphones } from "lucide-react";

import { ThemeProvider } from "@/components/theme-provider";
import { Particles } from "@/components/magicui/particles";
import { Button } from "@/components/ui/button";
import { Grid } from "@/components/grid";
import { Ruler } from "@/components/ruler";
import { ChannelControls } from "@/components/channel-controls";
import { ChannelFxDialog } from "@/components/channel-fx-dialog";
import { SessionManagerDialog } from "@/components/session-manager-dialog";
import { SaveSessionDialog } from "@/components/save-session-dialog";
import { ThemeToggle } from "@/components/theme-toggle";
import { ChannelFx } from "@/components/channel-fx";
import { GlobalFxDialog } from "@/components/global-fx-dialog";
import { SAMPLES, CHANNEL_NAMES, type ChannelName } from "@/constants";
import type {
  PadVelocity,
  ChannelFxState,
  GlobalReverbSettings,
  BusCompressorSettings,
  PatternId,
  ChannelControlsType,
} from "@/types";
import { useGrid } from "@/hooks/use-grid";
import { useSessionStorage } from "@/hooks/use-session-storage";
import { useAudioEngine } from "@/hooks/use-audio-engine";
import { useChannelControls } from "@/hooks/use-channel-controls";
import { TransportControls } from "@/components/transport-controls";
import { PatternChain } from "@/components/pattern-chain";
import { PatternManager } from "@/components/pattern-manager";
import { MidiExportButton } from "@/components/midi-export-button";
import { HelpGuide } from "@/components/help-guide";

// ─────────────────────────────────────────────────────────────────
// Types & Constants
// ─────────────────────────────────────────────────────────────────
const NUM_CHANNELS = CHANNEL_NAMES.length;
const NUM_STEPS = 16;

const initialChannelControls: Record<ChannelName, ChannelControlsType> =
  Object.fromEntries(
    CHANNEL_NAMES.map((channel) => [
      channel,
      { mute: false, solo: false, volume: 0.8, pan: 0 },
    ]),
  ) as Record<ChannelName, ChannelControlsType>;

const initialChannelFx: Record<ChannelName, ChannelFxState> =
  Object.fromEntries(
    CHANNEL_NAMES.map((channel) => [
      channel,
      {
        delayTime: "8n.",
        delayWet: 0.0,
        delayFeedback: 0.25,
        reverbSend: channel === "Kick1" || channel === "Kick2" ? 0 : 0.15,
        highPassFreq: 20,
        lowPassFreq: 20000,
      },
    ]),
  ) as Record<ChannelName, ChannelFxState>;

const initialGlobalReverbSettings: GlobalReverbSettings = {
  decay: 2.1,
  preDelay: 0.05,
  wet: 1,
};

const initialBusCompressorSettings: BusCompressorSettings = {
  enabled: false,
  threshold: -24,
  ratio: 4,
  attack: 0.005,
  release: 0.1,
  knee: 10,
  makeUpGain: 0,
  mix: 0,
};

const initialSelectedSampleIndexes: Record<ChannelName, number> =
  Object.fromEntries(CHANNEL_NAMES.map((channel) => [channel, 0])) as Record<
    ChannelName,
    number
  >;

/** Utility to convert pad velocity (1..3) to gain (0..1). */
function getNormalizedVelocity(velocity: PadVelocity) {
  switch (velocity) {
    case 3:
      return 1.0;
    case 2:
      return 0.6;
    case 1:
      return 0.2;
    default:
      return 0;
  }
}

function App() {
  // ──────────────────────────────────────────────────────────────
  // State
  // ──────────────────────────────────────────────────────────────

  const { engineReady, resumeAudioContext, audioEngine } = useAudioEngine();

  const [bpm, setBpm] = useState(120);
  const [currentStep, setCurrentStep] = useState<number | null>(null);
  const [swing, setSwing] = useState(0);

  const [currentPattern, setCurrentPattern] = useState<PatternId>("A");
  const [channelFx, setChannelFx] = useState(initialChannelFx);
  const [globalReverbSettings, setGlobalReverbSettings] = useState(
    initialGlobalReverbSettings,
  );
  const [busCompressorSettings, setBusCompressorSettings] = useState(
    initialBusCompressorSettings,
  );
  const [selectedSampleIndexes, setSelectedSampleIndexes] = useState(
    initialSelectedSampleIndexes,
  );

  const [notePreviewEnabled, setNotePreviewEnabled] = useState(true);

  // Dialog states
  const [isLoadDialogOpen, setIsLoadDialogOpen] = useState(false);
  const [isSaveAsDialogOpen, setIsSaveAsDialogOpen] = useState(false);
  const [activeChannelFxDialog, setActiveChannelFxDialog] =
    useState<ChannelName | null>(null);
  const [isGlobalReverbDialogOpen, setIsGlobalReverbDialogOpen] =
    useState(false);

  const { patterns, getLatestPatterns, setPatterns, toggleCell, shiftGrid } =
    useGrid(NUM_CHANNELS);

  // Playback references
  const loopRef = useRef<Tone.Loop | null>(null);
  const stepCounterRef = useRef(0);
  const isPlayingRef = useRef(false);

  // We store swing in a ref so the loop callback can see it
  const swingRef = useRef(swing);
  const currentPatternRef = useRef<PatternId>(currentPattern);

  useEffect(() => {
    swingRef.current = swing;
  }, [swing]);

  useEffect(() => {
    currentPatternRef.current = currentPattern;
  }, [currentPattern]);

  const [isPlaying, setIsPlaying] = useState(false);

  // ──────────────────────────────────────────────────────────────
  // Pattern Chain States
  // ──────────────────────────────────────────────────────────────
  // We keep the official "UI state" in normal React state,
  // but we also store them in refs so the Tone.Loop callback sees updates.
  const [chainEnabled, setChainEnabled] = useState(false);
  const chainEnabledRef = useRef(chainEnabled);
  useEffect(() => {
    chainEnabledRef.current = chainEnabled;
  }, [chainEnabled]);

  const [chainLength, setChainLength] = useState(4);
  const chainLengthRef = useRef(chainLength);
  useEffect(() => {
    chainLengthRef.current = chainLength;
  }, [chainLength]);

  const [patternChain, setPatternChain] = useState<Array<PatternId>>([
    "A",
    "A",
    "B",
    "B",
    "A",
    "A",
    "A",
    "A",
  ]);
  const patternChainRef = useRef(patternChain);
  useEffect(() => {
    patternChainRef.current = patternChain;
  }, [patternChain]);

  // ──────────────────────────────────────────────────────────────
  // Track which measure is playing for UI highlighting
  // ──────────────────────────────────────────────────────────────
  const measureCounterRef = useRef(0);
  const [chainMeasure, setChainMeasure] = useState(0);

  const getDisplayedPattern = (): PatternId => {
    if (chainEnabled && isPlaying) {
      return patternChain[chainMeasure];
    }
    return currentPattern;
  };

  // ──────────────────────────────────────────────────────────────
  // Create the main loop once
  // ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (loopRef.current) {
      loopRef.current.dispose();
    }

    loopRef.current = new Tone.Loop((time) => {
      const step = stepCounterRef.current;
      let scheduledTime = time;

      // Apply swing on odd steps
      if (step % 2 === 1) {
        const swingDelay = swingRef.current * Tone.Time("16n").toSeconds();
        scheduledTime = time + swingDelay;
      }

      // Check if chain is enabled
      let activePattern: PatternId;
      if (chainEnabledRef.current) {
        // If chain is on, pick from patternChainRef
        const measureIndex = measureCounterRef.current;
        activePattern = patternChainRef.current[measureIndex];
      } else {
        // Otherwise use the single selected pattern
        activePattern = currentPatternRef.current;
      }

      const patternGrid = getLatestPatterns()[activePattern];
      patternGrid.forEach((row, channelIndex) => {
        const padVelocity = row[step];
        if (padVelocity > 0) {
          const gain = getNormalizedVelocity(padVelocity);
          audioEngine.playNote(
            CHANNEL_NAMES[channelIndex],
            scheduledTime,
            gain,
          );
        }
      });

      Tone.getDraw().schedule(() => {
        if (isPlayingRef.current) {
          setCurrentStep(step);
          setChainMeasure(measureCounterRef.current);
        }
      }, scheduledTime);

      stepCounterRef.current = (step + 1) % NUM_STEPS;

      if (step === NUM_STEPS - 1) {
        // End of measure, move to next chain measure if chain is on
        if (chainEnabledRef.current) {
          measureCounterRef.current =
            (measureCounterRef.current + 1) % chainLengthRef.current;
        } else {
          measureCounterRef.current = 0;
        }
      }
    }, "16n");

    loopRef.current.start(0);
  }, []); // no deps, we only create this loop once

  // ──────────────────────────────────────────────────────────────
  // Transport
  // ──────────────────────────────────────────────────────────────
  const handleBpmChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newBpm = parseInt(e.target.value, 10);
    setBpm(newBpm);
    audioEngine.setBPM(newBpm);
  };

  const handleStart = async () => {
    await resumeAudioContext();
    isPlayingRef.current = true;
    setIsPlaying(true);
    audioEngine.startTransport();
  };

  const handleStop = () => {
    if (!isPlayingRef.current) return;

    // When stopping with chain enabled, set the current pattern to match
    // the pattern that was playing when stopped
    if (chainEnabledRef.current) {
      // Get the current pattern from the chain
      const currentMeasure = measureCounterRef.current;
      const patternAtStop = patternChainRef.current[currentMeasure];
      console.log(
        "Stopping on measure",
        currentMeasure,
        "with pattern",
        patternAtStop,
      );
      setCurrentPattern(patternAtStop);
    }

    // Now stop the transport and reset playback state
    audioEngine.stopTransport();
    isPlayingRef.current = false;
    setIsPlaying(false);
    setCurrentStep(null);
    stepCounterRef.current = 0;
    measureCounterRef.current = 0;
    setChainMeasure(0);
  };

  const handleTogglePlay = async () => {
    if (!isPlaying) {
      await handleStart();
    } else {
      handleStop();
    }
  };

  // Spacebar toggles play/stop
  useEffect(() => {
    const handleSpaceKey = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      if (e.code === "Space") {
        e.preventDefault();
        if (Tone.getTransport().state === "started") {
          handleStop();
        } else {
          handleStart();
        }
      }
    };
    window.addEventListener("keydown", handleSpaceKey);
    return () => window.removeEventListener("keydown", handleSpaceKey);
  }, []);

  // ──────────────────────────────────────────────────────────────
  // One-time parameter sync after audio engine is ready
  // ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (engineReady) {
      applyAllChannelFx(channelFx);
      applyGlobalReverbSettings(globalReverbSettings);
      applyBusCompressorSettings(busCompressorSettings);
    }
  }, [engineReady]);

  // ──────────────────────────────────────────────────────────────
  // Channel Controls
  // ──────────────────────────────────────────────────────────────
  const { channelControls, setChannelControls, onChangeChannel } =
    useChannelControls(initialChannelControls, audioEngine, engineReady);

  const handleSampleChange = async (
    channel: ChannelName,
    sampleIdx: number,
  ) => {
    const safeIndex = sampleIdx % SAMPLES[channel].length;
    await audioEngine.setChannelSample(channel, safeIndex);
    setSelectedSampleIndexes((prev) => ({ ...prev, [channel]: safeIndex }));
  };

  const playNoteImmediately = (channel: ChannelName) => {
    audioEngine.playNote(channel, Tone.now(), 1);
  };

  // ──────────────────────────────────────────────────────────────
  // Channel FX
  // ──────────────────────────────────────────────────────────────
  const applyAllChannelFx = (effects: Record<ChannelName, ChannelFxState>) => {
    if (!engineReady) return;
    Object.entries(effects).forEach(([channelStr, fx]) => {
      const channel = channelStr as ChannelName;
      audioEngine.setChannelDelayTime(channel, fx.delayTime);
      audioEngine.setChannelDelayWet(channel, fx.delayWet);
      audioEngine.setChannelDelayFeedback(channel, fx.delayFeedback);
      audioEngine.setChannelReverbSend(channel, fx.reverbSend);
      audioEngine.setChannelHighPassFreq(channel, fx.highPassFreq);
      audioEngine.setChannelLowPassFreq(channel, fx.lowPassFreq);
    });
  };

  const handleChannelFxChange = (
    channel: ChannelName,
    field: keyof ChannelFxState,
    value: number | string,
  ) => {
    setChannelFx((prev) => {
      const updated = { ...prev };
      updated[channel] = { ...updated[channel], [field]: value };

      if (engineReady) {
        audioEngine.setChannelDelayTime(channel, updated[channel].delayTime);
        audioEngine.setChannelDelayWet(channel, updated[channel].delayWet);
        audioEngine.setChannelDelayFeedback(
          channel,
          updated[channel].delayFeedback,
        );
        audioEngine.setChannelReverbSend(channel, updated[channel].reverbSend);
        audioEngine.setChannelHighPassFreq(
          channel,
          updated[channel].highPassFreq,
        );
        audioEngine.setChannelLowPassFreq(
          channel,
          updated[channel].lowPassFreq,
        );
      }
      return updated;
    });
  };

  // ──────────────────────────────────────────────────────────────
  // Global Reverb
  // ──────────────────────────────────────────────────────────────
  const applyGlobalReverbSettings = (settings: GlobalReverbSettings) => {
    if (!engineReady) return;
    audioEngine.setGlobalReverbDecay(settings.decay);
    audioEngine.setGlobalReverbPreDelay(settings.preDelay);
    audioEngine.setGlobalReverbWet(settings.wet);
  };

  const handleGlobalReverbChange = (
    field: keyof GlobalReverbSettings,
    value: number,
  ) => {
    setGlobalReverbSettings((prev) => {
      const next = { ...prev, [field]: value };
      if (engineReady) {
        audioEngine.setGlobalReverbDecay(next.decay);
        audioEngine.setGlobalReverbPreDelay(next.preDelay);
        audioEngine.setGlobalReverbWet(next.wet);
      }
      return next;
    });
  };

  // ──────────────────────────────────────────────────────────────
  // Bus Compressor
  // ──────────────────────────────────────────────────────────────
  const applyBusCompressorSettings = (settings: BusCompressorSettings) => {
    if (!engineReady) return;
    audioEngine.setBusCompressorEnabled(settings.enabled);
    audioEngine.setBusCompressorThreshold(settings.threshold);
    audioEngine.setBusCompressorRatio(settings.ratio);
    audioEngine.setBusCompressorAttack(settings.attack);
    audioEngine.setBusCompressorRelease(settings.release);
    audioEngine.setBusCompressorKnee(settings.knee);
    audioEngine.setBusCompressorMakeUpGain(settings.makeUpGain);
    audioEngine.setBusCompressorMix(settings.mix);
  };

  const handleBusCompressorChange = (
    field: keyof BusCompressorSettings,
    value: number | boolean,
  ) => {
    setBusCompressorSettings((prev) => {
      const next = { ...prev, [field]: value };

      if (engineReady) {
        switch (field) {
          case "enabled":
            audioEngine.setBusCompressorEnabled(value as boolean);
            break;
          case "threshold":
            audioEngine.setBusCompressorThreshold(value as number);
            break;
          case "ratio":
            audioEngine.setBusCompressorRatio(value as number);
            break;
          case "attack":
            audioEngine.setBusCompressorAttack(value as number);
            break;
          case "release":
            audioEngine.setBusCompressorRelease(value as number);
            break;
          case "knee":
            audioEngine.setBusCompressorKnee(value as number);
            break;
          case "makeUpGain":
            audioEngine.setBusCompressorMakeUpGain(value as number);
            break;
          case "mix":
            audioEngine.setBusCompressorMix(value as number);
            break;
        }
      }

      return next;
    });
  };

  // ──────────────────────────────────────────────────────────────
  // Session Storage
  // ──────────────────────────────────────────────────────────────
  const {
    currentSessionId,
    currentSessionName,
    isSessionModified,
    loadSession,
    saveSession,
    saveAsSession,
    renameSession,
  } = useSessionStorage({
    patterns,
    bpm,
    swing,
    channelControls,
    channelFx,
    globalReverbSettings,
    busCompressorSettings,
    chainEnabled,
    chainLength,
    patternChain,
    selectedSampleIndexes,
    setPatterns,
    setBpm,
    setSwing,
    setChannelControls,
    setChannelFx,
    setGlobalReverbSettings,
    setBusCompressorSettings,
    setChainEnabled,
    setChainLength,
    setPatternChain,
    setSelectedSampleIndexes,
    applyAllChannelFx,
    applyGlobalReverbSettings,
    applyBusCompressorSettings,
    audioEngine,
  });

  // Function to handle Save button click
  const handleSaveButtonClick = () => {
    // If this is a new session (no ID), show the Save As dialog
    if (currentSessionId === null) {
      setIsSaveAsDialogOpen(true);
    } else {
      // Otherwise, perform a regular save
      saveSession();
    }
  };

  // ──────────────────────────────────────────────────────────────
  // Render
  // ──────────────────────────────────────────────────────────────
  return (
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
      {/* Particles in the background, using position absolute to keep them outside the main content */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <Particles
          className="absolute inset-0"
          quantity={300}
          staticity={20}
          ease={20}
          color="hsl(var(--primary))"
        />
      </div>

      <div className="min-h-screen w-full">
        <div className="absolute top-4 right-4 z-10 flex items-center">
          <HelpGuide />
          <ThemeToggle />
        </div>

        <div className="flex justify-center p-4">
          <div className="bg-background/95 inline-block rounded-lg p-6 shadow-lg backdrop-blur-sm">
            <div className="mb-8 flex items-center justify-between">
              <h1 className="text-foreground text-center font-[Chicle] text-4xl font-bold drop-shadow-lg">
                House is a Feeling
              </h1>

              {/* Pattern name display with modification indicator */}
              <div className="flex items-center">
                <h2 className="text-xl font-medium">
                  {currentSessionName}
                  {isSessionModified && (
                    <span className="ml-1 text-orange-500">*</span>
                  )}
                </h2>
              </div>
            </div>

            {/* Top Section: Transport and BPM */}
            <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <TransportControls
                  bpm={bpm}
                  swing={swing}
                  isPlaying={isPlaying}
                  onBpmChange={handleBpmChange}
                  onSwingChange={setSwing}
                  onTogglePlay={handleTogglePlay}
                />
              </div>

              {/* Pattern Storage Controls */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setNotePreviewEnabled((prev) => !prev);
                  }}
                  className={`flex items-center ${notePreviewEnabled ? "bg-accent text-accent-foreground" : ""}`}
                  title={
                    notePreviewEnabled
                      ? "Disable note preview"
                      : "Enable note preview"
                  }
                >
                  <Headphones className="mr-2 h-4 w-4" />
                  {notePreviewEnabled ? "Preview On" : "Preview Off"}
                </Button>

                <Button
                  variant="outline"
                  onClick={() => setIsLoadDialogOpen(true)}
                  className="flex items-center"
                >
                  <Folder className="mr-2 h-4 w-4" />
                  My Patterns
                </Button>

                <Button
                  variant="outline"
                  onClick={handleSaveButtonClick}
                  className="flex items-center"
                >
                  <Save className="mr-2 h-4 w-4" />
                  Save
                </Button>

                {/* Only show Save As when we already have a session ID */}
                {currentSessionId !== null && (
                  <Button
                    variant="outline"
                    onClick={() => setIsSaveAsDialogOpen(true)}
                    className="flex items-center"
                  >
                    <FilePlus2 className="mr-2 h-4 w-4" />
                    Save As
                  </Button>
                )}

                <MidiExportButton
                  pattern={patterns[getDisplayedPattern()]}
                  patternName={`${currentSessionName || "Pattern"}-${getDisplayedPattern()}`}
                  bpm={bpm}
                />
              </div>
            </div>

            {/* Main Section: ChannelControls, Grid, & ChannelFx */}
            <div className="flex overflow-x-auto pt-8 pb-4">
              <div className="relative mr-4 flex-shrink-0 space-x-4">
                <div className="absolute top-[-35px] left-0 flex h-6 w-full items-start justify-start gap-3">
                  <div className="w-18 text-center text-xs">Mute / Solo</div>
                  <div className="w-10 text-center text-xs">Pan</div>
                  <div className="w-10 text-center text-xs">Volume</div>
                  <div className="grow text-center text-xs">
                    Sample Selection
                  </div>
                </div>

                <ChannelControls
                  channelNames={CHANNEL_NAMES}
                  channelControls={channelControls}
                  onChangeChannel={onChangeChannel}
                  selectedSampleIndexes={selectedSampleIndexes}
                  onChangeSample={async (channel, sampleIdx) => {
                    await handleSampleChange(channel, sampleIdx);
                    playNoteImmediately(channel);
                  }}
                  playNoteImmediately={playNoteImmediately}
                />
              </div>

              <div className="relative flex-shrink-0">
                <Ruler
                  currentStep={currentStep}
                  numSteps={NUM_STEPS}
                  chainEnabled={chainEnabled}
                  chainMeasure={chainMeasure}
                />

                <Grid
                  grid={patterns[getDisplayedPattern()]}
                  toggleCell={(row, col, newVal) => {
                    // Update pattern state
                    toggleCell(getDisplayedPattern(), row, col, newVal);

                    // Play preview sound if enabled and a note is added
                    if (notePreviewEnabled && newVal > 0) {
                      audioEngine.playNote(
                        CHANNEL_NAMES[row],
                        Tone.now(),
                        getNormalizedVelocity(newVal),
                      );
                    }
                  }}
                  currentStep={currentStep}
                />
              </div>

              <div className="relative ml-4 flex-shrink-0 space-x-4">
                <div className="absolute top-[-35px] left-0 flex h-6 w-full items-start justify-start gap-3">
                  <div className="w-10 text-center text-xs">HP</div>
                  <div className="w-10 text-center text-xs">LP</div>
                  <div className="w-10 text-center text-xs">Delay</div>
                  <div className="w-9"></div>
                  <div className="w-10 text-center text-xs">Reverb</div>
                </div>

                <ChannelFx
                  channelFx={channelFx}
                  handleChannelFxChange={handleChannelFxChange}
                  setActiveChannelFxDialog={setActiveChannelFxDialog}
                />
              </div>
            </div>

            {/* Bottom Section: Pattern controls */}
            <div className="mt-8 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  onClick={() => shiftGrid(getDisplayedPattern(), "left")}
                >
                  Shift Left
                </Button>
                <Button
                  variant="outline"
                  onClick={() => shiftGrid(getDisplayedPattern(), "right")}
                >
                  Shift Right
                </Button>
              </div>

              <PatternManager
                currentPattern={currentPattern}
                setCurrentPattern={setCurrentPattern}
                isPlaying={isPlaying}
                chainEnabled={chainEnabled}
                patternChain={patternChain}
                chainMeasure={chainMeasure}
                patterns={patterns}
                setPatterns={setPatterns}
              />

              <Button onClick={() => setIsGlobalReverbDialogOpen(true)}>
                Global Effects
              </Button>
            </div>

            <PatternChain
              className="mt-8"
              chainEnabled={chainEnabled}
              setChainEnabled={setChainEnabled}
              chainLength={chainLength}
              setChainLength={setChainLength}
              patternChain={patternChain}
              setPatternChain={setPatternChain}
              isPlaying={isPlaying}
              chainMeasure={chainMeasure}
              measureCounterRef={measureCounterRef}
              setChainMeasure={setChainMeasure}
            />
          </div>
        </div>
      </div>

      <ChannelFxDialog
        channel={activeChannelFxDialog}
        channelFx={activeChannelFxDialog && channelFx[activeChannelFxDialog]}
        handleChannelFxChange={handleChannelFxChange}
        onClose={() => setActiveChannelFxDialog(null)}
      />

      <GlobalFxDialog
        isOpen={isGlobalReverbDialogOpen}
        globalReverbSettings={globalReverbSettings}
        busCompressorSettings={busCompressorSettings}
        handleGlobalReverbChange={handleGlobalReverbChange}
        handleBusCompressorChange={handleBusCompressorChange}
        setOpen={setIsGlobalReverbDialogOpen}
      />

      <SessionManagerDialog
        isOpen={isLoadDialogOpen}
        onClose={() => setIsLoadDialogOpen(false)}
        onSessionSelect={loadSession}
        onSessionRename={renameSession}
      />

      <SaveSessionDialog
        isOpen={isSaveAsDialogOpen}
        onClose={() => setIsSaveAsDialogOpen(false)}
        onSave={saveAsSession}
        initialName={
          isSessionModified
            ? currentSessionName
            : currentSessionName
              ? `${currentSessionName} (Copy)`
              : "New Session"
        }
      />
    </ThemeProvider>
  );
}

export default App;
