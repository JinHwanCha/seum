import type { Role, MinisterRank, BoardType } from './types';
import { ROLE_HIERARCHY, MINISTER_HIERARCHY } from './constants';

export function isMinister(role: Role): boolean {
  return role === 'minister';
}

export function isAtLeast(userRole: Role, requiredRole: Role): boolean {
  return (ROLE_HIERARCHY[userRole] ?? 0) >= (ROLE_HIERARCHY[requiredRole] ?? 99);
}

export function canModifyUserRole(
  actorRole: Role,
  actorMinisterRank: MinisterRank | null,
  targetRole: Role,
  targetMinisterRank: MinisterRank | null,
  isAdmin?: boolean
): boolean {
  if (isAdmin) return true;
  if (!isMinister(actorRole)) return false;
  if (!isMinister(targetRole)) return true;
  if (!actorMinisterRank || !targetMinisterRank) return false;
  return (MINISTER_HIERARCHY[actorMinisterRank] ?? 0) > (MINISTER_HIERARCHY[targetMinisterRank] ?? 0);
}

// ─── Post Permissions ───

export function canWritePost(role: Role, boardType: BoardType, isBureau: boolean): boolean {
  if (role === 'pending') return false;
  if (boardType === 'notice') return isMinister(role) || isBureau;
  return isAtLeast(role, 'cell_member');
}

export function canDeletePost(role: Role, boardType: BoardType, isAuthor: boolean): boolean {
  if (isAuthor) return true;
  if (isMinister(role)) return true;
  if (boardType === 'sharing' || boardType === 'intercession') {
    return isAtLeast(role, 'village_leader');
  }
  return false;
}

export function canEditPost(role: Role, isAuthor: boolean): boolean {
  if (isAuthor) return true;
  return isMinister(role);
}

// ─── Comment Permissions ───

export function canDeleteComment(role: Role, isAuthor: boolean): boolean {
  if (isAuthor) return true;
  return isMinister(role) || role === 'village_leader';
}

export function canEditComment(isAuthor: boolean): boolean {
  return isAuthor;
}

// ─── Prayer Request Permissions ───

export function canEditPrayer(
  role: Role,
  isOwnPrayer: boolean,
  isSameCell: boolean
): boolean {
  if (isOwnPrayer) return true;
  if (isMinister(role)) return true;
  // 목자 and 목원 can edit same-cell prayer requests
  if (isSameCell && isAtLeast(role, 'cell_member')) return true;
  return false;
}

// ─── Admin Permissions ───

export function canAccessAdmin(role: Role, isBureau: boolean, isAdmin?: boolean): boolean {
  if (isAdmin) return true;
  return isMinister(role) || isBureau;
}

export function canApproveMembers(role: Role, isBureau: boolean, isAdmin?: boolean): boolean {
  if (isAdmin) return true;
  return isMinister(role) || isBureau;
}

export function canManageVillages(role: Role, isAdmin?: boolean): boolean {
  if (isAdmin) return true;
  return isMinister(role);
}

export function canManageCategories(role: Role, isBureau: boolean, isAdmin?: boolean): boolean {
  if (isAdmin) return true;
  return isMinister(role) || isBureau;
}

export function canChangeRoleLabels(ministerRank: MinisterRank | null, isAdmin?: boolean): boolean {
  if (isAdmin) return true;
  return ministerRank === 'pastor';
}

// ─── Attendance Permissions ───

export function canCheckAttendance(
  actorRole: Role,
  actorCellId: string | null,
  targetCellId: string | null,
  actorVillageId: string | null,
  targetVillageId: string | null,
  isAdmin?: boolean
): boolean {
  if (isAdmin) return true;
  if (isMinister(actorRole)) return true;
  if (actorRole === 'village_leader' && actorVillageId && actorVillageId === targetVillageId) return true;
  if (actorRole === 'cell_leader' && actorCellId && actorCellId === targetCellId) return true;
  return false;
}

export function canMoveMembers(role: Role, isAdmin?: boolean): boolean {
  if (isAdmin) return true;
  return isMinister(role) || role === 'village_leader';
}
