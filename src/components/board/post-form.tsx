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

type Visibility = 'all' | 'village';

export function PostForm({ boardType, existingPost }: PostFormProps) {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const basePath = `/${params.church}/${params.department}`;

  const [title, setTitle] = useState(existingPost?.title || '');
  const [content, setContent] = useState(existingPost?.content || '');
  const [categoryId, setCategoryId] = useState(existingPost?.category_id || '');
  // 직접 입력한 카테고리 (DB 저장 X, post.gathering_type 컬럼에 텍스트로만 저장)
  const [customCategory, setCustomCategory] = useState(
    !existingPost?.category_id && existingPost?.gathering_type ? existingPost.gathering_type : ''
  );
  const [useCustomCategory, setUseCustomCategory] = useState(
    !existingPost?.category_id && !!existingPost?.gathering_type
  );
  const [images, setImages] = useState<string[]>(existingPost?.images || []);
  const [visibility, setVisibility] = useState<Visibility>(existingPost?.visibility || 'all');
  const [targetVillageId, setTargetVillageId] = useState<string>(
    existingPost?.village_id || user?.villageId || ''
  );
  const [villages, setVillages] = useState<{ id: string; name: string }[]>([]);
  const [categories, setCategories] = useState<BoardCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 공지 게시판은 항상 전체공개
  const showVisibility = boardType !== 'notice';
  const canPickAnyVillage = user?.role === 'minister' || user?.role === 'village_leader';
  // 마을공개 가능: 본인 마을 있거나, 사역자/마을장 (마을 선택 가능)
  const canPickVillage = !!user?.villageId || canPickAnyVillage;
  // 카테고리 선택 영역은 모든 글쓰기에 노출
  const showCategory = true;

  useEffect(() => {
    if (!showCategory) return;
    fetch(`/api/admin/categories?boardType=${boardType}`)
      .then((r) => (r.ok ? r.json() : { categories: [] }))
      .then((data) => setCategories(data.categories || []))
      .catch(() => {});
  }, [boardType, showCategory]);

  // 사역자/마을장이면 마을 목록 fetch (드롭다운용)
  useEffect(() => {
    if (!showVisibility || !canPickAnyVillage) return;
    fetch('/api/admin/villages')
      .then((r) => (r.ok ? r.json() : { villages: [] }))
      .then((data) => setVillages(data.villages || []))
      .catch(() => {});
  }, [showVisibility, canPickAnyVillage]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    // 마을공개 선택했는데 마을이 정해지지 않았으면 차단
    if (showVisibility && visibility === 'village' && !targetVillageId && !user?.villageId) {
      setError('공개할 마을을 선택해주세요.');
      return;
    }

    setLoading(true);
    setError('');

    // 카테고리 직접 입력은 DB에 저장하지 않고 post.gathering_type 텍스트 컬럼에 보관
    const resolvedCategoryId = useCustomCategory ? null : (categoryId || null);
    const resolvedCustomText = useCustomCategory ? customCategory.trim() : null;

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
          categoryId: resolvedCategoryId,
          gatheringType: resolvedCustomText,
          images,
          visibility: showVisibility ? visibility : 'all',
          villageId: visibility === 'village' ? (targetVillageId || user?.villageId || null) : null,
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

      {showCategory && (
        <div>
          <Select
            label="카테고리 (선택)"
            options={[
              ...categories.map((c) => ({ value: c.id, label: c.name })),
              { value: '__custom__', label: '+ 직접 입력' },
            ]}
            placeholder="카테고리 선택"
            value={useCustomCategory ? '__custom__' : categoryId}
            onChange={(e) => {
              const v = e.target.value;
              if (v === '__custom__') {
                setUseCustomCategory(true);
                setCategoryId('');
              } else {
                setUseCustomCategory(false);
                setCategoryId(v);
              }
            }}
          />
          {useCustomCategory && (
            <Input
              className="mt-2"
              placeholder="카테고리를 직접 입력하세요 (예: 등산, 캠핑, 러닝...)"
              value={customCategory}
              onChange={(e) => setCustomCategory(e.target.value)}
              maxLength={20}
            />
          )}
        </div>
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
              className={`flex items-center justify-center gap-2 p-3 rounded-lg border text-sm transition-colors ${
                visibility === 'all'
                  ? 'border-primary-500 bg-primary-50 text-primary-700'
                  : 'border-stone-200 bg-white text-stone-600 hover:border-stone-300'
              }`}
            >
              <Globe2 size={16} />
              <span className="font-medium">전체</span>
            </button>
            <button
              type="button"
              disabled={!canPickVillage}
              onClick={() => canPickVillage && setVisibility('village')}
              className={`flex items-center justify-center gap-2 p-3 rounded-lg border text-sm transition-colors ${
                visibility === 'village'
                  ? 'border-primary-500 bg-primary-50 text-primary-700'
                  : 'border-stone-200 bg-white text-stone-600 hover:border-stone-300'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
              title={!canPickVillage ? '마을이 배정된 사용자만 선택할 수 있습니다.' : ''}
            >
              <Home size={16} />
              <span className="font-medium">마을</span>
            </button>
          </div>

          {/* 마을공개 선택 시 — 사역자/마을장은 드롭다운, 그 외는 본인 마을 표시 */}
          {visibility === 'village' && (
            <div className="mt-2">
              {canPickAnyVillage ? (
                <Select
                  options={villages.map((v) => ({ value: v.id, label: v.name }))}
                  placeholder="공개할 마을 선택"
                  value={targetVillageId}
                  onChange={(e) => setTargetVillageId(e.target.value)}
                />
              ) : (
                <p className="text-xs text-stone-500">
                  공개 대상: <span className="font-medium text-stone-700">우리 마을</span>
                </p>
              )}
            </div>
          )}

          <p className="text-[11px] text-stone-400 mt-1">
            {visibility === 'village'
              ? '해당 마을 멤버와 사역자/마을장만 볼 수 있어요.'
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
