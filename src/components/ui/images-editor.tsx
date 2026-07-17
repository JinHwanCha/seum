'use client';

import { useRef, useState } from 'react';
import { ChevronUp, ChevronDown, X, ImagePlus, Loader2, ArrowDownUp, FileText } from 'lucide-react';
import { compressImages, MAX_IMAGE_BYTES } from '@/lib/image-utils';
import { extractPptxImages, SLIDE_MAX_BYTES, SLIDE_MAX_DIM } from '@/lib/pptx';

interface ImagesEditorProps {
  images: string[];
  onChange: (imgs: string[]) => void;
  max?: number;
  label?: string;
  /** 슬라이드용 고화질 압축 사용 (기본 false = 소형 압축) */
  highQuality?: boolean;
  /** .pptx 에서 이미지 가져오기 버튼 표시 */
  allowPptx?: boolean;
}

/** 순서 있는 이미지 편집기: 추가(이미지/PPT) · 삭제 · 순서 이동 · 역순 정렬 */
export function ImagesEditor({
  images,
  onChange,
  max = 20,
  label = '이미지',
  highQuality = false,
  allowPptx = false,
}: ImagesEditorProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const pptRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const remaining = Math.max(0, max - images.length);

  const maxBytes = highQuality ? SLIDE_MAX_BYTES : MAX_IMAGE_BYTES;
  const maxDim = highQuality ? SLIDE_MAX_DIM : 1024;

  const addImageFiles = async (list: FileList | null) => {
    if (!list || list.length === 0) return;
    setError('');
    const files = Array.from(list).slice(0, remaining);
    if (files.length === 0) {
      setError(`이미지는 최대 ${max}장까지 첨부할 수 있어요.`);
      return;
    }
    setBusy('image');
    try {
      const compressed = await compressImages(files, maxBytes, maxDim);
      if (compressed.length > 0) onChange([...images, ...compressed]);
      else setError('이미지를 처리하지 못했어요. 다른 사진을 시도해 주세요.');
    } catch {
      setError('이미지를 처리하지 못했어요.');
    } finally {
      setBusy('');
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const addPptx = async (list: FileList | null) => {
    const file = list?.[0];
    if (!file) return;
    setError('');
    setBusy('ppt');
    try {
      const extracted = await extractPptxImages(file);
      if (extracted.length === 0) {
        setError('PPT에서 이미지를 찾지 못했어요. 이미지로 직접 등록해 주세요.');
      } else {
        onChange([...images, ...extracted].slice(0, max));
      }
    } catch {
      setError('PPT를 읽지 못했어요. .pptx 파일인지 확인해 주세요.');
    } finally {
      setBusy('');
      if (pptRef.current) pptRef.current.value = '';
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
          {label} <span className="text-stone-400">({images.length}/{max}·순서대로 표시)</span>
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
            <span className="w-5 shrink-0 text-center text-xs font-semibold text-stone-400">{idx + 1}</span>
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
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={!!busy}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-stone-300 py-3 text-sm text-stone-500 transition-colors hover:border-primary-400 hover:text-primary-600 disabled:opacity-50"
          >
            {busy === 'image' ? <Loader2 size={16} className="animate-spin" /> : <ImagePlus size={16} />}
            사진 추가
          </button>
          {allowPptx && (
            <button
              type="button"
              onClick={() => pptRef.current?.click()}
              disabled={!!busy}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-stone-300 py-3 text-sm text-stone-500 transition-colors hover:border-primary-400 hover:text-primary-600 disabled:opacity-50"
            >
              {busy === 'ppt' ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
              PPT에서 가져오기
            </button>
          )}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => addImageFiles(e.target.files)}
      />
      <input
        ref={pptRef}
        type="file"
        accept=".pptx,application/vnd.openxmlformats-officedocument.presentationml.presentation"
        className="hidden"
        onChange={(e) => addPptx(e.target.files)}
      />

      {busy === 'ppt' && <p className="text-xs text-stone-500">PPT에서 이미지를 추출하는 중…</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
