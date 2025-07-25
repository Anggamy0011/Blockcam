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
const { ethers } = require('ethers');
const POLYGON_RPC = process.env.POLYGON_RPC || 'https://polygon-rpc.com';
const BACKEND_PRIVATE_KEY = process.env.BACKEND_PRIVATE_KEY;
const provider = new ethers.JsonRpcProvider(POLYGON_RPC);
const backendWallet = BACKEND_PRIVATE_KEY ? new ethers.Wallet(BACKEND_PRIVATE_KEY, provider) : null;

async function getBackendWalletBalance() {
  if (!backendWallet) return 0;
  const balance = await provider.getBalance(backendWallet.address);
  return Number(ethers.formatEther(balance));
}

function authenticateJWT(req, res, next) {
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
      description: metadata.description || '',
      duration: metadata.duration
    };
    
    console.log('Sending response:', response);
    res.json(response);
  } catch (err) {
    console.error('Upload error:', err);
    
    let userFriendlyError = 'Upload gagal';
    
    if (err.message && (err.message.includes('already exists') || err.message.includes('duplicate'))) {
      userFriendlyError = 'File ini sudah pernah diupload ke IPFS';
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
    const transactions = await polygonService.getUserTransactionHistory(address);
    res.json(transactions);
  } catch (err) {
    console.error('Error fetching user transaction history:', err);
    res.status(500).json({ error: 'Gagal mengambil riwayat transaksi user' });
  }
});

// Endpoint untuk mengambil riwayat upload berdasarkan wallet address
router.get('/user-uploads/:address', authenticateJWT, async (req, res) => {
  try {
    const { address } = req.params;
    const uploads = await polygonService.getUserUploads(address);
    res.json(uploads);
  } catch (err) {
    console.error('Error fetching user uploads:', err);
    res.status(500).json({ error: 'Gagal mengambil riwayat upload user' });
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

// RTSP: Mulai stream ke HLS
router.post('/rtsp/start', (req, res) => {
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
  const streamLog = fs.createWriteStream(path.join(LOGS_DIR, 'rtsp-stream.log'), { flags: 'a' });
  ffmpegProcess = spawn('ffmpeg', args);
  ffmpegProcess.stdout.pipe(streamLog);
  ffmpegProcess.stderr.pipe(streamLog);
  ffmpegProcess.on('exit', () => { ffmpegProcess = null; });
  res.json({ success: true });
});

// RTSP: Stop stream
router.post('/rtsp/stop', (req, res) => {
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
    return res.status(400).json({ error: `Saldo wallet backend kurang (${balance} MATIC). Deposit minimal 0.5 MATIC sebelum mulai rekaman otomatis.`, code: 'LOW_BALANCE', backendAddress: backendWallet?.address, balance });
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
    '-c:a', 'aac',
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
  res.json({ success: true });
});

// Rekaman otomatis: stop
router.post('/recording/stop', (req, res) => {
  if (recordProcess) {
    recordProcess.kill('SIGKILL');
    recordProcess = null;
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
  res.json({ address: backendWallet?.address, balance });
});

// Endpoint cek status auto upload
router.get('/recording/auto-upload-status', (req, res) => {
  res.json({ halted: autoUploadHalted });
});

router.get('/recording/progress', (req, res) => {
  res.json(progressStatus);
});

module.exports = router; 