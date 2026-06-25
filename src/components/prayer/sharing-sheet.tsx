'use client';

import useSWR from 'swr';
import { getUpcomingSundayLabelKST } from '@/lib/date-utils';
import { BookOpen, Mic, MessageCircleQuestion } from 'lucide-react';

interface SharingSection {
  label: string;
  items: string[];
}

interface SharingSheetData {
  churchName: string;
  departmentName: string;
  departmentSlug: string;
  title: string;
  scripture: string;
  preacher: string;
  sections: SharingSection[];
}

function SharingSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      <div className="h-32 w-full rounded-2xl bg-primary-100" />
      <div className="h-28 w-full rounded-xl bg-stone-100" />
      <div className="h-40 w-full rounded-xl bg-stone-100" />
    </div>
  );
}

export function SharingSheet() {
  const { data, isLoading } = useSWR<SharingSheetData>('/api/small-group/sharing-sheet');

  const sundayLabel = getUpcomingSundayLabelKST();
  const year = sundayLabel.slice(0, 4);

  if (isLoading && !data) return <SharingSkeleton />;

  const churchName = data?.churchName || '';
  const departmentName = data?.departmentName || '';
  const departmentSlug = (data?.departmentSlug || '').toUpperCase();
  const hasContent = !!(data?.title || (data?.sections?.length ?? 0) > 0);

  return (
    <div className="space-y-3">
      {/* ===== 상단 타이틀 헤더 ===== */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-600 to-primary-800 px-5 py-6 text-white shadow-sm">
        <div className="flex items-center justify-between text-[11px] font-medium text-primary-100/90">
          <span>{[year, churchName].filter(Boolean).join(' ')}</span>
          <span>{sundayLabel}. 주일예배</span>
        </div>
        <div className="mt-4 text-center">
          <p className="text-2xl font-bold leading-tight tracking-tight">
            {departmentName || '우리 부서'}
          </p>
          <p className="mt-1 text-lg font-semibold text-primary-100">목장 나눔지</p>
          {departmentSlug && (
            <p className="mt-2 text-[11px] font-semibold tracking-[0.2em] text-primary-200/80">
              {departmentSlug}
            </p>
          )}
        </div>
      </div>

      {!hasContent ? (
        <div className="rounded-xl border border-stone-200/80 warm-surface py-12 text-center text-stone-400">
          <MessageCircleQuestion size={36} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm font-medium">아직 등록된 나눔지가 없습니다.</p>
          <p className="mt-1 text-xs">곧 이번 주 나눔지가 업데이트될 예정입니다.</p>
        </div>
      ) : (
        <>
          {/* ===== 설교 정보 ===== */}
          <div className="warm-surface rounded-xl border border-stone-200/80 p-5 text-center shadow-sm">
            <h2 className="text-lg font-bold leading-snug text-stone-900">
              {data?.title}
            </h2>
            {data?.scripture && (
              <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-primary-50 px-3 py-1 text-sm font-medium text-primary-700">
                <BookOpen size={14} />
                {data.scripture}
              </div>
            )}
            {data?.preacher && (
              <div className="mt-2 flex items-center justify-center gap-1.5 text-sm text-stone-500">
                <Mic size={13} />
                {data.preacher}
              </div>
            )}
          </div>

          {/* ===== 질문 / 나눔 섹션 ===== */}
          {data?.sections.map((section) => {
            const numbered = section.label.includes('질문');
            return (
              <div
                key={section.label}
              >
                <h3 className="mb-3 flex items-center gap-2 text-base font-bold text-stone-900">
                  <span className="h-4 w-1.5 rounded-full bg-accent-400" />
                  {section.label}
                </h3>
                <ul className="space-y-3">
                  {section.items.map((item, idx) => (
                    <li key={idx} className="flex gap-2.5">
                      {numbered ? (
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-bold text-primary-700">
                          {idx + 1}
                        </span>
                      ) : (
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent-400" />
                      )}
                      <p className="text-[15px] leading-relaxed text-stone-700 whitespace-pre-wrap">
                        {item}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </>
      )}

      {/* ===== 푸터 ===== */}
      <div className="pt-2 pb-1 text-center">
        <p className="text-sm font-semibold text-stone-600">
          {[churchName, departmentName].filter(Boolean).join(' ')}
        </p>
        {departmentSlug && (
          <p className="mt-0.5 text-[11px] font-semibold tracking-[0.2em] text-stone-400">
            {departmentSlug}
          </p>
        )}
        <p className="mt-2 text-[11px] text-stone-400">
          © {year} {departmentName || churchName}. All rights reserved.
        </p>
      </div>
    </div>
  );
}
