import React from 'react';

export default function SkeletonLoader({
  type = 'card', // 'card' | 'text' | 'button' | 'list'
  count = 1,
  height = null,
  width = '100%',
}) {
  const items = Array.from({ length: count }, (_, i) => i);

  if (type === 'text') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width }}>
        {items.map((i) => (
          <div
            key={i}
            className="skeleton-box"
            style={{
              height: height || '14px',
              width: i === items.length - 1 && items.length > 1 ? '70%' : '100%',
            }}
          />
        ))}
      </div>
    );
  }

  if (type === 'list') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width }}>
        {items.map((i) => (
          <div
            key={i}
            style={{
              padding: '16px',
              borderRadius: 'var(--radius-lg)',
              background: 'var(--color-bg-card)',
              boxShadow: 'var(--skeuo-card-shadow)',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div className="skeleton-box" style={{ width: '45%', height: '18px' }} />
              <div className="skeleton-box" style={{ width: '25%', height: '18px', borderRadius: '99px' }} />
            </div>
            <div className="skeleton-box" style={{ width: '80%', height: '14px' }} />
            <div className="skeleton-box" style={{ width: '60%', height: '14px' }} />
          </div>
        ))}
      </div>
    );
  }

  // Default 'card'
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width }}>
      {items.map((i) => (
        <div
          key={i}
          className="skeleton-box"
          style={{
            height: height || '120px',
            width: '100%',
            borderRadius: 'var(--radius-lg)',
          }}
        />
      ))}
    </div>
  );
}
