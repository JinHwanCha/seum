import { RegisterForm } from '@/components/auth/register-form';
import Link from 'next/link';

export default function RegisterPage() {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-4 py-12 bg-gradient-to-b from-primary-50 via-[#fefdfb] to-[#faf8f3]">
      <RegisterForm />
      <div className="mt-5 flex gap-4 text-xs text-stone-400">
        <Link href="/privacy" className="hover:text-primary-600">개인정보 처리방침</Link>
        <Link href="/terms" className="hover:text-primary-600">이용약관</Link>
      </div>
    </div>
  );
}
