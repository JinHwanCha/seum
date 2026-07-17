'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ImagesEditor } from '@/components/ui/images-editor';
import { WORSHIP_FIXED_MAP } from '@/lib/worship';
import { Plus, Pencil, Trash2, ArrowLeft, ChevronUp, ChevronDown, X, Loader2 } from 'lucide-react';
import type {
  WorshipAnnouncement,
  WorshipContent,
  WorshipKind,
  WorshipSection,
  WorshipTimetableRow,
} from '@/lib/types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  items: WorshipAnnouncement[];
  onChanged: () => void;
}

type FormState = {
  title: string;
  icon: string;
  subtitle: string;
  note: string;
  link: string;
  images: string[];
  rows: WorshipTimetableRow[];
  sections: WorshipSection[];
  pinned: boolean;
  enabled: boolean;
};

const EMPTY_FORM: FormState = {
  title: '',
  icon: '',
  subtitle: '',
  note: '',
  link: '',
  images: [],
  rows: [],
  sections: [],
  pinned: false,
  enabled: true,
};

const EMPTY_ROW: WorshipTimetableRow = { duration: '', program: '', detail: '', leader: '', remark: '' };

function toForm(item: WorshipAnnouncement): FormState {
  const c = item.content || {};
  return {
    title: item.title || '',
    icon: item.icon || '',
    subtitle: c.subtitle || '',
    note: c.note || '',
    link: item.link || '',
    images: item.images || [],
    rows: c.rows || [],
    sections: c.sections || [],
    pinned: item.pinned,
    enabled: item.enabled,
  };
}

function itemHasContent(item: WorshipAnnouncement): boolean {
  if (item.kind === 'link') return !!item.link;
  if ((item.imageCount ?? item.images.length) > 0) return true;
  const c = item.content || {};
  return !!(c.subtitle || c.note || c.rows?.length || c.sections?.length);
}

// ─── 타임테이블 편집기 ───────────────────────────────────────
function TimetableRowsEditor({
  rows,
  onChange,
}: {
  rows: WorshipTimetableRow[];
  onChange: (rows: WorshipTimetableRow[]) => void;
}) {
  const update = (i: number, patch: Partial<WorshipTimetableRow>) =>
    onChange(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= rows.length) return;
    const next = rows.slice();
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  const remove = (i: number) => onChange(rows.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-stone-700">순서표</label>
      <div className="space-y-2">
        {rows.map((r, i) => (
          <div key={i} className="space-y-2 rounded-lg">
            <div className="flex items-center gap-2">
              <span className="w-4 text-center text-xs font-semibold text-stone-400">{i + 1}</span>
              <input
                value={r.program}
                onChange={(e) => update(i, { program: e.target.value })}
                placeholder="프로그램 (예: 찬양)"
                className="flex-1 rounded-md border border-stone-300 px-2 py-1.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
              <input
                value={r.duration}
                onChange={(e) => update(i, { duration: e.target.value })}
                placeholder="소요"
                className="w-16 rounded-md border border-stone-300 px-2 py-1.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
              <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="위로" className="rounded p-1 text-stone-400 hover:bg-stone-100 disabled:opacity-30">
                <ChevronUp size={15} />
              </button>
              <button type="button" onClick={() => move(i, 1)} disabled={i === rows.length - 1} aria-label="아래로" className="rounded p-1 text-stone-400 hover:bg-stone-100 disabled:opacity-30">
                <ChevronDown size={15} />
              </button>
              <button type="button" onClick={() => remove(i)} aria-label="삭제" className="rounded p-1 text-stone-400 hover:bg-red-50 hover:text-red-600">
                <X size={15} />
              </button>
            </div>
            <textarea
              value={r.detail}
              onChange={(e) => update(i, { detail: e.target.value })}
              placeholder="내용 (줄바꿈으로 여러 항목)"
              rows={2}
              className="w-full resize-y rounded-md border border-stone-300 px-2 py-1.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
            <div className="flex gap-2">
              <input
                value={r.leader}
                onChange={(e) => update(i, { leader: e.target.value })}
                placeholder="인도자"
                className="flex-1 rounded-md border border-stone-300 px-2 py-1.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
              <input
                value={r.remark}
                onChange={(e) => update(i, { remark: e.target.value })}
                placeholder="특이사항"
                className="flex-1 rounded-md border border-stone-300 px-2 py-1.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => onChange([...rows, { ...EMPTY_ROW }])}
        className="flex w-full items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-stone-300 py-2.5 text-sm text-stone-500 hover:border-primary-400 hover:text-primary-600"
      >
        <Plus size={15} /> 순서 추가
      </button>
    </div>
  );
}

// ─── 번호형 섹션 편집기 (중보기도제목 / 광고 내용) ─────────────
function SectionsEditor({
  sections,
  onChange,
  label,
}: {
  sections: WorshipSection[];
  onChange: (s: WorshipSection[]) => void;
  label: string;
}) {
  const update = (i: number, patch: Partial<WorshipSection>) =>
    onChange(sections.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= sections.length) return;
    const next = sections.slice();
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  const remove = (i: number) => onChange(sections.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-stone-700">{label}</label>
      <div className="space-y-2">
        {sections.map((s, i) => (
          <div key={i} className="space-y-2 rounded-lg">
            <div className="flex items-center gap-2">
              <span className="w-4 text-center text-xs font-semibold text-stone-400">{i + 1}</span>
              <input
                value={s.title}
                onChange={(e) => update(i, { title: e.target.value })}
                placeholder="큰 제목"
                className="flex-1 rounded-md border border-stone-300 px-2 py-1.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
              <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="위로" className="rounded p-1 text-stone-400 hover:bg-stone-100 disabled:opacity-30">
                <ChevronUp size={15} />
              </button>
              <button type="button" onClick={() => move(i, 1)} disabled={i === sections.length - 1} aria-label="아래로" className="rounded p-1 text-stone-400 hover:bg-stone-100 disabled:opacity-30">
                <ChevronDown size={15} />
              </button>
              <button type="button" onClick={() => remove(i)} aria-label="삭제" className="rounded p-1 text-stone-400 hover:bg-red-50 hover:text-red-600">
                <X size={15} />
              </button>
            </div>
            <textarea
              value={s.items.join('\n')}
              onChange={(e) => update(i, { items: e.target.value.split('\n') })}
              placeholder="세부 항목 (한 줄에 하나씩)"
              rows={3}
              className="w-full resize-y rounded-md border border-stone-300 px-2 py-1.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => onChange([...sections, { title: '', items: [] }])}
        className="flex w-full items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-stone-300 py-2.5 text-sm text-stone-500 hover:border-primary-400 hover:text-primary-600"
      >
        <Plus size={15} /> 항목 추가
      </button>
    </div>
  );
}

// ─── 매니저 ─────────────────────────────────────────────────
export function WorshipManager({ isOpen, onClose, items, onChanged }: Props) {
  const [editing, setEditing] = useState<WorshipAnnouncement | 'new' | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [error, setError] = useState('');

  const fixed = items.filter((i) => i.key);
  const specials = items.filter((i) => !i.key);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const kindOf = (): WorshipKind => {
    if (editing === 'new' || editing === null) return 'slideshow';
    if (editing.key) return WORSHIP_FIXED_MAP[editing.key]?.kind ?? 'slideshow';
    return 'slideshow';
  };
  const isSpecial = editing === 'new' || (!!editing && !editing.key);

  const startEdit = async (item: WorshipAnnouncement) => {
    setError('');
    if (item.id && (item.imageCount ?? 0) > 0) {
      setLoadingEdit(true);
      setEditing(item);
      try {
        const res = await fetch(`/api/worship-guide/${item.id}`);
        const body = await res.json();
        setForm(toForm((body.item as WorshipAnnouncement) || item));
      } catch {
        setForm(toForm(item));
      } finally {
        setLoadingEdit(false);
      }
    } else {
      setForm(toForm(item));
      setEditing(item);
    }
  };

  const startNew = () => {
    setForm(EMPTY_FORM);
    setError('');
    setEditing('new');
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

  const buildContent = (kind: WorshipKind): WorshipContent => {
    const content: WorshipContent = { subtitle: form.subtitle, note: form.note };
    if (kind === 'timetable') content.rows = form.rows;
    if (kind === 'prayer' || kind === 'slideshow') content.sections = form.sections;
    return content;
  };

  const handleSave = async () => {
    const kind = kindOf();
    if (isSpecial && !form.title.trim()) {
      setError('광고 제목을 입력해주세요.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload = {
        title: form.title,
        icon: form.icon,
        images: form.images,
        link: form.link,
        pinned: form.pinned,
        enabled: form.enabled,
        content: buildContent(kind),
      };

      let url = '';
      let method = 'PUT';
      if (editing !== 'new' && editing?.key) {
        url = '/api/worship-guide';
        method = 'PUT';
        (payload as any).key = editing.key;
      } else if (editing === 'new') {
        url = '/api/worship-guide';
        method = 'POST';
      } else if (editing && editing.id) {
        url = `/api/worship-guide/${editing.id}`;
        method = 'PUT';
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
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

  const handleDelete = async (item: WorshipAnnouncement) => {
    if (!item.id) return;
    if (!confirm(`"${item.title || '특별 광고'}"를 삭제할까요?`)) return;
    try {
      const res = await fetch(`/api/worship-guide/${item.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      onChanged();
    } catch {
      alert('삭제에 실패했습니다.');
    }
  };

  const isForm = editing !== null;
  const kind = kindOf();
  const editingItem: WorshipAnnouncement | null =
    editing && editing !== 'new' ? editing : null;
  const title = !isForm
    ? '주일 예배 안내 관리'
    : isSpecial
    ? editing === 'new'
      ? '새 특별 광고'
      : '특별 광고 수정'
    : `${editingItem?.key ? WORSHIP_FIXED_MAP[editingItem.key]?.label ?? '' : ''} 수정`;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={title}>
      {!isForm ? (
        <div className="space-y-5">
          {/* 고정 버튼 */}
          <div className="space-y-2">
            <p className="px-1 text-xs font-semibold text-stone-400">고정 버튼</p>
            {fixed.map((item) => {
              const d = WORSHIP_FIXED_MAP[item.key as string];
              const set = itemHasContent(item);
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => startEdit(item)}
                  className="flex w-full items-center gap-3 rounded-xl border border-stone-200 p-2.5 text-left hover:bg-stone-50"
                >
                  <span className="text-xl">{d?.icon}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-stone-800">{d?.label}</p>
                    <p className="text-xs text-stone-400">
                      {set ? '설정됨' : '미설정'}
                      {!item.enabled && ' · 숨김'}
                    </p>
                  </div>
                  <Pencil size={16} className="text-stone-400" />
                </button>
              );
            })}
          </div>

          {/* 특별 광고 */}
          <div className="space-y-2">
            <p className="px-1 text-xs font-semibold text-stone-400">특별 광고</p>
            {specials.map((item) => (
              <div key={item.id} className="flex items-center gap-3 rounded-xl border border-stone-200 p-2.5">
                <span className="text-xl">{item.icon || '⭐'}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-stone-800">{item.title || '(제목 없음)'}</p>
                  <p className="text-xs text-stone-400">
                    {item.pinned ? '📌 맨 앞 고정' : '일반'}
                    {!item.enabled && ' · 숨김'}
                  </p>
                </div>
                <button type="button" onClick={() => startEdit(item)} aria-label="수정" className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-600">
                  <Pencil size={16} />
                </button>
                <button type="button" onClick={() => handleDelete(item)} aria-label="삭제" className="rounded-lg p-1.5 text-stone-400 hover:bg-red-50 hover:text-red-600">
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            <Button variant="secondary" onClick={startNew} className="w-full">
              <Plus size={16} className="mr-1.5" /> 새 특별 광고 추가
            </Button>
          </div>
        </div>
      ) : loadingEdit ? (
        <div className="flex items-center justify-center py-12 text-stone-400">
          <Loader2 size={22} className="animate-spin" />
        </div>
      ) : (
        <div className="space-y-3">
          {isSpecial && (
            <div className="grid grid-cols-[1fr_auto] gap-3">
              <Input label="광고 제목 *" placeholder="예: 상반기 새가족 환영회" value={form.title} onChange={(e) => set('title', e.target.value)} />
              <Input label="아이콘" placeholder="⭐" value={form.icon} onChange={(e) => set('icon', e.target.value)} className="w-20 text-center" />
            </div>
          )}

          {kind === 'link' ? (
            <Input label="채널 URL" placeholder="https://pf.kakao.com/..." value={form.link} onChange={(e) => set('link', e.target.value)} />
          ) : (
            <>
              <Input
                label="부제 (날짜·장소 등)"
                placeholder={kind === 'prayer' ? '매주 주일 오후 1시 · 새가족실' : '예: 2026년 5월 3일'}
                value={form.subtitle}
                onChange={(e) => set('subtitle', e.target.value)}
              />

              <ImagesEditor
                images={form.images}
                onChange={(imgs) => set('images', imgs)}
                highQuality
                allowPptx={kind === 'slideshow'}
                label={kind === 'slideshow' ? '슬라이드 이미지 (PPT/사진)' : '이미지'}
              />

              {kind === 'timetable' && <TimetableRowsEditor rows={form.rows} onChange={(rows) => set('rows', rows)} />}
              {kind === 'prayer' && <SectionsEditor sections={form.sections} onChange={(s) => set('sections', s)} label="중보기도 제목" />}
              {kind === 'slideshow' && <SectionsEditor sections={form.sections} onChange={(s) => set('sections', s)} label="광고 내용 (선택)" />}

              <Input label="하단 문구 (선택)" placeholder="예: 이후 마을모임이 진행됩니다" value={form.note} onChange={(e) => set('note', e.target.value)} />
            </>
          )}

          <div className="flex flex-wrap gap-4 pt-1">
            <label className="flex items-center gap-2 text-sm text-stone-700">
              <input type="checkbox" checked={form.enabled} onChange={(e) => set('enabled', e.target.checked)} className="h-4 w-4 rounded border-stone-300 text-primary-600 focus:ring-primary-500" />
              노출하기
            </label>
            {isSpecial && (
              <label className="flex items-center gap-2 text-sm text-stone-700">
                <input type="checkbox" checked={form.pinned} onChange={(e) => set('pinned', e.target.checked)} className="h-4 w-4 rounded border-stone-300 text-primary-600 focus:ring-primary-500" />
                맨 앞 고정
              </label>
            )}
          </div>

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
