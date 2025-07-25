# BlockCam

BlockCam adalah sistem manajemen video CCTV berbasis blockchain dan IPFS.

## Fitur Utama
- **Dashboard**: Ringkasan dan navigasi utama
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
- Tidak ada fitur live view, RTSP, atau HLS streaming.
- Semua upload dan verifikasi berbasis file video dan hash IPFS.

---

Lisensi: MIT 