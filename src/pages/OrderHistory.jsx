import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { orderService } from '../services/orderService';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Button from '../components/Button';
import BottomNav from '../components/BottomNav';
import SkeletonLoader from '../components/SkeletonLoader';
import Sidebar from '../components/Sidebar';
import BottomSheet from '../components/BottomSheet';
import ConfirmationSheet from '../components/ConfirmationSheet';
import { authService } from '../services/authService';
import {
  formatDateIndonesia,
  formatRupiah,
  getDeliveryStatusMeta,
  getConfirmationStatusMeta,
  parseReturInfo,
  checkReturnEligibility,
} from '../utils/formatters';

// Membaca preferensi filter tersimpan dari sessionStorage (agar posisi filter tetap sama saat refresh)
const getSavedHistoryFilters = () => {
  try {
    const raw = sessionStorage.getItem('customer_history_filters');
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error(e);
  }
  return null;
};

export default function OrderHistory() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [logoutSheetOpen, setLogoutSheetOpen] = useState(false);

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Ambil data filter terakhir yang disimpan di sessionStorage
  const savedFilters = useMemo(() => getSavedHistoryFilters(), []);

  // Quick Tab Filter (Skeuomorphic Segmented Pill)
  const [filterTab, setFilterTab] = useState(savedFilters?.filterTab || 'semua'); // 'semua' | 'aktif' | 'selesai' | 'retur'

  // Advanced Filter Drawer State (Slide BottomSheet)
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [filterTimeMode, setFilterTimeMode] = useState(savedFilters?.filterTimeMode || 'semua'); // 'semua' | 'harian' | 'bulanan' | 'tahunan'
  const [selectedDate, setSelectedDate] = useState(savedFilters?.selectedDate || ''); // YYYY-MM-DD
  const [selectedMonth, setSelectedMonth] = useState(
    savedFilters?.selectedMonth !== undefined ? savedFilters.selectedMonth : new Date().getMonth() + 1
  ); // 1-12
  const [selectedYear, setSelectedYear] = useState(
    savedFilters?.selectedYear !== undefined ? savedFilters.selectedYear : new Date().getFullYear()
  ); // e.g. 2026
  const [filterStatus, setFilterStatus] = useState(savedFilters?.filterStatus || 'semua'); // 'semua' | 'proses' | 'terkirim' | 'retur'
  const [filterService, setFilterService] = useState(savedFilters?.filterService || 'semua'); // 'semua' | 'paket_ekspedisi' | 'titip_beli'
  const [searchKeyword, setSearchKeyword] = useState(savedFilters?.searchKeyword || '');

  // Simpan otomatis semua posisi filter ke sessionStorage agar tidak hilang saat refresh / F5
  useEffect(() => {
    try {
      sessionStorage.setItem(
        'customer_history_filters',
        JSON.stringify({
          filterTab,
          filterTimeMode,
          selectedDate,
          selectedMonth,
          selectedYear,
          filterStatus,
          filterService,
          searchKeyword,
        })
      );
    } catch (e) {
      console.error(e);
    }
  }, [filterTab, filterTimeMode, selectedDate, selectedMonth, selectedYear, filterStatus, filterService, searchKeyword]);

  // Detail Order Modal State
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  // Form Pengajuan Retur Modal State
  const [returModalOpen, setReturModalOpen] = useState(false);
  const [returTargetOrder, setReturTargetOrder] = useState(null);
  const [returAlasan, setReturAlasan] = useState('');
  const [returWa, setReturWa] = useState('');
  const [returAgreed, setReturAgreed] = useState(true);
  const [returSubmitting, setReturSubmitting] = useState(false);

  // Notification Toast / Alert Sheet
  const [alertNotice, setAlertNotice] = useState({ open: false, title: '', message: '', type: 'info' });

  // Load Daftar Pesanan
  const loadOrders = async () => {
    if (!profile?.id) return;
    setLoading(true);
    try {
      const data = await orderService.getOrdersByCustomerId(profile.id);
      setOrders(data);
    } catch (err) {
      console.error('Gagal mengambil riwayat order:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, [profile?.id]);

  // Real-time listener saat ada order baru dibuat atau status diupdate
  useEffect(() => {
    const handleOrderEvent = () => {
      loadOrders();
    };

    window.addEventListener('jastip:orderCreated', handleOrderEvent);
    const handleStorage = (e) => {
      if (e.key === 'jastip_last_order_event') {
        loadOrders();
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('jastip:orderCreated', handleOrderEvent);
      window.removeEventListener('storage', handleStorage);
    };
  }, [profile?.id]);

  // Cek apakah ada filter kustom yang sedang aktif
  const isCustomFilterActive = useMemo(() => {
    return (
      filterTimeMode !== 'semua' ||
      filterStatus !== 'semua' ||
      filterService !== 'semua' ||
      searchKeyword.trim() !== ''
    );
  }, [filterTimeMode, filterStatus, filterService, searchKeyword]);

  // Reset semua filter
  const handleResetFilters = () => {
    setFilterTab('semua');
    setFilterTimeMode('semua');
    setSelectedDate('');
    setSelectedMonth(new Date().getMonth() + 1);
    setSelectedYear(new Date().getFullYear());
    setFilterStatus('semua');
    setFilterService('semua');
    setSearchKeyword('');
    setFilterDrawerOpen(false);
    sessionStorage.removeItem('customer_history_filters');
  };

  // Helper shortcut waktu
  const setQuickToday = () => {
    const today = new Date().toISOString().split('T')[0];
    setFilterTimeMode('harian');
    setSelectedDate(today);
  };

  const setQuickYesterday = () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    setFilterTimeMode('harian');
    setSelectedDate(yesterday.toISOString().split('T')[0]);
  };

  const setQuickThisMonth = () => {
    setFilterTimeMode('bulanan');
    setSelectedMonth(new Date().getMonth() + 1);
    setSelectedYear(new Date().getFullYear());
  };

  const setQuickThisYear = () => {
    setFilterTimeMode('tahunan');
    setSelectedYear(new Date().getFullYear());
  };

  // Filter Data Orders
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // 1. Filter Tab Cepat
      if (filterTab === 'aktif') {
        const isFinished = order.status_pengiriman === 'terkirim' || order.status_pengiriman === 'retur';
        if (isFinished || order.status_konfirmasi === 'ditolak') return false;
      } else if (filterTab === 'selesai') {
        if (order.status_pengiriman !== 'terkirim') return false;
      } else if (filterTab === 'retur') {
        if (order.status_pengiriman !== 'retur') return false;
      }

      // 2. Filter Waktu Fleksibel
      const orderDate = new Date(order.created_at);
      if (filterTimeMode === 'harian' && selectedDate) {
        const orderDateStr = orderDate.toISOString().split('T')[0];
        if (orderDateStr !== selectedDate) return false;
      } else if (filterTimeMode === 'bulanan') {
        const matchesMonth = orderDate.getMonth() + 1 === parseInt(selectedMonth, 10);
        const matchesYear = orderDate.getFullYear() === parseInt(selectedYear, 10);
        if (!matchesMonth || !matchesYear) return false;
      } else if (filterTimeMode === 'tahunan') {
        if (orderDate.getFullYear() !== parseInt(selectedYear, 10)) return false;
      }

      // 3. Filter Status Pengiriman
      if (filterStatus === 'proses') {
        const inProcess = ['dipesan', 'diterima_hub', 'dalam_perjalanan'].includes(order.status_pengiriman);
        if (!inProcess) return false;
      } else if (filterStatus === 'terkirim') {
        if (order.status_pengiriman !== 'terkirim') return false;
      } else if (filterStatus === 'retur') {
        if (order.status_pengiriman !== 'retur') return false;
      }

      // 4. Filter Jenis Layanan
      if (filterService !== 'semua' && order.jenis_barang !== filterService) {
        return false;
      }

      // 5. Filter Pencarian Keyword (Resi atau Deskripsi Barang)
      if (searchKeyword.trim()) {
        const query = searchKeyword.toLowerCase();
        const resiMatch = order.nomor_resi?.toLowerCase().includes(query);
        const descMatch = order.deskripsi_barang?.toLowerCase().includes(query);
        const idMatch = order.id?.toLowerCase().includes(query);
        if (!resiMatch && !descMatch && !idMatch) return false;
      }

      return true;
    });
  }, [orders, filterTab, filterTimeMode, selectedDate, selectedMonth, selectedYear, filterStatus, filterService, searchKeyword]);

  // Handler Buka Form Retur
  const handleOpenReturModal = (order) => {
    const eligibility = checkReturnEligibility(order);
    if (!eligibility.eligible) {
      setAlertNotice({
        open: true,
        title: 'Pengajuan Retur Tidak Tersedia',
        message: eligibility.reason,
        type: 'warning',
      });
      return;
    }

    setReturTargetOrder(order);
    setReturAlasan('');
    setReturWa(profile?.no_hp || '');
    setReturAgreed(true);
    setDetailModalOpen(false);
    setReturModalOpen(true);
  };

  // Submit Pengajuan Retur
  const handleSubmitRetur = async (e) => {
    e.preventDefault();
    if (!returTargetOrder) return;

    if (!returAlasan.trim()) {
      setAlertNotice({
        open: true,
        title: 'Alasan Wajib Diisi',
        message: 'Harap tuliskan alasan manual pengajuan retur secara rinci agar kurir & admin dapat memprosesnya.',
        type: 'warning',
      });
      return;
    }

    if (!returAgreed) {
      setAlertNotice({
        open: true,
        title: 'Persetujuan Diperlukan',
        message: 'Harap centang persetujuan bahwa ongkir kurir tetap dibayarkan atas jasa perjalanan kurir.',
        type: 'warning',
      });
      return;
    }

    setReturSubmitting(true);
    try {
      const ongkirNominal = returTargetOrder.ongkir_patokan || returTargetOrder.ongkir_diterima || 0;
      const updatedOrder = await orderService.requestCustomerReturn(returTargetOrder.id, {
        alasan: returAlasan.trim(),
        kontakWa: returWa.trim(),
        currentDeskripsi: returTargetOrder.deskripsi_barang || '',
        ongkir: ongkirNominal,
      });

      // Update state order lokal
      setOrders((prev) =>
        prev.map((o) => (o.id === updatedOrder.id ? { ...o, ...updatedOrder } : o))
      );

      setReturModalOpen(false);
      setAlertNotice({
        open: true,
        title: 'Pengajuan Retur Berhasil! 🔄',
        message:
          'Status paket telah diperbarui menjadi Diretur. Sesuai ketentuan, ongkir kurir tetap tercatat dan dibayarkan atas jerih payah perjalanan kurir ke pelosok.',
        type: 'success',
      });
    } catch (err) {
      setAlertNotice({
        open: true,
        title: 'Gagal Mengajukan Retur',
        message: err.message || 'Terjadi kesalahan sistem saat mengajukan retur.',
        type: 'error',
      });
    } finally {
      setReturSubmitting(false);
    }
  };

  // Month Names Helper
  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
  ];

  return (
    <div className="app-container" style={{ paddingBottom: '90px', paddingTop: '12px' }}>
      {/* Header Halaman Riwayat */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
          padding: '2px 2px',
        }}
      >
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--color-primary-dark)', margin: 0 }}>
            Riwayat Pesanan 📦
          </h1>
          <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '2px', margin: 0 }}>
            Lacak status paket, filter fleksibel & retur
          </p>
        </div>

        {/* Action Controls: Refresh, Modern Filter Icon, and Profile Avatar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Tombol Refresh */}
          <button
            onClick={loadOrders}
            style={{
              background: 'var(--color-bg-card)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              width: '38px',
              height: '38px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'var(--skeuo-button-raised)',
              cursor: 'pointer',
              color: 'var(--color-text-main)',
              transition: 'all 0.15s ease',
            }}
            title="Muat ulang data"
          >
            <span style={{ fontSize: '15px' }}>🔄</span>
          </button>

          {/* Tombol Ikon Filter Modern Berbentuk Slider */}
          <button
            onClick={() => setFilterDrawerOpen(true)}
            style={{
              background: isCustomFilterActive
                ? 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%)'
                : 'var(--color-bg-card)',
              color: isCustomFilterActive ? '#ffffff' : 'var(--color-primary)',
              border: isCustomFilterActive
                ? '1px solid var(--color-primary-dark)'
                : '1.5px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              width: '38px',
              height: '38px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: isCustomFilterActive
                ? '0 4px 10px rgba(46, 125, 50, 0.3)'
                : 'var(--skeuo-button-raised)',
              cursor: 'pointer',
              position: 'relative',
              transition: 'all 0.15s ease',
            }}
            title="Buka Filter Riwayat Fleksibel"
            aria-label="Filter Riwayat"
          >
            {/* SVG Filter Sliders Modern (Clean, Non-Alien) */}
            <svg
              width="19"
              height="19"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="4" y1="21" x2="4" y2="14" />
              <line x1="4" y1="10" x2="4" y2="3" />
              <line x1="12" y1="21" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12" y2="3" />
              <line x1="20" y1="21" x2="20" y2="16" />
              <line x1="20" y1="12" x2="20" y2="3" />
              <line x1="1" y1="14" x2="7" y2="14" />
              <line x1="9" y1="8" x2="15" y2="8" />
              <line x1="17" y1="16" x2="23" y2="16" />
            </svg>

            {/* Indikator Titik Aktif jika filter sedang menyaring */}
            {isCustomFilterActive && (
              <span
                style={{
                  position: 'absolute',
                  top: '-3px',
                  right: '-3px',
                  width: '9px',
                  height: '9px',
                  borderRadius: '50%',
                  background: '#f59e0b',
                  border: '2px solid #ffffff',
                }}
              />
            )}
          </button>

          {/* Avatar Menu Samping */}
          <button
            onClick={() => setSidebarOpen(true)}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
            }}
            title="Buka Menu Akun & Profil"
          >
            {profile?.foto_url ? (
              <img
                src={profile.foto_url}
                alt="Profil"
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '2px solid var(--color-primary)',
                }}
              />
            ) : (
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--color-primary-light) 0%, var(--color-primary) 100%)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: '800',
                  fontSize: '15px',
                }}
              >
                {profile?.nama ? profile.nama.charAt(0).toUpperCase() : '👤'}
              </div>
            )}
          </button>
        </div>
      </div>

      {/* Filter Tabs Segmen Cepat (Skeuomorphic Segmented Pill) */}
      <div
        style={{
          display: 'flex',
          background: 'var(--color-bg-input)',
          borderRadius: 'var(--radius-md)',
          padding: '4px',
          boxShadow: 'var(--skeuo-input-sunken)',
          gap: '4px',
          marginBottom: '12px',
        }}
      >
        {[
          { id: 'semua', label: 'Semua' },
          { id: 'aktif', label: 'Diproses' },
          { id: 'selesai', label: 'Selesai' },
          { id: 'retur', label: 'Diretur' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilterTab(tab.id)}
            style={{
              flex: 1,
              padding: '8px 4px',
              borderRadius: '10px',
              border: 'none',
              fontSize: '12px',
              fontWeight: '700',
              fontFamily: 'inherit',
              cursor: 'pointer',
              background:
                filterTab === tab.id
                  ? 'linear-gradient(180deg, #ffffff 0%, #eef3f0 100%)'
                  : 'transparent',
              color:
                filterTab === tab.id
                  ? 'var(--color-primary-dark)'
                  : 'var(--color-text-muted)',
              boxShadow:
                filterTab === tab.id ? '0 2px 4px rgba(20, 35, 28, 0.12)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Bar Indikator Filter Aktif (Jika Custom Filter Menyala) */}
      {isCustomFilterActive && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            overflowX: 'auto',
            paddingBottom: '8px',
            marginBottom: '10px',
          }}
        >
          <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
            Filter:
          </span>

          {filterTimeMode === 'harian' && selectedDate && (
            <span
              style={{
                fontSize: '11px',
                fontWeight: '700',
                background: 'rgba(46, 125, 50, 0.12)',
                color: 'var(--color-primary-dark)',
                padding: '3px 8px',
                borderRadius: '999px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                whiteSpace: 'nowrap',
              }}
            >
              📅 {selectedDate}
              <button
                onClick={() => { setFilterTimeMode('semua'); setSelectedDate(''); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontWeight: '800' }}
              >
                ✕
              </button>
            </span>
          )}

          {filterTimeMode === 'bulanan' && (
            <span
              style={{
                fontSize: '11px',
                fontWeight: '700',
                background: 'rgba(46, 125, 50, 0.12)',
                color: 'var(--color-primary-dark)',
                padding: '3px 8px',
                borderRadius: '999px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                whiteSpace: 'nowrap',
              }}
            >
              🗓️ {monthNames[selectedMonth - 1]} {selectedYear}
              <button
                onClick={() => setFilterTimeMode('semua')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontWeight: '800' }}
              >
                ✕
              </button>
            </span>
          )}

          {filterTimeMode === 'tahunan' && (
            <span
              style={{
                fontSize: '11px',
                fontWeight: '700',
                background: 'rgba(46, 125, 50, 0.12)',
                color: 'var(--color-primary-dark)',
                padding: '3px 8px',
                borderRadius: '999px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                whiteSpace: 'nowrap',
              }}
            >
              📆 Tahun {selectedYear}
              <button
                onClick={() => setFilterTimeMode('semua')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontWeight: '800' }}
              >
                ✕
              </button>
            </span>
          )}

          {filterStatus !== 'semua' && (
            <span
              style={{
                fontSize: '11px',
                fontWeight: '700',
                background: 'rgba(59, 130, 246, 0.12)',
                color: '#1d4ed8',
                padding: '3px 8px',
                borderRadius: '999px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                whiteSpace: 'nowrap',
              }}
            >
              Status: {filterStatus}
              <button
                onClick={() => setFilterStatus('semua')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontWeight: '800' }}
              >
                ✕
              </button>
            </span>
          )}

          {searchKeyword.trim() && (
            <span
              style={{
                fontSize: '11px',
                fontWeight: '700',
                background: 'rgba(245, 158, 11, 0.15)',
                color: '#b45309',
                padding: '3px 8px',
                borderRadius: '999px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                whiteSpace: 'nowrap',
              }}
            >
              🔍 "{searchKeyword}"
              <button
                onClick={() => setSearchKeyword('')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontWeight: '800' }}
              >
                ✕
              </button>
            </span>
          )}

          <button
            onClick={handleResetFilters}
            style={{
              fontSize: '11px',
              fontWeight: '700',
              color: 'var(--color-danger)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              textDecoration: 'underline',
              padding: '2px 4px',
              whiteSpace: 'nowrap',
            }}
          >
            Reset Semua
          </button>
        </div>
      )}

      {/* Daftar Kartu Order */}
      {loading ? (
        <SkeletonLoader type="list" count={3} />
      ) : filteredOrders.length === 0 ? (
        <Card style={{ textAlign: 'center', padding: '36px 20px' }}>
          <div style={{ fontSize: '44px', marginBottom: '12px' }}>📭</div>
          <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--color-text-main)' }}>
            Belum ada order yang sesuai
          </h3>
          <p
            style={{
              fontSize: '13px',
              color: 'var(--color-text-muted)',
              marginTop: '4px',
              marginBottom: '20px',
            }}
          >
            {isCustomFilterActive
              ? 'Tidak ada pesanan yang cocok dengan kriteria filter Anda. Coba atur ulang filter.'
              : 'Anda belum memiliki pesanan pada kategori ini.'}
          </p>
          {isCustomFilterActive ? (
            <Button variant="outline" onClick={handleResetFilters}>
              Reset Filter
            </Button>
          ) : (
            <Button onClick={() => navigate('/buat-order')}>Buat Order Baru</Button>
          )}
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {filteredOrders.map((order) => {
            const deliveryMeta = getDeliveryStatusMeta(order.status_pengiriman);
            const confirmationMeta = getConfirmationStatusMeta(order.status_konfirmasi);
            const returInfo = parseReturInfo(order.deskripsi_barang);
            const returnEligibility = checkReturnEligibility(order);

            return (
              <Card key={order.id} padding="16px">
                {/* Header Card: Resi & Status */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '8px',
                  }}
                >
                  <div>
                    <span
                      style={{
                        fontSize: '10.5px',
                        fontWeight: '800',
                        textTransform: 'uppercase',
                        color: 'var(--color-text-dim)',
                        letterSpacing: '0.4px',
                      }}
                    >
                      {order.jenis_barang === 'paket_ekspedisi' ? '📦 PAKET EKSPEDISI' : '🛒 TITIP BELI'}
                    </span>
                    <h3
                      style={{
                        fontSize: '15.5px',
                        fontWeight: '800',
                        color: 'var(--color-text-main)',
                        marginTop: '2px',
                      }}
                    >
                      {order.nomor_resi || `Order #${order.id.slice(0, 8)}`}
                    </h3>
                  </div>

                  <Badge variant={deliveryMeta.variant}>{deliveryMeta.label}</Badge>
                </div>

                {/* Deskripsi Barang */}
                <p
                  style={{
                    fontSize: '13px',
                    color: 'var(--color-text-muted)',
                    lineHeight: '1.4',
                    marginBottom: '10px',
                  }}
                >
                  {order.deskripsi_barang?.replace(/\[RETUR[\s\S]*\]/, '').trim() || order.deskripsi_barang}
                </p>

                {/* Banner Status Retur Khusus (Jika Barang Diretur) */}
                {order.status_pengiriman === 'retur' && (
                  <div
                    style={{
                      background: 'rgba(239, 68, 68, 0.08)',
                      border: '1.5px solid rgba(239, 68, 68, 0.3)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '10px 12px',
                      marginBottom: '10px',
                      fontSize: '12px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '800', color: '#b91c1c' }}>
                      <span>🔄</span>
                      <span>Paket Berstatus Diretur</span>
                    </div>
                    {returInfo?.alasan && (
                      <div style={{ marginTop: '4px', color: 'var(--color-text-main)' }}>
                        <strong>Alasan Retur:</strong> {returInfo.alasan}
                      </div>
                    )}
                    <div
                      style={{
                        marginTop: '6px',
                        paddingTop: '6px',
                        borderTop: '1px dashed rgba(239, 68, 68, 0.25)',
                        fontSize: '11.5px',
                        color: 'var(--color-text-muted)',
                        lineHeight: '1.4',
                      }}
                    >
                      🏍️ <strong>Ketentuan Jastip Pelosok:</strong> Ongkos kirim kurir sebesar{' '}
                      <strong>{formatRupiah(order.ongkir_patokan || order.ongkir_diterima || 0)}</strong> tetap
                      dibayarkan atas jasa pengantaran medan pelosok.
                    </div>
                  </div>
                )}

                {/* Ringkasan Alamat & Ongkir */}
                <div
                  style={{
                    background: 'var(--color-bg-input)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '8px 10px',
                    fontSize: '12px',
                    color: 'var(--color-text-main)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    boxShadow: 'var(--skeuo-input-sunken)',
                    marginBottom: '10px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>📍 <strong>Tujuan:</strong> {order.alamat_tujuan || '-'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>
                      💵 <strong>Ongkir:</strong> {formatRupiah(order.ongkir_patokan || order.ongkir_diterima || 0)}
                    </span>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: '700',
                        color: order.status_pembayaran === 'lunas' ? 'var(--color-success)' : 'var(--color-warning)',
                      }}
                    >
                      {order.status_pembayaran === 'lunas' ? '● LUNAS' : '● BELUM LUNAS'}
                    </span>
                  </div>
                </div>

                {/* Footer Card: Tanggal & Tombol Aksi */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingTop: '8px',
                    borderTop: '1px solid rgba(82, 99, 90, 0.1)',
                  }}
                >
                  <span style={{ fontSize: '11px', color: 'var(--color-text-dim)' }}>
                    {formatDateIndonesia(order.created_at)}
                  </span>

                  <div style={{ display: 'flex', gap: '6px' }}>
                    {/* Tombol Ajukan Retur (Hanya jika order selesai & dalam batas 2 hari) */}
                    {returnEligibility.eligible && (
                      <button
                        onClick={() => handleOpenReturModal(order)}
                        style={{
                          background: 'rgba(239, 68, 68, 0.1)',
                          border: '1px solid rgba(239, 68, 68, 0.3)',
                          borderRadius: 'var(--radius-sm)',
                          padding: '5px 9px',
                          fontSize: '11.5px',
                          fontWeight: '800',
                          color: '#b91c1c',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <span>🔄 Retur</span>
                        <span style={{ fontSize: '10px', opacity: 0.85 }}>({returnEligibility.remainingHours}j)</span>
                      </button>
                    )}

                    {/* Tombol Lihat Detail Pesanan */}
                    <button
                      onClick={() => {
                        setSelectedOrder(order);
                        setDetailModalOpen(true);
                      }}
                      style={{
                        background: 'var(--color-bg-card)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '5px 10px',
                        fontSize: '11.5px',
                        fontWeight: '700',
                        color: 'var(--color-primary-dark)',
                        cursor: 'pointer',
                        boxShadow: 'var(--skeuo-button-raised)',
                      }}
                    >
                      Lihat Detail →
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* DRAWER FILTER: Slide-Up BottomSheet untuk Filter Fleksibel */}
      <BottomSheet
        isOpen={filterDrawerOpen}
        onClose={() => setFilterDrawerOpen(false)}
        title="Filter Riwayat Pesanan 🎛️"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: '16px' }}>
          {/* 1. Filter Rentang Waktu Fleksibel */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: '800', color: 'var(--color-text-main)', display: 'block', marginBottom: '8px' }}>
              🗓️ Rentang Waktu (Fleksibel)
            </label>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '6px',
                marginBottom: '10px',
              }}
            >
              {[
                { id: 'semua', label: 'Semua' },
                { id: 'harian', label: 'Harian' },
                { id: 'bulanan', label: 'Bulanan' },
                { id: 'tahunan', label: 'Tahunan' },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setFilterTimeMode(t.id)}
                  style={{
                    padding: '8px 4px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '11.5px',
                    fontWeight: '700',
                    border: filterTimeMode === t.id ? '1.5px solid var(--color-primary)' : '1px solid var(--color-border)',
                    background: filterTimeMode === t.id ? 'rgba(46, 125, 50, 0.12)' : 'var(--color-bg-card)',
                    color: filterTimeMode === t.id ? 'var(--color-primary-dark)' : 'var(--color-text-main)',
                    cursor: 'pointer',
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Input Spesifik Berdasarkan Mode Waktu */}
            {filterTimeMode === 'harian' && (
              <div style={{ background: 'var(--color-bg-base)', padding: '10px', borderRadius: 'var(--radius-sm)' }}>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1.5px solid var(--color-border)',
                    fontSize: '13px',
                    background: 'var(--color-bg-card)',
                    color: 'var(--color-text-main)',
                  }}
                />
                <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                  <button
                    type="button"
                    onClick={setQuickToday}
                    style={{
                      flex: 1,
                      padding: '6px',
                      fontSize: '11px',
                      fontWeight: '700',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--color-bg-card)',
                      border: '1px solid var(--color-border)',
                      cursor: 'pointer',
                    }}
                  >
                    Hari Ini
                  </button>
                  <button
                    type="button"
                    onClick={setQuickYesterday}
                    style={{
                      flex: 1,
                      padding: '6px',
                      fontSize: '11px',
                      fontWeight: '700',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--color-bg-card)',
                      border: '1px solid var(--color-border)',
                      cursor: 'pointer',
                    }}
                  >
                    Kemarin
                  </button>
                </div>
              </div>
            )}

            {filterTimeMode === 'bulanan' && (
              <div style={{ background: 'var(--color-bg-base)', padding: '10px', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '8px' }}>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(Number(e.target.value))}
                    style={{
                      padding: '10px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1.5px solid var(--color-border)',
                      fontSize: '13px',
                      background: 'var(--color-bg-card)',
                      color: 'var(--color-text-main)',
                    }}
                  >
                    {monthNames.map((m, idx) => (
                      <option key={idx + 1} value={idx + 1}>
                        {m}
                      </option>
                    ))}
                  </select>

                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    style={{
                      padding: '10px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1.5px solid var(--color-border)',
                      fontSize: '13px',
                      background: 'var(--color-bg-card)',
                      color: 'var(--color-text-main)',
                    }}
                  >
                    {[2024, 2025, 2026, 2027].map((yr) => (
                      <option key={yr} value={yr}>
                        {yr}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={setQuickThisMonth}
                  style={{
                    width: '100%',
                    marginTop: '8px',
                    padding: '6px',
                    fontSize: '11px',
                    fontWeight: '700',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--color-bg-card)',
                    border: '1px solid var(--color-border)',
                    cursor: 'pointer',
                  }}
                >
                  Bulan Ini ({monthNames[new Date().getMonth()]} {new Date().getFullYear()})
                </button>
              </div>
            )}

            {filterTimeMode === 'tahunan' && (
              <div style={{ background: 'var(--color-bg-base)', padding: '10px', borderRadius: 'var(--radius-sm)' }}>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1.5px solid var(--color-border)',
                    fontSize: '13px',
                    background: 'var(--color-bg-card)',
                    color: 'var(--color-text-main)',
                  }}
                >
                  {[2024, 2025, 2026, 2027, 2028].map((yr) => (
                    <option key={yr} value={yr}>
                      Tahun {yr}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={setQuickThisYear}
                  style={{
                    width: '100%',
                    marginTop: '8px',
                    padding: '6px',
                    fontSize: '11px',
                    fontWeight: '700',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--color-bg-card)',
                    border: '1px solid var(--color-border)',
                    cursor: 'pointer',
                  }}
                >
                  Tahun Ini ({new Date().getFullYear()})
                </button>
              </div>
            )}
          </div>

          {/* 2. Filter Status Pengiriman */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: '800', color: 'var(--color-text-main)', display: 'block', marginBottom: '8px' }}>
              📦 Status Pengiriman
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
              {[
                { id: 'semua', label: 'Semua Status' },
                { id: 'proses', label: '⏳ Sedang Diproses' },
                { id: 'terkirim', label: '✅ Selesai (Terkirim)' },
                { id: 'retur', label: '🔄 Diretur (Retur)' },
              ].map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setFilterStatus(s.id)}
                  style={{
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '11.5px',
                    fontWeight: '700',
                    textAlign: 'left',
                    border: filterStatus === s.id ? '1.5px solid var(--color-primary)' : '1px solid var(--color-border)',
                    background: filterStatus === s.id ? 'rgba(46, 125, 50, 0.12)' : 'var(--color-bg-card)',
                    color: filterStatus === s.id ? 'var(--color-primary-dark)' : 'var(--color-text-main)',
                    cursor: 'pointer',
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* 3. Filter Jenis Layanan */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: '800', color: 'var(--color-text-main)', display: 'block', marginBottom: '8px' }}>
              🚚 Kategori Layanan
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
              {[
                { id: 'semua', label: 'Semua' },
                { id: 'paket_ekspedisi', label: 'Ekspedisi' },
                { id: 'titip_beli', label: 'Titip Beli' },
              ].map((srv) => (
                <button
                  key={srv.id}
                  type="button"
                  onClick={() => setFilterService(srv.id)}
                  style={{
                    padding: '8px 6px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '11.5px',
                    fontWeight: '700',
                    textAlign: 'center',
                    border: filterService === srv.id ? '1.5px solid var(--color-primary)' : '1px solid var(--color-border)',
                    background: filterService === srv.id ? 'rgba(46, 125, 50, 0.12)' : 'var(--color-bg-card)',
                    color: filterService === srv.id ? 'var(--color-primary-dark)' : 'var(--color-text-main)',
                    cursor: 'pointer',
                  }}
                >
                  {srv.label}
                </button>
              ))}
            </div>
          </div>

          {/* 4. Pencarian Resi / Nama Barang */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: '800', color: 'var(--color-text-main)', display: 'block', marginBottom: '6px' }}>
              🔍 Cari No. Resi atau Nama Barang
            </label>
            <input
              type="text"
              placeholder="Contoh: JST-1234 atau Gula Pasir"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 'var(--radius-sm)',
                border: '1.5px solid var(--color-border)',
                fontSize: '13px',
                background: 'var(--color-bg-card)',
                color: 'var(--color-text-main)',
              }}
            />
          </div>

          {/* Tombol Aksi Filter */}
          <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
            <Button variant="outline" onClick={handleResetFilters} style={{ flex: 1 }}>
              Reset Filter
            </Button>
            <Button onClick={() => setFilterDrawerOpen(false)} style={{ flex: 1.4 }}>
              Terapkan Filter
            </Button>
          </div>
        </div>
      </BottomSheet>

      {/* DETAIL PESANAN BOTTOMSHEET */}
      <BottomSheet
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        title="Rincian Pesanan 📦"
      >
        {selectedOrder && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', paddingBottom: '16px' }}>
            {/* Header Ringkas Resi & Status */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px',
                background: 'var(--color-bg-base)',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <div>
                <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Nomor Resi / ID:</span>
                <div style={{ fontSize: '16px', fontWeight: '800', color: 'var(--color-text-main)' }}>
                  {selectedOrder.nomor_resi || `Order #${selectedOrder.id.slice(0, 8)}`}
                </div>
              </div>
              <Badge variant={getDeliveryStatusMeta(selectedOrder.status_pengiriman).variant}>
                {getDeliveryStatusMeta(selectedOrder.status_pengiriman).label}
              </Badge>
            </div>

            {/* Informasi Detail Barang */}
            <div style={{ fontSize: '13px', color: 'var(--color-text-main)', lineHeight: '1.5' }}>
              <div style={{ marginBottom: '8px' }}>
                <span style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: '11.5px' }}>Deskripsi Barang:</span>
                <strong>{selectedOrder.deskripsi_barang?.replace(/\[RETUR[\s\S]*\]/, '').trim() || selectedOrder.deskripsi_barang}</strong>
              </div>

              <div style={{ marginBottom: '8px' }}>
                <span style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: '11.5px' }}>Alamat Tujuan:</span>
                <div>📍 {selectedOrder.alamat_tujuan || '-'}</div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px' }}>
                <div style={{ background: 'var(--color-bg-base)', padding: '10px', borderRadius: 'var(--radius-sm)' }}>
                  <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Metode Pembayaran</span>
                  <div style={{ fontWeight: '800' }}>{selectedOrder.metode_pembayaran || 'COD'}</div>
                </div>

                <div style={{ background: 'var(--color-bg-base)', padding: '10px', borderRadius: 'var(--radius-sm)' }}>
                  <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Ongkir Kurir</span>
                  <div style={{ fontWeight: '800', color: 'var(--color-primary-dark)' }}>
                    {formatRupiah(selectedOrder.ongkir_patokan || selectedOrder.ongkir_diterima || 0)}
                  </div>
                </div>
              </div>
            </div>

            {/* Bagian Status Retur Jika Sudah Diretur */}
            {selectedOrder.status_pengiriman === 'retur' && (
              <div
                style={{
                  background: 'rgba(239, 68, 68, 0.08)',
                  border: '1.5px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px',
                }}
              >
                <div style={{ fontWeight: '800', color: '#b91c1c', marginBottom: '6px' }}>
                  🔄 Paket Berstatus Diretur
                </div>
                {parseReturInfo(selectedOrder.deskripsi_barang)?.alasan && (
                  <p style={{ fontSize: '12.5px', color: 'var(--color-text-main)', margin: '0 0 8px 0' }}>
                    <strong>Alasan Retur:</strong> {parseReturInfo(selectedOrder.deskripsi_barang).alasan}
                  </p>
                )}
                <div
                  style={{
                    fontSize: '11.5px',
                    color: 'var(--color-text-muted)',
                    lineHeight: '1.4',
                    paddingTop: '6px',
                    borderTop: '1px dashed rgba(239, 68, 68, 0.25)',
                  }}
                >
                  🏍️ <strong>Ketentuan Jastip Pelosok:</strong> Ongkos kirim kurir (
                  {formatRupiah(selectedOrder.ongkir_patokan || selectedOrder.ongkir_diterima || 0)}) tetap
                  dibayarkan penuh kepada kurir atas jasa perjalanan pengantaran ke pelosok desa.
                </div>
              </div>
            )}

            {/* Bagian Opsi Pengajuan Retur Jika Belum Diretur */}
            {selectedOrder.status_pengiriman === 'terkirim' && (() => {
              const elig = checkReturnEligibility(selectedOrder);
              if (elig.eligible) {
                return (
                  <div
                    style={{
                      background: 'rgba(245, 158, 11, 0.1)',
                      border: '1.5px solid rgba(245, 158, 11, 0.35)',
                      borderRadius: 'var(--radius-md)',
                      padding: '12px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '800', color: '#b45309', marginBottom: '4px' }}>
                      <span>⏰</span>
                      <span>Batas Waktu Retur: Sisa {elig.remainingHours} Jam</span>
                    </div>
                    <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', margin: '0 0 10px 0', lineHeight: '1.4' }}>
                      Paket dapat diajukan retur maksimal 2 hari sejak diterima. Ongkir kurir tetap berlaku untuk jasa perjalanan.
                    </p>
                    <button
                      onClick={() => handleOpenReturModal(selectedOrder)}
                      style={{
                        width: '100%',
                        background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: 'var(--radius-sm)',
                        padding: '10px',
                        fontSize: '13px',
                        fontWeight: '800',
                        cursor: 'pointer',
                        boxShadow: '0 4px 10px rgba(220, 38, 38, 0.3)',
                      }}
                    >
                      🔄 Ajukan Retur Paket Ini
                    </button>
                  </div>
                );
              }
              return (
                <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', textAlign: 'center', padding: '8px' }}>
                  ⏳ Batas waktu retur paket (2 hari sejak terkirim) telah berakhir.
                </div>
              );
            })()}

            <div style={{ marginTop: '10px' }}>
              <Button variant="outline" onClick={() => setDetailModalOpen(false)}>
                Tutup Rincian
              </Button>
            </div>
          </div>
        )}
      </BottomSheet>

      {/* FORM PENGAJUAN RETUR BOTTOMSHEET */}
      <BottomSheet
        isOpen={returModalOpen}
        onClose={() => !returSubmitting && setReturModalOpen(false)}
        title="Ajukan Retur Paket 🔄"
      >
        {returTargetOrder && (
          <form onSubmit={handleSubmitRetur} style={{ display: 'flex', flexDirection: 'column', gap: '14px', paddingBottom: '16px' }}>
            {/* Box Ketentuan Retur & Ongkir Kurir */}
            <div
              style={{
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1.5px solid rgba(239, 68, 68, 0.25)',
                borderRadius: 'var(--radius-md)',
                padding: '12px',
                fontSize: '12px',
                lineHeight: '1.45',
              }}
            >
              <div style={{ fontWeight: '800', color: '#b91c1c', marginBottom: '4px' }}>
                ⚠️ Ketentuan Retur Jastip Pelosok:
              </div>
              <ul style={{ margin: 0, paddingLeft: '18px', color: 'var(--color-text-main)' }}>
                <li>Masa garansi retur maksimal <strong>2 hari (48 jam)</strong> sejak paket diterima.</li>
                <li>
                  <strong>Ongkos Kirim Kurir Tetap Dibayarkan:</strong> Kurir kami telah menempuh perjalanan pelosok
                  mengantarkan paket. Ongkir sebesar{' '}
                  <strong>{formatRupiah(returTargetOrder.ongkir_patokan || returTargetOrder.ongkir_diterima || 0)}</strong>{' '}
                  tetap menjadi hak kurir dan tidak dapat dikembalikan.
                </li>
                <li>Dana yang diretur/dibatalkan adalah nilai belanja barang atau pengembalian barang fisik.</li>
              </ul>
            </div>

            {/* Target Order Info */}
            <div style={{ fontSize: '12.5px', color: 'var(--color-text-muted)' }}>
              Paket: <strong>{returTargetOrder.nomor_resi || `Order #${returTargetOrder.id.slice(0, 8)}`}</strong> (
              {returTargetOrder.deskripsi_barang?.replace(/\[RETUR[\s\S]*\]/, '').trim() || '-'})
            </div>

            {/* Input Alasan Manual */}
            <div>
              <label style={{ fontSize: '12.5px', fontWeight: '800', color: 'var(--color-text-main)', display: 'block', marginBottom: '6px' }}>
                Tulis Alasan Retur Secara Manual *
              </label>
              <textarea
                required
                rows={4}
                value={returAlasan}
                onChange={(e) => setReturAlasan(e.target.value)}
                placeholder="Tuliskan secara rinci kondisi barang (misal: barang pecah/rusak saat dibuka, isi pesanan tidak sesuai, dsb)..."
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1.5px solid var(--color-border)',
                  fontSize: '13px',
                  background: 'var(--color-bg-card)',
                  color: 'var(--color-text-main)',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                }}
              />
            </div>

            {/* Input Kontak WhatsApp */}
            <div>
              <label style={{ fontSize: '12.5px', fontWeight: '800', color: 'var(--color-text-main)', display: 'block', marginBottom: '6px' }}>
                Nomor WhatsApp yang Dapat Dihubungi *
              </label>
              <input
                type="tel"
                required
                value={returWa}
                onChange={(e) => setReturWa(e.target.value)}
                placeholder="Contoh: 081234567890"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1.5px solid var(--color-border)',
                  fontSize: '13px',
                  background: 'var(--color-bg-card)',
                  color: 'var(--color-text-main)',
                }}
              />
            </div>

            {/* Checkbox Konfirmasi Pemahaman Ongkir Kurir */}
            <label
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px',
                fontSize: '12px',
                color: 'var(--color-text-main)',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={returAgreed}
                onChange={(e) => setReturAgreed(e.target.checked)}
                style={{ marginTop: '2px' }}
                required
              />
              <span>
                Saya memahami dan menyetujui bahwa <strong>ongkir kurir tetap dibayarkan</strong> atas jasa perjalanan
                kurir mengantar paket ke pelosok.
              </span>
            </label>

            {/* Tombol Aksi */}
            <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
              <Button
                type="button"
                variant="outline"
                disabled={returSubmitting}
                onClick={() => setReturModalOpen(false)}
                style={{ flex: 1 }}
              >
                Batal
              </Button>
              <Button
                type="submit"
                loading={returSubmitting}
                style={{
                  flex: 1.5,
                  background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                }}
              >
                Kirim Retur Paket
              </Button>
            </div>
          </form>
        )}
      </BottomSheet>

      {/* POPUP NOTIFIKASI / ALERT SHEET */}
      <BottomSheet
        isOpen={alertNotice.open}
        onClose={() => setAlertNotice({ ...alertNotice, open: false })}
        title={alertNotice.title}
      >
        <div style={{ textAlign: 'center', padding: '10px 0 16px 0' }}>
          <div style={{ fontSize: '38px', marginBottom: '10px' }}>
            {alertNotice.type === 'success' ? '✅' : alertNotice.type === 'warning' ? '⚠️' : 'ℹ️'}
          </div>
          <p style={{ fontSize: '14px', color: 'var(--color-text-main)', lineHeight: '1.5' }}>
            {alertNotice.message}
          </p>
          <div style={{ marginTop: '20px' }}>
            <Button onClick={() => setAlertNotice({ ...alertNotice, open: false })}>
              Mengerti
            </Button>
          </div>
        </div>
      </BottomSheet>

      {/* Drawer Sidebar Menu Kanan */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onOpenAddressModal={() => navigate('/dashboard-customer')}
        onTriggerLogout={() => setLogoutSheetOpen(true)}
      />

      {/* Confirmation Sheet Logout */}
      <ConfirmationSheet
        isOpen={logoutSheetOpen}
        onClose={() => setLogoutSheetOpen(false)}
        onConfirm={async () => {
          await authService.logout();
          navigate('/login');
        }}
        title="Konfirmasi Keluar"
        message="Apakah Anda yakin ingin keluar dari akun Jastip Pelosok?"
        confirmText="Ya, Keluar"
        confirmVariant="danger"
      />

      {/* Bottom Navigation Customer */}
      <BottomNav role="customer" />
    </div>
  );
}
