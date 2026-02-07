'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { DropZone } from './DropZone';
import { Dialog } from '@/components/ui/dialog';
import { documentsAPI } from '@/lib/api/documents';
import { useUIStore } from '@/lib/stores/useUIStore';
import toast from 'react-hot-toast';

export function FileUploader() {
  const [isUploading, setIsUploading] = useState(false);
  const router = useRouter();
  const { closeUploadModal } = useUIStore();

  const handleFileDrop = async (file: File) => {
    if (file.size > 50 * 1024 * 1024) {
      toast.error('File too large. Maximum size is 50MB.');
      return;
    }

    setIsUploading(true);
    try {
      const result = await documentsAPI.uploadDocument(file);
      toast.success('Document uploaded successfully!');
      closeUploadModal();
      router.push(`/reader/${result.document_id}`);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload document. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center">
      <DropZone onFileDrop={handleFileDrop} isUploading={isUploading} />
      {isUploading && (
        <p className="mt-4 text-sm text-gray-500">Uploading and processing...</p>
      )}
    </div>
  );
}
