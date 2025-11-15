# Phase 2: Implement Streaming Excel Parser

**Date:** 2025-11-15
**Phase ID:** 251115-1132-02
**Status:** Draft
**Estimated Duration:** 8 hours
**Dependencies:** Phase 1 completion

## Objectives

Replace synchronous Excel loading with streaming parser that processes files row-by-row, implementing batch processing and memory-efficient data structures.

## Current Issues to Address

### Synchronous Excel Loading Problems
```typescript
// CURRENT: Lines 164-165 in route.ts - Blocks entire process
const workbook = new ExcelJS.Workbook();
await workbook.xlsx.load(buffer);
```

### Full JSON Conversion Issues
```typescript
// CURRENT: Lines 173-191 - Creates huge memory footprint
worksheet.eachRow((row, rowNumber) => {
  rawData.push(rowData); // Loads ALL rows into memory
});
```

## Implementation Strategy

### Streaming Excel Parser Design

1. **Row-by-Row Processing**
   - Process Excel rows as streams, not entire workbook
   - Eliminate full JSON array creation
   - Process batches of rows incrementally

2. **Batch Processing Architecture**
   - Process 1000 rows per batch
   - Release memory between batches
   - Maintain processing state across batches

3. **Memory-Efficient Data Structures**
   - Use streams instead of arrays
   - Implement garbage collection hints
   - Minimize object creation

### New Architecture Overview

```
[File Upload] → [Stream Excel Parser] → [Batch Processor (1000 rows)] → [Incremental Results] → [Progress Updates]
```

## Implementation Plan

### Step 1: Research Streaming Excel Libraries

**Primary Option: ExcelJS with Streaming**
```typescript
import ExcelJS from 'exceljs';

const workbook = new ExcelJS.Workbook();
const worksheet = workbook.xlsx.createReadStream();
```

**Alternative Options:**
- `xlsx` library with streaming support
- `node-xlsx` with custom streaming parser
- Custom parser using `node-unzip` and XML parsing

**Evaluation Criteria:**
- Memory efficiency
- Processing speed
- API compatibility
- Error handling

### Step 2: Implement Streaming Parser Interface

**Create new streaming parser utility:**
```typescript
// /lib/utils/streamingExcelParser.ts

interface ExcelRow {
  [key: string]: unknown;
}

interface ParseOptions {
  batchSize: number;
  onProgress?: (processed: number, total: number) => void;
  onBatch?: (batch: ExcelRow[], batchNumber: number) => Promise<void>;
}

interface StreamResult {
  totalRows: number;
  processedRows: number;
  errors: string[];
  warnings: string[];
}

export async function parseExcelStream(
  buffer: ArrayBuffer,
  options: ParseOptions
): Promise<StreamResult>
```

### Step 3: Implement Batch Processing Infrastructure

**Batch Processor Interface:**
```typescript
// /lib/utils/batchProcessor.ts

interface BatchProcessor<T, R> {
  processBatch(batch: T[]): Promise<R[]>;
  combineResults(results: R[][]): R;
}

export class SwipeRecordBatchProcessor implements BatchProcessor<ExcelRow, SwipeRecord[]> {
  constructor(
    private config: {
      statusFilter: string[];
      allowedUsers: Set<string>;
      batchSize: number;
    }
  ) {}

  async processBatch(batch: ExcelRow[]): Promise<SwipeRecord[]> {
    // Process batch of Excel rows to SwipeRecords
    // Apply filtering and validation
    // Return processed records
  }

  combineResults(batchResults: SwipeRecord[][]): SwipeRecord[] {
    // Combine results from all batches
    // Maintain order and integrity
  }
}
```

### Step 4: Update Main Processor Route

**Replace synchronous processing with streaming:**

```typescript
// UPDATED /app/api/v1/processor/route.ts

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // Security validations (unchanged)
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File too large' }, { status: 400 });
    }

    // Read file buffer
    const buffer = await file.arrayBuffer();

    // Load configurations (unchanged)
    let combinedConfig;
    try {
      combinedConfig = loadCombinedConfig();
    } catch (error) {
      return NextResponse.json({ error: 'Configuration loading failed' }, { status: 500 });
    }

    // Parse configuration (unchanged)
    const configStr = formData.get('config') as string;
    const config: Partial<RuleConfig> = configStr ? JSON.parse(configStr) : {};

    // Set defaults (unchanged)
    const burstThresholdMinutes = config.burstThresholdMinutes ||
      (combinedConfig.rules.burst_threshold_minutes as number) || 2;
    const statusFilter = config.statusFilter ||
      (combinedConfig.rules.status_filter as string[]) || ['Success'];

    // Create user mapper and allowed users (unchanged)
    const mapUser = createUserMapper(combinedConfig.users);
    const allowedUsers = new Set([
      ...Object.keys(combinedConfig.users.operators || {}),
      ...(combinedConfig.rules.operators?.valid_users || [])
    ]);

    // NEW: Streaming Excel parsing
    const parser = new StreamingExcelParser({
      batchSize: 1000,
      onProgress: (processed, total) => {
        // Log progress for monitoring
        console.log(`Processing progress: ${processed}/${total} rows`);
      }
    });

    const swipeProcessor = new SwipeRecordBatchProcessor({
      statusFilter,
      allowedUsers,
      batchSize: 1000
    });

    // Parse Excel file with streaming
    const parseResult = await parser.parseExcelBuffer(buffer, {
      batchSize: 1000,
      onBatch: async (batch, batchNumber) => {
        // Process each batch as it's read
        return await swipeProcessor.processBatch(batch);
      }
    });

    // Get all processed swipe records
    const swipes = swipeProcessor.combineResults();

    if (swipes.length === 0) {
      return NextResponse.json({
        error: 'No valid records found after filtering',
        details: {
          totalRows: parseResult.totalRows,
          processedRows: parseResult.processedRows,
          errors: parseResult.errors.slice(0, 10),
        },
      }, { status: 400 });
    }

    // Continue with existing burst/shift/break detection
    // (This can be further optimized in Phase 3)

    const burstDetector = new BurstDetector({ thresholdMinutes: burstThresholdMinutes });
    const bursts = burstDetector.detectBursts(swipes);

    // ... rest of existing processing logic

  } catch (error) {
    console.error('Processing error:', error);
    return NextResponse.json({
      error: 'Processing failed',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
```

### Step 5: Implement Streaming Excel Parser

**Complete streaming implementation:**
```typescript
// /lib/utils/streamingExcelParser.ts

import ExcelJS from 'exceljs';
import type { ExcelRow, ParseOptions, StreamResult } from './types';

export class StreamingExcelParser {
  constructor(private options: ParseOptions = { batchSize: 1000 }) {}

  async parseExcelBuffer(
    buffer: ArrayBuffer,
    options: ParseOptions = this.options
  ): Promise<StreamResult> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);

    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      throw new Error('No sheets found in Excel file');
    }

    return await this.parseWorksheet(worksheet, options);
  }

  private async parseWorksheet(
    worksheet: ExcelJS.Worksheet,
    options: ParseOptions
  ): Promise<StreamResult> {
    const result: StreamResult = {
      totalRows: 0,
      processedRows: 0,
      errors: [],
      warnings: []
    };

    let headerRow: string[] = [];
    let batch: ExcelRow[] = [];
    let batchNumber = 0;

    // Get total row count for progress tracking
    result.totalRows = worksheet.rowCount - 1; // Exclude header row

    await new Promise<void>((resolve, reject) => {
      worksheet.eachRow((row, rowNumber) => {
        try {
          if (rowNumber === 1) {
            // Process header row
            headerRow = row.values as string[];
            headerRow.shift(); // Remove first empty element
            return;
          }

          // Process data row
          const rowData: ExcelRow = {};
          row.eachCell((cell, colNumber) => {
            const header = headerRow[colNumber - 1];
            if (header) {
              rowData[header] = cell.value;
            }
          });

          batch.push(rowData);
          result.processedRows++;

          // Process batch when it reaches the target size
          if (batch.length >= options.batchSize) {
            this.processBatch(batch, batchNumber++, options);
            batch = []; // Clear batch for garbage collection

            // Report progress
            if (options.onProgress) {
              options.onProgress(result.processedRows, result.totalRows);
            }
          }
        } catch (error) {
          const errorMsg = `Row ${rowNumber}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          result.errors.push(errorMsg);
        }
      });

      // Process remaining rows in the last batch
      if (batch.length > 0) {
        this.processBatch(batch, batchNumber++, options);
      }

      resolve();
    });

    return result;
  }

  private async processBatch(
    batch: ExcelRow[],
    batchNumber: number,
    options: ParseOptions
  ): Promise<void> {
    if (options.onBatch) {
      await options.onBatch(batch, batchNumber);
    }
  }
}
```

## Memory Optimization Strategies

### 1. Garbage Collection Hints
```typescript
// Force garbage collection between batches
if (global.gc) {
  global.gc(); // Available with --expose-gc flag
}
```

### 2. Memory-Efficient Data Structures
```typescript
// Use Map instead of object for better memory management
const swipeMap = new Map<string, SwipeRecord>();

// Clear processed data structures
batch.length = 0; // Clear array for reuse
```

### 3. Streaming Validation
```typescript
// Validate rows as they're processed, not after
const validateRow = (row: ExcelRow): boolean => {
  const requiredFields = ['ID', 'Name', 'Date', 'Time', 'Status'];
  return requiredFields.every(field => row[field] != null);
};
```

## Error Handling and Validation

### Enhanced Error Handling
```typescript
interface ParseError {
  row: number;
  column: string;
  value: unknown;
  error: string;
}

interface ValidationWarning {
  row: number;
  field: string;
  value: unknown;
  warning: string;
}
```

### Progressive Validation
```typescript
const validateProgressively = (batch: ExcelRow[]): {
  validRows: ExcelRow[];
  errors: ParseError[];
  warnings: ValidationWarning[];
} => {
  // Validate each row in the batch
  // Separate valid from invalid rows
  // Collect detailed error information
};
```

## Testing Implementation

### Unit Tests for Streaming Parser
```typescript
// /tests/lib/utils/streamingExcelParser.test.ts

describe('StreamingExcelParser', () => {
  test('processes large files without memory issues', async () => {
    const largeBuffer = createLargeTestFile(50000); // 50K rows
    const parser = new StreamingExcelParser({ batchSize: 1000 });

    const result = await parser.parseExcelBuffer(largeBuffer);

    expect(result.processedRows).toBe(50000);
    expect(result.errors).toHaveLength(0);
  });

  test('handles corrupted rows gracefully', async () => {
    const corruptedBuffer = createCorruptedTestFile();
    const parser = new StreamingExcelParser();

    const result = await parser.parseExcelBuffer(corruptedBuffer);

    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.processedRows).toBeGreaterThan(0);
  });
});
```

### Performance Tests
```typescript
// Performance benchmarking
const benchmarkStreamingParser = async () => {
  const files = [
    { name: 'small', rows: 1000 },
    { name: 'medium', rows: 10000 },
    { name: 'large', rows: 50000 }
  ];

  for (const file of files) {
    const buffer = createTestFile(file.rows);
    const startTime = Date.now();
    const memoryBefore = process.memoryUsage();

    const result = await parser.parseExcelBuffer(buffer);

    const memoryAfter = process.memoryUsage();
    const processingTime = Date.now() - startTime;

    console.log(`${file.name} file:`, {
      rows: file.rows,
      time: processingTime,
      memory: memoryAfter.heapUsed - memoryBefore.heapUsed,
      throughput: file.rows / (processingTime / 1000)
    });
  }
};
```

## Migration Strategy

### Backward Compatibility
1. Maintain existing API contract
2. Add streaming as enhancement, not replacement
3. Support both parsing methods initially
4. Gradual deprecation of old method

### Feature Flags
```typescript
const useStreamingParser = process.env.STREAMING_PARSER === 'true';

if (useStreamingParser) {
  // Use new streaming implementation
  const result = await streamingParser.parseExcelBuffer(buffer);
} else {
  // Fall back to original implementation
  const result = await parseExcelSync(buffer);
}
```

## Deliverables

1. **Streaming Excel Parser** (`/lib/utils/streamingExcelParser.ts`)
2. **Batch Processor** (`/lib/utils/batchProcessor.ts`)
3. **Updated Processor Route** with streaming integration
4. **Comprehensive Test Suite** for streaming functionality
5. **Performance Benchmarks** showing improvement metrics

## Success Criteria

1. **Memory Efficiency**: Process 50K rows with <200MB peak memory
2. **Processing Speed**: Maintain or improve current processing throughput
3. **Progress Tracking**: Provide real-time progress updates
4. **Error Handling**: Graceful handling of corrupted data
5. **Backward Compatibility**: No breaking changes to existing API

## Next Steps

1. Implement streaming Excel parser
2. Create batch processing infrastructure
3. Update main processor route
4. Add comprehensive testing
5. Performance validation and optimization

---

**This phase transforms the processor from synchronous to streaming architecture, enabling efficient handling of large files and providing foundation for further optimizations in Phase 3.**