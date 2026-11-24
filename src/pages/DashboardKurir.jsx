import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import { useAuth } from '../hooks/useAuth';
import { authService } from '../services/authService';
import { orderService } from '../services/orderService';
import { villageService, NARINGGUL_VILLAGES } from '../services/villageService';
import { compressImageToWebP } from '../utils/imageCompressor';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Input from '../components/Input';
import Button from '../components/Button';
import BottomNav from '../components/BottomNav';
import BottomSheet from '../components/BottomSheet';
import ConfirmationSheet from '../components/ConfirmationSheet';
import SkeletonLoader from '../components/SkeletonLoader';
import DeliveryMap from '../components/DeliveryMap';
import Sidebar from '../components/Sidebar';
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
  const { profile, refreshProfile } = useAuth();

  const searchParams = new URLSearchParams(location.search);
  const activeMainTab = searchParams.get('tab') || (searchParams.get('status') === 'terkirim' ? 'selesai' : 'antaran');

  // Sidebar & Profil Drawer States (Sama Seperti di Akun Customer)
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileSheetOpen, setProfileSheetOpen] = useState(false);

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // State Tab Halaman Kurir dengan Persistence di localStorage
  const [activeTab, setActiveTab] = useState(() => {
    try {
      const p = new URLSearchParams(window.location.search).get('tab');
      if (p === 'pesanan' || p === 'antaran') return 'pesanan';
      if (p === 'keuangan' || p === 'selesai') return 'keuangan';
      if (p === 'beranda') return 'beranda';
      const saved = localStorage.getItem('kurir_active_tab');
      if (saved && ['beranda', 'pesanan', 'keuangan'].includes(saved)) return saved;
    } catch (e) {
      console.error(e);
    }
    return 'beranda';
  });

  useEffect(() => {
    if (activeTab) {
      localStorage.setItem('kurir_active_tab', activeTab);
    }
  }, [activeTab]);

  // State Modal BottomSheet Filter Waktu
  const [dateFilterSheetOpen, setDateFilterSheetOpen] = useState(false);

  // State Modal BottomSheet Filter Desa
  const [desaFilterSheetOpen, setDesaFilterSheetOpen] = useState(false);
  const [desaFilter, setDesaFilter] = useState(() => {
    return localStorage.getItem('kurir_desa_filter') || 'semua';
  });

  useEffect(() => {
    localStorage.setItem('kurir_desa_filter', desaFilter);
  }, [desaFilter]);

  // State Kontrol Dialog Filter Tanggal Interaktif (Harian, Bulanan, Tahunan)
  const [tempDateMode, setTempDateMode] = useState('hari'); // 'hari' | 'bulan' | 'tahun' | 'semua'
  const [tempCustomDate, setTempCustomDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [tempMonth, setTempMonth] = useState(() => new Date().getMonth() + 1);
  const [tempYear, setTempYear] = useState(() => new Date().getFullYear());

  // State Filter Jenis Layanan: 'semua' | 'paket' | 'jastip'
  const [serviceFilter, setServiceFilter] = useState('semua');

  // Scanner Kurir State (Barcode Kamera HP & Input Manual Resi)
  const [scannerOpen, setScannerOpen] = useState(false);
  const [isScanningCamera, setIsScanningCamera] = useState(false);
  const [scannedResiInput, setScannedResiInput] = useState('');
  const [scanResultOrder, setScanResultOrder] = useState(null);
  const [scanStatus, setScanStatus] = useState(null); // null | 'matched' | 'not_assigned' | 'not_found' | 'loading'
  const [scanTargetDesa, setScanTargetDesa] = useState('');
  const [scanHargaPaket, setScanHargaPaket] = useState('');
  const [scanOngkirKurir, setScanOngkirKurir] = useState('10000');
  const kurirScannerRef = useRef(null);

  // State Form Paket Belum Terdaftar (Unregistered Package Workflow)
  const [unregEkspedisi, setUnregEkspedisi] = useState('J&T Express');
  const [unregNama, setUnregNama] = useState('');
  const [unregHp, setUnregHp] = useState('');
  const [unregDesaId, setUnregDesaId] = useState('');
  const [unregDetailAlamat, setUnregDetailAlamat] = useState('');
  const [unregMetode, setUnregMetode] = useState('COD');
  const [unregHargaBarang, setUnregHargaBarang] = useState('');
  const [unregOngkirKurir, setUnregOngkirKurir] = useState('10000');
  const [unregSaving, setUnregSaving] = useState(false);

  // State Tunda Antar Besok (Postpone Delivery Workflow)
  const [tundaSheetOpen, setTundaSheetOpen] = useState(false);
  const [tundaOrder, setTundaOrder] = useState(null);
  const [tundaAlasan, setTundaAlasan] = useState('🌧️ Cuaca Ekstrem / Hujan Lebat di Pelosok');
  const [tundaCatatan, setTundaCatatan] = useState('');
  const [tundaLoading, setTundaLoading] = useState(false);

  // State Kartu Diperbesar / Diperkecil (Tersimpan di localStorage, tidak berubah saat refresh)
  const [expandedCards, setExpandedCards] = useState(() => {
    try {
      const saved = localStorage.getItem('kurir_cards_expanded_map');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return {};
  });

  const [defaultCardsExpanded, setDefaultCardsExpanded] = useState(() => {
    const saved = localStorage.getItem('kurir_cards_default_expanded');
    return saved !== null ? saved === 'true' : true;
  });

  const toggleCardExpand = (orderId) => {
    setExpandedCards((prev) => {
      const current = prev[orderId] !== undefined ? prev[orderId] : defaultCardsExpanded;
      const updated = { ...prev, [orderId]: !current };
      try {
        localStorage.setItem('kurir_cards_expanded_map', JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      return updated;
    });
  };

  const toggleAllCardsExpand = () => {
    const next = !defaultCardsExpanded;
    setDefaultCardsExpanded(next);
    localStorage.setItem('kurir_cards_default_expanded', String(next));
    const updated = {};
    orders.forEach((o) => {
      updated[o.id] = next;
    });
    setExpandedCards(updated);
    try {
      localStorage.setItem('kurir_cards_expanded_map', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
  };

  // State Edit Profil Kurir (Sama Seperti di Akun Customer)
  const [profileName, setProfileName] = useState(profile?.nama || '');
  const [profilePhone, setProfilePhone] = useState(profile?.no_hp || '');
  const [profileAlamat, setProfileAlamat] = useState(profile?.alamat || '');
  const [profileDana, setProfileDana] = useState(profile?.nomor_dana || '');
  const [profileFotoUrl, setProfileFotoUrl] = useState(profile?.foto_url || '');
  const [compressingFoto, setCompressingFoto] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [desaList, setDesaList] = useState([]);
  const profileFileInputRef = useRef(null);

  useEffect(() => {
    if (profile) {
      if (profile.nama) setProfileName(profile.nama);
      if (profile.no_hp) setProfilePhone(profile.no_hp);
      if (profile.alamat) setProfileAlamat(profile.alamat);
      if (profile.nomor_dana) setProfileDana(profile.nomor_dana);
      if (profile.foto_url) setProfileFotoUrl(profile.foto_url);
    }
  }, [profile]);

  useEffect(() => {
    villageService.getAllDesa().then((res) => {
      if (res && res.length) setDesaList(res);
    }).catch(console.error);
  }, []);

  const handleSaveKurirProfile = async (e) => {
    e?.preventDefault();
    if (!profileName.trim()) {
      setFeedbackSheet({ open: true, title: 'Nama Wajib Diisi', message: 'Silakan isi nama lengkap Anda.' });
      return;
    }
    setSavingProfile(true);
    try {
      await authService.updateKurirProfile(profile.id, {
        name: profileName,
        phone: profilePhone,
        danaNumber: profileDana,
        alamat: profileAlamat,
        fotoUrl: profileFotoUrl,
      });
      if (refreshProfile) await refreshProfile();
      setFeedbackSheet({
        open: true,
        title: 'Profil Berhasil Disimpan! ✅',
        message: 'Informasi profil, wilayah antaran, dan akun DANA Anda telah diperbarui.',
      });
    } catch (err) {
      setFeedbackSheet({
        open: true,
        title: 'Gagal Menyimpan Profil',
        message: err.message || 'Terjadi kesalahan saat menyimpan profil.',
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleKurirFotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCompressingFoto(true);
    try {
      const webpBase64 = await compressImageToWebP(file, 300, 0.8);
      setProfileFotoUrl(webpBase64);
    } catch (err) {
      setFeedbackSheet({
        open: true,
        title: 'Gagal Memproses Foto',
        message: err.message || 'Silakan coba gunakan foto lain.',
      });
    } finally {
      setCompressingFoto(false);
    }
  };

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

  // Generator Pesan WhatsApp Dinamis (Dengan Nama Kurir & Rincian Ongkir / COD)
  const generateWaMessage = (order) => {
    const kurirName = profile?.nama ? `saya ${profile.nama} (Kurir Pelosok)` : 'saya kurir yang bertugas';
    const customerName = order.customer?.nama || 'Kak';
    const resi = order.nomor_resi ? `No. Resi: ${order.nomor_resi}` : '';
    const barang = order.deskripsi_barang ? `Barang: ${order.deskripsi_barang}` : 'Paket Ekspedisi';
    const alamat = order.alamat_tujuan || '-';

    const ongkir = order.ongkir_patokan || order.ongkir_diterima || 0;
    
    let paymentText = '';
    if (order.metode_pembayaran === 'COD') {
      paymentText = `💰 *Pembayaran: COD (Bayar di Tempat)*\n💵 *Mohon siapkan uang pas:* Rp ${Number(ongkir).toLocaleString('id-ID')}`;
    } else {
      paymentText = `✅ *Pembayaran Barang:* Sudah Lunas (Transfer)\n💰 *Mohon siapkan ongkir kurir:* Rp ${Number(ongkir).toLocaleString('id-ID')} (dibayarkan tunai saat kurir tiba)`;
    }

    return `Halo Kak ${customerName} 👋\n${kurirName} sedang dalam perjalanan mengantar paket ke alamat Anda.\n\n📦 ${barang}\n🔖 ${resi}\n📍 Alamat: ${alamat}\n\n${paymentText}\n\nMohon pastikan ada orang di rumah ya Kak. Terima kasih! 🙏`;
  };

  // Filter & Pencarian dengan Persistence di localStorage
  const [dateFilter, setDateFilter] = useState(() => {
    return localStorage.getItem('kurir_date_filter') || 'hari_ini';
  });
  const [statusFilter, setStatusFilter] = useState(() => {
    return localStorage.getItem('kurir_status_filter') || 'semua';
  });
  const [searchQuery, setSearchQuery] = useState(() => {
    return sessionStorage.getItem('kurir_search_query') || '';
  });

  useEffect(() => {
    localStorage.setItem('kurir_date_filter', dateFilter);
  }, [dateFilter]);

  useEffect(() => {
    localStorage.setItem('kurir_status_filter', statusFilter);
  }, [statusFilter]);

  useEffect(() => {
    localStorage.setItem('kurir_service_filter', serviceFilter);
  }, [serviceFilter]);

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

  // Peta & GPS Tracking Kurir Realtime (Persisted state & Auto Reconnect on Refresh)
  const [courierLocation, setCourierLocation] = useState(() => {
    try {
      const saved = localStorage.getItem('kurir_last_location');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return null;
  });

  const [trackingGps, setTrackingGps] = useState(() => {
    return localStorage.getItem('kurir_tracking_gps') === 'true';
  });

  const [showMap, setShowMap] = useState(() => {
    const saved = sessionStorage.getItem('kurir_show_map');
    return saved !== null ? saved === 'true' : true;
  });

  useEffect(() => {
    sessionStorage.setItem('kurir_show_map', String(showMap));
  }, [showMap]);

  const watchIdRef = useRef(null);

  // Fungsi Mulai Tracking GPS (Persistent)
  const startGpsWatch = () => {
    if (!navigator.geolocation) {
      setTrackingGps(false);
      localStorage.setItem('kurir_tracking_gps', 'false');
      setFeedbackSheet({
        open: true,
        title: 'GPS Tidak Didukung',
        message: 'Browser HP Anda tidak mendukung deteksi lokasi GPS.',
      });
      return;
    }

    if (watchIdRef.current) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }

    setTrackingGps(true);
    localStorage.setItem('kurir_tracking_gps', 'true');

    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const newLoc = [pos.coords.latitude, pos.coords.longitude];
        setCourierLocation(newLoc);
        try {
          localStorage.setItem('kurir_last_location', JSON.stringify(newLoc));
        } catch (e) {
          console.error(e);
        }
      },
      (err) => {
        console.warn('Gagal membaca GPS kurir:', err);
        // Jangan langsung matikan toggle saat sementara sinyal GPS hilang di bukit pelosok
      },
      { enableHighAccuracy: true, maximumAge: 4000, timeout: 15000 }
    );
    watchIdRef.current = id;
  };

  // Fungsi Hentikan Tracking GPS
  const stopGpsWatch = () => {
    if (watchIdRef.current) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setTrackingGps(false);
    localStorage.setItem('kurir_tracking_gps', 'false');
    localStorage.removeItem('kurir_last_location');
    setCourierLocation(null);
  };

  // Toggle GPS Tracker (Klik Tombol GPS Aktif / Nyalakan GPS)
  const toggleGpsTracking = () => {
    if (trackingGps) {
      stopGpsWatch();
    } else {
      startGpsWatch();
    }
  };

  // Otomatis Sambungkan Kembali GPS Saat Halaman Di-refresh / Buka Ulang Jika Belum Dimatikan
  useEffect(() => {
    const isSavedActive = localStorage.getItem('kurir_tracking_gps') === 'true';
    if (isSavedActive) {
      startGpsWatch();
    }

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

  // Pantau URL query params (misal klik tab Navigasi di BottomNav)
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const tabParam = searchParams.get('tab');

    if (tabParam === 'scan') {
      setScannerOpen(true);
    } else if (tabParam === 'pesanan' || tabParam === 'antaran') {
      setActiveTab('pesanan');
    } else if (tabParam === 'keuangan' || tabParam === 'selesai') {
      setActiveTab('keuangan');
    } else {
      setActiveTab('beranda');
    }

    if (searchParams.get('tipe')) {
      setServiceFilter(searchParams.get('tipe'));
    }
    if (searchParams.get('status')) {
      setStatusFilter(searchParams.get('status'));
      setActiveTab('pesanan');
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
      navigate(`/dashboard-kurir?tab=${activeTab || 'beranda'}`, { replace: true });
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

      // Inisialisasi harga paket & ongkir patokan (default Rp 10.000 atau sesuai patokan awal)
      setScanHargaPaket('');
      setScanOngkirKurir(order.ongkir_patokan && order.ongkir_patokan > 0 ? String(order.ongkir_patokan) : '10000');

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

  // Kurir ambil & bawa paket dari hasil scan lengkap dengan pemberian harga paket & ongkir
  const handleKurirAmbilPaketDariScan = async (orderId) => {
    if (!orderId) return;
    setActionLoading(true);
    try {
      const numericOngkir = parseFloat(scanOngkirKurir) || 0;
      const numericHargaPaket = parseFloat(scanHargaPaket) || 0;

      // Update deskripsi dengan tag rincian harga paket / COD dan ongkir jika dimasukkan
      let updatedDesc = scanResultOrder?.deskripsi_barang || '';
      if (numericHargaPaket > 0) {
        updatedDesc += ` [COD Barang: Rp ${numericHargaPaket.toLocaleString('id-ID')}]`;
      }
      if (numericOngkir > 0 && !updatedDesc.includes('[Ongkir:')) {
        updatedDesc += ` [Ongkir: Rp ${numericOngkir.toLocaleString('id-ID')}]`;
      }

      await orderService.updateDeliveryStatus(orderId, 'dalam_perjalanan', {
        kurir_id: profile.id,
        status_konfirmasi: 'dikonfirmasi',
        ongkir_patokan: numericOngkir,
        deskripsi_barang: updatedDesc,
      });

      await loadKurirOrders();
      setFeedbackSheet({
        open: true,
        title: 'Paket Siap Diantar! 🛵',
        message: `Paket resmi Anda ambil. Ongkir antaran dicatat Rp ${numericOngkir.toLocaleString('id-ID')}${numericHargaPaket > 0 ? ` + COD Barang Rp ${numericHargaPaket.toLocaleString('id-ID')}` : ''}. Status berubah jadi "Dalam Perjalanan".`,
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
  // Daftar Nama Bulan Indonesia
  const NAMA_BULAN = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  // Helper Label Filter Tanggal
  const getDateFilterLabel = (filter) => {
    if (!filter || filter === 'hari_ini') return 'Hari Ini';
    if (filter === 'kemarin') return 'Kemarin';
    if (filter === 'semua') return 'Semua Waktu';
    if (filter === 'bulan_ini') {
      const now = new Date();
      return `${NAMA_BULAN[now.getMonth()]} ${now.getFullYear()}`;
    }
    if (filter === 'tahun_ini') {
      return `Tahun ${new Date().getFullYear()}`;
    }
    if (filter.startsWith('hari:')) {
      const dStr = filter.substring(5); // YYYY-MM-DD
      const parts = dStr.split('-');
      if (parts.length === 3) {
        const [y, m, d] = parts;
        return `${parseInt(d)} ${NAMA_BULAN[parseInt(m) - 1]?.slice(0, 3)} ${y}`;
      }
      return dStr;
    }
    if (filter.startsWith('bulan:')) {
      const ym = filter.substring(6); // YYYY-MM
      const parts = ym.split('-');
      if (parts.length === 2) {
        const [y, m] = parts;
        return `${NAMA_BULAN[parseInt(m) - 1]} ${y}`;
      }
      return ym;
    }
    if (filter.startsWith('tahun:')) {
      return `Tahun ${filter.substring(6)}`;
    }
    return filter;
  };

  // Filter Data berdasarkan Tanggal & Desa (Mendukung Hari spesifik, Bulan spesifik, Tahun spesifik, dan Desa)
  const ordersInDateRange = useMemo(() => {
    return orders.filter((order) => {
      // 1. Filter Tanggal
      const timestamp = order.updated_at || order.created_at;
      let dateMatch = true;
      if (timestamp) {
        const d = new Date(timestamp);
        if (dateFilter === 'hari_ini') {
          dateMatch = isDateToday(timestamp) || isDateToday(order.created_at);
        } else if (dateFilter === 'kemarin') {
          dateMatch = isDateYesterday(timestamp) || isDateYesterday(order.created_at);
        } else if (dateFilter === 'bulan_ini') {
          const now = new Date();
          dateMatch = d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        } else if (dateFilter === 'tahun_ini') {
          dateMatch = d.getFullYear() === new Date().getFullYear();
        } else if (dateFilter.startsWith('hari:')) {
          const target = dateFilter.substring(5);
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          dateMatch = `${y}-${m}-${day}` === target;
        } else if (dateFilter.startsWith('bulan:')) {
          const [tY, tM] = dateFilter.substring(6).split('-');
          dateMatch = d.getFullYear() === parseInt(tY) && (d.getMonth() + 1) === parseInt(tM);
        } else if (dateFilter.startsWith('tahun:')) {
          const tY = parseInt(dateFilter.substring(6));
          dateMatch = d.getFullYear() === tY;
        } else if (dateFilter === 'semua') {
          dateMatch = true;
        }
      }

      if (!dateMatch) return false;

      // 2. Filter Desa
      if (desaFilter && desaFilter !== 'semua') {
        const target = desaFilter.toLowerCase().replace('desa', '').trim();
        const alamat = (order.alamat_tujuan || '').toLowerCase();
        const custAlamat = (order.customer?.alamat || '').toLowerCase();
        const deskripsi = (order.deskripsi_barang || '').toLowerCase();
        const desaMatch = alamat.includes(target) || custAlamat.includes(target) || deskripsi.includes(target);
        if (!desaMatch) return false;
      }

      return true;
    });
  }, [orders, dateFilter, desaFilter]);

  // Helper Ekstraksi Nilai Barang COD dari Catatan Paket
  const getCodBarangAmount = (order) => {
    if (order?.metode_pembayaran !== 'COD') return 0;
    const desc = order?.deskripsi_barang || '';
    const match = desc.match(/COD Barang:\s*Rp\s*([0-9.,]+)/i) || desc.match(/COD:\s*Rp\s*([0-9.,]+)/i);
    if (match) {
      const cleanNum = match[1].replace(/\./g, '').replace(/,/g, '');
      return parseFloat(cleanNum) || 0;
    }
    return 0;
  };

  // Metrik Statistik Harian & Transparansi Arus Kas (Berdasarkan filter tanggal aktif)
  const stats = useMemo(() => {
    const list = ordersInDateRange;
    const total = list.length;
    const terkirim = list.filter((o) => o.status_pengiriman === 'terkirim').length;
    const otw = list.filter((o) => o.status_pengiriman === 'dalam_perjalanan').length;
    const siapAntar = list.filter((o) => o.status_pengiriman === 'diterima_hub').length;
    const retur = list.filter((o) => o.status_pengiriman === 'retur').length;

    // 1. Hak Bersih Kurir (Ongkir dari paket terkirim + paket retur)
    const totalHakOngkir = list.reduce((acc, curr) => {
      if (curr.status_pengiriman === 'terkirim' || curr.status_pengiriman === 'retur') {
        return acc + (parseFloat(curr.ongkir_diterima) || parseFloat(curr.ongkir_patokan) || 0);
      }
      return acc;
    }, 0);

    // 2. Setoran Uang Barang COD ke Hub (Hanya dari paket yang sukses terkirim)
    const totalSetoranBarang = list.reduce((acc, curr) => {
      if (curr.status_pengiriman === 'terkirim' && curr.metode_pembayaran === 'COD') {
        return acc + getCodBarangAmount(curr);
      }
      return acc;
    }, 0);

    // 3. Total Kas Fisik di Tangan Kurir = Hak Ongkir Bersih + Setoran Uang Barang
    const totalKasDiTangan = totalHakOngkir + totalSetoranBarang;

    return {
      total,
      terkirim,
      otw,
      siapAntar,
      retur,
      totalOngkirKas: totalHakOngkir,
      totalHakOngkir,
      totalSetoranBarang,
      totalKasDiTangan,
    };
  }, [ordersInDateRange]);

  // Filter Data Akhir (Tanggal + Status Tab + Filter Tipe Layanan + Search Query)
  const filteredOrders = useMemo(() => {
    return ordersInDateRange.filter((order) => {
      // 1. Filter Tipe Layanan (Paket Ekspedisi vs Jastip Belanja)
      if (serviceFilter === 'paket' && order.jenis_barang !== 'paket_ekspedisi') {
        return false;
      }
      if (serviceFilter === 'jastip' && order.jenis_barang === 'paket_ekspedisi') {
        return false;
      }

      // 2. Filter Status
      if (statusFilter !== 'semua' && order.status_pengiriman !== statusFilter) {
        return false;
      }

      // 3. Filter Search
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
  }, [ordersInDateRange, serviceFilter, statusFilter, searchQuery]);

  // Tugas Antaran Mendesak untuk Tampilan Beranda (Di Jalan & Siap Antar)
  const activeTasks = useMemo(() => {
    return orders.filter(
      (o) => o.status_pengiriman === 'dalam_perjalanan' || o.status_pengiriman === 'diterima_hub'
    );
  }, [orders]);

  // Aksi Buka Form Input Paket Manual Langsung (Tanpa Kamera)
  const handleOpenManualInput = () => {
    stopKurirCamera();
    setScannerOpen(true);
    setScanStatus('not_found');
    setScannedResiInput(`RESI-${Date.now().toString().slice(-6)}`);
  };

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

  // ---------------------------------------------------------
  // AKSI: TUNDA PENGANTARAN KE BESOK HARI (POSTPONE DELIVERY)
  // ---------------------------------------------------------
  const openTundaDialog = (order) => {
    setTundaOrder(order);
    setTundaAlasan('🌧️ Cuaca Ekstrem / Hujan Lebat di Pelosok');
    setTundaCatatan('');
    setTundaSheetOpen(true);
  };

  const handleConfirmTunda = async () => {
    if (!tundaOrder) return;
    setTundaLoading(true);
    try {
      await orderService.postponeOrderToTomorrow(tundaOrder.id, {
        kurirId: profile?.id,
        alasanTunda,
        catatanTunda,
        currentDeskripsi: tundaOrder.deskripsi_barang,
      });

      setTundaSheetOpen(false);
      setTundaOrder(null);
      await loadKurirOrders();
      setFeedbackSheet({
        open: true,
        title: 'Pengantaran Ditunda ke Besok Hari ⏳',
        message: 'Paket berhasil disimpan dan dipindahkan ke status "Siap Antar" untuk jadwal pengantaran esok hari.',
      });
    } catch (err) {
      setFeedbackSheet({
        open: true,
        title: 'Gagal Menunda Paket',
        message: err.message || 'Terjadi kesalahan saat memproses penundaan paket.',
      });
    } finally {
      setTundaLoading(false);
    }
  };

  // ---------------------------------------------------------
  // AKSI: PENDAFTARAN PAKET BELUM TERDAFTAR (UNREGISTERED WORKFLOW)
  // ---------------------------------------------------------
  const handleSaveUnregisteredOrder = async (e) => {
    e?.preventDefault();
    if (!unregNama.trim()) {
      setFeedbackSheet({
        open: true,
        title: 'Nama Penerima Wajib Diisi',
        message: 'Silakan isi nama penerima yang tertera pada label fisik paket.',
      });
      return;
    }

    const selectedDesa = desaList.find((d) => d.id === unregDesaId) || desaList[0];
    const desaNama = selectedDesa ? selectedDesa.nama_desa : (profile?.alamat || 'Pelosok');

    setUnregSaving(true);
    try {
      const created = await orderService.createOrderByKurir({
        kurirId: profile?.id,
        nomorResi: scannedResiInput,
        ekspedisi: unregEkspedisi,
        namaPenerima: unregNama,
        noHp: unregHp,
        desaId: selectedDesa?.id || unregDesaId,
        desaNama: desaNama,
        detailAlamat: unregDetailAlamat,
        metodePembayaran: unregMetode,
        hargaBarang: unregHargaBarang,
        ongkirKurir: unregOngkirKurir,
      });

      playScanBeep();
      setFeedbackSheet({
        open: true,
        title: 'Paket Berhasil Didaftarkan! 🛵',
        message: `Paket resi ${scannedResiInput || created?.nomor_resi || ''} atas nama ${unregNama} berhasil dibuat dan langsung masuk antaran aktif "Dalam Perjalanan".`,
      });

      // Reset form
      setUnregNama('');
      setUnregHp('');
      setUnregDetailAlamat('');
      setUnregHargaBarang('');
      setUnregOngkirKurir('10000');
      handleCloseScanner();
      await loadKurirOrders();
    } catch (err) {
      setFeedbackSheet({
        open: true,
        title: 'Gagal Mendaftarkan Paket',
        message: err.message || 'Terjadi kesalahan saat mendaftarkan paket.',
      });
    } finally {
      setUnregSaving(false);
    }
  };

  const handleChatUnregWa = () => {
    if (!unregHp.trim()) {
      setFeedbackSheet({
        open: true,
        title: 'Nomor WhatsApp Belum Diisi',
        message: 'Masukkan nomor WhatsApp penerima terlebih dahulu untuk menghubungi customer.',
      });
      return;
    }
    const cleanHp = unregHp.trim().replace(/^0/, '62').replace(/[^0-9]/g, '');
    const selectedDesa = desaList.find((d) => d.id === unregDesaId);
    const desaNama = selectedDesa ? selectedDesa.nama_desa : (profile?.alamat || 'Pelosok');
    const kurirName = profile?.nama ? `saya ${profile.nama} (Kurir Pelosok Naringgul)` : 'saya kurir yang bertugas';
    const tagihanText =
      unregMetode === 'COD' && parseFloat(unregHargaBarang) > 0
        ? `Total COD Barang: Rp ${parseFloat(unregHargaBarang).toLocaleString('id-ID')} + Ongkir Kurir: Rp ${(parseFloat(unregOngkirKurir) || 10000).toLocaleString('id-ID')}`
        : `Ongkir Kurir: Rp ${(parseFloat(unregOngkirKurir) || 10000).toLocaleString('id-ID')} (Barang sudah lunas/transfer)`;

    const msg = `Halo Kak ${unregNama || ''} 👋\n${kurirName}.\n\nSaat ini ada paket ekspedisi *${unregEkspedisi}* milik Anda di hub kami dengan:\n🔖 No. Resi: *${scannedResiInput || '-'}*\n📍 Tujuan: ${unregDetailAlamat ? `${unregDetailAlamat}, ` : ''}Desa ${desaNama}\n💰 ${tagihanText}\n\nApakah paket ini bersedia diantar ke rumah Kakak hari ini? Mohon konfirmasinya ya Kak. Terima kasih! 🙏`;

    window.open(`https://wa.me/${cleanHp}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  // Helper Render Kartu Pesanan Lengkap (Re-usable di Tab Beranda & Tab Pesanan)
  const renderOrderCard = (order, idx) => {
    const meta = getDeliveryStatusMeta(order.status_pengiriman);
    const isDiHub = order.status_pengiriman === 'diterima_hub';
    const isOtw = order.status_pengiriman === 'dalam_perjalanan';
    const isTerkirim = order.status_pengiriman === 'terkirim';
    const isRetur = order.status_pengiriman === 'retur';

    const lat = parseFloat(order.customer?.latitude);
    const lng = parseFloat(order.customer?.longitude);
    const hasGps = !isNaN(lat) && !isNaN(lng);

    const isSelected = selectedOrder?.id === order.id;
    const isExpanded = expandedCards[order.id] !== undefined ? expandedCards[order.id] : defaultCardsExpanded;

    return (
      <Card
        key={order.id}
        id={`order-card-${order.id}`}
        padding="14px 16px"
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
        {/* Header Kartu: NAMA PENERIMA SEBAGAI JUDUL UTAMA + Status + Tombol Expand/Collapse */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div
            onClick={() => toggleCardExpand(order.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              flex: 1,
              minWidth: 0,
              cursor: 'pointer',
            }}
          >
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                background: isTerkirim ? '#16a34a' : isRetur ? '#dc2626' : isOtw ? '#2563eb' : '#f97316',
                color: '#ffffff',
                fontSize: '12px',
                fontWeight: '800',
                flexShrink: 0,
              }}
            >
              {isTerkirim ? '✓' : isRetur ? '↩' : idx + 1}
            </span>
            <div style={{ minWidth: 0, flex: 1 }}>
              <h4
                style={{
                  fontSize: '15px',
                  fontWeight: '900',
                  color: 'var(--color-text-main)',
                  margin: 0,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                👤 {order.customer?.nama || 'Penerima Paket'}
              </h4>
              <div style={{ fontSize: '11px', color: 'var(--color-text-dim)', fontWeight: '600', marginTop: '1px' }}>
                <span>Resi: <b>{order.nomor_resi || `Order #${order.id.slice(0, 8)}`}</b></span>
                {order.alamat_tujuan && (
                  <span style={{ marginLeft: '6px', opacity: 0.85 }}>
                    • {order.alamat_tujuan.split(',')[0]}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
            <Badge variant={meta.variant}>{meta.label}</Badge>
            <button
              type="button"
              onClick={() => toggleCardExpand(order.id)}
              title={isExpanded ? 'Kecilkan data paket ini' : 'Besarkan detail data paket ini'}
              style={{
                background: 'var(--color-bg-input)',
                border: '1px solid var(--color-border)',
                borderRadius: '6px',
                padding: '4px 8px',
                fontSize: '11px',
                fontWeight: '700',
                color: 'var(--color-text-muted)',
                cursor: 'pointer',
              }}
            >
              {isExpanded ? '▲' : '▼'}
            </button>
          </div>
        </div>

        {/* DETAIL KARTU (Hanya Muncul Saat Mode Diperbesar / Expanded) */}
        {isExpanded && (
          <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid rgba(82,99,90,0.1)' }}>
            <div
              style={{
                marginBottom: '10px',
                padding: '10px',
                borderRadius: 'var(--radius-sm)',
                background: isRetur ? '#ffffff' : 'var(--color-bg-input)',
                boxShadow: 'var(--skeuo-input-sunken)',
                fontSize: '12.5px',
                lineHeight: '1.5',
              }}
            >
              <div>
                <b>📍 Alamat Lengkap:</b> {order.alamat_tujuan}
              </div>
              <div style={{ marginTop: '2px' }}>
                <b>📦 Deskripsi Barang:</b> {order.deskripsi_barang}
              </div>

              {/* Keterangan Pembayaran & Ongkir Kurir */}
              <div style={{ marginTop: '6px', paddingTop: '6px', borderTop: '1px solid rgba(82,99,90,0.1)' }}>
                {isRetur ? (
                  <div>
                    <b>Status Retur:</b>{' '}
                    <span style={{ color: '#dc2626', fontWeight: '800' }}>
                      ↩️ Paket Dikembalikan ke Hub
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
                    {order.metode_pembayaran !== 'COD' && (
                      <div style={{ fontSize: '11.5px', color: '#166534', fontWeight: '700', marginTop: '2px' }}>
                        💰 Tagih Ongkir Kurir Tunai: Rp ${(order.ongkir_patokan || 0).toLocaleString('id-ID')}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Tombol Navigasi Google Maps & WhatsApp */}
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
                    generateWaMessage(order)
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
                <div>
                  {(order.deskripsi_barang || '').includes('[TUNDA BESOK') && (
                    <div
                      style={{
                        fontSize: '11px',
                        color: '#b45309',
                        background: '#fffbeb',
                        border: '1px solid #fde68a',
                        padding: '5px 8px',
                        borderRadius: '6px',
                        marginBottom: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <span>⏳</span>
                      <span><b>Ditunda dari hari sebelumnya:</b> Siap untuk diantar kembali hari ini.</span>
                    </div>
                  )}
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
                </div>
              )}

              {isOtw && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => {
                      setSelectedOrder(order);
                      setCodAmount(order.ongkir_patokan > 0 ? String(order.ongkir_patokan) : '');
                      setSelesaiSheetOpen(true);
                    }}
                    style={{ width: '100%', height: '38px', fontSize: '13px', fontWeight: '800' }}
                  >
                    ✅ Selesai Antar (Sampai Tujuan)
                  </Button>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openTundaDialog(order)}
                      style={{
                        flex: 1,
                        color: '#b45309',
                        borderColor: '#fde68a',
                        background: '#fffbeb',
                        fontWeight: '700',
                      }}
                    >
                      ⏳ Tunda Besok
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openReturDialog(order)}
                      style={{
                        flex: 1,
                        color: '#dc2626',
                        borderColor: '#fca5a5',
                        background: '#fef2f2',
                        fontWeight: '700',
                      }}
                    >
                      ↩️ Retur Paket
                    </Button>
                  </div>
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
          </div>
        )}
      </Card>
    );
  };

  return (
    <div className="app-container" style={{ paddingBottom: '120px' }}>
      {/* 1. Header Minimalis & Clean ala Customer */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px',
          padding: '4px 2px',
        }}
      >
        {/* Sapaan Kurir & Wilayah Antaran (Klik membuka Sidebar Profil) */}
        <div
          onClick={() => setSidebarOpen(true)}
          style={{
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
          }}
          title="Buka Menu Akun & Profil Kurir"
        >
          <span
            style={{
              fontSize: '16.5px',
              fontWeight: '900',
              color: 'var(--color-text-main)',
              letterSpacing: '-0.3px',
              maxWidth: '220px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            Halo, {profile?.nama || 'Mitra Kurir'}! 🛵
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
            <span style={{ fontSize: '11px' }}>📍</span>
            <span
              style={{
                fontSize: '11.5px',
                fontWeight: '600',
                color: 'var(--color-text-muted)',
                maxWidth: '200px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {profile?.alamat || 'Semua Wilayah'} {profile?.nomor_dana ? `• DANA: ${profile.nomor_dana}` : ''}
            </span>
            <span style={{ fontSize: '10px', color: 'var(--color-primary)', fontWeight: '700' }}>▾</span>
          </div>
        </div>

        {/* Action Buttons Kanan: GPS Tracker + Avatar Profil */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Toggle GPS */}
          <button
            onClick={toggleGpsTracking}
            title={trackingGps ? 'GPS Aktif (Klik untuk matikan)' : 'Nyalakan GPS Kurir'}
            style={{
              background: trackingGps ? 'rgba(34, 197, 94, 0.15)' : 'var(--color-bg-card)',
              border: trackingGps ? '1.5px solid #22c55e' : '1px solid var(--color-border)',
              borderRadius: '20px',
              color: trackingGps ? '#15803d' : 'var(--color-text-muted)',
              padding: '6px 12px',
              fontSize: '11.5px',
              fontWeight: '800',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
            }}
          >
            <span>{trackingGps ? '🟢' : '📍'}</span>
            <span>{trackingGps ? 'GPS ON' : 'GPS'}</span>
          </button>

          {/* Avatar Profil Kurir -> Klik Buka Sidebar Profil */}
          <button
            onClick={() => setSidebarOpen(true)}
            title="Buka Menu Akun & Profil Kurir"
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
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '2px solid var(--color-primary)',
                  boxShadow: 'var(--skeuo-button-raised)',
                }}
              />
            ) : (
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--color-primary-light) 0%, var(--color-primary) 100%)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px',
                  fontWeight: '800',
                  boxShadow: 'var(--skeuo-button-raised)',
                  border: '2px solid rgba(255,255,255,0.6)',
                }}
              >
                {profile?.nama ? profile.nama.charAt(0).toUpperCase() : '🛵'}
              </div>
            )}
            {/* Dot Status Hijau */}
            <span
              style={{
                position: 'absolute',
                bottom: '0',
                right: '0',
                width: '9px',
                height: '9px',
                borderRadius: '50%',
                background: '#22c55e',
                border: '2px solid var(--color-bg-base)',
              }}
            />
          </button>
        </div>
      </div>

      {/* ==================================================== */}
      {/* 2. TAB 1: BERANDA KURIR                             */}
      {/* ==================================================== */}
      {activeTab === 'beranda' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Quick Actions Grid (4 Tombol Aksi Cepat) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
            {/* 1. Scan Barcode */}
            <button
              type="button"
              onClick={() => {
                setScannerOpen(true);
                startKurirCamera();
              }}
              style={{
                background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '12px',
                padding: '12px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                cursor: 'pointer',
                boxShadow: '0 4px 10px rgba(5, 150, 105, 0.3)',
                textAlign: 'left',
              }}
            >
              <span style={{ fontSize: '24px' }}>📷</span>
              <div>
                <div style={{ fontSize: '13px', fontWeight: '800' }}>Scan Barcode</div>
                <div style={{ fontSize: '10.5px', opacity: 0.9 }}>Scan resi fisik</div>
              </div>
            </button>

            {/* 2. Input Paket Manual */}
            <button
              type="button"
              onClick={handleOpenManualInput}
              style={{
                background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '12px',
                padding: '12px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                cursor: 'pointer',
                boxShadow: '0 4px 10px rgba(2, 132, 199, 0.3)',
                textAlign: 'left',
              }}
            >
              <span style={{ fontSize: '24px' }}>📝</span>
              <div>
                <div style={{ fontSize: '13px', fontWeight: '800' }}>Input Manual</div>
                <div style={{ fontSize: '10.5px', opacity: 0.9 }}>Paket tak terdaftar</div>
              </div>
            </button>

            {/* 3. Peta & Rute Satelit */}
            <button
              type="button"
              onClick={() => setShowMap(!showMap)}
              style={{
                background: showMap
                  ? 'linear-gradient(135deg, #475569 0%, #334155 100%)'
                  : 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
                color: showMap ? '#ffffff' : 'var(--color-text-main)',
                border: '1px solid var(--color-border)',
                borderRadius: '12px',
                padding: '12px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                cursor: 'pointer',
                boxShadow: 'var(--skeuo-button-raised)',
                textAlign: 'left',
              }}
            >
              <span style={{ fontSize: '24px' }}>🗺️</span>
              <div>
                <div style={{ fontSize: '13px', fontWeight: '800' }}>
                  {showMap ? 'Tutup Peta' : 'Peta Satelit'}
                </div>
                <div style={{ fontSize: '10.5px', opacity: 0.85 }}>Rute GPS Pelosok</div>
              </div>
            </button>

            {/* 4. Layanan Jastip */}
            <button
              type="button"
              onClick={() => {
                setServiceFilter('jastip');
                setActiveTab('pesanan');
                navigate('/dashboard-kurir?tab=pesanan&tipe=jastip');
              }}
              style={{
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '12px',
                padding: '12px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                cursor: 'pointer',
                boxShadow: '0 4px 10px rgba(217, 119, 6, 0.3)',
                textAlign: 'left',
              }}
            >
              <span style={{ fontSize: '24px' }}>🛍️</span>
              <div>
                <div style={{ fontSize: '13px', fontWeight: '800' }}>Layanan Jastip</div>
                <div style={{ fontSize: '10.5px', opacity: 0.9 }}>Titip belanja warga</div>
              </div>
            </button>
          </div>

          {/* Ringkasan Hari Ini & Kas Harian */}
          <Card
            padding="14px 16px"
            style={{
              background: 'var(--color-bg-card)',
              border: '1px solid var(--color-border)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '15px' }}>📊</span>
                <h3 style={{ fontSize: '14px', fontWeight: '800', color: 'var(--color-text-main)', margin: 0 }}>
                  Ringkasan Antaran & Kas
                </h3>
              </div>

              {/* Group Filter Tanggal & Filter Desa */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                {/* Tombol Pemicu BottomSheet Filter Periode Waktu */}
                <button
                  type="button"
                  onClick={() => setDateFilterSheetOpen(true)}
                  style={{
                    background: 'var(--color-bg-input)',
                    border: '1.5px solid var(--color-border)',
                    borderRadius: '20px',
                    padding: '5px 10px',
                    fontSize: '11px',
                    fontWeight: '700',
                    color: 'var(--color-text-main)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    boxShadow: 'var(--skeuo-button-raised)',
                  }}
                >
                  <span>📅</span>
                  <span>{getDateFilterLabel(dateFilter)}</span>
                  <span style={{ fontSize: '9px', opacity: 0.6 }}>▾</span>
                </button>

                {/* Tombol Pemicu BottomSheet Filter Desa */}
                <button
                  type="button"
                  onClick={() => setDesaFilterSheetOpen(true)}
                  style={{
                    background: desaFilter !== 'semua' ? 'rgba(34, 197, 94, 0.12)' : 'var(--color-bg-input)',
                    border: desaFilter !== 'semua' ? '1.5px solid #22c55e' : '1.5px solid var(--color-border)',
                    borderRadius: '20px',
                    padding: '5px 10px',
                    fontSize: '11px',
                    fontWeight: '700',
                    color: desaFilter !== 'semua' ? '#15803d' : 'var(--color-text-main)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    boxShadow: 'var(--skeuo-button-raised)',
                  }}
                >
                  <span>🏡</span>
                  <span>{desaFilter === 'semua' ? 'Semua Desa' : `Desa ${desaFilter}`}</span>
                  <span style={{ fontSize: '9px', opacity: 0.6 }}>▾</span>
                </button>
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

            {/* Transparansi Arus Kas Kurir & Setoran Hub */}
            <div
              style={{
                background: 'linear-gradient(135deg, #f8fafc 0%, #f0fdf4 100%)',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                padding: '10px 12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--color-text-dim)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                  💰 Arus Kas & Setoran
                </span>
                <span style={{ fontSize: '11px', color: 'var(--color-text-dim)' }}>
                  Total Fisik: <b style={{ color: 'var(--color-text-main)', fontSize: '12px' }}>{formatRupiah(stats.totalKasDiTangan)}</b>
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {/* Hak Bersih Kurir (Ongkir) */}
                <div
                  style={{
                    background: '#ecfdf5',
                    border: '1px solid #a7f3d0',
                    borderRadius: '7px',
                    padding: '8px 10px',
                  }}
                >
                  <div style={{ fontSize: '10.5px', color: '#047857', fontWeight: '700' }}>
                    💵 Hak Bersih Kurir
                  </div>
                  <div style={{ fontSize: '14.5px', fontWeight: '900', color: '#065f46', marginTop: '2px' }}>
                    {formatRupiah(stats.totalHakOngkir)}
                  </div>
                  <div style={{ fontSize: '9.5px', color: '#059669', marginTop: '1px' }}>
                    Ongkir terkirim + retur
                  </div>
                </div>

                {/* Setoran Uang Barang ke Hub */}
                <div
                  style={{
                    background: '#eff6ff',
                    border: '1px solid #bfdbfe',
                    borderRadius: '7px',
                    padding: '8px 10px',
                  }}
                >
                  <div style={{ fontSize: '10.5px', color: '#1d4ed8', fontWeight: '700' }}>
                    🏢 Setor ke Hub
                  </div>
                  <div style={{ fontSize: '14.5px', fontWeight: '900', color: '#1e40af', marginTop: '2px' }}>
                    {formatRupiah(stats.totalSetoranBarang)}
                  </div>
                  <div style={{ fontSize: '9.5px', color: '#2563eb', marginTop: '1px' }}>
                    Titipan COD barang
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Peta Satelit (Bila toggle peta aktif) */}
          {showMap && (
            <div>
              <DeliveryMap
                orders={ordersInDateRange}
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

          {/* Tugas Antaran Mendesak Hari Ini */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '14px' }}>⚡</span>
                <h3 style={{ fontSize: '13.5px', fontWeight: '800', color: 'var(--color-text-main)', margin: 0 }}>
                  Tugas Antaran Mendesak ({activeTasks.length})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('pesanan');
                  navigate('/dashboard-kurir?tab=pesanan');
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '11.5px',
                  fontWeight: '700',
                  color: 'var(--color-primary)',
                  cursor: 'pointer',
                }}
              >
                Lihat Semua ({orders.length}) →
              </button>
            </div>

            {loading ? (
              <SkeletonLoader type="list" count={2} />
            ) : activeTasks.length === 0 ? (
              <Card style={{ textAlign: 'center', padding: '26px 16px' }}>
                <div style={{ fontSize: '32px', marginBottom: '6px' }}>🎉</div>
                <h4 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--color-text-main)' }}>
                  Tidak Ada Antaran Aktif Saat Ini
                </h4>
                <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                  Semua tugas pengantaran selesai atau belum ada paket diambil. Gunakan tombol <b>Scan Barcode</b> atau <b>Input Manual</b> untuk mulai membawa antaran baru.
                </p>
              </Card>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {activeTasks.slice(0, 3).map((order, idx) => renderOrderCard(order, idx))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* 3. TAB 2: MANAJEMEN PESANAN KURIR                   */}
      {/* ==================================================== */}
      {activeTab === 'pesanan' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Header Pesanan */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: '900', color: 'var(--color-text-main)', margin: 0 }}>
                📦 Manajemen Pesanan
              </h2>
              <div style={{ fontSize: '11.5px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                Kelola paket ekspedisi & pesanan jastip warga
              </div>
            </div>

            {/* Tombol Besarkan / Kecilkan Semua */}
            <button
              type="button"
              onClick={toggleAllCardsExpand}
              style={{
                background: 'var(--color-bg-card)',
                border: '1px solid var(--color-border)',
                borderRadius: '8px',
                padding: '4px 10px',
                fontSize: '11px',
                fontWeight: '700',
                color: 'var(--color-primary-dark)',
                cursor: 'pointer',
                boxShadow: 'var(--skeuo-button-raised)',
              }}
            >
              {defaultCardsExpanded ? '▲ Kecilkan' : '▼ Besarkan'}
            </button>
          </div>

          {/* Filter Tipe Layanan (Semua | Paket | Jastip) */}
          <div
            style={{
              display: 'flex',
              background: 'var(--color-bg-input)',
              padding: '3px',
              borderRadius: '10px',
              border: '1px solid var(--color-border)',
              gap: '4px',
            }}
          >
            {[
              { id: 'semua', label: 'Semua Layanan' },
              { id: 'paket', label: '📦 Paket Ekspedisi' },
              { id: 'jastip', label: '🛍️ Jastip Belanja' },
            ].map((btn) => (
              <button
                key={btn.id}
                onClick={() => setServiceFilter(btn.id)}
                style={{
                  flex: 1,
                  padding: '7px 4px',
                  fontSize: '11.5px',
                  fontWeight: '700',
                  borderRadius: '7px',
                  border: 'none',
                  cursor: 'pointer',
                  background: serviceFilter === btn.id ? 'var(--color-primary)' : 'transparent',
                  color: serviceFilter === btn.id ? '#ffffff' : 'var(--color-text-dim)',
                  transition: 'all 0.15s ease',
                  whiteSpace: 'nowrap',
                }}
              >
                {btn.label}
              </button>
            ))}
          </div>

          {/* Search Bar Input */}
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="Cari nama penerima, nomor resi, alamat..."
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
                boxSizing: 'border-box',
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

          {/* Quick Filter: Periode Tanggal & Filter Desa Pelosok */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setDateFilterSheetOpen(true)}
              style={{
                background: 'var(--color-bg-card)',
                border: '1.5px solid var(--color-border)',
                borderRadius: '20px',
                padding: '6px 12px',
                fontSize: '11.5px',
                fontWeight: '700',
                color: 'var(--color-text-main)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                boxShadow: 'var(--skeuo-button-raised)',
              }}
            >
              <span>📅</span>
              <span>{getDateFilterLabel(dateFilter)}</span>
              <span style={{ fontSize: '9px', opacity: 0.6 }}>▾</span>
            </button>

            <button
              type="button"
              onClick={() => setDesaFilterSheetOpen(true)}
              style={{
                background: desaFilter !== 'semua' ? 'rgba(34, 197, 94, 0.12)' : 'var(--color-bg-card)',
                border: desaFilter !== 'semua' ? '1.5px solid #22c55e' : '1.5px solid var(--color-border)',
                borderRadius: '20px',
                padding: '6px 12px',
                fontSize: '11.5px',
                fontWeight: '700',
                color: desaFilter !== 'semua' ? '#15803d' : 'var(--color-text-main)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                boxShadow: 'var(--skeuo-button-raised)',
              }}
            >
              <span>🏡</span>
              <span>{desaFilter === 'semua' ? 'Semua Desa' : `Desa ${desaFilter}`}</span>
              <span style={{ fontSize: '9px', opacity: 0.6 }}>▾</span>
            </button>
          </div>

          {/* Status Filter Chips (Pill Rounded) */}
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
                    background: isActive ? 'var(--color-primary)' : 'var(--color-bg-card)',
                    color: isActive ? '#ffffff' : 'var(--color-text-main)',
                    border: isActive ? 'none' : '1px solid var(--color-border)',
                    padding: '6px 12px',
                    borderRadius: '20px',
                    fontSize: '11.5px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    whiteSpace: 'nowrap',
                    boxShadow: isActive ? '0 2px 6px rgba(18, 48, 30, 0.2)' : 'none',
                  }}
                >
                  <span>{chip.label}</span>
                  <span
                    style={{
                      background: isActive ? 'rgba(255, 255, 255, 0.25)' : 'var(--color-bg-input)',
                      color: isActive ? '#ffffff' : 'var(--color-text-muted)',
                      padding: '1px 6px',
                      borderRadius: '10px',
                      fontSize: '10px',
                      fontWeight: '800',
                    }}
                  >
                    {chip.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Orders List */}
          {loading ? (
            <SkeletonLoader type="list" count={3} />
          ) : filteredOrders.length === 0 ? (
            <Card style={{ textAlign: 'center', padding: '36px 20px' }}>
              <div style={{ fontSize: '42px', marginBottom: '10px' }}>🌴</div>
              <h4 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--color-text-main)' }}>
                Tidak ada paket yang sesuai
              </h4>
              <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                {searchQuery
                  ? `Tidak ditemukan hasil untuk "${searchQuery}". Coba kata kunci lain.`
                  : 'Belum ada antaran pada filter yang Anda pilih saat ini.'}
              </p>
              {(statusFilter !== 'semua' || searchQuery || serviceFilter !== 'semua') && (
                <div style={{ marginTop: '12px' }}>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setStatusFilter('semua');
                      setServiceFilter('semua');
                      setSearchQuery('');
                    }}
                  >
                    Reset Semua Filter
                  </Button>
                </div>
              )}
            </Card>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {filteredOrders.map((order, idx) => renderOrderCard(order, idx))}
            </div>
          )}
        </div>
      )}

      {/* ==================================================== */}
      {/* 4. TAB 3: KEUANGAN & REKONSILIASI KAS KURIR          */}
      {/* ==================================================== */}
      {activeTab === 'keuangan' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Header Keuangan */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: '900', color: 'var(--color-text-main)', margin: 0 }}>
                💰 Keuangan & Setoran Hub
              </h2>
              <div style={{ fontSize: '11.5px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                Rekonsiliasi ongkir kurir dan titipan COD barang
              </div>
            </div>
              {/* Tombol Pemicu BottomSheet Filter Periode Waktu */}
              <button
                type="button"
                onClick={() => setDateFilterSheetOpen(true)}
                style={{
                  background: 'var(--color-bg-input)',
                  border: '1.5px solid var(--color-border)',
                  borderRadius: '20px',
                  padding: '5px 12px',
                  fontSize: '11.5px',
                  fontWeight: '700',
                  color: 'var(--color-text-main)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  boxShadow: 'var(--skeuo-button-raised)',
                }}
              >
                <span>📅</span>
                <span>{getDateFilterLabel(dateFilter)}</span>
                <span style={{ fontSize: '10px', opacity: 0.6 }}>▾</span>
              </button>
          </div>

          {/* 3 Kotak Finansial Besar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {/* 1. Hak Bersih Kurir */}
            <Card padding="14px 16px" style={{ background: '#ecfdf5', border: '1.5px solid #a7f3d0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: '800', color: '#047857' }}>
                    💵 HAK ONGKIR BERSIH KURIR
                  </div>
                  <div style={{ fontSize: '11px', color: '#059669', marginTop: '2px' }}>
                    Total pendapatan sah ongkir Anda (terkirim + kompensasi retur)
                  </div>
                </div>
                <div style={{ fontSize: '20px', fontWeight: '900', color: '#065f46' }}>
                  {formatRupiah(stats.totalHakOngkir)}
                </div>
              </div>
            </Card>

            {/* 2. Setoran Uang Barang ke Hub */}
            <Card padding="14px 16px" style={{ background: '#eff6ff', border: '1.5px solid #bfdbfe' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: '800', color: '#1d4ed8' }}>
                    🏢 SETORAN COD BARANG KE HUB
                  </div>
                  <div style={{ fontSize: '11px', color: '#2563eb', marginTop: '2px' }}>
                    Titipan uang nilai barang COD yang wajib disetor ke Hub
                  </div>
                </div>
                <div style={{ fontSize: '20px', fontWeight: '900', color: '#1e40af' }}>
                  {formatRupiah(stats.totalSetoranBarang)}
                </div>
              </div>
            </Card>

            {/* 3. Total Kas Fisik di Dompet */}
            <Card padding="14px 16px" style={{ background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)', border: '1.5px solid #fde68a' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: '800', color: '#b45309' }}>
                    👛 TOTAL UANG TUNAI DI TANGAN
                  </div>
                  <div style={{ fontSize: '11px', color: '#92400e', marginTop: '2px' }}>
                    Fisik uang tunai yang harus ada di dompet/kantong Anda
                  </div>
                </div>
                <div style={{ fontSize: '22px', fontWeight: '900', color: '#78350f' }}>
                  {formatRupiah(stats.totalKasDiTangan)}
                </div>
              </div>
            </Card>
          </div>

          {/* Riwayat Transaksi per Paket */}
          <div style={{ marginTop: '8px' }}>
            <h3 style={{ fontSize: '13.5px', fontWeight: '800', color: 'var(--color-text-main)', marginBottom: '8px' }}>
              📋 Rincian Transaksi per Paket
            </h3>

            {ordersInDateRange.filter((o) => o.status_pengiriman === 'terkirim' || o.status_pengiriman === 'retur').length === 0 ? (
              <Card style={{ textAlign: 'center', padding: '24px 16px' }}>
                <div style={{ fontSize: '32px', marginBottom: '6px' }}>🧾</div>
                <h4 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--color-text-main)' }}>
                  Belum Ada Transaksi Selesai
                </h4>
                <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                  Transaksi penerimaan kas akan otomatis tercatat setelah paket berhasil Anda antar atau diretur.
                </p>
              </Card>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {ordersInDateRange
                  .filter((o) => o.status_pengiriman === 'terkirim' || o.status_pengiriman === 'retur')
                  .map((order) => {
                    const isRetur = order.status_pengiriman === 'retur';
                    const ongkirVal = parseFloat(order.ongkir_diterima) || parseFloat(order.ongkir_patokan) || 0;
                    const barangCod = isRetur ? 0 : getCodBarangAmount(order);

                    return (
                      <Card
                        key={order.id}
                        padding="10px 14px"
                        style={{
                          background: 'var(--color-bg-card)',
                          border: isRetur ? '1px solid #fecaca' : '1px solid var(--color-border)',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--color-text-main)' }}>
                              👤 {order.customer?.nama || 'Penerima Paket'}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                              Resi: <b>{order.nomor_resi || '-'}</b> • {order.alamat_tujuan?.split(',')[0]}
                            </div>
                          </div>
                          <Badge variant={isRetur ? 'danger' : 'success'}>
                            {isRetur ? 'Retur' : 'Terkirim'}
                          </Badge>
                        </div>

                        <div
                          style={{
                            marginTop: '8px',
                            paddingTop: '6px',
                            borderTop: '1px dashed var(--color-border)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            fontSize: '11.5px',
                          }}
                        >
                          <span style={{ color: '#047857', fontWeight: '700' }}>
                            Hak Ongkir: {formatRupiah(ongkirVal)}
                          </span>
                          {barangCod > 0 && (
                            <span style={{ color: '#1d4ed8', fontWeight: '700' }}>
                              Setor COD: {formatRupiah(barangCod)}
                            </span>
                          )}
                        </div>
                      </Card>
                    );
                  })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bottom Sheet Filter Periode Waktu Fleksibel (Hari, Bulan, Tahun, Semua) */}
      <BottomSheet
        isOpen={dateFilterSheetOpen}
        onClose={() => setDateFilterSheetOpen(false)}
        title="📅 Pilih Periode Waktu"
      >
        <div style={{ padding: '8px 0 18px 0', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Tab Segmented: Hari, Bulan, Tahun, Semua */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              background: 'var(--color-bg-input)',
              borderRadius: '12px',
              padding: '4px',
              border: '1px solid var(--color-border)',
              gap: '4px',
            }}
          >
            {[
              { id: 'hari', label: 'Hari', icon: '⚡' },
              { id: 'bulan', label: 'Bulan', icon: '🗓️' },
              { id: 'tahun', label: 'Tahun', icon: '📊' },
              { id: 'semua', label: 'Semua', icon: '🌐' },
            ].map((tab) => {
              const active = tempDateMode === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setTempDateMode(tab.id)}
                  style={{
                    padding: '8px 4px',
                    borderRadius: '8px',
                    border: 'none',
                    background: active ? 'var(--color-primary)' : 'transparent',
                    color: active ? '#ffffff' : 'var(--color-text-muted)',
                    fontSize: '12px',
                    fontWeight: active ? '800' : '600',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '2px',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span style={{ fontSize: '14px' }}>{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Mode Tab 1: Hari (Hari Ini, Kemarin, atau Pilih Tanggal Spesifik) */}
          {tempDateMode === 'hari' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setDateFilter('hari_ini');
                    setDateFilterSheetOpen(false);
                  }}
                  style={{
                    padding: '12px 8px',
                    borderRadius: '10px',
                    border: dateFilter === 'hari_ini' ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                    background: dateFilter === 'hari_ini' ? '#ecfdf5' : 'var(--color-bg-card)',
                    color: dateFilter === 'hari_ini' ? 'var(--color-primary-dark)' : 'var(--color-text-main)',
                    fontSize: '12.5px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                >
                  <span>⚡ Hari Ini (Default)</span>
                  {dateFilter === 'hari_ini' && <span style={{ color: 'var(--color-primary)' }}>✓</span>}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDateFilter('kemarin');
                    setDateFilterSheetOpen(false);
                  }}
                  style={{
                    padding: '12px 8px',
                    borderRadius: '10px',
                    border: dateFilter === 'kemarin' ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                    background: dateFilter === 'kemarin' ? '#ecfdf5' : 'var(--color-bg-card)',
                    color: dateFilter === 'kemarin' ? 'var(--color-primary-dark)' : 'var(--color-text-main)',
                    fontSize: '12.5px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                >
                  <span>📆 Kemarin</span>
                  {dateFilter === 'kemarin' && <span style={{ color: 'var(--color-primary)' }}>✓</span>}
                </button>
              </div>

              {/* Input Tanggal Kalender (Pilih Tgl, Bln, Thn) */}
              <div
                style={{
                  background: 'var(--color-bg-card)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '12px',
                  padding: '12px',
                }}
              >
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '800', color: 'var(--color-text-muted)', marginBottom: '6px' }}>
                  Atau Pilih Tanggal Spesifik (Tgl, Bln, Thn):
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="date"
                    value={tempCustomDate}
                    onChange={(e) => setTempCustomDate(e.target.value)}
                    style={{
                      flex: 1,
                      height: '42px',
                      padding: '0 12px',
                      borderRadius: '8px',
                      border: '1.5px solid var(--color-border)',
                      background: 'var(--color-bg-input)',
                      color: 'var(--color-text-main)',
                      fontSize: '13px',
                      fontWeight: '700',
                    }}
                  />
                  <Button
                    type="button"
                    onClick={() => {
                      if (tempCustomDate) {
                        setDateFilter(`hari:${tempCustomDate}`);
                        setDateFilterSheetOpen(false);
                      }
                    }}
                    style={{ height: '42px', padding: '0 14px', fontSize: '12.5px', whiteSpace: 'nowrap' }}
                  >
                    Terapkan
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Mode Tab 2: Bulan (Pilih Bulan dan Tahun) */}
          {tempDateMode === 'bulan' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div
                style={{
                  background: 'var(--color-bg-card)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '12px',
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '8px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '800', color: 'var(--color-text-muted)', marginBottom: '5px' }}>
                      Pilih Bulan:
                    </label>
                    <select
                      value={tempMonth}
                      onChange={(e) => setTempMonth(parseInt(e.target.value))}
                      style={{
                        width: '100%',
                        height: '42px',
                        padding: '0 10px',
                        borderRadius: '8px',
                        border: '1.5px solid var(--color-border)',
                        background: 'var(--color-bg-input)',
                        color: 'var(--color-text-main)',
                        fontSize: '13px',
                        fontWeight: '700',
                      }}
                    >
                      {NAMA_BULAN.map((nama, idx) => (
                        <option key={idx + 1} value={idx + 1}>
                          {nama}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '800', color: 'var(--color-text-muted)', marginBottom: '5px' }}>
                      Pilih Tahun:
                    </label>
                    <select
                      value={tempYear}
                      onChange={(e) => setTempYear(parseInt(e.target.value))}
                      style={{
                        width: '100%',
                        height: '42px',
                        padding: '0 10px',
                        borderRadius: '8px',
                        border: '1.5px solid var(--color-border)',
                        background: 'var(--color-bg-input)',
                        color: 'var(--color-text-main)',
                        fontSize: '13px',
                        fontWeight: '700',
                      }}
                    >
                      {[2024, 2025, 2026, 2027, 2028].map((y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <Button
                  type="button"
                  onClick={() => {
                    const mPad = String(tempMonth).padStart(2, '0');
                    setDateFilter(`bulan:${tempYear}-${mPad}`);
                    setDateFilterSheetOpen(false);
                  }}
                  style={{ width: '100%', height: '42px', fontSize: '13px', fontWeight: '800' }}
                >
                  🗓️ Terapkan Periode Bulanan
                </Button>
              </div>
            </div>
          )}

          {/* Mode Tab 3: Tahun (Pilih Tahun) */}
          {tempDateMode === 'tahun' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div
                style={{
                  background: 'var(--color-bg-card)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '12px',
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '800', color: 'var(--color-text-muted)', marginBottom: '5px' }}>
                    Pilih Tahun:
                  </label>
                  <select
                    value={tempYear}
                    onChange={(e) => setTempYear(parseInt(e.target.value))}
                    style={{
                      width: '100%',
                      height: '42px',
                      padding: '0 12px',
                      borderRadius: '8px',
                      border: '1.5px solid var(--color-border)',
                      background: 'var(--color-bg-input)',
                      color: 'var(--color-text-main)',
                      fontSize: '13.5px',
                      fontWeight: '700',
                    }}
                  >
                    {[2024, 2025, 2026, 2027, 2028, 2029, 2030].map((y) => (
                      <option key={y} value={y}>
                        Tahun {y}
                      </option>
                    ))}
                  </select>
                </div>

                <Button
                  type="button"
                  onClick={() => {
                    setDateFilter(`tahun:${tempYear}`);
                    setDateFilterSheetOpen(false);
                  }}
                  style={{ width: '100%', height: '42px', fontSize: '13px', fontWeight: '800' }}
                >
                  📊 Terapkan Periode Tahunan
                </Button>
              </div>
            </div>
          )}

          {/* Mode Tab 4: Semua Waktu */}
          {tempDateMode === 'semua' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <Button
                type="button"
                onClick={() => {
                  setDateFilter('semua');
                  setDateFilterSheetOpen(false);
                }}
                style={{ width: '100%', height: '44px', fontSize: '13px', fontWeight: '800' }}
              >
                🌐 Tampilkan Riwayat Semua Waktu
              </Button>
            </div>
          )}
        </div>
      </BottomSheet>

      {/* Bottom Sheet Filter Wilayah Desa Pelosok */}
      <BottomSheet
        isOpen={desaFilterSheetOpen}
        onClose={() => setDesaFilterSheetOpen(false)}
        title="🏡 Filter Berdasarkan Wilayah Desa"
      >
        <div style={{ padding: '8px 0 18px 0', display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '60vh', overflowY: 'auto' }}>
          {/* Opsi Semua Desa */}
          <button
            type="button"
            onClick={() => {
              setDesaFilter('semua');
              setDesaFilterSheetOpen(false);
            }}
            style={{
              width: '100%',
              padding: '12px 14px',
              borderRadius: '10px',
              border: desaFilter === 'semua' ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
              background: desaFilter === 'semua' ? '#ecfdf5' : 'var(--color-bg-card)',
              color: desaFilter === 'semua' ? 'var(--color-primary-dark)' : 'var(--color-text-main)',
              fontSize: '13px',
              fontWeight: desaFilter === 'semua' ? '800' : '600',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '16px' }}>🌐</span>
              <span>Semua Desa (Seluruh Wilayah)</span>
            </span>
            {desaFilter === 'semua' && <span style={{ color: 'var(--color-primary)', fontWeight: '900' }}>✓</span>}
          </button>

          {/* 11 Desa Naringgul */}
          {NARINGGUL_VILLAGES.map((desaNama) => {
            const isSelected = desaFilter.toLowerCase() === desaNama.toLowerCase();
            const count = orders.filter((o) => {
              const target = desaNama.toLowerCase();
              return (
                (o.alamat_tujuan || '').toLowerCase().includes(target) ||
                (o.customer?.alamat || '').toLowerCase().includes(target) ||
                (o.deskripsi_barang || '').toLowerCase().includes(target)
              );
            }).length;

            return (
              <button
                key={desaNama}
                type="button"
                onClick={() => {
                  setDesaFilter(desaNama);
                  setDesaFilterSheetOpen(false);
                }}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: isSelected ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                  background: isSelected ? '#ecfdf5' : 'var(--color-bg-card)',
                  color: isSelected ? 'var(--color-primary-dark)' : 'var(--color-text-main)',
                  fontSize: '13px',
                  fontWeight: isSelected ? '800' : '600',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '16px' }}>🏡</span>
                  <span>Desa {desaNama}</span>
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {count > 0 && (
                    <span
                      style={{
                        fontSize: '11px',
                        background: isSelected ? 'var(--color-primary)' : 'var(--color-bg-input)',
                        color: isSelected ? '#ffffff' : 'var(--color-text-muted)',
                        padding: '2px 8px',
                        borderRadius: '10px',
                        fontWeight: '700',
                      }}
                    >
                      {count} paket
                    </span>
                  )}
                  {isSelected && <span style={{ color: 'var(--color-primary)', fontWeight: '900' }}>✓</span>}
                </span>
              </button>
            );
          })}
        </div>
      </BottomSheet>

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

      {/* Bottom Sheet Tunda Antar Besok */}
      <BottomSheet
        isOpen={tundaSheetOpen}
        onClose={() => setTundaSheetOpen(false)}
        title="⏳ Tunda Antar ke Besok Hari"
      >
        <div style={{ padding: '8px 0 16px 0', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div
            style={{
              background: '#fffbeb',
              border: '1px solid #fde68a',
              borderRadius: 'var(--radius-md)',
              padding: '12px',
              color: '#92400e',
              fontSize: '12.5px',
              lineHeight: '1.45',
            }}
          >
            <b>ℹ️ Kebijakan Penundaan Pengantaran:</b>
            <div style={{ marginTop: '4px' }}>
              Paket ini akan dipindahkan kembali ke status <b>"Siap Antar"</b> dengan catatan penundaan agar dapat Anda bawa kembali esok hari. Paket <b>TIDAK</b> dianggap gagal/retur.
            </div>
          </div>

          {/* Rincian Paket */}
          <Card padding="10px 12px" style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)' }}>
            <div style={{ fontSize: '11.5px', color: 'var(--color-text-dim)' }}>Penerima:</div>
            <div style={{ fontSize: '14px', fontWeight: '800', color: 'var(--color-text-main)' }}>
              {tundaOrder?.customer?.nama || 'Penerima Paket'}
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
              Resi: <b>{tundaOrder?.nomor_resi || '-'}</b> • {tundaOrder?.alamat_tujuan}
            </div>
          </Card>

          {/* Pilihan Cepat Alasan Tunda */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--color-text-main)', marginBottom: '6px' }}>
              Pilih Alasan Penundaan:
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {[
                '🌧️ Cuaca Ekstrem / Hujan Lebat di Pelosok',
                '🚧 Akses Jalan Longsor / Jembatan Putus',
                '🏠 Penerima Sedang Tidak di Rumah (Minta Besok)',
                '🌙 Hari Sudah Gelap / Medan Terlalu Rawan',
                '✏️ Alasan Lainnya',
              ].map((alasan) => (
                <button
                  key={alasan}
                  type="button"
                  onClick={() => setTundaAlasan(alasan)}
                  style={{
                    textAlign: 'left',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: tundaAlasan === alasan ? '700' : '500',
                    border: tundaAlasan === alasan ? '2px solid #d97706' : '1px solid var(--color-border)',
                    background: tundaAlasan === alasan ? '#fffbeb' : 'var(--color-bg-card)',
                    color: tundaAlasan === alasan ? '#92400e' : 'var(--color-text-main)',
                    cursor: 'pointer',
                  }}
                >
                  {alasan}
                </button>
              ))}
            </div>
          </div>

          {/* Catatan Tambahan */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--color-text-main)', marginBottom: '4px' }}>
              Catatan Tambahan (Opsional):
            </label>
            <input
              type="text"
              placeholder="Contoh: Sudah konfirmasi ke penerima via WA, diantar besok siang"
              value={tundaCatatan}
              onChange={(e) => setTundaCatatan(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid var(--color-border)',
                background: 'var(--color-bg-input)',
                fontSize: '12.5px',
                color: 'var(--color-text-main)',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
            <Button variant="outline" onClick={() => setTundaSheetOpen(false)} style={{ flex: 1 }}>
              Batal
            </Button>
            <Button
              variant="primary"
              loading={tundaLoading}
              onClick={handleConfirmTunda}
              style={{ flex: 2, background: '#d97706', borderColor: '#b45309', color: '#ffffff', fontWeight: '800' }}
            >
              ⏳ Simpan & Tunda Besok
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

          {/* Input Manual Nomor Resi (Besar, Rapi, & Proporsional) */}
          <div style={{ marginTop: '8px' }}>
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
              style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}
            >
              <input
                type="text"
                placeholder="Ketik nomor resi (contoh: SPXID..., JP123...)"
                value={scannedResiInput}
                onChange={(e) => setScannedResiInput(e.target.value)}
                style={{
                  width: '100%',
                  height: '44px',
                  padding: '0 14px',
                  borderRadius: '8px',
                  border: '1.5px solid var(--color-border)',
                  background: 'var(--color-bg-input)',
                  color: 'var(--color-text-main)',
                  fontSize: '13.5px',
                  fontWeight: '600',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              <Button
                type="submit"
                loading={scanStatus === 'loading'}
                style={{ width: '100%', height: '42px', fontSize: '13px', fontWeight: '800' }}
              >
                🔍 Cari Resi Paket
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

          {/* Hasil: Resi Tidak Ditemukan -> Alur Pendaftaran Paket Belum Terdaftar */}
          {scanStatus === 'not_found' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div
                style={{
                  background: '#fffbeb',
                  border: '1.5px solid #f59e0b',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px 14px',
                  color: '#92400e',
                  fontSize: '12.5px',
                  lineHeight: '1.45',
                }}
              >
                <div style={{ fontWeight: '800', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>📦</span>
                  <span>RESI BELUM TERDAFTAR DI SISTEM</span>
                </div>
                <div style={{ marginTop: '4px' }}>
                  Resi <b>"{scannedResiInput}"</b> belum dipesan customer melalui aplikasi. Anda dapat mencatat data dari label fisik paket di bawah ini agar langsung masuk antaran aktif Anda.
                </div>
              </div>

              {/* Form Input Data Paket Fisik */}
              <Card padding="14px 16px" style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)' }}>
                <h4 style={{ fontSize: '13px', fontWeight: '800', color: 'var(--color-text-main)', margin: '0 0 10px 0' }}>
                  📝 Catat Data Label Resi Fisik
                </h4>

                <form onSubmit={handleSaveUnregisteredOrder} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {/* Ekspedisi */}
                  <div>
                    <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '700', color: 'var(--color-text-main)', marginBottom: '4px' }}>
                      Ekspedisi Asal:
                    </label>
                    <select
                      value={unregEkspedisi}
                      onChange={(e) => setUnregEkspedisi(e.target.value)}
                      style={{
                        width: '100%',
                        height: '38px',
                        padding: '0 10px',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--color-border)',
                        background: 'var(--color-bg-input)',
                        color: 'var(--color-text-main)',
                        fontSize: '12.5px',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    >
                      <option value="J&T Express">J&T Express</option>
                      <option value="Shopee Xpress">Shopee Xpress (SPX)</option>
                      <option value="JNE Express">JNE Express</option>
                      <option value="SiCepat">SiCepat Ekspres</option>
                      <option value="Ninja Xpress">Ninja Xpress</option>
                      <option value="ID Express">ID Express</option>
                      <option value="Wahana">Wahana</option>
                      <option value="POS Indonesia">POS Indonesia</option>
                      <option value="Lainnya">Lainnya / Ekspedisi Lokal</option>
                    </select>
                  </div>

                  {/* Nomor Resi */}
                  <div>
                    <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '700', color: 'var(--color-text-main)', marginBottom: '4px' }}>
                      Nomor Resi:
                    </label>
                    <input
                      type="text"
                      value={scannedResiInput}
                      onChange={(e) => setScannedResiInput(e.target.value)}
                      required
                      placeholder="Masukkan nomor resi..."
                      style={{
                        width: '100%',
                        height: '38px',
                        padding: '0 10px',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--color-border)',
                        background: 'var(--color-bg-input)',
                        color: 'var(--color-text-main)',
                        fontSize: '12.5px',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  {/* Nama Penerima */}
                  <div>
                    <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '700', color: 'var(--color-text-main)', marginBottom: '4px' }}>
                      Nama Penerima: <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Nama yang tertulis di paket..."
                      value={unregNama}
                      onChange={(e) => setUnregNama(e.target.value)}
                      required
                      style={{
                        width: '100%',
                        height: '38px',
                        padding: '0 10px',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--color-border)',
                        background: 'var(--color-bg-input)',
                        color: 'var(--color-text-main)',
                        fontSize: '12.5px',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  {/* No WhatsApp */}
                  <div>
                    <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '700', color: 'var(--color-text-main)', marginBottom: '4px' }}>
                      No. WhatsApp / HP Penerima:
                    </label>
                    <input
                      type="tel"
                      placeholder="Contoh: 08123456789"
                      value={unregHp}
                      onChange={(e) => setUnregHp(e.target.value)}
                      style={{
                        width: '100%',
                        height: '38px',
                        padding: '0 10px',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--color-border)',
                        background: 'var(--color-bg-input)',
                        color: 'var(--color-text-main)',
                        fontSize: '12.5px',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  {/* Desa Tujuan */}
                  <div>
                    <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '700', color: 'var(--color-text-main)', marginBottom: '4px' }}>
                      Desa Tujuan:
                    </label>
                    <select
                      value={unregDesaId}
                      onChange={(e) => setUnregDesaId(e.target.value)}
                      style={{
                        width: '100%',
                        height: '38px',
                        padding: '0 10px',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--color-border)',
                        background: 'var(--color-bg-input)',
                        color: 'var(--color-text-main)',
                        fontSize: '12.5px',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    >
                      <option value="">-- Pilih Desa Pelosok --</option>
                      {desaList.map((d) => (
                        <option key={d.id} value={d.id}>
                          Desa {d.nama_desa}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Detail Alamat / Patokan */}
                  <div>
                    <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '700', color: 'var(--color-text-main)', marginBottom: '4px' }}>
                      Detail Alamat / Patokan:
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: Kp. Cibeet RT 01/RW 02 dekat jembatan"
                      value={unregDetailAlamat}
                      onChange={(e) => setUnregDetailAlamat(e.target.value)}
                      style={{
                        width: '100%',
                        height: '38px',
                        padding: '0 10px',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--color-border)',
                        background: 'var(--color-bg-input)',
                        color: 'var(--color-text-main)',
                        fontSize: '12.5px',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  {/* Metode Pembayaran */}
                  <div>
                    <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '700', color: 'var(--color-text-main)', marginBottom: '6px' }}>
                      Metode Pembayaran:
                    </label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() => setUnregMetode('COD')}
                        style={{
                          flex: 1,
                          padding: '8px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: '700',
                          border: unregMetode === 'COD' ? '2px solid #16a34a' : '1px solid var(--color-border)',
                          background: unregMetode === 'COD' ? '#ecfdf5' : 'var(--color-bg-card)',
                          color: unregMetode === 'COD' ? '#166534' : 'var(--color-text-main)',
                          cursor: 'pointer',
                        }}
                      >
                        💵 COD (Bayar di Tempat)
                      </button>
                      <button
                        type="button"
                        onClick={() => setUnregMetode('Transfer')}
                        style={{
                          flex: 1,
                          padding: '8px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: '700',
                          border: unregMetode === 'Transfer' ? '2px solid #2563eb' : '1px solid var(--color-border)',
                          background: unregMetode === 'Transfer' ? '#eff6ff' : 'var(--color-bg-card)',
                          color: unregMetode === 'Transfer' ? '#1e40af' : 'var(--color-text-main)',
                          cursor: 'pointer',
                        }}
                      >
                        🏦 Non-COD (Lunas)
                      </button>
                    </div>
                  </div>

                  {/* Input Harga Paket & Ongkir */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--color-text-main)', marginBottom: '4px' }}>
                        Harga Paket / COD (Rp)
                      </label>
                      <input
                        type="number"
                        placeholder="0 jika lunas"
                        value={unregHargaBarang}
                        onChange={(e) => setUnregHargaBarang(e.target.value)}
                        style={{
                          width: '100%',
                          height: '38px',
                          padding: '0 8px',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--color-border)',
                          background: 'var(--color-bg-input)',
                          color: 'var(--color-text-main)',
                          fontSize: '12px',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--color-text-main)', marginBottom: '4px' }}>
                        Ongkir Kurir (Rp)
                      </label>
                      <input
                        type="number"
                        value={unregOngkirKurir}
                        onChange={(e) => setUnregOngkirKurir(e.target.value)}
                        style={{
                          width: '100%',
                          height: '38px',
                          padding: '0 8px',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--color-border)',
                          background: 'var(--color-bg-input)',
                          color: 'var(--color-text-main)',
                          fontSize: '12px',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                  </div>

                  {/* Total Tagihan COD */}
                  <div
                    style={{
                      background: 'var(--color-bg-input)',
                      border: '1px dashed var(--color-border)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '8px 12px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '12px',
                    }}
                  >
                    <span style={{ color: 'var(--color-text-muted)', fontWeight: '600' }}>
                      Total Tagihan di Lokasi:
                    </span>
                    <span style={{ color: 'var(--color-primary-dark)', fontWeight: '800', fontSize: '14px' }}>
                      Rp {((parseFloat(unregHargaBarang) || 0) + (parseFloat(unregOngkirKurir) || 0)).toLocaleString('id-ID')}
                    </span>
                  </div>

                  {/* Tombol Aksi */}
                  <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                    {unregHp.trim() && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleChatUnregWa}
                        style={{
                          flex: 1,
                          borderColor: '#22c55e',
                          color: '#16a34a',
                          background: '#f0fdf4',
                          fontWeight: '700',
                          fontSize: '12px',
                        }}
                      >
                        💬 Chat WA Penerima
                      </Button>
                    )}
                    <Button
                      type="submit"
                      variant="primary"
                      loading={unregSaving}
                      style={{
                        flex: 2,
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        color: '#ffffff',
                        fontWeight: '800',
                        fontSize: '12.5px',
                      }}
                    >
                      🛵 Daftarkan & Mulai Antar
                    </Button>
                  </div>
                </form>
              </Card>
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

                {/* Penetapan Harga Paket & Ongkir Pelosok oleh Kurir Saat Scan Pertama */}
                {scanResultOrder.status_pengiriman !== 'dalam_perjalanan' && scanResultOrder.status_pengiriman !== 'terkirim' && (
                  <div
                    style={{
                      background: 'rgba(31, 148, 196, 0.08)',
                      border: '1.5px solid rgba(31, 148, 196, 0.35)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '12px 14px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                      marginTop: '4px',
                    }}
                  >
                    <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--color-primary-dark)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>💰</span>
                      <span>Tetapkan Tagihan Paket & Ongkir:</span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--color-text-main)', marginBottom: '4px' }}>
                          Harga Paket / COD (Rp)
                        </label>
                        <input
                          type="number"
                          placeholder="0 jika non-COD"
                          value={scanHargaPaket}
                          onChange={(e) => setScanHargaPaket(e.target.value)}
                          style={{
                            width: '100%',
                            height: '40px',
                            padding: '0 10px',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--color-border)',
                            background: 'var(--color-bg-card)',
                            color: 'var(--color-text-main)',
                            fontSize: '13px',
                            fontWeight: '700',
                            outline: 'none',
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--color-text-main)', marginBottom: '4px' }}>
                          Ongkir Kurir (Rp)*
                        </label>
                        <input
                          type="number"
                          placeholder="Contoh: 10000"
                          value={scanOngkirKurir}
                          onChange={(e) => setScanOngkirKurir(e.target.value)}
                          style={{
                            width: '100%',
                            height: '40px',
                            padding: '0 10px',
                            borderRadius: 'var(--radius-sm)',
                            border: '1.5px solid var(--color-primary)',
                            background: 'var(--color-bg-card)',
                            color: 'var(--color-primary-dark)',
                            fontSize: '13px',
                            fontWeight: '800',
                            outline: 'none',
                          }}
                        />
                      </div>
                    </div>

                    {/* Total Tagihan yang Diterima di Tempat */}
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        borderTop: '1px dashed var(--color-border)',
                        paddingTop: '8px',
                        fontSize: '12px',
                      }}
                    >
                      <span style={{ color: 'var(--color-text-muted)', fontWeight: '600' }}>
                        Total Bayar di Tempat (COD):
                      </span>
                      <span style={{ color: 'var(--color-primary-dark)', fontWeight: '800', fontSize: '14.5px' }}>
                        Rp {((parseFloat(scanHargaPaket) || 0) + (parseFloat(scanOngkirKurir) || 0)).toLocaleString('id-ID')}
                      </span>
                    </div>
                  </div>
                )}

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

      {/* Drawer Sidebar Menu Kanan (Pengaturan & Akun Kurir - Sama Persis Seperti Customer) */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onOpenAddressModal={() => setProfileSheetOpen(true)}
        onTriggerLogout={() => setLogoutSheetOpen(true)}
      />

      {/* BottomSheet Edit Profil & Wilayah Tugas Kurir (Dibuka dari Sidebar) */}
      <BottomSheet
        isOpen={profileSheetOpen}
        onClose={() => setProfileSheetOpen(false)}
        title="👤 Edit Profil & Wilayah Tugas"
      >
        <div style={{ padding: '0 0 16px 0', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Foto Profil & Upload Foto WebP */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '8px' }}>
            <div style={{ position: 'relative' }}>
              {profileFotoUrl ? (
                <img
                  src={profileFotoUrl}
                  alt="Foto Profil"
                  style={{
                    width: '84px',
                    height: '84px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '3px solid var(--color-primary)',
                    boxShadow: '0 4px 14px rgba(0,0,0,0.15)',
                  }}
                />
              ) : (
                <div
                  style={{
                    width: '84px',
                    height: '84px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, var(--color-primary-light) 0%, var(--color-primary) 100%)',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '32px',
                    fontWeight: '800',
                    border: '3px solid #ffffff',
                    boxShadow: '0 4px 14px rgba(0,0,0,0.15)',
                  }}
                >
                  {profileName ? profileName.charAt(0).toUpperCase() : '🛵'}
                </div>
              )}
              <button
                type="button"
                onClick={() => profileFileInputRef.current?.click()}
                title="Ganti Foto Profil"
                style={{
                  position: 'absolute',
                  bottom: '0px',
                  right: '0px',
                  background: 'var(--color-primary)',
                  color: '#ffffff',
                  border: '2px solid #ffffff',
                  borderRadius: '50%',
                  width: '28px',
                  height: '28px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
                }}
              >
                📷
              </button>
            </div>

            <input
              ref={profileFileInputRef}
              type="file"
              accept="image/*"
              onChange={handleKurirFotoChange}
              style={{ display: 'none' }}
            />

            {compressingFoto && (
              <span style={{ fontSize: '11px', color: 'var(--color-primary)', marginTop: '6px', fontWeight: '700' }}>
                Mengompres & memproses foto...
              </span>
            )}
          </div>

          {/* Form Profil Kurir */}
          <form
            onSubmit={async (e) => {
              await handleSaveKurirProfile(e);
              setProfileSheetOpen(false);
            }}
            style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
          >
            <Input
              label="Nama Lengkap Kurir"
              type="text"
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              placeholder="Nama kurir yang tampil ke customer"
              required
            />

            <Input
              label="Nomor WhatsApp / HP"
              type="tel"
              value={profilePhone}
              onChange={(e) => setProfilePhone(e.target.value)}
              placeholder="08xxxxxxxxxx"
              required
            />

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--color-text-main)', marginBottom: '6px' }}>
                Wilayah / Jalur Tugas Utama
              </label>
              <select
                value={profileAlamat}
                onChange={(e) => setProfileAlamat(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1.5px solid var(--color-border)',
                  fontSize: '13px',
                  background: 'var(--color-bg-card)',
                  color: 'var(--color-text-main)',
                }}
              >
                <option value="Semua Desa (Default)">Semua Desa se-Kecamatan Naringgul</option>
                {desaList.map((d) => (
                  <option key={d.id} value={`Desa ${d.nama_desa}`}>
                    Desa {d.nama_desa}
                  </option>
                ))}
              </select>
              <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '4px', display: 'block' }}>
                Sistem scan akan mencocokkan resi dengan wilayah tugas Anda.
              </span>
            </div>

            <Input
              label="Nomor Akun DANA (Pencairan Kas Ongkir)"
              type="tel"
              value={profileDana}
              onChange={(e) => setProfileDana(e.target.value)}
              placeholder="Nomor HP terdaftar di DANA"
              helperText="Digunakan untuk penyerahan/pencairan kas ongkir kurir"
            />

            <div
              style={{
                background: '#ecfdf5',
                border: '1px solid #a7f3d0',
                borderRadius: 'var(--radius-sm)',
                padding: '8px 10px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '11.5px',
                color: '#065f46',
                fontWeight: '700',
              }}
            >
              <span>🟢</span>
              <span>Mitra Kurir Lapangan Resmi Jastip Pelosok</span>
            </div>

            <Button type="submit" loading={savingProfile} style={{ width: '100%', marginTop: '4px' }}>
              💾 Simpan Perubahan Profil
            </Button>
          </form>
        </div>
      </BottomSheet>

      {/* Bottom Nav */}
      <BottomNav role="kurir" />
    </div>
  );
}
