import Link from 'next/link';

export const metadata = { title: '개인정보 처리방침 | 세움' };

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-5 py-10 text-sm leading-7 text-stone-700">
      <h1 className="mb-2 text-2xl font-bold text-stone-900">개인정보 처리방침</h1>
      <p className="mb-8 text-stone-500">시행일: 2026년 9월 7일</p>

      <div className="space-y-6">
        <section><h2 className="font-bold text-stone-900">1. 처리 목적</h2><p>세움은 회원 인증, 교회·부서·소그룹 운영, 출석 및 양육 관리, 게시판·기도제목·알림 제공을 위해 개인정보를 처리합니다.</p></section>
        <section><h2 className="font-bold text-stone-900">2. 처리 항목</h2><p>이름, 생년월일, 전화번호, 비밀번호의 암호화 값, 소속 교회·부서·마을·소그룹, 서비스 이용 중 작성한 게시물·댓글·기도제목·출석 및 활동 기록을 처리합니다.</p></section>
        <section><h2 className="font-bold text-stone-900">3. 보유 기간</h2><p>회원 탈퇴 또는 소속 부서 이용 종료 시 파기하는 것을 원칙으로 합니다. 계정 삭제 요청은 30일 이내 처리하며, 법령상 보관 의무가 있거나 공동체 기록의 무결성을 위해 필요한 자료는 작성자 식별 정보를 제거한 뒤 보관할 수 있습니다.</p></section>
        <section><h2 className="font-bold text-stone-900">4. 제3자 제공 및 처리 위탁</h2><p>서비스 운영을 위해 호스팅 및 데이터 저장 서비스(Vercel, Supabase)를 이용합니다. 개인정보는 서비스 제공 목적 외로 판매하지 않습니다.</p></section>
        <section><h2 className="font-bold text-stone-900">5. 이용자의 권리</h2><p>내 정보 화면에서 개인정보를 확인·수정하고 계정 삭제를 요청할 수 있습니다. 그 밖의 열람·정정·삭제 요청은 소속 교회 관리자에게 문의할 수 있습니다.</p></section>
        <section><h2 className="font-bold text-stone-900">6. 보호 조치</h2><p>비밀번호 단방향 암호화, HTTPS 통신, 접근 권한 분리, 인증 쿠키 보호 및 최소 권한 원칙을 적용합니다.</p></section>
        <section><h2 className="font-bold text-stone-900">7. 문의</h2><p>개인정보 관련 문의와 삭제 요청 처리는 서비스 내 소속 교회 관리자가 담당합니다.</p></section>
      </div>

      <Link href="/" className="mt-10 inline-block font-medium text-primary-600">세움으로 돌아가기</Link>
    </main>
  );
}