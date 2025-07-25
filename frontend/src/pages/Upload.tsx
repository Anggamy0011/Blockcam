import React, { useState, useEffect } from 'react';
import { useWallet } from '../hooks/useWallet';
import { handleError, logError, retryOperation } from '../utils/errorHandler';
import { validateFile, validateAndSanitize } from '../utils/validation';
import LoadingSpinner from '../components/LoadingSpinner';
import { ethers } from 'ethers';
import type { Eip1193Provider } from 'ethers';
import contractJson from '../contract/BlockCam.json';

interface UploadResult {
  cid?: string;
  fileSize?: number;
  timestamp?: string;
  isDuplicate?: boolean;
  error?: string;
  txHash?: string;
  title?: string;
  description?: string;
  duration?: number;
}

const Upload: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState<number | null>(null);
  const { isConnected: walletConnected } = useWallet();
  // Hapus state dan handler deskripsi

  // Cleanup effect
  useEffect(() => {
    return () => {
      setUploading(false);
      setUploadProgress(0);
    };
  }, []);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        // Validate file before setting
        validateFile(file);
        setSelectedFile(file);
        setError('');
        setUploadResult(null);
        // Dapatkan durasi video
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.onloadedmetadata = () => {
          window.URL.revokeObjectURL(video.src);
          setDuration(video.duration);
        };
        video.onerror = () => {
          setDuration(null);
          setError('Gagal membaca durasi video.');
        };
        video.src = URL.createObjectURL(file);
      } catch (validationError) {
        const appError = handleError(validationError);
        setError(appError.userFriendlyMessage);
        logError(appError);
        setSelectedFile(null);
        setDuration(null);
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Pilih file video terlebih dahulu');
      setUploading(false);
      return;
    }

    if (!walletConnected) {
      setError('Silakan connect wallet terlebih dahulu');
      setUploading(false);
      return;
    }

    if (!duration || duration <= 0) {
      setError('Durasi video tidak valid!');
      setUploading(false);
      return;
    }

    try {
      // Hapus validasi dan parameter deskripsi di handleUpload
      setUploading(true);
      setUploadProgress(0);
      setError('');

      // --- Upload ke IPFS dulu ---
      setUploadProgress(10);
      const uploadToBackend = async () => {
        setUploadProgress(20);
        const formData = new FormData();
        formData.append('video', selectedFile);
        // Pastikan tidak ada header Authorization
        const response = await fetch('http://localhost:4000/blockchain/upload-video', {
          method: 'POST',
          body: formData,
        });
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'Upload gagal');
        }
        return await response.json();
      };
      const result = await retryOperation(uploadToBackend, 3, 2000);
      setUploadProgress(40);
      const cid = result.cid;
      if (!cid) throw new Error('Gagal mendapatkan CID dari IPFS');

      // --- Setelah dapat CID, lakukan transaksi blockchain ---
      setUploadProgress(60);
      // Ambil contract address dari backend
      const infoRes = await fetch('http://localhost:4000/blockchain/info');
      const infoData = await infoRes.json();
      const contractAddress = infoData.address || (infoData.data && infoData.data.address);
      if (!contractAddress) throw new Error('Gagal mendapatkan alamat kontrak');
      // Inisialisasi ethers
      if (!window.ethereum) throw new Error('MetaMask tidak ditemukan');
      const provider = new ethers.BrowserProvider(window.ethereum as Eip1193Provider);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(contractAddress, contractJson.abi, signer);
      // Validasi parameter
      const title = selectedFile.name;
      // Validasi deskripsi
      const sanitizedDescription = validateAndSanitize(description, 'Deskripsi', 10, 1000);
      const desc = sanitizedDescription;
      if (!desc) throw new Error('Deskripsi tidak ditemukan!');
      if (!title) throw new Error('Nama file tidak ditemukan!');
      setUploadProgress(70);
      const tx = await contract.uploadVideo(
        cid,
        title,
        desc,
        Math.floor(duration) // gunakan durasi asli, dibulatkan ke bawah
      );
      setUploadProgress(80);
      // Tunggu konfirmasi
      const receipt = await tx.wait();
      setUploadProgress(90);
      setUploadResult({ ...result, txHash: receipt.hash });
      setUploading(false);
    } catch (err) {
      const appError = handleError(err);
      // Jika error terjadi setelah upload ke IPFS, tetap tampilkan CID
      if (typeof appError === 'string') {
        setError(appError);
      } else if (appError && appError.userFriendlyMessage) {
        setError(appError.userFriendlyMessage);
      } else {
        setError('Terjadi kesalahan saat upload');
      }
      // Perbaikan log error
      if (typeof appError === 'object' && appError.type) {
        logError(appError); // AppError
      } else {
        console.error('BlockCam Error:', appError, err);
      }
      setUploading(false);
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
      <div style={{ marginBottom: "32px" }}>
        {/* Judul utama */}
        <h1 style={{ 
          marginBottom: "12px", 
          fontSize: "2.5rem", 
          fontWeight: "700",
          color: "#111",
          letterSpacing: "-1px"
        }}>
          Upload Video
        </h1>
        {/* Subjudul */}
        <p style={{ 
          fontSize: "1.125rem", 
          color: "#444",
          fontWeight: "500"
        }}>
          Upload video ke IPFS dengan aman dan terpercaya
        </p>
        {/* Warning wajib bayar blockchain */}
        <div style={{
          marginTop: "20px",
          marginBottom: "0",
          padding: "16px 20px",
          background: "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)",
          border: "1px solid #f59e0b",
          borderRadius: "12px",
          color: "#92400e",
          fontSize: "14px",
          fontWeight: "500",
          borderLeft: "4px solid #f59e0b"
        }}>
          ⚠️ <strong>PERHATIAN:</strong> Setelah file diupload ke IPFS, Anda <b>wajib membayar transaksi blockchain</b>. Jika transaksi blockchain dibatalkan, file tetap tersimpan di IPFS.
        </div>
      </div>

      {/* Upload Section */}
      <div style={{
        background: "#fff",
        padding: "40px",
        borderRadius: "24px",
        border: "1.5px solid #e5e7eb",
        boxShadow: "0 8px 30px rgba(0,0,0,0.08)",
        marginBottom: "32px",
        position: "relative",
        overflow: "hidden"
      }}>
        <div style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "4px",
          background: "#111"
        }} />
        
        <h3 style={{ 
          marginBottom: "24px", 
          fontSize: "1.75rem", 
          fontWeight: "600",
          color: "#111"
        }}>
          Upload Video ke IPFS
        </h3>
        
        {!walletConnected && (
          <div style={{
            marginBottom: "24px",
            padding: "16px 20px",
            background: "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)",
            border: "1px solid #f59e0b",
            borderRadius: "12px",
            color: "#92400e",
            fontSize: "14px",
            fontWeight: "500",
            borderLeft: "4px solid #f59e0b"
          }}>
            ⚠️ <strong>Wallet tidak terhubung!</strong> Silakan connect wallet terlebih dahulu untuk melakukan transaksi blockchain.
          </div>
        )}
        
        <div style={{ marginBottom: "32px" }}>
          <label style={{ 
            display: "block", 
            marginBottom: "12px", 
            fontWeight: "600",
            color: "#444",
            fontSize: "1rem"
          }}>
            Pilih File Video:
          </label>
          <input
            type="file"
            accept="video/*"
            onChange={handleFileSelect}
            style={{
              width: "100%",
              padding: "16px 20px",
              border: "1.5px solid #e5e7eb",
              borderRadius: "12px",
              fontSize: "14px",
              outline: "none",
              background: "#fff",
              transition: "all 0.3s ease",
              cursor: "pointer"
            }}
            onFocus={(e) => {
              e.target.style.borderColor = "#111";
              e.target.style.boxShadow = "0 0 0 3px rgba(30, 58, 138, 0.1)";
            }}
            onBlur={(e) => {
              e.target.style.borderColor = "#e5e7eb";
              e.target.style.boxShadow = "none";
            }}
          />
          <div style={{ 
            marginTop: "8px", 
            fontSize: "12px", 
            color: "#64748b" 
          }}>
            Format yang didukung: MP4, AVI, MOV, WMV, FLV (Maksimal 100MB)
          </div>
        </div>

        {selectedFile && (
          <div style={{
            marginBottom: "24px",
            padding: "20px",
            background: "linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)",
            border: "1px solid #e5e7eb",
            borderRadius: "12px",
            fontSize: "14px",
            borderLeft: "4px solid #64748b",
            color: "#111"
          }}>
            <strong style={{ color: "#111" }}>File terpilih:</strong> {selectedFile.name} 
            <br />
            <span style={{ color: "#64748b" }}>
              Ukuran: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
            </span>
          </div>
        )}

        {/* Hapus input deskripsi di form */}
        <div style={{ marginBottom: "24px" }}>
          <label style={{
            display: "block",
            marginBottom: "12px",
            fontWeight: "600",
            color: "#444",
            fontSize: "1rem"
          }}>
            Deskripsi Video:
          </label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={3}
            style={{
              width: "100%",
              padding: "12px 16px",
              border: "1.5px solid #e5e7eb",
              borderRadius: "10px",
              fontSize: "14px",
              outline: "none",
              background: "#fff",
              transition: "all 0.3s ease",
              resize: "vertical"
            }}
            placeholder="Tulis deskripsi video di sini (minimal 10 karakter)..."
          />
          <div style={{ 
            marginTop: "4px", 
            fontSize: "12px", 
            color: "#64748b" 
          }}>
            {description.length}/1000 karakter (minimal 10)
          </div>
        </div>

        <button
          onClick={handleUpload}
          disabled={!selectedFile || uploading || !walletConnected}
          style={{
            background: uploading || !selectedFile || !walletConnected ? "#e5e7eb" : "#111",
            color: uploading || !selectedFile || !walletConnected ? "#888" : "#fff",
            border: "none",
            padding: "16px 32px",
            borderRadius: "12px",
            fontSize: "16px",
            fontWeight: "600",
            cursor: uploading || !selectedFile || !walletConnected ? "not-allowed" : "pointer",
            transition: "all 0.2s",
            boxShadow: "none",
            transform: "none"
          }}
          onMouseOver={(e) => {
            if (selectedFile && !uploading && walletConnected) {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "0 6px 20px rgba(30, 58, 138, 0.4)";
            }
          }}
          onMouseOut={(e) => {
            if (selectedFile && !uploading && walletConnected) {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 4px 12px rgba(30, 58, 138, 0.3)";
            }
          }}
        >
          {uploading ? "Uploading..." : "Upload ke IPFS"}
        </button>

        {uploading && (
          <div style={{ marginTop: "24px", textAlign: "center" }}>
            <LoadingSpinner 
              type="bars"
              text="Mengupload video ke IPFS..."
              progress={uploadProgress}
              showProgress={true}
              color="#1e3a8a"
            />
          </div>
        )}

        {error && (
          <div style={{
            marginTop: "24px",
            padding: "16px 20px",
            background: "#fff",
            border: "1.5px solid #e5e7eb",
            borderRadius: "12px",
            color: "#dc2626",
            fontSize: "14px",
            fontWeight: "500",
            borderLeft: "4px solid #dc2626"
          }}>
            ❌ {error}
          </div>
        )}

        {uploadResult && (
          <div style={{
            marginTop: "24px",
            padding: "24px",
            background: "#f0fdf4",
            border: "1px solid #bbf7d0",
            borderRadius: "12px",
            color: "#166534",
            borderLeft: "4px solid #16a34a"
          }}>
            <h4 style={{ marginBottom: "16px", fontSize: "18px", fontWeight: "600" }}>
              ✅ Upload Berhasil!
            </h4>
            <div style={{ fontSize: "14px", marginBottom: "12px" }}>
              <strong>CID:</strong>
              <span style={{ 
                fontFamily: "monospace", 
                background: "#f8fafc", 
                padding: "4px 8px", 
                borderRadius: "6px",
                marginLeft: "8px"
              }}>
                {uploadResult.cid}
              </span>
            </div>
            {uploadResult.txHash && (
              <div style={{ fontSize: "14px", marginBottom: "12px" }}>
                <strong>Transaction Hash:</strong> 
                <a
                  href={`https://polygonscan.com/tx/${uploadResult.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontFamily: "monospace",
                    background: "#f8fafc",
                    padding: "4px 8px",
                    borderRadius: "6px",
                    marginLeft: "8px",
                    color: "#2563eb",
                    textDecoration: "underline"
                  }}
                >
                  {uploadResult.txHash}
                </a>
              </div>
            )}
            <div style={{ fontSize: "14px" }}>
              <strong>Timestamp:</strong> {uploadResult.timestamp ? new Date(uploadResult.timestamp).toLocaleString('id-ID') : '-'}
            </div>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div style={{
        background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
        padding: "32px",
        borderRadius: "20px",
        border: "1px solid #e2e8f0",
        boxShadow: "0 4px 20px rgba(0,0,0,0.08)"
      }}>
        <h3 style={{ 
          marginBottom: "20px", 
          fontSize: "1.5rem", 
          fontWeight: "600",
          color: "#1e293b"
        }}>
          Cara Upload
        </h3>
        <ol style={{ 
          paddingLeft: "20px", 
          lineHeight: "1.8",
          color: "#64748b",
          fontSize: "1rem"
        }}>
          <li>Pilih file video yang ingin diupload (format: MP4, AVI, MOV, WMV, FLV)</li>
          <li>Pastikan ukuran file tidak terlalu besar (maksimal 100MB)</li>
          <li>Tulis deskripsi video (minimal 10 karakter)</li>
          <li>Klik tombol "Upload ke IPFS"</li>
          <li>Tunggu proses upload selesai</li>
          <li>Catat CID yang diberikan untuk akses file</li>
        </ol>
      </div>
    </div>
  );
};

export default Upload; 