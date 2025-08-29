# BlockCam

BlockCam adalah sistem manajemen video CCTV berbasis blockchain dan IPFS.

## Fitur Utama
- **Dashboard**: Ringkasan dan navigasi utama
- **Live View**: Streaming video CCTV secara langsung melalui RTSP
- **Upload**: Upload video ke IPFS dan simpan hash di blockchain
- **Verifikasi**: Verifikasi keaslian video berdasarkan CID IPFS
- **History**: Riwayat upload dan transaksi blockchain

## Teknologi
- **Frontend**: React + TypeScript
- **Backend**: Node.js + Express
- **Blockchain**: Polygon, Ethers.js
- **Storage**: IPFS

## Instalasi

### Backend
```bash
cd backend
npm install
npm start
```

### Frontend
```bash
cd frontend
npm install
npm start
```

## Catatan
- Fitur Live View CCTV kini tersedia untuk streaming CCTV secara langsung.
- Semua upload dan verifikasi tetap berbasis file video dan hash IPFS.

---

Lisensi: MIT 