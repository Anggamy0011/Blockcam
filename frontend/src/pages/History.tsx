import React, { useEffect, useState } from 'react';

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
  description?: string; // Added for new column
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

const History: React.FC<HistoryProps> = ({ walletAddress }) => {
  const [transactions, setTransactions] = useState<BlockchainTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [txLoading, setTxLoading] = useState(true);
  const [error, setError] = useState('');
  const [txError, setTxError] = useState('');
  const [activeTab, setActiveTab] = useState<'uploads' | 'transactions'>('uploads');
  const [ipfsFiles, setIpfsFiles] = useState<PinataFile[]>([]);

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

    const fetchUploads = async () => {
      if (!walletAddress) {
        setIpfsFiles([]);
        return;
      }
      try {
        setLoading(true);
        setError('');
        const res = await fetch(`http://localhost:4000/blockchain/user-uploads/${walletAddress}`);
        if (!res.ok) throw new Error('Gagal mengambil data riwayat upload dari blockchain');
        const data = await res.json();
        setIpfsFiles(data || []);
      } catch (err: unknown) {
        const message = typeof err === 'object' && err !== null && 'message' in err ? String((err as { message?: string }).message) : '';
        setError(message || 'Terjadi kesalahan saat mengambil riwayat upload');
      } finally {
        setLoading(false);
      }
    };

    // Fetch IPFS files dari backend
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

    fetchIpfsFiles();
    fetchTransactions();
    fetchUploads();
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
    <div style={{
      fontSize: "1rem",
      background: "transparent",
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
                    <th style={{ padding: '16px', borderBottom: '2px solid #e5e7eb', textAlign: 'left', fontWeight: 700, fontSize: 16 }}>Deskripsi</th>
                  </tr>
                </thead>
                <tbody>
                  {ipfsFiles.map((file, idx) => (
                    <tr key={file.ipfs_pin_hash + idx} style={{ background: idx % 2 === 0 ? '#fff' : '#f9fafb', transition: 'background 0.2s' }}>
                      <td style={{ padding: '14px 16px', borderBottom: '1px solid #e5e7eb', fontFamily: 'monospace', fontSize: '13px', userSelect: 'all' }}>{file.ipfs_pin_hash}</td>
                      <td style={{ padding: '14px 16px', borderBottom: '1px solid #e5e7eb' }}>{file.metadata?.name || '-'}</td>
                      <td style={{ padding: '14px 16px', borderBottom: '1px solid #e5e7eb' }}>{file.date_pinned ? new Date(file.date_pinned).toLocaleString('id-ID') : '-'}</td>
                      <td style={{ padding: '14px 16px', borderBottom: '1px solid #e5e7eb', maxWidth: 300, wordBreak: 'break-word', fontSize: '13px', color: '#374151' }}>
                        {file.metadata?.keyvalues?.description || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
  );
};

export default History; 