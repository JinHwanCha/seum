'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { getUpcomingSundayLabelKST } from '@/lib/date-utils';
import { Modal } from '@/components/ui/modal';
import { SharingSheetEditor } from '@/components/prayer/sharing-sheet-editor';
import { BookOpen, Mic, MessageCircleQuestion, Pencil } from 'lucide-react';
import type { SharingSheetContent, SharingSheetSource } from '@/lib/types';

interface SharingSheetResponse {
  churchName: string;
  departmentName: string;
  departmentSlug: string;
  source: SharingSheetSource;
  googleSheetId: string;
  canEdit: boolean;
  content: SharingSheetContent;
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
  const { data, isLoading, mutate } = useSWR<SharingSheetResponse>(
    '/api/small-group/sharing-sheet'
  );
  const [editing, setEditing] = useState(false);

  const sundayLabel = getUpcomingSundayLabelKST();
  const year = sundayLabel.slice(0, 4);

  if (isLoading && !data) return <SharingSkeleton />;

  const churchName = data?.churchName || '';
  const departmentName = data?.departmentName || '';
  const departmentSlug = (data?.departmentSlug || '').toUpperCase();
  const canEdit = !!data?.canEdit;
  const content = data?.content;
  const hasContent = !!(content?.title || (content?.sections?.length ?? 0) > 0);

  const handleSaved = (source: SharingSheetSource, newContent: SharingSheetContent) => {
    setEditing(false);
    if (data) {
      mutate({ ...data, source, content: newContent }, { revalidate: true });
    } else {
      mutate();
    }
  };

  return (
    <div className="space-y-3">
      {/* ===== 사역자: 수정 버튼 ===== */}
      {canEdit && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-stone-600 hover:bg-stone-50"
          >
            <Pencil size={14} /> 나눔지 수정
          </button>
        </div>
      )}

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
          <p className="mt-1 text-xs">
            {canEdit
              ? '‘나눔지 수정’ 버튼으로 내용을 등록해 주세요.'
              : '곧 이번 주 나눔지가 업데이트될 예정입니다.'}
          </p>
        </div>
      ) : (
        <>
          {/* ===== 설교 정보 ===== */}
          <div className="warm-surface rounded-xl border border-stone-200/80 p-5 text-center shadow-sm">
            <h2 className="text-lg font-bold leading-snug text-stone-900">
              {content?.title}
            </h2>
            {content?.subtitle && (
              <p className="mt-1 text-sm font-medium text-primary-600">{content.subtitle}</p>
            )}
            {content?.scripture && (
              <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-primary-50 px-3 py-1 text-sm font-medium text-primary-700">
                <BookOpen size={14} />
                {content.scripture}
              </div>
            )}
            {content?.preacher && (
              <div className="mt-2 flex items-center justify-center gap-1.5 text-sm text-stone-500">
                <Mic size={13} />
                {content.preacher}
              </div>
            )}
          </div>

          {/* ===== 성경 말씀 전문 (선택) ===== */}
          {content?.scriptureBody && (
            <div className="warm-surface rounded-xl border border-stone-200/80 p-5 shadow-sm">
              <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-stone-700">
                {content.scriptureBody}
              </p>
            </div>
          )}

          {/* ===== 질문 / 나눔 섹션 ===== */}
          {content?.sections.map((section, sIdx) => (
            <div
              key={`${section.label}-${sIdx}`}
              className="warm-surface rounded-xl border border-stone-200/80 p-5 shadow-sm"
            >
              <h3 className="mb-3 flex items-center gap-2 text-base font-bold text-stone-900">
                <span className="h-4 w-1.5 rounded-full bg-accent-400" />
                {section.label}
              </h3>
              <ul className="space-y-3">
                {section.items.map((item, idx) => (
                  <li key={idx} className="flex gap-2.5">
                    {section.style === 'numbered' ? (
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-bold text-primary-700">
                        {idx + 1}
                      </span>
                    ) : (
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent-400" />
                    )}
                    <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-stone-700">
                      {item}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          ))}
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

      {/* ===== 사역자: 수정 모달 ===== */}
      {canEdit && content && (
        <Modal
          isOpen={editing}
          onClose={() => setEditing(false)}
          title="목장 나눔지 수정"
          className="max-w-2xl"
        >
          <SharingSheetEditor
            initialSource={data?.source || 'google_sheet'}
            initialContent={content}
            onSaved={handleSaved}
            onCancel={() => setEditing(false)}
          />
        </Modal>
      )}
    </div>
  );
}
