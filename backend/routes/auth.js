const express = require('express');
// const jwt = require('jsonwebtoken'); // DISABLED for development
const bcrypt = require('bcryptjs');
const router = express.Router();

// User storage sementara (bisa diganti ke database/file JSON nanti)
const users = [];
// const JWT_SECRET = process.env.JWT_SECRET || 'blockcam_secret'; // DISABLED

// Register
router.post('/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username dan password wajib diisi' });
  }
  const existing = users.find(u => u.username === username);
  if (existing) {
    return res.status(409).json({ error: 'Username sudah terdaftar' });
  }
  const hashed = await bcrypt.hash(password, 10);
  users.push({ username, password: hashed });
  res.json({ success: true, message: 'Registrasi berhasil' });
});

// Login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = users.find(u => u.username === username);
  if (!user) {
    return res.status(401).json({ error: 'Username atau password salah' });
  }
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    return res.status(401).json({ error: 'Username atau password salah' });
  }
  
  // Return success without JWT token for development
  res.json({ success: true, message: 'Login berhasil', username });
  
  // Original JWT code (commented out):
  // const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '1d' });
  // res.json({ token });
});

module.exports = router; 