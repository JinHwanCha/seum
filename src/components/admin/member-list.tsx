'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { ROLE_LABELS_DEFAULT, MINISTER_RANK_LABELS } from '@/lib/constants';
import { Check, X, UserCog } from 'lucide-react';
import type { User, Village, Cell } from '@/lib/types';

interface MemberListProps {
  showPending?: boolean;
}

export function MemberList({ showPending = false }: MemberListProps) {
  const [members, setMembers] = useState<User[]>([]);
  const [villages, setVillages] = useState<Village[]>([]);
  const [cells, setCells] = useState<Cell[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingMember, setEditingMember] = useState<User | null>(null);
  const [editRole, setEditRole] = useState('');
  const [editMinisterRank, setEditMinisterRank] = useState('');
  const [editVillageId, setEditVillageId] = useState('');
  const [editCellId, setEditCellId] = useState('');

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    try {
      const query = showPending ? '?status=pending' : '';
      const [membersRes, villagesRes] = await Promise.all([
        fetch(`/api/admin/members${query}`),
        fetch('/api/admin/villages'),
      ]);
      if (membersRes.ok) {
        const data = await membersRes.json();
        setMembers(data.members || []);
      }
      if (villagesRes.ok) {
        const data = await villagesRes.json();
        setVillages(data.villages || []);
        // Flatten cells
        const allCells: Cell[] = [];
        (data.villages || []).forEach((v: any) => {
          (v.cells || []).forEach((c: any) => allCells.push({ ...c, village_id: v.id }));
        });
        setCells(allCells);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [showPending]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const handleApprove = async (userId: string) => {
    await fetch(`/api/admin/members/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'approve' }),
    });
    fetchMembers();
  };

  const handleReject = async (userId: string) => {
    if (!confirm('가입을 거절하시겠습니까?')) return;
    await fetch(`/api/admin/members/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reject' }),
    });
    fetchMembers();
  };

  const openEdit = (member: User) => {
    setEditingMember(member);
    setEditRole(member.role);
    setEditMinisterRank(member.minister_rank || '');
    setEditVillageId(member.village_id || '');
    setEditCellId(member.cell_id || '');
  };

  const handleUpdateMember = async () => {
    if (!editingMember) return;
    await fetch(`/api/admin/members/${editingMember.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'update',
        role: editRole,
        ministerRank: editRole === 'minister' ? editMinisterRank : null,
        villageId: editVillageId || null,
        cellId: editCellId || null,
      }),
    });
    setEditingMember(null);
    fetchMembers();
  };

  const filteredCells = cells.filter((c) => c.village_id === editVillageId);

  const roleOptions = [
    { value: 'cell_member', label: '목원' },
    { value: 'cell_leader', label: '목자' },
    { value: 'village_leader', label: '마을장' },
    { value: 'minister', label: '사역자' },
  ];

  const ministerRankOptions = [
    { value: 'secretary', label: '간사' },
    { value: 'evangelist', label: '전도사' },
    { value: 'associate_pastor', label: '강도사' },
    { value: 'pastor', label: '목사' },
  ];

  if (loading) {
    return <div className="text-center py-8 text-gray-400 text-sm">불러오는 중...</div>;
  }

  return (
    <div>
      {members.length === 0 ? (
        <div className="text-center py-8 text-gray-400 text-sm">
          {showPending ? '대기 중인 회원이 없습니다.' : '회원이 없습니다.'}
        </div>
      ) : (
        <div className="space-y-2">
          {members.map((member) => (
            <div
              key={member.id}
              className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900">{member.name}</span>
                  {member.is_approved ? (
                    <Badge variant={member.role === 'minister' ? 'primary' : 'default'}>
                      {member.minister_rank
                        ? MINISTER_RANK_LABELS[member.minister_rank]
                        : ROLE_LABELS_DEFAULT[member.role]}
                    </Badge>
                  ) : (
                    <Badge variant="warning">승인 대기</Badge>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {member.phone} {member.birth_date ? `· ${member.birth_date}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-1">
                {showPending && !member.is_approved ? (
                  <>
                    <Button size="sm" onClick={() => handleApprove(member.id)}>
                      <Check size={14} className="mr-1" /> 수락
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => handleReject(member.id)}>
                      <X size={14} className="mr-1" /> 거절
                    </Button>
                  </>
                ) : (
                  <button
                    onClick={() => openEdit(member)}
                    className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                  >
                    <UserCog size={16} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      <Modal
        isOpen={!!editingMember}
        onClose={() => setEditingMember(null)}
        title={`${editingMember?.name} 편성`}
      >
        <div className="space-y-4">
          <Select
            label="역할"
            options={roleOptions}
            value={editRole}
            onChange={(e) => setEditRole(e.target.value)}
          />

          {editRole === 'minister' && (
            <Select
              label="사역자 직급"
              options={ministerRankOptions}
              value={editMinisterRank}
              onChange={(e) => setEditMinisterRank(e.target.value)}
            />
          )}

          <Select
            label="마을"
            options={[
              { value: '', label: '미배정' },
              ...villages.map((v) => ({ value: v.id, label: v.name })),
            ]}
            value={editVillageId}
            onChange={(e) => {
              setEditVillageId(e.target.value);
              setEditCellId('');
            }}
          />

          {editVillageId && (
            <Select
              label="소그룹"
              options={[
                { value: '', label: '미배정' },
                ...filteredCells.map((c) => ({
                  value: c.id,
                  label: c.name || `소그룹 ${c.sort_order}`,
                })),
              ]}
              value={editCellId}
              onChange={(e) => setEditCellId(e.target.value)}
            />
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setEditingMember(null)}>
              취소
            </Button>
            <Button onClick={handleUpdateMember}>저장</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
