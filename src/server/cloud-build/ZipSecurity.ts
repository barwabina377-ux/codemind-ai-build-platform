import fs from 'fs';
import path from 'path';
import JSZip from 'jszip';

export class ZipSecurity {
  /**
   * Validates a ZIP file to prevent Zip Slip attacks and other security issues.
   */
  static async validateZip(zipPath: string): Promise<{ valid: boolean; error?: string }> {
    try {
      const data = fs.readFileSync(zipPath);
      const zip = await JSZip.loadAsync(data);
      
      let containsDangerousFiles = false;
      let hasZipSlip = false;

      zip.forEach((relativePath, file) => {
        // Zip Slip check
        if (relativePath.includes('../') || relativePath.includes('..\\') || relativePath.startsWith('/')) {
          hasZipSlip = true;
        }

        // Dangerous file extensions check (can be expanded)
        if (relativePath.endsWith('.exe') || relativePath.endsWith('.sh') && !relativePath.includes('gradlew')) {
          containsDangerousFiles = true;
        }
      });

      if (hasZipSlip) {
        return { valid: false, error: 'Security Exception: Zip Slip vulnerability detected.' };
      }

      if (containsDangerousFiles) {
        return { valid: false, error: 'Security Exception: Dangerous file types detected in archive.' };
      }

      return { valid: true };
    } catch (error: any) {
      return { valid: false, error: `Invalid ZIP file: ${error.message}` };
    }
  }
}
