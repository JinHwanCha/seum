'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { WeekSelector } from '@/components/prayer/week-selector';
import { PrayerForm } from '@/components/prayer/prayer-form';
import { PrayerCard } from '@/components/prayer/prayer-card';
import { AttendanceCheck } from '@/components/attendance/attendance-check';
import { Tabs } from '@/components/ui/tabs';
import { Card, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getCurrentWeekSunday, formatWeekDate } from '@/lib/date-utils';
import { ROLE_LABELS_DEFAULT } from '@/lib/constants';
import { Users, Crown, User, ChevronDown, ChevronRight } from 'lucide-react';
import type { PrayerRequest, Attendance } from '@/lib/types';

const birthYearLabel = (birthDate?: string | null) => {
  if (!birthDate) return '';
  return ` (${birthDate.substring(2, 4)})`;
};

interface CellMember {
  id: string;
  name: string;
  role: string;
  birth_date?: string | null;
}

interface CellInfo {
  id: string;
  name: string | null;
  sort_order: number;
  leader_name: string | null;
  members: CellMember[];
  prayers: PrayerRequest[];
}

interface VillageGroup {
  id: string;
  name: string;
  sort_order?: number;
  cells: CellInfo[];
}

export default function SmallGroupPage() {
  const { user } = useAuth();
  const [currentSunday, setCurrentSunday] = useState(() => getCurrentWeekSunday());
  const [loading, setLoading] = useState(true);
  const [myPrayer, setMyPrayer] = useState<PrayerRequest | null>(null);
  const [cellName, setCellName] = useState<string | null>(null);
  const [villageName, setVillageName] = useState<string | null>(null);
  const [leader, setLeader] = useState<{ id: string; name: string } | null>(null);
  const [members, setMembers] = useState<CellMember[]>([]);
  const [prayers, setPrayers] = useState<PrayerRequest[]>([]);
  const [villageCells, setVillageCells] = useState<VillageGroup[]>([]);
  const [expandedCells, setExpandedCells] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState('prayer');
  const [attendanceMap, setAttendanceMap] = useState<Record<string, Attendance>>({});

  const weekStart = formatWeekDate(currentSunday);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/small-group?weekStart=${weekStart}`);
      if (res.ok) {
        const data = await res.json();
        setCellName(data.cell?.name || null);
        setVillageName(data.villageName || null);
        setLeader(data.leader || null);
        setMembers(data.members || []);
        setPrayers(data.prayers || []);
        setMyPrayer(data.myPrayer || null);
        setVillageCells(data.villageCells || []);
        setAttendanceMap(data.attendanceMap || {});
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [weekStart]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const toggleCell = (cellId: string) => {
    setExpandedCells((prev) => {
      const next = new Set(prev);
      if (next.has(cellId)) next.delete(cellId);
      else next.add(cellId);
      return next;
    });
  };

  // Optimistic attendance update (no refetch)
  const handleAttendanceChange = useCallback(
    (userId: string, field: string, value: unknown) => {
      setAttendanceMap((prev) => {
        const existing = prev[userId] || {
          id: '',
          user_id: userId,
          department_id: '',
          week_start: weekStart,
          worship_service: null,
          department_meeting: false,
          small_group: false,
          prayer_count: 0,
          qt_count: 0,
          bible_reading: false,
          checked_by: null,
          created_at: '',
          updated_at: '',
        };
        return {
          ...prev,
          [userId]: { ...existing, [field]: value },
        };
      });
    },
    [weekStart]
  );

  if (!user) return null;

  const isMinister = user.role === 'minister';
  const isVillageLeader = user.role === 'village_leader';
  const hasOversight = isMinister || isVillageLeader;
  const hasCell = !!user.cellId;

  const isCellLeader = user.role === 'cell_leader';
  const canCheckAtt = isCellLeader || hasOversight || user.isAdmin;

  const TABS = [
    { key: 'prayer', label: '기도제목' },
    ...(canCheckAtt ? [{ key: 'attendance', label: '출석체크' }] : []),
  ];

  // Build member prayer map for own cell
  const prayerByUser: Record<string, PrayerRequest> = {};
  prayers.forEach((p) => {
    prayerByUser[p.user_id] = p;
  });

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold text-stone-900">소그룹</h1>

      <WeekSelector currentSunday={currentSunday} onChange={setCurrentSunday} />

      {canCheckAtt && (
        <Tabs tabs={TABS} activeKey={activeTab} onChange={setActiveTab} />
      )}

      {/* ===== PRAYER TAB ===== */}
      {activeTab === 'prayer' && (
        <>
          {/* My Prayer Request */}
          <Card>
            <CardTitle className="text-base">나의 기도제목</CardTitle>
            <PrayerForm
              weekStart={weekStart}
              existingContent={myPrayer?.content}
              existingId={myPrayer?.id}
              onSaved={fetchData}
            />
          </Card>

          {loading ? (
            <div className="text-center py-8 text-stone-400 text-sm">불러오는 중...</div>
          ) : (
            <>
              {/* === Cell Member / Cell Leader View === */}
              {hasCell && !hasOversight && (
                <div className="space-y-3">
                  {/* Cell Info Header */}
                  <div className="warm-surface rounded-xl border border-stone-200/80 p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Users size={18} className="text-primary-600" />
                      <h2 className="font-semibold text-stone-900">
                        {cellName || '소그룹'}
                      </h2>
                      {villageName && (
                        <Badge variant="default">{villageName}</Badge>
                      )}
                    </div>

                    {/* Leader */}
                    {leader && (
                      <div className="flex items-center gap-2 mb-3 pb-3 border-b border-stone-100">
                        <Crown size={14} className="text-amber-500" />
                        <span className="text-sm font-medium text-stone-900">{leader.name}{birthYearLabel((members.find(m => m.role === 'cell_leader') || {} as any).birth_date)}</span>
                        <Badge variant="success">목자</Badge>
                      </div>
                    )}

                    {/* Members List */}
                    <div className="space-y-1.5">
                      {members
                        .filter((m) => m.role !== 'cell_leader')
                        .map((m) => (
                          <div key={m.id} className="flex items-center gap-2 text-sm">
                            <User size={14} className="text-stone-400" />
                            <span className="text-stone-700">{m.name}{birthYearLabel(m.birth_date)}</span>
                            {m.id === user.userId && (
                              <span className="text-xs text-primary-500">(나)</span>
                            )}
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* Cell Prayers */}
                  <h2 className="text-sm font-semibold text-stone-500 px-1">소그룹 기도제목</h2>

                  {members.length === 0 ? (
                    <div className="text-center py-8 text-stone-400 text-sm">
                      소그룹이 배정되지 않았습니다.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {members.map((m) => {
                        const prayer = prayerByUser[m.id];
                        if (!prayer) {
                          return (
                            <div
                              key={m.id}
                              className="warm-surface rounded-xl border border-stone-100 p-4 opacity-60"
                            >
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-stone-900 text-sm">{m.name}{birthYearLabel(m.birth_date)}</span>
                                <Badge variant={m.role === 'cell_leader' ? 'success' : 'default'}>
                                  {ROLE_LABELS_DEFAULT[m.role]}
                                </Badge>
                              </div>
                              <p className="text-sm text-stone-400 italic">아직 기도제목을 작성하지 않았습니다.</p>
                            </div>
                          );
                        }
                        return (
                          <PrayerCard
                            key={prayer.id}
                            prayer={prayer}
                            session={user}
                            weekStart={weekStart}
                            onUpdated={fetchData}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* === No Cell Assigned === */}
              {!hasCell && !hasOversight && (
                <div className="text-center py-12 text-stone-400">
                  <Users size={40} className="mx-auto mb-3 opacity-40" />
                  <p className="text-sm font-medium">소그룹이 아직 배정되지 않았습니다.</p>
                  <p className="text-xs mt-1">관리자에게 소그룹 배정을 요청해주세요.</p>
                </div>
              )}

              {/* === Minister / Village Leader Oversight View === */}
              {hasOversight && villageCells.length > 0 && (
                <div className="space-y-4">
                  {villageCells.map((village) => (
                    <div key={village.id}>
                      {isMinister && (
                        <h2 className="text-sm font-semibold text-stone-700 mb-2 px-1">
                          {village.name} 마을
                        </h2>
                      )}
                      <div className="space-y-2">
                        {village.cells.map((cell) => {
                          const isExpanded = expandedCells.has(cell.id);
                          const prayerCount = cell.prayers.length;
                          const memberCount = cell.members.length;

                          return (
                            <div
                              key={cell.id}
                              className="warm-surface rounded-xl border border-stone-200/80 overflow-hidden"
                            >
                              {/* Cell Header - Clickable */}
                              <button
                                onClick={() => toggleCell(cell.id)}
                                className="w-full flex items-center justify-between p-4 hover:bg-primary-50/30 transition-colors text-left"
                              >
                                <div className="flex items-center gap-2">
                                  {isExpanded ? (
                                    <ChevronDown size={16} className="text-stone-400" />
                                  ) : (
                                    <ChevronRight size={16} className="text-stone-400" />
                                  )}
                                  <span className="font-medium text-stone-900 text-sm">
                                    {cell.name || '소그룹'}
                                  </span>
                                  {cell.leader_name && (
                                    <span className="text-xs text-stone-500">
                                      목자: {cell.leader_name}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge variant="default">
                                    {memberCount}명
                                  </Badge>
                                  <Badge variant={prayerCount === memberCount ? 'success' : 'warning'}>
                                    기도 {prayerCount}/{memberCount}
                                  </Badge>
                                </div>
                              </button>

                              {/* Expanded Content */}
                              {isExpanded && (
                                <div className="border-t border-stone-100 p-4 space-y-3">
                                  {/* Members + their prayers */}
                                  {cell.members.map((m) => {
                                    const prayer = cell.prayers.find(
                                      (p) => p.user_id === m.id
                                    );
                                    return (
                                      <div key={m.id} className="space-y-1">
                                        <div className="flex items-center gap-2">
                                          {m.role === 'cell_leader' ? (
                                            <Crown size={14} className="text-amber-500" />
                                          ) : (
                                            <User size={14} className="text-stone-400" />
                                          )}
                                          <span className="text-sm font-medium text-stone-900">
                                            {m.name}{birthYearLabel(m.birth_date)}
                                          </span>
                                          <Badge
                                            variant={
                                              m.role === 'cell_leader' ? 'success' : 'default'
                                            }
                                          >
                                            {ROLE_LABELS_DEFAULT[m.role]}
                                          </Badge>
                                        </div>
                                        {prayer ? (
                                          <div className="ml-6 bg-primary-50/30 rounded-lg p-3">
                                            <p className="text-sm text-stone-700 whitespace-pre-wrap leading-relaxed">
                                              {prayer.content}
                                            </p>
                                          </div>
                                        ) : (
                                          <p className="ml-6 text-xs text-stone-400 italic">
                                            기도제목 미작성
                                          </p>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {hasOversight && villageCells.length === 0 && (
                <div className="text-center py-8 text-stone-400 text-sm">
                  소그룹 데이터가 없습니다.
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* ===== ATTENDANCE TAB ===== */}
      {activeTab === 'attendance' && (
        <>
          {loading ? (
            <div className="text-center py-8 text-stone-400 text-sm">불러오는 중...</div>
          ) : (
            <>
              {/* Cell Leader: own cell attendance */}
              {hasCell && !hasOversight && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 px-1">
                    <h2 className="text-sm font-semibold text-stone-700">{cellName || '소그룹'} 출석</h2>
                    {villageName && <Badge variant="default">{villageName}</Badge>}
                  </div>
                  <AttendanceCheck
                    members={members}
                    attendance={attendanceMap}
                    weekStart={weekStart}
                    session={user}
                    cellId={user.cellId}
                    cellVillageId={user.villageId}
                    onAttendanceChange={handleAttendanceChange}
                  />
                </div>
              )}

              {/* Minister / Village Leader: all cells */}
              {hasOversight && villageCells.length > 0 && (
                <div className="space-y-4">
                  {villageCells.map((village) => (
                    <div key={village.id}>
                      {isMinister && (
                        <h2 className="text-sm font-semibold text-stone-700 mb-2 px-1">
                          {village.name} 마을
                        </h2>
                      )}
                      <div className="space-y-2">
                        {village.cells.map((cell) => {
                          const isExpanded = expandedCells.has(`att-${cell.id}`);
                          const memberCount = cell.members.length;
                          const sgCount = cell.members.filter((m) => attendanceMap[m.id]?.small_group).length;

                          return (
                            <div
                              key={cell.id}
                              className="warm-surface rounded-xl border border-stone-200/80 overflow-hidden"
                            >
                              <button
                                onClick={() => {
                                  setExpandedCells((prev) => {
                                    const next = new Set(prev);
                                    const key = `att-${cell.id}`;
                                    if (next.has(key)) next.delete(key);
                                    else next.add(key);
                                    return next;
                                  });
                                }}
                                className="w-full flex items-center justify-between p-4 hover:bg-primary-50/30 transition-colors text-left"
                              >
                                <div className="flex items-center gap-2">
                                  {isExpanded ? (
                                    <ChevronDown size={16} className="text-stone-400" />
                                  ) : (
                                    <ChevronRight size={16} className="text-stone-400" />
                                  )}
                                  <span className="font-medium text-stone-900 text-sm">
                                    {cell.name || '소그룹'}
                                  </span>
                                  {cell.leader_name && (
                                    <span className="text-xs text-stone-500">
                                      목자: {cell.leader_name}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge variant="default">{memberCount}명</Badge>
                                  <Badge variant={sgCount === memberCount ? 'success' : 'warning'}>
                                    출석 {sgCount}/{memberCount}
                                  </Badge>
                                </div>
                              </button>

                              {isExpanded && (
                                <div className="border-t border-stone-100 p-4">
                                  <AttendanceCheck
                                    members={cell.members}
                                    attendance={attendanceMap}
                                    weekStart={weekStart}
                                    session={user}
                                    cellId={cell.id}
                                    cellVillageId={village.id}
                                    onAttendanceChange={handleAttendanceChange}
                                  />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {hasOversight && villageCells.length === 0 && (
                <div className="text-center py-8 text-stone-400 text-sm">
                  소그룹 데이터가 없습니다.
                </div>
              )}

              {!hasCell && !hasOversight && (
                <div className="text-center py-12 text-stone-400">
                  <Users size={40} className="mx-auto mb-3 opacity-40" />
                  <p className="text-sm font-medium">소그룹이 아직 배정되지 않았습니다.</p>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
