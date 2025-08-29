const express = require('express');
const router = express.Router();
const PolygonService = require('../blockchain/polygon');
const polygonService = new PolygonService();
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });
const { uploadToIPFSAndBlockchain, uploadToIPFSOnly, listPinataFiles, pinata } = require('../ipfs');
const { getVideoDuration } = require('../utils/video');
const jwt = require('jsonwebtoken');
const fetch = require('node-fetch');
const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const LOGS_DIR = path.join(__dirname, '../logs');
if (!fs.existsSync(LOGS_DIR)) fs.mkdirSync(LOGS_DIR, { recursive: true });
const HLS_DIR = path.join(__dirname, '../hls_output');
let ffmpegProcess = null;
let recordProcess = null;
const UPLOAD_META_PATH = path.join(__dirname, '../auto_record/upload_meta.json');
let uploadMeta = { uploadedCount: 0, txCount: 0 };
// Load metadata jika ada
if (fs.existsSync(UPLOAD_META_PATH)) {
  try { uploadMeta = JSON.parse(fs.readFileSync(UPLOAD_META_PATH, 'utf-8')); } catch {}
}

// Hapus inisialisasi blockchain provider dan wallet yang duplikat
// Gunakan polygonService yang sudah diinisialisasi dengan benar

// Helper function untuk menangani error blockchain
function getBlockchainErrorMessage(error) {
  if (typeof error === 'string') {
    if (error.toLowerCase().includes('video with this hash already exists') || 
        error.toLowerCase().includes('already exists') ||
        error.toLowerCase().includes('duplicate')) {
      return 'File video ini sudah ada di sistem. Video dengan konten yang sama tidak dapat diupload lagi.';
    }
    return error;
  }
  
  if (error && error.message) {
    if (error.message.toLowerCase().includes('video with this hash already exists') || 
        error.message.toLowerCase().includes('already exists') ||
        error.message.toLowerCase().includes('duplicate')) {
      return 'File video ini sudah ada di sistem. Video dengan konten yang sama tidak dapat diupload lagi.';
    }
    return error.message;
  }
  
  return 'Terjadi kesalahan pada blockchain';
}

async function getBackendWalletBalance() {
    try {
        // Gunakan polygonService untuk mendapatkan saldo
        const balance = await polygonService.getBackendWalletBalance();
        return balance;
    } catch (error) {
        console.warn('⚠️ Failed to get wallet balance:', error.message);
        return 0;
    }
}

// Fungsi untuk menghentikan rekaman otomatis jika saldo tidak cukup
async function checkBalanceAndStopRecording() {
    try {
        const balance = await getBackendWalletBalance();
        const minBalance = 0.5; // minimal saldo MATIC
        
        if (balance < minBalance && recordProcess) {
            console.log(`⚠️ [BALANCE MONITOR] Saldo wallet backend rendah (${balance} MATIC). Menghentikan rekaman otomatis...`);
            
            // Hentikan proses rekaman
            recordProcess.kill('SIGKILL');
            recordProcess = null;
            
            // Set flag untuk menghentikan upload otomatis
            autoUploadHalted = true;
            
            console.log('✅ [BALANCE MONITOR] Rekaman otomatis berhasil dihentikan karena saldo tidak cukup.');
            return true; // Rekaman dihentikan
        }
        
        // Jika saldo cukup dan sebelumnya dihentikan, reset flag
        if (balance >= minBalance && autoUploadHalted) {
            console.log(`✅ [BALANCE MONITOR] Saldo wallet backend sudah cukup (${balance} MATIC). Upload otomatis dapat diaktifkan kembali.`);
            autoUploadHalted = false;
        }
        
        return false; // Rekaman tidak dihentikan
    } catch (error) {
        console.warn('⚠️ [BALANCE MONITOR] Gagal cek saldo:', error.message);
        return false;
    }
}

// Interval untuk monitoring saldo setiap 30 detik
let balanceMonitorInterval = null;

function startBalanceMonitoring() {
    if (balanceMonitorInterval) {
        clearInterval(balanceMonitorInterval);
    }
    
    balanceMonitorInterval = setInterval(async () => {
        await checkBalanceAndStopRecording();
    }, 30000); // Cek setiap 30 detik
    
    console.log('✅ [BALANCE MONITOR] Monitoring saldo wallet backend dimulai (interval: 30 detik)');
}

function stopBalanceMonitoring() {
    if (balanceMonitorInterval) {
        clearInterval(balanceMonitorInterval);
        balanceMonitorInterval = null;
        console.log('🛑 [BALANCE MONITOR] Monitoring saldo wallet backend dihentikan');
    }
}

// JWT Authentication - DISABLED for development
function authenticateJWT(req, res, next) {
  // Skip authentication for development
  next();
  
  // Original JWT code (commented out):
  /*
  const authHeader = req.headers.authorization;
  const JWT_SECRET = process.env.JWT_SECRET || 'blockcam_secret';
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (err) return res.status(403).json({ error: 'Token tidak valid' });
      req.user = user;
      next();
    });
  } else {
    res.status(401).json({ error: 'Token diperlukan' });
  }
  */
}

router.get('/info', (req, res) => {
  res.json(polygonService.getContractInfo());
});

router.post('/upload-video', upload.single('video'), async (req, res) => {
  try {
    console.log('req.file:', req.file);
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const filePath = req.file.path;
    
    let metadata = req.body.metadata || {};
    if (!metadata.title) {
      metadata.title = req.file.originalname;
    }
    
    // Tambahkan deteksi durasi
    console.log('Getting video duration...');
    const duration = await getVideoDuration(filePath);
    metadata.duration = Math.round(duration);
    console.log('Duration:', duration, 'seconds');
    
    console.log('Uploading to IPFS only (frontend will handle blockchain)...');
    // Upload ke IPFS saja, blockchain dilakukan di frontend
    const { cid, isDuplicate } = await uploadToIPFSOnly(filePath, metadata);
    
    const response = { 
      success: true, 
      cid, 
      isDuplicate,
      fileSize: req.file.size,
      timestamp: new Date().toISOString(),
      title: metadata.title,
      duration: metadata.duration
    };
    
    console.log('Sending response:', response);
    res.json(response);
  } catch (err) {
    console.error('Upload error:', err);
    
    let userFriendlyError = 'Upload gagal';
    
    // Gunakan helper function untuk error blockchain
    if (err.message && (err.message.includes('video with this hash already exists') || 
        err.message.includes('already exists') || 
        err.message.includes('duplicate'))) {
      userFriendlyError = getBlockchainErrorMessage(err);
    } else if (err.message && (err.message.includes('network') || err.message.includes('connection'))) {
      userFriendlyError = 'Upload gagal karena masalah koneksi';
    } else if (err.message) {
      userFriendlyError = err.message;
    }
    
    res.status(500).json({ error: userFriendlyError });
  }
});

router.get('/video/:id', async (req, res) => {
  try {
    const video = await polygonService.getVideoFromBlockchain(req.params.id);
    res.json(video);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/user-videos/:address', async (req, res) => {
  try {
    const videos = await polygonService.getUserVideos(req.params.address);
    res.json(videos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/all-videos', async (req, res) => {
  try {
    const videos = await polygonService.getAllVideos();
    res.json(videos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/verify-video', authenticateJWT, async (req, res) => {
  const { videoId, verified } = req.body;
  try {
    const txHash = await polygonService.verifyVideo(videoId, verified);
    res.json({ txHash });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/is-verifier/:address', async (req, res) => {
  try {
    const isVerifier = await polygonService.isVerifier(req.params.address);
    res.json({ isVerifier });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Endpoint untuk mengambil history file dari Pinata
router.get('/pinata-history', async (req, res) => {
  try {
    const files = await listPinataFiles();
    res.json(files);
  } catch (err) {
    res.status(500).json({ error: 'Gagal mengambil history dari Pinata' });
  }
});

// Endpoint untuk mengambil history transaksi blockchain
router.get('/transaction-history', async (req, res) => {
  try {
    const transactions = await polygonService.getTransactionHistory();
    res.json(transactions);
  } catch (err) {
    console.error('Error fetching transaction history:', err);
    res.status(500).json({ error: 'Gagal mengambil history transaksi blockchain' });
  }
});

// Endpoint untuk mengambil riwayat transaksi berdasarkan wallet address
router.get('/user-transactions/:address', async (req, res) => {
  try {
    const { address } = req.params;
    
    // Validasi address
    if (!address || address.length !== 42) {
      return res.status(400).json({ error: 'Alamat wallet tidak valid' });
    }
    
    const transactions = await polygonService.getUserTransactionHistory(address);
    res.json(transactions || []); // Pastikan selalu return array
  } catch (err) {
    console.error('Error fetching user transaction history:', err);
    
    // Handle specific errors
    if (err.message && err.message.includes('timeout')) {
      res.status(408).json({ error: 'Request timeout. Silakan coba lagi.' });
    } else {
      res.status(500).json({ error: 'Gagal mengambil riwayat transaksi user' });
    }
  }
});

// Endpoint untuk mengambil riwayat upload berdasarkan wallet address
router.get('/user-uploads/:address', authenticateJWT, async (req, res) => {
  try {
    const { address } = req.params;
    
    // Validasi address
    if (!address || address.length !== 42) {
      return res.status(400).json({ error: 'Alamat wallet tidak valid' });
    }
    
    const uploads = await polygonService.getUserUploads(address);
    res.json(uploads || []); // Pastikan selalu return array
  } catch (err) {
    console.error('Error fetching user uploads:', err);
    
    // Handle specific errors
    if (err.message && err.message.includes('timeout')) {
      return res.status(408).json({ error: 'Request timeout. Silakan coba lagi.' });
    }
    
    if (err.message && err.message.includes('network')) {
      return res.status(503).json({ error: 'Network error. Silakan coba lagi.' });
    }
    
    // Return empty array untuk error lainnya
    res.json([]);
  }
});

// Endpoint untuk cek CID di Pinata/IPFS
router.get('/check-cid-ipfs/:cid', async (req, res) => {
  const { cid } = req.params;
  try {
    // Cek di Pinata (akun Anda)
    const result = await pinata.pinList({ hashContains: cid, status: 'pinned' });
    if (result && result.count > 0) {
      return res.json({ exists: true, source: 'pinata' });
    }
    // Cek di gateway publik
    const gatewayRes = await fetch(`https://gateway.pinata.cloud/ipfs/${cid}`, { method: 'HEAD' });
    if (gatewayRes.ok) {
      return res.json({ exists: true, source: 'public' });
    }
    res.json({ exists: false });
  } catch (err) {
    res.json({ exists: false });
  }
});

// Live View: Mulai stream ke HLS
router.post('/live-view/start', (req, res) => {
  const { rtspUrl } = req.body;
  if (!rtspUrl) return res.status(400).json({ error: 'rtspUrl required' });
  try { execSync('taskkill /IM ffmpeg.exe /F'); } catch {}
  if (ffmpegProcess) {
    ffmpegProcess.kill('SIGKILL');
    ffmpegProcess = null;
  }
  fs.rmSync(HLS_DIR, { recursive: true, force: true });
  fs.mkdirSync(HLS_DIR);
  const args = [
    '-i', rtspUrl,
    '-c:v', 'copy',
    '-c:a', 'aac',
    '-f', 'hls',
    '-hls_time', '2',
    '-hls_list_size', '5',
    '-hls_flags', 'delete_segments',
    path.join(HLS_DIR, 'stream.m3u8')
  ];
  const streamLog = fs.createWriteStream(path.join(LOGS_DIR, 'live-view-stream.log'), { flags: 'a' });
  ffmpegProcess = spawn('ffmpeg', args);
  ffmpegProcess.stdout.pipe(streamLog);
  ffmpegProcess.stderr.pipe(streamLog);
  ffmpegProcess.on('exit', () => { ffmpegProcess = null; });
  res.json({ success: true });
});

// Live View: Stop stream
router.post('/live-view/stop', (req, res) => {
  if (ffmpegProcess) {
    ffmpegProcess.kill('SIGKILL');
    ffmpegProcess = null;
    res.json({ success: true });
  } else {
    res.status(400).json({ error: 'No stream running' });
  }
});

// Rekaman otomatis: mulai
router.post('/recording/start', async (req, res) => {
  const { segmentTime, rtspUrl } = req.body;
  if (!rtspUrl) return res.status(400).json({ error: 'rtspUrl required' });
  if (!segmentTime || isNaN(segmentTime)) return res.status(400).json({ error: 'segmentTime required' });
  // Cek saldo wallet backend
  const minBalance = 0.5; // minimal saldo MATIC
  const balance = await getBackendWalletBalance();
  if (balance < minBalance) {
    return res.status(400).json({ error: `Saldo wallet backend kurang (${balance} MATIC). Deposit minimal 0.5 MATIC sebelum mulai rekaman otomatis.`, code: 'LOW_BALANCE', backendAddress: polygonService.getBackendWalletAddress(), balance });
  }
  if (recordProcess) {
    recordProcess.kill('SIGKILL');
    recordProcess = null;
  }
  const outputDir = path.join(__dirname, '../auto_record');
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
  // Hapus semua file .mp4 lama sebelum mulai rekaman baru
  const files = fs.readdirSync(outputDir).filter(f => f.endsWith('.mp4'));
  for (const f of files) {
    try { fs.unlinkSync(path.join(outputDir, f)); } catch {}
  }
  // Reset uploadMeta agar count upload dan tx mulai dari 0
  uploadMeta = { uploadedCount: 0, txCount: 0 };
  fs.writeFileSync(UPLOAD_META_PATH, JSON.stringify(uploadMeta, null, 2));
  const args = [
    '-i', rtspUrl,
    '-c:v', 'libx264',
    '-b:v', '200k',          // Turunkan bitrate video ke 200 kbps untuk ukuran ~2MB/menit
    '-maxrate', '250k',      // Maksimal bitrate 250 kbps
    '-bufsize', '500k',      // Buffer size
    '-preset', 'fast',       // Preset lebih cepat untuk kompresi lebih agresif
    '-crf', '28',            // CRF lebih tinggi untuk kompresi lebih kuat (23-28 = good quality)
    '-c:a', 'aac',
    '-b:a', '64k',           // Turunkan bitrate audio ke 64 kbps
    '-movflags', '+faststart',
    '-f', 'segment',
    '-segment_time', String(segmentTime),
    '-reset_timestamps', '1',
    '-start_number', '1', // mulai dari record_001.mp4
    path.join(outputDir, 'record_%03d.mp4')
  ];
  const recordLog = fs.createWriteStream(path.join(LOGS_DIR, 'rtsp-record.log'), { flags: 'a' });
  recordProcess = spawn('ffmpeg', args);
  recordProcess.stdout.pipe(recordLog);
  recordProcess.stderr.pipe(recordLog);
  recordProcess.on('exit', () => { recordProcess = null; });
  
  // Mulai monitoring saldo wallet backend
  startBalanceMonitoring();
  
  res.json({ success: true });
});

// Rekaman otomatis: stop
router.post('/recording/stop', (req, res) => {
  if (recordProcess) {
    recordProcess.kill('SIGKILL');
    recordProcess = null;
    
    // Hentikan monitoring saldo wallet backend
    stopBalanceMonitoring();
    
    res.json({ success: true });
  } else {
    res.status(400).json({ error: 'No recording running' });
  }
});

// Watcher: upload otomatis file baru di auto_record ke IPFS & blockchain
const autoRecordDir = path.join(__dirname, '../auto_record');
if (!fs.existsSync(autoRecordDir)) fs.mkdirSync(autoRecordDir, { recursive: true });
let autoUploadHalted = false;

let progressStatus = {
  uploadStatus: 'idle', // idle | uploading | uploaded | failed
  txStatus: 'idle',     // idle | pending | success | failed
  lastFileName: null,
  lastCid: null,
  lastTxHash: null,
  lastTime: null,
  lastError: null
};

// Fungsi cleanup: batasi maksimal 5 file .mp4 di auto_record
function cleanupAutoRecordDir() {
  const MAX_FILES = 3;
  let files = fs.readdirSync(autoRecordDir)
    .filter(f => f.endsWith('.mp4'))
    .map(f => ({
      name: f,
      path: path.join(autoRecordDir, f),
      mtime: fs.statSync(path.join(autoRecordDir, f)).mtime
    }))
    .sort((a, b) => a.mtime - b.mtime);
  while (files.length > MAX_FILES) {
    const fileToDelete = files[0];
    try {
      fs.unlinkSync(fileToDelete.path);
      console.log('[AUTO CLEANUP] Hapus file:', fileToDelete.name);
    } catch (e) {
      console.warn('[AUTO CLEANUP] Gagal hapus', fileToDelete.name, e);
    }
    files = files.slice(1);
  }
}

function updateUploadStats() {
  let uploaded = 0, tx = 0;
  for (const k of Object.keys(uploadMeta)) {
    if (k === 'uploadedCount' || k === 'txCount') continue;
    if (uploadMeta[k] && uploadMeta[k].cid) uploaded++;
    if (uploadMeta[k] && uploadMeta[k].txHash) tx++;
  }
  uploadMeta.uploadedCount = uploaded;
  uploadMeta.txCount = tx;
}

fs.watch(autoRecordDir, async (event, filename) => {
  if (event === 'rename' && filename && filename.endsWith('.mp4')) {
    if (autoUploadHalted) {
      console.warn('[AUTO UPLOAD] Dihentikan: saldo backend tidak cukup, upload otomatis dinonaktifkan.');
      return;
    }
    // Dapatkan semua file mp4, urutkan
    let files = fs.readdirSync(autoRecordDir)
      .filter(f => f.endsWith('.mp4'))
      .sort();
    if (files.length < 2) return; // minimal 2 file agar bisa upload yang sudah fix
    const lastFile = files[files.length - 1];
    // Upload semua file KECUALI lastFile
    for (const file of files.slice(0, -1)) {
      const filePath = path.join(autoRecordDir, file);
      if (fs.existsSync(filePath) && fs.statSync(filePath).size > 0 && !uploadMeta[file]) {
        try {
          // Tunggu file stabil (tidak berubah ukuran selama 3 detik)
          let lastSize = -1;
          let stableCount = 0;
          for (let i = 0; i < 10; i++) {
            const curSize = fs.statSync(filePath).size;
            if (curSize === lastSize && curSize > 0) {
              stableCount++;
              if (stableCount >= 3) break;
            } else {
              stableCount = 0;
            }
            lastSize = curSize;
            await new Promise(r => setTimeout(r, 1000));
          }
          let duration = 0;
          try {
            duration = Math.round(await getVideoDuration(filePath));
          } catch (e) {
            console.warn('[AUTO UPLOAD] Gagal ambil durasi video', file, e);
          }
          if (duration > 0) {
            console.log('[AUTO UPLOAD] Mulai upload ke IPFS:', file);
            const { cid } = await uploadToIPFSOnly(filePath, { name: file });
            console.log('[AUTO UPLOAD] Selesai upload ke IPFS:', file, 'CID:', cid);
            const now = new Date();
            const pad = n => n.toString().padStart(2, '0');
            const title = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
            const description = '';
            let txHash = null;
            let skipFile = false;
            if (!cid || !title || duration <= 0) {
              console.error('[AUTO UPLOAD ERROR] Parameter tidak valid untuk upload ke blockchain:', { cid, title, duration });
              uploadMeta[file] = { cid, txHash: null, error: 'Parameter tidak valid (hash/title/duration)' };
              updateUploadStats();
              fs.writeFileSync(UPLOAD_META_PATH, JSON.stringify(uploadMeta, null, 2));
              skipFile = true;
            }
            if (!skipFile) {
              console.log('[AUTO UPLOAD] Mulai upload ke blockchain:', file, { cid, title, duration });
              try {
                const txResult = await polygonService.uploadVideoToBlockchain(cid, fs.statSync(filePath).size, { title, description, duration });
                txHash = txResult && txResult.transactionHash ? txResult.transactionHash : null;
                console.log('[AUTO UPLOAD] Selesai upload ke blockchain:', file, 'txHash:', txHash);
              } catch (e) {
                console.error('[AUTO UPLOAD ERROR] Gagal upload ke blockchain', file, e);
                
                // Cek apakah error disebabkan oleh saldo tidak cukup
                if (e.message && (e.message.includes('insufficient funds') || e.message.includes('balance') || e.message.includes('gas'))) {
                  console.warn('[AUTO UPLOAD] Error terkait saldo terdeteksi, menghentikan rekaman otomatis...');
                  
                  // Hentikan rekaman otomatis
                  if (recordProcess) {
                    recordProcess.kill('SIGKILL');
                    recordProcess = null;
                    console.log('✅ [AUTO UPLOAD] Rekaman otomatis dihentikan karena saldo tidak cukup.');
                  }
                  
                  // Set flag untuk menghentikan upload otomatis
                  autoUploadHalted = true;
                  
                  // Hentikan monitoring saldo
                  stopBalanceMonitoring();
                }
                
                uploadMeta[file] = { cid, txHash: null, error: e.message || String(e) };
                updateUploadStats();
                fs.writeFileSync(UPLOAD_META_PATH, JSON.stringify(uploadMeta, null, 2));
                skipFile = true;
              }
            }
            if (!skipFile) {
              uploadMeta[file] = { cid, txHash };
              updateUploadStats();
              fs.writeFileSync(UPLOAD_META_PATH, JSON.stringify(uploadMeta, null, 2));
              console.log(`[AUTO UPLOAD] ${file} -> IPFS: ${cid}, Blockchain: ${txHash}`);
              cleanupAutoRecordDir();
            }
          } else {
            console.warn('[AUTO UPLOAD] Durasi video 0/gagal, SKIP upload ke IPFS & blockchain:', file);
          }
        } catch (e) {
          console.error('[AUTO UPLOAD ERROR]', file, e);
        }
      }
    }
  }
});
// Upload file terakhir saat proses rekaman berhenti
if (recordProcess) {
  recordProcess.on('exit', async () => {
    let files = fs.readdirSync(autoRecordDir)
      .filter(f => f.endsWith('.mp4'))
      .sort();
    if (files.length === 0) return;
    const lastFile = files[files.length - 1];
    const filePath = path.join(autoRecordDir, lastFile);
    if (fs.existsSync(filePath) && fs.statSync(filePath).size > 0 && !uploadMeta[lastFile]) {
      try {
        let lastSize = -1;
        let stableCount = 0;
        for (let i = 0; i < 10; i++) {
          const curSize = fs.statSync(filePath).size;
          if (curSize === lastSize && curSize > 0) {
            stableCount++;
            if (stableCount >= 3) break;
          } else {
            stableCount = 0;
          }
          lastSize = curSize;
          await new Promise(r => setTimeout(r, 1000));
        }
        let duration = 0;
        try {
          duration = Math.round(await getVideoDuration(filePath));
        } catch (e) {
          console.warn('[AUTO UPLOAD] Gagal ambil durasi video', lastFile, e);
        }
        if (duration > 0) {
          console.log('[AUTO UPLOAD] Mulai upload ke IPFS:', lastFile);
          const { cid } = await uploadToIPFSOnly(filePath, { name: lastFile });
          console.log('[AUTO UPLOAD] Selesai upload ke IPFS:', lastFile, 'CID:', cid);
          const now = new Date();
          const pad = n => n.toString().padStart(2, '0');
          const title = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
          const description = '';
          let txHash = null;
          let skipFile = false;
          if (!cid || !title || duration <= 0) {
            console.error('[AUTO UPLOAD ERROR] Parameter tidak valid untuk upload ke blockchain:', { cid, title, duration });
            uploadMeta[lastFile] = { cid, txHash: null, error: 'Parameter tidak valid (hash/title/duration)' };
            updateUploadStats();
            fs.writeFileSync(UPLOAD_META_PATH, JSON.stringify(uploadMeta, null, 2));
            skipFile = true;
          }
          if (!skipFile) {
            console.log('[AUTO UPLOAD] Mulai upload ke blockchain:', lastFile, { cid, title, duration });
            try {
              const txResult = await polygonService.uploadVideoToBlockchain(cid, fs.statSync(filePath).size, { title, description, duration });
              txHash = txResult && txResult.transactionHash ? txResult.transactionHash : null;
              console.log('[AUTO UPLOAD] Selesai upload ke blockchain:', lastFile, 'txHash:', txHash);
            } catch (e) {
              console.error('[AUTO UPLOAD ERROR] Gagal upload ke blockchain', lastFile, e);
              
              // Cek apakah error disebabkan oleh saldo tidak cukup
              if (e.message && (e.message.includes('insufficient funds') || e.message.includes('balance') || e.message.includes('gas'))) {
                console.warn('[AUTO UPLOAD] Error terkait saldo terdeteksi pada file terakhir...');
                
                // Set flag untuk menghentikan upload otomatis
                autoUploadHalted = true;
                
                // Hentikan monitoring saldo
                stopBalanceMonitoring();
              }
              
              uploadMeta[lastFile] = { cid, txHash: null, error: e.message || String(e) };
              updateUploadStats();
              fs.writeFileSync(UPLOAD_META_PATH, JSON.stringify(uploadMeta, null, 2));
              skipFile = true;
            }
          }
          if (!skipFile) {
            uploadMeta[lastFile] = { cid, txHash };
            updateUploadStats();
            fs.writeFileSync(UPLOAD_META_PATH, JSON.stringify(uploadMeta, null, 2));
            console.log(`[AUTO UPLOAD] ${lastFile} -> IPFS: ${cid}, Blockchain: ${txHash}`);
            cleanupAutoRecordDir();
          }
        } else {
          console.warn('[AUTO UPLOAD] Durasi video 0/gagal, SKIP upload ke IPFS & blockchain:', lastFile);
        }
      } catch (e) {
        console.error('[AUTO UPLOAD ERROR]', lastFile, e);
      }
    }
  });
}

// Endpoint stats jumlah upload dan transaksi
router.get('/recording/stats', (req, res) => {
  res.json({ uploadedCount: uploadMeta.uploadedCount || 0, txCount: uploadMeta.txCount || 0 });
});

// Endpoint cek saldo wallet backend
router.get('/recording/backend-balance', async (req, res) => {
  const balance = await getBackendWalletBalance();
  const isMonitoring = balanceMonitorInterval !== null;
  const minBalance = 0.5;
  const isLowBalance = balance < minBalance;
  
  res.json({ 
    address: polygonService.getBackendWalletAddress(), 
    balance,
    isMonitoring,
    isLowBalance,
    minBalance,
    autoUploadHalted
  });
});

// Endpoint cek status monitoring saldo
router.get('/recording/balance-monitor-status', (req, res) => {
  res.json({ 
    isMonitoring: balanceMonitorInterval !== null,
    autoUploadHalted,
    lastCheck: new Date().toISOString()
  });
});

// Endpoint status lengkap rekaman otomatis
router.get('/recording/status', async (req, res) => {
  try {
    const balance = await getBackendWalletBalance();
    const minBalance = 0.5;
    const isLowBalance = balance < minBalance;
    const isRecording = recordProcess !== null;
    const isMonitoring = balanceMonitorInterval !== null;
    
    res.json({
      isRecording,
      isMonitoring,
      balance,
      minBalance,
      isLowBalance,
      autoUploadHalted,
      canStartRecording: balance >= minBalance && !isRecording,
      shouldStopRecording: isLowBalance && isRecording,
      lastCheck: new Date().toISOString(),
      stats: {
        uploadedCount: uploadMeta.uploadedCount || 0,
        txCount: uploadMeta.txCount || 0
      }
    });
  } catch (error) {
    console.error('Error getting recording status:', error);
    res.status(500).json({ error: 'Gagal mendapatkan status rekaman' });
  }
});

// Endpoint cek status auto upload
router.get('/recording/auto-upload-status', (req, res) => {
  res.json({ halted: autoUploadHalted });
});

// Endpoint untuk mendapatkan estimasi gas dan biaya transaksi
router.get('/gas-estimation', async (req, res) => {
  try {
    const gasEstimation = await polygonService.getGasEstimation();
    res.json(gasEstimation);
  } catch (err) {
    console.error('Error getting gas estimation:', err);
    res.status(500).json({ 
      error: 'Gagal mendapatkan estimasi gas',
      estimatedCostInRupiah: '45',
      optimalEstimatedCostInRupiah: '55'
    });
  }
});

router.get('/recording/progress', (req, res) => {
  res.json(progressStatus);
});

module.exports = router; 