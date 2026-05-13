'use client';

import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

export function AdminBackButton() {
  const router = useRouter();
  const params = useParams<{ church: string; department: string }>();

  const handleClick = () => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push(`/${params.church}/${params.department}/admin`);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label="관리 페이지로 돌아가기"
      className="inline-flex items-center justify-center w-8 h-8 -ml-1 rounded-lg text-stone-500 hover:bg-stone-100 hover:text-stone-900 transition-colors"
    >
      <ArrowLeft size={18} />
    </button>
  );
}
