'use client';

import { useRef, useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Pencil, Trash2, ArrowLeft, ChevronUp, ChevronDown, X, ImagePlus, Loader2, ArrowDownUp } from 'lucide-react';
import { compressImages, MAX_IMAGES_PER_POST, MAX_IMAGE_BYTES } from '@/lib/image-utils';
import { GatheringThumb, splitName } from './gathering-shared';
import type { GatheringItem } from '@/lib/types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  gatherings: GatheringItem[];
  onChanged: () => void;
}

type FormState = {
  name: string;
  type: string;
  leader: string;
  kakaoId: string;
  imageUrl: string;
  images: string[];
  link: string;
  buttonLabel: string;
  content: string;
  disabled: boolean;
};

const EMPTY_FORM: FormState = {
  name: '',
  type: '',
  leader: '',
  kakaoId: '',
  imageUrl: '',
  images: [],
  link: '',
  buttonLabel: '',
  content: '',
  disabled: false,
};

function toForm(item: GatheringItem): FormState {
  return {
    name: item.name,
    type: item.type,
    leader: item.leader,
    kakaoId: item.kakaoId,
    imageUrl: item.imageUrl,
    // 기존 배너(bannerUrl)가 있으면 첫 슬라이드로 자연스럽게 이전시킨다.
    images:
      item.images && item.images.length > 0
        ? item.images
        : item.bannerUrl
        ? [item.bannerUrl]
        : [],
    link: item.link,
    buttonLabel: item.buttonLabel,
    content: item.content,
    disabled: item.disabled,
  };
}

/** 순서 있는 이미지 편집기: 추가 · 삭제 · 순서 이동 · 역순 정렬 */
function ImagesEditor({
  images,
  onChange,
}: {
  images: string[];
  onChange: (imgs: string[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const max = MAX_IMAGES_PER_POST;
  const remaining = Math.max(0, max - images.length);

  const addFiles = async (list: FileList | null) => {
    if (!list || list.length === 0) return;
    setError('');
    const files = Array.from(list).slice(0, remaining);
    if (files.length === 0) {
      setError(`이미지는 최대 ${max}장까지 첨부할 수 있어요.`);
      return;
    }
    setBusy(true);
    try {
      const compressed = await compressImages(files, MAX_IMAGE_BYTES);
      if (compressed.length > 0) onChange([...images, ...compressed]);
      else setError('이미지를 처리하지 못했어요. 다른 사진을 시도해 주세요.');
    } catch {
      setError('이미지를 처리하지 못했어요.');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const move = (idx: number, dir: -1 | 1) => {
    const j = idx + dir;
    if (j < 0 || j >= images.length) return;
    const next = images.slice();
    [next[idx], next[j]] = [next[j], next[idx]];
    onChange(next);
  };

  const removeAt = (idx: number) => {
    const next = images.slice();
    next.splice(idx, 1);
    onChange(next);
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-stone-700">
          상세 이미지 <span className="text-stone-400">({images.length}/{max}·순서대로 표시)</span>
        </label>
        {images.length > 1 && (
          <button
            type="button"
            onClick={() => onChange(images.slice().reverse())}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-stone-500 hover:bg-stone-100 hover:text-stone-700"
          >
            <ArrowDownUp size={13} /> 역순 정렬
          </button>
        )}
      </div>

      <div className="space-y-2">
        {images.map((src, idx) => (
          <div key={idx} className="flex items-center gap-2 rounded-lg border border-stone-200 p-2">
            <span className="w-5 shrink-0 text-center text-xs font-semibold text-stone-400">
              {idx + 1}
            </span>
            <div className="h-14 w-14 shrink-0 overflow-hidden rounded-md border border-stone-200 bg-stone-50">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="h-full w-full object-cover" />
            </div>
            <div className="ml-auto flex items-center gap-1">
              <button
                type="button"
                onClick={() => move(idx, -1)}
                disabled={idx === 0}
                aria-label="앞으로"
                className="rounded-md p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-600 disabled:opacity-30"
              >
                <ChevronUp size={16} />
              </button>
              <button
                type="button"
                onClick={() => move(idx, 1)}
                disabled={idx === images.length - 1}
                aria-label="뒤로"
                className="rounded-md p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-600 disabled:opacity-30"
              >
                <ChevronDown size={16} />
              </button>
              <button
                type="button"
                onClick={() => removeAt(idx)}
                aria-label="삭제"
                className="rounded-md p-1.5 text-stone-400 hover:bg-red-50 hover:text-red-600"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {images.length < max && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-stone-300 py-3 text-sm text-stone-500 transition-colors hover:border-primary-400 hover:text-primary-600 disabled:opacity-50"
        >
          {busy ? <Loader2 size={16} className="animate-spin" /> : <ImagePlus size={16} />}
          사진 추가
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => addFiles(e.target.files)}
      />

      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

export function GatheringManager({ isOpen, onClose, gatherings, onChanged }: Props) {
  // null = 목록, 'new' = 새로 추가, GatheringItem = 수정
  const [editing, setEditing] = useState<GatheringItem | 'new' | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const dbItems = gatherings.filter((g) => g.source === 'db');
  const sheetCount = gatherings.filter((g) => g.source === 'sheet').length;

  const openNew = () => {
    setForm(EMPTY_FORM);
    setError('');
    setEditing('new');
  };

  const openEdit = (item: GatheringItem) => {
    setForm(toForm(item));
    setError('');
    setEditing(item);
  };

  const backToList = () => {
    setEditing(null);
    setError('');
  };

  const handleClose = () => {
    setEditing(null);
    setError('');
    onClose();
  };

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSave = async () => {
    if (!form.name.trim()) {
      setError('모임 이름을 입력해주세요.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const isNew = editing === 'new';
      const url = isNew ? '/api/gatherings' : `/api/gatherings/${(editing as GatheringItem).id}`;
      const res = await fetch(url, {
        method: isNew ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || '저장에 실패했습니다.');
      }
      onChanged();
      backToList();
    } catch (e) {
      setError(e instanceof Error ? e.message : '저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: GatheringItem) => {
    if (!confirm(`"${splitName(item.name).title || item.name}" 모임을 삭제할까요?`)) return;
    try {
      const res = await fetch(`/api/gatherings/${item.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      onChanged();
    } catch {
      alert('삭제에 실패했습니다.');
    }
  };

  const isForm = editing !== null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={isForm ? (editing === 'new' ? '새 모임 추가' : '모임 수정') : '모임 관리'}
    >
      {!isForm ? (
        <div className="space-y-4">
          <Button onClick={openNew} className="w-full">
            <Plus size={16} className="mr-1.5" /> 새 모임 추가
          </Button>

          <div className="space-y-2">
            {dbItems.length === 0 ? (
              <p className="py-6 text-center text-sm text-stone-400">
                직접 등록한 모임이 없습니다.
                <br />
                위 버튼으로 첫 모임을 추가해보세요.
              </p>
            ) : (
              dbItems.map((item) => {
                const { title } = splitName(item.name);
                return (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 rounded-xl border border-stone-200 p-2.5"
                  >
                    <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg bg-stone-50">
                      <GatheringThumb imageUrl={item.imageUrl} alt={item.name} iconSize={18} emojiClassName="text-xl" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-stone-800">{title}</p>
                      {item.type && <p className="truncate text-xs text-stone-400">{item.type}</p>}
                    </div>
                    {item.disabled && (
                      <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-medium text-stone-500">
                        마감
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => openEdit(item)}
                      aria-label="수정"
                      className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-600"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(item)}
                      aria-label="삭제"
                      className="rounded-lg p-1.5 text-stone-400 hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {sheetCount > 0 && (
            <p className="rounded-lg bg-stone-50 px-3 py-2.5 text-xs leading-relaxed text-stone-500">
              구글 시트에서 불러온 모임 {sheetCount}개는 여기서 수정되지 않습니다. 시트를 직접
              편집하면 자동으로 반영됩니다.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <Input
            label="모임 이름 *"
            placeholder="예: [⭐찬양팀] 찬양팀원 모집"
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="모임 종류"
              placeholder="찬양팀"
              value={form.type}
              onChange={(e) => set('type', e.target.value)}
            />
            <Input
              label="모임장"
              placeholder="홍길동"
              value={form.leader}
              onChange={(e) => set('leader', e.target.value)}
            />
          </div>
          <Input
            label="카톡 ID"
            placeholder="kakao_id"
            value={form.kakaoId}
            onChange={(e) => set('kakaoId', e.target.value)}
          />
          <Input
            label="아이콘 (이모지 또는 이미지 URL)"
            placeholder="🎤  또는  https://.../icon.png"
            value={form.imageUrl}
            onChange={(e) => set('imageUrl', e.target.value)}
          />
          <ImagesEditor images={form.images} onChange={(imgs) => set('images', imgs)} />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="모임 링크"
              placeholder="https://..."
              value={form.link}
              onChange={(e) => set('link', e.target.value)}
            />
            <Input
              label="버튼 이름"
              placeholder="신청하기"
              value={form.buttonLabel}
              onChange={(e) => set('buttonLabel', e.target.value)}
            />
          </div>
          <Textarea
            label="모임 내용"
            placeholder="모임 소개, 일정, 신청 방법 등"
            rows={5}
            value={form.content}
            onChange={(e) => set('content', e.target.value)}
          />
          <label className="flex items-center gap-2 text-sm text-stone-700">
            <input
              type="checkbox"
              checked={form.disabled}
              onChange={(e) => set('disabled', e.target.checked)}
              className="h-4 w-4 rounded border-stone-300 text-primary-600 focus:ring-primary-500"
            />
            신청 마감 (버튼 비활성화)
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-2 pt-1">
            <Button variant="secondary" onClick={backToList} className="flex-1">
              <ArrowLeft size={16} className="mr-1.5" /> 목록
            </Button>
            <Button onClick={handleSave} loading={saving} className="flex-[2]">
              저장
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
