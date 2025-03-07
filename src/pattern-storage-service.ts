import { GridState } from "./types";

export type StoredPattern = {
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

const STORAGE_KEY = "house-is-a-feeling-patterns";

/**
 * Get all saved patterns from local storage
 */
export const getAllPatterns = (): StoredPattern[] => {
  try {
    const patternsJson = localStorage.getItem(STORAGE_KEY);
    return patternsJson ? JSON.parse(patternsJson) : [];
  } catch (error) {
    console.error("Error retrieving patterns from storage:", error);
    return [];
  }
};

/**
 * Save a pattern to local storage
 */
export const savePattern = (pattern: StoredPattern): StoredPattern => {
  try {
    const patterns = getAllPatterns();

    // If pattern has an id, it's an update to an existing pattern
    if (pattern.id) {
      const index = patterns.findIndex((p) => p.id === pattern.id);
      if (index !== -1) {
        // Update existing patternj
        const updatedPattern = {
          ...pattern,
          updatedAt: new Date().toISOString(),
        };
        patterns[index] = updatedPattern;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(patterns));
        return updatedPattern;
      }
    }

    // It's a new pattern, create a new ID
    const newPattern = {
      ...pattern,
      id: pattern.id || Date.now().toString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Add to patterns and save
    patterns.push(newPattern);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(patterns));
    return newPattern;
  } catch (error) {
    console.error("Error saving pattern to storage:", error);
    // Return the original pattern to avoid undefined errors
    return pattern;
  }
};

/**
 * Save a pattern as a new pattern
 */
export const saveAsNewPattern = (
  pattern: Partial<StoredPattern> & {
    name: string;
    patterns: StoredPattern["patterns"];
  },
): StoredPattern => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id, ...patternWithoutId } = pattern;

  const newPattern: StoredPattern = {
    ...(patternWithoutId as Omit<
      StoredPattern,
      "id" | "createdAt" | "updatedAt"
    >),
    id: "",
    createdAt: "",
    updatedAt: "",
  };

  return savePattern(newPattern);
};

/**
 * Get a pattern by ID
 */
export const getPatternById = (id: string): StoredPattern | null => {
  const patterns = getAllPatterns();
  return patterns.find((pattern) => pattern.id === id) || null;
};

/**
 * Delete a pattern by ID
 */
export const deletePattern = (id: string): boolean => {
  try {
    const patterns = getAllPatterns();
    const filteredPatterns = patterns.filter((pattern) => pattern.id !== id);

    localStorage.setItem(STORAGE_KEY, JSON.stringify(filteredPatterns));
    return true;
  } catch (error) {
    console.error("Error deleting pattern:", error);
    return false;
  }
};

/**
 * Search patterns by name
 */
export const searchPatterns = (query: string): StoredPattern[] => {
  if (!query) return getAllPatterns();

  const patterns = getAllPatterns();
  const lowerQuery = query.toLowerCase();

  return patterns.filter((pattern) =>
    pattern.name.toLowerCase().includes(lowerQuery),
  );
};
