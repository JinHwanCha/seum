'use client';

import { useRef, useState, useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

interface PrayerFormProps {
  weekStart: string;
  existingContent?: string;
  existingImages?: string[];
  existingId?: string;
  existingIsCellOnly?: boolean;
  targetUserName?: string;
  targetUserId?: string;
  onSaved: (content: string, images: string[], isCellOnly: boolean) => void;
  /** 저장 후 textarea 를 비워 '작성 완료'를 체감하게 한다. */
  clearOnSave?: boolean;
  /** 서버 저장이 실제로 반영된 뒤 호출(목록 재검증용). */
  onPersisted?: () => void;
}

export function PrayerForm({
  weekStart,
  existingContent,
  existingImages,
  existingId,
  existingIsCellOnly,
  targetUserName,
  targetUserId,
  onSaved,
  clearOnSave = false,
  onPersisted,
}: PrayerFormProps) {
  const [content, setContent] = useState(existingContent || '');
  const [isCellOnly, setIsCellOnly] = useState<boolean>(!!existingIsCellOnly);
  // 기도제목은 텍스트만 편집 — 기존 이미지는 그대로 유지
  const images = existingImages || [];

  // 방금 저장해 비운 내용이 부모/서버에서 되돌아와도 textarea 를 다시 채우지 않게 하는 가드
  const justClearedRef = useRef<string | null>(null);

  useEffect(() => {
    if (
      clearOnSave &&
      justClearedRef.current !== null &&
      (existingContent || '') === justClearedRef.current
    ) {
      return;
    }
    setContent(existingContent || '');
  }, [existingContent, clearOnSave]);

  useEffect(() => {
    setIsCellOnly(!!existingIsCellOnly);
  }, [existingIsCellOnly]);

  // 주차가 바뀌면 가드를 해제해 새 주차 내용이 정상적으로 채워지도록 한다.
  useEffect(() => {
    justClearedRef.current = null;
  }, [weekStart]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = content.trim();
    if (!trimmed) return;

    // Optimistic: notify parent immediately
    onSaved(trimmed, images, isCellOnly);

    if (clearOnSave) {
      justClearedRef.current = trimmed;
      setContent('');
    }

    // Fire-and-forget API call
    const url = existingId
      ? `/api/prayer-requests/${existingId}`
      : '/api/prayer-requests';
    const method = existingId ? 'PATCH' : 'POST';

    fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: trimmed,
        images,
        weekStart,
        targetUserId: targetUserId || undefined,
        isCellOnly,
      }),
    })
      .then((res) => {
        if (res.ok) onPersisted?.();
      })
      .catch(() => {});
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {targetUserName && (
        <p className="text-sm text-stone-500">
          <span className="font-medium text-stone-700">{targetUserName}</span>님의 기도제목
        </p>
      )}
      <Textarea
        placeholder="기도제목을 입력하세요..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={3}
      />
      <div className="flex items-center justify-between gap-2">
        <label className="flex items-center gap-2 text-xs text-stone-600 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={isCellOnly}
            onChange={(e) => setIsCellOnly(e.target.checked)}
            className="h-4 w-4 rounded border-stone-300 text-primary-600 focus:ring-primary-500"
          />
          <span>소그룹에만 공개 <span className="text-stone-400">(마을장/사역자는 열람 가능)</span></span>
        </label>
        <Button type="submit" size="sm">
          {existingId ? '수정' : '저장'}
        </Button>
      </div>
    </form>
  );
}
