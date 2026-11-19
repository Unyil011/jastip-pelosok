import React from 'react';

export default function Select({
  label,
  options = [],
  error,
  helperText,
  required = false,
  placeholder = 'Pilih salah satu...',
  value,
  onChange,
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

      <div style={{ position: 'relative' }}>
        <select
          value={value}
          onChange={onChange}
          style={{
            width: '100%',
            padding: '12px 36px 12px 14px',
            borderRadius: 'var(--radius-md)',
            border: error
              ? '1px solid var(--color-danger)'
              : '1px solid rgba(82, 99, 90, 0.22)',
            background: 'var(--color-bg-input)',
            boxShadow: 'var(--skeuo-input-sunken)',
            fontSize: '14.5px',
            fontFamily: 'inherit',
            color: value ? 'var(--color-text-main)' : 'var(--color-text-dim)',
            outline: 'none',
            appearance: 'none',
            WebkitAppearance: 'none',
            cursor: 'pointer',
            ...style,
          }}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {/* Custom Chevron Down */}
        <span
          style={{
            position: 'absolute',
            right: '14px',
            top: '50%',
            transform: 'translateY(-50%)',
            pointerEvents: 'none',
            color: 'var(--color-text-dim)',
            fontSize: '12px',
          }}
        >
          ▼
        </span>
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
