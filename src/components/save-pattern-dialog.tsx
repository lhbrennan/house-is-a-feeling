import React, { useState, useEffect } from "react";

import { getAllPatterns } from "@/pattern-storage-service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

type SavePatternDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string) => void;
  initialName: string;
};

export function SavePatternDialog({
  isOpen,
  onClose,
  onSave,
  initialName = "",
}: SavePatternDialogProps) {
  const [patternName, setPatternName] = useState(initialName);
  const [error, setError] = useState("");
  const [existingNames, setExistingNames] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      setPatternName(initialName);
      setError("");

      const patterns = getAllPatterns();
      const names = patterns.map((p) => p.name.toLowerCase());
      setExistingNames(names);
    }
  }, [isOpen, initialName]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPatternName(e.target.value);
    setError("");
  };

  const handleSave = () => {
    const trimmedName = patternName.trim();

    if (!trimmedName) {
      setError("Pattern name cannot be empty");
      return;
    }

    // Check for duplicate names
    if (existingNames.includes(trimmedName.toLowerCase())) {
      setError("A pattern with this name already exists");
      return;
    }

    onSave(trimmedName);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Save Pattern As</DialogTitle>
        </DialogHeader>

        <div className="py-4">
          <Label htmlFor="pattern-name" className="mb-2 block">
            Pattern Name
          </Label>
          <Input
            id="pattern-name"
            type="text"
            value={patternName}
            onChange={handleNameChange}
            className="w-full"
            autoFocus
          />
          {error && (
            <div className="text-destructive mt-2 text-sm">{error}</div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
