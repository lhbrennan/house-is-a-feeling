import React, { useState, useEffect } from "react";
import { Search, Trash2, Edit2 } from "lucide-react";

import {
  StoredPattern,
  searchPatterns,
  deletePattern,
} from "@/pattern-storage-service";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type PatternManagerProps = {
  isOpen: boolean;
  onClose: () => void;
  onPatternSelect: (pattern: StoredPattern) => void;
  onPatternRename: (pattern: StoredPattern, newName: string) => void;
};

export function PatternManagerDialog({
  isOpen,
  onClose,
  onPatternSelect,
  onPatternRename,
}: PatternManagerProps) {
  const [patterns, setPatterns] = useState<StoredPattern[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [renamingPatternId, setRenamingPatternId] = useState<string | null>(
    null,
  );
  const [newPatternName, setNewPatternName] = useState("");

  useEffect(() => {
    if (isOpen) {
      // Refresh patterns when dialog opens
      refreshPatterns();
    }
  }, [isOpen]);

  const refreshPatterns = () => {
    const allPatterns = searchPatterns(searchQuery);
    setPatterns(allPatterns);
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    const filtered = searchPatterns(e.target.value);
    setPatterns(filtered);
  };

  const handleDeletePattern = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this pattern?")) {
      deletePattern(id);
      refreshPatterns();
    }
  };

  const handleRenameClick = (pattern: StoredPattern, e: React.MouseEvent) => {
    e.stopPropagation();
    setRenamingPatternId(pattern.id);
    setNewPatternName(pattern.name);
  };

  const handleRenameSubmit = (pattern: StoredPattern, e: React.FormEvent) => {
    e.preventDefault();
    if (newPatternName.trim()) {
      onPatternRename(pattern, newPatternName);
      setRenamingPatternId(null);
      refreshPatterns();
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString();
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (e) {
      return "Unknown date";
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[80vh] max-w-xl">
        <DialogHeader>
          <DialogTitle>My Patterns</DialogTitle>
        </DialogHeader>

        <div className="relative mb-4">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className="text-muted-foreground h-4 w-4" />
          </div>
          <Input
            type="text"
            placeholder="Search patterns..."
            value={searchQuery}
            onChange={handleSearch}
            className="pl-10"
          />
        </div>

        <div className="max-h-[50vh] overflow-y-auto rounded-md border">
          {patterns.length > 0 ? (
            <div className="divide-border divide-y">
              {patterns.map((pattern) => (
                <div
                  key={pattern.id}
                  className="hover:bg-accent/50 group relative cursor-pointer p-3"
                  onClick={() => onPatternSelect(pattern)}
                >
                  {renamingPatternId === pattern.id ? (
                    <form
                      onSubmit={(e) => handleRenameSubmit(pattern, e)}
                      className="mb-2"
                    >
                      <Input
                        type="text"
                        value={newPatternName}
                        onChange={(e) => setNewPatternName(e.target.value)}
                        autoFocus
                        onBlur={() => setRenamingPatternId(null)}
                        className="mb-1"
                      />
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setRenamingPatternId(null)}
                        >
                          Cancel
                        </Button>
                        <Button type="submit" size="sm">
                          Save
                        </Button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <div className="font-medium">{pattern.name}</div>
                      <div className="text-muted-foreground mt-1 text-xs">
                        Last updated: {formatDate(pattern.updatedAt)}
                      </div>
                      <div className="absolute top-2 right-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => handleRenameClick(pattern, e)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive h-8 w-8"
                          onClick={(e) => handleDeletePattern(pattern.id, e)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-muted-foreground p-6 text-center">
              {searchQuery
                ? "No matching patterns found"
                : "No saved patterns yet"}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
