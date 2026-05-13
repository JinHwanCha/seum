'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Globe2, Home } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { ImageUploader } from '@/components/ui/image-uploader';
import { useAuth } from '@/hooks/use-auth';
import type { BoardCategory, Post } from '@/lib/types';

interface PostFormProps {
  boardType: string;
  existingPost?: Post;
}

export function PostForm({ boardType, existingPost }: PostFormProps) {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const basePath = `/${params.church}/${params.department}`;

  const [title, setTitle] = useState(existingPost?.title || '');
  const [content, setContent] = useState(existingPost?.content || '');
  const [categoryId, setCategoryId] = useState(existingPost?.category_id || '');
  const [gatheringType, setGatheringType] = useState(existingPost?.gathering_type || '');
  const [images, setImages] = useState<string[]>(existingPost?.images || []);
  const [visibility, setVisibility] = useState<'all' | 'village'>(existingPost?.visibility || 'all');
  const [categories, setCategories] = useState<BoardCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 공지 게시판은 항상 전체공개
  const showVisibility = boardType !== 'notice';
  // 마을이 없으면 마을공개 선택 불가
  const canPickVillage = !!user?.villageId;

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
          images,
          visibility: showVisibility ? visibility : 'all',
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
    <form onSubmit={handleSubmit} className="space-y-2">
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

      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1.5">사진 첨부 (선택)</label>
        <ImageUploader images={images} onChange={setImages} />
      </div>

      {showVisibility && (
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1.5">공개 범위</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setVisibility('all')}
              className={`flex items-center gap-2 p-3 rounded-lg border text-sm transition-colors ${
                visibility === 'all'
                  ? 'border-primary-500 bg-primary-50 text-primary-700'
                  : 'border-stone-200 bg-white text-stone-600 hover:border-stone-300'
              }`}
            >
              <Globe2 size={16} />
              <span className="font-medium">전체 공개</span>
            </button>
            <button
              type="button"
              disabled={!canPickVillage}
              onClick={() => canPickVillage && setVisibility('village')}
              className={`flex items-center gap-2 p-3 rounded-lg border text-sm transition-colors ${
                visibility === 'village'
                  ? 'border-primary-500 bg-primary-50 text-primary-700'
                  : 'border-stone-200 bg-white text-stone-600 hover:border-stone-300'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
              title={!canPickVillage ? '마을이 배정된 사용자만 선택할 수 있습니다.' : ''}
            >
              <Home size={16} />
              <span className="font-medium">우리 마을만</span>
            </button>
          </div>
          <p className="text-[11px] text-stone-400 mt-1">
            {visibility === 'village'
              ? '같은 마을 멤버와 사역자만 볼 수 있어요.'
              : '부서 전체 멤버가 볼 수 있어요.'}
          </p>
        </div>
      )}

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
