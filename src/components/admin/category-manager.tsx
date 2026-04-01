'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Modal } from '@/components/ui/modal';
import { Tabs } from '@/components/ui/tabs';
import { Plus, Trash2, Edit3 } from 'lucide-react';
import { BOARD_TYPE_LABELS } from '@/lib/constants';
import type { BoardCategory, BoardType } from '@/lib/types';

export function CategoryManager() {
  const [activeBoard, setActiveBoard] = useState<string>('sharing');
  const [categories, setCategories] = useState<BoardCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [editingCat, setEditingCat] = useState<BoardCategory | null>(null);
  const [editName, setEditName] = useState('');

  const tabs = Object.entries(BOARD_TYPE_LABELS).map(([key, label]) => ({
    key,
    label,
  }));

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/categories?boardType=${activeBoard}`);
      if (res.ok) {
        const data = await res.json();
        setCategories(data.categories || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [activeBoard]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const addCategory = async () => {
    if (!newName.trim()) return;
    await fetch('/api/admin/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim(), boardType: activeBoard }),
    });
    setNewName('');
    setShowAdd(false);
    fetchCategories();
  };

  const updateCategory = async () => {
    if (!editingCat || !editName.trim()) return;
    await fetch(`/api/admin/categories/${editingCat.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editName.trim() }),
    });
    setEditingCat(null);
    fetchCategories();
  };

  const deleteCategory = async (id: string) => {
    if (!confirm('카테고리를 삭제하시겠습니까?')) return;
    await fetch(`/api/admin/categories/${id}`, { method: 'DELETE' });
    fetchCategories();
  };

  return (
    <div className="space-y-4">
      <Tabs tabs={tabs} activeKey={activeBoard} onChange={setActiveBoard} />

      <div className="flex justify-end">
        <Button size="sm" onClick={() => setShowAdd(true)}>
          <Plus size={14} className="mr-1" /> 카테고리 추가
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-400 text-sm">불러오는 중...</div>
      ) : categories.length === 0 ? (
        <div className="text-center py-8 text-gray-400 text-sm">카테고리가 없습니다.</div>
      ) : (
        <div className="space-y-2">
          {categories.map((cat) => (
            <div
              key={cat.id}
              className="bg-white rounded-xl border border-gray-200 p-3 flex items-center justify-between"
            >
              <span className="text-sm text-gray-700">{cat.name}</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    setEditingCat(cat);
                    setEditName(cat.name);
                  }}
                  className="p-1.5 text-gray-400 hover:text-primary-600 transition-colors"
                >
                  <Edit3 size={14} />
                </button>
                <button
                  onClick={() => deleteCategory(cat.id)}
                  className="p-1.5 text-gray-400 hover:text-red-600 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="카테고리 추가">
        <div className="space-y-4">
          <Input
            label="카테고리 이름"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="카테고리 이름"
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowAdd(false)}>취소</Button>
            <Button onClick={addCategory}>추가</Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={!!editingCat}
        onClose={() => setEditingCat(null)}
        title="카테고리 수정"
      >
        <div className="space-y-4">
          <Input
            label="카테고리 이름"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setEditingCat(null)}>취소</Button>
            <Button onClick={updateCategory}>저장</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
