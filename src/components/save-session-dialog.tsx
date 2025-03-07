import React, { useState, useEffect } from "react";

import { getAllSessions } from "@/session-storage-service";
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

type SaveSessionDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string) => void;
  initialName: string;
};

export function SaveSessionDialog({
  isOpen,
  onClose,
  onSave,
  initialName = "",
}: SaveSessionDialogProps) {
  const [sessionName, setSessionName] = useState(initialName);
  const [error, setError] = useState("");
  const [existingNames, setExistingNames] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      setSessionName(initialName);
      setError("");

      const sessions = getAllSessions();
      const names = sessions.map((p) => p.name.toLowerCase());
      setExistingNames(names);
    }
  }, [isOpen, initialName]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSessionName(e.target.value);
    setError("");
  };

  const handleSave = () => {
    const trimmedName = sessionName.trim();

    if (!trimmedName) {
      setError("Session name cannot be empty");
      return;
    }

    // Check for duplicate names
    if (existingNames.includes(trimmedName.toLowerCase())) {
      setError("A session with this name already exists");
      return;
    }

    onSave(trimmedName);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Save Session As</DialogTitle>
        </DialogHeader>

        <div className="py-4">
          <Label htmlFor="session-name" className="mb-2 block">
            Session Name
          </Label>
          <Input
            id="session-name"
            type="text"
            value={sessionName}
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
