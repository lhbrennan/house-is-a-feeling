import React, { useState } from "react";
import { Copy, ClipboardCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import type { GridState, PatternId } from "@/types";

type PatternManagerProps = {
  currentPattern: PatternId;
  setCurrentPattern: (pattern: PatternId) => void;
  isPlaying: boolean;
  chainEnabled: boolean;
  patternChain: Array<PatternId>;
  chainMeasure: number;
  patterns: Record<PatternId, GridState>;
  setPatterns: React.Dispatch<
    React.SetStateAction<Record<PatternId, GridState>>
  >;
};

export function PatternManager({
  currentPattern,
  setCurrentPattern,
  isPlaying,
  chainEnabled,
  patternChain,
  chainMeasure,
  patterns,
  setPatterns,
}: PatternManagerProps) {
  // Internal state for copied pattern
  const [copiedPattern, setCopiedPattern] = useState<GridState | null>(null);

  // Copy/Paste functionality encapsulated within the component
  const handleCopy = () => {
    setCopiedPattern(patterns[currentPattern]);
  };

  const handlePaste = () => {
    if (!copiedPattern) return;

    setPatterns((prev) => ({
      ...prev,
      [currentPattern]: copiedPattern.map((row) => [...row]),
    }));
  };

  return (
    <div className="flex items-center gap-4">
      {/* Pattern selection */}
      <div className="flex gap-2">
        {(["A", "B", "C", "D"] as const).map((patternLabel) => {
          // When chain mode is active and playing, show the current chain pattern as selected
          // Otherwise show the manually selected pattern
          const isSelected =
            isPlaying && chainEnabled
              ? patternChain[chainMeasure] === patternLabel
              : currentPattern === patternLabel;

          return (
            <Toggle
              key={patternLabel}
              pressed={isSelected}
              onPressedChange={() => {
                if (!(isPlaying && chainEnabled)) {
                  setCurrentPattern(patternLabel);
                }
              }}
            >
              {patternLabel}
            </Toggle>
          );
        })}
      </div>

      {/* Copy/Paste controls */}
      <div className="flex gap-2">
        <Button variant="outline" onClick={handleCopy}>
          <Copy className="mr-2 h-4 w-4" />
          Copy
        </Button>
        <Button
          variant="outline"
          disabled={!copiedPattern}
          onClick={handlePaste}
        >
          <ClipboardCheck className="mr-2 h-4 w-4" />
          Paste
        </Button>
      </div>
    </div>
  );
}
