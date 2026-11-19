import React, { useState } from 'react';

export default function Button({
  children,
  variant = 'primary', // 'primary' | 'secondary' | 'danger' | 'outline' | 'subtle'
  size = 'md',        // 'sm' | 'md' | 'lg'
  loading = false,
  disabled = false,
  icon = null,
  onClick,
  type = 'button',
  fullWidth = true,
  style = {},
  ...props
}) {
  const [isPressed, setIsPressed] = useState(false);

  // Background gradients for realistic physical plastic/metal sheen
  const getBackground = () => {
    if (disabled || loading) return 'linear-gradient(180deg, #cfd8d4 0%, #bcc7c2 100%)';
    switch (variant) {
      case 'secondary':
        return 'linear-gradient(180deg, #1f94c4 0%, #15739c 100%)';
      case 'danger':
        return 'linear-gradient(180deg, #e54949 0%, #ba2828 100%)';
      case 'outline':
        return 'linear-gradient(180deg, #f7faf8 0%, #e2e8e5 100%)';
      case 'subtle':
        return 'linear-gradient(180deg, #e4e9e7 0%, #d4deda 100%)';
      case 'primary':
      default:
        return 'linear-gradient(180deg, var(--color-primary-light) 0%, var(--color-primary) 100%)';
    }
  };

  const getTextColor = () => {
    if (disabled || loading) return '#7a8c83';
    if (variant === 'outline' || variant === 'subtle') return 'var(--color-text-main)';
    return 'var(--color-text-inverse)';
  };

  const getPadding = () => {
    switch (size) {
      case 'sm':
        return '8px 14px';
      case 'lg':
        return '16px 24px';
      case 'md':
      default:
        return '12px 18px';
    }
  };

  const getFontSize = () => {
    switch (size) {
      case 'sm':
        return '13px';
      case 'lg':
        return '16px';
      case 'md':
      default:
        return '14.5px';
    }
  };

  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onMouseLeave={() => setIsPressed(false)}
      onTouchStart={() => setIsPressed(true)}
      onTouchEnd={() => setIsPressed(false)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        width: fullWidth ? '100%' : 'auto',
        padding: getPadding(),
        fontSize: getFontSize(),
        fontWeight: '600',
        fontFamily: 'inherit',
        color: getTextColor(),
        background: getBackground(),
        border: variant === 'outline' ? '1px solid rgba(82, 99, 90, 0.3)' : '1px solid rgba(0, 0, 0, 0.12)',
        borderRadius: 'var(--radius-md)',
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        boxShadow: isPressed && !disabled && !loading
          ? 'var(--skeuo-button-pressed)'
          : 'var(--skeuo-button-raised)',
        transform: isPressed && !disabled && !loading ? 'translateY(1px)' : 'translateY(0)',
        transition: 'transform 0.1s ease, box-shadow 0.1s ease',
        userSelect: 'none',
        textShadow: variant === 'outline' || variant === 'subtle' ? 'none' : '0 1px 2px rgba(0,0,0,0.25)',
        ...style,
      }}
      {...props}
    >
      {loading ? (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              width: '16px',
              height: '16px',
              border: '2.5px solid rgba(255,255,255,0.4)',
              borderTopColor: '#ffffff',
              borderRadius: '50%',
              animation: 'spin 0.7s linear infinite',
              display: 'inline-block',
            }}
          />
          <span>Memproses...</span>
        </span>
      ) : (
        <>
          {icon && <span style={{ display: 'flex', alignItems: 'center' }}>{icon}</span>}
          {children}
        </>
      )}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </button>
  );
}
