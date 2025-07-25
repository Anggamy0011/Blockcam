const express = require('express');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const app = express();
const HLS_DIR = path.join(__dirname, 'hls_output');
const RTSP_URL = 'rtsp://admin:admin123@192.168.100.53:554/cam/realmonitor?channel=1&subtype=0';

// Pastikan folder HLS ada
if (!fs.existsSync(HLS_DIR)) fs.mkdirSync(HLS_DIR);

// Jalankan FFmpeg otomatis
function startFFmpeg() {
  // Bersihkan file lama
  fs.rmSync(HLS_DIR, { recursive: true, force: true });
  fs.mkdirSync(HLS_DIR);

  const args = [
    '-i', RTSP_URL,
    '-c:v', 'copy',
    '-c:a', 'aac',
    '-f', 'hls',
    '-hls_time', '2',
    '-hls_list_size', '5',
    '-hls_flags', 'delete_segments',
    path.join(HLS_DIR, 'stream.m3u8')
  ];

  const ffmpeg = spawn('ffmpeg', args, { stdio: 'ignore' });

  ffmpeg.on('exit', (code) => {
    console.log('FFmpeg exited with code', code);
    // Restart jika perlu
    setTimeout(startFFmpeg, 2000);
  });

  console.log('FFmpeg started for RTSP to HLS');
}

startFFmpeg();

// Serve HLS
app.use('/hls', express.static(HLS_DIR));

app.listen(4100, () => {
  console.log('Server running at http://localhost:4100');
}); 