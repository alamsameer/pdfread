'use client';

import { useMemo } from 'react';
import { useAnnotationStore } from '@/lib/stores/useAnnotationStore';
import { useDocumentStore } from '@/lib/stores/useDocumentStore';
import { Trash2, StickyNote } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AnnotationPanelProps {
  docId: string;
  onEditAnnotation: (annotationId: string) => void;
  onDeleteAnnotation: (annotationId: string) => void;
}

export function AnnotationPanel({
  docId,
  onEditAnnotation,
  onDeleteAnnotation,
}: AnnotationPanelProps) {
  const annotations = useAnnotationStore((state) => state.annotations);
  const currentDocument = useDocumentStore((state) => state.currentDocument);

  const documentAnnotations = useMemo(
    () => annotations.filter((ann) => ann.doc_id === docId),
    [annotations, docId]
  );

  if (documentAnnotations.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-4 text-center text-sm text-gray-500">
        No annotations yet. Select some text to create a highlight.
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4">
        <h3 className="mb-4 text-lg font-semibold text-gray-800">Annotations</h3>
        <div className="space-y-3">
          {documentAnnotations.map((annotation) => (
            <div
              key={annotation.id}
              className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm transition-shadow hover:shadow-md"
            >
              {/* Color indicator */}
              <div className="mb-2 flex items-center gap-2">
                <div
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: annotation.color }}
                />
                <span className="text-xs text-gray-500">
                  Block {annotation.block_id.slice(0, 8)}...
                </span>
              </div>

              {/* Note */}
              {annotation.note && (
                <div className="mb-2 flex items-start gap-2">
                  <StickyNote className="h-4 w-4 flex-shrink-0 text-gray-400" />
                  <p className="flex-1 text-sm text-gray-700">{annotation.note}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  onClick={() => onEditAnnotation(annotation.id)}
                  variant="ghost"
                  className="h-8 flex-1 text-xs"
                >
                  Edit
                </Button>
                <Button
                  onClick={() => onDeleteAnnotation(annotation.id)}
                  variant="ghost"
                  className="h-8 text-xs text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
