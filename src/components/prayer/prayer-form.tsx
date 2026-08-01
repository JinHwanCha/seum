'use client';

import { useState, useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

type PrayerVisibility = 'all' | 'cell' | 'pastor';

interface PrayerFormProps {
  weekStart: string;
  existingContent?: string;
  existingImages?: string[];
  existingId?: string;
  existingIsCellOnly?: boolean;
  existingIsPastorOnly?: boolean;
  targetUserName?: string;
  targetUserId?: string;
  onSaved: (
    content: string,
    images: string[],
    isCellOnly: boolean,
    isPastorOnly: boolean
  ) => void;
}

const VISIBILITY_OPTIONS: { key: PrayerVisibility; label: string; desc: string }[] = [
  { key: 'all', label: '전체', desc: '같은 마을 전체가 열람할 수 있습니다.' },
  { key: 'cell', label: '소그룹', desc: '같은 소그룹원과 마을장·사역자만 열람할 수 있습니다.' },
  { key: 'pastor', label: '목사님', desc: '사역자(목사님)만 열람할 수 있습니다.' },
];

function toVisibility(isCellOnly?: boolean, isPastorOnly?: boolean): PrayerVisibility {
  if (isPastorOnly) return 'pastor';
  if (isCellOnly) return 'cell';
  return 'all';
}

export function PrayerForm({
  weekStart,
  existingContent,
  existingImages,
  existingId,
  existingIsCellOnly,
  existingIsPastorOnly,
  targetUserName,
  targetUserId,
  onSaved,
}: PrayerFormProps) {
  const [content, setContent] = useState(existingContent || '');
  const [visibility, setVisibility] = useState<PrayerVisibility>(
    toVisibility(existingIsCellOnly, existingIsPastorOnly)
  );
  // 기도제목은 텍스트만 편집 — 기존 이미지는 그대로 유지
  const images = existingImages || [];

  useEffect(() => {
    setContent(existingContent || '');
  }, [existingContent]);

  useEffect(() => {
    setVisibility(toVisibility(existingIsCellOnly, existingIsPastorOnly));
  }, [existingIsCellOnly, existingIsPastorOnly]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = content.trim();
    if (!trimmed) return;

    const isCellOnly = visibility === 'cell';
    const isPastorOnly = visibility === 'pastor';

    // Optimistic: notify parent immediately
    onSaved(trimmed, images, isCellOnly, isPastorOnly);

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
        isPastorOnly,
      }),
    }).catch(() => {});
  };

  const activeDesc = VISIBILITY_OPTIONS.find((o) => o.key === visibility)?.desc;

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
      <div className="space-y-1.5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-stone-500">공개 범위</span>
          <div className="inline-flex rounded-lg border border-stone-200 bg-stone-50 p-0.5">
            {VISIBILITY_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => setVisibility(opt.key)}
                className={
                  'px-3 py-1 text-xs rounded-md transition-colors ' +
                  (visibility === opt.key
                    ? 'bg-white text-primary-700 shadow-sm font-medium'
                    : 'text-stone-500 hover:text-stone-700')
                }
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        {activeDesc && <p className="text-[11px] text-stone-400">{activeDesc}</p>}
      </div>
      <div className="flex justify-end">
        <Button type="submit" size="sm">
          {existingId ? '수정' : '저장'}
        </Button>
      </div>
    </form>
  );
}
