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
  onSaved: () => void;
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setContent(existingContent || '');
  }, [existingContent]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setLoading(true);
    setError('');

    try {
      const url = existingId
        ? `/api/prayer-requests/${existingId}`
        : '/api/prayer-requests';
      const method = existingId ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: content.trim(),
          weekStart,
          targetUserId: targetUserId || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || '저장에 실패했습니다.');
        return;
      }

      onSaved();
    } catch {
      setError('저장에 실패했습니다.');
    } finally {
      setLoading(false);
    }
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
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex justify-end">
        <Button type="submit" loading={loading} size="sm">
          {existingId ? '수정' : '저장'}
        </Button>
      </div>
    </form>
  );
}
