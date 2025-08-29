import React, { useState } from 'react';
import WalletProtection from '../components/WalletProtection';
import FloatingGuideButton from '../components/FloatingGuideButton';

const Verifikasi: React.FC = () => {
  const [cid, setCid] = useState('');
  const [showVideo, setShowVideo] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);

  const handleVerifikasi = async (e: React.FormEvent) => {
    e.preventDefault();
    setShowVideo(false);
    setError('');
    setInfo('');
    if (!cid) {
      setError('CID harus diisi');
      return;
    }
    setLoading(true);
    try {
      // Cek ketersediaan file di IPFS via backend
      const res = await fetch(`http://localhost:4000/blockchain/check-cid-ipfs/${cid}`);
      const data = await res.json();
      if (data.exists) {
        setShowVideo(true);
        setInfo('Video ditemukan di IPFS.');
      } else {
        setShowVideo(false);
        setError('Video tidak ditemukan di IPFS.');
      }
    } catch {
      setShowVideo(false);
      setError('Video tidak ditemukan di IPFS.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <WalletProtection>
      <div style={{
        padding: "24px 32px",
        fontSize: "1rem",
        background: "#ffffff",
        width: "100%",
        height: "100%",
        boxSizing: "border-box"
      }}>
        <h1 style={{ marginBottom: "8px", fontSize: "2rem", fontWeight: "600" }}>
          Verifikasi
        </h1>
        <div style={{ marginBottom: '24px', color: '#555', fontSize: '1rem', textAlign: 'left' }}>
          Masukkan <b>CID IPFS</b> untuk memverifikasi dan menampilkan video CCTV yang tersimpan di IPFS.
        </div>

        <div style={{
          background: "#f9fafb",
          padding: "24px",
          borderRadius: "12px",
          border: "1px solid #e5e7eb"
        }}>
          <h3 style={{ marginBottom: "16px", fontSize: "1.25rem", fontWeight: "600" }}>
            Verifikasi Video
          </h3>
          <form onSubmit={handleVerifikasi} style={{ marginBottom: '24px' }}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>CID IPFS:</label>
              <input
                type="text"
                value={cid}
                onChange={e => setCid(e.target.value)}
                placeholder="Masukkan CID dari Pinata/IPFS"
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px' }}
                disabled={loading}
              />
            </div>
            <button
              type="submit"
              style={{
                background: loading ? '#9ca3af' : "#000000",
                color: "#ffffff",
                border: "none",
                padding: "12px 24px",
                borderRadius: "8px",
                fontSize: "14px",
                fontWeight: "500",
                cursor: loading ? 'not-allowed' : "pointer"
              }}
              disabled={loading}
            >
              {loading ? 'Memeriksa...' : 'Verifikasi & Tampilkan Video'}
            </button>
          </form>
          {info && (
            <div style={{
              marginBottom: "16px",
              padding: "12px 16px",
              background: "#f0fdf4",
              border: "1px solid #bbf7d0",
              borderRadius: "8px",
              color: "#166534",
              fontSize: "14px"
            }}>
              {info}
            </div>
          )}
          {error && (
            <div style={{
              marginBottom: "16px",
              padding: "12px 16px",
              background: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: "8px",
              color: "#dc2626",
              fontSize: "14px"
            }}>
              {error}
            </div>
          )}
          {showVideo && (
            <div style={{ marginTop: '24px' }}>
              <h4 style={{ marginBottom: '8px', fontSize: '16px', fontWeight: '600' }}>Video CCTV dari IPFS</h4>
              <div style={{
                width: '100%',
                maxWidth: '600px',
                margin: '0 auto',
                aspectRatio: '16/9',
                background: '#000',
                borderRadius: '8px',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                maxHeight: '60vh',
              }}>
                <video
                  src={`https://gateway.pinata.cloud/ipfs/${cid}`}
                  controls
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    background: '#000',
                    display: 'block',
                  }}
                >
                  Browser Anda tidak mendukung tag video.
                </video>
              </div>
              <div style={{ marginTop: '8px', fontSize: '14px', color: '#374151' }}>
                <strong>CID:</strong> {cid}
              </div>
            </div>
          )}
        </div>
      </div>
    </WalletProtection>
    <FloatingGuideButton 
      title="Panduan Verifikasi Video BLOCKCAM"
      content={
        <div style={{ textAlign: 'left', lineHeight: 1.6 }}>
          <h3 style={{ marginTop: 0, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
            🔍 Verifikasi Keaslian Video
          </h3>
          <p style={{ marginBottom: 20, color: '#475569' }}>Verifikasi integritas dan keaslian video yang tersimpan di IPFS menggunakan Content Identifier (CID).</p>
          
          <h4 style={{ color: '#1e293b', marginTop: 20, marginBottom: 12 }}>📋 Cara Melakukan Verifikasi:</h4>
          <div style={{ background: '#f0f9ff', padding: 16, borderRadius: 8, borderLeft: '4px solid #0ea5e9', marginBottom: 16 }}>
            <ol style={{ margin: 0, paddingLeft: 20 }}>
              <li style={{ marginBottom: 8 }}>Dapatkan <strong>CID (Content Identifier)</strong> dari video yang ingin diverifikasi</li>
              <li style={{ marginBottom: 8 }}>Masukkan CID pada input field di halaman verifikasi</li>
              <li style={{ marginBottom: 8 }}>Klik tombol <strong>"Verifikasi Video"</strong> untuk memulai proses</li>
              <li style={{ marginBottom: 8 }}>Tunggu sistem mengecek keberadaan video di jaringan IPFS</li>
              <li style={{ marginBottom: 8 }}>Video akan ditampilkan otomatis jika ditemukan dan valid</li>
              <li style={{ marginBottom: 8 }}>Periksa metadata dan informasi blockchain yang muncul</li>
            </ol>
          </div>
          
          <h4 style={{ color: '#1e293b', marginTop: 20, marginBottom: 12 }}>🔗 Memahami CID (Content Identifier):</h4>
          <div style={{ background: '#f8fafc', padding: 16, borderRadius: 8, marginBottom: 16 }}>
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              <li style={{ marginBottom: 8 }}><strong>Format CID v0:</strong> <code style={{ background: '#e2e8f0', padding: '2px 6px', borderRadius: 4, fontSize: 12 }}>QmX1234abcd...</code> (dimulai dengan 'Qm')</li>
              <li style={{ marginBottom: 8 }}><strong>Format CID v1:</strong> <code style={{ background: '#e2e8f0', padding: '2px 6px', borderRadius: 4, fontSize: 12 }}>bafybei...</code> (dimulai dengan 'bafy')</li>
              <li style={{ marginBottom: 8 }}><strong>Panjang:</strong> Biasanya 46-59 karakter</li>
              <li style={{ marginBottom: 8 }}><strong>Unik:</strong> Setiap file memiliki CID yang berbeda dan tidak bisa dipalsukan</li>
            </ul>
          </div>
          
          <h4 style={{ color: '#1e293b', marginTop: 20, marginBottom: 12 }}>📍 Sumber Mendapatkan CID:</h4>
          <div style={{ background: '#f0fdf4', padding: 16, borderRadius: 8, borderLeft: '4px solid #22c55e', marginBottom: 16 }}>
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              <li style={{ marginBottom: 8 }}><strong>Halaman History:</strong> Lihat daftar video yang sudah diupload</li>
              <li style={{ marginBottom: 8 }}><strong>Notifikasi Upload:</strong> CID muncul setelah upload berhasil</li>
              <li style={{ marginBottom: 8 }}><strong>Transaksi Blockchain:</strong> Cek detail transaksi di Polygonscan</li>
              <li style={{ marginBottom: 8 }}><strong>Email/Log System:</strong> Jika ada sistem notifikasi otomatis</li>
            </ul>
          </div>
          
          <h4 style={{ color: '#1e293b', marginTop: 20, marginBottom: 12 }}>✅ Manfaat Sistem Verifikasi:</h4>
          <div style={{ background: '#fef3c7', padding: 16, borderRadius: 8, borderLeft: '4px solid #f59e0b', marginBottom: 16 }}>
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              <li style={{ marginBottom: 6 }}><strong>Integritas Data:</strong> Memastikan video tidak diubah atau rusak</li>
              <li style={{ marginBottom: 6 }}><strong>Keaslian:</strong> Konfirmasi video tersimpan di blockchain</li>
              <li style={{ marginBottom: 6 }}><strong>Akses Cepat:</strong> Preview video tanpa download penuh</li>
              <li style={{ marginBottom: 6 }}><strong>Transparansi:</strong> Verifikasi publik yang dapat diaudit</li>
            </ul>
          </div>
          
          <h4 style={{ color: '#1e293b', marginTop: 20, marginBottom: 12 }}>🔐 Keamanan & Trust:</h4>
          <div style={{ background: '#fdf4ff', padding: 16, borderRadius: 8, borderLeft: '4px solid #a855f7', marginBottom: 16 }}>
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              <li style={{ marginBottom: 6 }}><strong>Immutable:</strong> CID tidak dapat dipalsukan atau diubah</li>
              <li style={{ marginBottom: 6 }}><strong>Cryptographic Hash:</strong> Menggunakan algoritma hash yang aman</li>
              <li style={{ marginBottom: 6 }}><strong>Distributed:</strong> Data tersebar di multiple nodes IPFS</li>
              <li style={{ marginBottom: 6 }}><strong>Blockchain Verified:</strong> Dicatat permanen di Polygon network</li>
            </ul>
          </div>
          
          <div style={{ background: '#fef2f2', padding: 12, borderRadius: 8, borderLeft: '4px solid #ef4444', marginTop: 16 }}>
            <strong>⚠️ Troubleshooting:</strong> Jika video tidak ditemukan, periksa: CID benar, video sudah selesai upload, koneksi internet stabil, dan IPFS node aktif.
          </div>
        </div>
      }
    />
    </>
  );
};

export default Verifikasi; 