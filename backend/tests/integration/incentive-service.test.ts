import 'dotenv/config';
import { describe, it, expect } from 'vitest';
import { IncentiveService } from '../../src/modules/incentives/incentive.service';

const service = new IncentiveService();

describe('IncentiveService — INTEGRATION TESTS', () => {
  describe('getConfig()', () => {
    it('returns array of incentive configs', async () => {
      const configs = await service.getConfig();
      expect(Array.isArray(configs)).toBe(true);
      expect(configs.length).toBeGreaterThanOrEqual(11);
    });

    it('each config has required fields', async () => {
      const configs = await service.getConfig();
      for (const c of configs) {
        expect(c).toHaveProperty('type');
        expect(c).toHaveProperty('rate');
        expect(c).toHaveProperty('formulaType');
        expect(c).toHaveProperty('positions');
      }
    });
  });

  describe('getConfigForPosition()', () => {
    it('filters by position', async () => {
      const configs = await service.getConfigForPosition('RESIDENT_VETERINARIAN');
      expect(Array.isArray(configs)).toBe(true);
      expect(configs.length).toBe(8);
    });
  });

  describe('getEligibleCounts()', () => {
    it('returns counts for branch 1', async () => {
      const counts = await service.getEligibleCounts(1);
      expect(counts).toHaveProperty('GROOMING');
      expect(counts).toHaveProperty('CONFINEMENT_VET');
      expect(typeof counts.GROOMING).toBe('number');
    });
  });

  describe('calculatePreview()', () => {
    it('calculates preview without saving', async () => {
      const result = await service.calculatePreview('RESIDENT_VETERINARIAN', [
        { type: 'CBC', count: 5, inputValue: 0 },
        { type: 'SURGERY', count: 0, inputValue: 50000 },
      ]);
      expect(result).toHaveProperty('incentives');
      expect(result).toHaveProperty('totalAmount');
      expect(typeof result.totalAmount).toBe('number');
    });
  });

  describe('initConfig()', () => {
    it('rejects when configs already exist', async () => {
      await expect(service.initConfig()).rejects.toThrow('Configs already initialized');
    });
  });
});
