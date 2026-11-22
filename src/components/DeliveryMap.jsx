import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

/**
 * DeliveryMap - Peta Multi-Drop Interaktif untuk Kurir Lapangan
 * Menampilkan semua sebaran titik rumah pelanggan (1-20+ rumah)
 * dan posisi real-time kurir dengan visual pin yang jelas dan responsif.
 */
export default function DeliveryMap({
  orders = [],
  selectedOrder = null,
  onSelectOrder = () => {},
  courierLocation = null,
  height = '380px',
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef({});
  const courierMarkerRef = useRef(null);
  const [mapReady, setMapReady] = useState(false);

  // Pusat Default: Kecamatan Naringgul, Cianjur Selatan
  const NARINGGUL_CENTER = [-7.4764, 107.4851];

  // 1. Inisialisasi Peta Leaflet
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: NARINGGUL_CENTER,
        zoom: 13,
        zoomControl: true,
      });

      // Layer OpenStreetMap Bebas Biaya
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      mapInstanceRef.current = map;
      setMapReady(true);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // 2. Render Pin-Pin Rumah Pelanggan (Multi-Drop Pins)
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    // Bersihkan marker lama
    Object.values(markersRef.current).forEach((marker) => marker.remove());
    markersRef.current = {};

    const bounds = [];
    let pinNumber = 1;

    orders.forEach((order) => {
      const lat = parseFloat(order.customer?.latitude);
      const lng = parseFloat(order.customer?.longitude);

      if (!isNaN(lat) && !isNaN(lng)) {
        bounds.push([lat, lng]);

        const isTerkirim = order.status_pengiriman === 'terkirim';
        const isOtw = order.status_pengiriman === 'dalam_perjalanan';
        const isRetur = order.status_pengiriman === 'retur';
        const isSelected = selectedOrder?.id === order.id;

        // Tentukan warna & simbol pin berdasarkan status
        let bgColor = '#f97316'; // Oranye untuk siap antar
        let symbol = pinNumber;

        if (isTerkirim) {
          bgColor = '#16a34a'; // Hijau untuk selesai
          symbol = '✓';
        } else if (isOtw) {
          bgColor = '#2563eb'; // Biru untuk sedang jalan
          symbol = '🛵';
        } else if (isRetur) {
          bgColor = '#dc2626'; // Merah untuk retur
          symbol = '↩';
        }

        const borderStyle = isSelected ? '3px solid #facc15' : '2px solid #ffffff';
        const scaleStyle = isSelected ? 'transform: scale(1.25); z-index: 1000;' : '';

        // Gunakan L.divIcon murni HTML/CSS (anti gambar rusak / 404)
        const customPinHtml = `
          <div style="
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 34px;
            height: 34px;
            border-radius: 50% 50% 50% 0;
            background: ${bgColor};
            transform: rotate(-45deg);
            box-shadow: 0 4px 10px rgba(0,0,0,0.35);
            border: ${borderStyle};
            cursor: pointer;
            transition: all 0.2s ease;
            ${scaleStyle}
          ">
            <span style="
              transform: rotate(45deg);
              color: #ffffff;
              font-weight: 800;
              font-size: ${isTerkirim || isOtw ? '13px' : '12px'};
              font-family: sans-serif;
            ">
              ${symbol}
            </span>
          </div>
        `;

        const icon = L.divIcon({
          html: customPinHtml,
          className: 'custom-pelosok-pin',
          iconSize: [34, 34],
          iconAnchor: [17, 34],
          popupAnchor: [0, -34],
        });

        const marker = L.marker([lat, lng], { icon }).addTo(map);

        // Konten Popup saat pin diklik
        const popupContent = document.createElement('div');
        popupContent.style.minWidth = '200px';
        popupContent.style.fontFamily = 'sans-serif';
        popupContent.style.fontSize = '12px';
        popupContent.innerHTML = `
          <div style="font-weight: 800; font-size: 13.5px; color: #1e293b; margin-bottom: 2px;">
            ${pinNumber}. ${order.customer?.nama || 'Pelanggan'}
          </div>
          <div style="color: #64748b; font-size: 11px; margin-bottom: 6px;">
            📍 ${order.alamat_tujuan || '-'}
          </div>
          <div style="padding: 6px 8px; background: #f1f5f9; border-radius: 6px; margin-bottom: 8px;">
            <div style="font-weight: 700; color: #334155;">📦 ${order.deskripsi_barang || 'Paket Titipan'}</div>
            <div style="color: ${order.status_pengiriman === 'retur' ? '#dc2626' : order.metode_pembayaran === 'COD' ? '#dc2626' : '#16a34a'}; font-weight: 700; margin-top: 2px;">
              ${order.status_pengiriman === 'retur' ? `↩️ RETUR (Ongkir: Rp ${(order.ongkir_diterima || order.ongkir_patokan || 0).toLocaleString('id-ID')})` : order.metode_pembayaran === 'COD' ? `💵 COD: Rp ${(order.ongkir_patokan || 0).toLocaleString('id-ID')}` : '🏦 Transfer Lunas'}
            </div>
          </div>
          <div style="display: flex; gap: 6px;">
            <a href="https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}" target="_blank" rel="noopener noreferrer" 
               style="flex: 1; text-align: center; background: #0284c7; color: #ffffff; padding: 6px; border-radius: 6px; text-decoration: none; font-weight: 700; font-size: 11px;">
              🗺️ Rute Maps
            </a>
            ${order.customer?.no_hp ? `
              <a href="https://wa.me/${order.customer.no_hp.replace(/^0/, '62')}" target="_blank" rel="noopener noreferrer"
                 style="flex: 1; text-align: center; background: #22c55e; color: #ffffff; padding: 6px; border-radius: 6px; text-decoration: none; font-weight: 700; font-size: 11px;">
                💬 WhatsApp
              </a>
            ` : ''}
          </div>
        `;

        marker.bindPopup(popupContent);

        marker.on('click', () => {
          onSelectOrder(order);
        });

        markersRef.current[order.id] = marker;
        pinNumber++;
      }
    });

    // Otomatis atur zoom peta agar semua pin muat di layar
    if (bounds.length > 0) {
      if (courierLocation) bounds.push(courierLocation);
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    }
  }, [orders, selectedOrder, courierLocation]);

  // 3. Render Marker Posisi Kurir Bergerak (Live Courier Marker)
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    if (courierLocation && courierLocation[0] && courierLocation[1]) {
      const courierHtml = `
        <div style="
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: #2563eb;
          box-shadow: 0 0 0 6px rgba(37, 99, 235, 0.3), 0 4px 12px rgba(0,0,0,0.4);
          border: 2px solid #ffffff;
          font-size: 20px;
          animation: courierPulse 2s infinite;
        ">
          🛵
        </div>
      `;

      const courierIcon = L.divIcon({
        html: courierHtml,
        className: 'courier-live-pin',
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      });

      if (courierMarkerRef.current) {
        courierMarkerRef.current.setLatLng(courierLocation);
      } else {
        courierMarkerRef.current = L.marker(courierLocation, {
          icon: courierIcon,
          zIndexOffset: 1500,
        }).addTo(map);
        courierMarkerRef.current.bindTooltip('Posisi Saya Saat Ini', { permanent: false, direction: 'top' });
      }
    } else {
      if (courierMarkerRef.current) {
        courierMarkerRef.current.remove();
        courierMarkerRef.current = null;
      }
    }
  }, [courierLocation]);

  // Tombol Aksi Peta: Reset Zoom ke Semua Titik
  const handleFitAll = () => {
    if (!mapInstanceRef.current) return;
    const bounds = [];
    orders.forEach((o) => {
      const lat = parseFloat(o.customer?.latitude);
      const lng = parseFloat(o.customer?.longitude);
      if (!isNaN(lat) && !isNaN(lng)) bounds.push([lat, lng]);
    });
    if (courierLocation) bounds.push(courierLocation);

    if (bounds.length > 0) {
      mapInstanceRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    } else {
      mapInstanceRef.current.setView(NARINGGUL_CENTER, 13);
    }
  };

  const ordersWithGpsCount = orders.filter(
    (o) => o.customer?.latitude && o.customer?.longitude
  ).length;

  return (
    <div style={{ position: 'relative', width: '100%', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--color-border)', boxShadow: 'var(--skeuo-card-shadow)' }}>
      {/* Kontainer Peta */}
      <div ref={mapContainerRef} style={{ width: '100%', height, background: '#e2e8f0' }} />

      {/* Floating Header Info di Atas Peta */}
      <div
        style={{
          position: 'absolute',
          top: '10px',
          left: '10px',
          right: '10px',
          zIndex: 999,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'rgba(255, 255, 255, 0.92)',
          backdropFilter: 'blur(8px)',
          padding: '8px 12px',
          borderRadius: '10px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          fontSize: '11.5px',
          color: '#1e293b',
        }}
      >
        <div>
          <b>📍 {ordersWithGpsCount} dari {orders.length} Rumah</b> terdeteksi di peta
        </div>
        <button
          type="button"
          onClick={handleFitAll}
          style={{
            background: 'var(--color-primary)',
            color: '#ffffff',
            border: 'none',
            borderRadius: '6px',
            padding: '4px 8px',
            fontSize: '11px',
            fontWeight: '700',
            cursor: 'pointer',
          }}
        >
          🔍 Lihat Semua
        </button>
      </div>

      {/* Legend / Keterangan Warna Pin di Bawah Peta */}
      <div
        style={{
          padding: '8px 12px',
          background: 'var(--color-bg-card)',
          borderTop: '1px solid var(--color-border)',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          fontSize: '11px',
          color: 'var(--color-text-muted)',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', background: '#f97316' }} />
          <span>Siap Antar</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', background: '#2563eb' }} />
          <span>Dalam Perjalanan</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', background: '#16a34a' }} />
          <span>Terkirim</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', background: '#dc2626' }} />
          <span>Retur (Batal/Ongkir)</span>
        </div>
        {courierLocation && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span>🛵</span>
            <span style={{ fontWeight: '700', color: '#2563eb' }}>Posisi Saya</span>
          </div>
        )}
      </div>
    </div>
  );
}
