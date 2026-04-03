'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Plus, Trash2, Edit3, ChevronDown, ChevronRight } from 'lucide-react';
import type { Village, Cell } from '@/lib/types';

interface VillageWithCells extends Village {
  cells?: Cell[];
}

export function VillageManager() {
  const [villages, setVillages] = useState<VillageWithCells[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Village forms
  const [showAddVillage, setShowAddVillage] = useState(false);
  const [newVillageName, setNewVillageName] = useState('');
  const [editingVillage, setEditingVillage] = useState<Village | null>(null);
  const [editVillageName, setEditVillageName] = useState('');

  // Cell forms
  const [addCellToVillage, setAddCellToVillage] = useState<string | null>(null);
  const [newCellName, setNewCellName] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/villages');
      if (res.ok) {
        const data = await res.json();
        setVillages(data.villages || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const toggleExpand = (id: string) => {
    const next = new Set(expanded);
    next.has(id) ? next.delete(id) : next.add(id);
    setExpanded(next);
  };

  // Village CRUD
  const addVillage = async () => {
    if (!newVillageName.trim()) return;
    await fetch('/api/admin/villages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newVillageName.trim() }),
    });
    setNewVillageName('');
    setShowAddVillage(false);
    fetchData();
  };

  const updateVillage = async () => {
    if (!editingVillage || !editVillageName.trim()) return;
    await fetch(`/api/admin/villages/${editingVillage.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editVillageName.trim() }),
    });
    setEditingVillage(null);
    fetchData();
  };

  const deleteVillage = async (id: string) => {
    if (!confirm('마을을 삭제하시겠습니까? 소속 소그룹도 함께 삭제됩니다.')) return;
    await fetch(`/api/admin/villages/${id}`, { method: 'DELETE' });
    fetchData();
  };

  // Cell CRUD
  const addCell = async (villageId: string) => {
    await fetch('/api/admin/cells', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ villageId, name: newCellName.trim() || null }),
    });
    setNewCellName('');
    setAddCellToVillage(null);
    fetchData();
  };

  const deleteCell = async (cellId: string) => {
    if (!confirm('소그룹을 삭제하시겠습니까?')) return;
    await fetch(`/api/admin/cells/${cellId}`, { method: 'DELETE' });
    fetchData();
  };

  if (loading) {
    return <div className="text-center py-8 text-stone-400 text-sm">불러오는 중...</div>;
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setShowAddVillage(true)}>
          <Plus size={14} className="mr-1" /> 마을 추가
        </Button>
      </div>

      {villages.map((village) => (
        <div key={village.id} className="warm-surface rounded-xl border border-stone-200/80">
          <div className="flex items-center justify-between p-4">
            <button
              onClick={() => toggleExpand(village.id)}
              className="flex items-center gap-2 text-sm font-medium text-stone-900"
            >
              {expanded.has(village.id) ? (
                <ChevronDown size={16} />
              ) : (
                <ChevronRight size={16} />
              )}
              {village.name}
              {village.is_new_member_team && (
                <span className="text-xs text-stone-400">(새가족)</span>
              )}
              <span className="text-xs text-stone-400 ml-1">
                소그룹 {village.cells?.length || 0}개
              </span>
            </button>
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  setEditingVillage(village);
                  setEditVillageName(village.name);
                }}
                className="p-1.5 text-stone-400 hover:text-primary-600 transition-colors"
              >
                <Edit3 size={14} />
              </button>
              <button
                onClick={() => deleteVillage(village.id)}
                className="p-1.5 text-stone-400 hover:text-red-600 transition-colors"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>

          {expanded.has(village.id) && (
            <div className="border-t border-stone-100 p-4 space-y-2">
              {village.cells?.map((cell, idx) => (
                <div
                  key={cell.id}
                  className="flex items-center justify-between bg-primary-50/30 rounded-lg px-3 py-2"
                >
                  <span className="text-sm text-stone-700">
                    {cell.name || `소그룹 ${idx + 1}`}
                  </span>
                  <button
                    onClick={() => deleteCell(cell.id)}
                    className="p-1 text-stone-400 hover:text-red-600 transition-colors"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
              <button
                onClick={() => setAddCellToVillage(village.id)}
                className="text-xs text-primary-600 hover:underline"
              >
                + 소그룹 추가
              </button>
            </div>
          )}
        </div>
      ))}

      {/* Add Village Modal */}
      <Modal isOpen={showAddVillage} onClose={() => setShowAddVillage(false)} title="마을 추가">
        <div className="space-y-4">
          <Input
            label="마을 이름"
            value={newVillageName}
            onChange={(e) => setNewVillageName(e.target.value)}
            placeholder="마을 이름을 입력하세요"
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowAddVillage(false)}>취소</Button>
            <Button onClick={addVillage}>추가</Button>
          </div>
        </div>
      </Modal>

      {/* Edit Village Modal */}
      <Modal
        isOpen={!!editingVillage}
        onClose={() => setEditingVillage(null)}
        title="마을 이름 수정"
      >
        <div className="space-y-4">
          <Input
            label="마을 이름"
            value={editVillageName}
            onChange={(e) => setEditVillageName(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setEditingVillage(null)}>취소</Button>
            <Button onClick={updateVillage}>저장</Button>
          </div>
        </div>
      </Modal>

      {/* Add Cell Modal */}
      <Modal
        isOpen={!!addCellToVillage}
        onClose={() => setAddCellToVillage(null)}
        title="소그룹 추가"
      >
        <div className="space-y-4">
          <Input
            label="소그룹 이름 (선택)"
            value={newCellName}
            onChange={(e) => setNewCellName(e.target.value)}
            placeholder="비워두면 자동 번호 부여"
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setAddCellToVillage(null)}>취소</Button>
            <Button onClick={() => addCellToVillage && addCell(addCellToVillage)}>추가</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
