import { LoginForm } from '@/components/auth/login-form';

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-b from-primary-50 via-[#fefdfb] to-[#faf8f3]">
      <LoginForm />
    </div>
  );
}
