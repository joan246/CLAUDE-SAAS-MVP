import { ImageResponse } from 'next/og';
 
// Route segment config
export const runtime = 'edge';
 
// Image metadata
export const size = {
  width: 32,
  height: 32,
};
export const contentType = 'image/png';
 
// Image generation
export default function Icon() {
  return new ImageResponse(
    (
      // ImageResponse JSX element
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'transparent',
        }}
      >
        <svg
          width="32"
          height="32"
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Left vertical pillar */}
          <rect x="4" y="4" width="8" height="24" rx="2" fill="#2563eb" />
          {/* Top right block */}
          <rect x="16" y="4" width="12" height="10" rx="2" fill="#2563eb" opacity="0.8" />
          {/* Bottom right block */}
          <rect x="16" y="18" width="12" height="10" rx="2" fill="#2563eb" opacity="0.4" />
        </svg>
      </div>
    ),
    // ImageResponse options
    {
      // For convenience, we can re-use the exported icons size metadata
      // config to also set the ImageResponse's width and height.
      ...size,
    }
  );
}
