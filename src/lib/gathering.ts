/** 모임 게시판(직접 등록) 요청 본문을 DB 컬럼(snake_case) 형태로 정규화 */
export function normalizeGatheringInput(body: unknown) {
  const b = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>;
  const str = (v: unknown) => String(v ?? '').trim();
  const rawImages = Array.isArray(b.images) ? b.images : [];
  const images = rawImages
    .map((i) => String(i ?? ''))
    .filter((s) => s.trim() !== '')
    .slice(0, 10);
  return {
    name: str(b.name),
    link: str(b.link),
    image_url: str(b.imageUrl),
    type: str(b.type),
    leader: str(b.leader),
    kakao_id: str(b.kakaoId),
    banner_url: str(b.bannerUrl),
    images,
    content: String(b.content ?? ''),
    button_label: str(b.buttonLabel),
    disabled: Boolean(b.disabled),
  };
}
