'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { Card } from '@/components/ui/card';
import { Modal } from '@/components/ui/modal';
import { Badge } from '@/components/ui/badge';
import { pickVerseForMember } from '@/lib/bible-verses';

interface Member {
  id: string;
  name: string;
}

interface WeekStat {
  weekStart: string;
  weekIndex: number;
  presentCount: number;
  totalMembers: number;
  score: number; // 0..1
}

interface MemberScore {
  userId: string;
  name: string;
  monthScore: number; // 0..1
  presentWeeks: number;
  totalWeeks: number;
}

interface TreeData {
  weeks: WeekStat[];
  weekKeys: string[];
  memberScores: MemberScore[];
  monthScore: number;
}

interface TreeGrowthProps {
  cellId: string | null;
  cellName: string | null;
  villageName?: string | null;
  weekStart: string; // YYYY-MM-DD (selected Sunday)
  members: Member[];
}

type Health = 'wilted' | 'okay' | 'good' | 'excellent';

function healthOf(score: number): Health {
  if (score >= 0.75) return 'excellent';
  if (score >= 0.5) return 'good';
  if (score >= 0.25) return 'okay';
  return 'wilted';
}

const HEALTH_LABEL: Record<Health, string> = {
  excellent: '풍성함',
  good: '건강함',
  okay: '자라는 중',
  wilted: '돌봄이 필요해요',
};

const HEALTH_COLOR: Record<Health, string> = {
  excellent: 'text-emerald-600',
  good: 'text-green-600',
  okay: 'text-amber-600',
  wilted: 'text-stone-500',
};

const STAGE_LABEL = ['씨앗', '새싹·이파리', '줄기', '나무·열매'];

// 해당 weekStart가 속한 월의 첫날 (YYYY-MM-01)
function monthStartOf(weekStart: string): string {
  const [y, m] = weekStart.split('-');
  return `${y}-${m}-01`;
}

// 해당 weekStart가 그 월의 몇 번째 일요일인지 (0-based)
function weekIndexInMonth(weekStart: string, weekKeys: string[]): number {
  const idx = weekKeys.indexOf(weekStart);
  if (idx >= 0) return Math.min(idx, 3);
  // 월에 속하지 않는 경우 (이전 달에 시작) → 0
  return 0;
}

// 월간 누적 평균 점수 (선택된 주차까지)
function cumulativeScore(weeks: WeekStat[], upToIndex: number): number {
  const slice = weeks.slice(0, Math.min(upToIndex + 1, weeks.length));
  if (slice.length === 0) return 0;
  return slice.reduce((a, w) => a + w.score, 0) / slice.length;
}

// ========== SVG ==========

function Pot() {
  return (
    <g>
      <ellipse cx="160" cy="290" rx="60" ry="8" fill="#92400e" opacity="0.3" />
      <path d="M110 250 L210 250 L200 295 L120 295 Z" fill="#a16207" />
      <rect x="105" y="245" width="110" height="12" rx="4" fill="#854d0e" />
    </g>
  );
}

function Soil() {
  return <ellipse cx="160" cy="252" rx="48" ry="6" fill="#3f2d20" />;
}

// 씨앗 - 갈색~황금. 건강할수록 밝고 윤기 있음
function SeedArt({ health }: { health: Health }) {
  const fill =
    health === 'excellent' ? '#facc15' :
    health === 'good' ? '#ca8a04' :
    health === 'okay' ? '#92400e' : '#57534e';
  const glow = health === 'excellent' || health === 'good';
  return (
    <g>
      {glow && (
        <ellipse cx="160" cy="245" rx="22" ry="14" fill="#fde68a" opacity="0.4">
          <animate attributeName="opacity" values="0.2;0.5;0.2" dur="3s" repeatCount="indefinite" />
        </ellipse>
      )}
      <ellipse cx="160" cy="245" rx="11" ry="14" fill={fill} stroke="#1c1917" strokeWidth="1" />
      <path d="M160 232 Q163 238 160 244 Q157 238 160 232" fill="#fef3c7" opacity="0.5" />
    </g>
  );
}

// 이파리 (새싹)
function LeavesArt({ health }: { health: Health }) {
  const leafCount = health === 'excellent' ? 5 : health === 'good' ? 4 : health === 'okay' ? 3 : 2;
  const color = health === 'wilted' ? '#a3a3a3' : health === 'okay' ? '#84cc16' : '#22c55e';
  const stemColor = health === 'wilted' ? '#78716c' : '#15803d';
  const droop = health === 'wilted' ? 8 : 0;
  return (
    <g>
      <ellipse cx="160" cy="245" rx="6" ry="8" fill="#92400e" />
      <line x1="160" y1="244" x2="160" y2="210" stroke={stemColor} strokeWidth="3" strokeLinecap="round" />
      {Array.from({ length: leafCount }).map((_, i) => {
        const side = i % 2 === 0 ? -1 : 1;
        const y = 235 - i * 7;
        const tipX = 160 + side * 18;
        const tipY = y - 4 + droop;
        return (
          <path
            key={i}
            d={`M160 ${y} Q${160 + side * 9} ${y - 10 + droop} ${tipX} ${tipY} Q${160 + side * 4} ${y - 2} 160 ${y}`}
            fill={color}
            stroke="#15803d"
            strokeWidth="0.5"
          />
        );
      })}
    </g>
  );
}

// 줄기 (나무 기둥이 세워지고 가지가 뻗기 시작)
function StemArt({ health }: { health: Health }) {
  const trunkColor = health === 'wilted' ? '#78716c' : '#78350f';
  const leafColor = health === 'wilted' ? '#a3a3a3' : health === 'okay' ? '#65a30d' : health === 'good' ? '#22c55e' : '#16a34a';
  const trunkHeight = health === 'wilted' ? 60 : health === 'okay' ? 80 : 100;
  const trunkTop = 245 - trunkHeight;
  return (
    <g>
      <path
        d={`M152 245 L154 ${trunkTop} Q160 ${trunkTop - 5} 166 ${trunkTop} L168 245 Z`}
        fill={trunkColor}
      />
      {/* 가지 */}
      <path d={`M160 ${trunkTop + 25} Q145 ${trunkTop + 18} 130 ${trunkTop + 10}`} stroke={trunkColor} strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d={`M160 ${trunkTop + 35} Q175 ${trunkTop + 28} 190 ${trunkTop + 22}`} stroke={trunkColor} strokeWidth="3" fill="none" strokeLinecap="round" />
      {/* 잎사귀 클러스터 */}
      <circle cx="130" cy={trunkTop + 8} r="14" fill={leafColor} opacity="0.85" />
      <circle cx="190" cy={trunkTop + 20} r="14" fill={leafColor} opacity="0.85" />
      <circle cx="160" cy={trunkTop - 2} r="18" fill={leafColor} opacity="0.9" />
    </g>
  );
}

// 나무 + 열매 (한 멤버당 하나)
function TreeArt({
  health,
  members,
  memberScores,
  onFruitClick,
}: {
  health: Health;
  members: Member[];
  memberScores: MemberScore[];
  onFruitClick: (m: Member) => void;
}) {
  const trunkColor = health === 'wilted' ? '#78716c' : '#78350f';
  const canopyColor = health === 'wilted' ? '#a3a3a3' : health === 'okay' ? '#84cc16' : health === 'good' ? '#22c55e' : '#16a34a';
  const canopyDeep = health === 'wilted' ? '#737373' : health === 'okay' ? '#65a30d' : health === 'good' ? '#16a34a' : '#15803d';

  const scoreMap = new Map(memberScores.map((s) => [s.userId, s.monthScore]));

  // 캐노피 영역 안에 멤버 수만큼 열매를 원형 분포로 배치
  const fruitPositions = useMemo(() => {
    const centerX = 160;
    const centerY = 130;
    const n = members.length;
    if (n === 0) return [];
    return members.map((m, i) => {
      // 골든앵글로 분포해 예쁘게 흩뿌림
      const ga = 2.39996323;
      const r = 50 * Math.sqrt((i + 0.5) / n);
      const theta = i * ga;
      return {
        member: m,
        cx: centerX + r * Math.cos(theta),
        cy: centerY + r * Math.sin(theta) * 0.75, // 캐노피가 가로로 더 넓음
      };
    });
  }, [members]);

  return (
    <g>
      {/* 기둥 */}
      <path d="M150 245 L152 145 Q160 135 168 145 L170 245 Z" fill={trunkColor} />
      {/* 캐노피 (구름 형태) */}
      <circle cx="130" cy="135" r="35" fill={canopyDeep} />
      <circle cx="190" cy="135" r="35" fill={canopyDeep} />
      <circle cx="160" cy="115" r="38" fill={canopyColor} />
      <circle cx="140" cy="115" r="30" fill={canopyColor} />
      <circle cx="180" cy="115" r="30" fill={canopyColor} />
      <circle cx="160" cy="145" r="32" fill={canopyColor} />
      {/* 열매 */}
      {fruitPositions.map(({ member, cx, cy }) => {
        const score = scoreMap.get(member.id) ?? 0;
        const fruitColor = score >= 0.5 ? '#dc2626' : '#fbbf24'; // 빨강 사과 / 노랑 위로의 열매
        const stroke = score >= 0.5 ? '#7f1d1d' : '#b45309';
        return (
          <g
            key={member.id}
            className="cursor-pointer"
            onClick={() => onFruitClick(member)}
          >
            <title>{member.name}</title>
            <circle cx={cx} cy={cy} r="7" fill={fruitColor} stroke={stroke} strokeWidth="1" />
            <ellipse cx={cx - 2} cy={cy - 2} rx="2" ry="1.5" fill="#fff" opacity="0.6" />
            <line x1={cx} y1={cy - 7} x2={cx + 1} y2={cy - 11} stroke="#15803d" strokeWidth="1.5" />
          </g>
        );
      })}
    </g>
  );
}

// ========== Main Component ==========

export function TreeGrowth({ cellId, cellName, villageName, weekStart, members }: TreeGrowthProps) {
  const [selectedFruit, setSelectedFruit] = useState<Member | null>(null);

  const monthStart = monthStartOf(weekStart);
  const swrKey = cellId
    ? `/api/small-group/tree?cellId=${cellId}&monthStart=${monthStart}`
    : null;
  const { data, isLoading } = useSWR<TreeData>(swrKey);

  const weekKeys = data?.weekKeys ?? [];
  const weeks = data?.weeks ?? [];
  const memberScores = data?.memberScores ?? [];

  const stage = weekIndexInMonth(weekStart, weekKeys); // 0..3
  // 누적 점수로 건강 결정 (그 주차까지)
  const cumScore = useMemo(() => cumulativeScore(weeks, stage), [weeks, stage]);
  const health = healthOf(cumScore);

  const monthLabel = (() => {
    const [y, m] = monthStart.split('-');
    return `${y}년 ${parseInt(m, 10)}월`;
  })();

  const selectedScore = selectedFruit
    ? memberScores.find((s) => s.userId === selectedFruit.id)?.monthScore ?? 0
    : 0;
  const verse = selectedFruit ? pickVerseForMember(selectedFruit.id, selectedScore) : null;

  if (!cellId) {
    return (
      <Card>
        <p className="text-sm text-stone-500 text-center py-6">
          소그룹에 배정된 후 나무를 키울 수 있어요 🌱
        </p>
      </Card>
    );
  }

  return (
    <Card className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-base font-bold text-stone-900">
            {cellName ? `${cellName} 소그룹의 나무` : '우리 소그룹의 나무'}
          </h2>
          <p className="text-xs text-stone-500">{monthLabel} · {STAGE_LABEL[stage]}</p>
        </div>
        <div className="flex items-center gap-2">
          {villageName && <Badge variant="default">{villageName}</Badge>}
          <span className={`text-xs font-semibold ${HEALTH_COLOR[health]}`}>
            {HEALTH_LABEL[health]}
          </span>
        </div>
      </div>

      {/* 주차 진행 바 */}
      <div className="flex items-center gap-1.5">
        {[0, 1, 2, 3].map((i) => {
          const wk = weeks[i];
          const isPast = i < stage;
          const isCurrent = i === stage;
          const dotColor = wk
            ? wk.score >= 0.75 ? 'bg-emerald-500'
            : wk.score >= 0.5 ? 'bg-green-500'
            : wk.score >= 0.25 ? 'bg-amber-400'
            : 'bg-stone-300'
            : 'bg-stone-200';
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div
                className={`w-full h-1.5 rounded-full ${
                  isCurrent ? dotColor : isPast ? dotColor : 'bg-stone-200'
                } ${isCurrent ? 'ring-2 ring-offset-1 ring-emerald-300' : ''}`}
              />
              <span className={`text-[10px] ${isCurrent ? 'font-bold text-stone-700' : 'text-stone-400'}`}>
                {STAGE_LABEL[i]}
              </span>
            </div>
          );
        })}
      </div>

      {/* SVG 나무 */}
      <div className="relative bg-gradient-to-b from-sky-50 via-sky-50 to-emerald-50 rounded-xl py-2">
        <svg viewBox="0 0 320 310" className="w-full h-64 sm:h-80">
          {/* 배경 햇살 */}
          {(health === 'excellent' || health === 'good') && (
            <circle cx="60" cy="50" r="22" fill="#fde047" opacity="0.6">
              <animate attributeName="opacity" values="0.4;0.7;0.4" dur="4s" repeatCount="indefinite" />
            </circle>
          )}
          {/* 빗방울 (시들 때) */}
          {health === 'wilted' && (
            <g opacity="0.4">
              <line x1="60" y1="40" x2="55" y2="60" stroke="#60a5fa" strokeWidth="2" />
              <line x1="100" y1="30" x2="95" y2="50" stroke="#60a5fa" strokeWidth="2" />
              <line x1="240" y1="45" x2="235" y2="65" stroke="#60a5fa" strokeWidth="2" />
            </g>
          )}

          {stage === 0 && (
            <>
              <Pot />
              <Soil />
              <SeedArt health={health} />
            </>
          )}
          {stage === 1 && (
            <>
              <Pot />
              <Soil />
              <LeavesArt health={health} />
            </>
          )}
          {stage === 2 && (
            <>
              <Pot />
              <Soil />
              <StemArt health={health} />
            </>
          )}
          {stage === 3 && (
            <>
              <Pot />
              <Soil />
              <TreeArt
                health={health}
                members={members}
                memberScores={memberScores}
                onFruitClick={(m) => setSelectedFruit(m)}
              />
            </>
          )}
        </svg>

        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/50 rounded-xl">
            <span className="text-xs text-stone-500">불러오는 중...</span>
          </div>
        )}
      </div>

      {/* 안내 문구 */}
      <div className="text-xs text-stone-600 bg-stone-50 rounded-lg px-3 py-2 space-y-1">
        {stage === 0 && (
          <p>🌱 이번 달 첫 주, 씨앗이 심겨졌어요. 출석과 경건생활로 함께 자라가요!</p>
        )}
        {stage === 1 && (
          <p>🌿 작은 새싹이 돋아나고 있어요. 꾸준히 출석하면 더 푸르러집니다.</p>
        )}
        {stage === 2 && (
          <p>🌳 줄기가 굳건히 자라고 있어요. 다음 주는 열매를 맺는 주간!</p>
        )}
        {stage === 3 && (
          <p>🍎 우리 소그룹의 열매가 맺혔어요. 열매를 눌러 말씀을 받아보세요.</p>
        )}
        {weeks.length > 0 && (
          <p className="text-stone-500">
            이번 달 누적 참여도{' '}
            <span className="font-semibold text-stone-700">{Math.round(cumScore * 100)}%</span>
            {' · '}이번 주 참여{' '}
            <span className="font-semibold text-stone-700">
              {weeks[stage]?.presentCount ?? 0}/{weeks[stage]?.totalMembers ?? members.length}
            </span>
          </p>
        )}
      </div>

      {/* 열매 클릭 모달 */}
      {selectedFruit && verse && (
        <Modal isOpen={true} onClose={() => setSelectedFruit(null)} title={`${selectedFruit.name} 님께`}>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{selectedScore >= 0.5 ? '🍎' : '🍯'}</span>
              <Badge variant={selectedScore >= 0.5 ? 'success' : 'default'}>
                {selectedScore >= 0.5 ? '풍성한 열매' : '위로의 열매'}
              </Badge>
              <span className="text-xs text-stone-500">
                이번 달 참여 {Math.round(selectedScore * 100)}%
              </span>
            </div>
            <blockquote className="border-l-4 border-emerald-400 bg-emerald-50 px-4 py-3 rounded">
              <p className="text-sm text-stone-800 leading-relaxed whitespace-pre-line">
                {verse.text}
              </p>
              <footer className="mt-2 text-xs font-semibold text-emerald-700">— {verse.ref}</footer>
            </blockquote>
            <p className="text-xs text-stone-500 text-center">
              {selectedScore >= 0.5
                ? '한 달 동안 수고한 그대를 축복합니다.'
                : '오늘도 주님께서 함께하십니다.'}
            </p>
          </div>
        </Modal>
      )}
    </Card>
  );
}
