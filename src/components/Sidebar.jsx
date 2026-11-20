import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import ThemeToggle from './ThemeToggle';

export default function Sidebar({ isOpen, onClose, onOpenAddressModal, onTriggerLogout }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, isProfileComplete } = useAuth();
  const { isDark } = useTheme();

  // Kunci scrolling saat sidebar terbuka
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleNav = (path) => {
    navigate(path);
    onClose();
  };

  return (
    <>
      {/* Backdrop Gelap dengan Blur */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.55)',
          backdropFilter: 'blur(3px)',
          WebkitBackdropFilter: 'blur(3px)',
          zIndex: 1000,
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'auto' : 'none',
          transition: 'opacity 0.25s ease',
        }}
      />

      {/* Drawer Sidebar Menu (Meluncur dari Kanan Layar) */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          bottom: 0,
          right: 0,
          left: 'auto',
          width: '84%',
          maxWidth: '340px',
          background: 'var(--color-bg-card)',
          boxShadow: 'var(--skeuo-button-raised), -10px 0 25px rgba(0,0,0,0.25)',
          borderLeft: '1px solid var(--color-border)',
          zIndex: 1001,
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
        }}
      >
        {/* Header Drawer */}
        <div
          style={{
            padding: '18px 18px 14px 18px',
            borderBottom: '1px solid rgba(82, 99, 90, 0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img
              src="/logo.webp"
              alt="Logo Jastip Pelosok"
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                objectFit: 'contain',
              }}
            />
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--color-primary-dark)', margin: 0 }}>
                Jastip Pelosok
              </h3>
              <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                Pengaturan & Akun
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            title="Tutup Menu"
            style={{
              background: 'var(--color-bg-base)',
              border: '1px solid var(--color-border)',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              color: 'var(--color-text-muted)',
              fontSize: '16px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ✕
          </button>
        </div>

        {/* Info Pengguna Terhubung dengan Foto Wajah */}
        <div
          style={{
            padding: '18px 18px',
            background: 'var(--color-bg-base)',
            borderBottom: '1px solid rgba(82, 99, 90, 0.12)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            {profile?.foto_url ? (
              <img
                src={profile.foto_url}
                alt={profile?.nama || 'Foto Profil'}
                style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '2.5px solid var(--color-primary)',
                  boxShadow: 'var(--skeuo-button-raised)',
                }}
              />
            ) : (
              <div
                style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--color-primary-light) 0%, var(--color-primary) 100%)',
                  color: '#ffffff',
                  fontWeight: '800',
                  fontSize: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: 'var(--skeuo-button-raised)',
                  border: '2px solid rgba(255, 255, 255, 0.4)',
                }}
              >
                {profile?.nama ? profile.nama.charAt(0).toUpperCase() : 'C'}
              </div>
            )}

            <div style={{ flex: 1, minWidth: 0 }}>
              <h4
                style={{
                  fontSize: '15px',
                  fontWeight: '800',
                  color: 'var(--color-text-main)',
                  margin: 0,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {profile?.nama || 'Pelanggan'}
              </h4>
              <p
                style={{
                  fontSize: '12px',
                  color: 'var(--color-text-muted)',
                  margin: '3px 0 0 0',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {profile?.no_hp ? `📱 ${profile.no_hp}` : 'Belum ada nomor WA'}
              </p>
            </div>
          </div>

          <div style={{ marginTop: '12px' }}>
            {isProfileComplete ? (
              <span
                style={{
                  display: 'inline-block',
                  fontSize: '11px',
                  fontWeight: '700',
                  background: '#22c55e',
                  color: '#ffffff',
                  padding: '3px 9px',
                  borderRadius: '999px',
                }}
              >
                ✓ Alamat Terverifikasi
              </span>
            ) : (
              <span
                style={{
                  display: 'inline-block',
                  fontSize: '11px',
                  fontWeight: '700',
                  background: '#f59e0b',
                  color: '#ffffff',
                  padding: '3px 9px',
                  borderRadius: '999px',
                }}
              >
                ⚠️ Alamat Belum Lengkap
              </span>
            )}
          </div>
        </div>

        {/* Menu Navigasi & Pengaturan */}
        <div style={{ padding: '16px 14px', flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--color-text-dim)', padding: '0 8px', letterSpacing: '0.6px', textTransform: 'uppercase' }}>
            Menu Utama
          </div>

          <button
            onClick={() => handleNav('/dashboard-customer')}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '11px 12px',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              background: location.pathname === '/dashboard-customer' ? 'rgba(34, 197, 94, 0.12)' : 'transparent',
              color: location.pathname === '/dashboard-customer' ? 'var(--color-primary)' : 'var(--color-text-main)',
              fontWeight: location.pathname === '/dashboard-customer' ? '700' : '600',
              fontSize: '14px',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <span style={{ fontSize: '18px' }}>🏠</span>
            <span>Beranda</span>
          </button>

          <button
            onClick={() => handleNav('/buat-order')}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '11px 12px',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              background: location.pathname === '/buat-order' ? 'rgba(34, 197, 94, 0.12)' : 'transparent',
              color: location.pathname === '/buat-order' ? 'var(--color-primary)' : 'var(--color-text-main)',
              fontWeight: location.pathname === '/buat-order' ? '700' : '600',
              fontSize: '14px',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <span style={{ fontSize: '18px' }}>➕</span>
            <span>Buat Order Baru</span>
          </button>

          <button
            onClick={() => handleNav('/riwayat-order')}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '11px 12px',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              background: location.pathname === '/riwayat-order' ? 'rgba(34, 197, 94, 0.12)' : 'transparent',
              color: location.pathname === '/riwayat-order' ? 'var(--color-primary)' : 'var(--color-text-main)',
              fontWeight: location.pathname === '/riwayat-order' ? '700' : '600',
              fontSize: '14px',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <span style={{ fontSize: '18px' }}>📋</span>
            <span>Riwayat Titipan</span>
          </button>

          <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--color-text-dim)', padding: '12px 8px 0 8px', letterSpacing: '0.6px', textTransform: 'uppercase' }}>
            Pengaturan & Akun
          </div>

          {/* Pengaturan Alamat & Foto Profil */}
          <button
            onClick={() => {
              onClose();
              onOpenAddressModal();
            }}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '11px 12px',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              background: 'transparent',
              color: 'var(--color-text-main)',
              fontWeight: '600',
              fontSize: '14px',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <span style={{ fontSize: '18px' }}>👤</span>
            <span>Edit Profil, Foto & Alamat</span>
          </button>

          {/* Pengaturan Dark/Light Mode */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 12px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-bg-base)',
              boxShadow: 'var(--skeuo-input-sunken)',
              marginTop: '4px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '18px' }}>{isDark ? '🌙' : '☀️'}</span>
              <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--color-text-main)' }}>
                {isDark ? 'Mode Gelap' : 'Mode Terang'}
              </span>
            </div>
            <ThemeToggle />
          </div>
        </div>

        {/* Footer Sidebar: Tombol Keluar */}
        <div
          style={{
            padding: '16px 18px',
            borderTop: '1px solid rgba(82, 99, 90, 0.12)',
          }}
        >
          <button
            onClick={() => {
              onClose();
              onTriggerLogout();
            }}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid #ef4444',
              background: 'rgba(239, 68, 68, 0.08)',
              color: '#ef4444',
              fontWeight: '700',
              fontSize: '13.5px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'background 0.2s ease',
            }}
          >
            <span>🚪</span>
            <span>Keluar dari Akun</span>
          </button>

          <div style={{ textAlign: 'center', marginTop: '12px', fontSize: '11px', color: 'var(--color-text-dim)' }}>
            Jastip Pelosok v1.0 • Kec. Naringgul
          </div>
        </div>
      </div>
    </>
  );
}
