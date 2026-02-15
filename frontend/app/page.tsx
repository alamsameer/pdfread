'use client';

import { useEffect, useState, useMemo } from 'react';
import { DocumentCard } from '@/components/layout/DocumentCard';
import { FileUploader } from '@/components/upload/FileUploader';
import { Dialog } from '@/components/ui/dialog';
import { useUIStore } from '@/lib/stores/useUIStore';
import { documentsAPI } from '@/lib/api/documents';
import type { Document } from '@/lib/types/document';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/useAuthStore';
import { Loader2, BookOpen, Upload, Coffee, Sun, Sunset, Moon, LogOut, User } from 'lucide-react';

// Time-aware greeting
function useGreeting(userName?: string) {
  const hour = new Date().getHours();

  const greeting = useMemo(() => {
    if (hour < 6) return { text: 'Quiet hours', sub: 'The best stories unfold in stillness.', icon: Moon, period: 'night' };
    if (hour < 12) return { text: 'Good morning', sub: 'A fresh page awaits you.', icon: Coffee, period: 'morning' };
    if (hour < 17) return { text: 'Good afternoon', sub: 'Lose yourself in a chapter or two.', icon: Sun, period: 'afternoon' };
    if (hour < 21) return { text: 'Good evening', sub: 'Unwind with your favorite reads.', icon: Sunset, period: 'evening' };
    return { text: 'Good night', sub: 'One more page before you rest?', icon: Moon, period: 'night' };
  }, [hour]);

  const name = userName?.split('@')[0] || '';
  const displayName = name.charAt(0).toUpperCase() + name.slice(1);

  return { ...greeting, displayName };
}

const periodGradients: Record<string, string> = {
  morning:   'linear-gradient(160deg, #fdf6ee 0%, #fef9f3 30%, #f0f4f8 100%)',
  afternoon: 'linear-gradient(160deg, #fdf8f0 0%, #fef6e8 30%, #f5f0e6 100%)',
  evening:   'linear-gradient(160deg, #f5f0e8 0%, #ede4d8 30%, #e8ddd0 100%)',
  night:     'linear-gradient(160deg, #eae6e0 0%, #e0dbd4 30%, #d8d3cc 100%)',
};

export default function HomePage() {
  const router = useRouter();
  const { user, isLoading: isAuthLoading, initialize, signOut } = useAuthStore();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shouldRefetch, setShouldRefetch] = useState(false);
  const { isUploadModalOpen, closeUploadModal, openUploadModal } = useUIStore();
  const [isBarHovered, setIsBarHovered] = useState(false);

  const { text: greetingText, sub: greetingSub, icon: GreetingIcon, displayName, period } = useGreeting(user?.email);

  useEffect(() => { initialize(); }, [initialize]);

  useEffect(() => {
    if (!isAuthLoading && !user) router.push('/login');
  }, [isAuthLoading, user, router]);

  const fetchDocuments = async () => {
    if (!user) return;
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

  useEffect(() => { if (user) fetchDocuments(); }, [shouldRefetch, user]);

  const handleDocumentDeleted = () => setShouldRefetch((prev) => !prev);

  const handleLogout = async () => {
    await signOut();
    router.push('/login');
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center pb-24"
      style={{ background: periodGradients[period] || periodGradients.morning }}
    >
      {/* ── Centered Content ── */}
      <main className="w-full max-w-5xl px-4 sm:px-6 pt-10 sm:pt-16 flex flex-col items-center">

        {/* ── Greeting Hero (centered) ── */}
        <div className="text-center mb-8 sm:mb-12 max-w-xl">
          <div className="flex items-center justify-center gap-2 mb-3">
            <GreetingIcon className="h-5 w-5" style={{ color: '#b49a6e' }} />
            <span
              className="text-sm font-medium tracking-wide uppercase"
              style={{ color: '#b49a6e', letterSpacing: '0.08em' }}
            >
              {greetingText}
            </span>
          </div>
          <h2
            className="text-2xl sm:text-4xl font-bold tracking-tight"
            style={{ color: '#2c2520', fontFamily: "'Merriweather', Georgia, serif" }}
          >
            {displayName ? `${displayName}, ` : ''}what will you<br className="hidden sm:block" /> read today?
          </h2>
          <p className="mt-2 sm:mt-3 text-sm sm:text-base" style={{ color: '#8a7e72' }}>
            {greetingSub}
          </p>
        </div>

        {/* ── Content ── */}
        {isLoading ? (
          <div className="flex min-h-[300px] items-center justify-center">
            <div className="text-center">
              <Loader2 className="mx-auto h-8 w-8 animate-spin" style={{ color: '#b49a6e' }} />
              <p className="mt-4 text-sm" style={{ color: '#a09486' }}>Loading your library…</p>
            </div>
          </div>
        ) : error ? (
          <div className="w-full rounded-xl border border-red-200 bg-red-50/80 p-5 text-red-700 backdrop-blur-sm">
            {error}
          </div>
        ) : documents.length === 0 ? (
          <div
            className="max-w-lg rounded-2xl p-12 text-center"
            style={{
              background: 'rgba(255, 255, 255, 0.5)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(180, 154, 110, 0.15)',
            }}
          >
            <div
              className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full"
              style={{ background: 'rgba(180, 154, 110, 0.1)' }}
            >
              <BookOpen className="h-9 w-9" style={{ color: '#b49a6e' }} />
            </div>
            <h3
              className="mb-2 text-xl font-semibold"
              style={{ color: '#2c2520', fontFamily: "'Merriweather', Georgia, serif" }}
            >
              Your reading nook is empty
            </h3>
            <p className="mb-8 text-sm leading-relaxed" style={{ color: '#8a7e72' }}>
              Every great journey begins with a single page.<br />
              Upload a PDF and settle in.
            </p>
            <button
              onClick={openUploadModal}
              className="inline-flex items-center gap-2 rounded-full px-7 py-3 text-sm font-semibold transition-all duration-200 hover:shadow-lg"
              style={{ background: '#2c2520', color: '#f5f0e8' }}
            >
              <Upload className="h-4 w-4" />
              Upload your first PDF
            </button>
          </div>
        ) : (
          <div className="w-full">
            {/* Section label */}
            <div className="mb-6 flex items-center justify-center gap-2">
              <BookOpen className="h-4 w-4" style={{ color: '#a09486' }} />
              <span className="text-sm font-medium" style={{ color: '#a09486' }}>
                Your Library · {documents.length} {documents.length === 1 ? 'book' : 'books'}
              </span>
            </div>

            {/* Document Grid */}
            <div className="grid gap-5 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {documents.map((doc) => (
                <DocumentCard
                  key={doc.id}
                  document={doc}
                  onDelete={handleDocumentDeleted}
                />
              ))}
            </div>
          </div>
        )}
      </main>

      {/* ── Footer whisper ── */}
      <footer className="mt-auto pt-16 pb-4 text-center">
        <p className="text-xs" style={{ color: '#c4b8a8' }}>
          There is no friend as loyal as a book.
        </p>
      </footer>

      {/* ═══ Floating Bottom Bar ═══ */}
      <div className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2">
        <div
          className="flex items-center gap-1 rounded-full border border-gray-200 bg-white/95 px-2 p-1.5 shadow-xl backdrop-blur-md transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]"
          onMouseEnter={() => setIsBarHovered(true)}
          onMouseLeave={() => setIsBarHovered(false)}
          style={isBarHovered ? { background: 'rgba(255,255,255,0.98)', boxShadow: '0 8px 40px rgba(44,37,32,0.15)' } : {}}
        >
          {/* Upload */}
          <button
            onClick={openUploadModal}
            className="flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-gray-100"
            style={{ color: '#2c2520' }}
            title="Upload PDF"
          >
            <Upload className="h-5 w-5" />
          </button>

          {/* Expandable section */}
          <div
            className="flex items-center gap-1 overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]"
            style={isBarHovered ? { width: 'auto', opacity: 1 } : { width: 0, opacity: 0 }}
          >
            {/* Divider */}
            <div className="h-6 w-px bg-gray-200 mx-1" />

            {/* User email — hidden on mobile */}
            {user && (
              <div className="hidden sm:flex items-center gap-1.5 px-2 whitespace-nowrap">
                <User className="h-4 w-4" style={{ color: '#8a7e72' }} />
                <span className="text-xs font-medium" style={{ color: '#8a7e72' }}>
                  {user.email}
                </span>
              </div>
            )}

            {/* Divider */}
            <div className="h-6 w-px bg-gray-200 mx-1" />

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-red-50"
              style={{ color: '#c47070' }}
              title="Log out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <Dialog isOpen={isUploadModalOpen} onClose={closeUploadModal}>
        <FileUploader />
      </Dialog>
    </div>
  );
}
