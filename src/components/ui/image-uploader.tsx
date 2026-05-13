'use client';

import { useRef, useState } from 'react';
import { ImagePlus, X, Loader2 } from 'lucide-react';
import { compressImages, MAX_IMAGES_PER_POST, MAX_IMAGE_BYTES } from '@/lib/image-utils';

interface ImageUploaderProps {
  images: string[];
  onChange: (images: string[]) => void;
  max?: number;
  /** 작은 변형: 기도제목용 등 */
  compact?: boolean;
}

export function ImageUploader({
  images,
  onChange,
  max = MAX_IMAGES_PER_POST,
  compact = false,
}: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const remaining = Math.max(0, max - images.length);

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setError('');
    const files = Array.from(fileList).slice(0, remaining);
    if (files.length === 0) {
      setError(`이미지는 최대 ${max}장까지 첨부할 수 있어요.`);
      return;
    }
    setBusy(true);
    try {
      const compressed = await compressImages(files, MAX_IMAGE_BYTES);
      if (compressed.length === 0) {
        setError('이미지를 처리하지 못했어요. 다른 사진을 시도해 주세요.');
      } else {
        onChange([...images, ...compressed]);
      }
    } catch {
      setError('이미지를 처리하지 못했어요.');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const removeAt = (idx: number) => {
    const next = images.slice();
    next.splice(idx, 1);
    onChange(next);
  };

  const thumbSize = compact ? 'h-16 w-16' : 'h-20 w-20';
  const buttonSize = compact ? 'h-16 w-16' : 'h-20 w-20';

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {images.map((src, idx) => (
          <div
            key={idx}
            className={`relative ${thumbSize} rounded-lg overflow-hidden border border-stone-200 bg-stone-50`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt="" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => removeAt(idx)}
              className="absolute top-0.5 right-0.5 rounded-full bg-stone-900/70 text-white p-0.5 hover:bg-stone-900"
              aria-label="이미지 삭제"
            >
              <X size={12} />
            </button>
          </div>
        ))}

        {images.length < max && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className={`${buttonSize} flex flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-stone-300 text-stone-500 hover:border-primary-400 hover:text-primary-600 transition-colors disabled:opacity-50`}
          >
            {busy ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <>
                <ImagePlus size={18} />
                <span className="text-[10px] leading-none">사진</span>
              </>
            )}
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
