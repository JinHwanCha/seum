'use client';

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { Modal } from '@/components/ui/modal';
import { Badge } from '@/components/ui/badge';
import { UsersRound, User, MessageCircle, ExternalLink, X, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Settings } from 'lucide-react';
import { ImageLightbox } from '@/components/ui/image-lightbox';
import { GatheringThumb, splitName } from './gathering-shared';
import { GatheringManager } from './gathering-manager';
import type { GatheringItem } from '@/lib/types';

interface GatheringsResponse {
  gatherings: GatheringItem[];
  canManage: boolean;
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

/** 팝업 상세 이미지 슬라이드. 여러 장이면 순서대로 넘길 수 있고, 탭하면 전체화면. */
function GatheringSlideshow({ images, alt }: { images: string[]; alt: string }) {
  const [index, setIndex] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const total = images.length;
  const cur = Math.min(index, total - 1);

  const go = (dir: -1 | 1) => setIndex((i) => (i + dir + total) % total);

  return (
    <div className="space-y-2">
      <div className="relative flex items-center justify-center overflow-hidden rounded-xl bg-stone-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={images[cur]}
          alt={alt}
          loading="lazy"
          onClick={() => setLightbox(true)}
          className="max-h-72 w-full cursor-zoom-in object-contain"
        />
        {total > 1 && (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="이전 이미지"
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-1.5 text-white transition-colors hover:bg-black/60"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="다음 이미지"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-1.5 text-white transition-colors hover:bg-black/60"
            >
              <ChevronRight size={18} />
            </button>
            <span className="absolute bottom-2 right-2 rounded-full bg-black/50 px-2 py-0.5 text-[11px] font-medium text-white">
              {cur + 1} / {total}
            </span>
          </>
        )}
      </div>

      {total > 1 && (
        <div className="flex items-center justify-center gap-1.5">
          {images.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`${i + 1}번 이미지`}
              className={`h-1.5 rounded-full transition-all ${
                i === cur ? 'w-4 bg-primary-500' : 'w-1.5 bg-stone-300'
              }`}
            />
          ))}
        </div>
      )}

      <ImageLightbox
        images={images}
        startIndex={cur}
        open={lightbox}
        onClose={() => setLightbox(false)}
      />
    </div>
  );
}

function SectionHeader({ canManage, onManage }: { canManage: boolean; onManage: () => void }) {
  return (
    <div className="mb-3 flex items-center justify-between px-1">
      <h2 className="text-sm font-semibold text-stone-500">모임 게시판</h2>
      {canManage && (
        <button
          type="button"
          onClick={onManage}
          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-700"
        >
          <Settings size={14} /> 관리
        </button>
      )}
    </div>
  );
}

export function GatheringBoard() {
  const { data, isLoading, mutate } = useSWR<GatheringsResponse>('/api/gatherings');
  const [selected, setSelected] = useState<GatheringItem | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [managing, setManaging] = useState(false);
  const columns = useGridColumns();

  const gatherings = data?.gatherings ?? [];
  const canManage = !!data?.canManage;

  if (isLoading && !data) {
    return (
      <div>
        <h2 className="mb-3 px-1 text-sm font-semibold text-stone-500">모임 게시판</h2>
        <GatheringSkeleton />
      </div>
    );
  }

  // 모임이 없고 관리 권한도 없으면 섹션 자체를 숨긴다.
  if (gatherings.length === 0 && !canManage) return null;

  const detail = selected;
  const detailName = detail ? splitName(detail.name) : { tag: '', title: '' };

  // 접힌 상태에서는 2줄(열 수 × 2)까지만 노출한다.
  const collapsedCount = columns * 2;
  const canCollapse = gatherings.length > collapsedCount;
  const visible = expanded || !canCollapse ? gatherings : gatherings.slice(0, collapsedCount);

  return (
    <div>
      <SectionHeader canManage={canManage} onManage={() => setManaging(true)} />

      {gatherings.length === 0 ? (
        <button
          type="button"
          onClick={() => setManaging(true)}
          className="flex w-full flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-stone-300 bg-white/60 py-8 text-sm text-stone-400 transition-colors hover:border-primary-300 hover:text-primary-500"
        >
          <UsersRound size={22} />
          모임을 추가해보세요
        </button>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {visible.map((g) => {
            const { tag, title } = splitName(g.name);
            return (
              <button
                key={`${g.source}-${g.id}`}
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
      )}

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
                <GatheringThumb imageUrl={detail.imageUrl} alt={detail.name} emojiClassName="text-3xl" />
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

            {/* 상세 이미지 슬라이드 */}
            {(() => {
              const slides =
                detail.images && detail.images.length > 0
                  ? detail.images
                  : detail.bannerUrl
                  ? [detail.bannerUrl]
                  : [];
              return slides.length > 0 ? (
                <GatheringSlideshow
                  key={`${detail.source}-${detail.id}`}
                  images={slides}
                  alt={detail.name}
                />
              ) : null;
            })()}

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

      {canManage && (
        <GatheringManager
          isOpen={managing}
          onClose={() => setManaging(false)}
          gatherings={gatherings}
          onChanged={() => mutate()}
        />
      )}
    </div>
  );
}
