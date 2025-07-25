import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import './index.css'
import React from 'react';
import Hls from 'hls.js';
// Hapus import Hls

// Import pages
import Dashboard from './pages/Dashboard'
import Upload from './pages/Upload'
import Verifikasi from './pages/Verifikasi'
import History from './pages/History'
// Hapus import Login

// Import components
import WalletConnect from './components/WalletConnect'
import { WalletProvider } from './contexts/WalletContext';

// Icon Components
const HomeIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
    <polyline points="9,22 9,12 15,12 15,22"/>
  </svg>
);

const UploadIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="7,10 12,15 17,10"/>
    <line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
);

const VerifyIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
    <polyline points="22,4 12,14.01 9,11.01"/>
  </svg>
);

const HistoryIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"/>
    <polyline points="12,6 12,12 16,14"/>
  </svg>
);

const CameraIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="7" width="18" height="10" rx="3"/>
    <circle cx="12" cy="12" r="3"/>
    <rect x="16" y="10" width="4" height="4" rx="1" fill="#111"/>
  </svg>
);

function RtspPage() {
  const [rtspUrl, setRtspUrl] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [streamReady, setStreamReady] = React.useState(false);
  const [isStreaming, setIsStreaming] = React.useState(false);
  const [isStarting, setIsStarting] = React.useState(false);
  const [isRecording, setIsRecording] = React.useState(false);
  const [recLoading, setRecLoading] = React.useState(false);
  const [recError, setRecError] = React.useState('');
  const [segmentTime] = React.useState(180); // 3 menit, bisa diubah nanti
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const hlsRef = React.useRef<Hls | null>(null);
  const [uploadedCount, setUploadedCount] = React.useState(0);
  const [txCount, setTxCount] = React.useState(0);
  const [contractAddress, setContractAddress] = React.useState('');
  const [backendBalance, setBackendBalance] = React.useState(0);
  const [backendAddress, setBackendAddress] = React.useState('');
  const [progress, setProgress] = React.useState({ uploadStatus: 'idle', txStatus: 'idle', lastFileName: '', lastCid: '', lastTxHash: '', lastTime: '', lastError: '' });

  // Fetch stats jumlah upload dan transaksi
  React.useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch('http://localhost:4000/blockchain/recording/stats');
        const data = await res.json();
        setUploadedCount(data.uploadedCount || 0);
        setTxCount(data.txCount || 0);
      } catch {/* ignore error */}
    }
    fetchStats();
    const interval = setInterval(fetchStats, 5000); // update setiap 5 detik
    return () => clearInterval(interval);
  }, []);

  // Fetch smart contract address
  React.useEffect(() => {
    async function fetchContractInfo() {
      try {
        const res = await fetch('http://localhost:4000/blockchain/info');
        const data = await res.json();
        setContractAddress(data.address || (data.data && data.data.address) || '');
      } catch {/* ignore error */}
    }
    fetchContractInfo();
  }, []);

  // Fetch backend wallet balance
  React.useEffect(() => {
    async function fetchBackendBalance() {
      try {
        const res = await fetch('http://localhost:4000/blockchain/recording/backend-balance');
        const data = await res.json();
        setBackendBalance(Number(data.balance || 0));
        setBackendAddress(data.address || '');
      } catch {/* ignore error */}
    }
    fetchBackendBalance();
    const interval = setInterval(fetchBackendBalance, 5000);
    return () => clearInterval(interval);
  }, []);

  // Polling progress status
  React.useEffect(() => {
    async function fetchProgress() {
      try {
        const res = await fetch('http://localhost:4000/blockchain/recording/progress');
        const data = await res.json();
        setProgress(data);
      } catch {/* ignore */}
    }
    fetchProgress();
    const interval = setInterval(fetchProgress, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleStart = async () => {
    setError('');
    if (!rtspUrl.trim()) {
      setError('RTSP URL tidak boleh kosong');
      return;
    }
    setLoading(true);
    setIsStarting(true);
    setStreamReady(false);
    try {
      const res = await fetch('http://localhost:4000/blockchain/rtsp/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rtspUrl })
      });
      const data = await res.json();
      if (data.success) {
        waitForHls();
      } else {
        setError(data.error || 'Gagal memulai stream');
        setIsStarting(false);
      }
    } catch {
      setError('Gagal menghubungi server');
      setIsStarting(false);
    }
    setLoading(false);
  };

  const handleStop = async () => {
    setLoading(true);
    setError('');
    try {
      await fetch('http://localhost:4000/blockchain/rtsp/stop', { method: 'POST' });
      setIsStreaming(false);
      setStreamReady(false);
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      if (videoRef.current) videoRef.current.src = '';
    } catch {
      setError('Gagal menghentikan stream');
    }
    setLoading(false);
  };

  const waitForHls = async () => {
    for (let i = 0; i < 20; i++) { // max 4 detik
      try {
        const res = await fetch('http://localhost:4000/hls/stream.m3u8', { method: 'HEAD' });
        if (res.ok) {
          setStreamReady(true);
          setIsStreaming(true);
          setIsStarting(false);
          return;
        }
      } catch { /* ignore error, will retry */ }
      await new Promise(r => setTimeout(r, 200));
    }
    setError('Stream tidak tersedia');
    setLoading(false);
    setIsStarting(false);
  };

  const handleStartRecording = async () => {
    setRecLoading(true);
    setRecError('');
    try {
      const res = await fetch('http://localhost:4000/blockchain/recording/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ segmentTime, rtspUrl })
      });
      const data = await res.json();
      if (data.success) {
        setIsRecording(true);
      } else {
        setRecError(data.error || 'Gagal memulai rekaman');
      }
    } catch {
      setRecError('Gagal menghubungi server');
    }
    setRecLoading(false);
  };

  const handleStopRecording = async () => {
    setRecLoading(true);
    setRecError('');
    try {
      await fetch('http://localhost:4000/blockchain/recording/stop', { method: 'POST' });
      setIsRecording(false);
    } catch {
      setRecError('Gagal menghentikan rekaman');
    }
    setRecLoading(false);
  };

  React.useEffect(() => {
    if (streamReady && videoRef.current && Hls.isSupported()) {
      const hls = new Hls();
      hls.loadSource('http://localhost:4000/hls/stream.m3u8');
      hls.attachMedia(videoRef.current);
      hlsRef.current = hls;
    }
    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [streamReady]);

  return (
    <div style={{ maxWidth: 900, margin: '40px auto', padding: 32, background: '#fff', borderRadius: 16, boxShadow: '0 2px 8px #0001', textAlign: 'center' }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: 24 }}>Live View RTSP</h1>
      {contractAddress && (
        <div style={{ marginBottom: 18, fontSize: 15 }}>
          Smart Contract: <a href={`https://polygonscan.com/address/${contractAddress}`} target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb', textDecoration: 'underline', wordBreak: 'break-all' }}>{contractAddress}</a>
        </div>
      )}
      {/* Video Box di paling atas */}
      <div style={{ position: 'relative', width: '100%', maxWidth: 640, margin: '0 auto 32px auto' }}>
        {(loading || (!streamReady && isStreaming)) && (
          <div style={{ width: '100%', aspectRatio: '16/9', background: '#111', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{
              border: '4px solid #e5e7eb',
              borderTop: '4px solid #2563eb',
              borderRadius: '50%',
              width: 48,
              height: 48,
              animation: 'spin 1s linear infinite',
              margin: '0 auto'
            }} />
            <style>{`
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}</style>
          </div>
        )}
        {streamReady && isStreaming && (
          <div style={{ width: '100%', aspectRatio: '16/9', background: '#000', borderRadius: 12, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <video
              ref={videoRef}
              controls
              autoPlay
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                background: '#000',
                display: 'block'
              }}
            />
          </div>
        )}
      </div>
      <input
        type="text"
        value={rtspUrl}
        onChange={e => setRtspUrl(e.target.value)}
        placeholder="rtsp://username:password@ip:port/stream"
        style={{ width: '100%', padding: 12, borderRadius: 8, border: '1.5px solid #e5e7eb', fontSize: 16, fontFamily: 'monospace', marginBottom: 12 }}
        disabled={isStreaming || loading || isStarting || isRecording || recLoading}
      />
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginBottom: 16 }}>
        <button onClick={handleStart} disabled={isStreaming || loading || isStarting || isRecording || recLoading} style={{ background: isStreaming || loading || isStarting || isRecording || recLoading ? '#e5e7eb' : '#2563eb', color: isStreaming || loading || isStarting || isRecording || recLoading ? '#888' : '#fff', padding: '12px 28px', borderRadius: 8, fontWeight: 600, fontSize: 16, border: 'none', cursor: isStreaming || loading || isStarting || isRecording || recLoading ? 'not-allowed' : 'pointer' }}>Mulai Stream</button>
        <button onClick={handleStop} disabled={!isStreaming || loading || isStarting} style={{ background: !isStreaming || loading || isStarting ? '#e5e7eb' : '#dc2626', color: !isStreaming || loading || isStarting ? '#888' : '#fff', padding: '12px 28px', borderRadius: 8, fontWeight: 600, fontSize: 16, border: 'none', cursor: !isStreaming || loading || isStarting ? 'not-allowed' : 'pointer' }}>Stop</button>
      </div>
      {loading && <div style={{ color: '#2563eb', marginTop: 12 }}>Menyiapkan stream, tunggu sebentar...</div>}
      {error && <div style={{ color: '#dc2626', marginTop: 12 }}>{error}</div>}
      {/* Dua card sejajar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 32, justifyContent: 'center', margin: '32px 0 0 0' }}>
        {/* Card Langganan Polygon */}
        <div style={{
          flex: '1 1 320px',
          minWidth: 280,
          maxWidth: 400,
          ...CARD_STYLE,
          border: backendBalance < 0.5 ? '2px solid #fca5a5' : '1.5px solid #e5e7eb',
          background: backendBalance < 0.5 ? '#fef2f2' : '#f9fafb',
          textAlign: 'left',
        }}>
          <div style={{
            background: backendBalance < 0.5 ? '#fca5a5' : '#22c55e',
            color: backendBalance < 0.5 ? '#b91c1c' : '#fff',
            padding: '18px 28px 12px 28px',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
          }}>
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none"><circle cx="16" cy="16" r="14" fill={backendBalance < 0.5 ? '#f87171' : '#16a34a'} stroke={backendBalance < 0.5 ? '#fff' : '#fff'} strokeWidth="2"/><text x="16" y="21" textAnchor="middle" fontSize="15" fill="#fff" fontWeight="bold">M</text></svg>
            <div>
              <div style={{ fontWeight: 700, fontSize: 18, letterSpacing: -0.5 }}>Langganan Otomatis</div>
              <div style={{ fontSize: 14, fontWeight: 500, opacity: 0.9 }}>
                Status: <span style={{ color: '#fff', fontWeight: 700 }}>{backendBalance < 0.5 ? 'Saldo Kurang' : 'Aktif'}</span>
              </div>
            </div>
          </div>
          <div style={{ padding: '20px 28px 18px 28px' }}>
            <div style={{ marginBottom: 10, fontSize: 15 }}>
              <b>Saldo:</b> {backendBalance.toFixed(4)} MATIC
            </div>
            <div style={{ marginBottom: 10, fontSize: 14, color: '#2563eb', wordBreak: 'break-all' }}>
              <b>Alamat Dompet:</b> {backendAddress ? <a href={`https://polygonscan.com/address/${backendAddress}`} target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb', textDecoration: 'underline' }}>{backendAddress}</a> : '-'}
            </div>
            <div style={{ color: backendBalance < 0.5 ? '#b91c1c' : '#444', fontSize: 13, marginTop: 8 }}>
              Untuk menikmati fitur rekaman otomatis dan penyimpanan blockchain, pastikan saldo deposit Anda minimal <b>0.5 MATIC</b>.<br />
              Saldo ini akan digunakan otomatis untuk membayar biaya layanan selama langganan aktif.
            </div>
            {backendBalance < 0.5 && (
              <div style={{ color: '#b91c1c', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '8px 14px', fontSize: 13, marginTop: 12, textAlign: 'center' }}>
                Saldo Anda kurang dari 0.5 MATIC.<br />
                Silakan lakukan <b>deposit</b> ke dompet di atas agar fitur rekaman otomatis dapat digunakan kembali.
              </div>
            )}
          </div>
        </div>
        {/* Card Rekaman Otomatis */}
        <div style={{
          flex: '1 1 320px',
          minWidth: 280,
          maxWidth: 400,
          ...CARD_STYLE,
          textAlign: 'left',
        }}>
          <div style={{
            background: isRecording ? '#22c55e' : '#e5e7eb',
            color: isRecording ? '#fff' : '#888',
            padding: '18px 28px 12px 28px',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
          }}>
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none"><circle cx="16" cy="16" r="14" fill={isRecording ? '#16a34a' : '#e5e7eb'} stroke={isRecording ? '#fff' : '#888'} strokeWidth="2"/><circle cx="16" cy="16" r="7" fill={isRecording ? '#dc2626' : '#888'} /></svg>
            <div>
              <div style={{ fontWeight: 700, fontSize: 18, letterSpacing: -0.5 }}>Rekaman Otomatis</div>
              <div style={{ fontSize: 14, fontWeight: 500, opacity: 0.9 }}>
                Status: <span style={{ color: isRecording ? '#fff' : '#888', fontWeight: 700 }}>{isRecording ? 'Aktif' : 'Nonaktif'}</span>
              </div>
            </div>
          </div>
          <div style={{ padding: '20px 28px 18px 28px' }}>
            <div style={{ marginBottom: 10 }}>
              <b>Status Upload:</b> {progress.uploadStatus === 'uploading' && <Spinner />} {progress.uploadStatus === 'uploaded' && 'Upload selesai'} {progress.uploadStatus === 'failed' && <span style={{ color: '#dc2626' }}>Gagal upload</span>}
              {progress.lastFileName && <div style={{ fontSize: 13, color: '#888' }}>File: {progress.lastFileName}</div>}
              {progress.lastCid && <div style={{ fontSize: 13, color: '#2563eb' }}>CID: {progress.lastCid}</div>}
            </div>
            <div style={{ marginBottom: 10 }}>
              <b>Status Transaksi:</b> {progress.txStatus === 'pending' && <Spinner />} {progress.txStatus === 'success' && 'Transaksi sukses'} {progress.txStatus === 'failed' && <span style={{ color: '#dc2626' }}>Gagal transaksi</span>}
              {progress.lastTxHash && <div style={{ fontSize: 13 }}><a href={`https://polygonscan.com/tx/${progress.lastTxHash}`} target="_blank" rel="noopener noreferrer" style={{ color: '#16a34a', textDecoration: 'underline' }}>{progress.lastTxHash.slice(0, 16)}...</a></div>}
            </div>
            {progress.lastError && <div style={{ color: '#dc2626', fontSize: 13 }}>{progress.lastError}</div>}
            <div style={{ marginBottom: 10, fontSize: 15 }}>
              <b>Durasi segment:</b> {segmentTime} detik
            </div>
            <div style={{ display: 'flex', gap: 18, marginBottom: 12 }}>
              <div style={{ background: '#fff', borderRadius: 10, padding: '12px 18px', boxShadow: '0 1px 4px #0001', border: '1px solid #e5e7eb', flex: 1, textAlign: 'center' }}>
                <div style={{ fontSize: 13, color: '#2563eb', fontWeight: 600, marginBottom: 2 }}>Upload ke IPFS</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#2563eb', letterSpacing: -1 }}>{uploadedCount}</div>
              </div>
              <div style={{ background: '#fff', borderRadius: 10, padding: '12px 18px', boxShadow: '0 1px 4px #0001', border: '1px solid #e5e7eb', flex: 1, textAlign: 'center' }}>
                <div style={{ fontSize: 13, color: '#16a34a', fontWeight: 600, marginBottom: 2 }}>Transaksi Blockchain</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#16a34a', letterSpacing: -1 }}>{txCount}</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
              <button onClick={handleStartRecording} disabled={isRecording || recLoading || !isStreaming || backendBalance < 0.5} style={{ background: isRecording || recLoading || !isStreaming || backendBalance < 0.5 ? '#e5e7eb' : '#22c55e', color: isRecording || recLoading || !isStreaming || backendBalance < 0.5 ? '#888' : '#fff', padding: '10px 24px', borderRadius: 8, fontWeight: 700, fontSize: 15, border: 'none', cursor: isRecording || recLoading || !isStreaming || backendBalance < 0.5 ? 'not-allowed' : 'pointer', boxShadow: '0 1px 4px #0001' }}>Mulai Rekaman</button>
              <button onClick={handleStopRecording} disabled={!isRecording || recLoading || backendBalance < 0.5} style={{ background: !isRecording || recLoading || backendBalance < 0.5 ? '#e5e7eb' : '#dc2626', color: !isRecording || recLoading || backendBalance < 0.5 ? '#888' : '#fff', padding: '10px 24px', borderRadius: 8, fontWeight: 700, fontSize: 15, border: 'none', cursor: !isRecording || recLoading || backendBalance < 0.5 ? 'not-allowed' : 'pointer', boxShadow: '0 1px 4px #0001' }}>Stop</button>
            </div>
            {backendBalance < 0.5 && (
              <div style={{ color: '#b91c1c', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '8px 14px', fontSize: 13, marginBottom: 8, textAlign: 'center' }}>
                Saldo Polygon kurang dari 0.5 MATIC. Fitur rekaman otomatis dinonaktifkan.<br />Silakan deposit ke wallet langganan otomatis untuk melanjutkan.
              </div>
            )}
            {recLoading && <div style={{ color: '#2563eb', marginTop: 6 }}>Memproses rekaman...</div>}
            {recError && <div style={{ color: '#dc2626', marginTop: 6 }}>{recError}</div>}
            <div style={{ color: '#444', fontSize: 13, marginTop: 8 }}>
              <b>Info:</b> Rekaman otomatis akan membagi video tiap <b>{segmentTime} detik</b>.<br />
              Setiap segmen akan <b>diupload otomatis ke IPFS</b> dan <b>dicatat ke blockchain</b> oleh backend.<br />
              Maksimal 5 file terakhir disimpan di server, file lama akan dihapus otomatis.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Tambahkan di atas komponen RtspPage
const CARD_STYLE = {
  borderRadius: 16,
  boxShadow: '0 4px 16px #0001',
  overflow: 'hidden',
  transition: 'all 0.2s',
  margin: 0,
  padding: 0,
};

// Hapus kode Live dan LiveIcon

function SidebarButton({ label, icon, isActive, onClick }: { 
  label: string, 
  icon: React.ReactNode, 
  isActive: boolean,
  onClick: () => void 
}) {
  return (
    <button 
      onClick={onClick}
      style={{
        background: isActive ? "#111" : "#fff",
        color: isActive ? "#fff" : "#111",
        border: isActive ? "none" : "1.5px solid #e5e7eb",
        borderRadius: 16,
        padding: "14px 22px",
        fontSize: 15,
        fontWeight: 600,
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-start",
        cursor: "pointer",
        transition: "all 0.2s cubic-bezier(.4,0,.2,1)",
        outline: "none",
        width: "100%",
        margin: "6px 0",
        boxShadow: "none",
        position: "relative",
        overflow: "hidden",
        letterSpacing: 0.2,
        gap: 14
      }}
      onMouseOver={e => {
        if (!isActive) {
          e.currentTarget.style.background = "#f3f4f6";
          e.currentTarget.style.color = "#111";
          e.currentTarget.style.transform = "translateX(3px)";
        }
      }}
      onMouseOut={e => {
        if (!isActive) {
          e.currentTarget.style.background = "#fff";
          e.currentTarget.style.color = "#111";
          e.currentTarget.style.transform = "translateX(0)";
        }
      }}
    >
      <span style={{ 
        marginRight: 14,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: 24,
        height: 24,
        transition: "all 0.2s cubic-bezier(.4,0,.2,1)",
        color: isActive ? "#fff" : "#111"
      }}>{icon}</span>
      {label}
    </button>
  );
}

function BlockCamLogo() {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', marginRight: 12 }}>
      <svg width="36" height="36" viewBox="-2 -2 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
        <circle cx="18" cy="18" r="18" fill="#fff" stroke="#111" strokeWidth="2"/>
        <rect x="10" y="14" width="16" height="9" rx="4.5" fill="#fff" stroke="#111" strokeWidth="1.5"/>
        <circle cx="18" cy="18.5" r="3.2" fill="#fff" stroke="#111" strokeWidth="1.5"/>
        <rect x="23.5" y="15.5" width="3" height="4" rx="1.5" fill="#fff" stroke="#111" strokeWidth="1"/>
        <circle cx="13.5" cy="16.5" r="1" fill="#111"/>
      </svg>
    </span>
  );
}

function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [walletAddress, setWalletAddress] = useState<string>('');
  
  const getPageTitle = () => {
    switch (location.pathname) {
      case '/': return 'Dashboard';
      case '/upload': return 'Upload';
      case '/verifikasi': return 'Verifikasi';
      case '/history': return 'History';
      default: return 'Dashboard';
    }
  };

  const isActive = (path: string) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  const handleWalletConnect = (address: string) => {
    setWalletAddress(address);
  };

  const handleWalletDisconnect = () => {
    setWalletAddress('');
  };

  useEffect(() => {
    document.title = 'BlockCam';
  }, []);

  return (
    <div style={{
      minHeight: "100vh",
      height: "100vh",
      background: "#f8fafc",
      display: "flex",
      fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif"
    }}>
      {/* Sidebar */}
      <aside style={{
        width: 260,
        background: "#fff",
        borderRight: "1.5px solid #e5e7eb",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "36px 0 36px 0",
        boxShadow: "none",
        height: "100vh",
        position: "relative",
        zIndex: 10
      }}>
        <div style={{
          fontWeight: "700",
          fontSize: 28,
          color: "#111",
          marginBottom: 44,
          letterSpacing: "-0.5px",
          display: 'flex',
          alignItems: 'center',
          gap: 10
        }}>
          <BlockCamLogo /> BlockCam
        </div>
        <nav style={{ width: "100%", display: "flex", flexDirection: "column", gap: 2 }}>
          <SidebarButton 
            label="Dashboard" 
            icon={<HomeIcon />} 
            isActive={isActive('/')} 
            onClick={() => navigate('/')} 
          />
          <SidebarButton 
            label="RTSP" 
            icon={<CameraIcon />} 
            isActive={isActive('/rtsp')} 
            onClick={() => navigate('/rtsp')} 
          />
          <SidebarButton 
            label="Upload" 
            icon={<UploadIcon />} 
            isActive={isActive('/upload')} 
            onClick={() => navigate('/upload')} 
          />
          <SidebarButton 
            label="Verifikasi" 
            icon={<VerifyIcon />} 
            isActive={isActive('/verifikasi')} 
            onClick={() => navigate('/verifikasi')} 
          />
          <SidebarButton 
            label="History" 
            icon={<HistoryIcon />} 
            isActive={isActive('/history')} 
            onClick={() => navigate('/history')} 
          />
        </nav>
        {/* Wallet Connect Section */}
        <div style={{
          marginTop: 'auto',
          padding: '20px',
          width: '100%',
          borderTop: '1.5px solid #e5e7eb',
          background: '#f8fafc'
        }}>
          <WalletConnect 
            onConnect={handleWalletConnect}
            onDisconnect={handleWalletDisconnect}
          />
        </div>
      </aside>
      {/* Main Content */}
      <div style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        minWidth: 0
      }}>
        {/* Topbar */}
        <header style={{
          background: "#fff",
          color: "#111",
          padding: "24px 40px",
          fontWeight: "600",
          fontSize: "1.75rem",
          letterSpacing: "-0.5px",
          boxShadow: "0 4px 20px rgba(0,0,0,0.04)",
          position: "relative",
          zIndex: 5,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
          <span>{getPageTitle()}</span>
          {walletAddress && (
            <div style={{
              fontSize: "0.875rem",
              opacity: 0.9,
              fontFamily: "monospace",
              color: "#111"
            }}>
              Connected: {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
            </div>
          )}
        </header>
        
        {/* Page Content */}
        <main style={{
          flex: 1,
          overflow: "auto",
          padding: "32px 40px",
          background: "transparent"
        }}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/rtsp" element={<RtspPage />} />
            <Route path="/upload" element={<Upload />} />
            <Route path="/verifikasi" element={<Verifikasi />} />
            <Route path="/history" element={<History />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <WalletProvider>
    <Router>
      <Layout />
    </Router>
    </WalletProvider>
  );
}

export default App

function Spinner() {
  return <span style={{ display: 'inline-block', width: 18, height: 18, border: '3px solid #e5e7eb', borderTop: '3px solid #2563eb', borderRadius: '50%', animation: 'spin 1s linear infinite', marginRight: 6, verticalAlign: 'middle' }} />;
}
