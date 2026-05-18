import { describe, expect, it } from 'vitest';
import { parseDeleteCommand, extractDeleteTargetText } from '../logic/parsers/deleteCommandParser';

describe('deleteCommandParser', () => {
  describe('parseDeleteCommand', () => {
    it('parses subject text out of delete queries', () => {
      const parsed = parseDeleteCommand('احذف محمود القرجي');
      expect(parsed).toEqual({
        targetMention: 'محمود القرجي',
      });
    });
  });

  describe('extractDeleteTargetText', () => {
    it('extracts correct name query directly', () => {
      expect(extractDeleteTargetText('حذف فاطمة')).toBe('فاطمة');
    });
  });
});
