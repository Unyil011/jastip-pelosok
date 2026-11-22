import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import { useAuth } from '../hooks/useAuth';
import { getFriendlyErrorMessage } from '../utils/errorHandler';
import Card from '../components/Card';
import Input from '../components/Input';
import Button from '../components/Button';
import BottomSheet from '../components/BottomSheet';
import ThemeToggle from '../components/ThemeToggle';

export default function Login() {
  const navigate = useNavigate();
  const { setProfile } = useAuth();

  // State untuk Google OAuth
  const [googleLoading, setGoogleLoading] = useState(false);

  // State untuk form Petugas / Kurir
  const [showStaffLogin, setShowStaffLogin] = useState(false);
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [staffLoading, setStaffLoading] = useState(false);

  // BottomSheet State untuk Notifikasi Error
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetMessage, setSheetMessage] = useState('');

  // Handler Login Customer via Google OAuth
  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      await authService.loginWithGoogle();
      // Browser otomatis redirect ke Google OAuth Supabase
    } catch (err) {
      setSheetMessage(getFriendlyErrorMessage(err));
      setSheetOpen(true);
      setGoogleLoading(false);
    }
  };

  // Handler Login Manual untuk Kurir & Admin
  const handleStaffLogin = async (e) => {
    e.preventDefault();
    setStaffLoading(true);

    try {
      const profile = await authService.login({ phone, password });
      setProfile(profile);

      if (profile.role === 'customer') {
        navigate('/dashboard-customer');
      } else if (profile.role === 'kurir') {
        navigate('/dashboard-kurir');
      } else if (profile.role === 'admin') {
        navigate('/dashboard-admin');
      }
    } catch (err) {
      setSheetMessage(getFriendlyErrorMessage(err));
      setSheetOpen(true);
    } finally {
      setStaffLoading(false);
    }
  };

  return (
    <div className="app-container-no-nav" style={{ justifyContent: 'center', paddingBottom: '32px' }}>
      {/* Top Header Switcher */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px', width: '100%' }}>
        <ThemeToggle />
      </div>

      {/* Hero Visual Card (Trend Aplikasi Modern ala Wayfare) */}
      <div
        style={{
          borderRadius: 'var(--radius-xl)',
          background: 'linear-gradient(145deg, var(--color-primary-dark) 0%, var(--color-primary) 60%, var(--color-primary-light) 100%)',
          color: '#ffffff',
          padding: '36px 22px 28px 22px',
          textAlign: 'center',
          boxShadow: 'var(--skeuo-button-raised)',
          border: '1px solid rgba(255, 255, 255, 0.25)',
          position: 'relative',
          overflow: 'hidden',
          marginBottom: '20px',
        }}
      >
        {/* Subtle Decorative Background Glow */}
        <div
          style={{
            position: 'absolute',
            top: '-30px',
            right: '-30px',
            width: '140px',
            height: '140px',
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.12)',
            filter: 'blur(20px)',
            pointerEvents: 'none',
          }}
        />

        {/* 3D App Icon Badge */}
        <div
          style={{
            width: '82px',
            height: '82px',
            borderRadius: '24px',
            background: 'linear-gradient(135deg, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.08) 100%)',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.22)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px auto',
            border: '2px solid rgba(255, 255, 255, 0.45)',
            overflow: 'hidden',
            padding: '4px',
          }}
        >
          <img
            src="/logo.webp"
            alt="Logo Jastip Pelosok"
            style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '18px' }}
          />
        </div>

        <span
          style={{
            fontSize: '11px',
            fontWeight: '800',
            letterSpacing: '1.2px',
            textTransform: 'uppercase',
            opacity: 0.9,
            display: 'inline-block',
            marginBottom: '6px',
            background: 'rgba(255, 255, 255, 0.18)',
            padding: '4px 12px',
            borderRadius: '999px',
          }}
        >
          Layanan Antar Pelosok
        </span>

        <h1
          style={{
            fontSize: '26px',
            fontWeight: '800',
            color: '#ffffff',
            letterSpacing: '-0.5px',
            lineHeight: '1.2',
            margin: '6px 0 8px 0',
          }}
        >
          Jastip Pelosok
        </h1>

        <p
          style={{
            fontSize: '13.5px',
            color: 'rgba(255, 255, 255, 0.92)',
            lineHeight: '1.5',
            maxWidth: '320px',
            margin: '0 auto',
          }}
        >
          Belanja online & kirim paket sampai depan pintu rumah di 11 desa pelosok Naringgul.
        </p>
      </div>

      {/* Main Authentication Card */}
      <Card>
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--color-primary-dark)', margin: 0 }}>
            Selamat Datang!
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
            Masuk dengan cepat tanpa perlu isi form panjang
          </p>
        </div>

        {/* Primary CTA: Lanjutkan dengan Google */}
        <button
          onClick={handleGoogleLogin}
          disabled={googleLoading}
          style={{
            width: '100%',
            height: '52px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--color-bg-card)',
            border: '1.5px solid var(--color-border)',
            boxShadow: 'var(--skeuo-button-raised)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            cursor: googleLoading ? 'not-allowed' : 'pointer',
            fontSize: '14.5px',
            fontWeight: '700',
            color: 'var(--color-text-main)',
            transition: 'all 0.15s ease',
            padding: '0 16px',
          }}
        >
          {googleLoading ? (
            <span style={{ fontSize: '13.5px', color: 'var(--color-text-muted)' }}>
              Menghubungkan ke Google...
            </span>
          ) : (
            <>
              {/* Colorful Google SVG Logo */}
              <svg width="22" height="22" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Lanjutkan dengan Google</span>
            </>
          )}
        </button>

        {/* Feature Highlights */}
        <div
          style={{
            marginTop: '22px',
            padding: '14px 16px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--color-bg-base)',
            boxShadow: 'var(--skeuo-input-sunken)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: 'var(--color-text-main)' }}>
            <span>✅</span>
            <span>Satu kali klik, langsung masuk dashboard</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: 'var(--color-text-main)' }}>
            <span>🏡</span>
            <span>Lengkapi alamat pengiriman di dalam aplikasi</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: 'var(--color-text-main)' }}>
            <span>🔒</span>
            <span>Data terlindungi aman & terenkripsi</span>
          </div>
        </div>

        {/* Petugas / Kurir Toggle */}
        <div
          style={{
            marginTop: '20px',
            paddingTop: '16px',
            borderTop: '1px solid rgba(82, 99, 90, 0.12)',
            textAlign: 'center',
          }}
        >
          <button
            type="button"
            onClick={() => setShowStaffLogin(!showStaffLogin)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-text-muted)',
              fontSize: '12.5px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 10px',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            <span>{showStaffLogin ? '▲ Sembunyikan Login Petugas' : '▼ Masuk sebagai Petugas / Kurir'}</span>
          </button>
        </div>

        {/* Collapsible Form Login Petugas/Kurir */}
        {showStaffLogin && (
          <div
            style={{
              marginTop: '16px',
              padding: '16px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-bg-base)',
              border: '1px solid var(--color-border)',
            }}
          >
            <div style={{ marginBottom: '12px', textAlign: 'left' }}>
              <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--color-primary-dark)' }}>
                LOGIN KHUSUS ADMIN & KURIR
              </span>
              <p style={{ fontSize: '11.5px', color: 'var(--color-text-muted)', margin: '2px 0 8px 0' }}>
                Akun kurir & admin resmi untuk operasional
              </p>
              <div
                style={{
                  background: 'var(--color-bg-card)',
                  border: '1px dashed var(--color-primary)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '10px 12px',
                  fontSize: '11.5px',
                  color: 'var(--color-text-main)',
                  lineHeight: '1.5',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span>🏍️ <strong>Kurir:</strong> <code>081234567899</code></span>
                  <span style={{ color: 'var(--color-text-muted)' }}>Sandi: <code>Password123!</code></span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>👑 <strong>Admin:</strong> <code>admin_utama@jastip.com</code></span>
                  <span style={{ color: 'var(--color-text-muted)' }}>Sandi: <code>ChangeMe123!</code></span>
                </div>
              </div>
            </div>

            <form onSubmit={handleStaffLogin}>
              <Input
                label="Nomor HP atau Email Petugas / Admin"
                type="text"
                placeholder="Contoh: 081234567899 atau admin_utama@jastip.com"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />

              <Input
                label="Kata Sandi (Password)"
                type="password"
                placeholder="Masukkan kata sandi"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />

              <div style={{ marginTop: '16px' }}>
                <Button type="submit" loading={staffLoading}>
                  Masuk sebagai Petugas / Admin
                </Button>
              </div>

              <div
                style={{
                  marginTop: '16px',
                  paddingTop: '12px',
                  borderTop: '1px solid rgba(82, 99, 90, 0.12)',
                  textAlign: 'center',
                  fontSize: '12.5px',
                  color: 'var(--color-text-muted)',
                }}
              >
                Ingin bergabung mengantar paket?{' '}
                <button
                  type="button"
                  onClick={() => navigate('/register-kurir')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--color-primary-dark)',
                    fontWeight: '800',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    padding: 0,
                  }}
                >
                  Daftar Akun Kurir Baru →
                </button>
              </div>
            </form>
          </div>
        )}
      </Card>

      {/* Error Bottom Sheet */}
      <BottomSheet isOpen={sheetOpen} onClose={() => setSheetOpen(false)} title="Pemberitahuan">
        <div style={{ textAlign: 'center', padding: '10px 0 16px 0' }}>
          <div style={{ fontSize: '38px', marginBottom: '10px' }}>⚠️</div>
          <p style={{ fontSize: '14.5px', color: 'var(--color-text-main)', lineHeight: '1.5' }}>
            {sheetMessage}
          </p>
          <div style={{ marginTop: '20px' }}>
            <Button variant="outline" onClick={() => setSheetOpen(false)}>
              Mengerti
            </Button>
          </div>
        </div>
      </BottomSheet>
    </div>
  );
}
