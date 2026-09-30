'use client';

import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Camera, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import AvatarCircle from '@/components/shared/AvatarCircle';

const MAX_SIZE = 3 * 1024 * 1024;

export default function AvatarUploader() {
  const t = useTranslations('profile');
  const { user, setUser } = useAuthStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  if (!user) return null;

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error(t('avatarInvalidType'));
      return;
    }
    if (file.size > MAX_SIZE) {
      toast.error(t('avatarTooLarge'));
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('avatar', file);
      const { data } = await api.post('/auth/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setUser(data);
      toast.success(t('avatarUpdated'));
    } catch (err: any) {
      toast.error(err?.response?.data?.error || t('avatarUploadFailed'));
    } finally {
      setUploading(false);
      URL.revokeObjectURL(objectUrl);
      setPreview(null);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="group relative block rounded-full disabled:opacity-70"
      >
        {preview ? (
          <img src={preview} alt={user.username} className="h-20 w-20 rounded-full object-cover shadow-[0_0_16px_rgba(147,51,234,0.3)]" />
        ) : (
          <AvatarCircle name={user.username} avatarUrl={user.avatarUrl} size={80} fontSize={30} />
        )}

        <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/0 opacity-0 transition-all duration-200 group-hover:bg-black/40 group-hover:opacity-100">
          {uploading ? <Loader2 size={20} className="animate-spin text-white" /> : <Camera size={20} className="text-white" />}
        </span>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}