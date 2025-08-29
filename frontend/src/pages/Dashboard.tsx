import React from 'react';
import { useNavigate } from 'react-router-dom';
import FloatingGuideButton from '../components/FloatingGuideButton';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();

  // Hero section style
  const heroStyle = {
    background: '#111',
    color: '#fff',
    minHeight: '60vh',
    width: '100%',
    display: 'flex',
    flexDirection: 'column' as const,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative' as const,
    paddingTop: 80,
    paddingBottom: 0,
    boxSizing: 'border-box' as const
  };

  // Navigation style (logo only)
  const navStyle = {
    width: '100%',
    display: 'flex',
    justifyContent: 'flex-start',
    alignItems: 'center',
    position: 'absolute' as const,
    top: 0,
    left: 0,
    padding: '32px 48px 0 48px',
    zIndex: 2
  };

  // Tombol aksi utama
  const ctaStyle = {
    background: '#fff',
    color: '#111',
    border: 'none',
    borderRadius: 32,
    padding: '16px 40px',
    fontSize: '1.1rem',
    fontWeight: 700,
    marginTop: 32,
    cursor: 'pointer',
    letterSpacing: 0.5,
    boxShadow: 'none',
    transition: 'all 0.2s',
    outline: 'none',
    borderWidth: 2,
    borderStyle: 'solid',
    borderColor: '#fff',
  };

  // Tombol pada card
  const cardBtn = {
    background: '#fff',
    color: '#111',
    border: '2px solid #111',
    borderRadius: 24,
    padding: '10px 28px',
    fontSize: '1rem',
    fontWeight: 600,
    marginTop: 18,
    cursor: 'pointer',
    letterSpacing: 0.5,
    transition: 'all 0.18s',
    outline: 'none',
    boxShadow: 'none',
    display: 'inline-block',
  };

  // SVG wave putih
  const waveSvg = (
    <svg viewBox="0 0 1440 120" style={{ display: 'block', width: '100%', height: 80, position: 'absolute', bottom: -1, left: 0, zIndex: 1 }} xmlns="http://www.w3.org/2000/svg">
      <path fill="#fff" d="M0,80 C360,160 1080,0 1440,80 L1440,120 L0,120 Z" />
    </svg>
  );

  // Icon SVG
  const IconUpload = () => (
    <svg width="38" height="38" viewBox="0 0 36 36" fill="none" stroke="#111" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 27V9M18 9l-6 6M18 9l6 6"/><rect x="6" y="27" width="24" height="3" rx="1.5" fill="#111"/></svg>
  );
  const IconHistory = () => (
    <svg width="38" height="38" viewBox="0 0 36 36" fill="none" stroke="#111" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="18" r="10"/><polyline points="18,12 18,18 22,20"/></svg>
  );
  const IconVerify = () => (
    <svg width="38" height="38" viewBox="0 0 36 36" fill="none" stroke="#111" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="10,19 16,25 26,13"/></svg>
  );

  // Card data
  const cards = [
    {
      icon: <IconUpload />,
      title: 'Upload Video',
      desc: 'Upload rekaman CCTV ke IPFS dengan aman. Video akan otomatis diverifikasi dan disimpan di blockchain.',
      btn: 'Upload',
      onClick: () => navigate('/upload'),
    },
    {
      icon: <IconHistory />,
      title: 'Riwayat Upload',
      desc: 'Lihat semua video yang telah diupload, status verifikasi, dan transaksi blockchain.',
      btn: 'History',
      onClick: () => navigate('/history'),
    },
    {
      icon: <IconVerify />,
      title: 'Verifikasi Video',
      desc: 'Verifikasi keaslian video menggunakan IPFS hash dan blockchain timestamp.',
      btn: 'Verifikasi',
      onClick: () => navigate('/verifikasi'),
    },
  ];

  return (
    <>
      <div style={{ width: '100%', minHeight: '100vh', background: '#fff' }}>
      {/* Hero Section */}
      <section style={heroStyle}>
        {/* Navigation (logo only) */}
        <nav style={navStyle}>
          <div style={{ fontWeight: 700, fontSize: 22, letterSpacing: 1 }}>BLOCKCAM</div>
        </nav>
        {/* Hero Content */}
        <div style={{ zIndex: 2, textAlign: 'center', marginTop: 48 }}>
          <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: 2, marginBottom: 12 }}>BLOCKCAM</div>
          <h1 style={{ fontSize: '3.5rem', fontWeight: 900, letterSpacing: -2, marginBottom: 16, color: '#fff' }}>
            Platform CCTV Blockchain
          </h1>
          <p style={{ fontSize: '1.25rem', color: '#fff', opacity: 0.85, fontWeight: 400, marginBottom: 32, maxWidth: 600, marginLeft: 'auto', marginRight: 'auto' }}>
            Upload, verifikasi, dan kelola rekaman video dengan teknologi IPFS & smart contract yang aman dan terpercaya.
          </p>
          <button style={ctaStyle} onClick={() => navigate('/upload')}>Upload Video</button>
        </div>
        {/* Wave SVG */}
        {waveSvg}
      </section>

      {/* Card fitur di bawah hero section */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '64px 24px 32px 24px', background: '#fff', position: 'relative', zIndex: 2, marginTop: 40 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 32 }}>
          {cards.map((card, i) => (
            <div key={i} style={{
              background: '#fff',
              border: '1.5px solid #e5e7eb',
              borderRadius: 24,
              boxShadow: '0 2px 8px 0 rgba(0,0,0,0.03)',
              padding: 40,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              minHeight: 320,
              justifyContent: 'center',
            }}>
              <div style={{ marginBottom: 18 }}>{card.icon}</div>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 12, color: '#111' }}>{card.title}</h3>
              <p style={{ color: '#444', marginBottom: 18, fontSize: '1rem', lineHeight: 1.6 }}>{card.desc}</p>
              <button style={cardBtn} onClick={card.onClick}>{card.btn}</button>
            </div>
          ))}
        </div>
      </div>
    </div>
    <FloatingGuideButton 
      title="Panduan Dashboard BLOCKCAM"
      content={
        <div style={{ textAlign: 'left', lineHeight: 1.6 }}>
          <h3 style={{ marginTop: 0, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
            🏠 Dashboard BLOCKCAM
          </h3>
          <p style={{ marginBottom: 20, color: '#475569' }}>Pusat kontrol untuk semua fitur BLOCKCAM - platform blockchain untuk keamanan rekaman CCTV Anda.</p>
          
          <h4 style={{ color: '#1e293b', marginTop: 20, marginBottom: 12 }}>🚀 Fitur Utama yang Tersedia:</h4>
          <div style={{ background: '#f8fafc', padding: 16, borderRadius: 8, marginBottom: 16 }}>
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              <li style={{ marginBottom: 8 }}><strong>📤 Upload Video:</strong> Upload rekaman CCTV ke IPFS dengan keamanan blockchain Polygon</li>
              <li style={{ marginBottom: 8 }}><strong>📺 Live View:</strong> Streaming real-time dari kamera RTSP dengan fitur auto-recording</li>
              <li style={{ marginBottom: 8 }}><strong>📚 Riwayat Upload:</strong> Monitor semua video yang telah diupload beserta status transaksinya</li>
              <li style={{ marginBottom: 8 }}><strong>✅ Verifikasi Video:</strong> Verifikasi keaslian dan integritas video menggunakan hash IPFS</li>
            </ul>
          </div>
          
          <h4 style={{ color: '#1e293b', marginTop: 20, marginBottom: 12 }}>💡 Langkah Memulai:</h4>
          <div style={{ background: '#f0f9ff', padding: 16, borderRadius: 8, borderLeft: '4px solid #0ea5e9', marginBottom: 16 }}>
            <ol style={{ margin: 0, paddingLeft: 20 }}>
              <li style={{ marginBottom: 8 }}>Pastikan wallet MetaMask terhubung ke jaringan Polygon</li>
              <li style={{ marginBottom: 8 }}>Pilih <strong>"Upload Video"</strong> untuk mengupload rekaman yang sudah ada</li>
              <li style={{ marginBottom: 8 }}>Gunakan <strong>"Live View"</strong> untuk streaming dan recording real-time</li>
              <li style={{ marginBottom: 8 }}>Akses <strong>"Verifikasi"</strong> untuk mengecek keaslian video dengan CID</li>
              <li style={{ marginBottom: 8 }}>Pantau <strong>"History"</strong> untuk melihat semua aktivitas dan transaksi</li>
            </ol>
          </div>
          
          <h4 style={{ color: '#1e293b', marginTop: 20, marginBottom: 12 }}>🔐 Keamanan & Teknologi:</h4>
          <div style={{ background: '#f0fdf4', padding: 16, borderRadius: 8, borderLeft: '4px solid #22c55e', marginBottom: 16 }}>
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              <li style={{ marginBottom: 6 }}><strong>IPFS Storage:</strong> Penyimpanan terdesentralisasi untuk video</li>
              <li style={{ marginBottom: 6 }}><strong>Polygon Blockchain:</strong> Pencatatan transaksi yang transparan</li>
              <li style={{ marginBottom: 6 }}><strong>Smart Contract:</strong> Otomatisasi proses verifikasi</li>
              <li style={{ marginBottom: 6 }}><strong>Immutable Records:</strong> Data tidak dapat diubah atau dihapus</li>
            </ul>
          </div>
          
          <div style={{ background: '#fef3c7', padding: 12, borderRadius: 8, borderLeft: '4px solid #f59e0b', marginTop: 16 }}>
            <strong>💰 Info Biaya:</strong> Setiap transaksi memerlukan gas fee sekitar 45-55 IDR untuk memastikan keamanan dan kecepatan proses di blockchain Polygon.
          </div>
        </div>
      }
    />
    </>
  );
};

export default Dashboard; 