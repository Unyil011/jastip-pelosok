import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import { useAuth } from '../hooks/useAuth';
import { authService } from '../services/authService';
import { orderService } from '../services/orderService';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Input from '../components/Input';
import Button from '../components/Button';
import BottomNav from '../components/BottomNav';
import BottomSheet from '../components/BottomSheet';
import ConfirmationSheet from '../components/ConfirmationSheet';
import SkeletonLoader from '../components/SkeletonLoader';
import DeliveryMap from '../components/DeliveryMap';
import {
  formatRupiah,
  getDeliveryStatusMeta,
  isDateToday,
  isDateYesterday,
  formatDateIndonesia,
} from '../utils/formatters';

export default function DashboardKurir() {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile } = useAuth();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Scanner Kurir State (Barcode Kamera HP & Input Manual Resi)
  const [scannerOpen, setScannerOpen] = useState(false);
  const [isScanningCamera, setIsScanningCamera] = useState(false);
  const [scannedResiInput, setScannedResiInput] = useState('');
  const [scanResultOrder, setScanResultOrder] = useState(null);
  const [scanStatus, setScanStatus] = useState(null); // null | 'matched' | 'not_assigned' | 'not_found' | 'loading'
  const [scanTargetDesa, setScanTargetDesa] = useState('');
  const kurirScannerRef = useRef(null);

  // Logout State
  const [logoutSheetOpen, setLogoutSheetOpen] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);

  const handleLogout = async () => {
    setLogoutLoading(true);
    try {
      await authService.logout();
      navigate('/login');
    } catch (err) {
      console.error('Gagal keluar:', err);
    } finally {
      setLogoutLoading(false);
    }
  };

  // Filter & Pencarian dengan Persistence (Posisi tetap sama setelah refresh)
  const [dateFilter, setDateFilter] = useState(() => {
    return sessionStorage.getItem('kurir_date_filter') || 'hari_ini';
  });
  const [statusFilter, setStatusFilter] = useState(() => {
    return sessionStorage.getItem('kurir_status_filter') || 'semua';
  });
  const [searchQuery, setSearchQuery] = useState(() => {
    return sessionStorage.getItem('kurir_search_query') || '';
  });

  // Simpan otomatis filter kurir ke sessionStorage
  useEffect(() => {
    sessionStorage.setItem('kurir_date_filter', dateFilter);
  }, [dateFilter]);

  useEffect(() => {
    sessionStorage.setItem('kurir_status_filter', statusFilter);
  }, [statusFilter]);

  useEffect(() => {
    sessionStorage.setItem('kurir_search_query', searchQuery);
  }, [searchQuery]);

  // BottomSheet State untuk aksi status
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [codAmount, setCodAmount] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [confirmMulaiSheet, setConfirmMulaiSheet] = useState(false);
  const [selesaiSheetOpen, setSelesaiSheetOpen] = useState(false);

  // BottomSheet Retur Paket
  const [returSheetOpen, setReturSheetOpen] = useState(false);
  const [returAlasan, setReturAlasan] = useState('Penerima Menolak Bayar / Batal');
  const [returCatatan, setReturCatatan] = useState('');
  const [returOngkir, setReturOngkir] = useState('');

  // Feedback Notification Sheet
  const [feedbackSheet, setFeedbackSheet] = useState({ open: false, title: '', message: '' });

  // Peta & GPS Tracking Kurir Realtime (Persisted state)
  const [courierLocation, setCourierLocation] = useState(null);
  const [trackingGps, setTrackingGps] = useState(false);
  const [showMap, setShowMap] = useState(() => {
    const saved = sessionStorage.getItem('kurir_show_map');
    return saved !== null ? saved === 'true' : true;
  });

  useEffect(() => {
    sessionStorage.setItem('kurir_show_map', String(showMap));
  }, [showMap]);
  const watchIdRef = useRef(null);

  // Toggle GPS Tracker
  const toggleGpsTracking = () => {
    if (trackingGps) {
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      setTrackingGps(false);
      setCourierLocation(null);
    } else {
      if (!navigator.geolocation) {
        setFeedbackSheet({
          open: true,
          title: 'GPS Tidak Didukung',
          message: 'Browser HP Anda tidak mendukung deteksi lokasi GPS.',
        });
        return;
      }

      setTrackingGps(true);
      const id = navigator.geolocation.watchPosition(
        (pos) => {
          setCourierLocation([pos.coords.latitude, pos.coords.longitude]);
        },
        (err) => {
          console.error('Gagal membaca GPS kurir:', err);
          setTrackingGps(false);
        },
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 12000 }
      );
      watchIdRef.current = id;
    }
  };

  useEffect(() => {
    return () => {
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  // Fetch Order Kurir
  const loadKurirOrders = async () => {
    setLoading(true);
    try {
      const data = await orderService.getOrdersForKurir(profile);
      setOrders(data);
    } catch (err) {
      console.error('Gagal memuat order kurir:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadKurirOrders();
  }, [profile?.id, profile?.alamat]);

  // Helper memutar suara "Tiit" scanner kasir/kurir lantang & getar haptic HP saat resi sukses di-scan
  const playScanBeep = () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        if (ctx.state === 'suspended') {
          ctx.resume();
        }
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        // Nada Tiit frekuensi 2100Hz yang sangat jernih dan nyaring (khas scanner barcode supermarket & kurir J&T/Shopee)
        osc.type = 'sine';
        osc.frequency.setValueAtTime(2100, ctx.currentTime);

        // Volume maksimal dan jelas: 0.85
        gain.gain.setValueAtTime(0.85, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.18);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start();
        osc.stop(ctx.currentTime + 0.18);
      }
      if (navigator.vibrate) {
        navigator.vibrate([150, 50, 150]);
      }
    } catch (e) {
      console.warn('Audio beep error:', e);
    }
  };

  // Pantau URL query params (misal klik tab Scan Resi di BottomNav)
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    if (searchParams.get('tab') === 'scan') {
      setScannerOpen(true);
    }
    if (searchParams.get('status')) {
      setStatusFilter(searchParams.get('status'));
    }
  }, [location.search]);

  // Otomatis langsung buka kamera saat scanner modal terbuka
  useEffect(() => {
    if (scannerOpen) {
      const timer = setTimeout(() => {
        startKurirCamera();
      }, 350);
      return () => clearTimeout(timer);
    } else {
      stopKurirCamera();
    }
  }, [scannerOpen]);

  // Real-time Event Listener saat ada order baru dibuat oleh customer
  useEffect(() => {
    const handleOrderEvent = () => {
      loadKurirOrders();
    };

    window.addEventListener('jastip:orderCreated', handleOrderEvent);
    const handleStorage = (e) => {
      if (e.key === 'jastip_last_order_event') {
        loadKurirOrders();
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('jastip:orderCreated', handleOrderEvent);
      window.removeEventListener('storage', handleStorage);
    };
  }, [profile?.id, profile?.alamat]);

  // ---------------------------------------------------------
  // SCANNER RESI CONTROLS UNTUK KURIR
  // ---------------------------------------------------------
  const startKurirCamera = async () => {
    setIsScanningCamera(true);
    setScanResultOrder(null);
    setScanStatus('loading');

    try {
      const scanner = new Html5Qrcode('kurir-camera-stream');
      kurirScannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 180 },
        },
        async (decodedText) => {
          playScanBeep();
          stopKurirCamera();
          setScannedResiInput(decodedText);
          handleProcessKurirScan(decodedText);
        },
        () => {}
      );
      setScanStatus(null);
    } catch (err) {
      console.error('Kamera kurir error:', err);
      setIsScanningCamera(false);
      setScanStatus(null);
      setFeedbackSheet({
        open: true,
        title: 'Izin Kamera Diperlukan',
        message: 'Tidak dapat mengakses kamera HP. Silakan izinkan kamera di browser atau gunakan input manual nomor resi.',
      });
    }
  };

  const stopKurirCamera = async () => {
    if (kurirScannerRef.current) {
      try {
        await kurirScannerRef.current.stop();
        kurirScannerRef.current.clear();
      } catch (e) {
        console.error(e);
      }
      kurirScannerRef.current = null;
    }
    setIsScanningCamera(false);
  };

  const handleCloseScanner = () => {
    stopKurirCamera();
    setScannerOpen(false);
    setScanStatus(null);
    setScanResultOrder(null);
    setScannedResiInput('');
    if (location.search.includes('tab=scan')) {
      navigate('/dashboard-kurir', { replace: true });
    }
  };

  // Cek apakah desa order masuk wilayah tugas kurir
  const checkKurirVillageMatch = (order, kurirProfile) => {
    const wilayah = kurirProfile?.alamat;
    if (!wilayah || wilayah === 'Semua Desa' || wilayah.toLowerCase().includes('semua')) {
      return { isMatched: true, desaTujuan: 'Semua Desa (Wilayah Bebas)' };
    }

    const assignedDesas = wilayah
      .split(',')
      .map((d) => d.trim().toLowerCase())
      .filter(Boolean);

    const alamatLower = (order.alamat_tujuan || '').toLowerCase();
    const descLower = (order.deskripsi_barang || '').toLowerCase();

    // Deteksi desa dari alamat order
    let detectedDesa = '';
    const match = assignedDesas.find((desa) => {
      if (alamatLower.includes(desa) || descLower.includes(desa)) {
        detectedDesa = desa;
        return true;
      }
      return false;
    });

    if (match) {
      return { isMatched: true, desaTujuan: detectedDesa };
    }

    // Jika tidak cocok, ekstrak nama desa dari alamat_tujuan jika ada (misal: "Desa Mekarsari")
    const desaMatch = (order.alamat_tujuan || '').match(/Desa\s+([A-Za-z]+)/i);
    const targetDesa = desaMatch ? desaMatch[1] : 'Pelosok Lain';

    return { isMatched: false, desaTujuan: targetDesa };
  };

  // Proses scan atau pencarian resi
  const handleProcessKurirScan = async (resiText) => {
    const clean = resiText?.trim();
    if (!clean) return;

    setScanStatus('loading');
    setScanResultOrder(null);

    try {
      const order = await orderService.findOrderByResi(clean);
      if (!order) {
        setScanStatus('not_found');
        return;
      }

      playScanBeep();
      const { isMatched, desaTujuan } = checkKurirVillageMatch(order, profile);
      setScanTargetDesa(desaTujuan);
      setScanResultOrder(order);

      if (isMatched) {
        setScanStatus('matched');
      } else {
        setScanStatus('not_assigned');
      }
    } catch (err) {
      console.error('Scan kurir error:', err);
      setScanStatus('not_found');
    }
  };

  // Kurir ambil & bawa paket dari hasil scan
  const handleKurirAmbilPaketDariScan = async (orderId) => {
    if (!orderId) return;
    setActionLoading(true);
    try {
      await orderService.updateDeliveryStatus(orderId, 'dalam_perjalanan', {
        kurir_id: profile.id,
        status_konfirmasi: 'dikonfirmasi',
      });
      await loadKurirOrders();
      setFeedbackSheet({
        open: true,
        title: 'Paket Berhasil Diambil! 🛵',
        message: 'Paket ini resmi Anda bawa ke rute pelosok desa. Status berubah jadi "Dalam Perjalanan".',
      });
      handleCloseScanner();
    } catch (err) {
      setFeedbackSheet({
        open: true,
        title: 'Gagal Ambil Paket',
        message: err.message,
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Filter Data berdasarkan Tanggal (Hari Ini, Kemarin, Semua)
  const ordersInDateRange = useMemo(() => {
    return orders.filter((order) => {
      const timestamp = order.updated_at || order.created_at;
      if (dateFilter === 'hari_ini') {
        return isDateToday(timestamp) || isDateToday(order.created_at);
      }
      if (dateFilter === 'kemarin') {
        return isDateYesterday(timestamp) || isDateYesterday(order.created_at);
      }
      return true;
    });
  }, [orders, dateFilter]);

  // Metrik Statistik Harian (Berdasarkan filter tanggal aktif)
  const stats = useMemo(() => {
    const list = ordersInDateRange;
    const total = list.length;
    const terkirim = list.filter((o) => o.status_pengiriman === 'terkirim').length;
    const otw = list.filter((o) => o.status_pengiriman === 'dalam_perjalanan').length;
    const siapAntar = list.filter((o) => o.status_pengiriman === 'diterima_hub').length;
    const retur = list.filter((o) => o.status_pengiriman === 'retur').length;

    // Total Kas Ongkir Masuk:
    // Ongkir dari paket terkirim + ongkir dari paket retur (karena kurir tetap menerima ongkir atas jerih payah rute)
    const totalOngkirKas = list.reduce((acc, curr) => {
      if (curr.status_pengiriman === 'terkirim' || curr.status_pengiriman === 'retur') {
        return acc + (parseFloat(curr.ongkir_diterima) || parseFloat(curr.ongkir_patokan) || 0);
      }
      return acc;
    }, 0);

    return { total, terkirim, otw, siapAntar, retur, totalOngkirKas };
  }, [ordersInDateRange]);

  // Filter Data Akhir (Tanggal + Status Tab + Search Query)
  const filteredOrders = useMemo(() => {
    return ordersInDateRange.filter((order) => {
      // 1. Filter Status
      if (statusFilter !== 'semua' && order.status_pengiriman !== statusFilter) {
        return false;
      }

      // 2. Filter Search
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const nama = (order.customer?.nama || '').toLowerCase();
        const resi = (order.nomor_resi || '').toLowerCase();
        const alamat = (order.alamat_tujuan || '').toLowerCase();
        const deskripsi = (order.deskripsi_barang || '').toLowerCase();

        return (
          nama.includes(query) ||
          resi.includes(query) ||
          alamat.includes(query) ||
          deskripsi.includes(query)
        );
      }

      return true;
    });
  }, [ordersInDateRange, statusFilter, searchQuery]);

  // Aksi: Mulai Antar (status -> dalam_perjalanan)
  const handleMulaiAntar = async () => {
    if (!selectedOrder) return;
    setActionLoading(true);
    try {
      await orderService.updateDeliveryStatus(selectedOrder.id, 'dalam_perjalanan', {
        kurir_id: profile.id,
      });
      setConfirmMulaiSheet(false);
      setSelectedOrder(null);
      await loadKurirOrders();
      setFeedbackSheet({
        open: true,
        title: 'Pengantaran Dimulai 🚀',
        message: 'Status paket diubah menjadi "Dalam Perjalanan". Hati-hati di jalan pelosok!',
      });
    } catch (err) {
      setFeedbackSheet({
        open: true,
        title: 'Gagal',
        message: err.message || 'Gagal mengubah status order.',
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Aksi: Sampai Tujuan (status -> terkirim)
  const handleSampaiTujuan = async () => {
    if (!selectedOrder) return;

    // Jika COD, wajib input ongkir_diterima
    if (selectedOrder.metode_pembayaran === 'COD') {
      const amount = parseFloat(codAmount);
      if (isNaN(amount) || amount < 0) {
        setFeedbackSheet({
          open: true,
          title: 'Input Tidak Valid',
          message: 'Harap masukkan nominal ongkir yang diterima dari customer.',
        });
        return;
      }
    }

    setActionLoading(true);
    try {
      const extra = {
        kurir_id: profile.id,
      };

      if (selectedOrder.metode_pembayaran === 'COD') {
        extra.ongkir_diterima = parseFloat(codAmount);
        extra.status_pembayaran = 'lunas';
      }

      await orderService.updateDeliveryStatus(selectedOrder.id, 'terkirim', extra);
      setSelesaiSheetOpen(false);
      setSelectedOrder(null);
      setCodAmount('');
      await loadKurirOrders();
      setFeedbackSheet({
        open: true,
        title: 'Paket Berhasil Dikirim! 🎉',
        message: 'Order telah selesai dan status diupdate menjadi "Terkirim".',
      });
    } catch (err) {
      setFeedbackSheet({
        open: true,
        title: 'Gagal',
        message: err.message || 'Gagal menyelesaikan pengiriman.',
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Aksi: Proses Retur Paket (Kasus Barang Diretur)
  const handleProsesRetur = async () => {
    if (!selectedOrder) return;

    const nominalOngkir = parseFloat(returOngkir);
    if (isNaN(nominalOngkir) || nominalOngkir < 0) {
      setFeedbackSheet({
        open: true,
        title: 'Input Tidak Valid',
        message: 'Harap masukkan nominal ongkir yang diterima (isi 0 bila ditagihkan ke pengirim).',
      });
      return;
    }

    setActionLoading(true);
    try {
      await orderService.processReturnOrder(selectedOrder.id, {
        kurirId: profile?.id,
        alasanRetur,
        catatanRetur,
        ongkirDiterima: nominalOngkir,
        currentDeskripsi: selectedOrder.deskripsi_barang,
      });

      setReturSheetOpen(false);
      setSelectedOrder(null);
      setReturAlasan('Penerima Menolak Bayar / Batal');
      setReturCatatan('');
      setReturOngkir('');
      await loadKurirOrders();
      setFeedbackSheet({
        open: true,
        title: 'Paket Berhasil Diretur ↩️',
        message: `Status diubah menjadi "Diretur". Nilai harga barang COD dibatalkan, dan kompensasi ongkir kurir sebesar Rp ${nominalOngkir.toLocaleString(
          'id-ID'
        )} telah tercatat.`,
      });
    } catch (err) {
      setFeedbackSheet({
        open: true,
        title: 'Gagal Memproses Retur',
        message: err.message || 'Gagal memproses pengembalian paket.',
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Buka Sheet Retur dengan prefill ongkir
  const openReturDialog = (order) => {
    setSelectedOrder(order);
    setReturOngkir(order.ongkir_patokan > 0 ? String(order.ongkir_patokan) : '0');
    setReturAlasan('Penerima Menolak Bayar / Batal');
    setReturCatatan('');
    setReturSheetOpen(true);
  };

  return (
    <div className="app-container" style={{ paddingBottom: '90px' }}>
      {/* Kurir Header Banner */}
      <Card
        style={{
          background: 'linear-gradient(135deg, #1f94c4 0%, #10597a 100%)',
          color: '#ffffff',
          border: '1px solid rgba(255, 255, 255, 0.25)',
          padding: '16px 18px',
          marginBottom: '14px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', opacity: 0.9 }}>
              Mitra Kurir Lapangan 🛵
            </span>
            <h2 style={{ fontSize: '18px', fontWeight: '800', margin: '2px 0 0 0' }}>
              {profile?.nama || 'Kurir Pelosok'}
            </h2>
            <div style={{ display: 'flex', gap: '8px', fontSize: '12px', opacity: 0.9, marginTop: '3px', flexWrap: 'wrap' }}>
              <span>📍 Wilayah Antaran: <b>{profile?.alamat || 'Semua Desa (Default)'}</b></span>
              <span>•</span>
              <span>DANA: <b>{profile?.nomor_dana || '-'}</b></span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-end' }}>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                onClick={loadKurirOrders}
                style={{
                  background: 'rgba(255, 255, 255, 0.2)',
                  border: '1px solid rgba(255, 255, 255, 0.4)',
                  borderRadius: 'var(--radius-md)',
                  color: '#ffffff',
                  padding: '5px 10px',
                  fontSize: '11.5px',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                🔄 Refresh
              </button>
              <button
                onClick={() => setLogoutSheetOpen(true)}
                style={{
                  background: 'rgba(239, 68, 68, 0.4)',
                  border: '1px solid rgba(255, 255, 255, 0.5)',
                  borderRadius: 'var(--radius-md)',
                  color: '#ffffff',
                  padding: '5px 8px',
                  fontSize: '11.5px',
                  fontWeight: '700',
                  cursor: 'pointer',
                }}
              >
                🚪 Keluar
              </button>
            </div>
            <button
              onClick={toggleGpsTracking}
              style={{
                background: trackingGps ? '#16a34a' : 'rgba(0,0,0,0.3)',
                border: trackingGps ? '1px solid #4ade80' : '1px solid rgba(255,255,255,0.3)',
                borderRadius: 'var(--radius-md)',
                color: '#ffffff',
                padding: '5px 9px',
                fontSize: '11px',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <span>{trackingGps ? '🟢' : '📍'}</span>
              <span>{trackingGps ? 'GPS Aktif' : 'Nyalakan GPS'}</span>
            </button>
          </div>
        </div>
      </Card>

      {/* Ringkasan Performa & Kas Harian (Daily Metrics Card) */}
      <Card
        padding="14px 16px"
        style={{
          background: 'var(--color-bg-card)',
          border: '1px solid var(--color-border)',
          marginBottom: '14px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '15px' }}>📊</span>
            <h3 style={{ fontSize: '14px', fontWeight: '800', color: 'var(--color-text-main)', margin: 0 }}>
              Ringkasan Antaran & Kas
            </h3>
          </div>

          {/* Toggle Filter Waktu */}
          <div
            style={{
              display: 'flex',
              background: 'var(--color-bg-input)',
              padding: '2px',
              borderRadius: '8px',
              border: '1px solid var(--color-border)',
            }}
          >
            {[
              { id: 'hari_ini', label: 'Hari Ini' },
              { id: 'kemarin', label: 'Kemarin' },
              { id: 'semua', label: 'Semua' },
            ].map((btn) => (
              <button
                key={btn.id}
                onClick={() => setDateFilter(btn.id)}
                style={{
                  background: dateFilter === btn.id ? 'var(--color-primary)' : 'transparent',
                  color: dateFilter === btn.id ? '#ffffff' : 'var(--color-text-muted)',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '3px 8px',
                  fontSize: '11px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>

        {/* 4 Kotak Metrik Ringkasan */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '10px' }}>
          <div
            style={{
              background: 'var(--color-bg-input)',
              padding: '8px 6px',
              borderRadius: '8px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '11px', color: 'var(--color-text-dim)', fontWeight: '600' }}>Total</div>
            <div style={{ fontSize: '18px', fontWeight: '800', color: 'var(--color-text-main)', marginTop: '2px' }}>
              {stats.total}
            </div>
          </div>

          <div
            style={{
              background: '#ecfdf5',
              border: '1px solid #a7f3d0',
              padding: '8px 6px',
              borderRadius: '8px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '11px', color: '#047857', fontWeight: '600' }}>Terkirim</div>
            <div style={{ fontSize: '18px', fontWeight: '800', color: '#065f46', marginTop: '2px' }}>
              {stats.terkirim}
            </div>
          </div>

          <div
            style={{
              background: '#eff6ff',
              border: '1px solid #bfdbfe',
              padding: '8px 6px',
              borderRadius: '8px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '11px', color: '#1d4ed8', fontWeight: '600' }}>Diantar</div>
            <div style={{ fontSize: '18px', fontWeight: '800', color: '#1e40af', marginTop: '2px' }}>
              {stats.otw}
            </div>
          </div>

          <div
            style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              padding: '8px 6px',
              borderRadius: '8px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '11px', color: '#b91c1c', fontWeight: '600' }}>Retur</div>
            <div style={{ fontSize: '18px', fontWeight: '800', color: '#991b1b', marginTop: '2px' }}>
              {stats.retur}
            </div>
          </div>
        </div>

        {/* Kas Ongkir yang Diterima Kurir (Solusi Hak Ongkir Kurir) */}
        <div
          style={{
            background: 'linear-gradient(90deg, #f0fdf4 0%, #e0f2fe 100%)',
            border: '1px solid #86efac',
            borderRadius: '8px',
            padding: '8px 12px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '12px',
          }}
        >
          <div>
            <span style={{ fontWeight: '700', color: '#166534' }}>💵 Kas Ongkir Terkumpul:</span>
            <div style={{ fontSize: '10.5px', color: '#15803d' }}>
              (Termasuk ongkir dari paket terkirim & retur)
            </div>
          </div>
          <div style={{ fontSize: '15px', fontWeight: '900', color: '#166534' }}>
            {formatRupiah(stats.totalOngkirKas)}
          </div>
        </div>
      </Card>

      {/* Filter Tabs & Search Bar */}
      <div style={{ marginBottom: '12px' }}>
        {/* Search Bar Input */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <input
              type="text"
              placeholder="Cari nama penerima, resi, alamat..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px 8px 32px',
                borderRadius: '20px',
                border: '1px solid var(--color-border)',
                background: 'var(--color-bg-card)',
                color: 'var(--color-text-main)',
                fontSize: '12.5px',
                outline: 'none',
                boxShadow: 'var(--skeuo-input-sunken)',
              }}
            />
            <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5, fontSize: '13px' }}>
              🔍
            </span>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--color-text-muted)',
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                ✕
              </button>
            )}
          </div>

          {/* Toggle Buka/Tutup Peta */}
          <button
            onClick={() => setShowMap(!showMap)}
            style={{
              background: showMap ? 'var(--color-primary)' : 'var(--color-bg-card)',
              color: showMap ? '#ffffff' : 'var(--color-text-main)',
              border: '1px solid var(--color-border)',
              padding: '6px 12px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              whiteSpace: 'nowrap',
            }}
          >
            <span>🗺️</span>
            <span>{showMap ? 'Tutup Peta' : 'Peta'}</span>
          </button>
        </div>

        {/* Status Filter Chips */}
        <div
          style={{
            display: 'flex',
            gap: '6px',
            overflowX: 'auto',
            paddingBottom: '4px',
            scrollbarWidth: 'none',
          }}
        >
          {[
            { id: 'semua', label: 'Semua', count: stats.total },
            { id: 'diterima_hub', label: 'Siap Antar', count: stats.siapAntar },
            { id: 'dalam_perjalanan', label: 'Di Jalan', count: stats.otw },
            { id: 'terkirim', label: 'Terkirim', count: stats.terkirim },
            { id: 'retur', label: 'Retur', count: stats.retur },
          ].map((chip) => {
            const isActive = statusFilter === chip.id;
            return (
              <button
                key={chip.id}
                onClick={() => setStatusFilter(chip.id)}
                style={{
                  background: isActive ? 'var(--color-text-main)' : 'var(--color-bg-card)',
                  color: isActive ? '#ffffff' : 'var(--color-text-main)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '16px',
                  padding: '4px 10px',
                  fontSize: '11.5px',
                  fontWeight: '700',
                  whiteSpace: 'nowrap',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <span>{chip.label}</span>
                <span
                  style={{
                    background: isActive ? 'rgba(255,255,255,0.25)' : 'var(--color-bg-input)',
                    color: isActive ? '#ffffff' : 'var(--color-text-dim)',
                    borderRadius: '10px',
                    padding: '1px 5px',
                    fontSize: '10px',
                  }}
                >
                  {chip.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Peta Sebaran Paket Multi-Drop (Bila diaktifkan) */}
      {showMap && filteredOrders.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <DeliveryMap
            orders={filteredOrders}
            selectedOrder={selectedOrder}
            onSelectOrder={(order) => {
              setSelectedOrder(order);
              const el = document.getElementById(`order-card-${order.id}`);
              if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }}
            courierLocation={courierLocation}
            height="320px"
          />
        </div>
      )}

      {/* Orders List */}
      {loading ? (
        <SkeletonLoader type="list" count={3} />
      ) : filteredOrders.length === 0 ? (
        <Card style={{ textAlign: 'center', padding: '36px 20px' }}>
          <div style={{ fontSize: '42px', marginBottom: '10px' }}>🌴</div>
          <h4 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--color-text-main)' }}>
            Tidak ada paket yang sesuai
          </h4>
          <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
            {searchQuery
              ? `Tidak ditemukan hasil untuk "${searchQuery}". Coba kata kunci lain.`
              : 'Belum ada antaran pada filter yang Anda pilih saat ini.'}
          </p>
          {(statusFilter !== 'semua' || searchQuery) && (
            <div style={{ marginTop: '12px' }}>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setStatusFilter('semua');
                  setSearchQuery('');
                }}
              >
                Reset Semua Filter
              </Button>
            </div>
          )}
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {filteredOrders.map((order, idx) => {
            const meta = getDeliveryStatusMeta(order.status_pengiriman);
            const isDiHub = order.status_pengiriman === 'diterima_hub';
            const isOtw = order.status_pengiriman === 'dalam_perjalanan';
            const isTerkirim = order.status_pengiriman === 'terkirim';
            const isRetur = order.status_pengiriman === 'retur';

            const lat = parseFloat(order.customer?.latitude);
            const lng = parseFloat(order.customer?.longitude);
            const hasGps = !isNaN(lat) && !isNaN(lng);

            const isSelected = selectedOrder?.id === order.id;

            return (
              <Card
                key={order.id}
                id={`order-card-${order.id}`}
                padding="16px"
                style={{
                  border: isSelected
                    ? '2px solid var(--color-primary)'
                    : isRetur
                    ? '1px solid #fca5a5'
                    : isTerkirim
                    ? '1px solid #86efac'
                    : '1px solid var(--color-border)',
                  background: isRetur ? '#fff5f5' : 'var(--color-bg-card)',
                  transition: 'all 0.2s ease',
                }}
              >
                {/* Header Kartu */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        background: isTerkirim ? '#16a34a' : isRetur ? '#dc2626' : isOtw ? '#2563eb' : '#f97316',
                        color: '#ffffff',
                        fontSize: '11px',
                        fontWeight: '800',
                      }}
                    >
                      {isTerkirim ? '✓' : isRetur ? '↩' : idx + 1}
                    </span>
                    <div>
                      <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--color-text-dim)' }}>
                        {order.jenis_barang === 'paket_ekspedisi' ? '📦 RESI EKSPEDISI' : '🛒 TITIP BELI'}
                      </span>
                      <h4 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--color-text-main)', margin: 0 }}>
                        {order.nomor_resi || `Order #${order.id.slice(0, 8)}`}
                      </h4>
                    </div>
                  </div>
                  <Badge variant={meta.variant}>{meta.label}</Badge>
                </div>

                {/* Info Penerima */}
                <div
                  style={{
                    margin: '10px 0',
                    padding: '10px',
                    borderRadius: 'var(--radius-sm)',
                    background: isRetur ? '#ffffff' : 'var(--color-bg-input)',
                    boxShadow: 'var(--skeuo-input-sunken)',
                    fontSize: '12.5px',
                    lineHeight: '1.5',
                  }}
                >
                  <div>
                    <b>Penerima:</b> {order.customer?.nama || 'Customer'}
                  </div>
                  <div>
                    <b>Alamat:</b> {order.alamat_tujuan}
                  </div>
                  <div>
                    <b>Barang:</b> {order.deskripsi_barang}
                  </div>

                  {/* Keterangan Pembayaran */}
                  <div style={{ marginTop: '4px', paddingTop: '4px', borderTop: '1px solid rgba(82,99,90,0.1)' }}>
                    {isRetur ? (
                      <div>
                        <b>Status Retur:</b>{' '}
                        <span style={{ color: '#dc2626', fontWeight: '800' }}>
                          ↩️ Barang Dikembalikan ke Hub
                        </span>
                        <div style={{ fontSize: '11.5px', color: '#166534', marginTop: '2px', fontWeight: '700' }}>
                          💰 Ongkir Kurir Diterima: {formatRupiah(order.ongkir_diterima || order.ongkir_patokan || 0)}
                        </div>
                      </div>
                    ) : (
                      <div>
                        <b>Pembayaran:</b>{' '}
                        <span
                          style={{
                            fontWeight: '700',
                            color: order.metode_pembayaran === 'COD' ? 'var(--color-danger)' : 'var(--color-primary)',
                          }}
                        >
                          {order.metode_pembayaran === 'COD'
                            ? `💵 COD: Rp ${(order.ongkir_patokan || 0).toLocaleString('id-ID')}`
                            : '🏦 Transfer Lunas'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Tombol Navigasi Google Maps & WhatsApp Langsung */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                  {hasGps ? (
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        flex: 1,
                        textAlign: 'center',
                        background: '#0284c7',
                        color: '#ffffff',
                        padding: '8px 10px',
                        borderRadius: 'var(--radius-sm)',
                        textDecoration: 'none',
                        fontSize: '12px',
                        fontWeight: '700',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        boxShadow: '0 2px 6px rgba(2, 132, 199, 0.3)',
                      }}
                    >
                      <span>🗺️</span>
                      <span>Rute Google Maps</span>
                    </a>
                  ) : (
                    <span
                      style={{
                        flex: 1,
                        textAlign: 'center',
                        background: 'rgba(0,0,0,0.05)',
                        color: 'var(--color-text-muted)',
                        padding: '8px 10px',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '11px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      📍 Titik GPS belum ada
                    </span>
                  )}

                  {order.customer?.no_hp && (
                    <a
                      href={`https://wa.me/${order.customer.no_hp.replace(/^0/, '62')}?text=${encodeURIComponent(
                        `Halo ${order.customer.nama}, saya kurir Jastip Pelosok sedang mengantar paket Anda (${order.nomor_resi || 'Paket'}).`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        textAlign: 'center',
                        background: '#22c55e',
                        color: '#ffffff',
                        padding: '8px 12px',
                        borderRadius: 'var(--radius-sm)',
                        textDecoration: 'none',
                        fontSize: '12px',
                        fontWeight: '700',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '5px',
                        boxShadow: '0 2px 6px rgba(34, 197, 94, 0.3)',
                      }}
                    >
                      <span>💬</span>
                      <span>WhatsApp</span>
                    </a>
                  )}
                </div>

                {/* Action Buttons Kurir */}
                <div>
                  {isDiHub && (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedOrder(order);
                          setConfirmMulaiSheet(true);
                        }}
                        style={{ flex: 1 }}
                      >
                        🚀 Mulai Antar Paket Ini
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openReturDialog(order)}
                        style={{ color: '#dc2626', borderColor: '#fca5a5' }}
                      >
                        ↩️ Retur
                      </Button>
                    </div>
                  )}

                  {isOtw && (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => {
                          setSelectedOrder(order);
                          setCodAmount(order.ongkir_patokan > 0 ? String(order.ongkir_patokan) : '');
                          setSelesaiSheetOpen(true);
                        }}
                        style={{ flex: 2 }}
                      >
                        ✅ Selesai Antar
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openReturDialog(order)}
                        style={{ flex: 1, color: '#dc2626', borderColor: '#fca5a5' }}
                      >
                        ↩️ Retur Paket
                      </Button>
                    </div>
                  )}

                  {isTerkirim && (
                    <div
                      style={{
                        width: '100%',
                        textAlign: 'center',
                        fontSize: '12px',
                        color: '#16a34a',
                        fontWeight: '700',
                        padding: '6px',
                        background: '#ecfdf5',
                        borderRadius: '6px',
                      }}
                    >
                      ✓ Paket Berhasil Diterima Customer
                    </div>
                  )}

                  {isRetur && (
                    <div
                      style={{
                        width: '100%',
                        textAlign: 'center',
                        fontSize: '12px',
                        color: '#b91c1c',
                        fontWeight: '700',
                        padding: '6px',
                        background: '#fef2f2',
                        borderRadius: '6px',
                      }}
                    >
                      ↩️ Paket Diretur (Kompensasi Ongkir Dicatat)
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Confirmation Sheet Mulai Antar */}
      <ConfirmationSheet
        isOpen={confirmMulaiSheet}
        onClose={() => setConfirmMulaiSheet(false)}
        onConfirm={handleMulaiAntar}
        title="Mulai Antar Paket"
        message={`Mulai perjalanan untuk mengirim paket ke ${selectedOrder?.customer?.nama}? Status akan diubah menjadi "Dalam Perjalanan".`}
        confirmText="Mulai Antar Sekarang"
        loading={actionLoading}
      />

      {/* Bottom Sheet Selesai Antar (COD input / Transfer Proof) */}
      <BottomSheet
        isOpen={selesaiSheetOpen}
        onClose={() => setSelesaiSheetOpen(false)}
        title="Konfirmasi Paket Sampai Tujuan"
      >
        <div style={{ padding: '8px 0 16px 0' }}>
          {selectedOrder?.metode_pembayaran === 'COD' ? (
            <div>
              <div
                style={{
                  background: 'var(--color-warning-bg)',
                  padding: '12px',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: '16px',
                  fontSize: '13px',
                  color: '#92400e',
                  border: '1px solid rgba(217, 119, 6, 0.3)',
                }}
              >
                ⚠️ <b>Metode Pembayaran COD:</b> Pastikan Anda telah menagih dan menerima uang tunai dari customer sebelum menyelesaikan order.
              </div>

              <Input
                label="Jumlah Ongkir yang Diterima (Rp)"
                type="number"
                placeholder="Contoh: 25000"
                value={codAmount}
                onChange={(e) => setCodAmount(e.target.value)}
                required
                helperText="Nominal uang tunai yang Anda terima"
              />
            </div>
          ) : (
            <div>
              <div
                style={{
                  background: 'var(--color-info-bg)',
                  padding: '12px',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: '16px',
                  fontSize: '13px',
                  color: '#0369a1',
                }}
              >
                ℹ️ <b>Metode Pembayaran Transfer:</b> Cek konfirmasi bukti transfer customer di bawah ini sebelum menyerahkan paket.
              </div>

              {selectedOrder?.bukti_transfer_url ? (
                <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                  <img
                    src={selectedOrder.bukti_transfer_url}
                    alt="Bukti Transfer"
                    style={{
                      maxWidth: '100%',
                      maxHeight: '200px',
                      borderRadius: 'var(--radius-md)',
                      boxShadow: 'var(--skeuo-card-shadow)',
                    }}
                  />
                </div>
              ) : (
                <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '16px' }}>
                  Customer belum mengunggah foto bukti transfer.
                </p>
              )}
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
            <Button variant="outline" onClick={() => setSelesaiSheetOpen(false)}>
              Batal
            </Button>
            <Button loading={actionLoading} onClick={handleSampaiTujuan}>
              Konfirmasi Selesai
            </Button>
          </div>
        </div>
      </BottomSheet>

      {/* Bottom Sheet Retur Paket (Solusi Kasus Retur Barang) */}
      <BottomSheet
        isOpen={returSheetOpen}
        onClose={() => setReturSheetOpen(false)}
        title="↩️ Proses Retur / Kembalikan Paket"
      >
        <div style={{ padding: '8px 0 16px 0' }}>
          {/* Box Penjelasan Kebijakan Jastip Pelosok */}
          <div
            style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              padding: '12px',
              borderRadius: 'var(--radius-md)',
              marginBottom: '14px',
              fontSize: '12.5px',
              color: '#991b1b',
              lineHeight: '1.5',
            }}
          >
            <b>ℹ️ Kebijakan Ongkir Kurir:</b>
            <div style={{ marginTop: '4px' }}>
              Karena kurir telah menempuh perjalanan pelosok, <b>biaya ongkos kirim tetap menjadi hak kurir</b>.
              Nilai tagihan barang COD dibatalkan (Rp 0), namun ongkir tetap dicatat.
            </div>
          </div>

          {/* Pilih Alasan Retur */}
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '6px', color: 'var(--color-text-main)' }}>
              Alasan Pengembalian / Retur:
            </label>
            <select
              value={returAlasan}
              onChange={(e) => setReturAlasan(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--color-border)',
                background: 'var(--color-bg-card)',
                color: 'var(--color-text-main)',
                fontSize: '13px',
                outline: 'none',
              }}
            >
              <option value="Penerima Menolak Bayar / Batal">Penerima Menolak Bayar / Batal</option>
              <option value="Alamat / Rumah Tidak Ditemukan">Alamat / Rumah Tidak Ditemukan di Pelosok</option>
              <option value="Penerima Tidak Ada di Tempat (HP Mati/Tidak Aktif)">Penerima Tidak di Tempat (HP Mati/Tidak Aktif)</option>
              <option value="Barang Rusak / Tidak Sesuai">Barang Rusak / Tidak Sesuai</option>
              <option value="Lainnya">Lainnya</option>
            </select>
          </div>

          {/* Input Ongkir Retur yang Diterima */}
          <div style={{ marginBottom: '14px' }}>
            <Input
              label="Ongkir yang Diterima Kurir (Rp)"
              type="number"
              placeholder="Contoh: 25000"
              value={returOngkir}
              onChange={(e) => setReturOngkir(e.target.value)}
              required
              helperText="Isi nominal ongkir tunai yang diterima dari pelanggan (atau isi 0 bila akan ditagihkan ke pengirim)"
            />
          </div>

          {/* Catatan Tambahan */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '6px', color: 'var(--color-text-main)' }}>
              Catatan Kurir (Opsional):
            </label>
            <textarea
              rows={2}
              placeholder="Contoh: Rumah kosong sudah dikunjungi 2x, tetangga bilang lagi merantau..."
              value={returCatatan}
              onChange={(e) => setReturCatatan(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--color-border)',
                background: 'var(--color-bg-card)',
                color: 'var(--color-text-main)',
                fontSize: '12.5px',
                outline: 'none',
                fontFamily: 'inherit',
              }}
            />
          </div>

          {/* Tombol Aksi Retur */}
          <div style={{ display: 'flex', gap: '10px' }}>
            <Button variant="outline" onClick={() => setReturSheetOpen(false)}>
              Batal
            </Button>
            <Button
              loading={actionLoading}
              onClick={handleProsesRetur}
              style={{ background: '#dc2626', borderColor: '#b91c1c', color: '#ffffff' }}
            >
              Konfirmasi Retur Paket
            </Button>
          </div>
        </div>
      </BottomSheet>

      {/* Feedback Sheet */}
      <BottomSheet
        isOpen={feedbackSheet.open}
        onClose={() => setFeedbackSheet({ ...feedbackSheet, open: false })}
        title={feedbackSheet.title}
      >
        <div style={{ textAlign: 'center', padding: '12px 0 16px 0' }}>
          <p style={{ fontSize: '14.5px', color: 'var(--color-text-main)', lineHeight: '1.5' }}>
            {feedbackSheet.message}
          </p>
          <div style={{ marginTop: '20px' }}>
            <Button onClick={() => setFeedbackSheet({ ...feedbackSheet, open: false })}>
              Tutup
            </Button>
          </div>
        </div>
      </BottomSheet>

      {/* BottomSheet Scanner Resi Kurir */}
      <BottomSheet
        isOpen={scannerOpen}
        onClose={handleCloseScanner}
        title="📷 Scan Barcode / Resi Paket"
      >
        <div style={{ padding: '0 0 16px 0', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Scanner Kamera Stream (Otomatis Aktif Saat Modal Terbuka) */}
          <div style={{ position: 'relative' }}>
            <div
              id="kurir-camera-stream"
              style={{
                width: '100%',
                minHeight: isScanningCamera ? '220px' : '0px',
                background: '#090d16',
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
                display: isScanningCamera ? 'block' : 'none',
                boxShadow: isScanningCamera ? '0 4px 14px rgba(0,0,0,0.3)' : 'none',
                marginBottom: '10px',
              }}
            />

            {/* Kontrol Toggle Kamera */}
            <div>
              {!isScanningCamera ? (
                <Button
                  onClick={startKurirCamera}
                  style={{
                    width: '100%',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: '#ffffff',
                    border: 'none',
                    padding: '12px',
                    fontWeight: '800',
                  }}
                >
                  📸 Buka / Aktifkan Kamera HP
                </Button>
              ) : (
                <button
                  type="button"
                  onClick={stopKurirCamera}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid #ef4444',
                    background: 'rgba(239, 68, 68, 0.08)',
                    color: '#ef4444',
                    fontSize: '12px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                >
                  <span>⏹️</span>
                  <span>Matikan Kamera (Gunakan Input Manual)</span>
                </button>
              )}
            </div>
          </div>

          {/* Input Manual Nomor Resi (Alternatif Rapi & Proporsional) */}
          <div style={{ marginTop: '4px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: '700',
                color: 'var(--color-text-main)',
                marginBottom: '6px',
              }}
            >
              Atau Masukkan Nomor Resi Manual:
            </label>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleProcessKurirScan(scannedResiInput);
              }}
              style={{ display: 'flex', gap: '8px', width: '100%' }}
            >
              <input
                type="text"
                placeholder="Contoh: SPXID..., JP123..."
                value={scannedResiInput}
                onChange={(e) => setScannedResiInput(e.target.value)}
                style={{
                  flex: 1,
                  height: '42px',
                  padding: '0 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-bg-input)',
                  color: 'var(--color-text-main)',
                  fontSize: '13px',
                  outline: 'none',
                  minWidth: 0,
                }}
              />
              <Button
                type="submit"
                loading={scanStatus === 'loading'}
                style={{ height: '42px', padding: '0 18px', whiteSpace: 'nowrap' }}
              >
                Cari Resi
              </Button>
            </form>
          </div>

          {/* Indikator Loading */}
          {scanStatus === 'loading' && (
            <div style={{ textAlign: 'center', padding: '16px' }}>
              <SkeletonLoader type="card" height="120px" />
              <p style={{ fontSize: '12px', color: 'var(--color-text-dim)', marginTop: '8px' }}>
                Mencari data pesanan kustomer di database...
              </p>
            </div>
          )}

          {/* Hasil: Resi Tidak Ditemukan */}
          {scanStatus === 'not_found' && (
            <div
              style={{
                background: '#fffbeb',
                border: '1px solid #f59e0b',
                borderRadius: 'var(--radius-sm)',
                padding: '12px 14px',
                color: '#92400e',
                fontSize: '13px',
                lineHeight: '1.4',
              }}
            >
              <b>❌ Nomor Resi Belum Terdaftar</b>
              <p style={{ margin: '4px 0 0 0', fontSize: '12px' }}>
                Paket dengan resi "{scannedResiInput}" belum pernah dibuat pesanannya oleh customer di aplikasi. Harap hubungi Admin Hub jika paket ini perlu didaftarkan manual.
              </p>
            </div>
          )}

          {/* Hasil: Bukan Wilayah Tugas Kurir Ini */}
          {scanStatus === 'not_assigned' && scanResultOrder && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div
                style={{
                  background: '#fef2f2',
                  border: '1.5px solid #ef4444',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px 14px',
                  color: '#991b1b',
                  fontSize: '13px',
                  lineHeight: '1.45',
                }}
              >
                <div style={{ fontWeight: '800', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>⚠️</span>
                  <span>BUKAN WILAYAH TUGAS ANDA!</span>
                </div>
                <div style={{ marginTop: '4px', fontSize: '12px' }}>
                  Paket ini menuju <b>Desa {scanTargetDesa}</b>, sedangkan wilayah tugas Anda adalah: <b>{profile?.alamat || 'Desa Lain'}</b>.
                </div>
                <div style={{ marginTop: '4px', fontSize: '11.5px', color: '#b91c1c' }}>
                  Silakan serahkan paket ini ke kurir yang ditugaskan menangani Desa {scanTargetDesa}.
                </div>
              </div>

              {/* Rincian Singkat Penerima */}
              <Card padding="12px 14px" style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)' }}>
                <div style={{ fontSize: '12px', color: 'var(--color-text-dim)' }}>Tujuan Pengantaran:</div>
                <div style={{ fontSize: '14px', fontWeight: '800', color: 'var(--color-text-main)', marginTop: '2px' }}>
                  {scanResultOrder.customer?.nama || 'Customer'}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                  {scanResultOrder.alamat_tujuan}
                </div>
              </Card>
            </div>
          )}

          {/* Hasil: Cocok & Data Customer Muncul Lengkap */}
          {scanStatus === 'matched' && scanResultOrder && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Badge Wilayah Valid */}
              <div
                style={{
                  background: '#ecfdf5',
                  border: '1.5px solid #10b981',
                  borderRadius: 'var(--radius-sm)',
                  padding: '10px 12px',
                  color: '#065f46',
                  fontSize: '12.5px',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span>✅</span>
                <span>Wilayah Pengantaran Anda ({profile?.alamat || 'Semua Desa'})</span>
              </div>

              {/* Kartu Detail Lengkap Pesanan Customer */}
              <Card
                padding="14px 16px"
                style={{
                  background: 'var(--color-bg-card)',
                  border: '1px solid var(--color-border)',
                  boxShadow: 'var(--skeuo-card-shadow)',
                }}
              >
                {/* Header Resi & Status */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px', borderBottom: '1px solid var(--color-border)', paddingBottom: '10px' }}>
                  <div>
                    <span style={{ fontSize: '11px', color: 'var(--color-text-dim)', fontWeight: '600', textTransform: 'uppercase' }}>
                      Nomor Resi Paket
                    </span>
                    <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--color-primary)', margin: '2px 0 0 0', letterSpacing: '0.5px' }}>
                      {scanResultOrder.nomor_resi || '-'}
                    </h3>
                  </div>
                  <Badge variant={scanResultOrder.status_pengiriman === 'dalam_perjalanan' ? 'primary' : 'warning'}>
                    {scanResultOrder.status_pengiriman === 'dipesan'
                      ? 'Dipesan Customer'
                      : scanResultOrder.status_pengiriman === 'diterima_hub'
                      ? 'Siap di Hub'
                      : scanResultOrder.status_pengiriman === 'dalam_perjalanan'
                      ? 'Dalam Perjalanan'
                      : scanResultOrder.status_pengiriman}
                  </Badge>
                </div>

                {/* Data Penerima / Customer */}
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ fontSize: '11.5px', color: 'var(--color-text-dim)', fontWeight: '600' }}>
                    Penerima Paket:
                  </div>
                  <div style={{ fontSize: '15px', fontWeight: '800', color: 'var(--color-text-main)', marginTop: '2px' }}>
                    {scanResultOrder.customer?.nama || 'Customer'}
                  </div>
                  <div style={{ fontSize: '12.5px', color: 'var(--color-text-muted)', marginTop: '3px', lineHeight: '1.4' }}>
                    📍 {scanResultOrder.alamat_tujuan || '-'}
                  </div>

                  {/* Tombol Kontak WhatsApp & Telepon */}
                  {scanResultOrder.customer?.no_hp && (
                    <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                      <a
                        href={`https://wa.me/62${scanResultOrder.customer.no_hp.replace(/^0+/, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          flex: 1,
                          background: '#25D366',
                          color: '#ffffff',
                          padding: '8px 10px',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '12px',
                          fontWeight: '700',
                          textDecoration: 'none',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                        }}
                      >
                        <span>💬</span>
                        <span>Chat WhatsApp</span>
                      </a>
                      <a
                        href={`tel:${scanResultOrder.customer.no_hp}`}
                        style={{
                          flex: 1,
                          background: 'var(--color-primary)',
                          color: '#ffffff',
                          padding: '8px 10px',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '12px',
                          fontWeight: '700',
                          textDecoration: 'none',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                        }}
                      >
                        <span>📞</span>
                        <span>Telepon</span>
                      </a>
                    </div>
                  )}
                </div>

                {/* Detail Barang & Pembayaran */}
                <div
                  style={{
                    background: 'var(--color-bg-input)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '10px 12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    fontSize: '12px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--color-text-muted)' }}>Barang:</span>
                    <span style={{ fontWeight: '700', color: 'var(--color-text-main)' }}>
                      {scanResultOrder.deskripsi_barang || 'Paket Ekspedisi'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--color-text-muted)' }}>Metode Bayar:</span>
                    <span style={{ fontWeight: '700', color: 'var(--color-text-main)' }}>
                      {scanResultOrder.metode_pembayaran || 'COD'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--color-text-muted)' }}>Jalur Hub:</span>
                    <span style={{ fontWeight: '600', color: 'var(--color-text-dim)' }}>
                      {scanResultOrder.jalur?.nama_jalur || 'Jalur Hub Pelosok'}
                    </span>
                  </div>
                </div>

                {/* Tombol Aksi Kurir */}
                <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {scanResultOrder.status_pengiriman !== 'dalam_perjalanan' && scanResultOrder.status_pengiriman !== 'terkirim' && (
                    <Button
                      onClick={() => handleKurirAmbilPaketDariScan(scanResultOrder.id)}
                      loading={actionLoading}
                      style={{
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        color: '#ffffff',
                        border: 'none',
                        padding: '12px',
                        fontSize: '13.5px',
                        fontWeight: '800',
                      }}
                    >
                      🚀 Ambil Paket & Mulai Antar ke Pelosok
                    </Button>
                  )}

                  {scanResultOrder.status_pengiriman === 'dalam_perjalanan' && (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <Button
                        onClick={() => {
                          setSelectedOrder(scanResultOrder);
                          setSelesaiSheetOpen(true);
                          handleCloseScanner();
                        }}
                        style={{ flex: 1.2, background: 'var(--color-primary)', color: '#ffffff' }}
                      >
                        ✅ Selesaikan (Terkirim)
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          openReturSheet(scanResultOrder);
                          handleCloseScanner();
                        }}
                        style={{ flex: 1, color: '#dc2626', borderColor: '#ef4444' }}
                      >
                        ⚠️ Retur
                      </Button>
                    </div>
                  )}

                  {scanResultOrder.status_pengiriman === 'terkirim' && (
                    <div style={{ textAlign: 'center', padding: '8px', color: '#059669', fontWeight: '700', fontSize: '13px' }}>
                      ✅ Paket ini sudah berhasil diantar ke penerima.
                    </div>
                  )}
                </div>
              </Card>
            </div>
          )}

          {/* Tombol Tutup */}
          <div style={{ marginTop: '6px' }}>
            <Button variant="outline" onClick={handleCloseScanner} style={{ width: '100%' }}>
              Tutup Scanner
            </Button>
          </div>
        </div>
      </BottomSheet>

      {/* Confirmation Sheet Logout */}
      <ConfirmationSheet
        isOpen={logoutSheetOpen}
        onClose={() => setLogoutSheetOpen(false)}
        onConfirm={handleLogout}
        title="Keluar dari Akun Kurir"
        message="Apakah Anda yakin ingin keluar dari sesi aplikasi Kurir?"
        confirmText="Ya, Keluar Akun"
        confirmVariant="danger"
        loading={logoutLoading}
      />

      {/* Bottom Nav */}
      <BottomNav role="kurir" />
    </div>
  );
}
