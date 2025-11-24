'use client';

import { useState, useRef, ChangeEvent, DragEvent } from 'react';
import { FileText, ArrowRight, AlertCircle, Upload } from 'lucide-react';
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Input,
  Badge,
} from '@/components/ui';

export default function ConverterPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [delimiter, setDelimiter] = useState(',');
  const [encoding, setEncoding] = useState('UTF-8');
  const [error, setError] = useState<string | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (selectedFile: File) => {
    // Validate file type
    const validTypes = ['text/csv', 'application/vnd.ms-excel'];

    if (!validTypes.includes(selectedFile.type) && !selectedFile.name.endsWith('.csv')) {
      setError('Invalid file type. Please upload a CSV file.');
      return;
    }

    setFile(selectedFile);
    setError(null);
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

  const handleConvert = async () => {
    if (!file) {
      setError('Please select a file first');
      return;
    }

    setIsConverting(true);
    setError(null);

    try {
      // Create FormData to send file and configuration
      const formData = new FormData();
      formData.append('file', file);
      formData.append('delimiter', delimiter);
      formData.append('encoding', encoding);

      const response = await fetch('/api/v1/converter/process', {
        method: 'POST',
        body: formData,
      });

      // Check if response is an error (JSON response)
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        const data = await response.json();
        throw new Error(data.error || 'Conversion failed');
      }

      if (!response.ok) {
        throw new Error('Conversion failed');
      }

      // Get the XLSX file as blob
      const blob = await response.blob();

      // Extract filename from Content-Disposition header or create default
      const disposition = response.headers.get('Content-Disposition');
      let filename = file.name.replace('.csv', '_converted.xlsx');

      if (disposition && disposition.includes('filename=')) {
        const matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(disposition);
        if (matches && matches[1]) {
          filename = matches[1].replace(/['"]/g, '');
        }
      }

      // Download the XLSX file
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to convert file');
    } finally {
      setIsConverting(false);
    }
  };

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center p-4 rounded-full bg-primary/10">
          <FileText className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          CSV to XLSX Converter
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Convert CSV files to Excel format with column extraction
        </p>
      </div>

      <div className="mx-auto max-w-4xl space-y-8">
        <Card className="border-primary/20 shadow-lg">
          <CardHeader>
            <CardTitle>Upload Your CSV File</CardTitle>
            <CardDescription>
              Upload CSV to convert to XLSX. Extracts columns [0,1,2,3,4,6] as ID, Name, Date, Time, Type, Status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
              />

              {/* Drag and drop area */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`cursor-pointer border-2 border-dashed rounded-xl p-12 text-center transition-all duration-200 ${isDragging
                    ? 'border-primary bg-primary/5'
                    : file
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary hover:bg-secondary/50'
                  }`}
                onClick={!file ? handleChooseFile : undefined}
              >
                {file ? (
                  <div className="space-y-4">
                    <div className="mx-auto h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                      <FileText className="h-8 w-8 text-primary" />
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-foreground">{file.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {(file.size / 1024).toFixed(2)} KB
                      </p>
                    </div>
                    <div className="flex justify-center gap-2">
                      <Badge variant="primary">File loaded</Badge>
                      <Button variant="outline" size="sm" onClick={handleChooseFile}>
                        Change File
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="mx-auto h-16 w-16 rounded-full bg-secondary flex items-center justify-center">
                      <Upload className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-foreground">
                        Drag and drop your CSV file here
                      </p>
                      <p className="text-sm text-muted-foreground">
                        or click to browse files
                      </p>
                    </div>
                    <Button variant="primary" type="button" onClick={handleChooseFile}>
                      Choose File
                    </Button>
                  </div>
                )}
              </div>

              {/* Error message */}
              {error && (
                <div className="rounded-lg bg-destructive/10 p-4 flex items-center gap-3 text-destructive">
                  <AlertCircle className="h-5 w-5" />
                  <p className="text-sm font-medium">{error}</p>
                </div>
              )}

              {/* Configuration inputs */}
              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  label="Delimiter"
                  placeholder=","
                  value={delimiter}
                  onChange={(e) => setDelimiter(e.target.value)}
                />
                <Input
                  label="Encoding"
                  placeholder="UTF-8"
                  value={encoding}
                  onChange={(e) => setEncoding(e.target.value)}
                />
              </div>

              {/* Convert button */}
              <Button
                variant="primary"
                size="lg"
                className="w-full"
                onClick={handleConvert}
                disabled={!file || isConverting}
              >
                <span className="mr-2">{isConverting ? 'Converting...' : 'Convert File'}</span>
                {!isConverting && <ArrowRight className="h-4 w-4" />}
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="p-6 text-center space-y-2">
              <div className="text-3xl font-bold text-primary">Fast</div>
              <p className="text-sm text-muted-foreground">Process files in seconds</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center space-y-2">
              <div className="text-3xl font-bold text-emerald-500">Accurate</div>
              <p className="text-sm text-muted-foreground">100% data integrity</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center space-y-2">
              <div className="text-3xl font-bold text-violet-500">Secure</div>
              <p className="text-sm text-muted-foreground">Your data stays private</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
