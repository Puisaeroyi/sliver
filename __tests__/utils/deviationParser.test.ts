import { parseDeviations, getCellBackgroundColor, getDeviationText, getMissedPunch } from '@/lib/utils/deviationParser';

describe('Deviation Parser', () => {
  describe('parseDeviations', () => {
    it('should return all false for On Time status', () => {
      const flags = parseDeviations('On Time');
      expect(flags.checkInLate).toBe(false);
      expect(flags.breakOutEarly).toBe(false);
      expect(flags.breakInLate).toBe(false);
      expect(flags.checkOutEarly).toBe(false);
      expect(flags.hasMissingTimestamps).toBe(false);
    });

    it('should return all false for empty status', () => {
      const flags = parseDeviations('');
      expect(flags.checkInLate).toBe(false);
      expect(flags.breakOutEarly).toBe(false);
      expect(flags.breakInLate).toBe(false);
      expect(flags.checkOutEarly).toBe(false);
      expect(flags.hasMissingTimestamps).toBe(false);
    });

    it('should parse late check-in', () => {
      const flags = parseDeviations('Late Check-in');
      expect(flags.checkInLate).toBe(true);
      expect(flags.breakOutEarly).toBe(false);
      expect(flags.breakInLate).toBe(false);
      expect(flags.checkOutEarly).toBe(false);
      expect(flags.hasMissingTimestamps).toBe(false);
    });

    it('should parse Check-in Late format', () => {
      const flags = parseDeviations('Check-in Late');
      expect(flags.checkInLate).toBe(true);
      expect(flags.breakOutEarly).toBe(false);
      expect(flags.breakInLate).toBe(false);
      expect(flags.checkOutEarly).toBe(false);
      expect(flags.hasMissingTimestamps).toBe(false);
    });

    it('should parse early break out', () => {
      const flags = parseDeviations('Leave Soon Break Out');
      expect(flags.checkInLate).toBe(false);
      expect(flags.breakOutEarly).toBe(true);
      expect(flags.breakInLate).toBe(false);
      expect(flags.checkOutEarly).toBe(false);
      expect(flags.hasMissingTimestamps).toBe(false);
    });

    it('should parse Break Out Early format', () => {
      const flags = parseDeviations('Break Out Early');
      expect(flags.checkInLate).toBe(false);
      expect(flags.breakOutEarly).toBe(true);
      expect(flags.breakInLate).toBe(false);
      expect(flags.checkOutEarly).toBe(false);
      expect(flags.hasMissingTimestamps).toBe(false);
    });

    it('should parse late break in', () => {
      const flags = parseDeviations('Late Break In');
      expect(flags.checkInLate).toBe(false);
      expect(flags.breakOutEarly).toBe(false);
      expect(flags.breakInLate).toBe(true);
      expect(flags.checkOutEarly).toBe(false);
      expect(flags.hasMissingTimestamps).toBe(false);
    });

    it('should parse Break In Late format', () => {
      const flags = parseDeviations('Break In Late');
      expect(flags.checkInLate).toBe(false);
      expect(flags.breakOutEarly).toBe(false);
      expect(flags.breakInLate).toBe(true);
      expect(flags.checkOutEarly).toBe(false);
      expect(flags.hasMissingTimestamps).toBe(false);
    });

    it('should parse early check out', () => {
      const flags = parseDeviations('Leave Soon Check Out');
      expect(flags.checkInLate).toBe(false);
      expect(flags.breakOutEarly).toBe(false);
      expect(flags.breakInLate).toBe(false);
      expect(flags.checkOutEarly).toBe(true);
      expect(flags.hasMissingTimestamps).toBe(false);
    });

    it('should parse Check Out Early format', () => {
      const flags = parseDeviations('Check Out Early');
      expect(flags.checkInLate).toBe(false);
      expect(flags.breakOutEarly).toBe(false);
      expect(flags.breakInLate).toBe(false);
      expect(flags.checkOutEarly).toBe(true);
      expect(flags.hasMissingTimestamps).toBe(false);
    });

    it('should parse general Leave Soon as early check out', () => {
      const flags = parseDeviations('Leave Soon');
      expect(flags.checkInLate).toBe(false);
      expect(flags.breakOutEarly).toBe(false);
      expect(flags.breakInLate).toBe(false);
      expect(flags.checkOutEarly).toBe(true);
      expect(flags.hasMissingTimestamps).toBe(false);
    });

    it('should parse multiple deviations', () => {
      const flags = parseDeviations('Late Check-in, Leave Soon Break Out, Late Break In');
      expect(flags.checkInLate).toBe(true);
      expect(flags.breakOutEarly).toBe(true);
      expect(flags.breakInLate).toBe(true);
      expect(flags.checkOutEarly).toBe(false);
      expect(flags.hasMissingTimestamps).toBe(false);
    });

    it('should detect missing timestamps', () => {
      const flags = parseDeviations('[Missing: Check Out]');
      expect(flags.checkInLate).toBe(false);
      expect(flags.breakOutEarly).toBe(false);
      expect(flags.breakInLate).toBe(false);
      expect(flags.checkOutEarly).toBe(false);
      expect(flags.hasMissingTimestamps).toBe(true);
    });

    it('should detect deviations with missing timestamps', () => {
      const flags = parseDeviations('Late Check-in [Missing: Check Out]');
      expect(flags.checkInLate).toBe(true);
      expect(flags.breakOutEarly).toBe(false);
      expect(flags.breakInLate).toBe(false);
      expect(flags.checkOutEarly).toBe(false);
      expect(flags.hasMissingTimestamps).toBe(true);
    });
  });

  describe('getCellBackgroundColor', () => {
    it('should return red for late check-in', () => {
      const flags = { checkInLate: true, breakOutEarly: false, breakInLate: false, checkOutEarly: false, hasMissingTimestamps: false };
      const color = getCellBackgroundColor(flags, '08:35', 'checkIn');
      expect(color).toBe('FFFFC7CE'); // Red
    });

    it('should return yellow for early break out', () => {
      const flags = { checkInLate: false, breakOutEarly: true, breakInLate: false, checkOutEarly: false, hasMissingTimestamps: false };
      const color = getCellBackgroundColor(flags, '10:00', 'breakOut');
      expect(color).toBe('FFFFFF00'); // Yellow
    });

    it('should return red for late break in', () => {
      const flags = { checkInLate: false, breakOutEarly: false, breakInLate: true, checkOutEarly: false, hasMissingTimestamps: false };
      const color = getCellBackgroundColor(flags, '10:45', 'breakIn');
      expect(color).toBe('FFFFC7CE'); // Red
    });

    it('should return yellow for early check out', () => {
      const flags = { checkInLate: false, breakOutEarly: false, breakInLate: false, checkOutEarly: true, hasMissingTimestamps: false };
      const color = getCellBackgroundColor(flags, '16:00', 'checkOut');
      expect(color).toBe('FFFFFF00'); // Yellow
    });

    it('should return gray for missing timestamps', () => {
      const flags = { checkInLate: false, breakOutEarly: false, breakInLate: false, checkOutEarly: false, hasMissingTimestamps: false };
      const color = getCellBackgroundColor(flags, '', 'checkIn');
      expect(color).toBe('FFE0E0E0'); // Light gray
    });

    it('should return gray for empty time value', () => {
      const flags = { checkInLate: false, breakOutEarly: false, breakInLate: false, checkOutEarly: false, hasMissingTimestamps: false };
      const color = getCellBackgroundColor(flags, '   ', 'checkIn');
      expect(color).toBe('FFE0E0E0'); // Light gray
    });

    it('should return empty string for on-time values', () => {
      const flags = { checkInLate: false, breakOutEarly: false, breakInLate: false, checkOutEarly: false, hasMissingTimestamps: false };
      const color = getCellBackgroundColor(flags, '08:00', 'checkIn');
      expect(color).toBe('');
    });

    it('should return empty string for no deviation flags', () => {
      const flags = { checkInLate: false, breakOutEarly: false, breakInLate: false, checkOutEarly: false, hasMissingTimestamps: false };
      const color = getCellBackgroundColor(flags, '10:30', 'breakOut');
      expect(color).toBe('');
    });
  });

  describe('getDeviationText', () => {
    it('should return "Late" for late check-in', () => {
      const flags = { checkInLate: true, breakOutEarly: false, breakInLate: false, checkOutEarly: false, hasMissingTimestamps: false };
      const text = getDeviationText(flags, 'checkIn');
      expect(text).toBe('Late');
    });

    it('should return "Early" for early break out', () => {
      const flags = { checkInLate: false, breakOutEarly: true, breakInLate: false, checkOutEarly: false, hasMissingTimestamps: false };
      const text = getDeviationText(flags, 'breakOut');
      expect(text).toBe('Early');
    });

    it('should return "Late" for late break in', () => {
      const flags = { checkInLate: false, breakOutEarly: false, breakInLate: true, checkOutEarly: false, hasMissingTimestamps: false };
      const text = getDeviationText(flags, 'breakIn');
      expect(text).toBe('Late');
    });

    it('should return "Early" for early check out', () => {
      const flags = { checkInLate: false, breakOutEarly: false, breakInLate: false, checkOutEarly: true, hasMissingTimestamps: false };
      const text = getDeviationText(flags, 'checkOut');
      expect(text).toBe('Early');
    });

    it('should return empty string for no deviation', () => {
      const flags = { checkInLate: false, breakOutEarly: false, breakInLate: false, checkOutEarly: false, hasMissingTimestamps: false };
      const text = getDeviationText(flags, 'checkIn');
      expect(text).toBe('');
    });

    it('should return empty string for non-deviation type', () => {
      const flags = { checkInLate: true, breakOutEarly: false, breakInLate: false, checkOutEarly: false, hasMissingTimestamps: false };
      const text = getDeviationText(flags, 'checkOut');
      expect(text).toBe('');
    });
  });

  describe('getMissedPunch', () => {
    it('should return empty string for status without missing timestamps', () => {
      const missed = getMissedPunch('On Time');
      expect(missed).toBe('');
    });

    it('should return empty string for empty status', () => {
      const missed = getMissedPunch('');
      expect(missed).toBe('');
    });

    it('should extract single missing timestamp', () => {
      const missed = getMissedPunch('[Missing: Check Out]');
      expect(missed).toBe('CO');
    });

    it('should extract multiple missing timestamps', () => {
      const missed = getMissedPunch('[Missing: Break Out, Break In]');
      expect(missed).toBe('BTO, BTI');
    });

    it('should extract missing timestamps with extra spaces and trim', () => {
      const missed = getMissedPunch('[Missing:  Check Out,  Break In  ]');
      expect(missed).toBe('CO, BTI');
    });

    it('should handle status with deviations and missing timestamps', () => {
      const missed = getMissedPunch('Late Check-in [Missing: Check Out]');
      expect(missed).toBe('CO');
    });

    it('should handle malformed missing timestamp notation', () => {
      const missed = getMissedPunch('Some other text [Missing: Check Out');
      expect(missed).toBe('');
    });

    it('should handle complex missing timestamp list', () => {
      const missed = getMissedPunch('[Missing: Check Out, Break Out, Break In]');
      expect(missed).toBe('CO, BTO, BTI');
    });

    it('should return empty string for malformed bracket', () => {
      const missed = getMissedPunch('[Missing Check Out]');
      expect(missed).toBe('');
    });

    it('should return empty string for bracket without content', () => {
      const missed = getMissedPunch('[]');
      expect(missed).toBe('');
    });
  });
});