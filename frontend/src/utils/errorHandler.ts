// Error types untuk aplikasi BlockCam
export enum ErrorType {
  WALLET_CONNECTION = 'WALLET_CONNECTION',
  BLOCKCHAIN_TRANSACTION = 'BLOCKCHAIN_TRANSACTION',
  IPFS_UPLOAD = 'IPFS_UPLOAD',
  NETWORK_ERROR = 'NETWORK_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  FILE_ERROR = 'FILE_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

export interface AppError {
  type: ErrorType;
  message: string;
  code?: string;
  details?: string;
  timestamp: Date;
  userFriendlyMessage: string;
}

// Error messages dalam bahasa Indonesia
const ERROR_MESSAGES = {
  [ErrorType.WALLET_CONNECTION]: {
    'MetaMask is not installed': 'MetaMask tidak terinstall. Silakan install MetaMask terlebih dahulu.',
    'No accounts found': 'Tidak ada akun yang ditemukan. Silakan unlock MetaMask.',
    'User rejected': 'Koneksi wallet ditolak oleh user.',
    'Gagal switch ke jaringan Polygon': 'Gagal beralih ke jaringan Polygon. Silakan ganti network secara manual.',
    'default': 'Gagal terhubung ke wallet. Silakan coba lagi.'
  },
  [ErrorType.BLOCKCHAIN_TRANSACTION]: {
    'insufficient funds': 'Saldo MATIC tidak cukup untuk transaksi.',
    'gas estimation failed': 'Estimasi gas gagal. Silakan coba lagi.',
    'nonce too low': 'Transaksi gagal. Silakan refresh dan coba lagi.',
    'user rejected': 'Transaksi dibatalkan oleh user.',
    'video with this hash already exists': 'File video ini sudah ada di sistem. Video dengan konten yang sama tidak dapat diupload lagi.',
    'already exists': 'File video ini sudah ada di sistem. Video dengan konten yang sama tidak dapat diupload lagi.',
    'duplicate': 'File video ini sudah ada di sistem. Video dengan konten yang sama tidak dapat diupload lagi.',
    'default': 'Transaksi blockchain gagal. Silakan coba lagi.'
  },
  [ErrorType.IPFS_UPLOAD]: {
    'file too large': 'File terlalu besar. Maksimal 100MB.',
    'invalid file type': 'Tipe file tidak didukung. Gunakan format video.',
    'upload failed': 'Upload ke IPFS gagal. Silakan coba lagi.',
    'default': 'Gagal upload file. Silakan coba lagi.'
  },
  [ErrorType.NETWORK_ERROR]: {
    'fetch failed': 'Gagal terhubung ke server. Periksa koneksi internet.',
    'timeout': 'Request timeout. Silakan coba lagi.',
    'default': 'Gagal terhubung ke server. Silakan coba lagi.'
  },
  [ErrorType.VALIDATION_ERROR]: {
    'invalid cid': 'CID/IPFS hash tidak valid.',
    'invalid address': 'Alamat wallet tidak valid.',
    'required field': 'Field ini wajib diisi.',
    'default': 'Data yang dimasukkan tidak valid.'
  },
  [ErrorType.FILE_ERROR]: {
    'file not found': 'File tidak ditemukan.',
    'file corrupted': 'File rusak atau tidak dapat dibaca.',
    'default': 'Terjadi kesalahan dengan file.'
  },
  [ErrorType.UNKNOWN_ERROR]: {
    'default': 'Terjadi kesalahan yang tidak terduga. Silakan refresh halaman.'
  }
};

// Fungsi untuk membuat error yang user-friendly
export function createAppError(
  type: ErrorType,
  originalError: Error | string,
  code?: string,
  details?: string
): AppError {
  const errorMessage = typeof originalError === 'string' ? originalError : originalError.message;
  const errorMessages = ERROR_MESSAGES[type];
  
  // Cari pesan yang sesuai
  let userFriendlyMessage = errorMessages.default;
  for (const [key, message] of Object.entries(errorMessages)) {
    if (key !== 'default' && errorMessage.toLowerCase().includes(key.toLowerCase())) {
      userFriendlyMessage = message;
      break;
    }
  }

  return {
    type,
    message: errorMessage,
    code,
    details,
    timestamp: new Date(),
    userFriendlyMessage
  };
}

// Fungsi untuk menangani error berdasarkan tipe
export function handleError(err: any) {
  if (typeof err === 'object' && err !== null) {
    if (err.userFriendlyMessage) return err.userFriendlyMessage;
    if (err.message) return err.message;
    if (err.error) return err.error;
    // Jika error dari response axios/fetch
    if (err.response && err.response.data) {
      if (err.response.data.error) return err.response.data.error;
      if (err.response.data.message) return err.response.data.message;
    }
    // Jika error dari fetch
    if (err.data && err.data.error) return err.data.error;
    return JSON.stringify(err);
  }
  return err;
}

// Fungsi untuk log error (untuk debugging)
export function logError(error: AppError): void {
  console.error('BlockCam Error:', {
    type: error.type,
    message: error.message,
    code: error.code,
    details: error.details,
    timestamp: error.timestamp,
    userFriendlyMessage: error.userFriendlyMessage
  });
}

// Fungsi untuk retry mechanism
export async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt === maxRetries) {
        throw lastError;
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay * attempt));
    }
  }
  
  throw lastError!;
} 