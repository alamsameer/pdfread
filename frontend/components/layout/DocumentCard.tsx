'use client';

import { useRouter } from 'next/navigation';
import { FileText, Calendar, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { Document } from '@/lib/types/document';
import { documentsAPI } from '@/lib/api/documents';
import toast from 'react-hot-toast';

interface DocumentCardProps {
  document: Document;
  onDelete: () => void;
}

export function DocumentCard({ document, onDelete }: DocumentCardProps) {
  const router = useRouter();

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this document?')) {
      return;
    }

    try {
      await documentsAPI.deleteDocument(document.id);
      toast.success('Document deleted successfully');
      onDelete();
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete document');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardContent className="p-6">
        <div className="mb-4">
          <FileText className="mb-2 h-10 w-10 text-red-500" />
          <h3 className="truncate text-lg font-semibold text-gray-900" title={document.title}>
            {document.title}
          </h3>
        </div>

        <div className="mb-4 flex items-center gap-4 text-sm text-gray-500">
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            {formatDate(document.created_at)}
          </div>
          <div>{document.total_pages} pages</div>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={() => router.push(`/reader/${document.id}`)}
            variant="primary"
            className="flex-1"
          >
            Open
          </Button>
          <Button onClick={handleDelete} variant="ghost" className="text-red-600 hover:text-red-700">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
