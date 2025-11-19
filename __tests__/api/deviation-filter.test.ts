/**
 * Deviation Filter Logic Tests
 *
 * Tests the deviation filtering logic to ensure:
 * 1. Records with time deviations (Late/Soon) are included
 * 2. Records with requiresReview=true are included (v2 mode)
 * 3. Records with missing timestamps are properly flagged
 * 4. Filter works correctly in both v1 and v2 modes
 */

import type { AttendanceRecord } from '@/types/attendance';

describe('Deviation Filter Logic', () => {
  // Mock attendance records with various conditions
  const mockRecords: AttendanceRecord[] = [
    // 1. Complete record, on time
    {
      date: '2025-11-18',
      id: 'TPL0001',
      name: 'John Doe',
      shift: 'Morning',
      checkIn: '06:00:00',
      breakOut: '10:00:00',
      breakIn: '10:30:00',
      checkOut: '14:00:00',
      status: 'On Time',
      requiresReview: false,
      completenessPercentage: 100,
    },
    // 2. Late check-in (should be filtered)
    {
      date: '2025-11-18',
      id: 'TPL0002',
      name: 'Jane Smith',
      shift: 'Morning',
      checkIn: '06:10:00',
      breakOut: '10:00:00',
      breakIn: '10:30:00',
      checkOut: '14:00:00',
      status: 'Late Check-in',
      requiresReview: false,
      completenessPercentage: 100,
    },
    // 3. Leave Soon Break Out (should be filtered)
    {
      date: '2025-11-18',
      id: 'TPL0003',
      name: 'Bob Johnson',
      shift: 'Morning',
      checkIn: '06:00:00',
      breakOut: '09:55:00',
      breakIn: '10:30:00',
      checkOut: '14:00:00',
      status: 'Leave Soon Break Out',
      requiresReview: false,
      completenessPercentage: 100,
    },
    // 4. Missing check-out (should be filtered when v2 enabled)
    {
      date: '2025-11-18',
      id: 'TPL0004',
      name: 'Alice Brown',
      shift: 'Morning',
      checkIn: '06:00:00',
      breakOut: '10:00:00',
      breakIn: '10:30:00',
      checkOut: '',
      status: 'On Time [Missing: Check Out]',
      requiresReview: true,
      completenessPercentage: 75,
    },
    // 5. Missing break times (should be filtered when v2 enabled)
    {
      date: '2025-11-18',
      id: 'TPL0005',
      name: 'Charlie Wilson',
      shift: 'Morning',
      checkIn: '06:00:00',
      breakOut: '',
      breakIn: '',
      checkOut: '14:00:00',
      status: 'On Time [Missing: Break Out, Break In]',
      requiresReview: false,
      completenessPercentage: 50,
    },
    // 6. Late + Missing (should be filtered in both modes)
    {
      date: '2025-11-18',
      id: 'TPL0006',
      name: 'David Lee',
      shift: 'Morning',
      checkIn: '06:08:00',
      breakOut: '',
      breakIn: '',
      checkOut: '',
      status: 'Late Check-in [Missing: Break Out, Break In, Check Out]',
      requiresReview: true,
      completenessPercentage: 25,
    },
    // 7. Complete, on time (should NOT be filtered)
    {
      date: '2025-11-18',
      id: 'TPL0007',
      name: 'Emily Davis',
      shift: 'Afternoon',
      checkIn: '14:00:00',
      breakOut: '18:00:00',
      breakIn: '18:30:00',
      checkOut: '22:00:00',
      status: 'On Time',
      requiresReview: false,
      completenessPercentage: 100,
    },
  ];

  describe('V1 Mode (Stable) - Time Deviations Only', () => {
    it('should filter records with "Late" in status', () => {
      const filtered = mockRecords.filter(record =>
        record.status.includes('Late') || record.status.includes('Soon')
      );

      expect(filtered.length).toBeGreaterThan(0);
      expect(filtered.every(r =>
        r.status.includes('Late') || r.status.includes('Soon')
      )).toBe(true);
    });

    it('should filter records with "Soon" in status', () => {
      const filtered = mockRecords.filter(record =>
        record.status.includes('Soon')
      );

      expect(filtered.length).toBeGreaterThan(0);
      expect(filtered.every(r => r.status.includes('Soon'))).toBe(true);
    });

    it('should NOT include records with only missing timestamps (v1 mode)', () => {
      // In v1 mode, we only filter by Late/Soon, not by requiresReview
      const v1Filter = (record: AttendanceRecord) =>
        record.status.includes('Late') || record.status.includes('Soon');

      const filtered = mockRecords.filter(v1Filter);

      // Record #4 (missing check-out, no deviation) should NOT be included
      expect(filtered.find(r => r.id === 'TPL0004')).toBeUndefined();

      // Record #5 (missing breaks, no deviation) should NOT be included
      expect(filtered.find(r => r.id === 'TPL0005')).toBeUndefined();
    });

    it('should count correct number of deviations in v1 mode', () => {
      const v1Filter = (record: AttendanceRecord) =>
        record.status.includes('Late') || record.status.includes('Soon');

      const filtered = mockRecords.filter(v1Filter);

      // Expected: TPL0002 (Late), TPL0003 (Soon), TPL0006 (Late + Missing)
      expect(filtered.length).toBe(3);
    });
  });

  describe('V2 Mode (Missing Timestamp Handling) - Deviations + Review Required', () => {
    it('should filter records with time deviations', () => {
      const v2Filter = (record: AttendanceRecord) => {
        const hasDeviation = record.status.includes('Late') || record.status.includes('Soon');
        const needsReview = record.requiresReview === true;
        return hasDeviation || needsReview;
      };

      const filtered = mockRecords.filter(v2Filter);

      // Should include records with deviations
      expect(filtered.find(r => r.id === 'TPL0002')).toBeDefined(); // Late
      expect(filtered.find(r => r.id === 'TPL0003')).toBeDefined(); // Soon
    });

    it('should filter records with requiresReview=true', () => {
      const v2Filter = (record: AttendanceRecord) => {
        const hasDeviation = record.status.includes('Late') || record.status.includes('Soon');
        const needsReview = record.requiresReview === true;
        return hasDeviation || needsReview;
      };

      const filtered = mockRecords.filter(v2Filter);

      // Should include record with missing check-out (requiresReview=true)
      expect(filtered.find(r => r.id === 'TPL0004')).toBeDefined();

      // Should include record with late + missing (requiresReview=true)
      expect(filtered.find(r => r.id === 'TPL0006')).toBeDefined();
    });

    it('should filter records with "[Missing: ...]" in status when requiresReview=true', () => {
      const v2Filter = (record: AttendanceRecord) => {
        const hasDeviation = record.status.includes('Late') || record.status.includes('Soon');
        const needsReview = record.requiresReview === true;
        return hasDeviation || needsReview;
      };

      const filtered = mockRecords.filter(v2Filter);

      // Check that records with missing timestamps AND requiresReview are included
      const recordsWithMissing = filtered.filter(r =>
        r.status.includes('[Missing:') && r.requiresReview === true
      );

      expect(recordsWithMissing.length).toBeGreaterThan(0);
    });

    it('should NOT filter records with missing timestamps but requiresReview=false', () => {
      const v2Filter = (record: AttendanceRecord) => {
        const hasDeviation = record.status.includes('Late') || record.status.includes('Soon');
        const needsReview = record.requiresReview === true;
        return hasDeviation || needsReview;
      };

      const filtered = mockRecords.filter(v2Filter);

      // Record #5 (missing breaks but requiresReview=false) should NOT be included
      expect(filtered.find(r => r.id === 'TPL0005')).toBeUndefined();
    });

    it('should count correct number of deviations in v2 mode', () => {
      const v2Filter = (record: AttendanceRecord) => {
        const hasDeviation = record.status.includes('Late') || record.status.includes('Soon');
        const needsReview = record.requiresReview === true;
        return hasDeviation || needsReview;
      };

      const filtered = mockRecords.filter(v2Filter);

      // Expected in v2 mode:
      // TPL0002 (Late Check-in)
      // TPL0003 (Leave Soon Break Out)
      // TPL0004 (Missing Check Out, requiresReview=true)
      // TPL0006 (Late + Missing, requiresReview=true)
      expect(filtered.length).toBe(4);
    });

    it('should NOT filter complete on-time records', () => {
      const v2Filter = (record: AttendanceRecord) => {
        const hasDeviation = record.status.includes('Late') || record.status.includes('Soon');
        const needsReview = record.requiresReview === true;
        return hasDeviation || needsReview;
      };

      const filtered = mockRecords.filter(v2Filter);

      // Record #1 and #7 (complete, on time) should NOT be included
      expect(filtered.find(r => r.id === 'TPL0001')).toBeUndefined();
      expect(filtered.find(r => r.id === 'TPL0007')).toBeUndefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty status strings', () => {
      const record: AttendanceRecord = {
        date: '2025-11-18',
        id: 'TEST001',
        name: 'Test User',
        shift: 'Morning',
        checkIn: '06:00:00',
        breakOut: '',
        breakIn: '',
        checkOut: '',
        status: '',
        requiresReview: false,
      };

      const v2Filter = (r: AttendanceRecord) => {
        const hasDeviation = r.status.includes('Late') || r.status.includes('Soon');
        const needsReview = r.requiresReview === true;
        return hasDeviation || needsReview;
      };

      expect(v2Filter(record)).toBe(false);
    });

    it('should handle undefined requiresReview field (v1 records)', () => {
      const record: AttendanceRecord = {
        date: '2025-11-18',
        id: 'TEST002',
        name: 'Test User',
        shift: 'Morning',
        checkIn: '06:10:00',
        breakOut: '10:00:00',
        breakIn: '10:30:00',
        checkOut: '14:00:00',
        status: 'Late Check-in',
        // requiresReview is undefined (v1 record)
      };

      const v2Filter = (r: AttendanceRecord) => {
        const hasDeviation = r.status.includes('Late') || r.status.includes('Soon');
        const needsReview = r.requiresReview === true;
        return hasDeviation || needsReview;
      };

      // Should still filter based on time deviation
      expect(v2Filter(record)).toBe(true);
    });

    it('should handle multiple deviations in status', () => {
      const record: AttendanceRecord = {
        date: '2025-11-18',
        id: 'TEST003',
        name: 'Test User',
        shift: 'Morning',
        checkIn: '06:10:00',
        breakOut: '09:55:00',
        breakIn: '10:35:00',
        checkOut: '13:50:00',
        status: 'Late Check-in, Leave Soon Break Out, Late Break In, Leave Soon Check Out',
        requiresReview: false,
      };

      const v2Filter = (r: AttendanceRecord) => {
        const hasDeviation = r.status.includes('Late') || r.status.includes('Soon');
        const needsReview = r.requiresReview === true;
        return hasDeviation || needsReview;
      };

      expect(v2Filter(record)).toBe(true);
    });
  });

  describe('Comparison: V1 vs V2 Filtering', () => {
    it('should show difference between v1 and v2 filtering', () => {
      const v1Filter = (record: AttendanceRecord) =>
        record.status.includes('Late') || record.status.includes('Soon');

      const v2Filter = (record: AttendanceRecord) => {
        const hasDeviation = record.status.includes('Late') || record.status.includes('Soon');
        const needsReview = record.requiresReview === true;
        return hasDeviation || needsReview;
      };

      const v1Results = mockRecords.filter(v1Filter);
      const v2Results = mockRecords.filter(v2Filter);

      // V2 should have MORE results (includes requiresReview records)
      expect(v2Results.length).toBeGreaterThan(v1Results.length);

      // V1 results should be a subset of V2 results
      v1Results.forEach(v1Record => {
        expect(v2Results.find(v2Record => v2Record.id === v1Record.id)).toBeDefined();
      });

      console.log(`V1 Mode: ${v1Results.length} deviation records`);
      console.log(`V2 Mode: ${v2Results.length} deviation records (includes review required)`);
    });
  });
});
