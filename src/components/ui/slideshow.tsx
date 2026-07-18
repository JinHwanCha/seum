'use client';

import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { ImageLightbox } from '@/components/ui/image-lightbox';

interface SlideshowProps {
  images: string[];
  alt?: string;
  /** 이미지 최대 높이 (tailwind). 기본 max-h-72 */
  maxHeightClass?: string;
}

/** 순서 있는 이미지 슬라이드. 좌우 이동 + 점 인디케이터 + 탭 시 전체화면. */
export function Slideshow({ images, alt = '', maxHeightClass = 'max-h-72' }: SlideshowProps) {
  const [index, setIndex] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const total = images.length;

  const cur = total > 0 ? Math.min(index, total - 1) : 0;

  // 인접 슬라이드를 미리 디코딩해 좌우 전환을 즉시 보이게 한다.
  useEffect(() => {
    if (total <= 1) return;
    [cur - 1, cur + 1].forEach((i) => {
      const src = images[(i + total) % total];
      if (src) {
        const img = new Image();
        img.src = src;
      }
    });
  }, [cur, images, total]);

  if (total === 0) return null;

  const go = (dir: -1 | 1) => setIndex((i) => (i + dir + total) % total);

  return (
    <div className="space-y-2">
      <div className="relative flex items-center justify-center overflow-hidden rounded-xl bg-stone-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={images[cur]}
          alt={alt}
          decoding="async"
          onClick={() => setLightbox(true)}
          className={`w-full ${maxHeightClass} cursor-zoom-in object-contain`}
        />
        {total > 1 && (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="이전 이미지"
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-1.5 text-white transition-colors hover:bg-black/60"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="다음 이미지"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-1.5 text-white transition-colors hover:bg-black/60"
            >
              <ChevronRight size={18} />
            </button>
            <span className="absolute bottom-2 right-2 rounded-full bg-black/50 px-2 py-0.5 text-[11px] font-medium text-white">
              {cur + 1} / {total}
            </span>
          </>
        )}
      </div>

      {total > 1 && (
        <div className="flex flex-wrap items-center justify-center gap-1.5">
          {images.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`${i + 1}번 이미지`}
              className={`h-1.5 rounded-full transition-all ${
                i === cur ? 'w-4 bg-primary-500' : 'w-1.5 bg-stone-300'
              }`}
            />
          ))}
        </div>
      )}

      <ImageLightbox images={images} startIndex={cur} open={lightbox} onClose={() => setLightbox(false)} />
    </div>
  );
}
