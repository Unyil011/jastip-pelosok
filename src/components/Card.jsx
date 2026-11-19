import React from 'react';

export default function Card({
  children,
  title = null,
  subtitle = null,
  action = null,
  variant = 'raised', // 'raised' | 'sunken' | 'flat'
  padding = '18px',
  style = {},
  onClick = null,
  ...props
}) {
  const getShadow = () => {
    switch (variant) {
      case 'sunken':
        return 'var(--skeuo-input-sunken)';
      case 'flat':
        return '0 1px 3px rgba(0,0,0,0.06)';
      case 'raised':
      default:
        return 'var(--skeuo-card-shadow)';
    }
  };

  const getBackground = () => {
    switch (variant) {
      case 'sunken':
        return 'var(--color-bg-input)';
      case 'flat':
        return 'var(--color-bg-elevated)';
      case 'raised':
      default:
        return 'var(--color-bg-card-grad)';
    }
  };

  return (
    <div
      onClick={onClick}
      style={{
        background: getBackground(),
        boxShadow: getShadow(),
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--color-border-subtle)',
        padding: padding,
        marginBottom: '16px',
        position: 'relative',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease, background 0.25s ease',
        ...style,
      }}
      {...props}
    >
      {(title || subtitle || action) && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '12px',
            paddingBottom: '8px',
            borderBottom: '1px solid var(--color-border-subtle)',
          }}
        >
          <div>
            {title && (
              <h3
                style={{
                  fontSize: '16px',
                  fontWeight: '700',
                  color: 'var(--color-text-main)',
                  letterSpacing: '-0.3px',
                }}
              >
                {title}
              </h3>
            )}
            {subtitle && (
              <p
                style={{
                  fontSize: '12.5px',
                  color: 'var(--color-text-muted)',
                  marginTop: '2px',
                }}
              >
                {subtitle}
              </p>
            )}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      {children}
    </div>
  );
}
