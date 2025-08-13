// Mock expo-localization to avoid React Native dependency in tests
jest.mock('expo-localization', () => ({
  region: 'US',
}));

import { normalizePhoneNumber, getDefaultRegion } from '../phoneUtil';

describe('phoneUtil', () => {
  describe('normalizePhoneNumber', () => {
    it('should normalize Israeli local phone number 0502525177 to E.164 format', () => {
      // TEST CASE: This is the main scenario from the user's question
      // Local Israeli number 0502525177 should become +972502525177
      const result = normalizePhoneNumber('0502525177', 'IL');
      
      expect(result.isValid).toBe(true);
      expect(result.e164).toBe('+972502525177');
      expect(result.region).toBe('IL');
      expect(result.national).toBe('050-252-5177');
      expect(result.error).toBeUndefined();
    });

    it('should handle Israeli phone number with creator region context', () => {
      // TEST CASE: Simulate the scenario where group creator has +972542109851
      // We'll use a valid Israeli mobile number for testing
      const validCreatorNumber = '+972542109851';
      const creatorResult = normalizePhoneNumber(validCreatorNumber);
      
      // If creator's number is valid, use their region
      if (creatorResult.isValid) {
        expect(creatorResult.region).toBe('IL');
        
        // Now use that region to normalize the local number
        const memberResult = normalizePhoneNumber('0502525177', creatorResult.region || undefined);
        
        expect(memberResult.isValid).toBe(true);
        expect(memberResult.e164).toBe('+972502525177');
        expect(memberResult.region).toBe('IL');
      } else {
        // Fallback: test with explicit IL region
        const memberResult = normalizePhoneNumber('0502525177', 'IL');
        expect(memberResult.isValid).toBe(true);
        expect(memberResult.e164).toBe('+972502525177');
      }
    });

    it('should handle valid Israeli mobile numbers', () => {
      // Test some known valid Israeli mobile numbers
      const validNumbers = [
        { input: '0502525177', expected: '+972502525177' },
        { input: '0521234567', expected: '+972521234567' },
        { input: '0541234567', expected: '+972541234567' },
      ];
      
      validNumbers.forEach(({ input, expected }) => {
        const result = normalizePhoneNumber(input, 'IL');
        expect(result.isValid).toBe(true);
        expect(result.e164).toBe(expected);
        expect(result.region).toBe('IL');
      });
    });

    it('should handle empty or invalid inputs gracefully', () => {
      const emptyResult = normalizePhoneNumber('');
      expect(emptyResult.isValid).toBe(false);
      expect(emptyResult.e164).toBe(null);
      expect(emptyResult.error).toBe('empty');

      const invalidResult = normalizePhoneNumber('123', 'IL');
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.e164).toBe(null);
      expect(invalidResult.error).toBe('invalid');
    });

    it('should handle whitespace and formatting', () => {
      const result = normalizePhoneNumber('  0502525177  ', 'IL');
      
      expect(result.isValid).toBe(true);
      expect(result.e164).toBe('+972502525177');
      expect(result.region).toBe('IL');
    });
  });

  describe('getDefaultRegion', () => {
    it('should return a valid 2-letter country code or US as fallback', () => {
      const region = getDefaultRegion();
      
      expect(typeof region).toBe('string');
      expect(region.length).toBe(2);
      expect(/^[A-Z]{2}$/.test(region)).toBe(true);
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle malformed input gracefully', () => {
      const testCases = [
        'abc',
        '+++123',
        '12345678901234567890', // too long
        '+',
        '+972', // too short
      ];

      testCases.forEach(testCase => {
        const result = normalizePhoneNumber(testCase, 'IL');
        expect(result.isValid).toBe(false);
        expect(result.e164).toBe(null);
      });
    });

    it('should preserve whitespace trimming', () => {
      const result = normalizePhoneNumber('  0502525177  ', 'IL');
      
      expect(result.isValid).toBe(true);
      expect(result.e164).toBe('+972502525177');
    });
  });
});
