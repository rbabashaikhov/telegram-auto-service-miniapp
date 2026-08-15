import { describe, expect, it } from 'vitest';
import { createTourStorage, memoryStorage } from './storage';

describe('tour storage', () => {
  it('marks the tour as seen', () => {
    const storage = createTourStorage('auto.test', memoryStorage);
    storage.clear();
    expect(storage.hasBeenSeen()).toBe(false);
    storage.markSeen('completed');
    expect(storage.hasBeenSeen()).toBe(true);
    expect(storage.readReason()).toBe('completed');
  });
});
