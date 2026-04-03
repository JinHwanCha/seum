import { ImageResponse } from 'next/og';

export const alt = '세움 - 교회 공동체 나눔 플랫폼';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #3d6b48 0%, #4a7d57 40%, #5a8f65 100%)',
          position: 'relative',
        }}
      >
        {/* Subtle cross pattern accent */}
        <div
          style={{
            position: 'absolute',
            top: 60,
            right: 80,
            width: 4,
            height: 80,
            background: 'rgba(255,255,255,0.12)',
            borderRadius: 2,
            display: 'flex',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: 98,
            right: 42,
            width: 80,
            height: 4,
            background: 'rgba(255,255,255,0.12)',
            borderRadius: 2,
            display: 'flex',
          }}
        />

        {/* Main title */}
        <div
          style={{
            fontSize: 140,
            fontWeight: 900,
            color: 'white',
            letterSpacing: '0.15em',
            display: 'flex',
            textShadow: '0 4px 20px rgba(0,0,0,0.15)',
          }}
        >
          세움
        </div>

        {/* Accent line */}
        <div
          style={{
            width: 80,
            height: 4,
            background: '#db8a2c',
            borderRadius: 2,
            marginTop: 24,
            display: 'flex',
          }}
        />

        {/* Subtitle */}
        <div
          style={{
            fontSize: 28,
            color: 'rgba(255,255,255,0.85)',
            marginTop: 28,
            letterSpacing: '0.3em',
            display: 'flex',
          }}
        >
          교회 공동체 나눔 플랫폼
        </div>
      </div>
    ),
    { ...size }
  );
}
