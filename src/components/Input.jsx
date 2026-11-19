import React, { useState } from 'react';

export default function Input({
  label,
  error,
  helperText,
  icon = null,
  required = false,
  type = 'text',
  containerStyle = {},
  style = {},
  ...props
}) {
  const [showPassword, setShowPassword] = useState(false);
  const isPasswordField = type === 'password';

  // Tentukan tipe input aktual (bisa berubah jika user klik icon mata)
  const actualType = isPasswordField ? (showPassword ? 'text' : 'password') : type;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px', ...containerStyle }}>
      {label && (
        <label
          style={{
            fontSize: '13px',
            fontWeight: '600',
            color: 'var(--color-text-main)',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          {label}
          {required && <span style={{ color: 'var(--color-danger)' }}>*</span>}
        </label>
      )}

      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        {icon && (
          <span
            style={{
              position: 'absolute',
              left: '12px',
              color: 'var(--color-text-dim)',
              display: 'flex',
              alignItems: 'center',
              pointerEvents: 'none',
            }}
          >
            {icon}
          </span>
        )}

        <input
          type={actualType}
          style={{
            width: '100%',
            padding: isPasswordField
              ? '12px 42px 12px 14px'
              : icon
              ? '12px 14px 12px 38px'
              : '12px 14px',
            borderRadius: 'var(--radius-md)',
            border: error
              ? '1px solid var(--color-danger)'
              : '1px solid var(--color-border)',
            background: 'var(--color-bg-input)',
            boxShadow: 'var(--skeuo-input-sunken)',
            fontSize: '14.5px',
            fontFamily: 'inherit',
            color: 'var(--color-text-main)',
            outline: 'none',
            transition: 'border 0.2s ease, box-shadow 0.2s ease',
            ...style,
          }}
          onFocus={(e) => {
            e.target.style.border = '1px solid var(--color-primary)';
            e.target.style.boxShadow =
              'inset 0 2px 4px rgba(20, 35, 28, 0.15), 0 0 0 3px rgba(39, 145, 85, 0.2)';
          }}
          onBlur={(e) => {
            e.target.style.border = error
              ? '1px solid var(--color-danger)'
              : '1px solid var(--color-border)';
            e.target.style.boxShadow = 'var(--skeuo-input-sunken)';
          }}
          {...props}
        />

        {/* Icon Mata untuk Toggle Lihat/Sembunyikan Password */}
        {isPasswordField && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            title={showPassword ? 'Sembunyikan Kata Sandi' : 'Lihat Kata Sandi'}
            style={{
              position: 'absolute',
              right: '12px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--color-text-dim)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '4px',
              fontSize: '16px',
              userSelect: 'none',
            }}
          >
            {showPassword ? (
              // Icon Mata Terbuka
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                <circle cx="12" cy="12" r="3"></circle>
              </svg>
            ) : (
              // Icon Mata Dicoret (Tertutup)
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                <line x1="1" y1="1" x2="23" y2="23"></line>
              </svg>
            )}
          </button>
        )}
      </div>

      {error ? (
        <span style={{ fontSize: '12px', color: 'var(--color-danger)', fontWeight: '500' }}>
          {error}
        </span>
      ) : helperText ? (
        <span style={{ fontSize: '12px', color: 'var(--color-text-dim)' }}>
          {helperText}
        </span>
      ) : null}
    </div>
  );
}
