'use client';

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { Modal } from '@/components/ui/modal';
import { Badge } from '@/components/ui/badge';
import { UsersRound, User, MessageCircle, ExternalLink, X, ChevronDown, ChevronUp } from 'lucide-react';
import type { GatheringItem } from '@/lib/types';

interface GatheringsResponse {
  gatherings: GatheringItem[];
}

/** 현재 그리드 열 수(모바일 2 / 태블릿 3 / 데스크톱 4)를 추적한다. */
function useGridColumns(): number {
  const [columns, setColumns] = useState(2);

  useEffect(() => {
    const compute = () => {
      const w = window.innerWidth;
      if (w >= 1024) setColumns(4);
      else if (w >= 640) setColumns(3);
      else setColumns(2);
    };
    compute();
    window.addEventListener('resize', compute);
    return () => window.removeEventListener('resize', compute);
  }, []);

  return columns;
}

/** "[⭐찬양팀] 찬양팀원 모집" → { tag: "⭐찬양팀", title: "찬양팀원 모집" } */
function splitName(name: string): { tag: string; title: string } {
  const match = name.match(/^\s*\[([^\]]+)\]\s*(.*)$/);
  if (match) {
    return { tag: match[1].trim(), title: match[2].trim() };
  }
  return { tag: '', title: name };
}

function GatheringThumb({ imageUrl, alt }: { imageUrl: string; alt: string }) {
  const [errored, setErrored] = useState(false);
  if (!imageUrl || errored) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-sky-50 text-sky-500">
        <UsersRound size={22} />
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={imageUrl}
      alt={alt}
      loading="lazy"
      onError={() => setErrored(true)}
      className="h-full w-full object-contain"
    />
  );
}

function GatheringSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="animate-pulse rounded-xl border border-stone-200/80 bg-white p-3">
          <div className="mx-auto mb-2 h-12 w-12 rounded-xl bg-stone-100" />
          <div className="mx-auto h-3 w-3/4 rounded bg-stone-100" />
        </div>
      ))}
    </div>
  );
}

export function GatheringBoard() {
  const { data, isLoading } = useSWR<GatheringsResponse>('/api/gatherings');
  const [selected, setSelected] = useState<GatheringItem | null>(null);
  const [expanded, setExpanded] = useState(false);
  const columns = useGridColumns();

  const gatherings = data?.gatherings ?? [];

  if (isLoading && !data) {
    return (
      <div>
        <h2 className="mb-3 px-1 text-sm font-semibold text-stone-500">모임 게시판</h2>
        <GatheringSkeleton />
      </div>
    );
  }

  if (gatherings.length === 0) return null;

  const detail = selected;
  const detailName = detail ? splitName(detail.name) : { tag: '', title: '' };

  // 접힌 상태에서는 2줄(열 수 × 2)까지만 노출한다.
  const collapsedCount = columns * 2;
  const canCollapse = gatherings.length > collapsedCount;
  const visible = expanded || !canCollapse ? gatherings : gatherings.slice(0, collapsedCount);

  return (
    <div>
      <h2 className="mb-3 px-1 text-sm font-semibold text-stone-500">모임 게시판</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {visible.map((g) => {
          const { tag, title } = splitName(g.name);
          return (
            <button
              key={g.id}
              type="button"
              onClick={() => setSelected(g)}
              className="warm-surface group flex flex-col items-center rounded-xl border border-stone-200/80 p-3 text-center shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="relative mb-2 h-12 w-12 overflow-hidden rounded-xl bg-stone-50">
                <GatheringThumb imageUrl={g.imageUrl} alt={g.name} />
                {g.disabled && (
                  <span className="absolute inset-0 flex items-center justify-center rounded-xl bg-stone-900/55 text-[10px] font-semibold text-white">
                    마감
                  </span>
                )}
              </div>
              {tag && (
                <span className="mb-0.5 line-clamp-1 text-[10px] font-semibold text-sky-600">
                  {tag}
                </span>
              )}
              <span className="line-clamp-2 text-xs font-medium leading-snug text-stone-700">
                {title}
              </span>
            </button>
          );
        })}
      </div>

      {canCollapse && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-3 flex w-full items-center justify-center gap-1 rounded-xl border border-stone-200/80 bg-white py-2.5 text-sm font-medium text-stone-500 transition-colors hover:bg-stone-50"
        >
          {expanded ? (
            <>
              접기 <ChevronUp size={16} />
            </>
          ) : (
            <>
              더보기 ({gatherings.length - collapsedCount}) <ChevronDown size={16} />
            </>
          )}
        </button>
      )}

      <Modal isOpen={!!detail} onClose={() => setSelected(null)}>
        {detail && (
          <div className="relative space-y-4">
            {/* 닫기 버튼 */}
            <button
              type="button"
              onClick={() => setSelected(null)}
              aria-label="닫기"
              className="absolute -right-1 -top-1 z-10 rounded-lg p-1 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-600"
            >
              <X size={20} />
            </button>

            {/* 헤더: 아이콘 + 제목 */}
            <div className="flex items-start gap-3 pr-8">
              <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-xl bg-stone-50">
                <GatheringThumb imageUrl={detail.imageUrl} alt={detail.name} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  {detailName.tag && (
                    <Badge className="border-0 bg-sky-50 text-sky-700">{detailName.tag}</Badge>
                  )}
                  {detail.type && (
                    <span className="text-xs text-stone-400">{detail.type}</span>
                  )}
                </div>
                <h2 className="mt-1 text-lg font-bold leading-snug text-stone-900">
                  {detailName.title}
                </h2>
              </div>
            </div>

            {/* 모임장 / 카톡 ID */}
            {(detail.leader || detail.kakaoId) && (
              <div className="flex flex-wrap gap-x-4 gap-y-1.5 rounded-lg bg-stone-50 px-3 py-2.5 text-sm text-stone-600">
                {detail.leader && (
                  <span className="inline-flex items-center gap-1.5">
                    <User size={14} className="text-stone-400" />
                    모임장 {detail.leader}
                  </span>
                )}
                {detail.kakaoId && (
                  <span className="inline-flex items-center gap-1.5">
                    <MessageCircle size={14} className="text-stone-400" />
                    카톡 {detail.kakaoId}
                  </span>
                )}
              </div>
            )}

            {/* 배너 이미지 */}
            {detail.bannerUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={detail.bannerUrl}
                alt={detail.name}
                loading="lazy"
                className="w-full rounded-xl object-cover"
              />
            )}

            {/* 모임 내용 */}
            {detail.content && (
              <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-stone-700">
                {detail.content}
              </p>
            )}

            {/* 신청 버튼 */}
            {detail.disabled ? (
              <div className="w-full rounded-lg bg-stone-100 py-3 text-center text-sm font-medium text-stone-400">
                {detail.buttonLabel || '신청 마감'}
              </div>
            ) : detail.link ? (
              <a
                href={detail.link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-primary-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-700"
              >
                {detail.buttonLabel || '바로가기'}
                <ExternalLink size={15} />
              </a>
            ) : null}
          </div>
        )}
      </Modal>
    </div>
  );
}
