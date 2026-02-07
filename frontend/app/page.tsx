'use client';

import { useEffect, useState } from 'react';
import { Header } from '@/components/layout/Header';
import { DocumentCard } from '@/components/layout/DocumentCard';
import { FileUploader } from '@/components/upload/FileUploader';
import { Dialog } from '@/components/ui/dialog';
import { useUIStore } from '@/lib/stores/useUIStore';
import { documentsAPI } from '@/lib/api/documents';
import type { Document } from '@/lib/types/document';
import { Loader2 } from 'lucide-react';

export default function HomePage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shouldRefetch, setShouldRefetch] = useState(false);
  const { isUploadModalOpen, closeUploadModal } = useUIStore();

  const fetchDocuments = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await documentsAPI.getDocuments();
      setDocuments(response.documents);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load documents');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [shouldRefetch]);

  const handleDocumentDeleted = () => {
    setShouldRefetch((prev) => !prev);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900">Your Documents</h2>
          <p className="text-gray-600">Upload and read your PDF documents</p>
        </div>

        {isLoading ? (
          <div className="flex min-h-[400px] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
            Error: {error}
          </div>
        ) : documents.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 bg-white p-12 text-center">
            <p className="mb-4 text-lg text-gray-600">No documents yet</p>
            <p className="text-gray-500">Upload a PDF to get started</p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {documents.map((doc) => (
              <DocumentCard
                key={doc.id}
                document={doc}
                onDelete={handleDocumentDeleted}
              />
            ))}
          </div>
        )}
      </main>

      <Dialog isOpen={isUploadModalOpen} onClose={closeUploadModal}>
        <FileUploader />
      </Dialog>
    </div>
  );
}
