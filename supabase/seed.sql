-- ============================================================
-- SEUM 초기 데이터 (내수동교회 시드)
-- ============================================================

-- ─── 교회 ───────────────────────────────────────────────────
INSERT INTO churches (id, name, slug, pastor_name) VALUES
  ('11111111-1111-1111-1111-111111111111', '내수동교회', 'naesoodong', '박지웅');

-- ─── 부서 ───────────────────────────────────────────────────
INSERT INTO departments (id, church_id, name, slug) VALUES
  ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', '청년부', 'fishermen'),
  ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', '대학부', 'witness');

-- ─── 직급 명칭 (청년부) ──────────────────────────────────────
INSERT INTO role_labels (department_id, role_key, label) VALUES
  ('22222222-2222-2222-2222-222222222222', 'minister', '사역자'),
  ('22222222-2222-2222-2222-222222222222', 'village_leader', '마을장'),
  ('22222222-2222-2222-2222-222222222222', 'cell_leader', '목자'),
  ('22222222-2222-2222-2222-222222222222', 'cell_member', '목원');

-- ─── 2026년 그룹 ─────────────────────────────────────────────
INSERT INTO group_years (id, department_id, year, is_active) VALUES
  ('44444444-4444-4444-4444-444444444444', '22222222-2222-2222-2222-222222222222', 2026, true);

-- ─── 마을 (청년부 2026) ──────────────────────────────────────
INSERT INTO villages (id, group_year_id, name, sort_order, is_new_member_team) VALUES
  ('a0000001-0000-0000-0000-000000000001', '44444444-4444-4444-4444-444444444444', '무명', 1, false),
  ('a0000001-0000-0000-0000-000000000002', '44444444-4444-4444-4444-444444444444', '내일', 2, false),
  ('a0000001-0000-0000-0000-000000000003', '44444444-4444-4444-4444-444444444444', '닛시', 3, false),
  ('a0000001-0000-0000-0000-000000000004', '44444444-4444-4444-4444-444444444444', '하나', 4, false),
  ('a0000001-0000-0000-0000-000000000005', '44444444-4444-4444-4444-444444444444', '채워진', 5, false),
  ('a0000001-0000-0000-0000-000000000006', '44444444-4444-4444-4444-444444444444', '찬양', 6, false),
  ('a0000001-0000-0000-0000-000000000007', '44444444-4444-4444-4444-444444444444', '더사랑', 7, false),
  ('a0000001-0000-0000-0000-000000000008', '44444444-4444-4444-4444-444444444444', '풍성한', 8, false),
  ('a0000001-0000-0000-0000-000000000009', '44444444-4444-4444-4444-444444444444', '새가족팀', 9, true);

-- ─── 국장단 종류 (청년부) ────────────────────────────────────
INSERT INTO bureau_types (department_id, name, slug, sort_order) VALUES
  ('22222222-2222-2222-2222-222222222222', '행정국장', 'admin', 1),
  ('22222222-2222-2222-2222-222222222222', '선교국장', 'mission', 2),
  ('22222222-2222-2222-2222-222222222222', '문서국장', 'document', 3),
  ('22222222-2222-2222-2222-222222222222', '홍보국장', 'pr', 4),
  ('22222222-2222-2222-2222-222222222222', '예배국장', 'worship', 5),
  ('22222222-2222-2222-2222-222222222222', '재무국장', 'finance', 6);

-- ─── 나눔 게시판 기본 카테고리 ──────────────────────────────
INSERT INTO board_categories (department_id, board_type, name, sort_order) VALUES
  ('22222222-2222-2222-2222-222222222222', 'sharing', '대예배', 1),
  ('22222222-2222-2222-2222-222222222222', 'sharing', '새벽기도', 2),
  ('22222222-2222-2222-2222-222222222222', 'sharing', '말씀묵상', 3),
  ('22222222-2222-2222-2222-222222222222', 'sharing', '센터워십', 4);

-- ─── 초기 사용자 ─────────────────────────────────────────────
-- 관리자 (차진환) - is_admin=true, role=cell_member (다른 사람에게 일반 유저로 보임)
INSERT INTO users (church_id, department_id, name, phone, password_hash, role, is_approved, is_admin) VALUES
  ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222',
   '차진환', '010-0000-0000',
   '$2a$12$1WZzlZKExDlQmb/Wij4umecC8xTIFyw4LnxRfdp0xNpCtY9faIPk2',
   'cell_member', true, true);

-- 청년부 목사 (이정우)
INSERT INTO users (church_id, department_id, name, phone, password_hash, role, minister_rank, is_approved) VALUES
  ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222',
   '이정우', '010-0000-0001',
   '$2a$12$OS9uVIc7mnQd0Yv9dp0iW.LZX6/ZKrv.InRIcb2UP49bfVKdpRrG.',
   'minister', 'pastor', true);

-- ─── 소그룹 (셀) ─────────────────────────────────────────────
-- 무명 마을 소그룹
INSERT INTO cells (id, village_id, name, sort_order) VALUES
  ('c0000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000001', '무명1셀', 1),
  ('c0000001-0000-0000-0000-000000000002', 'a0000001-0000-0000-0000-000000000001', '무명2셀', 2);
-- 내일 마을 소그룹
INSERT INTO cells (id, village_id, name, sort_order) VALUES
  ('c0000001-0000-0000-0000-000000000003', 'a0000001-0000-0000-0000-000000000002', '내일1셀', 1),
  ('c0000001-0000-0000-0000-000000000004', 'a0000001-0000-0000-0000-000000000002', '내일2셀', 2);
-- 닛시 마을 소그룹
INSERT INTO cells (id, village_id, name, sort_order) VALUES
  ('c0000001-0000-0000-0000-000000000005', 'a0000001-0000-0000-0000-000000000003', '닛시1셀', 1);

-- ─── 샘플 사용자 (기도제목 테스트용) ─────────────────────────
-- 무명 마을 - 목자 김민수
INSERT INTO users (id, church_id, department_id, name, phone, password_hash, role, village_id, cell_id, is_approved) VALUES
  ('u0000001-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222',
   '김민수', '010-1111-0001', '$2a$12$1WZzlZKExDlQmb/Wij4umecC8xTIFyw4LnxRfdp0xNpCtY9faIPk2',
   'cell_leader', 'a0000001-0000-0000-0000-000000000001', 'c0000001-0000-0000-0000-000000000001', true);
-- 무명 마을 - 목원 박서연
INSERT INTO users (id, church_id, department_id, name, phone, password_hash, role, village_id, cell_id, is_approved) VALUES
  ('u0000001-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222',
   '박서연', '010-1111-0002', '$2a$12$1WZzlZKExDlQmb/Wij4umecC8xTIFyw4LnxRfdp0xNpCtY9faIPk2',
   'cell_member', 'a0000001-0000-0000-0000-000000000001', 'c0000001-0000-0000-0000-000000000001', true);
-- 무명 마을 - 목원 이하은
INSERT INTO users (id, church_id, department_id, name, phone, password_hash, role, village_id, cell_id, is_approved) VALUES
  ('u0000001-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222',
   '이하은', '010-1111-0003', '$2a$12$1WZzlZKExDlQmb/Wij4umecC8xTIFyw4LnxRfdp0xNpCtY9faIPk2',
   'cell_member', 'a0000001-0000-0000-0000-000000000001', 'c0000001-0000-0000-0000-000000000001', true);
-- 무명 마을 - 목자 장유진 (무명2셀)
INSERT INTO users (id, church_id, department_id, name, phone, password_hash, role, village_id, cell_id, is_approved) VALUES
  ('u0000001-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222',
   '장유진', '010-1111-0004', '$2a$12$1WZzlZKExDlQmb/Wij4umecC8xTIFyw4LnxRfdp0xNpCtY9faIPk2',
   'cell_leader', 'a0000001-0000-0000-0000-000000000001', 'c0000001-0000-0000-0000-000000000002', true);
-- 무명 마을 - 목원 최준호 (무명2셀)
INSERT INTO users (id, church_id, department_id, name, phone, password_hash, role, village_id, cell_id, is_approved) VALUES
  ('u0000001-0000-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222',
   '최준호', '010-1111-0005', '$2a$12$1WZzlZKExDlQmb/Wij4umecC8xTIFyw4LnxRfdp0xNpCtY9faIPk2',
   'cell_member', 'a0000001-0000-0000-0000-000000000001', 'c0000001-0000-0000-0000-000000000002', true);
-- 무명 마을장 정다은
INSERT INTO users (id, church_id, department_id, name, phone, password_hash, role, village_id, is_approved) VALUES
  ('u0000001-0000-0000-0000-000000000006', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222',
   '정다은', '010-1111-0006', '$2a$12$1WZzlZKExDlQmb/Wij4umecC8xTIFyw4LnxRfdp0xNpCtY9faIPk2',
   'village_leader', 'a0000001-0000-0000-0000-000000000001', true);
-- 내일 마을 - 목자 한수빈
INSERT INTO users (id, church_id, department_id, name, phone, password_hash, role, village_id, cell_id, is_approved) VALUES
  ('u0000001-0000-0000-0000-000000000007', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222',
   '한수빈', '010-1111-0007', '$2a$12$1WZzlZKExDlQmb/Wij4umecC8xTIFyw4LnxRfdp0xNpCtY9faIPk2',
   'cell_leader', 'a0000001-0000-0000-0000-000000000002', 'c0000001-0000-0000-0000-000000000003', true);
-- 내일 마을 - 목원 오지훈
INSERT INTO users (id, church_id, department_id, name, phone, password_hash, role, village_id, cell_id, is_approved) VALUES
  ('u0000001-0000-0000-0000-000000000008', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222',
   '오지훈', '010-1111-0008', '$2a$12$1WZzlZKExDlQmb/Wij4umecC8xTIFyw4LnxRfdp0xNpCtY9faIPk2',
   'cell_member', 'a0000001-0000-0000-0000-000000000002', 'c0000001-0000-0000-0000-000000000003', true);
-- 내일 마을 - 목자 윤서아 (내일2셀)
INSERT INTO users (id, church_id, department_id, name, phone, password_hash, role, village_id, cell_id, is_approved) VALUES
  ('u0000001-0000-0000-0000-000000000009', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222',
   '윤서아', '010-1111-0009', '$2a$12$1WZzlZKExDlQmb/Wij4umecC8xTIFyw4LnxRfdp0xNpCtY9faIPk2',
   'cell_leader', 'a0000001-0000-0000-0000-000000000002', 'c0000001-0000-0000-0000-000000000004', true);
-- 내일 마을 - 목원 송예진 (내일2셀)
INSERT INTO users (id, church_id, department_id, name, phone, password_hash, role, village_id, cell_id, is_approved) VALUES
  ('u0000001-0000-0000-0000-000000000010', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222',
   '송예진', '010-1111-0010', '$2a$12$1WZzlZKExDlQmb/Wij4umecC8xTIFyw4LnxRfdp0xNpCtY9faIPk2',
   'cell_member', 'a0000001-0000-0000-0000-000000000002', 'c0000001-0000-0000-0000-000000000004', true);
-- 닛시 마을 - 목자 강도현
INSERT INTO users (id, church_id, department_id, name, phone, password_hash, role, village_id, cell_id, is_approved) VALUES
  ('u0000001-0000-0000-0000-000000000011', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222',
   '강도현', '010-1111-0011', '$2a$12$1WZzlZKExDlQmb/Wij4umecC8xTIFyw4LnxRfdp0xNpCtY9faIPk2',
   'cell_leader', 'a0000001-0000-0000-0000-000000000003', 'c0000001-0000-0000-0000-000000000005', true);
-- 닛시 마을 - 목원 임소율
INSERT INTO users (id, church_id, department_id, name, phone, password_hash, role, village_id, cell_id, is_approved) VALUES
  ('u0000001-0000-0000-0000-000000000012', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222',
   '임소율', '010-1111-0012', '$2a$12$1WZzlZKExDlQmb/Wij4umecC8xTIFyw4LnxRfdp0xNpCtY9faIPk2',
   'cell_member', 'a0000001-0000-0000-0000-000000000003', 'c0000001-0000-0000-0000-000000000005', true);

-- ─── 샘플 기도제목 (이번 주) ──────────────────────────────────
-- 이번 주 일요일 날짜 기준
INSERT INTO prayer_requests (user_id, department_id, week_start, content) VALUES
  ('u0000001-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222',
   date_trunc('week', CURRENT_DATE + interval '1 day')::date - interval '1 day',
   '이번 주 셀 모임이 은혜롭게 진행될 수 있도록 기도해주세요. 새로운 멤버들이 잘 적응할 수 있기를 원합니다.'),
  ('u0000001-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222',
   date_trunc('week', CURRENT_DATE + interval '1 day')::date - interval '1 day',
   '취업 준비 중인데 하나님의 인도하심을 구합니다. 면접에서 좋은 결과가 있기를 기도해주세요.'),
  ('u0000001-0000-0000-0000-000000000003', '22222222-2222-2222-2222-222222222222',
   date_trunc('week', CURRENT_DATE + interval '1 day')::date - interval '1 day',
   '가족들의 건강을 위해 기도합니다. 특별히 어머니의 수술이 잘 되도록 기도 부탁드립니다.'),
  ('u0000001-0000-0000-0000-000000000004', '22222222-2222-2222-2222-222222222222',
   date_trunc('week', CURRENT_DATE + interval '1 day')::date - interval '1 day',
   '새벽기도에 꾸준히 나갈 수 있는 믿음과 건강을 위해 기도해주세요.'),
  ('u0000001-0000-0000-0000-000000000005', '22222222-2222-2222-2222-222222222222',
   date_trunc('week', CURRENT_DATE + interval '1 day')::date - interval '1 day',
   '대학원 논문 마감이 다가오고 있습니다. 지혜와 집중력을 위해 기도 부탁드립니다.'),
  ('u0000001-0000-0000-0000-000000000006', '22222222-2222-2222-2222-222222222222',
   date_trunc('week', CURRENT_DATE + interval '1 day')::date - interval '1 day',
   '마을 전체가 하나 되어 섬길 수 있도록, 마을원들의 영적 성장을 위해 기도합니다.'),
  ('u0000001-0000-0000-0000-000000000007', '22222222-2222-2222-2222-222222222222',
   date_trunc('week', CURRENT_DATE + interval '1 day')::date - interval '1 day',
   '직장에서의 인간관계가 회복되도록 기도해주세요. 동료들에게 좋은 영향력을 끼치고 싶습니다.'),
  ('u0000001-0000-0000-0000-000000000008', '22222222-2222-2222-2222-222222222222',
   date_trunc('week', CURRENT_DATE + interval '1 day')::date - interval '1 day',
   '이번 주 말씀 묵상을 통해 하나님의 음성을 분명히 들을 수 있기를 기도합니다.'),
  ('u0000001-0000-0000-0000-000000000009', '22222222-2222-2222-2222-222222222222',
   date_trunc('week', CURRENT_DATE + interval '1 day')::date - interval '1 day',
   '셀 모임에 나오지 못하는 멤버들을 위해 기도합니다. 다시 교제의 자리로 돌아올 수 있기를 원합니다.'),
  ('u0000001-0000-0000-0000-000000000010', '22222222-2222-2222-2222-222222222222',
   date_trunc('week', CURRENT_DATE + interval '1 day')::date - interval '1 day',
   '신앙의 성장을 위해 기도합니다. 매일 큐티를 빠지지 않고 할 수 있도록 도와주세요.'),
  ('u0000001-0000-0000-0000-000000000011', '22222222-2222-2222-2222-222222222222',
   date_trunc('week', CURRENT_DATE + interval '1 day')::date - interval '1 day',
   '선교 여행 준비를 위해 기도해주세요. 팀원들과 하나 되어 준비할 수 있기를 바랍니다.'),
  ('u0000001-0000-0000-0000-000000000012', '22222222-2222-2222-2222-222222222222',
   date_trunc('week', CURRENT_DATE + interval '1 day')::date - interval '1 day',
   '감사기도를 올립니다. 이번 달 시험에 합격했습니다. 앞으로도 하나님께 영광 돌리는 삶을 살겠습니다.');
