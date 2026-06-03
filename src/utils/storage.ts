export interface SavedPrompt {
  id: string;
  title: string;
  templateId: string;
  templateName: string;
  values: Record<string, string>;
  compiledPrompt: string;
  createdAt: string;
  updatedAt: string;
  usageCount: number;
}

const STORAGE_KEY = 'universal_prompt_vault_data';

// Helper to safely access localStorage (handles Next.js SSR)
const getLocalStorage = (): Storage | null => {
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage;
  }
  return null;
};

export const getSavedPrompts = (): SavedPrompt[] => {
  const storage = getLocalStorage();
  if (!storage) return [];
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return [];
  } catch (e) {
    console.error('Failed to parse saved prompts', e);
    return [];
  }
};

export const savePrompt = (prompt: Omit<SavedPrompt, 'createdAt' | 'updatedAt' | 'usageCount'>): SavedPrompt[] => {
  const storage = getLocalStorage();
  if (!storage) return [];
  
  const prompts = getSavedPrompts();
  const existingIndex = prompts.findIndex(p => p.id === prompt.id);
  const now = new Date().toISOString();
  
  let updatedPrompts: SavedPrompt[];
  
  if (existingIndex > -1) {
    // Update existing
    const existing = prompts[existingIndex];
    const updated: SavedPrompt = {
      ...existing,
      ...prompt,
      updatedAt: now,
    };
    updatedPrompts = [...prompts];
    updatedPrompts[existingIndex] = updated;
  } else {
    // Create new
    const newItem: SavedPrompt = {
      ...prompt,
      createdAt: now,
      updatedAt: now,
      usageCount: 0,
    };
    updatedPrompts = [newItem, ...prompts];
  }
  
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(updatedPrompts));
  } catch (e) {
    console.error('Failed to write to localStorage', e);
  }
  
  return updatedPrompts;
};

export const deletePrompt = (id: string): SavedPrompt[] => {
  const storage = getLocalStorage();
  if (!storage) return [];
  
  const prompts = getSavedPrompts();
  const filtered = prompts.filter(p => p.id !== id);
  
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (e) {
    console.error('Failed to delete from localStorage', e);
  }
  
  return filtered;
};

export const incrementUsageCount = (id: string): SavedPrompt[] => {
  const storage = getLocalStorage();
  if (!storage) return [];
  
  const prompts = getSavedPrompts();
  const index = prompts.findIndex(p => p.id === id);
  if (index === -1) return prompts;
  
  prompts[index].usageCount += 1;
  prompts[index].updatedAt = new Date().toISOString();
  
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(prompts));
  } catch (e) {
    console.error('Failed to increment usage count', e);
  }
  
  return prompts;
};
