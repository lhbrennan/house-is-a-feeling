import { GridState } from "./types";

export type StoredSession = {
  id: string;
  name: string;
  patterns: {
    A: GridState;
    B: GridState;
    C: GridState;
    D: GridState;
  };
  createdAt: string;
  updatedAt: string;
};

const STORAGE_KEY = "house-is-a-feeling-sessions";

/**
 * Get all saved sessions from local storage
 */
export const getAllSessions = (): StoredSession[] => {
  try {
    const sessionsJson = localStorage.getItem(STORAGE_KEY);
    return sessionsJson ? JSON.parse(sessionsJson) : [];
  } catch (error) {
    console.error("Error retrieving patterns from storage:", error);
    return [];
  }
};

/**
 * Save a pattern to local storage
 */
export const saveSession = (session: StoredSession): StoredSession => {
  try {
    const sessions = getAllSessions();

    // If session has an id, it's an update to an existing session
    if (session.id) {
      const index = sessions.findIndex((p) => p.id === session.id);
      if (index !== -1) {
        // Update existing sessionj
        const updatedSession = {
          ...session,
          updatedAt: new Date().toISOString(),
        };
        sessions[index] = updatedSession;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
        return updatedSession;
      }
    }

    const newSession = {
      ...session,
      id: session.id || Date.now().toString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Add to sessions and save
    sessions.push(newSession);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    return newSession;
  } catch (error) {
    console.error("Error saving session to storage:", error);
    // Return the original session to avoid undefined errors
    return session;
  }
};

/**
 * Save a session as a new session
 */
export const saveAsNewSession = (
  session: Partial<StoredSession> & {
    name: string;
    patterns: StoredSession["patterns"];
  },
): StoredSession => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id, ...sessionWithoutId } = session;

  const newSession: StoredSession = {
    ...(sessionWithoutId as Omit<
      StoredSession,
      "id" | "createdAt" | "updatedAt"
    >),
    id: "",
    createdAt: "",
    updatedAt: "",
  };

  return saveSession(newSession);
};

/**
 * Get a pattern by ID
 */
export const getSessionById = (id: string): StoredSession | null => {
  const sessions = getAllSessions();
  return sessions.find((session) => session.id === id) || null;
};

/**
 * Delete a session by ID
 */
export const deleteSession = (id: string): boolean => {
  try {
    const sessions = getAllSessions();
    const filteredSessions = sessions.filter((session) => session.id !== id);

    localStorage.setItem(STORAGE_KEY, JSON.stringify(filteredSessions));
    return true;
  } catch (error) {
    console.error("Error deleting session:", error);
    return false;
  }
};

/**
 * Search sessions by name
 */
export const searchSessions = (query: string): StoredSession[] => {
  if (!query) return getAllSessions();

  const sessions = getAllSessions();
  const lowerQuery = query.toLowerCase();

  return sessions.filter((session) =>
    session.name.toLowerCase().includes(lowerQuery),
  );
};
