import { useState, useEffect } from "react";
import {
  StoredSession,
  saveSession as saveSessionToStorage,
  saveAsNewSession as saveAsNewSessionToStorage,
  getSessionById,
} from "@/services/session-storage";
import {
  type PatternId,
  type GridState,
  type ChannelFxState,
  type GlobalReverbSettings,
  type BusCompressorSettings,
  type ChannelControlsType,
} from "@/types";
import type { ChannelName } from "@/constants";

type UseSessionStorageProps = {
  patterns: Record<PatternId, GridState>;
  bpm: number;
  swing: number;
  channelControls: Record<ChannelName, ChannelControlsType>;
  channelFx: Record<ChannelName, ChannelFxState>;
  globalReverbSettings: GlobalReverbSettings;
  busCompressorSettings: BusCompressorSettings;
  chainEnabled: boolean;
  chainLength: number;
  patternChain: Array<PatternId>;
  selectedSampleIndexes: Record<ChannelName, number>;
  setPatterns: (patterns: Record<PatternId, GridState>) => void;
  setBpm: (bpm: number) => void;
  setSwing: (swing: number) => void;
  setChannelControls: (
    controls: Record<ChannelName, ChannelControlsType>,
  ) => void;
  setChannelFx: (fx: Record<ChannelName, ChannelFxState>) => void;
  setGlobalReverbSettings: (settings: GlobalReverbSettings) => void;
  setBusCompressorSettings: (settings: BusCompressorSettings) => void;
  setChainEnabled: (enabled: boolean) => void;
  setChainLength: (length: number) => void;
  setPatternChain: (chain: Array<PatternId>) => void;
  setSelectedSampleIndexes: (indexes: Record<ChannelName, number>) => void;
  applyAllChannelControls: (
    controls: Record<ChannelName, ChannelControlsType>,
  ) => void;
  applyAllChannelFx: (fx: Record<ChannelName, ChannelFxState>) => void;
  applyGlobalReverbSettings: (settings: GlobalReverbSettings) => void;
  applyBusCompressorSettings: (settings: BusCompressorSettings) => void;
  audioEngine: {
    setBPM: (bpm: number) => void;
  };
};

export function useSessionStorage({
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
  applyAllChannelControls,
  applyAllChannelFx,
  applyGlobalReverbSettings,
  applyBusCompressorSettings,
  audioEngine,
}: UseSessionStorageProps) {
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [currentSessionName, setCurrentSessionName] = useState<string>("");
  const [isSessionModified, setIsSessionModified] = useState(false);

  // ──────────────────────────────────────────────────────────────
  // Track modifications to all session-related state
  // ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!currentSessionId) {
      return;
    }

    // Get the current session from storage to compare with current state
    const storedSession = getSessionById(currentSessionId);
    if (!storedSession) return;

    const isModified =
      JSON.stringify(patterns) !== JSON.stringify(storedSession.patterns) ||
      bpm !== storedSession.bpm ||
      swing !== storedSession.swing ||
      JSON.stringify(channelControls) !==
        JSON.stringify(storedSession.channelControls) ||
      JSON.stringify(channelFx) !== JSON.stringify(storedSession.channelFx) ||
      JSON.stringify(globalReverbSettings) !==
        JSON.stringify(storedSession.globalReverbSettings) ||
      JSON.stringify(busCompressorSettings) !==
        JSON.stringify(storedSession.busCompressorSettings) ||
      chainEnabled !== storedSession.chainEnabled ||
      chainLength !== storedSession.chainLength ||
      JSON.stringify(patternChain) !==
        JSON.stringify(storedSession.patternChain) ||
      JSON.stringify(selectedSampleIndexes) !==
        JSON.stringify(storedSession.selectedSampleIndexes);

    setIsSessionModified(isModified);
  }, [
    currentSessionId,
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
  ]);

  const handleSessionLoad = (storedSession: StoredSession) => {
    // Load the pattern grid data
    setPatterns(storedSession.patterns);

    // Update the current pattern ID and name
    setCurrentSessionId(storedSession.id);
    setCurrentSessionName(storedSession.name);

    // Load additional settings if they exist
    if (storedSession.bpm) {
      setBpm(storedSession.bpm);
      audioEngine.setBPM(storedSession.bpm);
    }

    if (storedSession.swing !== undefined) {
      setSwing(storedSession.swing);
    }

    // Load channel controls
    if (
      storedSession.channelControls &&
      Object.keys(storedSession.channelControls).length > 0
    ) {
      setChannelControls(storedSession.channelControls);
      applyAllChannelControls(storedSession.channelControls);
    }

    // Load channel FX
    if (
      storedSession.channelFx &&
      Object.keys(storedSession.channelFx).length > 0
    ) {
      setChannelFx(storedSession.channelFx);
      applyAllChannelFx(storedSession.channelFx);
    }

    // Load global reverb settings
    if (storedSession.globalReverbSettings) {
      setGlobalReverbSettings(storedSession.globalReverbSettings);
      applyGlobalReverbSettings(storedSession.globalReverbSettings);
    }

    // Load bus compressor settings
    if (storedSession.busCompressorSettings) {
      setBusCompressorSettings(storedSession.busCompressorSettings);
      applyBusCompressorSettings(storedSession.busCompressorSettings);
    }

    // Load pattern chain settings
    if (storedSession.chainEnabled !== undefined) {
      setChainEnabled(storedSession.chainEnabled);
    }

    if (storedSession.chainLength) {
      setChainLength(storedSession.chainLength);
    }

    if (storedSession.patternChain && storedSession.patternChain.length > 0) {
      setPatternChain(storedSession.patternChain);
    }

    // Load sample selections
    if (
      storedSession.selectedSampleIndexes &&
      Object.keys(storedSession.selectedSampleIndexes).length > 0
    ) {
      // Update state
      setSelectedSampleIndexes(storedSession.selectedSampleIndexes);
    }

    // Reset modification state
    setIsSessionModified(false);
  };

  const handleSaveSession = () => {
    if (!currentSessionId) {
      return null;
    }

    const sessionToSave: StoredSession = {
      id: currentSessionId,
      name: currentSessionName,
      patterns: patterns,
      bpm: bpm,
      swing: swing,
      channelControls: channelControls,
      channelFx: channelFx,
      globalReverbSettings: globalReverbSettings,
      busCompressorSettings: busCompressorSettings,
      chainEnabled: chainEnabled,
      chainLength: chainLength,
      patternChain: patternChain,
      selectedSampleIndexes: selectedSampleIndexes,
      createdAt: "",
      updatedAt: "",
    };

    const savedSession = saveSessionToStorage(sessionToSave);
    setIsSessionModified(false);
    return savedSession;
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

    return saveSessionToStorage(updatedSession);
  };

  const handleSaveAsSession = (name: string) => {
    const sessionToSave: Omit<StoredSession, "id" | "createdAt" | "updatedAt"> =
      {
        name: name,
        patterns: patterns,
        bpm: bpm,
        swing: swing,
        channelControls: channelControls,
        channelFx: channelFx,
        globalReverbSettings: globalReverbSettings,
        busCompressorSettings: busCompressorSettings,
        chainEnabled: chainEnabled,
        chainLength: chainLength,
        patternChain: patternChain,
        selectedSampleIndexes: selectedSampleIndexes,
      };

    const savedSession = saveAsNewSessionToStorage(sessionToSave);

    // Update the current pattern ID and name
    setCurrentSessionId(savedSession.id);
    setCurrentSessionName(savedSession.name);

    // Reset modification state since we just saved
    setIsSessionModified(false);

    return savedSession;
  };

  return {
    currentSessionId,
    currentSessionName,
    isSessionModified,
    loadSession: handleSessionLoad,
    saveSession: handleSaveSession,
    saveAsSession: handleSaveAsSession,
    renameSession: handleSessionRename,
  } as const;
}
