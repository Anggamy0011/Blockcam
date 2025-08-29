const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

const app = express();
app.use(cors());
app.use(express.json());
const HLS_DIR = path.join(__dirname, 'hls_output');
let ffmpegProcess = null;
let recordProcess = null;

// Endpoint untuk memulai stream RTSP ke HLS
app.post('/api/rtsp/start', (req, res) => {
  const { rtspUrl } = req.body;
  if (!rtspUrl) return res.status(400).json({ error: 'rtspUrl required' });

  // Kill all ffmpeg processes before starting new one (Windows)
  try { execSync('taskkill /IM ffmpeg.exe /F'); } catch {}

  if (ffmpegProcess) {
    ffmpegProcess.kill('SIGKILL');
    ffmpegProcess = null;
  }
  // Bersihkan file lama
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
  ffmpegProcess = spawn('ffmpeg', args, { stdio: 'inherit' });
  ffmpegProcess.on('exit', () => {
    ffmpegProcess = null;
  });
  res.json({ success: true });
});

// Endpoint untuk menghentikan stream RTSP ke HLS
app.post('/api/rtsp/stop', (req, res) => {
  if (ffmpegProcess) {
    ffmpegProcess.kill('SIGKILL');
    ffmpegProcess = null;
    res.json({ success: true });
  } else {
    res.status(400).json({ error: 'No stream running' });
  }
});

// Rekaman otomatis: mulai
app.post('/api/recording/start', (req, res) => {
  const { segmentTime, rtspUrl } = req.body;
  if (!rtspUrl) return res.status(400).json({ error: 'rtspUrl required' });
  if (!segmentTime || isNaN(segmentTime)) return res.status(400).json({ error: 'segmentTime required' });

  // Stop proses rekaman lama jika ada
  if (recordProcess) {
    recordProcess.kill('SIGKILL');
    recordProcess = null;
  }

  // Buat folder rekaman jika belum ada
  const outputDir = path.join(__dirname, 'auto_record');
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

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
    '-f', 'segment',
    '-segment_time', String(segmentTime),
    '-reset_timestamps', '1',
    path.join(outputDir, 'record_%03d.mp4')
  ];
  recordProcess = spawn('ffmpeg', args, { stdio: 'ignore' });
  recordProcess.on('exit', () => {
    recordProcess = null;
  });
  res.json({ success: true });
});

// Rekaman otomatis: stop
app.post('/api/recording/stop', (req, res) => {
  if (recordProcess) {
    recordProcess.kill('SIGKILL');
    recordProcess = null;
    res.json({ success: true });
  } else {
    res.status(400).json({ error: 'No recording running' });
  }
});

// Serve HLS
app.use('/hls', express.static(HLS_DIR));

app.listen(4100, () => {
  console.log('Server running at http://localhost:4100');
}); 