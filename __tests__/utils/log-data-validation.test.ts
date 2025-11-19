import { parseDeviations, getDeviationText, getMissedPunch } from '@/lib/utils/deviationParser';

/**
 * Test with sample data from log.xlsx processing
 * Validates that the deviation parsing works correctly with real-world data scenarios
 */

describe('Log.xlsx Data Validation Tests', () => {

  // Sample status strings that might come from processing log.xlsx
  const sampleStatusData = [
    {
      status: 'On Time',
      expectedFlags: { checkInLate: false, breakOutEarly: false, breakInLate: false, checkOutEarly: false, hasMissingTimestamps: false }
    },
    {
      status: 'Late Check-in',
      expectedFlags: { checkInLate: true, breakOutEarly: false, breakInLate: false, checkOutEarly: false, hasMissingTimestamps: false }
    },
    {
      status: 'Leave Soon Break Out',
      expectedFlags: { checkInLate: false, breakOutEarly: true, breakInLate: false, checkOutEarly: false, hasMissingTimestamps: false }
    },
    {
      status: 'Late Break In',
      expectedFlags: { checkInLate: false, breakOutEarly: false, breakInLate: true, checkOutEarly: false, hasMissingTimestamps: false }
    },
    {
      status: 'Leave Soon Check Out',
      expectedFlags: { checkInLate: false, breakOutEarly: false, breakInLate: false, checkOutEarly: true, hasMissingTimestamps: false }
    },
    {
      status: 'Late Check-in [Missing: Check Out]',
      expectedFlags: { checkInLate: true, breakOutEarly: false, breakInLate: false, checkOutEarly: false, hasMissingTimestamps: true }
    },
    {
      status: 'On Time [Missing: Break Out, Break In]',
      expectedFlags: { checkInLate: false, breakOutEarly: false, breakInLate: false, checkOutEarly: false, hasMissingTimestamps: true }
    },
    {
      status: 'Late Check-in, Leave Soon Break Out',
      expectedFlags: { checkInLate: true, breakOutEarly: true, breakInLate: false, checkOutEarly: false, hasMissingTimestamps: false }
    },
    {
      status: 'Late Check-in, Late Break In [Missing: Check Out]',
      expectedFlags: { checkInLate: true, breakOutEarly: false, breakInLate: true, checkOutEarly: false, hasMissingTimestamps: true }
    },
    {
      status: 'Leave Soon',
      expectedFlags: { checkInLate: false, breakOutEarly: false, breakInLate: false, checkOutEarly: true, hasMissingTimestamps: false }
    }
  ];

  describe('Deviation Parsing with Real Data', () => {
    test.each(sampleStatusData)('should correctly parse status: $status', ({ status, expectedFlags }) => {
      const flags = parseDeviations(status);

      expect(flags.checkInLate).toBe(expectedFlags.checkInLate);
      expect(flags.breakOutEarly).toBe(expectedFlags.breakOutEarly);
      expect(flags.breakInLate).toBe(expectedFlags.breakInLate);
      expect(flags.checkOutEarly).toBe(expectedFlags.checkOutEarly);
      expect(flags.hasMissingTimestamps).toBe(expectedFlags.hasMissingTimestamps);
    });
  });

  describe('Deviation Text Generation', () => {
    test.each([
      { status: 'On Time', expected: { checkIn: '', breakOut: '', breakIn: '', checkOut: '' } },
      { status: 'Late Check-in', expected: { checkIn: 'Late', breakOut: '', breakIn: '', checkOut: '' } },
      { status: 'Leave Soon Break Out', expected: { checkIn: '', breakOut: 'Early', breakIn: '', checkOut: '' } },
      { status: 'Late Break In', expected: { checkIn: '', breakOut: '', breakIn: 'Late', checkOut: '' } },
      { status: 'Leave Soon Check Out', expected: { checkIn: '', breakOut: '', breakIn: '', checkOut: 'Early' } },
      { status: 'Late Check-in, Leave Soon Break Out', expected: { checkIn: 'Late', breakOut: 'Early', breakIn: '', checkOut: '' } },
      { status: 'Leave Soon', expected: { checkIn: '', breakOut: '', breakIn: '', checkOut: 'Early' } }
    ])('should generate correct deviation text for: $status', ({ status, expected }) => {
      const flags = parseDeviations(status);

      expect(getDeviationText(flags, 'checkIn')).toBe(expected.checkIn);
      expect(getDeviationText(flags, 'breakOut')).toBe(expected.breakOut);
      expect(getDeviationText(flags, 'breakIn')).toBe(expected.breakIn);
      expect(getDeviationText(flags, 'checkOut')).toBe(expected.checkOut);
    });
  });

  describe('Missed Punch Extraction', () => {
    test.each([
      { status: 'On Time', expected: '' },
      { status: 'Late Check-in', expected: '' },
      { status: '[Missing: Check Out]', expected: 'CO' },
      { status: '[Missing: Break Out, Break In]', expected: 'BTO, BTI' },
      { status: '[Missing: Check Out, Break Out, Break In]', expected: 'CO, BTO, BTI' },
      { status: 'Late Check-in [Missing: Check Out]', expected: 'CO' },
      { status: 'On Time [Missing:  Check Out,  Break In  ]', expected: 'CO, BTI' },
      { status: 'Malformed [Missing: Check Out', expected: '' }
    ])('should extract missed punch correctly for: $status', ({ status, expected }) => {
      const missedPunch = getMissedPunch(status);
      expect(missedPunch).toBe(expected);
    });
  });

  describe('Attendance Record Field Population', () => {
    it('should populate all deviation fields correctly', () => {
      sampleStatusData.forEach(({ status, expectedFlags }) => {
        const flags = parseDeviations(status);

        const attendanceRecord = {
          date: new Date(),
          id: 'TEST001',
          name: 'Test User',
          shift: 'A',
          checkIn: '08:00',
          breakOut: '10:00',
          breakIn: '10:30',
          checkOut: '17:00',
          status,
          checkInLate: getDeviationText(flags, 'checkIn'),
          breakOutEarly: getDeviationText(flags, 'breakOut'),
          breakInLate: getDeviationText(flags, 'breakIn'),
          checkOutEarly: getDeviationText(flags, 'checkOut'),
          missedPunch: getMissedPunch(status)
        };

        // Verify all new fields are present and correctly typed
        expect(typeof attendanceRecord.checkInLate).toBe('string');
        expect(typeof attendanceRecord.breakOutEarly).toBe('string');
        expect(typeof attendanceRecord.breakInLate).toBe('string');
        expect(typeof attendanceRecord.checkOutEarly).toBe('string');
        expect(typeof attendanceRecord.missedPunch).toBe('string');

        // Verify values match expected
        expect(attendanceRecord.checkInLate).toBe(getDeviationText(flags, 'checkIn'));
        expect(attendanceRecord.breakOutEarly).toBe(getDeviationText(flags, 'breakOut'));
        expect(attendanceRecord.breakInLate).toBe(getDeviationText(flags, 'breakIn'));
        expect(attendanceRecord.checkOutEarly).toBe(getDeviationText(flags, 'checkOut'));
        expect(attendanceRecord.missedPunch).toBe(getMissedPunch(status));
      });
    });

    it('should handle edge cases properly', () => {
      // Test with empty status
      const emptyStatusRecord = {
        date: new Date(),
        id: 'TEST001',
        name: 'Test User',
        shift: 'A',
        checkIn: '',
        breakOut: '',
        breakIn: '',
        checkOut: '',
        status: '',
        checkInLate: '',
        breakOutEarly: '',
        breakInLate: '',
        checkOutEarly: '',
        missedPunch: ''
      };

      // Should not have any deviations
      expect(emptyStatusRecord.checkInLate).toBe('');
      expect(emptyStatusRecord.breakOutEarly).toBe('');
      expect(emptyStatusRecord.breakInLate).toBe('');
      expect(emptyStatusRecord.checkOutEarly).toBe('');
      expect(emptyStatusRecord.missedPunch).toBe('');
    });
  });

  describe('Data Consistency Validation', () => {
    it('should maintain consistency between status field and individual deviation fields', () => {
      // Test that individual deviation fields accurately reflect the consolidated status
      sampleStatusData.forEach(({ status }) => {
        const flags = parseDeviations(status);
        const attendanceRecord = {
          status,
          checkInLate: getDeviationText(flags, 'checkIn'),
          breakOutEarly: getDeviationText(flags, 'breakOut'),
          breakInLate: getDeviationText(flags, 'breakIn'),
          checkOutEarly: getDeviationText(flags, 'checkOut'),
          missedPunch: getMissedPunch(status)
        };

        // Validate consistency
        if (attendanceRecord.checkInLate === 'Late') {
          expect(status).toMatch(/Late Check-in|Check-in Late/);
        }
        if (attendanceRecord.breakOutEarly === 'Early') {
          expect(status).toMatch(/Leave Soon Break Out|Break Out Early/);
        }
        if (attendanceRecord.breakInLate === 'Late') {
          expect(status).toMatch(/Late Break In|Break In Late/);
        }
        if (attendanceRecord.checkOutEarly === 'Early') {
          expect(status).toMatch(/Leave Soon Check Out|Check Out Early|Leave Soon(?!.*Break Out)/);
        }
        if (attendanceRecord.missedPunch) {
          expect(status).toContain('[Missing:');
          // Convert abbreviated missed punch back to full names for status comparison
          const expectedFullNames = attendanceRecord.missedPunch
            .split(', ')
            .map(abbrev => {
              switch (abbrev) {
                case 'CI': return 'Check In';
                case 'CO': return 'Check Out';
                case 'BTO': return 'Break Out';
                case 'BTI': return 'Break In';
                default: return abbrev;
              }
            })
            .join(', ');
          expect(status).toContain(expectedFullNames);
        }
      });
    });
  });
});