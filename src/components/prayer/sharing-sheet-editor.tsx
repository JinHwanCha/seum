'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, ListOrdered, Dot, GripVertical } from 'lucide-react';
import type {
  SharingSheetContent,
  SharingSheetSection,
  SharingSheetSource,
  SharingSectionStyle,
} from '@/lib/types';

interface SharingSheetEditorProps {
  initialSource: SharingSheetSource;
  initialContent: SharingSheetContent;
  onSaved: (source: SharingSheetSource, content: SharingSheetContent) => void;
  onCancel: () => void;
}

const emptySection = (): SharingSheetSection => ({
  label: '',
  style: 'numbered',
  items: [''],
});

export function SharingSheetEditor({
  initialSource,
  initialContent,
  onSaved,
  onCancel,
}: SharingSheetEditorProps) {
  const [source, setSource] = useState<SharingSheetSource>(initialSource);
  const [title, setTitle] = useState(initialContent.title || '');
  const [subtitle, setSubtitle] = useState(initialContent.subtitle || '');
  const [scripture, setScripture] = useState(initialContent.scripture || '');
  const [scriptureBody, setScriptureBody] = useState(initialContent.scriptureBody || '');
  const [preacher, setPreacher] = useState(initialContent.preacher || '');
  const [sections, setSections] = useState<SharingSheetSection[]>(
    initialContent.sections.length > 0
      ? initialContent.sections.map((s) => ({
          ...s,
          items: s.items.length > 0 ? [...s.items] : [''],
        }))
      : [{ label: '본문 질문', style: 'numbered', items: [''] }]
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── section helpers ──
  const updateSection = (idx: number, patch: Partial<SharingSheetSection>) => {
    setSections((prev) => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  };
  const addSection = () => setSections((prev) => [...prev, emptySection()]);
  const removeSection = (idx: number) =>
    setSections((prev) => prev.filter((_, i) => i !== idx));

  const updateItem = (sIdx: number, iIdx: number, value: string) => {
    setSections((prev) =>
      prev.map((s, i) =>
        i === sIdx ? { ...s, items: s.items.map((it, j) => (j === iIdx ? value : it)) } : s
      )
    );
  };
  const addItem = (sIdx: number) =>
    setSections((prev) =>
      prev.map((s, i) => (i === sIdx ? { ...s, items: [...s.items, ''] } : s))
    );
  const removeItem = (sIdx: number, iIdx: number) =>
    setSections((prev) =>
      prev.map((s, i) =>
        i === sIdx ? { ...s, items: s.items.filter((_, j) => j !== iIdx) } : s
      )
    );

  const handleSave = async () => {
    setError(null);
    setSaving(true);

    const cleanedSections =
      source === 'manual'
        ? sections
            .map((s) => ({
              label: s.label.trim(),
              style: s.style,
              items: s.items.map((i) => i.trim()).filter((i) => i !== ''),
            }))
            .filter((s) => s.label !== '' || s.items.length > 0)
        : [];

    const content: SharingSheetContent = {
      title: title.trim(),
      subtitle: subtitle.trim(),
      scripture: scripture.trim(),
      scriptureBody: scriptureBody.trim(),
      preacher: preacher.trim(),
      sections: cleanedSections,
    };

    try {
      const res = await fetch('/api/small-group/sharing-sheet', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source, content }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error || '저장에 실패했습니다.');
      }
      const saved = await res.json();
      onSaved(saved.source, saved.content);
    } catch (e) {
      setError(e instanceof Error ? e.message : '저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* ── 소스 선택 ── */}
      <div>
        <p className="mb-2 text-sm font-medium text-stone-700">나눔지 방식</p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setSource('google_sheet')}
            className={`rounded-lg border px-3 py-3 text-sm font-medium transition-colors ${
              source === 'google_sheet'
                ? 'border-primary-500 bg-primary-50 text-primary-700'
                : 'border-stone-300 text-stone-600 hover:bg-stone-50'
            }`}
          >
            구글 시트 사용
            <span className="mt-0.5 block text-[11px] font-normal text-stone-400">
              시트 내용을 그대로 표시
            </span>
          </button>
          <button
            type="button"
            onClick={() => setSource('manual')}
            className={`rounded-lg border px-3 py-3 text-sm font-medium transition-colors ${
              source === 'manual'
                ? 'border-primary-500 bg-primary-50 text-primary-700'
                : 'border-stone-300 text-stone-600 hover:bg-stone-50'
            }`}
          >
            직접 작성
            <span className="mt-0.5 block text-[11px] font-normal text-stone-400">
              앱에서 질문지 직접 편집
            </span>
          </button>
        </div>
      </div>

      {source === 'google_sheet' ? (
        <div className="rounded-lg bg-stone-50 p-4 text-sm leading-relaxed text-stone-600">
          연결된 구글 시트의 내용을 자동으로 불러와 표시합니다. 시트를 수정하면
          최대 5분 이내에 반영됩니다.
        </div>
      ) : (
        <>
          {/* ── 상단 정보 ── */}
          <div className="space-y-3 rounded-lg border border-stone-200 p-3">
            <Input
              label="제목"
              placeholder="예) 하나님나라와 사명 (세상 편)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <Input
              label="부제 (선택)"
              placeholder="예) - 세상 속에서의 사명 -"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
            />
            <Input
              label="성경 본문 (장절)"
              placeholder="예) 요17:4,14-23"
              value={scripture}
              onChange={(e) => setScripture(e.target.value)}
            />
            <Textarea
              label="성경 말씀 전문 (선택)"
              placeholder="본문 전체를 표시하려면 입력하세요."
              value={scriptureBody}
              onChange={(e) => setScriptureBody(e.target.value)}
              rows={4}
            />
            <Input
              label="설교자 (선택)"
              placeholder="예) 박지웅 담임목사"
              value={preacher}
              onChange={(e) => setPreacher(e.target.value)}
            />
          </div>

          {/* ── 섹션 (질문/적용/결단 등) ── */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-stone-700">질문 / 나눔 섹션</p>
            </div>

            {sections.map((section, sIdx) => (
              <div
                key={sIdx}
                className="space-y-3 rounded-lg border border-stone-200 bg-stone-50/50 p-3"
              >
                <div className="flex items-center gap-2">
                  <GripVertical size={16} className="shrink-0 text-stone-300" />
                  <input
                    className="flex-1 rounded-md border border-stone-300 px-2.5 py-1.5 text-sm font-semibold focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    placeholder="섹션 이름 (예: 본문 질문, 적용, 결단)"
                    value={section.label}
                    onChange={(e) => updateSection(sIdx, { label: e.target.value })}
                  />
                  <button
                    type="button"
                    onClick={() => removeSection(sIdx)}
                    className="shrink-0 rounded-md p-1.5 text-stone-400 hover:bg-red-50 hover:text-red-600"
                    title="섹션 삭제"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                {/* 표시 스타일 */}
                <div className="flex gap-2 pl-6">
                  <button
                    type="button"
                    onClick={() => updateSection(sIdx, { style: 'numbered' })}
                    className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium ${
                      section.style === 'numbered'
                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                        : 'border-stone-300 text-stone-500'
                    }`}
                  >
                    <ListOrdered size={13} /> 번호
                  </button>
                  <button
                    type="button"
                    onClick={() => updateSection(sIdx, { style: 'bullet' })}
                    className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium ${
                      section.style === 'bullet'
                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                        : 'border-stone-300 text-stone-500'
                    }`}
                  >
                    <Dot size={16} className="-mx-1" /> 점
                  </button>
                </div>

                {/* 항목들 */}
                <div className="space-y-2 pl-6">
                  {section.items.map((item, iIdx) => (
                    <div key={iIdx} className="flex items-start gap-2">
                      <span className="mt-2 w-4 shrink-0 text-right text-xs font-semibold text-stone-400">
                        {section.style === 'numbered' ? `${iIdx + 1}.` : '•'}
                      </span>
                      <textarea
                        className="min-h-[44px] flex-1 resize-y rounded-md border border-stone-300 px-2.5 py-1.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                        placeholder="내용을 입력하세요."
                        value={item}
                        rows={1}
                        onChange={(e) => updateItem(sIdx, iIdx, e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => removeItem(sIdx, iIdx)}
                        className="mt-1.5 shrink-0 rounded-md p-1 text-stone-400 hover:bg-red-50 hover:text-red-600"
                        title="항목 삭제"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => addItem(sIdx)}
                    className="inline-flex items-center gap-1 text-xs font-medium text-primary-600 hover:text-primary-700"
                  >
                    <Plus size={13} /> 항목 추가
                  </button>
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={addSection}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-stone-300 py-2.5 text-sm font-medium text-stone-500 hover:border-primary-400 hover:text-primary-600"
            >
              <Plus size={15} /> 섹션 추가
            </button>
          </div>
        </>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex justify-end gap-2 border-t border-stone-200 pt-3">
        <Button variant="secondary" onClick={onCancel} disabled={saving}>
          취소
        </Button>
        <Button onClick={handleSave} loading={saving}>
          저장
        </Button>
      </div>
    </div>
  );
}
