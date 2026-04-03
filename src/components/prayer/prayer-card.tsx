'use client';

import { useState } from 'react';
import { Edit3 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { PrayerForm } from './prayer-form';
import { ROLE_LABELS_DEFAULT, MINISTER_RANK_LABELS } from '@/lib/constants';
import type { PrayerRequest, SessionPayload } from '@/lib/types';
import { canEditPrayer } from '@/lib/permissions';

interface PrayerCardProps {
  prayer: PrayerRequest;
  session: SessionPayload;
  weekStart: string;
  onUpdated: (content: string) => void;
}

export function PrayerCard({ prayer, session, weekStart, onUpdated }: PrayerCardProps) {
  const [editing, setEditing] = useState(false);
  const user = prayer.user!;

  const isOwn = user.id === session.userId;
  const isSameCell = user.cell_id === session.cellId && !!session.cellId;
  const canEdit = canEditPrayer(session.role as any, isOwn, isSameCell);

  const getRoleDisplay = () => {
    if (user.minister_rank) return MINISTER_RANK_LABELS[user.minister_rank] || user.minister_rank;
    if (user.role) return ROLE_LABELS_DEFAULT[user.role] || user.role;
    return '';
  };

  const roleBadgeVariant = () => {
    if (user.minister_rank) return 'primary' as const;
    if (user.role === 'village_leader') return 'warning' as const;
    if (user.role === 'cell_leader') return 'success' as const;
    return 'default' as const;
  };

  if (editing) {
    return (
      <div className="bg-white rounded-xl border border-primary-200 p-4">
        <PrayerForm
          weekStart={weekStart}
          existingContent={prayer.content}
          existingId={prayer.id}
          targetUserName={isOwn ? undefined : user.name}
          targetUserId={isOwn ? undefined : user.id}
          onSaved={(content) => {
            setEditing(false);
            onUpdated(content);
          }}
        />
      </div>
    );
  }

  return (
    <div className="warm-surface rounded-xl border border-stone-200/80 p-4 hover:border-primary-200 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 mb-2">
          <span className="font-medium text-stone-900 text-sm">{user.name}</span>
          <Badge variant={roleBadgeVariant()}>{getRoleDisplay()}</Badge>
        </div>
        {canEdit && (
          <button
            onClick={() => setEditing(true)}
            className="p-1.5 rounded-lg text-stone-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
            title="수정"
          >
            <Edit3 size={14} />
          </button>
        )}
      </div>
      <p className="text-sm text-stone-700 whitespace-pre-wrap leading-relaxed">
        {prayer.content}
      </p>
    </div>
  );
}
