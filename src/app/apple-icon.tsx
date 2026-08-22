import { ImageResponse } from 'next/og';

// iOS '홈 화면에 추가' 시 사용하는 아이콘 (apple-touch-icon).
export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #3d6b48 0%, #4a7d57 40%, #5a8f65 100%)',
          color: 'white',
          fontSize: 82,
          fontWeight: 800,
          letterSpacing: '-0.02em',
        }}
      >
        세움
      </div>
    ),
    { ...size }
  );
}
