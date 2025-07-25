require('dotenv').config();
const pinataSDK = require('@pinata/sdk');
const fs = require('fs');
const path = require('path');
const PolygonService = require('./blockchain/polygon');

const pinata = new pinataSDK(process.env.PINATA_API_KEY, process.env.PINATA_API_SECRET);
const polygonService = new PolygonService();

async function uploadToIPFSAndBlockchain(filePath, metadata) {
  try {
    console.log('Uploading to Pinata:', filePath);
    const readableStream = fs.createReadStream(filePath);
    const result = await pinata.pinFileToIPFS(readableStream, {
      pinataMetadata: {
        name: metadata.name || path.basename(filePath)
      }
    });
    console.log('Pinata result:', result);
    const cid = result.IpfsHash;
    const fileSize = fs.statSync(filePath).size;
    console.log('Calling uploadVideoToBlockchain...');
    const txResult = await polygonService.uploadVideoToBlockchain(cid, fileSize, metadata);
    console.log('txResult from blockchain:', txResult);
    console.log('transactionHash:', txResult?.transactionHash);
    
    const response = { cid, txHash: txResult?.transactionHash, isDuplicate: result.isDuplicate };
    console.log('Final response:', response);
    return response;
  } catch (err) {
    console.error('Pinata upload error:', err);
    throw err;
  }
}

// Upload to IPFS only (without blockchain)
async function uploadToIPFSOnly(filePath, metadata) {
  try {
    console.log('Uploading to Pinata (IPFS only):', filePath);
    const readableStream = fs.createReadStream(filePath);
    const result = await pinata.pinFileToIPFS(readableStream, {
      pinataMetadata: {
        name: metadata.name || path.basename(filePath)
      }
    });
    console.log('Pinata result:', result);
    const cid = result.IpfsHash;

    // Cek ke Pinata apakah hash sudah ada (duplikat)
    const pinListResult = await pinata.pinList({ hashContains: cid, status: 'pinned' });
    const isDuplicate = pinListResult && pinListResult.count > 1; // >1 karena file baru saja dipin

    return { cid, isDuplicate };
  } catch (err) {
    console.error('Pinata upload error:', err);
    throw err;
  }
}

// Fungsi untuk mengambil history file dari Pinata
async function listPinataFiles() {
  try {
    const result = await pinata.pinList({ status: 'pinned' });
    return result.rows || [];
  } catch (err) {
    console.error('Pinata list error:', err);
    throw err;
  }
}

module.exports = { uploadToIPFSAndBlockchain, uploadToIPFSOnly, listPinataFiles, pinata }; 