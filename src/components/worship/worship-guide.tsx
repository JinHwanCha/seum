'use client';

import { useState } from 'react';
import useSWR, { preload } from 'swr';
import dynamic from 'next/dynamic';
import { Card } from '@/components/ui/card';
import { Modal } from '@/components/ui/modal';
import { Slideshow } from '@/components/ui/slideshow';
import { WORSHIP_FIXED_MAP } from '@/lib/worship';
import { Settings, X, ExternalLink, Loader2 } from 'lucide-react';
import type { WorshipAnnouncement, WorshipContent } from '@/lib/types';

const detailFetcher = (url: string) => fetch(url).then((r) => r.json());

// 이미지가 있는 광고는 상세(이미지 포함)를 미리 캐시에 채워둔다.
function prefetchDetail(item: WorshipAnnouncement) {
  if (item.id && (item.imageCount ?? 0) > 0) {
    preload(`/api/worship-guide/${item.id}`, detailFetcher);
  }
}

// 관리 UI(에디터·PPT 파서 등)는 사역자만 필요 → 코드 스플릿으로 지연 로드
const WorshipManager = dynamic(
  () => import('@/components/worship/worship-manager').then((m) => m.WorshipManager),
  { ssr: false }
);

interface WorshipResponse {
  items: WorshipAnnouncement[];
  canManage: boolean;
}

function isImageSrc(v: string): boolean {
  return /^(https?:\/\/|data:image\/)/i.test((v || '').trim());
}

function tileDisplay(item: WorshipAnnouncement): { label: string; icon: string; color: string } {
  if (item.key && WORSHIP_FIXED_MAP[item.key]) {
    const d = WORSHIP_FIXED_MAP[item.key];
    return { label: d.label, icon: d.icon, color: d.color };
  }
  return { label: item.title || '특별 광고', icon: item.icon || '⭐', color: 'bg-amber-50 text-amber-600' };
}

function hasContent(item: WorshipAnnouncement): boolean {
  if (item.kind === 'link') return !!item.link;
  if ((item.imageCount ?? item.images.length) > 0) return true;
  const c = item.content || {};
  return !!(c.subtitle || c.note || c.rows?.length || c.sections?.length);
}

function TileIcon({ icon, color }: { icon: string; color: string }) {
  return (
    <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center mx-auto mb-2 overflow-hidden`}>
      {isImageSrc(icon) ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={icon} alt="" className="h-full w-full object-cover" />
      ) : (
        <span className="text-xl leading-none">{icon}</span>
      )}
    </div>
  );
}

// ─── 팝업 내용 뷰 ───────────────────────────────────────────

function TimetableView({ content }: { content: WorshipContent }) {
  const rows = content.rows ?? [];
  if (rows.length === 0) return null;
  return (
    <div className="space-y-2">
      {rows.map((r, i) => {
        const details = (r.detail || '').split('\n').map((s) => s.trim()).filter(Boolean);
        const remarks = (r.remark || '').split('\n').map((s) => s.trim()).filter(Boolean);
        return (
          <div key={i} className="rounded-xl border border-stone-200 p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-stone-800">{r.program || '-'}</span>
              {r.duration && (
                <span className="shrink-0 rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-500">
                  {r.duration}
                </span>
              )}
            </div>
            {details.length > 0 && (
              <ul className="mt-1.5 space-y-0.5">
                {details.map((d, j) => (
                  <li key={j} className="flex gap-1.5 text-sm text-stone-600">
                    <span className="text-primary-400">•</span>
                    <span>{d}</span>
                  </li>
                ))}
              </ul>
            )}
            {(r.leader || remarks.length > 0) && (
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-stone-400">
                {r.leader && <span>인도자 · {r.leader}</span>}
                {remarks.length > 0 && <span>특이사항 · {remarks.join(', ')}</span>}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function SectionsView({ content }: { content: WorshipContent }) {
  const sections = content.sections ?? [];
  if (sections.length === 0) return null;
  return (
    <div className="space-y-3">
      {sections.map((s, i) => (
        <div key={i}>
          <p className="flex gap-1.5 font-semibold text-stone-800">
            <span className="text-primary-500">{i + 1}.</span>
            <span>{s.title}</span>
          </p>
          {s.items.length > 0 && (
            <ul className="mt-1 space-y-1 pl-5">
              {s.items.map((it, j) => (
                <li key={j} className="flex gap-1.5 text-sm text-stone-600">
                  <span className="text-stone-300">–</span>
                  <span>{it}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}

function WorshipDetail({ item }: { item: WorshipAnnouncement }) {
  // 이미지가 있으면 상세를 불러온다(목록 응답엔 이미지가 빠져있음).
  const needImages = !!item.id && (item.imageCount ?? 0) > 0;
  const { data } = useSWR<{ item: WorshipAnnouncement }>(
    needImages ? `/api/worship-guide/${item.id}` : null
  );
  const images = data?.item.images ?? item.images ?? [];
  const content = item.content || {};
  const loadingImages = needImages && !data;

  return (
    <div className="space-y-4">
      {loadingImages ? (
        <div className="flex aspect-[4/3] w-full items-center justify-center rounded-xl bg-stone-100">
          <Loader2 size={28} className="animate-spin text-stone-300" />
        </div>
      ) : (
        images.length > 0 && <Slideshow images={images} alt={item.title} maxHeightClass="max-h-[70vh]" />
      )}
      {item.kind === 'timetable' && <TimetableView content={content} />}
      {(item.kind === 'prayer' || item.kind === 'slideshow') && <SectionsView content={content} />}
      {content.note && (
        <p className="rounded-lg bg-stone-50 px-3 py-2.5 text-center text-sm font-medium text-stone-500">
          {content.note}
        </p>
      )}
    </div>
  );
}

// ─── 메인 ───────────────────────────────────────────────────

export function WorshipGuide() {
  const { data, isLoading, mutate } = useSWR<WorshipResponse>('/api/worship-guide');
  const [selected, setSelected] = useState<WorshipAnnouncement | null>(null);
  const [managing, setManaging] = useState(false);

  const items = data?.items ?? [];
  const canManage = !!data?.canManage;
  const visible = items.filter((it) => it.enabled && hasContent(it));

  if (isLoading && !data) {
    return (
      <div>
        <h2 className="mb-3 px-1 text-sm font-semibold text-stone-500">주일 예배 안내</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-xl border border-stone-200/80 bg-white p-4">
              <div className="mx-auto mb-2 h-10 w-10 rounded-xl bg-stone-100" />
              <div className="mx-auto h-3 w-2/3 rounded bg-stone-100" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (visible.length === 0 && !canManage) return null;

  const openItem = (item: WorshipAnnouncement) => {
    if (item.kind === 'link' && item.link) {
      window.open(item.link, '_blank', 'noopener,noreferrer');
      return;
    }
    setSelected(item);
  };

  const selDisplay = selected ? tileDisplay(selected) : null;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between px-1">
        <h2 className="text-sm font-semibold text-stone-500">주일 예배 안내</h2>
        {canManage && (
          <button
            type="button"
            onClick={() => setManaging(true)}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-700"
          >
            <Settings size={14} /> 관리
          </button>
        )}
      </div>

      {visible.length === 0 ? (
        <button
          type="button"
          onClick={() => setManaging(true)}
          className="flex w-full flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-stone-300 bg-white/60 py-8 text-sm text-stone-400 transition-colors hover:border-primary-300 hover:text-primary-500"
        >
          안내를 설정해보세요
        </button>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {visible.map((item) => {
            const d = tileDisplay(item);
            return (
              <button
                key={`${item.key ?? 'sp'}-${item.id ?? item.key}`}
                type="button"
                onClick={() => openItem(item)}
                onMouseEnter={() => prefetchDetail(item)}
                onTouchStart={() => prefetchDetail(item)}
                className="h-full"
              >
                <Card className="flex h-full flex-col items-center justify-center cursor-pointer text-center transition-shadow hover:shadow-md">
                  <TileIcon icon={d.icon} color={d.color} />
                  <span className="line-clamp-2 text-sm font-medium text-stone-700">{d.label}</span>
                  {item.kind === 'link' && (
                    <ExternalLink size={11} className="mx-auto mt-1 text-stone-300" />
                  )}
                </Card>
              </button>
            );
          })}
        </div>
      )}

      <Modal isOpen={!!selected} onClose={() => setSelected(null)}>
        {selected && selDisplay && (
          <div className="relative space-y-4">
            <button
              type="button"
              onClick={() => setSelected(null)}
              aria-label="닫기"
              className="absolute -right-1 -top-1 z-10 rounded-lg p-1 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-600"
            >
              <X size={20} />
            </button>

            <div className="pr-8">
              <div className="flex items-center gap-2">
                <span className="text-2xl leading-none">{isImageSrc(selDisplay.icon) ? '📌' : selDisplay.icon}</span>
                <h2 className="text-lg font-bold text-stone-900">{selDisplay.label}</h2>
              </div>
              {selected.content?.subtitle && (
                <p className="mt-1 text-sm text-stone-500">{selected.content.subtitle}</p>
              )}
            </div>

            <WorshipDetail item={selected} />
          </div>
        )}
      </Modal>

      {canManage && (
        <WorshipManager
          isOpen={managing}
          onClose={() => setManaging(false)}
          items={items}
          onChanged={() => mutate()}
        />
      )}
    </div>
  );
}
