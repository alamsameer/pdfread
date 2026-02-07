'use client';

import { useCallback, useState } from 'react';
import { Upload } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface DropZoneProps {
  onFileDrop: (file: File) => void;
  isUploading?: boolean;
}

export function DropZone({ onFileDrop, isUploading = false }: DropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const files = Array.from(e.dataTransfer.files);
      const pdfFile = files.find((file) => file.type === 'application/pdf');

      if (pdfFile) {
        onFileDrop(pdfFile);
      }
    },
    [onFileDrop]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && file.type === 'application/pdf') {
        onFileDrop(file);
      }
    },
    [onFileDrop]
  );

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 transition-colors',
        isDragging
          ? 'border-blue-500 bg-blue-50'
          : 'border-gray-300 bg-gray-50',
        isUploading && 'pointer-events-none opacity-50'
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <Upload className="mb-4 h-12 w-12 text-gray-400" />
      <p className="mb-2 text-lg font-medium text-gray-700">
        Drop your PDF here
      </p>
      <p className="mb-4 text-sm text-gray-500">or click to browse</p>
      <label>
        <input
          type="file"
          accept=".pdf,application/pdf"
          onChange={handleFileInput}
          className="hidden"
          disabled={isUploading}
        />
        <span className="cursor-pointer rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
          Select PDF
        </span>
      </label>
      <p className="mt-4 text-xs text-gray-400">Maximum file size: 50MB</p>
    </div>
  );
}
