import Link from 'next/link';

export const metadata = { title: '이용약관 | 세움' };

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-2xl px-5 py-10 text-sm leading-7 text-stone-700">
      <h1 className="mb-2 text-2xl font-bold text-stone-900">세움 이용약관</h1>
      <p className="mb-8 text-stone-500">시행일: 2026년 9월 7일</p>

      <div className="space-y-6">
        <section><h2 className="font-bold text-stone-900">1. 목적</h2><p>이 약관은 교회 공동체 플랫폼 세움의 이용 조건과 회원의 권리·의무를 정합니다.</p></section>
        <section><h2 className="font-bold text-stone-900">2. 계정과 승인</h2><p>회원은 정확한 정보를 제공해야 하며, 소속 교회 관리자의 승인 후 서비스를 이용할 수 있습니다. 계정과 비밀번호를 안전하게 관리할 책임은 회원에게 있습니다.</p></section>
        <section><h2 className="font-bold text-stone-900">3. 이용 원칙</h2><p>회원은 타인의 권리를 침해하거나 불법·유해한 콘텐츠를 게시해서는 안 됩니다. 운영자는 공동체 보호와 서비스 안정성을 위해 권한에 따라 콘텐츠를 제한하거나 삭제할 수 있습니다.</p></section>
        <section><h2 className="font-bold text-stone-900">4. 서비스 변경</h2><p>기능과 제공 범위는 운영상 필요에 따라 변경될 수 있으며, 중요한 변경은 서비스 내에서 안내합니다.</p></section>
        <section><h2 className="font-bold text-stone-900">5. 계정 삭제</h2><p>회원은 내 정보 화면에서 계정 삭제를 요청할 수 있습니다. 요청은 30일 이내 처리되며, 처리 전 본인 확인이나 공동체 기록 정리가 진행될 수 있습니다.</p></section>
        <section><h2 className="font-bold text-stone-900">6. 문의</h2><p>서비스 이용 및 계정 관련 문의는 서비스 내 소속 교회 관리자에게 문의해 주세요.</p></section>
      </div>

      <Link href="/" className="mt-10 inline-block font-medium text-primary-600">세움으로 돌아가기</Link>
    </main>
  );
}