'use client';

import { useState, useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

interface PrayerFormProps {
  weekStart: string;
  existingContent?: string;
  existingId?: string;
  targetUserName?: string;
  targetUserId?: string;
  onSaved: (content: string) => void;
}

export function PrayerForm({
  weekStart,
  existingContent,
  existingId,
  targetUserName,
  targetUserId,
  onSaved,
}: PrayerFormProps) {
  const [content, setContent] = useState(existingContent || '');

  useEffect(() => {
    setContent(existingContent || '');
  }, [existingContent]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = content.trim();
    if (!trimmed) return;

    // Optimistic: notify parent immediately
    onSaved(trimmed);

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
        weekStart,
        targetUserId: targetUserId || undefined,
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
      <div className="flex justify-end">
        <Button type="submit" size="sm">
          {existingId ? '수정' : '저장'}
        </Button>
      </div>
    </form>
  );
}
