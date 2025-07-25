// Validation utilities untuk aplikasi BlockCam
import { ErrorType, createAppError } from './errorHandler';

// File validation constants
export const FILE_CONSTRAINTS = {
  MAX_SIZE: 100 * 1024 * 1024, // 100MB
  ALLOWED_TYPES: ['video/mp4', 'video/avi', 'video/mov', 'video/wmv', 'video/flv'],
  ALLOWED_EXTENSIONS: ['.mp4', '.avi', '.mov', '.wmv', '.flv']
};

// IPFS CID validation
export const IPFS_CID_REGEX = /^Qm[1-9A-HJ-NP-Za-km-z]{44}$|^bafy[a-z2-7]{55}$/;

// Ethereum address validation
export const ETH_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;

// Validation functions
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

// File validation
export function validateFile(file: File): void {
  // Check file size
  if (file.size > FILE_CONSTRAINTS.MAX_SIZE) {
    throw new ValidationError(`File terlalu besar. Maksimal ${FILE_CONSTRAINTS.MAX_SIZE / (1024 * 1024)}MB`);
  }

  // Check file type
  if (!FILE_CONSTRAINTS.ALLOWED_TYPES.includes(file.type)) {
    throw new ValidationError(`Tipe file tidak didukung. Gunakan format: ${FILE_CONSTRAINTS.ALLOWED_EXTENSIONS.join(', ')}`);
  }

  // Check file extension
  const extension = '.' + file.name.split('.').pop()?.toLowerCase();
  if (!FILE_CONSTRAINTS.ALLOWED_EXTENSIONS.includes(extension)) {
    throw new ValidationError(`Ekstensi file tidak didukung. Gunakan: ${FILE_CONSTRAINTS.ALLOWED_EXTENSIONS.join(', ')}`);
  }

  // Check if file is empty
  if (file.size === 0) {
    throw new ValidationError('File tidak boleh kosong');
  }
}

// IPFS CID validation
export function validateIPFSCID(cid: string): void {
  if (!cid || typeof cid !== 'string') {
    throw new ValidationError('CID tidak boleh kosong');
  }

  if (!IPFS_CID_REGEX.test(cid)) {
    throw new ValidationError('Format CID/IPFS hash tidak valid');
  }
}

// Ethereum address validation
export function validateEthAddress(address: string): void {
  if (!address || typeof address !== 'string') {
    throw new ValidationError('Alamat wallet tidak boleh kosong');
  }

  if (!ETH_ADDRESS_REGEX.test(address)) {
    throw new ValidationError('Format alamat wallet tidak valid');
  }
}

// Required field validation
export function validateRequired(value: any, fieldName: string): void {
  if (value === null || value === undefined || value === '') {
    throw new ValidationError(`Field ${fieldName} wajib diisi`);
  }
}

// String length validation
export function validateStringLength(value: string, fieldName: string, min: number, max: number): void {
  if (value.length < min) {
    throw new ValidationError(`${fieldName} minimal ${min} karakter`);
  }
  if (value.length > max) {
    throw new ValidationError(`${fieldName} maksimal ${max} karakter`);
  }
}

// Number range validation
export function validateNumberRange(value: number, fieldName: string, min: number, max: number): void {
  if (value < min) {
    throw new ValidationError(`${fieldName} minimal ${min}`);
  }
  if (value > max) {
    throw new ValidationError(`${fieldName} maksimal ${max}`);
  }
}

// Description validation
export function validateDescription(description: string): void {
  validateRequired(description, 'Deskripsi');
  validateStringLength(description, 'Deskripsi', 10, 1000);
}

// Title validation
export function validateTitle(title: string): void {
  validateRequired(title, 'Judul');
  validateStringLength(title, 'Judul', 3, 100);
}

// Port validation
export function validatePort(port: number): void {
  validateNumberRange(port, 'Port', 1, 65535);
}

// Channel validation
export function validateChannel(channel: number): void {
  validateNumberRange(channel, 'Channel', 1, 64);
}

// IP Address validation
export function validateIPAddress(ip: string): void {
  const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  if (!ipRegex.test(ip)) {
    throw new ValidationError('Format IP Address tidak valid');
  }
}

// Form validation wrapper
export function validateForm<T extends Record<string, any>>(
  data: T,
  validators: Record<keyof T, (value: any) => void>
): void {
  for (const [field, validator] of Object.entries(validators)) {
    try {
      validator(data[field as keyof T]);
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new ValidationError(`Validasi field ${field} gagal`);
    }
  }
}

// Sanitize input
export function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

// Validate and sanitize
export function validateAndSanitize(input: string, fieldName: string, minLength: number = 1, maxLength: number = 1000): string {
  const sanitized = sanitizeInput(input);
  validateStringLength(sanitized, fieldName, minLength, maxLength);
  return sanitized;
} 