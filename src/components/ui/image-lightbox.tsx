'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

interface ImageLightboxProps {
  images: string[];
  startIndex?: number;
  open: boolean;
  onClose: () => void;
}

export function ImageLightbox({ images, startIndex = 0, open, onClose }: ImageLightboxProps) {
  const [index, setIndex] = useState(startIndex);
  const [drag, setDrag] = useState(0);
  const pointerStart = useRef<{ x: number; y: number; id: number } | null>(null);
  const pointerMoved = useRef(false);

  useEffect(() => {
    if (open) setIndex(startIndex);
  }, [open, startIndex]);

  const total = images.length;

  const goPrev = useCallback(() => {
    setIndex((i) => (i - 1 + total) % total);
  }, [total]);

  const goNext = useCallback(() => {
    setIndex((i) => (i + 1) % total);
  }, [total]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft') goPrev();
      else if (e.key === 'ArrowRight') goNext();
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose, goPrev, goNext]);

  if (!open || total === 0) return null;

  // Pointer 기반 — 마우스 / 터치 / 펜 모두 동일하게 처리
  const onPointerDown = (e: React.PointerEvent) => {
    pointerStart.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
    pointerMoved.current = false;
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!pointerStart.current || pointerStart.current.id !== e.pointerId) return;
    const dx = e.clientX - pointerStart.current.x;
    const dy = e.clientY - pointerStart.current.y;
    if (Math.abs(dx) > 6 || Math.abs(dy) > 6) pointerMoved.current = true;
    if (Math.abs(dx) > Math.abs(dy)) setDrag(dx);
  };
  const finishPointer = (e: React.PointerEvent) => {
    if (!pointerStart.current || pointerStart.current.id !== e.pointerId) {
      setDrag(0);
      return;
    }
    const dx = e.clientX - pointerStart.current.x;
    const dy = e.clientY - pointerStart.current.y;
    pointerStart.current = null;
    setDrag(0);

    const threshold = 50;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > threshold) {
      if (dx > 0) goPrev();
      else goNext();
      return;
    }

    // 거의 안 움직인 = 탭. 인터랙티브 요소가 아니면 닫기
    if (!pointerMoved.current) {
      const target = e.target as HTMLElement | null;
      if (target && target.closest('[data-lightbox-stop]')) return;
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/90 select-none touch-none"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={finishPointer}
      onPointerCancel={() => {
        pointerStart.current = null;
        setDrag(0);
      }}
    >
      {/* Top bar */}
      <div className="absolute top-0 inset-x-0 flex items-center justify-between p-3 text-white/90 text-sm z-10">
        <span data-lightbox-stop className="px-2 py-1 rounded-md bg-white/10">
          {index + 1} / {total}
        </span>
        <button
          data-lightbox-stop
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={onClose}
          className="p-2 rounded-full bg-white/10 hover:bg-white/20"
          aria-label="닫기"
        >
          <X size={20} />
        </button>
      </div>

      {/* Prev / Next (desktop) */}
      {total > 1 && (
        <>
          <button
            data-lightbox-stop
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={goPrev}
            className="hidden sm:flex absolute left-3 top-1/2 -translate-y-1/2 h-10 w-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white z-10"
            aria-label="이전"
          >
            <ChevronLeft size={22} />
          </button>
          <button
            data-lightbox-stop
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={goNext}
            className="hidden sm:flex absolute right-3 top-1/2 -translate-y-1/2 h-10 w-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white z-10"
            aria-label="다음"
          >
            <ChevronRight size={22} />
          </button>
        </>
      )}

      {/* 이미지 — 화면 전체를 덮지 않으므로 주변 빈 공간 탭으로 닫기 가능 */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          data-lightbox-stop
          src={images[index]}
          alt=""
          draggable={false}
          style={{
            transform: `translateX(${drag}px)`,
            transition: drag === 0 ? 'transform 200ms ease' : 'none',
          }}
          className="max-h-[85vh] max-w-[92vw] object-contain rounded-lg shadow-2xl pointer-events-auto"
        />
      </div>

      {/* 도트 — 누르면 해당 인덱스로 이동 */}
      {total > 1 && (
        <div className="absolute bottom-4 inset-x-0 flex items-center justify-center gap-2 z-10">
          {images.map((_, i) => (
            <button
              key={i}
              data-lightbox-stop
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => setIndex(i)}
              aria-label={`${i + 1}번째 이미지`}
            >
              <span
                className={`block p-1.5 h-1.5 rounded-full transition-all ${
                  i === index ? 'w-5 bg-white' : 'w-1.5 bg-white/40'
                }`}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
