'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import type { BoardCategory, Post } from '@/lib/types';

interface PostFormProps {
  boardType: string;
  existingPost?: Post;
}

export function PostForm({ boardType, existingPost }: PostFormProps) {
  const router = useRouter();
  const params = useParams();
  const basePath = `/${params.church}/${params.department}`;

  const [title, setTitle] = useState(existingPost?.title || '');
  const [content, setContent] = useState(existingPost?.content || '');
  const [categoryId, setCategoryId] = useState(existingPost?.category_id || '');
  const [gatheringType, setGatheringType] = useState(existingPost?.gathering_type || '');
  const [categories, setCategories] = useState<BoardCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (boardType === 'sharing' || boardType === 'gathering') {
      fetch(`/api/admin/categories?boardType=${boardType}`)
        .then((r) => r.json())
        .then((data) => setCategories(data.categories || []))
        .catch(() => {});
    }
  }, [boardType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    setLoading(true);
    setError('');

    try {
      const url = existingPost
        ? `/api/posts/${existingPost.id}`
        : '/api/posts';
      const method = existingPost ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          content: content.trim(),
          boardType,
          categoryId: categoryId || null,
          gatheringType: gatheringType || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || '저장에 실패했습니다.');
        return;
      }

      const data = await res.json();
      router.push(`${basePath}/boards/${boardType}/${data.post?.id || existingPost?.id}`);
      router.refresh();
    } catch {
      setError('저장에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="제목"
        placeholder="제목을 입력하세요"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        required
      />

      {boardType === 'gathering' && (
        <Input
          label="어떤 모임인가요? (선택)"
          placeholder="예: 등산, 캠핑, 전도, 러닝..."
          value={gatheringType}
          onChange={(e) => setGatheringType(e.target.value)}
        />
      )}

      {categories.length > 0 && (
        <Select
          label="카테고리 (선택)"
          options={categories.map((c) => ({ value: c.id, label: c.name }))}
          placeholder="카테고리 선택"
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
        />
      )}

      <Textarea
        label="내용"
        placeholder="내용을 입력하세요"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={8}
        required
      />

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={() => router.back()}>
          취소
        </Button>
        <Button type="submit" loading={loading}>
          {existingPost ? '수정' : '작성'}
        </Button>
      </div>
    </form>
  );
}
