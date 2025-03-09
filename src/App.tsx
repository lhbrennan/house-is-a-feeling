import React, { useRef, useState, useEffect } from "react";
import * as Tone from "tone";
import { Save, Folder, FilePlus2 } from "lucide-react";

import { ThemeProvider } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import { Grid } from "@/components/grid";
import { Ruler } from "@/components/ruler";
import { ChannelControls } from "@/components/channel-controls";
import { ChannelFxDialog } from "@/components/channel-fx-dialog";
import { SessionManagerDialog } from "@/components/session-manager-dialog";
import { SaveSessionDialog } from "@/components/save-session-dialog";
import {
  StoredSession,
  saveSession,
  saveAsNewSession,
} from "./services/session-storage";
import { ThemeToggle } from "@/components/theme-toggle";
import { ChannelFx } from "@/components/channel-fx";
import { GlobalFxDialog } from "@/components/global-fx-dialog";
import { SAMPLES, CHANNEL_NAMES, type ChannelName } from "./constants";
import type {
  PadVelocity,
  ChannelFxState,
  GlobalReverbSettings,
  BusCompressorSettings,
  PatternId,
} from "./types";
import { useGrid } from "@/hooks/use-grid";
import { TransportControls } from "./components/transport-controls";
import { useAudioEngine } from "@/hooks/use-audio-engine";
import { PatternChain } from "./components/pattern-chain";
import { PatternManager } from "./components/pattern-manager";

// ─────────────────────────────────────────────────────────────────
// Types & Constants
// ─────────────────────────────────────────────────────────────────
const NUM_CHANNELS = CHANNEL_NAMES.length;
const NUM_STEPS = 16;

export type ChannelControlsType = {
  mute: boolean;
  solo: boolean;
  volume: number; // normalized 0..1
  pan: number; // -1..1
};

const initialChannelControls: Record<ChannelName, ChannelControlsType> =
  Object.fromEntries(
    CHANNEL_NAMES.map((channel) => [
      channel,
      { mute: false, solo: false, volume: 1, pan: 0 },
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

  const [channelControls, setChannelControls] = useState(
    initialChannelControls,
  );
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

  // Session Storage States
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [currentSessionName, setCurrentSessionName] =
    useState<string>("Untitled Session");
  const [isSessionModified, setIsSessionModified] = useState(false);

  // Dialog states
  const [isLoadDialogOpen, setIsLoadDialogOpen] = useState(false);
  const [isSaveAsDialogOpen, setIsSaveAsDialogOpen] = useState(false);
  const [activeChannelFxDialog, setActiveChannelFxDialog] =
    useState<ChannelName | null>(null);
  const [isGlobalReverbDialogOpen, setIsGlobalReverbDialogOpen] =
    useState(false);

  const { patterns, patternsRef, setPatterns, toggleCell, shiftGrid } =
    useGrid(NUM_CHANNELS);

  // Playback references
  const loopRef = useRef<Tone.Loop | null>(null);
  const stepCounterRef = useRef(0);
  const isPlayingRef = useRef(false);

  // We store swing in a ref so the loop callback can see it
  const swingRef = useRef(swing);
  const currentPatternRef = useRef<PatternId>(currentPattern);
  const originalSessionRef = useRef<string | null>(null);

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
  // Track modifications to the patterns
  // ──────────────────────────────────────────────────────────────
  // Check for modifications by comparing current patterns to original
  useEffect(() => {
    if (!currentSessionId || !originalSessionRef.current) {
      return;
    }

    const currentPatternsState = JSON.stringify(patterns);
    const isModified = currentPatternsState !== originalSessionRef.current;
    setIsSessionModified(isModified);
  }, [patterns]);

  // We'll track which measure is playing for UI highlight
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

      const patternGrid = patternsRef.current[activePattern];
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
      applyAllChannelControls(channelControls);
      applyAllChannelFx(channelFx);
      applyGlobalReverbSettings(globalReverbSettings);
      applyBusCompressorSettings(busCompressorSettings);
    }
  }, [engineReady]);

  // ──────────────────────────────────────────────────────────────
  // Channel Controls
  // ──────────────────────────────────────────────────────────────
  function applyAllChannelControls(
    controls: Record<ChannelName, ChannelControlsType>,
  ) {
    if (!engineReady) return;
    const anySolo = Object.values(controls).some((ctrl) => ctrl.solo);

    Object.entries(controls).forEach(
      ([channel, { mute, solo, volume, pan }]) => {
        const effectiveMute = mute || (anySolo && !solo);
        const volumeDb = effectiveMute ? -Infinity : Tone.gainToDb(volume);
        audioEngine.setChannelVolume(channel as ChannelName, volumeDb);
        audioEngine.setChannelPan(channel as ChannelName, pan);
      },
    );
  }

  const onChangeChannel = (
    channel: ChannelName,
    partial: Partial<ChannelControlsType>,
  ) => {
    setChannelControls((prev) => {
      const next = { ...prev };
      next[channel] = { ...prev[channel], ...partial };
      applyAllChannelControls(next);
      return next;
    });
  };

  const handleChannelSampleChange = async (
    channel: ChannelName,
    sampleIdx: number,
  ) => {
    const safeIndex = sampleIdx % SAMPLES[channel].length;
    await audioEngine.setChannelSample(channel, safeIndex);
    setSelectedSampleIndexes((prev) => ({ ...prev, [channel]: safeIndex }));
  };

  // ──────────────────────────────────────────────────────────────
  // Channel FX
  // ──────────────────────────────────────────────────────────────
  function applyAllChannelFx(effects: Record<ChannelName, ChannelFxState>) {
    if (!engineReady) return;
    Object.entries(effects).forEach(([channel, fx]) => {
      audioEngine.setChannelDelayTime(channel as ChannelName, fx.delayTime);
      audioEngine.setChannelDelayWet(channel as ChannelName, fx.delayWet);
      audioEngine.setChannelDelayFeedback(
        channel as ChannelName,
        fx.delayFeedback,
      );
      audioEngine.setChannelReverbSend(channel as ChannelName, fx.reverbSend);
    });
  }

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
  // Pattern Storage Handlers
  // ──────────────────────────────────────────────────────────────
  const handleOpenLoadDialog = () => {
    setIsLoadDialogOpen(true);
  };

  const handleSessionLoad = (storedSession: StoredSession) => {
    // Load the pattern grid data
    setPatterns(storedSession.patterns);

    // Update the current pattern ID and name
    setCurrentSessionId(storedSession.id);
    setCurrentSessionName(storedSession.name);

    // Create a snapshot of just the patterns
    const patternsSnapshot = JSON.stringify(storedSession.patterns);

    // Store the snapshot
    originalSessionRef.current = patternsSnapshot;

    // Reset modification state
    setIsSessionModified(false);
  };

  const handleSaveSession = () => {
    if (!currentSessionId) {
      // No existing pattern, open Save As dialog
      setIsSaveAsDialogOpen(true);
      return;
    }

    const sessionToSave: StoredSession = {
      id: currentSessionId,
      name: currentSessionName,
      patterns: patterns,
      createdAt: "",
      updatedAt: "",
    };

    saveSession(sessionToSave);
    setIsSessionModified(false);
  };

  const handleSessionRename = (session: StoredSession, newName: string) => {
    // If renaming the current session, update the name in state
    if (session.id === currentSessionId) {
      setCurrentSessionName(newName);
    }

    // Update the pattern in storage
    const updatedSession = {
      ...session,
      name: newName,
    };

    saveSession(updatedSession);
  };

  const handleSaveAsSession = (name: string) => {
    const sessionToSave = {
      name: name,
      patterns: patterns,
    };

    const savedSession = saveAsNewSession(sessionToSave);

    // Update the current pattern ID and name
    setCurrentSessionId(savedSession.id);
    setCurrentSessionName(savedSession.name);

    // Reset modification state since we just saved
    setIsSessionModified(false);
  };

  // ──────────────────────────────────────────────────────────────
  // Render
  // ──────────────────────────────────────────────────────────────
  return (
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
      <div className="relative h-screen">
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>

        <div className="flex h-full justify-center">
          <div className="space-y-6 p-4">
            <div className="flex items-center justify-between">
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
            <div className="flex flex-wrap items-center space-x-4 pb-4">
              <TransportControls
                bpm={bpm}
                swing={swing}
                isPlaying={isPlaying}
                onBpmChange={handleBpmChange}
                onSwingChange={setSwing}
                onTogglePlay={handleTogglePlay}
              />

              {/* Pattern Storage Controls */}
              <div className="ml-auto flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleOpenLoadDialog}
                  className="flex items-center"
                >
                  <Folder className="mr-2 h-4 w-4" />
                  My Patterns
                </Button>

                <Button
                  variant="outline"
                  onClick={handleSaveSession}
                  disabled={!isSessionModified && currentSessionId !== null}
                  className="flex items-center"
                >
                  <Save className="mr-2 h-4 w-4" />
                  Save
                </Button>

                <Button
                  variant="outline"
                  onClick={() => setIsSaveAsDialogOpen(true)}
                  className="flex items-center"
                >
                  <FilePlus2 className="mr-2 h-4 w-4" />
                  Save As
                </Button>
              </div>
            </div>

            {/* Main Section: ChannelControls, Grid, & ChannelFx */}
            <div className="flex">
              <ChannelControls
                channelNames={CHANNEL_NAMES}
                channelControls={channelControls}
                onChangeChannel={onChangeChannel}
                selectedSampleIndexes={selectedSampleIndexes}
                onChangeChannelSample={handleChannelSampleChange}
                playNoteImmediately={(channel: ChannelName) =>
                  audioEngine.playNote(channel, Tone.now(), 1)
                }
              />

              <div className="relative">
                <Ruler
                  currentStep={currentStep}
                  numSteps={NUM_STEPS}
                  chainEnabled={chainEnabled}
                  chainMeasure={chainMeasure}
                />

                <Grid
                  grid={patterns[getDisplayedPattern()]}
                  toggleCell={(row, col, newVal) =>
                    toggleCell(getDisplayedPattern(), row, col, newVal)
                  }
                  currentStep={currentStep}
                />
              </div>

              <ChannelFx
                channelFx={channelFx}
                handleChannelFxChange={handleChannelFxChange}
                setActiveChannelFxDialog={setActiveChannelFxDialog}
              />
            </div>

            {/* Bottom Section: Pattern controls */}
            <div className="flex items-center justify-center gap-4">
              <div className="flex items-center justify-center gap-3">
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

              <Button
                onClick={() => setIsGlobalReverbDialogOpen(true)}
                className="ml-auto"
              >
                Global Effects
              </Button>
            </div>

            <PatternChain
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

          <ChannelFxDialog
            channel={activeChannelFxDialog}
            channelFx={
              activeChannelFxDialog && channelFx[activeChannelFxDialog]
            }
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
            onSessionSelect={handleSessionLoad}
            onSessionRename={handleSessionRename}
          />

          <SaveSessionDialog
            isOpen={isSaveAsDialogOpen}
            onClose={() => setIsSaveAsDialogOpen(false)}
            onSave={handleSaveAsSession}
            initialName={
              isSessionModified
                ? currentSessionName
                : `${currentSessionName} (Copy)`
            }
          />
        </div>
      </div>
    </ThemeProvider>
  );
}

export default App;
