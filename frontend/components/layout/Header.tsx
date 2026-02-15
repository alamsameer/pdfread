'use client';
import { Upload, LogOut, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUIStore } from '@/lib/stores/useUIStore';
import { useAuthStore } from '@/lib/stores/useAuthStore';
import { useRouter } from 'next/navigation';

export function Header() {
  const router = useRouter();
  const { openUploadModal } = useUIStore();
  const { user, signOut } = useAuthStore();

  const handleLogout = async () => {
    await signOut();
    router.push('/login');
  };

  return (
    <header className="border-b border-gray-200 bg-white px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">PDF Reader</h1>
          <p className="text-sm text-gray-500">Interactive document viewer</p>
        </div>
        
        <div className="flex items-center gap-4">
            {user && (
                <div className="flex items-center gap-2 text-sm text-gray-600 mr-4">
                    <User className="h-4 w-4" />
                    <span className="hidden sm:inline">{user.email}</span>
                </div>
            )}
        
            <Button onClick={openUploadModal} variant="primary">
            <Upload className="mr-2 h-4 w-4" />
            Upload PDF
            </Button>
            
            {user && (
                <Button onClick={handleLogout} variant="ghost" className="text-red-600 hover:text-red-700 hover:bg-red-50">
                    <LogOut className="mr-2 h-4 w-4" />
                    Log out
                </Button>
            )}
        </div>
      </div>
    </header>
  );
}
