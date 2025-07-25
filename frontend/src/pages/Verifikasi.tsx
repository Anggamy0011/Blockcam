import React, { useState } from 'react';

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
  );
};

export default Verifikasi; 