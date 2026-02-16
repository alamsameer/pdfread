'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Trash2, Clock, BookOpen, MoreVertical } from 'lucide-react';
import type { Document } from '@/lib/types/document';
import { documentsAPI } from '@/lib/api/documents';
import { readingAPI, ReadingStatsResponse } from '@/lib/api/reading';
import { API_BASE_URL } from '@/lib/api/client';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

interface DocumentCardProps {
  document: Document;
  onDelete: () => void;
}

function formatReadingTime(totalSeconds: number): string {
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const minutes = Math.floor(totalSeconds / 60);
  const hours = Math.floor(minutes / 60);
  const remainingMins = minutes % 60;
  if (hours > 0) return `${hours}h ${remainingMins}m`;
  return `${minutes} min${minutes !== 1 ? 's' : ''}`;
}

export function DocumentCard({ document, onDelete }: DocumentCardProps) {
  const router = useRouter();
  const [stats, setStats] = useState<ReadingStatsResponse | null>(null);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState(false);

  // Fetch thumbnail
  useEffect(() => {
    const fetchThumbnail = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) return;

        const response = await fetch(
          `${API_BASE_URL}/api/documents/${document.id}/thumbnail`,
          {
            headers: { Authorization: `Bearer ${session.access_token}` },
          }
        );
        if (response.ok) {
          const blob = await response.blob();
          setThumbnailUrl(URL.createObjectURL(blob));
        }
      } catch {
        // Silently fail — will show fallback gradient
      }
    };
    fetchThumbnail();

    return () => {
      if (thumbnailUrl) URL.revokeObjectURL(thumbnailUrl);
    };
  }, [document.id]);

  // Fetch reading stats
  useEffect(() => {
    readingAPI.getStats(document.id).then(setStats).catch(() => {});
  }, [document.id]);

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Delete this document?')) return;

    try {
      await documentsAPI.deleteDocument(document.id);
      toast.success('Document deleted');
      onDelete();
    } catch {
      toast.error('Failed to delete');
    }
  };

  const handleOpen = () => {
    router.push(`/reader/${document.id}`);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div
      className="group relative cursor-pointer overflow-hidden rounded-2xl transition-all duration-300 hover:-translate-y-1"
      onClick={handleOpen}
      style={{
        aspectRatio: '3 / 4',
        boxShadow: '0 2px 12px rgba(44, 37, 32, 0.08)',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.boxShadow = '0 8px 30px rgba(44, 37, 32, 0.15)')}
      onMouseLeave={(e) => (e.currentTarget.style.boxShadow = '0 2px 12px rgba(44, 37, 32, 0.08)')}
    >
      {/* Cover Image / Background */}
      {thumbnailUrl ? (
        <img
          src={thumbnailUrl}
          alt={document.title}
          className="absolute inset-0 h-full w-full object-cover object-top"
        />
      ) : (
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(135deg, #d4c5a9 0%, #b49a6e 50%, #8a7e72 100%)' }}
        />
      )}

      {/* Top Actions Bar */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-3 opacity-100 sm:opacity-0 transition-opacity duration-200 sm:group-hover:opacity-100">
        <div className="flex items-center gap-1.5">
          {stats && stats.total_seconds > 0 && (
            <span
              className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm"
              style={{ background: 'rgba(44, 37, 32, 0.6)' }}
            >
              <Clock className="h-3 w-3" />
              {formatReadingTime(stats.total_seconds)}
            </span>
          )}
        </div>

        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className="flex h-8 w-8 items-center justify-center rounded-full text-white backdrop-blur-sm transition-colors"
            style={{ background: 'rgba(44, 37, 32, 0.5)' }}
          >
            <MoreVertical className="h-4 w-4" />
          </button>

          {showMenu && (
            <div className="absolute right-0 top-10 z-20 w-36 overflow-hidden rounded-xl bg-white shadow-xl ring-1 ring-black/5">
              <button
                onClick={handleOpen}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
              >
                <BookOpen className="h-4 w-4" />
                Open
              </button>
              <button
                onClick={handleDelete}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Gradient Overlay with Title */}
      <div
        className="absolute inset-x-0 bottom-0 p-4 pt-20"
        style={{ background: 'linear-gradient(to top, rgba(44, 37, 32, 0.85) 0%, rgba(44, 37, 32, 0.5) 50%, transparent 100%)' }}
      >
        <h3
          className="line-clamp-2 text-sm leading-tight text-white drop-shadow-md"
          style={{ fontFamily: "'Merriweather', Georgia, serif", fontWeight: 700 }}
        >
          {document.title.replace(/\.pdf$/i, '')}
        </h3>
        <div className="mt-1.5 flex items-center gap-3 text-xs" style={{ color: 'rgba(255, 255, 255, 0.65)' }}>
          <span>{document.total_pages} pages</span>
          <span>·</span>
          <span>{formatDate(document.created_at)}</span>
        </div>
      </div>
    </div>
  );
}
