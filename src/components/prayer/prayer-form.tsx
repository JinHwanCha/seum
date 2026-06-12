'use client';

import { useState, useEffect } from 'react';
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
}: PrayerFormProps) {
  const [content, setContent] = useState(existingContent || '');
  const [isCellOnly, setIsCellOnly] = useState<boolean>(!!existingIsCellOnly);
  // 기도제목은 텍스트만 편집 — 기존 이미지는 그대로 유지
  const images = existingImages || [];

  useEffect(() => {
    setContent(existingContent || '');
  }, [existingContent]);

  useEffect(() => {
    setIsCellOnly(!!existingIsCellOnly);
  }, [existingIsCellOnly]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = content.trim();
    if (!trimmed) return;

    // Optimistic: notify parent immediately
    onSaved(trimmed, images, isCellOnly);

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
    }).catch(() => {});
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
          <span>소그룹에만 공개 <span className="text-stone-400">(마을 전체엔 공유되지 않음 · 마을장/사역자는 열람 가능)</span></span>
        </label>
        <Button type="submit" size="sm">
          {existingId ? '수정' : '저장'}
        </Button>
      </div>
    </form>
  );
}
