import { describe, it, expect } from 'vitest';
import {
  validateFile,
  validateIPFSCID,
  validateEthAddress,
  validateRequired,
  validateStringLength,
  validateNumberRange,
  validateDescription,
  validateTitle,
  validatePort,
  validateChannel,
  validateIPAddress,
  sanitizeInput,
  validateAndSanitize,
  ValidationError,
  FILE_CONSTRAINTS,
  IPFS_CID_REGEX,
  ETH_ADDRESS_REGEX
} from '../validation';

describe('Validation Utilities', () => {
  describe('File Validation', () => {
    it('should validate valid video file', () => {
      const file = new File(['test'], 'test.mp4', { type: 'video/mp4' });
      expect(() => validateFile(file)).not.toThrow();
    });

    it('should reject file that is too large', () => {
      const largeFile = new File(['x'.repeat(FILE_CONSTRAINTS.MAX_SIZE + 1)], 'large.mp4', { type: 'video/mp4' });
      expect(() => validateFile(largeFile)).toThrow(ValidationError);
      expect(() => validateFile(largeFile)).toThrow('File terlalu besar');
    });

    it('should reject unsupported file type', () => {
      const invalidFile = new File(['test'], 'test.txt', { type: 'text/plain' });
      expect(() => validateFile(invalidFile)).toThrow(ValidationError);
      expect(() => validateFile(invalidFile)).toThrow('Tipe file tidak didukung');
    });

    it('should reject empty file', () => {
      const emptyFile = new File([''], 'empty.mp4', { type: 'video/mp4' });
      expect(() => validateFile(emptyFile)).toThrow(ValidationError);
      expect(() => validateFile(emptyFile)).toThrow('File tidak boleh kosong');
    });
  });

  // Tambahkan test lain sesuai kebutuhan
}); 