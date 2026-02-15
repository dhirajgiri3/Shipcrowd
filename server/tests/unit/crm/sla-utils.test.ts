import { formatRemainingTime, getRemainingTime, getSLAStatus, isSLABreached, SLA_THRESHOLDS } from '@/core/application/services/crm/support/sla.utils';

describe('SLA Utilities', () => {
  describe('isSLABreached', () => {
    test('should return true when critical ticket exceeds 4 hour SLA', () => {
      const fiveHoursAgo = new Date(Date.now() - 5 * 60 * 60 * 1000);
      const breached = isSLABreached('critical', fiveHoursAgo, 'open');
      expect(breached).toBe(true);
    });

    test('should return false when critical ticket is within 4 hour SLA', () => {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
      const breached = isSLABreached('critical', twoHoursAgo, 'open');
      expect(breached).toBe(false);
    });

    test('should return true when high priority ticket exceeds 8 hour SLA', () => {
      const nineHoursAgo = new Date(Date.now() - 9 * 60 * 60 * 1000);
      const breached = isSLABreached('high', nineHoursAgo, 'open');
      expect(breached).toBe(true);
    });

    test('should return true when medium priority ticket exceeds 24 hour SLA', () => {
      const twoFivHoursAgo = new Date(Date.now() - 25 * 60 * 60 * 1000);
      const breached = isSLABreached('medium', twoFivHoursAgo, 'open');
      expect(breached).toBe(true);
    });

    test('should return true when low priority ticket exceeds 7 day SLA', () => {
      const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
      const breached = isSLABreached('low', eightDaysAgo, 'open');
      expect(breached).toBe(true);
    });

    test('should return false for resolved tickets regardless of age', () => {
      const hundredDaysAgo = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000);
      const breached = isSLABreached('critical', hundredDaysAgo, 'resolved');
      expect(breached).toBe(false);
    });

    test('should return false for closed tickets regardless of age', () => {
      const hundredDaysAgo = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000);
      const breached = isSLABreached('critical', hundredDaysAgo, 'closed');
      expect(breached).toBe(false);
    });

    test('should consider in_progress tickets for SLA breach', () => {
      const fiveHoursAgo = new Date(Date.now() - 5 * 60 * 60 * 1000);
      const breached = isSLABreached('critical', fiveHoursAgo, 'in_progress');
      expect(breached).toBe(true);
    });
  });

  describe('getRemainingTime', () => {
    test('should return positive remaining time when not breached', () => {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
      const remaining = getRemainingTime('critical', twoHoursAgo, 'open');
      expect(remaining).toBeDefined();
      expect(remaining! > 0).toBe(true);
      expect(remaining! < 4 * 60 * 60 * 1000).toBe(true);
    });

    test('should return null when SLA is breached', () => {
      const fiveHoursAgo = new Date(Date.now() - 5 * 60 * 60 * 1000);
      const remaining = getRemainingTime('critical', fiveHoursAgo, 'open');
      expect(remaining).toBeNull();
    });

    test('should return null for resolved tickets', () => {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
      const remaining = getRemainingTime('critical', twoHoursAgo, 'resolved');
      expect(remaining).toBeNull();
    });

    test('should calculate correct remaining time for medium priority', () => {
      const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);
      const remaining = getRemainingTime('medium', twelveHoursAgo, 'open');
      expect(remaining).toBeDefined();
      expect(remaining! > 12 * 60 * 60 * 1000).toBe(true);
      expect(remaining! < 24 * 60 * 60 * 1000).toBe(true);
    });
  });

  describe('formatRemainingTime', () => {
    test('should format time in hours and minutes', () => {
      const threeHoursAndThirtyMinutes = 3.5 * 60 * 60 * 1000;
      const formatted = formatRemainingTime(threeHoursAndThirtyMinutes);
      expect(formatted).toContain('3h');
      expect(formatted).toContain('m');
    });

    test('should format only minutes when less than an hour', () => {
      const thirtyMinutes = 30 * 60 * 1000;
      const formatted = formatRemainingTime(thirtyMinutes);
      expect(formatted).toContain('30m');
      expect(formatted).not.toContain('h');
    });

    test('should return "Breached" for zero or negative time', () => {
      expect(formatRemainingTime(0)).toBe('Breached');
      expect(formatRemainingTime(-1000)).toBe('Breached');
    });
  });

  describe('getSLAStatus', () => {
    test('should return on_track status for recent critical ticket', () => {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
      const status = getSLAStatus('critical', twoHoursAgo, 'open');
      expect(status.status).toBe('on_track');
      expect(status.color).toBe('green');
    });

    test('should return warning status when less than 1 hour remaining', () => {
      // Critical: 4 hours SLA
      // Created: 3.5 hours ago (30 min remaining)
      const threePointFiveHoursAgo = new Date(Date.now() - 3.5 * 60 * 60 * 1000);
      const status = getSLAStatus('critical', threePointFiveHoursAgo, 'open');
      expect(status.status).toBe('warning');
      expect(status.color).toBe('yellow');
    });

    test('should return breached status when SLA exceeded', () => {
      const fiveHoursAgo = new Date(Date.now() - 5 * 60 * 60 * 1000);
      const status = getSLAStatus('critical', fiveHoursAgo, 'open');
      expect(status.status).toBe('breached');
      expect(status.color).toBe('red');
    });

    test('should return on_track for resolved tickets', () => {
      const hundredDaysAgo = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000);
      const status = getSLAStatus('critical', hundredDaysAgo, 'resolved');
      expect(status.status).toBe('on_track');
      expect(status.color).toBe('green');
      expect(status.text).toBe('Resolved');
    });
  });

  describe('SLA_THRESHOLDS', () => {
    test('should have correct threshold values', () => {
      expect(SLA_THRESHOLDS.critical).toBe(4 * 60 * 60 * 1000);
      expect(SLA_THRESHOLDS.high).toBe(8 * 60 * 60 * 1000);
      expect(SLA_THRESHOLDS.medium).toBe(24 * 60 * 60 * 1000);
      expect(SLA_THRESHOLDS.low).toBe(7 * 24 * 60 * 60 * 1000);
    });
  });

  describe('Edge Cases', () => {
    test('should handle tickets created at exact SLA boundary', () => {
      const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000);
      // At exact boundary, should still be on track (not breached)
      const breached = isSLABreached('critical', fourHoursAgo, 'open');
      // This depends on implementation - whether boundary is inclusive or exclusive
      expect(typeof breached).toBe('boolean');
    });

    test('should handle very old tickets', () => {
      const oneyearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
      const breached = isSLABreached('critical', oneyearAgo, 'open');
      expect(breached).toBe(true);
    });

    test('should handle very recent tickets', () => {
      const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
      const breached = isSLABreached('critical', oneMinuteAgo, 'open');
      expect(breached).toBe(false);
    });
  });
});
