# Phase 3: Optimize Processing Pipeline

**Date:** 2025-11-15
**Phase ID:** 251115-1132-03
**Status:** Draft
**Estimated Duration:** 12 hours
**Dependencies:** Phase 2 completion (Streaming Parser)

## Objectives

Transform the synchronous processing pipeline into an asynchronous, batch-optimized system with real-time progress tracking and memory-efficient algorithms.

## Current Pipeline Issues

### Synchronous Processing Bottlenecks
```typescript
// CURRENT: Lines 288-334 in route.ts - Blocks event loop
const bursts = burstDetector.detectBursts(swipes);           // O(n²) worst case
const shiftInstances = shiftDetector.detectShifts(bursts);   // Complex time calculations
for (const shift of shiftInstances) {                       // Sequential processing
  const breakTimes = breakDetector.detectBreak(shift.bursts, shiftConfig);
  // ... create attendance records
}
```

### Performance Problems
1. **No Progress Updates**: Users see "pending" status throughout processing
2. **Memory Inefficient**: All data structures loaded simultaneously
3. **CPU Intensive**: Complex nested loops block event loop
4. **No Cancellation**: Cannot interrupt long-running processes
5. **No Progress Tracking**: No granularity in processing feedback

## Optimized Pipeline Architecture

### New Async Pipeline Design
```
[Streaming Parser] → [Async Burst Detection] → [Async Shift Detection] → [Async Break Detection] → [Progress Updates]
       ↓                    ↓                        ↓                        ↓                     ↓
   Batch 1-1000        Batch Processing        Shift Grouping          Break Detection       Real-time Feedback
   Batch 1001-2000     with Progress           with Caching            with Optimization     WebSocket/SSE
   Batch 2001-3000     Updates                 Incremental             Memory Management     Progress % Complete
```

### Key Optimizations
1. **Batch Processing**: Process data in configurable chunks (1000 records default)
2. **Async Algorithms**: Convert CPU-intensive operations to async with yield points
3. **Progress Tracking**: Real-time progress through WebSocket or Server-Sent Events
4. **Memory Management**: Release processed data immediately
5. **Cancellation Support**: Allow process interruption

## Implementation Plan

### Step 1: Create Async Processing Framework

**Async Pipeline Manager:**
```typescript
// /lib/processors/asyncPipelineManager.ts

interface ProcessingProgress {
  stage: 'parsing' | 'burst-detection' | 'shift-detection' | 'break-detection' | 'complete';
  progress: number; // 0-100
  processed: number;
  total: number;
  currentBatch?: number;
  totalBatches?: number;
  estimatedTimeRemaining?: number;
}

interface PipelineOptions {
  batchSize: number;
  progressCallback?: (progress: ProcessingProgress) => void;
  cancellationToken?: { cancelled: boolean };
}

export class AsyncPipelineManager {
  constructor(private options: PipelineOptions) {}

  async processSwipes(swipes: SwipeRecord[]): Promise<ProcessingResult> {
    const stages = [
      this.processBurstDetection,
      this.processShiftDetection,
      this.processBreakDetection
    ];

    let progress = 0;
    const stageProgress = 100 / stages.length;

    for (let i = 0; i < stages.length; i++) {
      if (this.options.cancellationToken?.cancelled) {
        throw new Error('Processing cancelled');
      }

      const stageResult = await stages[i].call(this, swipes);
      progress += stageProgress;

      this.options.progressCallback?.({
        stage: this.getStageName(i),
        progress,
        processed: swipes.length,
        total: swipes.length
      });
    }

    return this.generateFinalResult();
  }

  private async processBurstDetection(swipes: SwipeRecord[]): Promise<Burst[]> {
    const burstDetector = new AsyncBurstDetector();
    return await burstDetector.detectBursts(swipes, {
      batchSize: this.options.batchSize,
      progressCallback: (batchProgress) => {
        this.options.progressCallback?.({
          stage: 'burst-detection',
          progress: 0 + (batchProgress * (100 / 3)), // 33% of total progress
          processed: batchProgress.processed,
          total: batchProgress.total
        });
      }
    });
  }

  private async processShiftDetection(bursts: Burst[]): Promise<ShiftInstance[]> {
    // Similar async implementation for shift detection
  }

  private async processBreakDetection(shifts: ShiftInstance[]): Promise<AttendanceRecord[]> {
    // Similar async implementation for break detection
  }
}
```

### Step 2: Optimize Burst Detection Algorithm

**Current O(n²) Algorithm Issues:**
```typescript
// CURRENT: BurstDetector.ts - O(n²) worst case
detectBursts(swipes: SwipeRecord[]): Burst[] {
  // Nested loops for burst detection
  for (let i = 0; i < swipes.length; i++) {
    for (let j = i + 1; j < swipes.length; j++) {
      // O(n²) time complexity
    }
  }
}
```

**Optimized Async Burst Detection:**
```typescript
// /lib/processors/asyncBurstDetector.ts

export class AsyncBurstDetector {
  async detectBursts(
    swipes: SwipeRecord[],
    options: {
      batchSize: number;
      progressCallback?: (progress: { processed: number; total: number }) => void;
    }
  ): Promise<Burst[]> {
    const { batchSize, progressCallback } = options;
    const bursts: Burst[] = [];

    // Group swipes by user for more efficient processing
    const userGroups = this.groupSwipesByUser(swipes);

    let totalProcessed = 0;
    const totalSwipes = swipes.length;

    // Process each user's swipes independently
    for (const [userName, userSwipes] of userGroups.entries()) {
      if (this.shouldCancel()) {
        throw new Error('Burst detection cancelled');
      }

      // Sort swipes by timestamp (optimization)
      userSwipes.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

      // Detect bursts for this user (O(n) per user)
      const userBursts = this.detectUserBursts(userSwipes);
      bursts.push(...userBursts);

      totalProcessed += userSwipes.length;

      // Yield control and report progress
      if (totalProcessed % batchSize === 0) {
        await this.yield();
        progressCallback?.({ processed: totalProcessed, total: totalSwipes });
      }
    }

    progressCallback?.({ processed: totalProcessed, total: totalSwipes });
    return bursts;
  }

  private groupSwipesByUser(swipes: SwipeRecord[]): Map<string, SwipeRecord[]> {
    const groups = new Map<string, SwipeRecord[]>();

    for (const swipe of swipes) {
      if (!groups.has(swipe.name)) {
        groups.set(swipe.name, []);
      }
      groups.get(swipe.name)!.push(swipe);
    }

    return groups;
  }

  private detectUserBursts(userSwipes: SwipeRecord[]): Burst[] {
    const bursts: Burst[] = [];
    let currentBurst: SwipeRecord[] = [];

    for (let i = 0; i < userSwipes.length; i++) {
      const swipe = userSwipes[i];

      if (currentBurst.length === 0) {
        currentBurst.push(swipe);
        continue;
      }

      const lastSwipe = currentBurst[currentBurst.length - 1];
      const timeDiff = swipe.timestamp.getTime() - lastSwipe.timestamp.getTime();
      const timeDiffMinutes = timeDiff / (1000 * 60);

      if (timeDiffMinutes <= 2) { // Within burst threshold
        currentBurst.push(swipe);
      } else {
        // End current burst and start new one
        bursts.push({
          id: `burst_${bursts.length + 1}`,
          swipes: [...currentBurst],
          earliestSwipe: currentBurst[0],
          latestSwipe: currentBurst[currentBurst.length - 1],
          count: currentBurst.length
        });

        currentBurst = [swipe];
      }

      // Yield control every 1000 iterations
      if (i % 1000 === 0) {
        this.yield();
      }
    }

    // Add final burst if exists
    if (currentBurst.length > 0) {
      bursts.push({
        id: `burst_${bursts.length + 1}`,
        swipes: currentBurst,
        earliestSwipe: currentBurst[0],
        latestSwipe: currentBurst[currentBurst.length - 1],
        count: currentBurst.length
      });
    }

    return bursts;
  }

  private async yield(): Promise<void> {
    return new Promise(resolve => {
      setImmediate(resolve); // Yield to event loop
    });
  }

  private shouldCancel(): boolean {
    // Check cancellation token
    return false; // Will be implemented with cancellation token
  }
}
```

### Step 3: Implement Async Shift Detection

**Optimized Shift Detection:**
```typescript
// /lib/processors/asyncShiftDetector.ts

export class AsyncShiftDetector {
  async detectShifts(
    bursts: Burst[],
    options: {
      batchSize: number;
      progressCallback?: (progress: { processed: number; total: number }) => void;
      cancellationToken?: { cancelled: boolean };
    }
  ): Promise<ShiftInstance[]> {
    const { batchSize, progressCallback, cancellationToken } = options;
    const shiftInstances: ShiftInstance[] = [];

    let processedCount = 0;
    const totalBursts = bursts.length;

    // Group bursts by user for sequential processing
    const userBurstGroups = this.groupBurstsByUser(bursts);

    for (const [userName, userBursts] of userBurstGroups.entries()) {
      if (cancellationToken?.cancelled) {
        throw new Error('Shift detection cancelled');
      }

      // Process user's bursts sequentially
      const userShifts = await this.processUserShifts(userName, userBursts);
      shiftInstances.push(...userShifts);

      processedCount += userBursts.length;

      // Report progress and yield control
      if (processedCount % batchSize === 0 || processedCount === totalBursts) {
        await this.yield();
        progressCallback?.({ processed: processedCount, total: totalBursts });
      }
    }

    return shiftInstances;
  }

  private async processUserShifts(
    userName: string,
    userBursts: Burst[]
  ): Promise<ShiftInstance[]> {
    const shifts: ShiftInstance[] = [];
    const sortedBursts = userBursts.sort((a, b) =>
      a.earliestSwipe.timestamp.getTime() - b.earliestSwipe.timestamp.getTime()
    );

    let currentShiftBursts: Burst[] = [];

    for (let i = 0; i < sortedBursts.length; i++) {
      const burst = sortedBursts[i];

      if (currentShiftBursts.length === 0) {
        // First burst for shift
        currentShiftBursts.push(burst);
        continue;
      }

      const lastBurst = currentShiftBursts[currentShiftBursts.length - 1];
      const timeGap = burst.earliestSwipe.timestamp.getTime() -
                     lastBurst.latestSwipe.timestamp.getTime();
      const timeGapHours = timeGap / (1000 * 60 * 60);

      if (timeGapHours <= 12) { // Within reasonable shift window
        currentShiftBursts.push(burst);
      } else {
        // Create shift from current bursts and start new shift
        const shiftInstance = await this.createShiftInstance(
          userName,
          currentShiftBursts
        );
        if (shiftInstance) {
          shifts.push(shiftInstance);
        }

        currentShiftBursts = [burst];
      }

      // Yield control every 100 iterations
      if (i % 100 === 0) {
        await this.yield();
      }
    }

    // Process final shift
    if (currentShiftBursts.length > 0) {
      const finalShift = await this.createShiftInstance(userName, currentShiftBursts);
      if (finalShift) {
        shifts.push(finalShift);
      }
    }

    return shifts;
  }

  private async createShiftInstance(
    userName: string,
    bursts: Burst[]
  ): Promise<ShiftInstance | null> {
    // Implement shift creation logic with async support
    // This is a simplified version of the existing algorithm

    const checkIn = bursts[0]?.earliestSwipe.timestamp;
    const checkOut = bursts[bursts.length - 1]?.latestSwipe.timestamp;

    if (!checkIn) return null;

    // Determine shift type based on check-in time
    const shiftCode = this.determineShiftCode(checkIn);
    const shiftDate = this.determineShiftDate(checkIn, shiftCode);

    return {
      id: `shift_${userName}_${shiftDate.getTime()}`,
      userName,
      shiftCode,
      shiftDate,
      checkIn,
      checkOut,
      bursts,
      duration: checkOut ? checkOut.getTime() - checkIn.getTime() : undefined
    };
  }
}
```

### Step 4: Implement Progress Tracking System

**WebSocket Progress Server:**
```typescript
// /app/api/v1/processor/progress/route.ts

import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('sessionId');

  if (!sessionId) {
    return new Response('Session ID required', { status: 400 });
  }

  // Create WebSocket connection for real-time progress
  const ws = new WebSocket(request.url.replace('http', 'ws'));

  // Register this connection for progress updates
  progressManager.registerConnection(sessionId, ws);

  return new Response('Progress tracking enabled', { status: 200 });
}
```

**Progress Manager:**
```typescript
// /lib/utils/progressManager.ts

interface ProgressSession {
  id: string;
  connections: Set<WebSocket>;
  currentProgress: ProcessingProgress;
  startTime: number;
}

export class ProgressManager {
  private sessions = new Map<string, ProgressSession>();

  registerConnection(sessionId: string, connection: WebSocket) {
    if (!this.sessions.has(sessionId)) {
      this.sessions.set(sessionId, {
        id: sessionId,
        connections: new Set(),
        currentProgress: { stage: 'parsing', progress: 0, processed: 0, total: 0 },
        startTime: Date.now()
      });
    }

    const session = this.sessions.get(sessionId)!;
    session.connections.add(connection);

    connection.send(JSON.stringify({
      type: 'progress',
      data: session.currentProgress
    }));
  }

  updateProgress(sessionId: string, progress: ProcessingProgress) {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.currentProgress = {
      ...progress,
      estimatedTimeRemaining: this.calculateETA(session)
    };

    // Broadcast to all connections
    session.connections.forEach(connection => {
      if (connection.readyState === WebSocket.OPEN) {
        connection.send(JSON.stringify({
          type: 'progress',
          data: session.currentProgress
        }));
      }
    });
  }

  private calculateETA(session: ProgressSession): number {
    const { progress, startTime } = session;
    const elapsed = Date.now() - startTime;
    const remaining = (100 - progress) * (elapsed / progress);
    return Math.round(remaining / 1000); // seconds
  }

  cleanupSession(sessionId: string) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.connections.forEach(connection => connection.close());
      this.sessions.delete(sessionId);
    }
  }
}

export const progressManager = new ProgressManager();
```

### Step 5: Update Main Processor Route

**Integrate Async Pipeline:**
```typescript
// UPDATED /app/api/v1/processor/route.ts

export async function POST(request: NextRequest) {
  try {
    // Generate unique session ID for progress tracking
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // ... existing file validation and parsing code from Phase 2 ...

    // Create cancellation token
    const cancellationToken = { cancelled: false };

    // Initialize progress tracking
    progressManager.updateProgress(sessionId, {
      stage: 'parsing',
      progress: 0,
      processed: 0,
      total: 0
    });

    // Create async pipeline manager
    const pipelineManager = new AsyncPipelineManager({
      batchSize: 1000,
      progressCallback: (progress) => {
        progressManager.updateProgress(sessionId, progress);
      },
      cancellationToken
    });

    // Process swipes with async pipeline
    const processingResult = await pipelineManager.processSwipes(swipes);

    // Update final progress
    progressManager.updateProgress(sessionId, {
      stage: 'complete',
      progress: 100,
      processed: swipes.length,
      total: swipes.length
    });

    // Return results with session ID for progress tracking
    return NextResponse.json({
      success: true,
      result: processingResult,
      sessionId,
      message: `Processed ${swipes.length} swipes successfully`
    });

  } catch (error) {
    if (error instanceof Error && error.message.includes('cancelled')) {
      return NextResponse.json({
        error: 'Processing cancelled by user',
        code: 'CANCELLED'
      }, { status: 200 });
    }

    console.error('Processing error:', error);
    return NextResponse.json({
      error: 'Processing failed',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  } finally {
    // Cleanup progress session after delay
    setTimeout(() => {
      progressManager.cleanupSession(sessionId);
    }, 30000); // Cleanup after 30 seconds
  }
}
```

### Step 6: Update Frontend with Real-time Progress

**Progress Component:**
```typescript
// /components/processor/ProgressIndicator.tsx

'use client';

import { useState, useEffect } from 'react';
import { ProcessingProgress } from '@/types/attendance';

interface ProgressIndicatorProps {
  sessionId: string;
  onComplete?: (result: any) => void;
  onError?: (error: string) => void;
}

export function ProgressIndicator({ sessionId, onComplete, onError }: ProgressIndicatorProps) {
  const [progress, setProgress] = useState<ProcessingProgress | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const ws = new WebSocket(`ws://localhost:3001/api/v1/processor/progress?sessionId=${sessionId}`);

    ws.onopen = () => {
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === 'progress') {
        setProgress(data.data);

        if (data.data.stage === 'complete') {
          ws.close();
          onComplete?.(data.data);
        }
      } else if (data.type === 'error') {
        ws.close();
        onError?.(data.message);
      }
    };

    ws.onerror = () => {
      setIsConnected(false);
      onError?.('Connection error');
    };

    return () => {
      ws.close();
    };
  }, [sessionId, onComplete, onError]);

  if (!progress) {
    return (
      <div className="nb-progress-container">
        <div className="nb-loading-spinner" />
        <p>Initializing processing...</p>
      </div>
    );
  }

  return (
    <div className="nb-progress-container">
      <div className="nb-progress-header">
        <h3>Processing Attendance Data</h3>
        <div className={`nb-connection-status ${isConnected ? 'connected' : 'disconnected'}`} />
      </div>

      <div className="nb-progress-bar">
        <div
          className="nb-progress-fill"
          style={{ width: `${progress.progress}%` }}
        />
      </div>

      <div className="nb-progress-details">
        <p className="nb-progress-stage">
          Stage: {progress.stage.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
        </p>
        <p className="nb-progress-percentage">
          {Math.round(progress.progress)}% Complete
        </p>
        <p className="nb-progress-count">
          {progress.processed.toLocaleString()} / {progress.total.toLocaleString()} records
        </p>
        {progress.estimatedTimeRemaining && (
          <p className="nb-progress-eta">
            ETA: {formatTime(progress.estimatedTimeRemaining)}
          </p>
        )}
      </div>

      <button
        className="nb-cancel-button"
        onClick={() => cancelProcessing(sessionId)}
      >
        Cancel Processing
      </button>
    </div>
  );
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

async function cancelProcessing(sessionId: string) {
  try {
    await fetch(`/api/v1/processor/cancel?sessionId=${sessionId}`, {
      method: 'POST'
    });
  } catch (error) {
    console.error('Failed to cancel processing:', error);
  }
}
```

## Performance Optimizations

### Memory Management
```typescript
// Force garbage collection between batches
const processBatchWithGC = async (batch: any[]) => {
  const result = await processBatch(batch);

  // Clear references for garbage collection
  batch.length = 0;

  // Suggest garbage collection if available
  if (global.gc) {
    global.gc();
  }

  return result;
};
```

### Batch Size Optimization
```typescript
// Dynamic batch sizing based on memory and performance
const optimizeBatchSize = (totalRecords: number): number => {
  if (totalRecords < 1000) return totalRecords;
  if (totalRecords < 10000) return 1000;
  if (totalRecords < 50000) return 2000;
  return 5000;
};
```

### Algorithm Optimizations
```typescript
// Pre-compute commonly used values
const precomputeShiftWindows = (shiftConfigs: ShiftConfig[]) => {
  // Cache shift time ranges for faster lookup
  const cache = new Map<string, TimeRange>();

  for (const config of shiftConfigs) {
    cache.set(config.name, {
      start: parseTime(config.checkInStart),
      end: parseTime(config.checkOutEnd)
    });
  }

  return cache;
};
```

## Deliverables

1. **Async Pipeline Manager** (`/lib/processors/asyncPipelineManager.ts`)
2. **Optimized Burst Detector** (`/lib/processors/asyncBurstDetector.ts`)
3. **Async Shift Detector** (`/lib/processors/asyncShiftDetector.ts`)
4. **Progress Tracking System** (`/lib/utils/progressManager.ts`)
5. **WebSocket Progress API** (`/app/api/v1/processor/progress/route.ts`)
6. **Progress UI Components** (`/components/processor/ProgressIndicator.tsx`)
7. **Updated Processor Route** with async integration

## Success Criteria

1. **Non-blocking Processing**: Event loop never blocked for >16ms
2. **Real-time Progress**: Updates every 500ms with accurate percentages
3. **Cancellation Support**: Users can interrupt processing within 1 second
4. **Memory Efficiency**: Peak memory usage <200MB for 50K records
5. **Performance**: Maintain or improve processing throughput
6. **User Experience**: Clear progress indicators and responsive UI

## Next Steps

1. Implement async pipeline framework
2. Optimize burst detection algorithm
3. Create progress tracking system
4. Update frontend with real-time feedback
5. Performance testing and validation
6. Memory profiling and optimization

---

**This phase transforms the processor into a responsive, real-time system that provides excellent user experience while maintaining high performance for large datasets.**