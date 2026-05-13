'use client';

import dynamic from 'next/dynamic';

const CategoryManager = dynamic(
  () => import('@/components/admin/category-manager').then((m) => m.CategoryManager),
  { loading: () => <div className="animate-pulse h-32 bg-stone-100 rounded-xl" /> }
);

export default function CategoriesPage() {
  return (
    <div className="space-y-2">
      <h1 className="text-lg font-bold text-stone-900">카테고리 관리</h1>
      <p className="text-sm text-stone-500">게시판별 카테고리를 추가하거나 수정할 수 있습니다.</p>
      <CategoryManager />
    </div>
  );
}
