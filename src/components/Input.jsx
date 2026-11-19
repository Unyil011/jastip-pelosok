import React from 'react';

export default function Input({
  label,
  error,
  helperText,
  icon = null,
  required = false,
  containerStyle = {},
  style = {},
  ...props
}) {
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
          style={{
            width: '100%',
            padding: icon ? '12px 14px 12px 38px' : '12px 14px',
            borderRadius: 'var(--radius-md)',
            border: error
              ? '1px solid var(--color-danger)'
              : '1px solid rgba(82, 99, 90, 0.22)',
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
              'inset 0 2px 4px rgba(20, 35, 28, 0.15), 0 0 0 3px rgba(39, 145, 85, 0.15)';
          }}
          onBlur={(e) => {
            e.target.style.border = error
              ? '1px solid var(--color-danger)'
              : '1px solid rgba(82, 99, 90, 0.22)';
            e.target.style.boxShadow = 'var(--skeuo-input-sunken)';
          }}
          {...props}
        />
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
