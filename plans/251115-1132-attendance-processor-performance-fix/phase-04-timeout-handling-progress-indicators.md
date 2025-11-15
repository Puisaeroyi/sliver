# Phase 4: Add Timeout Handling and Progress Indicators

**Date:** 2025-11-15
**Phase ID:** 251115-1132-04
**Status:** Draft
**Estimated Duration:** 6 hours
**Dependencies:** Phase 3 completion (Async Pipeline)

## Objectives

Implement comprehensive timeout handling, progress tracking, and user experience improvements to provide reliable processing with clear feedback and error recovery.

## Current Issues

### Timeout Problems
```typescript
// CURRENT: No timeout handling in processor route
export async function POST(request: NextRequest) {
  // Processing can run indefinitely
  // No timeout limits or graceful degradation
  // Users see "pending" status with no resolution
}
```

### User Experience Issues
```typescript
// CURRENT: Frontend shows generic "Processing..." with no details
const [isProcessing, setIsProcessing] = useState(false);
// No progress percentage, no time estimates, no cancellation
```

### Error Handling Gaps
- No specific timeout error messages
- No retry mechanisms
- No graceful degradation for large files
- No user control over long-running processes

## Implementation Strategy

### Timeout Handling Framework
1. **Configurable Timeouts**: Different limits for various file sizes
2. **Graceful Degradation**: Partial results on timeout
3. **Automatic Retry**: With exponential backoff
4. **Memory Monitoring**: Prevent system overload
5. **Process Cancellation**: User-initiated stops

### Progress Tracking System
1. **Real-time Updates**: WebSocket or Server-Sent Events
2. **Accurate Percentages**: Stage-based progress calculation
3. **Time Estimates**: ETA calculations based on processing speed
4. **Granular Details**: Records per second, current operation
5. **Visual Feedback**: Progress bars, status indicators

### User Experience Enhancements
1. **Cancel Button**: Stop processing at any time
2. **Partial Results**: Download incomplete results on timeout
3. **Retry Options**: Automatic and manual retry mechanisms
4. **File Size Recommendations**: Guidance for optimal performance
5. **Performance Tips**: Best practices for large datasets

## Implementation Plan

### Step 1: Timeout Management System

**Timeout Configuration:**
```typescript
// /lib/config/timeoutConfig.ts

export interface TimeoutConfig {
  defaultTimeout: number;      // 5 minutes
  largeFileTimeout: number;    // 10 minutes
  extraLargeFileTimeout: number; // 20 minutes
  memoryThreshold: number;     // 500MB
  progressUpdateInterval: number; // 500ms
  maxRetries: number;          // 3 attempts
  retryDelay: number[];        // [1000, 2000, 4000] ms
}

export const timeoutConfig: TimeoutConfig = {
  defaultTimeout: 5 * 60 * 1000,      // 5 minutes
  largeFileTimeout: 10 * 60 * 1000,    // 10 minutes
  extraLargeFileTimeout: 20 * 60 * 1000, // 20 minutes
  memoryThreshold: 500 * 1024 * 1024, // 500MB
  progressUpdateInterval: 500,        // 500ms
  maxRetries: 3,
  retryDelay: [1000, 2000, 4000]      // Exponential backoff
};

export const getTimeoutForFileSize = (fileSizeBytes: number): number => {
  if (fileSizeBytes > 5 * 1024 * 1024) { // > 5MB
    return timeoutConfig.extraLargeFileTimeout;
  } else if (fileSizeBytes > 1 * 1024 * 1024) { // > 1MB
    return timeoutConfig.largeFileTimeout;
  }
  return timeoutConfig.defaultTimeout;
};
```

**Timeout Manager:**
```typescript
// /lib/utils/timeoutManager.ts

export interface TimeoutManagerOptions {
  timeoutMs: number;
  onTimeout?: () => void;
  onProgress?: (remaining: number) => void;
  checkInterval?: number; // Check every 1000ms
}

export class TimeoutManager {
  private timeoutId: NodeJS.Timeout | null = null;
  private progressIntervalId: NodeJS.Timeout | null = null;
  private startTime: number = 0;
  private remainingTime: number = 0;

  constructor(private options: TimeoutManagerOptions) {
    this.remainingTime = options.timeoutMs;
    this.startTime = Date.now();
  }

  start(): void {
    // Main timeout check
    this.timeoutId = setTimeout(() => {
      this.options.onTimeout?.();
    }, this.options.timeoutMs);

    // Progress interval
    this.progressIntervalId = setInterval(() => {
      this.remainingTime = this.options.timeoutMs - (Date.now() - this.startTime);
      this.options.onProgress?.(this.remainingTime);

      if (this.remainingTime <= 0) {
        this.clear();
      }
    }, this.options.checkInterval || 1000);
  }

  extend(extendedMs: number): void {
    this.options.timeoutMs += extendedMs;
    this.remainingTime += extendedMs;
  }

  getRemainingTime(): number {
    return Math.max(0, this.options.timeoutMs - (Date.now() - this.startTime));
  }

  clear(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    if (this.progressIntervalId) {
      clearInterval(this.progressIntervalId);
      this.progressIntervalId = null;
    }
  }

  isExpired(): boolean {
    return this.getRemainingTime() <= 0;
  }
}
```

### Step 2: Memory Monitoring

**Memory Monitor:**
```typescript
// /lib/utils/memoryMonitor.ts

export interface MemoryUsage {
  rss: number;        // Resident Set Size
  heapTotal: number;  // Total heap size
  heapUsed: number;   // Used heap size
  external: number;   // External memory
  percentage: number; // Percentage of threshold used
}

export interface MemoryMonitorOptions {
  thresholdBytes: number;
  checkInterval: number;
  onThresholdExceeded?: (usage: MemoryUsage) => void;
  onMemoryLeak?: (usage: MemoryUsage) => void;
}

export class MemoryMonitor {
  private intervalId: NodeJS.Timeout | null = null;
  private previousUsage: MemoryUsage[] = [];

  constructor(private options: MemoryMonitorOptions) {}

  start(): void {
    this.intervalId = setInterval(() => {
      const currentUsage = this.getCurrentUsage();
      this.analyzeUsage(currentUsage);
      this.previousUsage.push(currentUsage);

      // Keep only last 10 measurements
      if (this.previousUsage.length > 10) {
        this.previousUsage.shift();
      }
    }, this.options.checkInterval);
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private getCurrentUsage(): MemoryUsage {
    const usage = process.memoryUsage();
    const threshold = this.options.thresholdBytes;

    return {
      rss: usage.rss,
      heapTotal: usage.heapTotal,
      heapUsed: usage.heapUsed,
      external: usage.external,
      percentage: (usage.heapUsed / threshold) * 100
    };
  }

  private analyzeUsage(currentUsage: MemoryUsage): void {
    // Check threshold exceeded
    if (currentUsage.percentage > 100) {
      this.options.onThresholdExceeded?.(currentUsage);
    }

    // Check for potential memory leak (increasing usage over time)
    if (this.previousUsage.length >= 5) {
      const recent = this.previousUsage.slice(-5);
      const isIncreasing = recent.every((usage, index) => {
        if (index === 0) return true;
        return usage.heapUsed > recent[index - 1].heapUsed;
      });

      if (isIncreasing && currentUsage.percentage > 80) {
        this.options.onMemoryLeak?.(currentUsage);
      }
    }
  }

  forceGarbageCollection(): void {
    if (global.gc) {
      global.gc();
    }
  }
}
```

### Step 3: Enhanced Error Handling

**Error Handler with Retry Logic:**
```typescript
// /lib/utils/errorHandler.ts

export interface ProcessingError {
  type: 'timeout' | 'memory' | 'validation' | 'processing' | 'network';
  message: string;
  details?: any;
  recoverable: boolean;
  retryCount: number;
  timestamp: number;
}

export interface RetryOptions {
  maxRetries: number;
  delays: number[];
  onRetry?: (error: ProcessingError, attempt: number) => void;
  shouldRetry?: (error: ProcessingError) => boolean;
}

export class ProcessingErrorHandler {
  constructor(private retryOptions: RetryOptions) {}

  async executeWithRetry<T>(
    operation: () => Promise<T>,
    context: string
  ): Promise<T> {
    let lastError: ProcessingError | null = null;

    for (let attempt = 0; attempt <= this.retryOptions.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = this.createProcessingError(error, context, attempt);

        // Check if we should retry
        if (attempt === this.retryOptions.maxRetries ||
            (this.retryOptions.shouldRetry && !this.retryOptions.shouldRetry(lastError))) {
          throw lastError;
        }

        // Wait before retry
        if (attempt < this.retryOptions.delays.length) {
          const delay = this.retryOptions.delays[attempt];
          this.retryOptions.onRetry?.(lastError, attempt + 1);
          await this.sleep(delay);
        }
      }
    }

    throw lastError;
  }

  private createProcessingError(
    error: any,
    context: string,
    retryCount: number
  ): ProcessingError {
    if (error instanceof ProcessingError) {
      return { ...error, retryCount: retryCount + 1 };
    }

    const message = error instanceof Error ? error.message : 'Unknown error';

    // Determine error type based on message or context
    let type: ProcessingError['type'] = 'processing';
    let recoverable = true;

    if (message.includes('timeout')) {
      type = 'timeout';
      recoverable = true;
    } else if (message.includes('memory')) {
      type = 'memory';
      recoverable = false;
    } else if (message.includes('validation')) {
      type = 'validation';
      recoverable = false;
    } else if (message.includes('network')) {
      type = 'network';
      recoverable = true;
    }

    return {
      type,
      message,
      details: error,
      recoverable,
      retryCount,
      timestamp: Date.now()
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

### Step 4: Progress Tracking with WebSockets

**Enhanced Progress Server:**
```typescript
// /app/api/v1/processor/progress/route.ts

import { NextRequest } from 'next/server';
import { WebSocketServer } from 'ws';
import { progressManager } from '@/lib/utils/progressManager';

// WebSocket upgrade handler
export async function GET(request: NextRequest) {
  // This would be handled by a WebSocket server in production
  // For Next.js, we'll use Server-Sent Events as fallback

  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('sessionId');

  if (!sessionId) {
    return new Response('Session ID required', { status: 400 });
  }

  // Server-Sent Events implementation
  const headers = new Headers({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      progressManager.registerSSEConnection(sessionId, controller, encoder);
    },
    cancel() {
      progressManager.unregisterConnection(sessionId);
    }
  });

  return new Response(stream, { headers });
}
```

**Progress Manager with SSE:**
```typescript
// /lib/utils/progressManager.ts (Enhanced)

export interface SSEConnection {
  sessionId: string;
  controller: ReadableStreamDefaultController;
  encoder: TextEncoder;
}

export interface DetailedProgress extends ProcessingProgress {
  sessionId: string;
  startTime: number;
  currentTime: number;
  recordsPerSecond: number;
  memoryUsage?: MemoryUsage;
  timeoutRemaining?: number;
  estimatedCompletionTime?: Date;
  warnings: string[];
}

export class EnhancedProgressManager {
  private sessions = new Map<string, ProgressSession>();
  private sseConnections = new Map<string, SSEConnection>();

  registerSSEConnection(
    sessionId: string,
    controller: ReadableStreamDefaultController,
    encoder: TextEncoder
  ): void {
    this.sseConnections.set(sessionId, { sessionId, controller, encoder });

    // Send current progress if exists
    const session = this.sessions.get(sessionId);
    if (session) {
      this.sendProgressUpdate(sessionId, session.currentProgress);
    }

    // Send heartbeat every 30 seconds
    const heartbeat = setInterval(() => {
      if (this.sseConnections.has(sessionId)) {
        this.sendHeartbeat(sessionId);
      } else {
        clearInterval(heartbeat);
      }
    }, 30000);
  }

  updateProgress(sessionId: string, progress: ProcessingProgress): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const currentTime = Date.now();
    const elapsed = currentTime - session.startTime;
    const recordsPerSecond = progress.processed / (elapsed / 1000);

    session.currentProgress = {
      ...progress,
      sessionId,
      startTime: session.startTime,
      currentTime,
      recordsPerSecond,
      estimatedCompletionTime: this.calculateETA(progress, elapsed),
      warnings: []
    };

    this.sendProgressUpdate(sessionId, session.currentProgress);
  }

  private sendProgressUpdate(sessionId: string, progress: DetailedProgress): void {
    const connection = this.sseConnections.get(sessionId);
    if (!connection) return;

    try {
      const data = JSON.stringify({
        type: 'progress',
        data: progress
      });

      connection.controller.enqueue(
        connection.encoder.encode(`data: ${data}\n\n`)
      );
    } catch (error) {
      console.error('Failed to send progress update:', error);
      this.unregisterConnection(sessionId);
    }
  }

  private sendHeartbeat(sessionId: string): void {
    const connection = this.sseConnections.get(sessionId);
    if (!connection) return;

    try {
      connection.controller.enqueue(
        connection.encoder.encode(`: heartbeat\n\n`)
      );
    } catch (error) {
      console.error('Failed to send heartbeat:', error);
      this.unregisterConnection(sessionId);
    }
  }

  private calculateETA(
    progress: ProcessingProgress,
    elapsed: number
  ): Date | undefined {
    if (progress.progress === 0) return undefined;

    const totalTime = (elapsed * 100) / progress.progress;
    const remaining = totalTime - elapsed;
    return new Date(Date.now() + remaining);
  }

  unregisterConnection(sessionId: string): void {
    const connection = this.sseConnections.get(sessionId);
    if (connection) {
      try {
        connection.controller.close();
      } catch (error) {
        // Controller already closed
      }
      this.sseConnections.delete(sessionId);
    }
  }
}

export const progressManager = new EnhancedProgressManager();
```

### Step 5: Enhanced Frontend Progress Component

**Advanced Progress Indicator:**
```typescript
// /components/processor/AdvancedProgressIndicator.tsx

'use client';

import { useState, useEffect, useCallback } from 'react';
import { DetailedProgress, ProcessingError } from '@/types/attendance';

interface AdvancedProgressIndicatorProps {
  sessionId: string;
  onComplete?: (result: any) => void;
  onError?: (error: ProcessingError) => void;
  onCancel?: () => void;
}

export function AdvancedProgressIndicator({
  sessionId,
  onComplete,
  onError,
  onCancel
}: AdvancedProgressIndicatorProps) {
  const [progress, setProgress] = useState<DetailedProgress | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);

  useEffect(() => {
    const eventSource = new EventSource(
      `/api/v1/processor/progress?sessionId=${sessionId}`
    );

    eventSource.onopen = () => {
      setIsConnected(true);
    };

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === 'progress') {
        setProgress(data.data);
        setWarnings(data.data.warnings || []);
      } else if (data.type === 'complete') {
        eventSource.close();
        onComplete?.(data.data);
      } else if (data.type === 'error') {
        eventSource.close();
        onError?.(data.error);
      }
    };

    eventSource.onerror = () => {
      setIsConnected(false);
      onError?.({
        type: 'network',
        message: 'Connection to progress server lost',
        recoverable: true,
        retryCount: 0,
        timestamp: Date.now()
      });
    };

    return () => {
      eventSource.close();
    };
  }, [sessionId, onComplete, onError]);

  const handleCancel = useCallback(() => {
    if (progress?.stage === 'complete') return;

    if (!showCancelConfirm) {
      setShowCancelConfirm(true);
      return;
    }

    cancelProcessing(sessionId);
    onCancel?.();
  }, [sessionId, showCancelConfirm, progress, onCancel]);

  if (!progress) {
    return (
      <div className="nb-progress-container nb-initializing">
        <div className="nb-loading-spinner" />
        <p>Connecting to processing server...</p>
      </div>
    );
  }

  return (
    <div className="nb-progress-container">
      {/* Header with connection status */}
      <div className="nb-progress-header">
        <div className="nb-progress-title">
          <h3>Processing Attendance Data</h3>
          <div className={`nb-connection-indicator ${isConnected ? 'connected' : 'disconnected'}`} />
        </div>

        <div className="nb-progress-actions">
          {progress.stage !== 'complete' && (
            <button
              className={`nb-cancel-button ${showCancelConfirm ? 'confirm' : ''}`}
              onClick={handleCancel}
            >
              {showCancelConfirm ? 'Confirm Cancel' : 'Cancel Processing'}
            </button>
          )}
        </div>
      </div>

      {/* Progress bar with stages */}
      <div className="nb-progress-stages">
        {['parsing', 'burst-detection', 'shift-detection', 'break-detection', 'complete'].map((stage, index) => (
          <div
            key={stage}
            className={`nb-stage ${getStageStatus(progress, stage)}`}
          >
            <div className="nb-stage-icon">{getStageIcon(stage)}</div>
            <div className="nb-stage-label">{formatStageName(stage)}</div>
          </div>
        ))}
      </div>

      {/* Main progress bar */}
      <div className="nb-progress-bar-container">
        <div className="nb-progress-bar">
          <div
            className="nb-progress-fill"
            style={{ width: `${progress.progress}%` }}
          />
        </div>
        <div className="nb-progress-text">
          {Math.round(progress.progress)}% Complete
        </div>
      </div>

      {/* Detailed statistics */}
      <div className="nb-progress-stats">
        <div className="nb-stat">
          <span className="nb-stat-label">Records:</span>
          <span className="nb-stat-value">
            {progress.processed.toLocaleString()} / {progress.total.toLocaleString()}
          </span>
        </div>

        <div className="nb-stat">
          <span className="nb-stat-label">Speed:</span>
          <span className="nb-stat-value">
            {Math.round(progress.recordsPerSecond)} records/sec
          </span>
        </div>

        {progress.estimatedCompletionTime && (
          <div className="nb-stat">
            <span className="nb-stat-label">ETA:</span>
            <span className="nb-stat-value">
              {formatTime(progress.estimatedCompletionTime)}
            </span>
          </div>
        )}

        {progress.timeoutRemaining && (
          <div className="nb-stat nb-timeout-warning">
            <span className="nb-stat-label">Timeout:</span>
            <span className="nb-stat-value">
              {formatDuration(progress.timeoutRemaining)}
            </span>
          </div>
        )}
      </div>

      {/* Memory usage indicator */}
      {progress.memoryUsage && (
        <div className="nb-memory-usage">
          <div className="nb-memory-header">
            <span>Memory Usage</span>
            <span className={`nb-memory-status ${getMemoryStatus(progress.memoryUsage)}`}>
              {Math.round(progress.memoryUsage.percentage)}%
            </span>
          </div>
          <div className="nb-memory-bar">
            <div
              className="nb-memory-fill"
              style={{ width: `${Math.min(progress.memoryUsage.percentage, 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Warnings section */}
      {warnings.length > 0 && (
        <div className="nb-warnings">
          <h4>Warnings</h4>
          {warnings.map((warning, index) => (
            <div key={index} className="nb-warning">
              <span className="nb-warning-icon">⚠️</span>
              <span className="nb-warning-text">{warning}</span>
            </div>
          ))}
        </div>
      )}

      {/* Current operation details */}
      <div className="nb-current-operation">
        <span className="nb-operation-label">Current:</span>
        <span className="nb-operation-value">
          {getCurrentOperation(progress)}
        </span>
      </div>
    </div>
  );
}

function getStageStatus(progress: DetailedProgress, stage: string): string {
  const stageOrder = ['parsing', 'burst-detection', 'shift-detection', 'break-detection', 'complete'];
  const currentIndex = stageOrder.indexOf(progress.stage);
  const stageIndex = stageOrder.indexOf(stage);

  if (stageIndex < currentIndex) return 'completed';
  if (stageIndex === currentIndex) return 'active';
  return 'pending';
}

function getStageIcon(stage: string): string {
  const icons = {
    parsing: '📊',
    'burst-detection': '🔍',
    'shift-detection': '🕐',
    'break-detection': '☕',
    complete: '✅'
  };
  return icons[stage as keyof typeof icons] || '⏳';
}

function formatStageName(stage: string): string {
  return stage
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString();
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

function getMemoryStatus(memoryUsage: any): string {
  if (memoryUsage.percentage > 90) return 'critical';
  if (memoryUsage.percentage > 75) return 'warning';
  return 'normal';
}

function getCurrentOperation(progress: DetailedProgress): string {
  const operations = {
    parsing: 'Parsing Excel file',
    'burst-detection': 'Detecting burst patterns',
    'shift-detection': 'Grouping shifts',
    'break-detection': 'Finding break times',
    complete: 'Finalizing results'
  };
  return operations[progress.stage as keyof typeof operations] || 'Processing...';
}

async function cancelProcessing(sessionId: string): Promise<void> {
  try {
    await fetch(`/api/v1/processor/cancel?sessionId=${sessionId}`, {
      method: 'POST'
    });
  } catch (error) {
    console.error('Failed to cancel processing:', error);
  }
}
```

### Step 6: Update Main Processor Route with Timeout Handling

**Enhanced Processor Route:**
```typescript
// UPDATED /app/api/v1/processor/route.ts

export async function POST(request: NextRequest) {
  const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  try {
    // File validation and setup
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // Security validations
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File too large' }, { status: 400 });
    }

    // Setup timeout management
    const timeoutMs = getTimeoutForFileSize(file.size);
    const timeoutManager = new TimeoutManager({
      timeoutMs,
      onTimeout: () => {
        throw new ProcessingError('timeout', 'Processing timeout exceeded', {
          timeoutMs,
          fileSize: file.size
        });
      },
      onProgress: (remaining) => {
        progressManager.updateProgress(sessionId, {
          stage: 'processing',
          progress: 0,
          processed: 0,
          total: 0,
          timeoutRemaining: remaining
        });
      }
    });

    // Setup memory monitoring
    const memoryMonitor = new MemoryMonitor({
      thresholdBytes: timeoutConfig.memoryThreshold,
      checkInterval: 2000,
      onThresholdExceeded: (usage) => {
        progressManager.updateProgress(sessionId, {
          stage: 'processing',
          progress: 0,
          processed: 0,
          total: 0,
          memoryUsage: usage,
          warnings: [`High memory usage: ${Math.round(usage.percentage)}%`]
        });
      },
      onMemoryLeak: (usage) => {
        memoryMonitor.forceGarbageCollection();
        progressManager.updateProgress(sessionId, {
          stage: 'processing',
          progress: 0,
          processed: 0,
          total: 0,
          memoryUsage: usage,
          warnings: ['Memory leak detected, attempting recovery...']
        });
      }
    });

    // Start monitoring
    timeoutManager.start();
    memoryMonitor.start();

    // Setup error handling with retry
    const errorHandler = new ProcessingErrorHandler({
      maxRetries: timeoutConfig.maxRetries,
      delays: timeoutConfig.retryDelay,
      onRetry: (error, attempt) => {
        progressManager.updateProgress(sessionId, {
          stage: 'processing',
          progress: 0,
          processed: 0,
          total: 0,
          warnings: [`Retry ${attempt}: ${error.message}`]
        });
      },
      shouldRetry: (error) => error.recoverable && error.type === 'timeout'
    });

    // Execute processing with error handling
    const result = await errorHandler.executeWithRetry(async () => {
      // Read file buffer
      const buffer = await file.arrayBuffer();

      // Load configurations
      const combinedConfig = loadCombinedConfig();
      const configStr = formData.get('config') as string;
      const config: Partial<RuleConfig> = configStr ? JSON.parse(configStr) : {};

      // Process with streaming parser
      const parser = new StreamingExcelParser({
        batchSize: 1000,
        onProgress: (processed, total) => {
          progressManager.updateProgress(sessionId, {
            stage: 'parsing',
            progress: (processed / total) * 25, // Parsing is 25% of total
            processed,
            total,
            timeoutRemaining: timeoutManager.getRemainingTime()
          });
        }
      });

      // Parse and process
      const parseResult = await parser.parseExcelBuffer(buffer);
      const swipes = await processSwipesToRecords(parseResult, combinedConfig);

      // Process with async pipeline
      const pipelineManager = new AsyncPipelineManager({
        batchSize: 1000,
        progressCallback: (progress) => {
          progressManager.updateProgress(sessionId, {
            ...progress,
            timeoutRemaining: timeoutManager.getRemainingTime()
          });
        },
        cancellationToken: { cancelled: false }
      });

      return await pipelineManager.processSwipes(swipes);
    }, 'attendance-processing');

    // Cleanup monitoring
    timeoutManager.clear();
    memoryMonitor.stop();

    // Final progress update
    progressManager.updateProgress(sessionId, {
      stage: 'complete',
      progress: 100,
      processed: result.recordsProcessed,
      total: result.recordsProcessed
    });

    return NextResponse.json({
      success: true,
      result,
      sessionId,
      message: `Processed ${result.recordsProcessed} records successfully`
    });

  } catch (error) {
    console.error('Processing error:', error);

    // Handle specific error types
    if (error instanceof ProcessingError) {
      progressManager.updateProgress(sessionId, {
        stage: 'error',
        progress: 0,
        processed: 0,
        total: 0,
        warnings: [error.message]
      });

      return NextResponse.json({
        error: error.message,
        type: error.type,
        recoverable: error.recoverable,
        sessionId
      }, { status: error.type === 'validation' ? 400 : 500 });
    }

    return NextResponse.json({
      error: 'Processing failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      sessionId
    }, { status: 500 });

  } finally {
    // Cleanup progress session after delay
    setTimeout(() => {
      progressManager.unregisterConnection(sessionId);
    }, 60000); // Cleanup after 1 minute
  }
}
```

## Deliverables

1. **Timeout Configuration** (`/lib/config/timeoutConfig.ts`)
2. **Timeout Manager** (`/lib/utils/timeoutManager.ts`)
3. **Memory Monitor** (`/lib/utils/memoryMonitor.ts`)
4. **Error Handler** (`/lib/utils/errorHandler.ts`)
5. **Enhanced Progress Manager** (`/lib/utils/progressManager.ts`)
6. **Advanced Progress Component** (`/components/processor/AdvancedProgressIndicator.tsx`)
7. **Updated Processor Route** with comprehensive error handling
8. **Progress API Endpoint** with SSE support

## Success Criteria

1. **Timeout Protection**: No process runs longer than configured limits
2. **Graceful Degradation**: Partial results available on timeout
3. **Real-time Progress**: Accurate progress updates with time estimates
4. **User Control**: Users can cancel processing at any time
5. **Memory Protection**: System protected from memory exhaustion
6. **Error Recovery**: Automatic retry with exponential backoff
7. **Clear Feedback**: Users understand what's happening and why

## Next Steps

1. Implement timeout and memory management systems
2. Create enhanced progress tracking with SSE
3. Update frontend with advanced progress indicators
4. Add comprehensive error handling and retry logic
5. Test with various file sizes and failure scenarios
6. Validate user experience improvements

---

**This phase completes the user experience transformation, providing reliable processing with comprehensive feedback and error recovery mechanisms.**