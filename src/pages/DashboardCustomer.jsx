import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { authService } from '../services/authService';
import { orderService } from '../services/orderService';
import { villageService } from '../services/villageService';
import { getFriendlyErrorMessage } from '../utils/errorHandler';
import { compressImageToWebP } from '../utils/imageCompressor';
import Card from '../components/Card';
import Input from '../components/Input';
import Select from '../components/Select';
import Button from '../components/Button';
import BottomNav from '../components/BottomNav';
import BottomSheet from '../components/BottomSheet';
import ConfirmationSheet from '../components/ConfirmationSheet';
import Sidebar from '../components/Sidebar';

export default function DashboardCustomer() {
  const navigate = useNavigate();
  const { profile, refreshProfile, isProfileComplete } = useAuth();
  const fileInputRef = useRef(null);

  // Sidebar & Modal States
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileSheetOpen, setProfileSheetOpen] = useState(false);
  const [logoutSheetOpen, setLogoutSheetOpen] = useState(false);
  const [noticeSheetOpen, setNoticeSheetOpen] = useState(false);
  const [noticeMessage, setNoticeMessage] = useState('');

  // Active Order Live Tracking State
  const [activeOrder, setActiveOrder] = useState(null);
  const [loadingOrder, setLoadingOrder] = useState(true);

  // State Form Profil, Foto & Alamat
  const [name, setName] = useState(profile?.nama || '');
  const [phone, setPhone] = useState(profile?.no_hp || '');
  const [fotoUrl, setFotoUrl] = useState(profile?.foto_url || '');
  const [compressingFoto, setCompressingFoto] = useState(false);
  const [selectedDesaId, setSelectedDesaId] = useState('');
  const [kampung, setKampung] = useState('');
  const [rt, setRt] = useState('');
  const [rw, setRw] = useState('');
  const [patokan, setPatokan] = useState('');

  // State Titik Koordinat GPS (Bisa GPS Otomatis & Manual)
  const [latitude, setLatitude] = useState(profile?.latitude || '');
  const [longitude, setLongitude] = useState(profile?.longitude || '');
  const [fetchingGps, setFetchingGps] = useState(false);
  const [manualCoordMode, setManualCoordMode] = useState(false);
  const [pastedMapText, setPastedMapText] = useState('');
  const [mapParseStatus, setMapParseStatus] = useState(null); // 'success' | 'shortlink' | 'error' | null

  // State Kalkulator Ongkir Cepat
  const [calcDesaId, setCalcDesaId] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // Data 11 Desa Pelosok
  const [desaList, setDesaList] = useState([]);

  // Fungsi untuk mem-parsing dan mengisi form dari data profile yang sudah tersimpan
  const populateFormFromProfile = (prof = profile, list = desaList) => {
    if (!prof) return;
    if (prof.nama) setName(prof.nama);
    if (prof.no_hp) setPhone(prof.no_hp);
    if (prof.foto_url) setFotoUrl(prof.foto_url);
    if (prof.latitude) setLatitude(prof.latitude);
    if (prof.longitude) setLongitude(prof.longitude);

    if (prof.alamat) {
      const full = prof.alamat;

      // 1. Ekstrak patokan jika ada (di dalam kurung "Patokan: ...")
      const patokanMatch = full.match(/\(Patokan:\s*([^)]+)\)/i);
      if (patokanMatch) {
        setPatokan(patokanMatch[1].trim());
      }

      // Bersihkan teks patokan untuk ekstraksi data alamat utama
      const clean = full.split('(')[0].trim();

      // 2. Ekstrak Desa yang cocok
      if (list && list.length > 0) {
        const matchedDesa = list.find((d) =>
          clean.toLowerCase().includes(d.nama_desa.toLowerCase())
        );
        if (matchedDesa) {
          setSelectedDesaId(matchedDesa.id);
        }
      }

      // 3. Ekstrak RT
      const rtMatch = clean.match(/RT\s*(\d+)/i);
      if (rtMatch) {
        setRt(rtMatch[1].trim());
      }

      // 4. Ekstrak RW
      const rwMatch = clean.match(/RW\s*(\d+)/i);
      if (rwMatch) {
        setRw(rwMatch[1].trim());
      }

      // 5. Ekstrak Kampung
      const kpMatch = clean.match(/(?:Kp\.|Kampung)\s*([^,]+)/i);
      if (kpMatch) {
        setKampung(kpMatch[1].trim());
      } else {
        const firstPart = clean.split(',')[0].trim();
        if (firstPart && !firstPart.toLowerCase().includes('desa')) {
          setKampung(firstPart.replace(/^(?:Kp\.|Kampung)\s*/i, '').trim());
        }
      }
    }
  };

  useEffect(() => {
    async function loadInitialData() {
      try {
        const list = await villageService.getAllDesa();
        setDesaList(list);

        if (profile?.id) {
          const orders = await orderService.getOrdersByCustomerId(profile.id);
          const active = orders.find(
            (o) => o.status_pengiriman !== 'sampai_tujuan' && o.status_konfirmasi !== 'ditolak'
          );
          setActiveOrder(active || null);
          populateFormFromProfile(profile, list);
        }
      } catch (err) {
        console.error('Gagal memuat data awal:', err);
      } finally {
        setLoadingOrder(false);
      }
    }
    loadInitialData();
  }, [profile?.id]);

  // Sinkronisasi data saat profil atau daftar desa diperbarui
  useEffect(() => {
    if (profile) {
      populateFormFromProfile(profile, desaList);
    }
  }, [profile, desaList]);

  // Setiap kali form Edit Profil dibuka, pastikan data yang tersimpan langsung muncul utuh
  useEffect(() => {
    if (profileSheetOpen) {
      populateFormFromProfile(profile, desaList);
    }
  }, [profileSheetOpen]);

  // Handler Pilih & Kompres Foto Profil ke WebP
  const handleFotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCompressingFoto(true);
    try {
      const webpBase64 = await compressImageToWebP(file, 300, 0.8);
      setFotoUrl(webpBase64);
    } catch (err) {
      showNotice(err.message || 'Gagal memproses foto. Silakan coba gambar lain.');
    } finally {
      setCompressingFoto(false);
    }
  };

  // Handler Ambil Titik Koordinat GPS Rumah Otomatis
  const handleGetGpsLocation = () => {
    if (!navigator.geolocation) {
      showNotice('Fitur GPS tidak didukung di browser ini. Anda bisa mengisinya manual di bawah.');
      setManualCoordMode(true);
      return;
    }

    setFetchingGps(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setLatitude(lat);
        setLongitude(lng);
        setMapParseStatus('success');
        setFetchingGps(false);
      },
      (error) => {
        setFetchingGps(false);
        let msg = 'Gagal mendeteksi lokasi GPS.';
        if (error.code === error.PERMISSION_DENIED) {
          msg = 'Izin akses lokasi ditolak. Silakan masukkan koordinat secara manual atau tempel link Google Maps.';
        }
        showNotice(msg);
        setManualCoordMode(true);
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 0,
      }
    );
  };

  // Handler Parse Link atau Teks Koordinat Google Maps
  const handleParseMapText = (text) => {
    setPastedMapText(text);
    if (!text || !text.trim()) {
      setMapParseStatus(null);
      return;
    }

    const trimmed = text.trim();

    // 1. Cek apakah link pendek Google Maps (maps.app.goo.gl atau goo.gl/maps)
    // Link pendek dari tombol 'Bagikan' di aplikasi Maps TIDAK memuat angka koordinat di dalam URL-nya
    if (trimmed.includes('maps.app.goo.gl') || trimmed.includes('goo.gl/maps')) {
      setMapParseStatus('shortlink');
      return;
    }

    // 2. Format Pecahan Derajat / DMS (e.g. 7°28'52.4"S 107°31'52.3"E)
    const dmsRegex = /(\d+)[°\s]+(\d+)['\s]+([\d.]+)"?\s*([NSns])[,\s]+(\d+)[°\s]+(\d+)['\s]+([\d.]+)"?\s*([EWew])/;
    const matchDms = trimmed.match(dmsRegex);
    if (matchDms) {
      const latDeg = parseFloat(matchDms[1]) + parseFloat(matchDms[2]) / 60 + parseFloat(matchDms[3]) / 3600;
      const latVal = matchDms[4].toUpperCase() === 'S' ? -latDeg : latDeg;
      const lngDeg = parseFloat(matchDms[5]) + parseFloat(matchDms[6]) / 60 + parseFloat(matchDms[7]) / 3600;
      const lngVal = matchDms[8].toUpperCase() === 'W' ? -lngDeg : lngDeg;
      setLatitude(parseFloat(latVal.toFixed(6)));
      setLongitude(parseFloat(lngVal.toFixed(6)));
      setMapParseStatus('success');
      return;
    }

    // 3. Format URL Embed / Share Maps: !3d(-?[\d.]+)!4d(-?[\d.]+)
    const embedRegex = /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/;
    const matchEmbed = trimmed.match(embedRegex);
    if (matchEmbed) {
      setLatitude(parseFloat(matchEmbed[1]));
      setLongitude(parseFloat(matchEmbed[2]));
      setMapParseStatus('success');
      return;
    }

    // 4. Format URL @latitude,longitude (e.g. google.com/maps/@-7.48123,107.53123)
    const atRegex = /@(-?\d+\.\d+)[,\s]+(-?\d+\.\d+)/;
    const matchAt = trimmed.match(atRegex);
    if (matchAt) {
      setLatitude(parseFloat(matchAt[1]));
      setLongitude(parseFloat(matchAt[2]));
      setMapParseStatus('success');
      return;
    }

    // 5. Format Parameter URL (q=, query=, ll=, destination=)
    const paramRegex = /[?&](?:q|query|ll|destination)=(-?\d+\.\d+)[,\s]+(-?\d+\.\d+)/;
    const matchParam = trimmed.match(paramRegex);
    if (matchParam) {
      setLatitude(parseFloat(matchParam[1]));
      setLongitude(parseFloat(matchParam[2]));
      setMapParseStatus('success');
      return;
    }

    // 6. Format Angka Koordinat Standar (-7.xxxx, 107.xxxx atau spasi)
    const simpleRegex = /(-?\d+\.\d+)[,\s]+(-?\d+\.\d+)/;
    const matchSimple = trimmed.match(simpleRegex);
    if (matchSimple) {
      setLatitude(parseFloat(matchSimple[1]));
      setLongitude(parseFloat(matchSimple[2]));
      setMapParseStatus('success');
      return;
    }

    // Jika tidak ada pola koordinat yang ditemukan
    setMapParseStatus('error');
  };

  // Handler Simpan Profil, Foto & Alamat
  const handleSaveProfile = async (e) => {
    e.preventDefault();

    if (!name.trim()) {
      showNotice('Nama lengkap wajib diisi.');
      return;
    }

    const cleanPhone = phone.replace(/[^0-9]/g, '');
    if (cleanPhone.length < 10) {
      showNotice('Nomor WhatsApp / HP tidak valid (minimal 10 digit).');
      return;
    }

    // Susun alamat pengiriman
    let formattedAddress = profile?.alamat || '';
    if (selectedDesaId && kampung.trim() && rt.trim() && rw.trim()) {
      const chosenDesa = desaList.find((d) => d.id === selectedDesaId);
      const namaDesa = chosenDesa ? chosenDesa.nama_desa : '';

      formattedAddress = `Kp. ${kampung.trim()}, RT ${rt.trim().padStart(2, '0')}/RW ${rw.trim().padStart(2, '0')}, Desa ${namaDesa}`;
      if (patokan.trim()) {
        formattedAddress += ` (Patokan: ${patokan.trim()})`;
      }
    } else if (!formattedAddress) {
      if (!selectedDesaId) {
        showNotice('Silakan pilih Desa tempat tinggal Anda.');
        return;
      }
      if (!kampung.trim()) {
        showNotice('Nama Kampung / Dusun wajib diisi.');
        return;
      }
      if (!rt.trim() || !rw.trim()) {
        showNotice('Nomor RT dan RW wajib diisi.');
        return;
      }
    }

    setSavingProfile(true);

    try {
      await authService.updateCustomerProfile(profile.id, {
        name: name.trim(),
        phone: cleanPhone,
        address: formattedAddress,
        fotoUrl: fotoUrl || null,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
      });

      await refreshProfile();
      setProfileSheetOpen(false);
      showNotice('Data profil, foto, alamat & titik GPS berhasil disimpan!');
    } catch (err) {
      showNotice(getFriendlyErrorMessage(err));
    } finally {
      setSavingProfile(false);
    }
  };

  const showNotice = (msg) => {
    setNoticeMessage(msg);
    setNoticeSheetOpen(true);
  };

  const handleLogout = async () => {
    try {
      await authService.logout();
      navigate('/login');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const getLocationLabel = () => {
    if (!profile?.alamat) return 'Atur Titik Lokasi Rumah';
    const clean = profile.alamat.split('(')[0];
    const parts = clean.split(',').map((p) => p.trim());
    let village = '';
    if (parts.length >= 3) {
      village = parts[2].replace(/^Desa\s+/i, '');
    }
    // Bersihkan jika ada tulisan "Kp." yang berulang
    let kp = parts[0].replace(/^(?:Kp\.\s*)+/i, 'Kp. ');
    return village ? `${kp}, ${village}` : kp || 'Kec. Naringgul';
  };

  return (
    <div className="app-container" style={{ paddingBottom: '90px', paddingTop: '14px' }}>
      {/* 1. Header Minimalis & Clean (Sesuai Referensi AFTER: Lokasi di Kiri, Avatar Profil di Kanan) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '18px',
          padding: '2px 4px',
        }}
      >
        {/* Sapaan Pengguna (Kiri) - Menggunakan Nama Google & Terupdate saat Profil Diisi */}
        <div
          onClick={() => setProfileSheetOpen(true)}
          style={{
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
          }}
          title="Klik untuk ubah profil, nama, atau alamat rumah"
        >
          <span
            style={{
              fontSize: '16.5px',
              fontWeight: '900',
              color: 'var(--color-text-main)',
              letterSpacing: '-0.3px',
              maxWidth: '240px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            Halo, {profile?.nama || 'Pelanggan'}! 👋
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '3px', marginTop: '1px' }}>
            <span style={{ fontSize: '11px' }}>📍</span>
            <span
              style={{
                fontSize: '11.5px',
                fontWeight: '600',
                color: profile?.alamat ? 'var(--color-text-muted)' : '#f59e0b',
                maxWidth: '220px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {profile?.alamat ? getLocationLabel() : 'Atur alamat rumah'}
            </span>
            <span style={{ fontSize: '10px', color: 'var(--color-primary)', fontWeight: '700' }}>▾</span>
          </div>
        </div>

        {/* Foto Profil Avatar (Kanan) -> Membuka Slide Drawer Pengaturan & Profil tempat Logo Jastip Pelosok berada */}
        <button
          onClick={() => setSidebarOpen(true)}
          title="Buka Menu Akun & Profil Jastip Pelosok"
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            position: 'relative',
          }}
        >
          {profile?.foto_url ? (
            <img
              src={profile.foto_url}
              alt={profile?.nama || 'Profil'}
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                objectFit: 'cover',
                border: '2px solid var(--color-primary)',
                boxShadow: 'var(--skeuo-button-raised)',
              }}
            />
          ) : (
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--color-primary-light) 0%, var(--color-primary) 100%)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px',
                fontWeight: '800',
                boxShadow: 'var(--skeuo-button-raised)',
                border: '2px solid rgba(255,255,255,0.6)',
              }}
            >
              {profile?.nama ? profile.nama.charAt(0).toUpperCase() : '👤'}
            </div>
          )}
          {/* Dot Status Hijau */}
          <span
            style={{
              position: 'absolute',
              bottom: '1px',
              right: '1px',
              width: '11px',
              height: '11px',
              borderRadius: '50%',
              background: '#22c55e',
              border: '2px solid var(--color-bg-base)',
            }}
          />
        </button>
      </div>

      {/* 2. Hero Banner Solusi Jastip Pelosok */}
      <div
        style={{
          background: 'linear-gradient(135deg, #064e3b 0%, #047857 55%, #059669 100%)',
          borderRadius: '22px',
          padding: '20px 18px',
          color: '#ffffff',
          position: 'relative',
          overflow: 'hidden',
          marginBottom: '20px',
          boxShadow: '0 10px 28px rgba(6, 95, 70, 0.3), var(--skeuo-button-raised)',
          border: '1.5px solid rgba(255, 255, 255, 0.22)',
        }}
      >
        {/* Dekorasi visual lingkaran */}
        <div
          style={{
            position: 'absolute',
            top: '-35px',
            right: '-35px',
            width: '140px',
            height: '140px',
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.08)',
            pointerEvents: 'none',
          }}
        />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '14px' }}>
          <div style={{ flex: 1, zIndex: 1 }}>
            {/* Nama Aplikasi Besar Sesuai Permintaan User */}
            <h2
              style={{
                fontSize: '23px',
                fontWeight: '900',
                margin: '0 0 4px 0',
                letterSpacing: '-0.5px',
                color: '#ffffff',
                textShadow: '0 2px 5px rgba(0,0,0,0.2)',
              }}
            >
              Jastip Pelosok 🛵
            </h2>

            {/* Tagline & Kata-kata Pemanis */}
            <p
              style={{
                fontSize: '12.5px',
                fontWeight: '700',
                color: '#d1fae5',
                margin: '0 0 6px 0',
                lineHeight: '1.35',
              }}
            >
              Jembatan Belanja & Kiriman Anda Hingga ke Ujung Desa
            </p>

            <p
              style={{
                fontSize: '11.5px',
                color: 'rgba(255, 255, 255, 0.88)',
                margin: '0 0 14px 0',
                lineHeight: '1.4',
              }}
            >
              Amanah, cepat & pasti diantar sampai depan pintu rumah.
            </p>

            <button
              onClick={() => navigate('/buat-order')}
              style={{
                background: '#ffffff',
                color: '#064e3b',
                border: 'none',
                padding: '8px 18px',
                borderRadius: '999px',
                fontSize: '12.5px',
                fontWeight: '800',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(0, 0, 0, 0.22)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'transform 0.15s ease',
              }}
              onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.95)')}
              onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
            >
              <span>Buat Order Baru</span>
              <span>➔</span>
            </button>
          </div>

          {/* Logo Jastip Pelosok Resmi dengan Animasi Mengambang (Floating Effect) */}
          <div style={{ zIndex: 1, flexShrink: 0, textAlign: 'center' }}>
            <img
              src="/logo.webp"
              alt="Logo Jastip Pelosok"
              className="floating-hero-logo"
              style={{
                width: '76px',
                height: '76px',
                borderRadius: '18px',
                objectFit: 'contain',
                border: '2.5px solid rgba(255, 255, 255, 0.65)',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35)',
              }}
            />
          </div>
        </div>
      </div>

      {/* 3. Kategori Layanan (Inspirasi "Service Categories" pada Gambar AFTER) */}
      <div style={{ marginBottom: '22px' }}>
        <div
          style={{
            marginBottom: '12px',
            padding: '0 2px',
          }}
        >
          <h3 style={{ fontSize: '15.5px', fontWeight: '800', color: 'var(--color-text-main)', margin: 0 }}>
            Kategori Layanan
          </h3>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          {/* Layanan 1: Paket Ekspedisi */}
          <div
            onClick={() => navigate('/buat-order', { state: { service: 'paket_ekspedisi' } })}
            style={{
              padding: '14px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-bg-card)',
              border: '1px solid var(--color-border)',
              boxShadow: 'var(--skeuo-button-raised)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              transition: 'transform 0.15s ease',
            }}
            onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.97)')}
            onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          >
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: 'rgba(34, 197, 94, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px',
              }}
            >
              📦
            </div>
            <div>
              <h4 style={{ fontSize: '13px', fontWeight: '800', margin: 0, color: 'var(--color-text-main)' }}>
                Paket Ekspedisi
              </h4>
              <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                Jemput resi kurir
              </span>
            </div>
          </div>

          {/* Layanan 2: Titip Barang */}
          <div
            onClick={() => navigate('/buat-order', { state: { service: 'titip_beli' } })}
            style={{
              padding: '14px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-bg-card)',
              border: '1px solid var(--color-border)',
              boxShadow: 'var(--skeuo-button-raised)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              transition: 'transform 0.15s ease',
            }}
            onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.97)')}
            onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          >
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: 'rgba(59, 130, 246, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px',
              }}
            >
              🛍️
            </div>
            <div>
              <h4 style={{ fontSize: '13px', fontWeight: '800', margin: 0, color: 'var(--color-text-main)' }}>
                Titip Barang
              </h4>
              <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                Belanjaan pasar/toko
              </span>
            </div>
          </div>

          {/* Layanan 3: Jadwal Antaran */}
          <div
            onClick={() => {
              const el = document.getElementById('jadwal-antaran-section');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
            style={{
              padding: '14px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-bg-card)',
              border: '1px solid var(--color-border)',
              boxShadow: 'var(--skeuo-button-raised)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              transition: 'transform 0.15s ease',
            }}
            onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.97)')}
            onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          >
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: 'rgba(245, 158, 11, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px',
              }}
            >
              🕒
            </div>
            <div>
              <h4 style={{ fontSize: '13px', fontWeight: '800', margin: 0, color: 'var(--color-text-main)' }}>
                Jadwal Kurir
              </h4>
              <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                Pagi & siang hari
              </span>
            </div>
          </div>

          {/* Layanan 4: Chat Admin Hub */}
          <a
            href="https://wa.me/6281234567890?text=Halo%20Admin%20Jastip%20Pelosok,%20saya%20mau%20tanya%20seputar%20paket"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              padding: '14px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-bg-card)',
              border: '1px solid var(--color-border)',
              boxShadow: 'var(--skeuo-button-raised)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              textDecoration: 'none',
              transition: 'transform 0.15s ease',
            }}
            onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.97)')}
            onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          >
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: 'rgba(37, 211, 102, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px',
              }}
            >
              💬
            </div>
            <div>
              <h4 style={{ fontSize: '13px', fontWeight: '800', margin: 0, color: 'var(--color-text-main)' }}>
                Bantuan Admin
              </h4>
              <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                WhatsApp Hub Pelosok
              </span>
            </div>
          </a>
        </div>
      </div>

      {/* Peringatan Jika Data Alamat Belum Lengkap */}
      {!isProfileComplete && (
        <Card
          style={{
            marginBottom: '16px',
            border: '2px dashed #f59e0b',
            background: 'rgba(245, 158, 11, 0.08)',
          }}
        >
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '28px' }}>⚠️</span>
            <div style={{ flex: 1 }}>
              <h4 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--color-primary-dark)', margin: 0 }}>
                Lengkapi Alamat Pengiriman Anda
              </h4>
              <p style={{ fontSize: '12.5px', color: 'var(--color-text-main)', marginTop: '4px', lineHeight: '1.4' }}>
                Sebelum bisa membuat pesanan jastip / kirim barang, mohon lengkapi nomor WhatsApp dan alamat rumah Anda terlebih dahulu.
              </p>
              <div style={{ marginTop: '12px' }}>
                <Button size="sm" onClick={() => setProfileSheetOpen(true)}>
                  ✍️ Lengkapi Data Sekarang
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* 3. KONTEN UTAMA: Live Status & Pelacakan Paket ala Shopee */}
      {activeOrder ? (
        <Card
          title="Pelacakan Pengiriman Langsung"
          subtitle="Pantau posisi dan status kurir menuju rumah Anda"
          style={{ marginBottom: '16px', border: '1.5px solid var(--color-primary)' }}
        >
          <div
            style={{
              padding: '12px 14px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(34, 197, 94, 0.08)',
              border: '1px solid rgba(34, 197, 94, 0.25)',
              marginBottom: '14px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--color-primary-dark)', textTransform: 'uppercase' }}>
                {activeOrder.jenis_barang === 'paket_ekspedisi' ? '📦 PAKET EKSPEDISI' : '🛒 TITIP BELI'}
              </span>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: '700',
                  padding: '2px 8px',
                  borderRadius: '999px',
                  background: 'var(--color-primary)',
                  color: '#ffffff',
                }}
              >
                {activeOrder.status_pengiriman === 'diantar'
                  ? '🛵 Sedang Diantar'
                  : activeOrder.status_pengiriman === 'diterima_hub'
                  ? '🏢 Di Hub Kecamatan'
                  : '⏳ Menunggu di Hub'}
              </span>
            </div>

            <h3 style={{ fontSize: '16px', fontWeight: '800', margin: '6px 0 2px 0', color: 'var(--color-text-main)' }}>
              {activeOrder.nomor_resi ? `Resi: ${activeOrder.nomor_resi}` : activeOrder.deskripsi_barang}
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', margin: 0 }}>
              Tujuan: {activeOrder.alamat_tujuan}
            </p>
          </div>

          {/* Simulasi Peta Live Tracking Sederhana & Ringan */}
          <div
            style={{
              padding: '16px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-bg-base)',
              boxShadow: 'var(--skeuo-input-sunken)',
              textAlign: 'center',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', margin: '8px 0 14px 0' }}>
              <div>
                <div style={{ fontSize: '24px' }}>🏢</div>
                <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--color-text-dim)' }}>Hub Kecamatan</span>
              </div>
              <div style={{ flex: 1, height: '2px', background: 'var(--color-primary)', margin: '0 8px', position: 'relative' }}>
                <span
                  style={{
                    position: 'absolute',
                    top: '-12px',
                    left: activeOrder.status_pengiriman === 'diantar' ? '65%' : '20%',
                    fontSize: '16px',
                    transition: 'left 0.5s ease',
                  }}
                >
                  🛵
                </span>
              </div>
              <div>
                <div style={{ fontSize: '24px' }}>🏠</div>
                <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--color-primary-dark)' }}>Rumah Anda</span>
              </div>
            </div>

            <p style={{ fontSize: '12.5px', color: 'var(--color-text-main)', margin: '4px 0 12px 0', fontWeight: '600' }}>
              {activeOrder.status_pengiriman === 'diantar'
                ? '🛵 Kurir sedang membawa paket menuju ke alamat Anda!'
                : '🏢 Paket Anda sudah aman di hub kecamatan dan siap diantar kurir.'}
            </p>

            {profile?.latitude && profile?.longitude && (
              <a
                href={`https://www.google.com/maps?q=${profile.latitude},${profile.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 14px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--color-bg-card)',
                  border: '1px solid var(--color-border)',
                  fontSize: '12px',
                  fontWeight: '700',
                  color: 'var(--color-primary)',
                  textDecoration: 'none',
                }}
              >
                🗺️ Buka Rute Rumah di Google Maps
              </a>
            )}
          </div>
        </Card>
      ) : (
        /* Status Santai Jika Belum Ada Paket yang Sedang Diantar */
        <Card style={{ marginBottom: '16px', textAlign: 'center', padding: '24px 18px' }}>
          <div style={{ fontSize: '42px', marginBottom: '8px' }}>📦</div>
          <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--color-primary-dark)', margin: 0 }}>
            Tidak Ada Paket yang Sedang Berjalan
          </h3>
          <p style={{ fontSize: '12.5px', color: 'var(--color-text-muted)', marginTop: '6px', lineHeight: '1.5' }}>
            Sedang belanja online di Shopee, Tokopedia, atau TikTok Shop?
            Kirimkan nomor resinya melalui tombol <b>(+)</b> di bawah agar kami jemput ke hub kecamatan!
          </p>
        </Card>
      )}

      {/* 4. Jadwal Operasional Hub & Info Antaran Desa */}
      <div id="jadwal-antaran-section">
        <Card
          title="Jadwal Antaran Hub Kecamatan"
          subtitle="Waktu sortir dan keberangkatan kurir ke desa"
          style={{ marginBottom: '16px' }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '18px' }}>🕒</span>
              <div>
                <b>Sortir Paket Masuk:</b> Pukul 08.00 – 10.00 WIB
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '18px' }}>🛵</span>
              <div>
                <b>Keberangkatan Kurir:</b> Pagi (10.30 WIB) & Siang (14.30 WIB)
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '18px' }}>📍</span>
              <div>
                <b>Wilayah Layanan:</b> Menjangkau 11 Desa Se-Kecamatan Naringgul
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* 5. Informasi Biaya Paket & Ongkir (Disesuaikan oleh Kurir) */}
      <Card
        title="Informasi Biaya Paket & Ongkir"
        subtitle="Dikonfirmasi langsung oleh kurir lapangan"
        style={{ marginBottom: '16px' }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <p style={{ fontSize: '12.5px', color: 'var(--color-text-muted)', margin: 0, lineHeight: '1.5' }}>
            Biaya harga paket dan ongkir antaran ke pelosok dihitung dan disesuaikan langsung oleh kurir saat barang tiba atau diproses, sehingga lebih adil & transparan sesuai jarak desa.
          </p>

          {/* Kotak Contoh Perhitungan Nyata Sesuai Permintaan */}
          <div
            style={{
              padding: '14px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-bg-base)',
              boxShadow: 'var(--skeuo-input-sunken)',
              border: '1px solid rgba(82, 99, 90, 0.12)',
            }}
          >
            <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--color-primary-dark)', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.5px' }}>
              📋 Contoh Rincian Tagihan Kurir
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
              <span style={{ color: 'var(--color-text-muted)' }}>Jumlah Paket:</span>
              <span style={{ fontWeight: '700', color: 'var(--color-text-main)' }}>2 Paket</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
              <span style={{ color: 'var(--color-text-muted)' }}>Harga Barang (COD):</span>
              <span style={{ fontWeight: '700', color: 'var(--color-text-main)' }}>Rp 100.000</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '10px' }}>
              <span style={{ color: 'var(--color-text-muted)' }}>Ongkir Antaran Kurir:</span>
              <span style={{ fontWeight: '700', color: 'var(--color-primary)' }}>Rp 10.000</span>
            </div>

            <div
              style={{
                borderTop: '1px dashed var(--color-border)',
                paddingTop: '8px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span style={{ fontSize: '13px', fontWeight: '800', color: 'var(--color-text-main)' }}>Total Bayar di Tempat:</span>
              <span style={{ fontSize: '15px', fontWeight: '800', color: 'var(--color-primary-dark)' }}>Rp 110.000</span>
            </div>
          </div>
        </div>
      </Card>

      {/* 6. Floating Action Button (FAB) WhatsApp Admin Hub yang Mengambang Kekinian */}
      <a
        href="https://wa.me/6281234567890?text=Halo%20Admin%20Jastip%20Pelosok,%20saya%20mau%20tanya%20seputar%20paket"
        target="_blank"
        rel="noopener noreferrer"
        title="Chat WhatsApp Admin Hub"
        style={{
          position: 'fixed',
          bottom: '82px',
          right: '18px',
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '28px',
          boxShadow: '0 6px 20px rgba(37, 211, 102, 0.5), inset 0 1px 2px rgba(255,255,255,0.4)',
          border: '2px solid rgba(255, 255, 255, 0.4)',
          zIndex: 99,
          cursor: 'pointer',
          textDecoration: 'none',
          transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        }}
        onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.92)')}
        onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
      >
        💬
      </a>

      {/* Bottom Sheet: Form Lengkapi / Ubah Profil, Foto & Titik GPS */}
      <BottomSheet
        isOpen={profileSheetOpen}
        onClose={() => setProfileSheetOpen(false)}
        title={isProfileComplete ? 'Edit Profil & Alamat' : 'Lengkapi Data Customer'}
      >
        <div style={{ padding: '4px 0 20px 0' }}>
          <form onSubmit={handleSaveProfile}>
            {/* Foto Profil (Tampilan Bersih dengan Tombol "Ubah Foto Profil") */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                marginBottom: '18px',
                padding: '12px',
                background: 'var(--color-bg-base)',
                borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--skeuo-input-sunken)',
              }}
            >
              <div style={{ position: 'relative', width: '74px', height: '74px', marginBottom: '8px' }}>
                {fotoUrl ? (
                  <img
                    src={fotoUrl}
                    alt="Preview Foto"
                    style={{
                      width: '100%',
                      height: '100%',
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: '3px solid var(--color-primary)',
                      boxShadow: 'var(--skeuo-button-raised)',
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: '100%',
                      height: '100%',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, var(--color-primary-light) 0%, var(--color-primary) 100%)',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '26px',
                      fontWeight: '800',
                      boxShadow: 'var(--skeuo-button-raised)',
                    }}
                  >
                    {name ? name.charAt(0).toUpperCase() : '👤'}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  title="Pilih Foto Baru"
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    right: 0,
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: 'var(--color-primary)',
                    color: '#ffffff',
                    border: '2px solid #ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    fontSize: '13px',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                  }}
                >
                  📷
                </button>
              </div>

              {/* Input File Tersembunyi */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFotoChange}
                style={{ display: 'none' }}
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={compressingFoto}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-primary)',
                  fontSize: '13px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  marginTop: '2px',
                }}
              >
                {compressingFoto ? 'Memproses foto...' : 'Ubah Foto Profil'}
              </button>
            </div>

            {/* Data Akun */}
            <Input
              label="Nama Lengkap"
              placeholder="Contoh: Ramon"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />

            <Input
              label="Nomor WhatsApp / HP Aktif"
              type="tel"
              placeholder="Contoh: 081234567890"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              helperText="Wajib aktif untuk konfirmasi kurir saat barang tiba"
              required
            />

            <Select
              label="Pilih Desa Tempat Tinggal"
              placeholder="-- Pilih Salah Satu dari 11 Desa --"
              required
              value={selectedDesaId}
              onChange={(e) => setSelectedDesaId(e.target.value)}
              options={desaList.map((d) => ({
                value: d.id,
                label: `Desa ${d.nama_desa}`,
              }))}
            />

            <Input
              label="Nama Kampung / Dusun / Jalan"
              placeholder="Contoh: Kp. Cibeet"
              value={kampung}
              onChange={(e) => setKampung(e.target.value)}
              required
            />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <Input
                label="RT"
                placeholder="Misal: 01"
                value={rt}
                onChange={(e) => setRt(e.target.value)}
                required
              />

              <Input
                label="RW"
                placeholder="Misal: 03"
                value={rw}
                onChange={(e) => setRw(e.target.value)}
                required
              />
            </div>

            {/* Titik Koordinat GPS Rumah untuk Kurir */}
            <div
              style={{
                marginTop: '14px',
                marginBottom: '14px',
                padding: '14px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--color-bg-base)',
                border: '1px solid var(--color-border)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--color-primary-dark)' }}>
                  📍 TITIK KOORDINAT GPS RUMAH
                </span>
                {latitude && longitude && (
                  <span style={{ fontSize: '11px', color: '#16a34a', fontWeight: '700' }}>
                    ✓ Terkunci
                  </span>
                )}
              </div>

              <p style={{ fontSize: '11.5px', color: 'var(--color-text-muted)', margin: '0 0 10px 0', lineHeight: '1.4' }}>
                Kurir akan memakai titik ini untuk navigasi Google Maps langsung ke rumah Anda di pelosok.
              </p>

              <Button
                type="button"
                variant="outline"
                size="sm"
                loading={fetchingGps}
                onClick={handleGetGpsLocation}
                style={{ width: '100%', marginBottom: '8px' }}
              >
                📍 Ambil Titik Rumah Saya Saat Ini (GPS HP)
              </Button>

              <div style={{ textAlign: 'center', margin: '4px 0 8px 0' }}>
                <button
                  type="button"
                  onClick={() => setManualCoordMode(!manualCoordMode)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--color-primary)',
                    fontSize: '11.5px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                  }}
                >
                  {manualCoordMode ? '▲ Tutup Pengaturan Manual' : '▼ Sedang di luar rumah? Atur titik manual di sini'}
                </button>
              </div>

              {manualCoordMode && (
                <div
                  style={{
                    marginTop: '8px',
                    padding: '12px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--color-bg-card)',
                    border: '1px dashed var(--color-border)',
                  }}
                >
                  <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--color-text-main)', display: 'block', marginBottom: '4px' }}>
                    Tempel Link / Koordinat Google Maps:
                  </span>
                  <input
                    type="text"
                    placeholder="Contoh: -7.4523, 107.5123 atau link Google Maps"
                    value={pastedMapText}
                    onChange={(e) => handleParseMapText(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--color-border)',
                      fontSize: '12px',
                      marginBottom: '8px',
                      background: 'var(--color-bg-base)',
                      color: 'var(--color-text-main)',
                      outline: 'none',
                    }}
                  />

                  {/* Feedback Status Deteksi Link / Koordinat */}
                  {mapParseStatus === 'success' && latitude && longitude && (
                    <div
                      style={{
                        padding: '8px 10px',
                        borderRadius: 'var(--radius-sm)',
                        background: 'rgba(22, 163, 74, 0.1)',
                        border: '1px solid rgba(22, 163, 74, 0.3)',
                        color: '#15803d',
                        fontSize: '11.5px',
                        fontWeight: '700',
                        marginBottom: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <span>✅</span>
                      <span>Koordinat berhasil dikunci: <b>{Number(latitude).toFixed(5)}, {Number(longitude).toFixed(5)}</b></span>
                    </div>
                  )}

                  {mapParseStatus === 'shortlink' && (
                    <div
                      style={{
                        padding: '10px 12px',
                        borderRadius: 'var(--radius-sm)',
                        background: 'rgba(245, 158, 11, 0.12)',
                        border: '1px solid rgba(245, 158, 11, 0.4)',
                        color: '#b45309',
                        fontSize: '11.5px',
                        lineHeight: '1.45',
                        marginBottom: '10px',
                      }}
                    >
                      <div style={{ fontWeight: '800', display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '4px' }}>
                        <span>⚠️</span> Link Singkatan (maps.app.goo.gl)
                      </div>
                      <p style={{ margin: '0 0 6px 0', fontSize: '11px' }}>
                        Link singkatan dari Google Maps tidak memuat angka koordinat di dalam tautannya, sehingga tidak bisa dibaca langsung.
                      </p>
                      <div style={{ padding: '6px 8px', background: 'rgba(255, 255, 255, 0.8)', borderRadius: '6px', color: '#78350f', fontSize: '11px' }}>
                        <b>Cara cepat salin koordinat:</b><br />
                        1. Buka titik rumah Anda di Google Maps.<br />
                        2. <b>Tekan lama (2 detik)</b> di atap rumah sampai muncul pin merah 📍.<br />
                        3. Di kotak pencarian atas akan muncul angka (contoh: <code>-7.4812, 107.5312</code>).<br />
                        4. Salin angka tersebut dan tempel di sini, atau isi pada kotak di bawah.
                      </div>
                    </div>
                  )}

                  {mapParseStatus === 'error' && (
                    <div
                      style={{
                        padding: '8px 10px',
                        borderRadius: 'var(--radius-sm)',
                        background: 'rgba(239, 68, 68, 0.08)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        color: '#b91c1c',
                        fontSize: '11px',
                        marginBottom: '10px',
                      }}
                    >
                      ⚠️ Angka koordinat tidak ditemukan dalam teks yang Anda tempel. Masukkan angka langsung seperti <code>-7.4812, 107.5312</code> atau gunakan tombol <b>Ambil Titik Rumah</b> di atas.
                    </div>
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div>
                      <span style={{ fontSize: '10.5px', fontWeight: '600', color: 'var(--color-text-dim)' }}>Latitude:</span>
                      <input
                        type="text"
                        placeholder="-7.xxxxx"
                        value={latitude || ''}
                        onChange={(e) => {
                          setLatitude(e.target.value);
                          if (e.target.value && longitude) setMapParseStatus('success');
                        }}
                        style={{
                          width: '100%',
                          padding: '6px 8px',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--color-border)',
                          fontSize: '12px',
                          background: 'var(--color-bg-base)',
                          color: 'var(--color-text-main)',
                        }}
                      />
                    </div>
                    <div>
                      <span style={{ fontSize: '10.5px', fontWeight: '600', color: 'var(--color-text-dim)' }}>Longitude:</span>
                      <input
                        type="text"
                        placeholder="107.xxxxx"
                        value={longitude || ''}
                        onChange={(e) => {
                          setLongitude(e.target.value);
                          if (latitude && e.target.value) setMapParseStatus('success');
                        }}
                        style={{
                          width: '100%',
                          padding: '6px 8px',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--color-border)',
                          fontSize: '12px',
                          background: 'var(--color-bg-base)',
                          color: 'var(--color-text-main)',
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ marginTop: '8px', fontSize: '10.5px', color: 'var(--color-text-muted)' }}>
                    💡 <b>Tips:</b> Buka Google Maps di HP, tekan lama di titik atap rumah Anda, salin angka koordinatnya lalu tempelkan di sini.
                  </div>
                </div>
              )}

              {latitude && longitude && !isNaN(parseFloat(latitude)) && !isNaN(parseFloat(longitude)) ? (
                <div style={{ fontSize: '12px', color: 'var(--color-text-main)', marginTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>📍 {parseFloat(latitude).toFixed(5)}, {parseFloat(longitude).toFixed(5)}</span>
                  <a
                    href={`https://www.google.com/maps?q=${latitude},${longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: 'var(--color-primary)', fontWeight: '700', textDecoration: 'underline' }}
                  >
                    Buka di Maps ↗
                  </a>
                </div>
              ) : (
                <span style={{ fontSize: '11px', color: '#f59e0b', display: 'block', marginTop: '6px' }}>
                  *Titik koordinat belum ditentukan (opsional tapi sangat membantu kurir)
                </span>
              )}
            </div>

            <Input
              label="Catatan / Patokan Lokasi (Opsional)"
              placeholder="Contoh: Dekat sekolah MI / samping pos ronda"
              value={patokan}
              onChange={(e) => setPatokan(e.target.value)}
              helperText="Membantu kurir jika sinyal GPS sempat hilang di pedalaman"
            />

            <div style={{ marginTop: '20px' }}>
              <Button type="submit" loading={savingProfile}>
                Simpan & Konfirmasi Data
              </Button>
            </div>
          </form>
        </div>
      </BottomSheet>

      {/* Drawer Sidebar Menu Kanan (Pengaturan Murni & Logout) */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onOpenAddressModal={() => setProfileSheetOpen(true)}
        onTriggerLogout={() => setLogoutSheetOpen(true)}
      />

      {/* Confirmation Sheet Logout */}
      <ConfirmationSheet
        isOpen={logoutSheetOpen}
        onClose={() => setLogoutSheetOpen(false)}
        onConfirm={handleLogout}
        title="Konfirmasi Keluar"
        message="Apakah Anda yakin ingin keluar dari akun Jastip Pelosok?"
        confirmText="Ya, Keluar"
        confirmVariant="danger"
      />

      {/* General Notification Sheet */}
      <BottomSheet isOpen={noticeSheetOpen} onClose={() => setNoticeSheetOpen(false)} title="Informasi">
        <div style={{ textAlign: 'center', padding: '10px 0 16px 0' }}>
          <div style={{ fontSize: '36px', marginBottom: '8px' }}>ℹ️</div>
          <p style={{ fontSize: '14px', color: 'var(--color-text-main)', lineHeight: '1.5' }}>
            {noticeMessage}
          </p>
          <div style={{ marginTop: '18px' }}>
            <Button variant="outline" onClick={() => setNoticeSheetOpen(false)}>
              Tutup
            </Button>
          </div>
        </div>
      </BottomSheet>

      {/* Bottom Navigation */}
      <BottomNav role="customer" />
    </div>
  );
}
