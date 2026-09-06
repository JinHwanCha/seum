import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#4a7d57',
          color: 'white',
          fontSize: 72,
          fontWeight: 800,
        }}
      >
        세움
      </div>
    ),
    { width: 192, height: 192 }
  );
}