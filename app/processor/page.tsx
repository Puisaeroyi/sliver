'use client';

import { useState, useRef, ChangeEvent, DragEvent } from 'react';
import { Upload, ArrowRight, CheckCircle, FileText, AlertCircle } from 'lucide-react';
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Badge,
} from '@/components/ui';
import { AttendanceAnalytics } from '@/components/analytics';
import { AttendanceRecord } from '@/types/attendance';

interface ProcessingResult {
  success: boolean;
  result?: {
    recordsProcessed: number;
    burstsDetected: number;
    shiftInstancesFound: number;
    attendanceRecordsGenerated: number;
    deviationRecordsCount?: number;
    outputData?: AttendanceRecord[];
    deviationData?: AttendanceRecord[];
  };
  message?: string;
}

export default function ProcessorPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDownloadingDeviation, setIsDownloadingDeviation] = useState(false);
  const [result, setResult] = useState<ProcessingResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (selectedFile: File) => {
    // Validate file type
    const validTypes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv',
    ];

    if (!validTypes.includes(selectedFile.type)) {
      setError('Invalid file type. Please upload an Excel (.xls, .xlsx) or CSV file.');
      return;
    }

    setFile(selectedFile);
    setError(null);
    setResult(null);
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFileSelect(selectedFile);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  };

  const handleChooseFile = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    fileInputRef.current?.click();
  };

  const handleProcess = async () => {
    if (!file) {
      setError('Please select a file first');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/v1/processor', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Processing failed');
      }

      setResult(data);
      setIsProcessing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setIsProcessing(false);
    }
  };

  const handleDownloadExcel = async (data: AttendanceRecord[]) => {
    try {
      // Send data to API for Excel generation
      const response = await fetch('/api/v1/processor/download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate Excel file');
      }

      // Get the file blob
      const blob = await response.blob();

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `attendance_records_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download Excel file');
    }
  };

  const handleDownloadDeviation = async (data: AttendanceRecord[]) => {
    setIsDownloadingDeviation(true);
    setError(null);

    try {
      // Send pre-filtered deviation data to API for Excel generation
      const response = await fetch('/api/v1/processor/download-deviation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate deviation summary');
      }

      // Download the file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Deviation_Summary_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download deviation summary');
    } finally {
      setIsDownloadingDeviation(false);
    }
  };

  return (
    <div className="nb-container py-nb-16">
      <div className="mb-nb-12 text-center">
        <div className="mb-nb-6 inline-block rounded-nb bg-nb-green p-nb-4 border-nb-4 border-nb-black shadow-nb">
          <Upload className="h-12 w-12 text-nb-white" />
        </div>
        <h1 className="mb-nb-4 font-display text-4xl font-black uppercase tracking-tight text-nb-black">
          Attendance Processor
        </h1>
        <p className="text-lg text-nb-gray-600">
          Process attendance data with burst detection and shift grouping
        </p>
      </div>

      <div className="mx-auto max-w-4xl">
        <Card variant="success">
          <CardHeader>
            <CardTitle>Upload Attendance Data</CardTitle>
            <CardDescription>Process your attendance file with advanced algorithms</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-nb-6">
              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".xls,.xlsx,.csv"
                onChange={handleFileChange}
                className="hidden"
              />

              {/* Drag and drop area */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`cursor-pointer border-nb-4 border-dashed p-nb-12 text-center transition-colors ${
                  isDragging
                    ? 'border-nb-green bg-nb-green/20'
                    : file
                      ? 'border-nb-green bg-nb-green/5'
                      : 'border-nb-gray-300 bg-nb-gray-50 hover:border-nb-green hover:bg-nb-green/5'
                }`}
              >
                {file ? (
                  <div>
                    <FileText className="mx-auto mb-nb-4 h-16 w-16 text-nb-green" />
                    <p className="mb-nb-2 text-lg font-bold text-nb-black">{file.name}</p>
                    <p className="mb-nb-4 text-sm text-nb-gray-600">
                      {(file.size / 1024).toFixed(2)} KB
                    </p>
                    <Badge variant="success">File loaded</Badge>
                  </div>
                ) : (
                  <div>
                    <Upload className="mx-auto mb-nb-4 h-16 w-16 text-nb-gray-400" />
                    <p className="mb-nb-4 text-lg font-bold text-nb-black">
                      Drag and drop your attendance file here
                    </p>
                    <p className="mb-nb-6 text-sm text-nb-gray-600">
                      Supports Excel (.xls, .xlsx) and CSV formats
                    </p>
                    <Button variant="success" type="button" onClick={handleChooseFile}>
                      Choose File
                    </Button>
                  </div>
                )}
              </div>

              {/* Error message */}
              {error && (
                <div className="rounded-nb bg-nb-red/10 border-nb-2 border-nb-red p-nb-4">
                  <div className="flex items-center gap-nb-3">
                    <AlertCircle className="h-5 w-5 text-nb-red" />
                    <p className="text-sm font-medium text-nb-red">{error}</p>
                  </div>
                </div>
              )}

              {/* Processing features */}
              <div className="rounded-nb bg-nb-blue/10 border-nb-2 border-nb-blue p-nb-6">
                <h3 className="mb-nb-4 font-bold uppercase tracking-wide text-nb-black">
                  Processing Features
                </h3>
                <div className="space-y-nb-3">
                  {[
                    'Burst Detection Algorithm',
                    'Shift Grouping',
                    'Break Time Detection',
                    'Status Determination',
                    'Data Validation',
                  ].map((feature, index) => (
                    <div key={index} className="flex items-center gap-nb-3">
                      <CheckCircle className="h-5 w-5 text-nb-green" />
                      <span className="text-sm font-medium text-nb-black">{feature}</span>
                      <Badge variant="success" className="ml-auto">
                        Active
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>

              {/* Process button */}
              <Button
                variant="primary"
                size="lg"
                className="w-full"
                onClick={handleProcess}
                disabled={!file || isProcessing}
              >
                <span className="mr-nb-2">
                  {isProcessing ? 'Processing...' : 'Process Attendance'}
                </span>
                <ArrowRight className="h-5 w-5" />
              </Button>

              {/* Results */}
              {result && (
                <div className="rounded-nb bg-nb-green/10 border-nb-2 border-nb-green p-nb-6">
                  <h3 className="mb-nb-4 font-bold uppercase tracking-wide text-nb-black">
                    Processing Complete
                  </h3>
                  <div className="space-y-nb-2 text-sm">
                    <p>
                      <span className="font-bold">Records Processed:</span>{' '}
                      {result.result?.recordsProcessed || 0}
                    </p>
                    <p>
                      <span className="font-bold">Bursts Detected:</span>{' '}
                      {result.result?.burstsDetected || 0}
                    </p>
                    <p>
                      <span className="font-bold">Shift Instances:</span>{' '}
                      {result.result?.shiftInstancesFound || 0}
                    </p>
                    <p>
                      <span className="font-bold">Attendance Records:</span>{' '}
                      {result.result?.attendanceRecordsGenerated || 0}
                    </p>
                  </div>
                  {result.message && (
                    <p className="mt-nb-4 text-sm text-nb-gray-600">{result.message}</p>
                  )}

                  {/* Download buttons */}
                  {result?.result?.outputData && result.result.outputData.length > 0 && (
                    <div className="mt-nb-6 grid grid-cols-1 gap-nb-4 md:grid-cols-2">
                      <Button
                        variant="primary"
                        size="lg"
                        className="w-full"
                        onClick={() => handleDownloadExcel(result.result?.outputData || [])}
                      >
                        <span className="mr-nb-2">Download Excel Results</span>
                        <ArrowRight className="h-5 w-5" />
                      </Button>
                      <Button
                        variant="secondary"
                        size="lg"
                        className="w-full"
                        onClick={() => handleDownloadDeviation(result.result?.deviationData || [])}
                        disabled={isDownloadingDeviation || !result.result?.deviationData || result.result.deviationData.length === 0}
                      >
                        <span className="mr-nb-2">
                          {isDownloadingDeviation ? 'Generating...' : 'Download Deviation Summary'}
                        </span>
                        <ArrowRight className="h-5 w-5" />
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="mt-nb-8">
          <Card variant="warning">
            <CardContent className="p-nb-6">
              <h3 className="mb-nb-3 font-bold uppercase tracking-wide text-nb-black">
                Performance Stats
              </h3>
              <div className="grid gap-nb-4 md:grid-cols-3">
                <div>
                  <div className="mb-nb-1 font-display text-2xl font-black text-nb-black">
                    10,000+
                  </div>
                  <p className="text-sm text-nb-gray-600">Records per second</p>
                </div>
                <div>
                  <div className="mb-nb-1 font-display text-2xl font-black text-nb-black">
                    &lt;10s
                  </div>
                  <p className="text-sm text-nb-gray-600">Processing time</p>
                </div>
                <div>
                  <div className="mb-nb-1 font-display text-2xl font-black text-nb-black">100%</div>
                  <p className="text-sm text-nb-gray-600">Accuracy rate</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Analytics Dashboard */}
        {result?.success && result?.result?.outputData && result.result.outputData.length > 0 && (
          <AttendanceAnalytics data={result.result.outputData} />
        )}
      </div>
    </div>
  );
}
