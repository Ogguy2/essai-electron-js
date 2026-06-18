import { describe, it, expect } from 'vitest';
import { JOURNAL_TYPES, JOURNAL_TYPE_CODES, isJournalType, DEFAULT_JOURNAUX } from './journal';

describe('journal', () => {
  it('expose 7 types', () => { expect(JOURNAL_TYPES).toHaveLength(7); });
  it('isJournalType', () => {
    expect(isJournalType('VTE')).toBe(true);
    expect(isJournalType('XXX')).toBe(false);
  });
  it('DEFAULT_JOURNAUX a des types valides', () => {
    for (const j of DEFAULT_JOURNAUX) expect(JOURNAL_TYPE_CODES).toContain(j.type);
  });
});
