'use client';

import { useEffect, useRef } from 'react';

/**
 * 가로 스크롤 컨테이너에 마우스 드래그 + 휠(세로→가로) 스크롤을 부여.
 * 모바일 터치 스크롤은 브라우저 기본 동작을 그대로 사용.
 */
export function useDragScroll<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let isDown = false;
    let startX = 0;
    let startScroll = 0;
    let moved = false;

    const onPointerDown = (e: PointerEvent) => {
      // 마우스 좌클릭만, 터치는 네이티브 스크롤에 양보
      if (e.pointerType === 'touch') return;
      if (e.button !== 0) return;
      isDown = true;
      moved = false;
      startX = e.clientX;
      startScroll = el.scrollLeft;
      el.style.cursor = 'grabbing';
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDown) return;
      const dx = e.clientX - startX;
      if (Math.abs(dx) > 3) moved = true;
      el.scrollLeft = startScroll - dx;
    };

    const endDrag = () => {
      if (!isDown) return;
      isDown = false;
      el.style.cursor = '';
    };

    // 드래그 직후 발생하는 click이 버튼을 활성화시키지 않도록 가로채기
    const onClickCapture = (e: MouseEvent) => {
      if (moved) {
        e.stopPropagation();
        e.preventDefault();
        moved = false;
      }
    };

    // 휠 세로 입력을 가로 스크롤로 변환 (트랙패드 가로 입력은 유지)
    const onWheel = (e: WheelEvent) => {
      if (e.deltaY !== 0 && Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        const max = el.scrollWidth - el.clientWidth;
        if (max <= 0) return;
        const next = el.scrollLeft + e.deltaY;
        if (next >= 0 && next <= max) {
          e.preventDefault();
          el.scrollLeft = next;
        }
      }
    };

    el.addEventListener('pointerdown', onPointerDown);
    el.addEventListener('pointermove', onPointerMove);
    el.addEventListener('pointerup', endDrag);
    el.addEventListener('pointerleave', endDrag);
    el.addEventListener('pointercancel', endDrag);
    el.addEventListener('click', onClickCapture, true);
    el.addEventListener('wheel', onWheel, { passive: false });

    return () => {
      el.removeEventListener('pointerdown', onPointerDown);
      el.removeEventListener('pointermove', onPointerMove);
      el.removeEventListener('pointerup', endDrag);
      el.removeEventListener('pointerleave', endDrag);
      el.removeEventListener('pointercancel', endDrag);
      el.removeEventListener('click', onClickCapture, true);
      el.removeEventListener('wheel', onWheel);
    };
  }, []);

  return ref;
}
