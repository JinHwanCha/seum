'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { ROLE_LABELS_DEFAULT, MINISTER_RANK_LABELS } from '@/lib/constants';
import { Check, X, UserCog, AlertCircle, GraduationCap, RotateCcw } from 'lucide-react';
import type { User, Village, Cell } from '@/lib/types';

interface CellWithLeader extends Cell {
  leader_name?: string | null;
}

interface VillageWithCells extends Village {
  cells: CellWithLeader[];
}

interface MemberListProps {
  showPending?: boolean;
  showGraduated?: boolean;
}

export function MemberList({ showPending = false, showGraduated = false }: MemberListProps) {
  const [members, setMembers] = useState<User[]>([]);
  const [villages, setVillages] = useState<VillageWithCells[]>([]);
  const [cells, setCells] = useState<CellWithLeader[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingMember, setEditingMember] = useState<User | null>(null);
  const [editRole, setEditRole] = useState('');
  const [editMinisterRank, setEditMinisterRank] = useState('');
  const [editVillageId, setEditVillageId] = useState('');
  const [editCellId, setEditCellId] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchLoading, setBatchLoading] = useState(false);

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    setSelectedIds(new Set());
    try {
      const query = showPending ? '?status=pending' : showGraduated ? '?status=graduated' : '';
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
        // Flatten cells with leader info
        const allCells: CellWithLeader[] = [];
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
  }, [showPending, showGraduated]);

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

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === members.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(members.map((m) => m.id)));
    }
  };

  const handleBatchGraduate = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`${selectedIds.size}명을 졸업 처리하시겠습니까? 소속 마을/소그룹이 해제됩니다.`)) return;
    setBatchLoading(true);
    try {
      await fetch('/api/admin/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'graduate', userIds: Array.from(selectedIds) }),
      });
      fetchMembers();
    } finally {
      setBatchLoading(false);
    }
  };

  const handleBatchRestore = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`${selectedIds.size}명을 복원하시겠습니까?`)) return;
    setBatchLoading(true);
    try {
      await fetch('/api/admin/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'restore', userIds: Array.from(selectedIds) }),
      });
      fetchMembers();
    } finally {
      setBatchLoading(false);
    }
  };

  const filteredCells = cells.filter((c) => c.village_id === editVillageId);

  // Helper: find village/cell name for a member
  const getVillageName = (villageId: string | null) => {
    if (!villageId) return null;
    return villages.find((v) => v.id === villageId)?.name || null;
  };
  const getCellName = (cellId: string | null) => {
    if (!cellId) return null;
    const cell = cells.find((c) => c.id === cellId);
    if (!cell) return null;
    return cell.leader_name
      ? `${cell.name || '소그룹'} (${cell.leader_name})`
      : cell.name || '소그룹';
  };

  // Separate unassigned vs assigned members
  const unassigned = members.filter((m) => !m.village_id && !m.cell_id);
  const assigned = members.filter((m) => m.village_id || m.cell_id);

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
    return <div className="text-center py-8 text-stone-400 text-sm">불러오는 중...</div>;
  }

  const showCheckboxes = !showPending;

  const renderMemberCard = (member: User) => (
    <div
      key={member.id}
      className="warm-surface rounded-xl border border-stone-200/80 p-4 flex items-center justify-between"
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {showCheckboxes && (
          <input
            type="checkbox"
            checked={selectedIds.has(member.id)}
            onChange={() => toggleSelect(member.id)}
            className="w-4 h-4 rounded border-stone-300 text-primary-600 focus:ring-primary-500 flex-shrink-0"
          />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-stone-900">{member.name}</span>
            {member.is_approved ? (
              <Badge variant={member.role === 'minister' ? 'primary' : 'default'}>
                {member.minister_rank
                  ? MINISTER_RANK_LABELS[member.minister_rank]
                  : ROLE_LABELS_DEFAULT[member.role]}
              </Badge>
            ) : (
              <Badge variant="warning">승인 대기</Badge>
            )}
            {showGraduated && (member as any).graduated_at && (
              <Badge variant="default">
                {new Date((member as any).graduated_at).getFullYear()}년 졸업
              </Badge>
            )}
            {!showGraduated && !member.village_id && !member.cell_id && member.is_approved && (
              <Badge variant="warning">미배정</Badge>
            )}
          </div>
          <p className="text-xs text-stone-500 mt-1">
            {member.phone} {member.birth_date ? `· ${member.birth_date}` : ''}
          </p>
          {!showGraduated && (member.village_id || member.cell_id) && (
            <p className="text-xs text-primary-600 mt-0.5">
              {getVillageName(member.village_id)}
              {member.cell_id ? ` · ${getCellName(member.cell_id)}` : ''}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 ml-2">
        {showPending && !member.is_approved ? (
          <>
            <Button size="sm" onClick={() => handleApprove(member.id)}>
              <Check size={14} className="mr-1" /> 수락
            </Button>
            <Button size="sm" variant="danger" onClick={() => handleReject(member.id)}>
              <X size={14} className="mr-1" /> 거절
            </Button>
          </>
        ) : showGraduated ? null : (
          <button
            onClick={() => openEdit(member)}
            className="p-2 text-stone-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
          >
            <UserCog size={16} />
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div>
      {members.length === 0 ? (
        <div className="text-center py-8 text-stone-400 text-sm">
          {showPending ? '대기 중인 회원이 없습니다.' : showGraduated ? '졸업한 회원이 없습니다.' : '회원이 없습니다.'}
        </div>
      ) : (
        <div className="space-y-3">
          {/* 배치 액션 바 */}
          {showCheckboxes && members.length > 0 && (
            <div className="flex items-center justify-between bg-stone-50 rounded-xl border border-stone-200/80 px-4 py-3">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={selectedIds.size === members.length && members.length > 0}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 rounded border-stone-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-stone-600">
                  전체 선택 {selectedIds.size > 0 && `(${selectedIds.size}명)`}
                </span>
              </label>
              <div className="flex gap-2">
                {showGraduated ? (
                  <Button
                    size="sm"
                    onClick={handleBatchRestore}
                    disabled={selectedIds.size === 0}
                    loading={batchLoading}
                  >
                    <RotateCcw size={14} className="mr-1" /> 복원
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={handleBatchGraduate}
                    disabled={selectedIds.size === 0}
                    loading={batchLoading}
                  >
                    <GraduationCap size={14} className="mr-1" /> 졸업
                  </Button>
                )}
              </div>
            </div>
          )}
          {/* 미배정 회원 */}
          {!showPending && unassigned.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2 px-1">
                <AlertCircle size={14} className="text-amber-500" />
                <span className="text-sm font-semibold text-amber-700">
                  미배정 ({unassigned.length}명)
                </span>
              </div>
              <div className="space-y-2">
                {unassigned.map(renderMemberCard)}
              </div>
            </div>
          )}

          {/* 배정된 회원 (마을별 그룹) */}
          {!showPending && assigned.length > 0 && (
            <div>
              {unassigned.length > 0 && (
                <div className="flex items-center gap-2 mb-2 px-1 mt-4">
                  <span className="text-sm font-semibold text-stone-700">
                    배정 완료 ({assigned.length}명)
                  </span>
                </div>
              )}
              <div className="space-y-2">
                {assigned.map(renderMemberCard)}
              </div>
            </div>
          )}

          {/* 승인 대기 탭 - 단순 리스트 */}
          {showPending && (
            <div className="space-y-2">
              {members.map(renderMemberCard)}
            </div>
          )}
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
                  label: c.leader_name
                    ? `${c.name || `소그룹 ${c.sort_order}`} (목자: ${c.leader_name})`
                    : c.name || `소그룹 ${c.sort_order}`,
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
