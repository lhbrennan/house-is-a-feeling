import React, { useState, useEffect } from "react";
import { Search, Trash2, Edit2 } from "lucide-react";

import {
  StoredSession,
  searchSessions,
  deleteSession,
} from "@/services/session-storage";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type SessionManagerProps = {
  isOpen: boolean;
  onClose: () => void;
  onSessionSelect: (session: StoredSession) => void;
  onSessionRename: (session: StoredSession, newName: string) => void;
};

export function SessionManagerDialog({
  isOpen,
  onClose,
  onSessionSelect,
  onSessionRename,
}: SessionManagerProps) {
  const [sessions, setSessions] = useState<StoredSession[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [renamingSessionId, setRenamingSessionId] = useState<string | null>(
    null,
  );
  const [newSessionsName, setNewSessionsName] = useState("");

  useEffect(() => {
    if (isOpen) {
      // Refresh sessions when dialog opens
      refreshSessions();
    }
  }, [isOpen]);

  const refreshSessions = () => {
    const allSessions = searchSessions(searchQuery);
    setSessions(allSessions);
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    const filtered = searchSessions(e.target.value);
    setSessions(filtered);
  };

  const handleDeleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this session?")) {
      deleteSession(id);
      refreshSessions();
    }
  };

  const handleRenameClick = (session: StoredSession, e: React.MouseEvent) => {
    e.stopPropagation();
    setRenamingSessionId(session.id);
    setNewSessionsName(session.name);
  };

  const handleRenameSubmit = (session: StoredSession, e: React.FormEvent) => {
    e.preventDefault();
    if (newSessionsName.trim()) {
      onSessionRename(session, newSessionsName);
      setRenamingSessionId(null);
      refreshSessions();
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
          <DialogTitle>My Sessions</DialogTitle>
        </DialogHeader>

        <div className="relative mb-4">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className="text-muted-foreground h-4 w-4" />
          </div>
          <Input
            type="text"
            placeholder="Search sessions..."
            value={searchQuery}
            onChange={handleSearch}
            className="pl-10"
          />
        </div>

        <div className="max-h-[50vh] overflow-y-auto rounded-md border">
          {sessions.length > 0 ? (
            <div className="divide-border divide-y">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className="hover:bg-accent/50 group relative cursor-pointer p-3"
                  onClick={() => onSessionSelect(session)}
                >
                  {renamingSessionId === session.id ? (
                    <form
                      onSubmit={(e) => handleRenameSubmit(session, e)}
                      className="mb-2"
                    >
                      <Input
                        type="text"
                        value={newSessionsName}
                        onChange={(e) => setNewSessionsName(e.target.value)}
                        autoFocus
                        onBlur={() => setRenamingSessionId(null)}
                        className="mb-1"
                      />
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setRenamingSessionId(null)}
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
                      <div className="font-medium">{session.name}</div>
                      <div className="text-muted-foreground mt-1 text-xs">
                        Last updated: {formatDate(session.updatedAt)}
                      </div>
                      <div className="absolute top-2 right-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => handleRenameClick(session, e)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive h-8 w-8"
                          onClick={(e) => handleDeleteSession(session.id, e)}
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
                ? "No matching session found"
                : "No saved session yet"}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
