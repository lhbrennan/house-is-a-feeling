import React, { useState, useEffect } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { downloadMidi } from "@/services/midi-export";
import type { GridState } from "@/types";

type MidiExportButtonProps = {
  pattern: GridState;
  patternName: string;
  bpm: number;
};

export function MidiExportButton({
  pattern,
  patternName,
  bpm,
}: MidiExportButtonProps) {
  const [filename, setFilename] = useState(`${patternName}-beat`);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [hasNotes, setHasNotes] = useState(false);

  // Check if the pattern has any notes
  useEffect(() => {
    const patternHasNotes = pattern.some((row) => row.some((cell) => cell > 0));
    setHasNotes(patternHasNotes);
  }, [pattern]);

  const handleExport = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!hasNotes) return;

    console.log("Export button clicked", { pattern, bpm, filename });
    downloadMidi(pattern, bpm, filename);
    setIsPopoverOpen(false);
  };

  return (
    <Popover
      open={isPopoverOpen && hasNotes}
      onOpenChange={(open) => hasNotes && setIsPopoverOpen(open)}
    >
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="flex items-center"
          disabled={!hasNotes}
          title={hasNotes ? "Export as MIDI" : "Pattern is empty"}
        >
          <Download className="mr-2 h-4 w-4" />
          Export MIDI
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="space-y-4">
          <h4 className="font-medium">Export Pattern as MIDI</h4>
          <p className="text-muted-foreground text-sm">
            Export the current pattern with velocity information to a MIDI file.
          </p>
          <div className="space-y-2">
            <Label htmlFor="filename">Filename</Label>
            <Input
              id="filename"
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              className="w-full"
            />
          </div>
          <div className="flex justify-end">
            <Button onClick={handleExport}>Download MIDI</Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
