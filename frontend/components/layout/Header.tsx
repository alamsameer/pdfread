'use client';

import { Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUIStore } from '@/lib/stores/useUIStore';

export function Header() {
  const { openUploadModal } = useUIStore();

  return (
    <header className="border-b border-gray-200 bg-white px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">PDF Reader</h1>
          <p className="text-sm text-gray-500">Interactive document viewer</p>
        </div>
        <Button onClick={openUploadModal} variant="primary">
          <Upload className="mr-2 h-4 w-4" />
          Upload PDF
        </Button>
      </div>
    </header>
  );
}
