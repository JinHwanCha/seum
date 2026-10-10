'use client';

import { birthYearTag } from '@/lib/utils';

interface Props {
  checked: boolean;
  onChange: (checked: boolean) => void;
  name: string;
  birthDate: string | null;
}

export function EarlyBirthCheckbox({ checked, onChange, name, birthDate }: Props) {
  return (
    <div className="space-y-1">
      <label className="flex items-center gap-2 text-sm text-stone-700">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="h-4 w-4 rounded border-stone-300 accent-primary-600"
        />
        빠른 년생
      </label>
      <p className="text-xs text-stone-500">
        실제 생년월일은 유지하고, 이름 옆 또래 연도만 1년 낮춰 표시합니다.
      </p>
      {birthDate && (
        <p className="text-xs text-primary-700">
          표시 예시: {name || '이름'}{birthYearTag(birthDate, checked)}
        </p>
      )}
    </div>
  );
}
