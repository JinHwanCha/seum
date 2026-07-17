'use client';

import { useState } from 'react';
import { UsersRound } from 'lucide-react';

/** 이미지 URL(또는 data URI)인지 판별. 아니면 이모지/텍스트로 간주. */
export function isImageSrc(v: string): boolean {
  return /^(https?:\/\/|data:image\/)/i.test(v.trim());
}

/** "[⭐찬양팀] 찬양팀원 모집" → { tag: "⭐찬양팀", title: "찬양팀원 모집" } */
export function splitName(name: string): { tag: string; title: string } {
  const match = name.match(/^\s*\[([^\]]+)\]\s*(.*)$/);
  if (match) {
    return { tag: match[1].trim(), title: match[2].trim() };
  }
  return { tag: '', title: name };
}

/** 모임 아이콘 썸네일. 이미지 URL, 이모지 문자, 없을 경우 기본 아이콘을 처리한다. */
export function GatheringThumb({
  imageUrl,
  alt,
  iconSize = 22,
  emojiClassName = 'text-2xl',
}: {
  imageUrl: string;
  alt: string;
  iconSize?: number;
  emojiClassName?: string;
}) {
  const [errored, setErrored] = useState(false);
  const value = (imageUrl || '').trim();

  if (value && !isImageSrc(value)) {
    return (
      <div className={`flex h-full w-full items-center justify-center leading-none ${emojiClassName}`}>
        <span>{value}</span>
      </div>
    );
  }

  if (!value || errored) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-sky-50 text-sky-500">
        <UsersRound size={iconSize} />
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={value}
      alt={alt}
      loading="lazy"
      onError={() => setErrored(true)}
      className="h-full w-full object-contain"
    />
  );
}
