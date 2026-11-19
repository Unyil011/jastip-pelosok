import React from 'react';

export default function Badge({
  children,
  variant = 'neutral', // 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral'
  size = 'md',
}) {
  const getColors = () => {
    switch (variant) {
      case 'primary':
        return {
          bg: 'linear-gradient(180deg, #d4ebd9 0%, #b8e0c2 100%)',
          color: 'var(--color-primary-dark)',
          border: 'rgba(39, 145, 85, 0.3)',
        };
      case 'success':
        return {
          bg: 'linear-gradient(180deg, #ddfbe5 0%, #c4f4d0 100%)',
          color: '#146332',
          border: 'rgba(21, 128, 61, 0.3)',
        };
      case 'warning':
        return {
          bg: 'linear-gradient(180deg, #fef4cf 0%, #fae69e 100%)',
          color: '#92400e',
          border: 'rgba(217, 119, 6, 0.3)',
        };
      case 'danger':
        return {
          bg: 'linear-gradient(180deg, #fee2e2 0%, #fca5a5 100%)',
          color: '#991b1b',
          border: 'rgba(217, 56, 56, 0.3)',
        };
      case 'info':
        return {
          bg: 'linear-gradient(180deg, #e0f2fe 0%, #bae6fd 100%)',
          color: '#075985',
          border: 'rgba(2, 132, 199, 0.3)',
        };
      case 'neutral':
      default:
        return {
          bg: 'linear-gradient(180deg, #ebeeed 0%, #d8deda 100%)',
          color: '#415249',
          border: 'rgba(82, 99, 90, 0.25)',
        };
    }
  };

  const { bg, color, border } = getColors();

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: size === 'sm' ? '3px 8px' : '5px 12px',
        fontSize: size === 'sm' ? '11px' : '12px',
        fontWeight: '700',
        borderRadius: 'var(--radius-full)',
        background: bg,
        color: color,
        border: `1px solid ${border}`,
        boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.7), 0 1px 2px rgba(0,0,0,0.06)',
        letterSpacing: '-0.2px',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </span>
  );
}
