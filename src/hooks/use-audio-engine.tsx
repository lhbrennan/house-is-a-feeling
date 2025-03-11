import { useState, useEffect } from "react";
import * as Tone from "tone";
import audioEngine from "@/services/audio-engine";

/**
 * Hook that handles audio engine initialization
 */
export function useAudioEngine() {
  const [engineReady, setEngineReady] = useState(false);

  // Initialize audio engine on first user interaction
  useEffect(() => {
    const initAudioEngine = async () => {
      await audioEngine.init();
      setEngineReady(true);
      console.log("Audio engine initialized via first user interaction.");
    };

    const handleFirstInteraction = () => {
      initAudioEngine();
      window.removeEventListener("click", handleFirstInteraction);
      window.removeEventListener("touchstart", handleFirstInteraction);
    };

    window.addEventListener("click", handleFirstInteraction);
    window.addEventListener("touchstart", handleFirstInteraction);

    return () => {
      window.removeEventListener("click", handleFirstInteraction);
      window.removeEventListener("touchstart", handleFirstInteraction);
    };
  }, []);

  /**
   * Ensures the audio context is running by resuming it if suspended
   */
  const resumeAudioContext = async () => {
    if (Tone.getContext().state !== "running") {
      await Tone.getContext().resume();
      return true;
    }
    return false;
  };

  return {
    engineReady,
    resumeAudioContext,

    audioEngine,
    Tone,
  };
}
