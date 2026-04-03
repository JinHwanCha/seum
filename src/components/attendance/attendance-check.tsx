'use client';

import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Crown, User, Check, X, Church, Users, UsersRound, BookOpen, Heart, Sun, Minus, Plus } from 'lucide-react';
import type { Attendance, SessionPayload } from '@/lib/types';
import { canCheckAttendance } from '@/lib/permissions';
import type { Role } from '@/lib/types';

interface CellMember {
  id: string;
  name: string;
  role: string;
  birth_date?: string | null;
}

interface AttendanceCheckProps {
  members: CellMember[];
  attendance: Record<string, Attendance>;
  weekStart: string;
  session: SessionPayload;
  cellId?: string | null;
  cellVillageId?: string | null;
  onAttendanceChange: (userId: string, field: string, value: unknown) => void;
}

const WORSHIP_OPTIONS = [
  { value: null, label: '미참석', short: '-' },
  { value: '1부', label: '1부', short: '1' },
  { value: '2부', label: '2부', short: '2' },
  { value: '3부', label: '3부', short: '3' },
] as const;

const birthYearLabel = (birthDate?: string | null) => {
  if (!birthDate) return '';
  return ` (${birthDate.substring(2, 4)})`;
};

export function AttendanceCheck({
  members,
  attendance,
  weekStart,
  session,
  cellId,
  cellVillageId,
  onAttendanceChange,
}: AttendanceCheckProps) {
  const [updating, setUpdating] = useState<string | null>(null);

  const canEdit = canCheckAttendance(
    session.role as Role,
    session.cellId,
    cellId ?? null,
    session.villageId,
    cellVillageId ?? null,
    session.isAdmin
  );

  const handleToggle = useCallback(
    async (userId: string, field: string, value: unknown) => {
      if (!canEdit) return;
      // Optimistic update immediately
      onAttendanceChange(userId, field, value);
      setUpdating(`${userId}-${field}`);
      try {
        await fetch('/api/attendance', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, weekStart, field, value }),
        });
      } finally {
        setUpdating(null);
      }
    },
    [canEdit, weekStart, onAttendanceChange]
  );

  // Sort: leader first
  const sorted = [...members].sort((a, b) => {
    if (a.role === 'cell_leader' && b.role !== 'cell_leader') return -1;
    if (a.role !== 'cell_leader' && b.role === 'cell_leader') return 1;
    return 0;
  });

  // Stats
  const total = members.length;
  const worshipCount = members.filter((m) => attendance[m.id]?.worship_service).length;
  const deptCount = members.filter((m) => attendance[m.id]?.department_meeting).length;
  const sgCount = members.filter((m) => attendance[m.id]?.small_group).length;

  return (
    <div className="space-y-3">
      {/* Summary */}
      <div className="flex gap-2 flex-wrap">
        <Badge variant={worshipCount === total ? 'success' : 'default'}>
          <Church size={12} className="mr-1" />
          예배 {worshipCount}/{total}
        </Badge>
        <Badge variant={deptCount === total ? 'success' : 'default'}>
          <Users size={12} className="mr-1" />
          부서 {deptCount}/{total}
        </Badge>
        <Badge variant={sgCount === total ? 'success' : 'default'}>
          <UsersRound size={12} className="mr-1" />
          소그룹 {sgCount}/{total}
        </Badge>
      </div>

      {/* Member Attendance List */}
      <div className="space-y-2">
        {sorted.map((member) => {
          const att = attendance[member.id];
          const isLeader = member.role === 'cell_leader';

          return (
            <div
              key={member.id}
              className="warm-surface rounded-xl border border-stone-200/80 p-3 space-y-2.5"
            >
              {/* Name Row */}
              <div className="flex items-center gap-2">
                {isLeader ? (
                  <Crown size={14} className="text-amber-500" />
                ) : (
                  <User size={14} className="text-stone-400" />
                )}
                <span className="text-sm font-medium text-stone-900">
                  {member.name}{birthYearLabel(member.birth_date)}
                </span>
                {member.id === session.userId && (
                  <span className="text-xs text-primary-500">(나)</span>
                )}
              </div>

              {/* Worship Service */}
              <div className="space-y-1">
                <span className="text-xs text-stone-500 font-medium">대예배</span>
                <div className="flex gap-1">
                  {WORSHIP_OPTIONS.map((opt) => {
                    const isActive =
                      opt.value === null
                        ? !att?.worship_service
                        : att?.worship_service === opt.value;
                    const isLoading = updating === `${member.id}-worship_service`;

                    return (
                      <button
                        key={opt.label}
                        disabled={!canEdit || isLoading}
                        onClick={() =>
                          handleToggle(member.id, 'worship_service', opt.value)
                        }
                        className={cn(
                          'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                          isActive
                            ? opt.value === null
                              ? 'bg-stone-200 text-stone-600'
                              : 'bg-primary-500 text-white shadow-sm'
                            : 'bg-stone-100 text-stone-400 hover:bg-stone-200',
                          !canEdit && 'opacity-60 cursor-default',
                          isLoading && 'animate-pulse'
                        )}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Department Meeting & Small Group - inline toggles */}
              <div className="flex gap-3 flex-wrap">
                <ToggleButton
                  label="부서집회"
                  checked={att?.department_meeting ?? false}
                  disabled={!canEdit}
                  loading={updating === `${member.id}-department_meeting`}
                  onToggle={() =>
                    handleToggle(
                      member.id,
                      'department_meeting',
                      !(att?.department_meeting ?? false)
                    )
                  }
                />
                <ToggleButton
                  label="소그룹"
                  checked={att?.small_group ?? false}
                  disabled={!canEdit}
                  loading={updating === `${member.id}-small_group`}
                  onToggle={() =>
                    handleToggle(
                      member.id,
                      'small_group',
                      !(att?.small_group ?? false)
                    )
                  }
                />
                <ToggleButton
                  label="성경통독"
                  checked={att?.bible_reading ?? false}
                  disabled={!canEdit}
                  loading={updating === `${member.id}-bible_reading`}
                  onToggle={() =>
                    handleToggle(
                      member.id,
                      'bible_reading',
                      !(att?.bible_reading ?? false)
                    )
                  }
                />
              </div>

              {/* Prayer & QT Counters */}
              <div className="flex gap-4">
                <CounterButton
                  label="기도"
                  icon={<Heart size={12} />}
                  value={att?.prayer_count ?? 0}
                  disabled={!canEdit}
                  loading={updating === `${member.id}-prayer_count`}
                  onChange={(v) => handleToggle(member.id, 'prayer_count', v)}
                />
                <CounterButton
                  label="QT"
                  icon={<Sun size={12} />}
                  value={att?.qt_count ?? 0}
                  disabled={!canEdit}
                  loading={updating === `${member.id}-qt_count`}
                  onChange={(v) => handleToggle(member.id, 'qt_count', v)}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ToggleButton({
  label,
  checked,
  disabled,
  loading,
  onToggle,
}: {
  label: string;
  checked: boolean;
  disabled: boolean;
  loading: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      disabled={disabled || loading}
      onClick={onToggle}
      className={cn(
        'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
        checked
          ? 'bg-green-100 text-green-700 border border-green-200'
          : 'bg-stone-100 text-stone-400 border border-stone-200',
        !disabled && !checked && 'hover:bg-red-50 hover:text-red-400 hover:border-red-200',
        !disabled && checked && 'hover:bg-green-50',
        disabled && 'opacity-60 cursor-default',
        loading && 'animate-pulse'
      )}
    >
      {checked ? <Check size={12} /> : <X size={12} />}
      {label}
    </button>
  );
}

function CounterButton({
  label,
  icon,
  value,
  disabled,
  loading,
  onChange,
}: {
  label: string;
  icon: React.ReactNode;
  value: number;
  disabled: boolean;
  loading: boolean;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs text-stone-500 font-medium flex items-center gap-1">
        {icon}
        {label}
      </span>
      <div className={cn(
        'flex items-center rounded-lg border overflow-hidden',
        value > 0 ? 'border-primary-200 bg-primary-50' : 'border-stone-200 bg-stone-50',
        loading && 'animate-pulse'
      )}>
        <button
          disabled={disabled || loading || value <= 0}
          onClick={() => onChange(Math.max(0, value - 1))}
          className={cn(
            'px-1.5 py-1 text-xs transition-colors',
            value > 0 ? 'text-primary-500 hover:bg-primary-100' : 'text-stone-300',
            (disabled || value <= 0) && 'opacity-50 cursor-default'
          )}
        >
          <Minus size={12} />
        </button>
        <span className={cn(
          'px-2 py-1 text-xs font-bold min-w-[24px] text-center',
          value > 0 ? 'text-primary-700' : 'text-stone-400'
        )}>
          {value}
        </span>
        <button
          disabled={disabled || loading || value >= 7}
          onClick={() => onChange(Math.min(7, value + 1))}
          className={cn(
            'px-1.5 py-1 text-xs transition-colors',
            'text-primary-500 hover:bg-primary-100',
            (disabled || value >= 7) && 'opacity-50 cursor-default'
          )}
        >
          <Plus size={12} />
        </button>
      </div>
    </div>
  );
}
