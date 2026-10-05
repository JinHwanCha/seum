import type { VillageWithCells } from './admin-data';

interface GroupSelectionUser {
  requires_group_selection: boolean;
  village_id: string | null;
  cell_id: string | null;
}

export function needsGroupSelection(user: GroupSelectionUser): boolean {
  return user.requires_group_selection && (!user.village_id || !user.cell_id);
}

export function validateGroupSelection(
  villages: VillageWithCells[],
  villageId: unknown,
  cellId: unknown
): string | null {
  if (typeof villageId !== 'string' || !villageId.trim()) {
    return '마을을 선택해주세요.';
  }
  if (typeof cellId !== 'string' || !cellId.trim()) {
    return '소그룹을 선택해주세요.';
  }
  const village = villages.find((item) => item.id === villageId);
  if (!village || !village.cells.some((cell) => cell.id === cellId)) {
    return '잘못된 마을 또는 소그룹입니다. 마을장이나 사역자에게 문의해주세요.';
  }
  return null;
}
