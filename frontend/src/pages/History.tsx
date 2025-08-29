import React, { useEffect, useState } from 'react';
import WalletProtection from '../components/WalletProtection';
import FloatingGuideButton from '../components/FloatingGuideButton';

interface BlockchainTransaction {
  txHash: string;
  blockNumber: number;
  timestamp: string;
  from: string;
  to: string;
  method: string;
  status: 'success' | 'pending' | 'failed';
  gasUsed: string;
  ipfsHash?: string;
  videoTitle?: string;
}

interface HistoryProps {
  walletAddress?: string;
}

// Tambahkan tipe untuk file Pinata
interface PinataFile {
  ipfs_pin_hash: string;
  metadata: {
    name?: string;
    keyvalues?: { [key: string]: string };
  };
  date_pinned: string;
}

// Tambahkan tipe untuk user uploads dari blockchain
interface UserUpload {
  ipfsHash: string;
  title: string;
  description: string;
  duration: number;
  timestamp: string;
  uploader: string;
}

const History: React.FC<HistoryProps> = ({ walletAddress }) => {
  const [transactions, setTransactions] = useState<BlockchainTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [txLoading, setTxLoading] = useState(true);
  const [error, setError] = useState('');
  const [txError, setTxError] = useState('');
  const [activeTab, setActiveTab] = useState<'uploads' | 'transactions'>('uploads');
  
  // Pisahkan state untuk IPFS files dan user uploads
  const [ipfsFiles, setIpfsFiles] = useState<PinataFile[]>([]);
  const [userUploads, setUserUploads] = useState<UserUpload[]>([]);

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        setTxLoading(true);
        setTxError('');
        
        // Jika wallet terhubung, ambil riwayat user-specific
        let url = 'http://localhost:4000/blockchain/transaction-history';
        if (walletAddress) {
          url = `http://localhost:4000/blockchain/user-transactions/${walletAddress}`;
        }
        
        const res = await fetch(url);
        if (!res.ok) throw new Error('Gagal mengambil data riwayat transaksi blockchain');
        const data = await res.json();
        setTransactions(data || []);
      } catch (err: unknown) {
        const message = typeof err === 'object' && err !== null && 'message' in err ? String((err as { message?: string }).message) : '';
        setTxError(message || 'Terjadi kesalahan saat mengambil riwayat transaksi');
      } finally {
        setTxLoading(false);
      }
    };

    const fetchUserUploads = async () => {
      if (!walletAddress) {
        setUserUploads([]);
        return;
      }
      try {
        const res = await fetch(`http://localhost:4000/blockchain/user-uploads/${walletAddress}`);
        if (!res.ok) throw new Error('Gagal mengambil data riwayat upload dari blockchain');
        const data = await res.json();
        setUserUploads(data || []);
      } catch (err: unknown) {
        console.error('Error fetching user uploads:', err);
        // Jangan set error untuk user uploads, karena ini opsional
        setUserUploads([]);
      }
    };

    // Fetch IPFS files dari backend (SEMUA file dari Pinata)
    const fetchIpfsFiles = async () => {
      try {
        setLoading(true);
        setError('');
        const res = await fetch('http://localhost:4000/blockchain/pinata-history');
        if (!res.ok) throw new Error('Gagal mengambil data riwayat upload ke IPFS');
        const data = await res.json();
        setIpfsFiles(data || []);
      } catch (err: unknown) {
        const message = typeof err === 'object' && err !== null && 'message' in err ? String((err as { message?: string }).message) : '';
        setError(message || 'Terjadi kesalahan saat mengambil riwayat upload ke IPFS');
      } finally {
        setLoading(false);
      }
    };

    // Jalankan fetch secara berurutan untuk menghindari race condition
    const fetchAllData = async () => {
      await fetchIpfsFiles();
      await fetchTransactions();
      await fetchUserUploads();
    };

    fetchAllData();
  }, [walletAddress]); // Re-fetch when wallet address changes

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // Ganti semua warna biru dengan hitam/abu/hijau/merah
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return '#16a34a'; // hijau
      case 'pending': return '#a3a3a3'; // abu
      case 'failed': return '#dc2626'; // merah
      default: return '#444'; // abu gelap
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'success': return 'Berhasil';
      case 'pending': return 'Menunggu';
      case 'failed': return 'Gagal';
      default: return 'Tidak Diketahui';
    }
  };

  const getMethodText = (method: string) => {
    switch (method) {
      case 'uploadVideo': return 'Upload Video';
      case 'verifyVideo': return 'Verifikasi Video';
      case 'updateMetadata': return 'Update Metadata';
      default: return method;
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
        {/* Header */}
        <div style={{ marginBottom: "32px" }}>
          <h1 style={{ 
            marginBottom: "12px", 
            fontSize: "2.5rem", 
            fontWeight: "700",
            color: "#111",
            letterSpacing: "-1px"
          }}>
            Riwayat Aktivitas
          </h1>
          <p style={{ 
            fontSize: "1.125rem", 
            color: "#64748b",
            fontWeight: "500"
          }}>
            Pantau semua aktivitas upload dan transaksi blockchain
          </p>
        </div>

        {/* Tab Navigation */}
        <div style={{
          display: "flex",
          gap: "8px",
          marginBottom: "32px",
          borderBottom: "2px solid #e2e8f0"
        }}>
          <button
            onClick={() => setActiveTab('uploads')}
            style={{
              background: activeTab === 'uploads' ? "#111" : "#fff",
              color: activeTab === 'uploads' ? "#fff" : "#444",
              border: "none",
              borderRadius: "12px 12px 0 0",
              padding: "16px 24px",
              fontSize: "1rem",
              fontWeight: "600",
              cursor: "pointer",
              transition: "all 0.3s ease"
            }}
          >
            📤 Riwayat Upload ke IPFS ({ipfsFiles.length})
          </button>
          <button
            onClick={() => setActiveTab('transactions')}
            style={{
              background: activeTab === 'transactions' ? "#111" : "#fff",
              color: activeTab === 'transactions' ? "#fff" : "#444",
              border: "none",
              borderRadius: "12px 12px 0 0",
              padding: "16px 24px",
              fontSize: "1rem",
              fontWeight: "600",
              cursor: "pointer",
              transition: "all 0.3s ease"
            }}
          >
            ⛓️ Transaksi Blockchain ({transactions.length})
          </button>
        </div>

        {/* Upload History Tab */}
        {activeTab === 'uploads' && (
          <div style={{
            background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
            padding: "32px",
            borderRadius: "20px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 8px 30px rgba(0,0,0,0.08)"
          }}>
            <h3 style={{ 
              marginBottom: "24px", 
              fontSize: "1.5rem", 
              fontWeight: "600",
              color: "#111"
            }}>
              📤 Riwayat Upload ke IPFS
            </h3>
            
            {loading ? (
              <div style={{ 
                color: '#6b7280', 
                fontSize: '1.125rem', 
                margin: '40px 0', 
                textAlign: 'center',
                padding: "40px"
              }}>
                <div style={{ fontSize: "2rem", marginBottom: "16px" }}>⏳</div>
                Memuat riwayat upload ke IPFS...
              </div>
            ) : error ? (
              <div style={{ 
                color: '#dc2626', 
                fontSize: '1.125rem', 
                margin: '40px 0', 
                textAlign: 'center',
                padding: "40px",
                background: "#fef2f2",
                borderRadius: "12px",
                border: "1px solid #fecaca"
              }}>
                <div style={{ fontSize: "2rem", marginBottom: "16px" }}>❌</div>
                {error}
              </div>
            ) : ipfsFiles.length === 0 ? (
              <div style={{ 
                color: '#9ca3af', 
                fontSize: '1.125rem', 
                margin: '40px 0', 
                textAlign: 'center',
                padding: "40px"
              }}>
                <div style={{ fontSize: "2rem", marginBottom: "16px" }}>📭</div>
                Belum ada data upload ke IPFS.
              </div>
            ) : (
              <div style={{ overflowX: 'auto', borderRadius: '12px', boxShadow: '0 2px 8px #0001', background: '#fff' }}>
                <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, minWidth: 600, borderRadius: '12px', overflow: 'hidden' }}>
                  <thead>
                    <tr style={{ background: '#f3f4f6', position: 'sticky', top: 0, zIndex: 1 }}>
                      <th style={{ padding: '16px', borderBottom: '2px solid #e5e7eb', textAlign: 'left', fontWeight: 700, fontSize: 16 }}>CID</th>
                      <th style={{ padding: '16px', borderBottom: '2px solid #e5e7eb', textAlign: 'left', fontWeight: 700, fontSize: 16 }}>Nama File</th>
                      <th style={{ padding: '16px', borderBottom: '2px solid #e5e7eb', textAlign: 'left', fontWeight: 700, fontSize: 16 }}>Tanggal Upload</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ipfsFiles.map((file, idx) => (
                      <tr key={file.ipfs_pin_hash + idx} style={{ background: idx % 2 === 0 ? '#fff' : '#f9fafb', transition: 'background 0.2s' }}>
                        <td style={{ padding: '14px 16px', borderBottom: '1px solid #e5e7eb', fontFamily: 'monospace', fontSize: '13px', userSelect: 'all' }}>{file.ipfs_pin_hash}</td>
                        <td style={{ padding: '14px 16px', borderBottom: '1px solid #e5e7eb' }}>{file.metadata?.name || '-'}</td>
                        <td style={{ padding: '14px 16px', borderBottom: '1px solid #e5e7eb' }}>{file.date_pinned ? new Date(file.date_pinned).toLocaleString('id-ID') : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Tampilkan user uploads jika ada wallet terhubung */}
            {walletAddress && userUploads.length > 0 && (
              <div style={{ marginTop: "32px" }}>
                <h4 style={{ 
                  marginBottom: "16px", 
                  fontSize: "1.25rem", 
                  fontWeight: "600",
                  color: "#111"
                }}>
                  Upload Anda ({userUploads.length})
                </h4>
                <div style={{ overflowX: 'auto', borderRadius: '12px', boxShadow: '0 2px 8px #0001', background: '#fff' }}>
                  <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, minWidth: 600, borderRadius: '12px', overflow: 'hidden' }}>
                    <thead>
                      <tr style={{ background: '#f3f4f6', position: 'sticky', top: 0, zIndex: 1 }}>
                        <th style={{ padding: '16px', borderBottom: '2px solid #e5e7eb', textAlign: 'left', fontWeight: 700, fontSize: 16 }}>CID</th>
                        <th style={{ padding: '16px', borderBottom: '2px solid #e5e7eb', textAlign: 'left', fontWeight: 700, fontSize: 16 }}>Judul</th>
                        <th style={{ padding: '16px', borderBottom: '2px solid #e5e7eb', textAlign: 'left', fontWeight: 700, fontSize: 16 }}>Durasi</th>
                        <th style={{ padding: '16px', borderBottom: '2px solid #e5e7eb', textAlign: 'left', fontWeight: 700, fontSize: 16 }}>Tanggal Upload</th>
                      </tr>
                    </thead>
                    <tbody>
                      {userUploads.map((upload, idx) => (
                        <tr key={upload.ipfsHash + idx} style={{ background: idx % 2 === 0 ? '#fff' : '#f9fafb', transition: 'background 0.2s' }}>
                          <td style={{ padding: '14px 16px', borderBottom: '1px solid #e5e7eb', fontFamily: 'monospace', fontSize: '13px', userSelect: 'all' }}>{upload.ipfsHash}</td>
                          <td style={{ padding: '14px 16px', borderBottom: '1px solid #e5e7eb' }}>{upload.title || '-'}</td>
                          <td style={{ padding: '14px 16px', borderBottom: '1px solid #e5e7eb' }}>{upload.duration ? `${Math.floor(upload.duration / 60)}:${(upload.duration % 60).toString().padStart(2, '0')}` : '-'}</td>
                          <td style={{ padding: '14px 16px', borderBottom: '1px solid #e5e7eb' }}>{upload.timestamp ? new Date(upload.timestamp).toLocaleString('id-ID') : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Blockchain Transactions Tab */}
        {activeTab === 'transactions' && (
          <div style={{
            background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
            padding: "32px",
            borderRadius: "20px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 8px 30px rgba(0,0,0,0.08)"
          }}>
            <h3 style={{ 
              marginBottom: "24px", 
              fontSize: "1.5rem", 
              fontWeight: "600",
              color: "#111"
            }}>
              ⛓️ Riwayat Transaksi Blockchain
            </h3>
            
            {txLoading ? (
              <div style={{ 
                color: '#6b7280', 
                fontSize: '1.125rem', 
                margin: '40px 0', 
                textAlign: 'center',
                padding: "40px"
              }}>
                <div style={{ fontSize: "2rem", marginBottom: "16px" }}>⏳</div>
                Memuat riwayat transaksi blockchain...
              </div>
            ) : txError ? (
              <div style={{ 
                color: '#dc2626', 
                fontSize: '1.125rem', 
                margin: '40px 0', 
                textAlign: 'center',
                padding: "40px",
                background: "#fef2f2",
                borderRadius: "12px",
                border: "1px solid #fecaca"
              }}>
                <div style={{ fontSize: "2rem", marginBottom: "16px" }}>❌</div>
                {txError}
              </div>
            ) : transactions.length === 0 ? (
              <div style={{ 
                color: '#9ca3af', 
                fontSize: '1.125rem', 
                margin: '40px 0', 
                textAlign: 'center',
                padding: "40px"
              }}>
                <div style={{ fontSize: "2rem", marginBottom: "16px" }}>📭</div>
                Belum ada transaksi blockchain.
              </div>
            ) : (
              <div style={{ overflowX: 'auto', borderRadius: '12px', boxShadow: '0 2px 8px #0001', background: '#fff' }}>
                <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, minWidth: 800, borderRadius: '12px', overflow: 'hidden' }}>
                  <thead>
                    <tr style={{ background: '#f3f4f6', position: 'sticky', top: 0, zIndex: 1 }}>
                      <th style={{ padding: '16px', borderBottom: '2px solid #e5e7eb', textAlign: 'left', fontWeight: 700, fontSize: 16 }}>CID</th>
                      <th style={{ padding: '16px', borderBottom: '2px solid #e5e7eb', textAlign: 'left', fontWeight: 700, fontSize: 16 }}>Metode</th>
                      <th style={{ padding: '16px', borderBottom: '2px solid #e5e7eb', textAlign: 'left', fontWeight: 700, fontSize: 16 }}>Status</th>
                      <th style={{ padding: '16px', borderBottom: '2px solid #e5e7eb', textAlign: 'left', fontWeight: 700, fontSize: 16 }}>Dari</th>
                      <th style={{ padding: '16px', borderBottom: '2px solid #e5e7eb', textAlign: 'left', fontWeight: 700, fontSize: 16 }}>Ke</th>
                      <th style={{ padding: '16px', borderBottom: '2px solid #e5e7eb', textAlign: 'left', fontWeight: 700, fontSize: 16 }}>Gas Used</th>
                      <th style={{ padding: '16px', borderBottom: '2px solid #e5e7eb', textAlign: 'left', fontWeight: 700, fontSize: 16 }}>Tanggal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((tx, idx) => (
                      <tr key={tx.txHash + idx} style={{ background: idx % 2 === 0 ? '#fff' : '#f9fafb', transition: 'background 0.2s' }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#e0f2fe')}
                        onMouseLeave={e => (e.currentTarget.style.background = idx % 2 === 0 ? '#fff' : '#f9fafb')}
                      >
                        <td style={{ padding: '14px 16px', borderBottom: '1px solid #e5e7eb', fontFamily: 'monospace', fontSize: '13px', wordBreak: 'break-all' }}>
                          <a href={`https://polygonscan.com/tx/${tx.txHash}`} target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb', textDecoration: 'underline' }}>
                            {formatAddress(tx.txHash)}
                          </a>
                        </td>
                        <td style={{ padding: '14px 16px', borderBottom: '1px solid #e5e7eb', fontWeight: 500 }}>
                          {getMethodText(tx.method)}
                        </td>
                        <td style={{ padding: '14px 16px', borderBottom: '1px solid #e5e7eb' }}>
                          <span style={{
                            padding: '4px 8px',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: '600',
                            color: 'white',
                            background: getStatusColor(tx.status)
                          }}>
                            {getStatusText(tx.status)}
                          </span>
                        </td>
                        <td style={{ padding: '14px 16px', borderBottom: '1px solid #e5e7eb', fontFamily: 'monospace', fontSize: '13px' }}>
                          {formatAddress(tx.from)}
                        </td>
                        <td style={{ padding: '14px 16px', borderBottom: '1px solid #e5e7eb', fontFamily: 'monospace', fontSize: '13px' }}>
                          {formatAddress(tx.to)}
                        </td>
                        <td style={{ padding: '14px 16px', borderBottom: '1px solid #e5e7eb', fontFamily: 'monospace', fontSize: '13px' }}>
                          {tx.gasUsed}
                        </td>
                        <td style={{ padding: '14px 16px', borderBottom: '1px solid #e5e7eb' }}>
                          {tx.timestamp ? new Date(tx.timestamp).toLocaleString('id-ID') : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </WalletProtection>
    <FloatingGuideButton 
      title="Panduan History & Records BLOCKCAM"
      content={
        <div style={{ textAlign: 'left', lineHeight: 1.6 }}>
          <h3 style={{ marginTop: 0, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
            📚 Riwayat Upload & Transaksi
          </h3>
          <p style={{ marginBottom: 20, color: '#475569' }}>Monitor semua aktivitas upload video dan transaksi blockchain Anda dengan detail lengkap dan real-time tracking.</p>
          
          <h4 style={{ color: '#1e293b', marginTop: 20, marginBottom: 12 }}>🔍 Dua Jenis History:</h4>
          <div style={{ background: '#f8fafc', padding: 16, borderRadius: 8, marginBottom: 16 }}>
            <div style={{ marginBottom: 12 }}>
              <strong style={{ color: '#7c3aed' }}>📤 Uploads History:</strong>
              <ul style={{ margin: '8px 0 0 20px', paddingLeft: 0 }}>
                <li style={{ marginBottom: 4 }}>Semua video yang Anda upload ke IPFS</li>
                <li style={{ marginBottom: 4 }}>Informasi file detail (nama, ukuran, format)</li>
                <li style={{ marginBottom: 4 }}>CID IPFS untuk verifikasi</li>
                <li style={{ marginBottom: 4 }}>Status upload dan processing</li>
              </ul>
            </div>
            <div>
              <strong style={{ color: '#16a34a' }}>⛓️ Transactions History:</strong>
              <ul style={{ margin: '8px 0 0 20px', paddingLeft: 0 }}>
                <li style={{ marginBottom: 4 }}>Semua transaksi blockchain Polygon</li>
                <li style={{ marginBottom: 4 }}>Hash transaksi dan block details</li>
                <li style={{ marginBottom: 4 }}>Gas fee dan konfirmasi status</li>
                <li style={{ marginBottom: 4 }}>Timeline transaksi dengan timestamp</li>
              </ul>
            </div>
          </div>
          
          <h4 style={{ color: '#1e293b', marginTop: 20, marginBottom: 12 }}>📊 Detail Informasi Uploads:</h4>
          <div style={{ background: '#f0f9ff', padding: 16, borderRadius: 8, borderLeft: '4px solid #0ea5e9', marginBottom: 16 }}>
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              <li style={{ marginBottom: 8 }}><strong>Metadata File:</strong> Nama original, ukuran (MB), format video</li>
              <li style={{ marginBottom: 8 }}><strong>IPFS Info:</strong> CID unik, gateway links, node availability</li>
              <li style={{ marginBottom: 8 }}><strong>Upload Timeline:</strong> Tanggal upload, processing duration</li>
              <li style={{ marginBottom: 8 }}><strong>Video Preview:</strong> Thumbnail dan link streaming langsung</li>
              <li style={{ marginBottom: 8 }}><strong>Kategori & Deskripsi:</strong> Informasi yang Anda input saat upload</li>
            </ul>
          </div>
          
          <h4 style={{ color: '#1e293b', marginTop: 20, marginBottom: 12 }}>⛓️ Detail Informasi Transactions:</h4>
          <div style={{ background: '#f0fdf4', padding: 16, borderRadius: 8, borderLeft: '4px solid #22c55e', marginBottom: 16 }}>
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              <li style={{ marginBottom: 8 }}><strong>Transaction Hash:</strong> ID unik transaksi di Polygon network</li>
              <li style={{ marginBottom: 8 }}><strong>Block Info:</strong> Block number, position, konfirmasi count</li>
              <li style={{ marginBottom: 8 }}><strong>Status Real-time:</strong> Pending, Confirmed, Failed dengan alasan</li>
              <li style={{ marginBottom: 8 }}><strong>Gas Details:</strong> Used gas, gas price, total fee dalam MATIC & IDR</li>
              <li style={{ marginBottom: 8 }}><strong>Smart Contract:</strong> Function calls dan contract interactions</li>
            </ul>
          </div>
          
          <h4 style={{ color: '#1e293b', marginTop: 20, marginBottom: 12 }}>🔧 Fitur & Tools Tersedia:</h4>
          <div style={{ background: '#fef3c7', padding: 16, borderRadius: 8, borderLeft: '4px solid #f59e0b', marginBottom: 16 }}>
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              <li style={{ marginBottom: 6 }}><strong>Tab Navigation:</strong> Switch antara Uploads dan Transactions history</li>
              <li style={{ marginBottom: 6 }}><strong>Copy to Clipboard:</strong> Copy CID dan transaction hash dengan 1 klik</li>
              <li style={{ marginBottom: 6 }}><strong>External Links:</strong> Link langsung ke Polygonscan explorer</li>
              <li style={{ marginBottom: 6 }}><strong>IPFS Gateway:</strong> Multiple gateway options untuk akses video</li>
            </ul>
          </div>
          
          <h4 style={{ color: '#1e293b', marginTop: 20, marginBottom: 12 }}>📈 Monitoring & Analytics:</h4>
          <div style={{ background: '#fdf4ff', padding: 16, borderRadius: 8, borderLeft: '4px solid #a855f7', marginBottom: 16 }}>
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              <li style={{ marginBottom: 6 }}><strong>Upload Statistics:</strong> Total files, total size, success rate</li>
              <li style={{ marginBottom: 6 }}><strong>Transaction Costs:</strong> Total gas spent, average fee per upload</li>
              <li style={{ marginBottom: 6 }}><strong>Performance Metrics:</strong> Upload speed, processing time trends</li>
              <li style={{ marginBottom: 6 }}><strong>Storage Usage:</strong> IPFS space utilized, data redundancy</li>
            </ul>
          </div>
          
          <div style={{ background: '#fef2f2', padding: 12, borderRadius: 8, borderLeft: '4px solid #ef4444', marginTop: 16 }}>
            <strong>💡 Tips:</strong> Gunakan tab "Uploads" untuk tracking video, dan tab "Transactions" untuk monitoring blockchain. Simpan CID penting untuk verifikasi masa depan.
          </div>
        </div>
      }
    />
    </>
  );
};

export default History; 