'use client';

import { useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import { cn } from '@/lib/utils';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { parseSunday, getWeekNumberInMonth } from '@/lib/date-utils';
import { UserPlus, Pencil, Trash2, GraduationCap, Phone, Users, HeartHandshake } from 'lucide-react';
import type { NewFamilyMember } from '@/lib/types';

const WEEK_FIELDS = [
  'week1_date', 'week2_date', 'week3_date', 'week4_date', 'week5_date', 'week6_date',
] as const;

const birthYearLabel = (birthDate?: string | null) =>
  birthDate ? ` (${birthDate.substring(2, 4)})` : '';

// 'yyyy-MM-dd' → 'M월 N주'
function weekOfMonthLabel(dateStr: string): string {
  const d = parseSunday(dateStr);
  return `${d.getMonth() + 1}월 ${getWeekNumberInMonth(d)}주`;
}

function patchField(id: string, field: string, value: unknown) {
  fetch('/api/new-family', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, field, value }),
  }).catch(() => {});
}

interface FormState {
  name: string;
  phone: string;
  birth_date: string;
  note: string;
  prayer_request: string;
}

const EMPTY_FORM: FormState = { name: '', phone: '', birth_date: '', note: '', prayer_request: '' };

interface NewFamilyManagerProps {
  weekStart: string; // 현재 선택된 주(일요일). 주차 체크 시 기록되는 날짜
}

export function NewFamilyManager({ weekStart }: NewFamilyManagerProps) {
  const { data, mutate } = useSWR<{ members: NewFamilyMember[] }>('/api/new-family');
  const [list, setList] = useState<NewFamilyMember[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<NewFamilyMember | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (data?.members) setList(data.members);
  }, [data]);

  const openAdd = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setError('');
    setModalOpen(true);
  };

  const openEdit = (m: NewFamilyMember) => {
    setEditing(m);
    setForm({
      name: m.name,
      phone: m.phone || '',
      birth_date: m.birth_date || '',
      note: m.note || '',
      prayer_request: m.prayer_request || '',
    });
    setError('');
    setModalOpen(true);
  };

  const submit = async () => {
    if (!form.name.trim()) {
      setError('이름을 입력해주세요.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload = {
        name: form.name.trim(),
        phone: form.phone.trim(),
        birth_date: form.birth_date || null,
        note: form.note.trim(),
        prayer_request: form.prayer_request.trim(),
      };
      if (editing) {
        const res = await fetch('/api/new-family', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editing.id, ...payload }),
        });
        if (!res.ok) throw new Error((await res.json()).error || '저장 실패');
        setList((prev) =>
          prev.map((m) => (m.id === editing.id ? { ...m, ...payload, birth_date: payload.birth_date } : m))
        );
      } else {
        const res = await fetch('/api/new-family', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || '등록 실패');
        setList((prev) => [...prev, json.member]);
      }
      mutate();
      setModalOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : '오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const toggleWeek = (m: NewFamilyMember, field: (typeof WEEK_FIELDS)[number]) => {
    const next = m[field] ? null : weekStart;
    setList((prev) => prev.map((x) => (x.id === m.id ? { ...x, [field]: next } : x)));
    patchField(m.id, field, next);
  };

  const remove = async (m: NewFamilyMember, kind: 'graduate' | 'delete') => {
    const msg =
      kind === 'graduate'
        ? `${m.name} 님을 졸업 처리할까요?\n출석 기록이 삭제됩니다.`
        : `${m.name} 님을 삭제할까요?\n출석 기록이 삭제됩니다.`;
    if (!window.confirm(msg)) return;
    setList((prev) => prev.filter((x) => x.id !== m.id));
    try {
      await fetch(`/api/new-family?id=${m.id}`, { method: 'DELETE' });
    } catch {
      // ignore
    }
    mutate();
  };

  const sorted = useMemo(
    () => [...list].sort((a, b) => a.created_at.localeCompare(b.created_at)),
    [list]
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Users size={18} className="text-primary-600" />
          <h2 className="text-sm font-semibold text-stone-700">새가족반</h2>
          <Badge variant="default">{sorted.length}명</Badge>
        </div>
        <Button size="sm" onClick={openAdd}>
          <UserPlus size={15} className="mr-1" />
          새가족 추가
        </Button>
      </div>

      {sorted.length === 0 ? (
        <div className="text-center py-12 text-stone-400">
          <UserPlus size={40} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm font-medium">등록된 새가족이 없습니다.</p>
          <p className="text-xs mt-1">‘새가족 추가’로 새로 오신 분을 등록해보세요.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map((m) => {
            const attended = WEEK_FIELDS.filter((f) => m[f]).length;
            return (
              <div
                key={m.id}
                className="warm-surface rounded-xl border border-stone-200/80 p-3 space-y-3"
              >
                {/* 이름 / 정보 / 액션 */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-stone-900 text-sm">
                        {m.name}
                        <span className="text-stone-400 font-normal">{birthYearLabel(m.birth_date)}</span>
                      </span>
                      <Badge variant={attended >= 6 ? 'success' : 'warning'}>{attended}/6주</Badge>
                    </div>
                    {m.phone && (
                      <div className="flex items-center gap-1 mt-0.5 text-xs text-stone-500">
                        <Phone size={11} />
                        <span>{m.phone}</span>
                      </div>
                    )}
                    {m.note && <p className="mt-1 text-xs text-stone-500 whitespace-pre-wrap">{m.note}</p>}
                  </div>                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => openEdit(m)}
                      className="p-1.5 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100"
                      title="정보 수정"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      onClick={() => remove(m, 'graduate')}
                      className="p-1.5 rounded-lg text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50"
                      title="졸업"
                    >
                      <GraduationCap size={16} />
                    </button>
                    <button
                      onClick={() => remove(m, 'delete')}
                      className="p-1.5 rounded-lg text-stone-300 hover:text-red-500 hover:bg-red-50"
                      title="삭제"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                {/* 1~6주차 출석 */}
                <div className="grid grid-cols-6 gap-1.5">
                  {WEEK_FIELDS.map((field, i) => {
                    const val = m[field];
                    return (
                      <button
                        key={field}
                        onClick={() => toggleWeek(m, field)}
                        className={cn(
                          'flex flex-col items-center gap-0.5 rounded-lg py-1.5 transition-colors',
                          val
                            ? 'bg-primary-500 text-white shadow-sm'
                            : 'bg-stone-100 text-stone-400 hover:bg-stone-200'
                        )}
                        title={val ? weekOfMonthLabel(val) : '미출석'}
                      >
                        <span className="text-xs font-bold">{i + 1}주</span>
                        <span className={cn('text-[10px] leading-none', val ? 'text-white/90' : 'text-stone-400')}>
                          {val ? weekOfMonthLabel(val) : '-'}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* 기도제목 (새가족 전용) */}
                {m.prayer_request && (
                  <div className="flex items-start gap-1.5 rounded-lg bg-primary-50/60 px-2.5 py-2">
                    <HeartHandshake size={13} className="mt-0.5 shrink-0 text-primary-500" />
                    <p className="text-xs text-stone-600 whitespace-pre-wrap">{m.prayer_request}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? '새가족 정보 수정' : '새가족 추가'}
      >
        <div className="space-y-3">
          <Input
            label="이름"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="새가족 이름"
          />
          <Input
            label="연락처"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            placeholder="010-0000-0000"
            inputMode="tel"
          />
          <Input
            label="생년월일"
            type="date"
            value={form.birth_date}
            onChange={(e) => setForm((f) => ({ ...f, birth_date: e.target.value }))}
          />
          <Textarea
            label="메모"
            value={form.note}
            onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
            placeholder="이전 교회, 특이사항 등"
          />
          <Textarea
            label="기도제목"
            value={form.prayer_request}
            onChange={(e) => setForm((f) => ({ ...f, prayer_request: e.target.value }))}
            placeholder="새가족의 기도제목"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2 pt-1">
            <Button variant="secondary" className="flex-1" onClick={() => setModalOpen(false)}>
              취소
            </Button>
            <Button className="flex-1" onClick={submit} loading={saving}>
              {editing ? '저장' : '추가'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
