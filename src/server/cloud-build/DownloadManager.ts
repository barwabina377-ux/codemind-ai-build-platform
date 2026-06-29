import crypto from 'crypto';

interface DownloadToken {
  buildId: string;
  expiresAt: number;
}

export class DownloadManager {
  private tokens: Map<string, DownloadToken> = new Map();
  private readonly TOKEN_EXPIRY_MS = 15 * 60 * 1000; // 15 minutes

  generateToken(buildId: string): string {
    const token = crypto.randomBytes(32).toString('hex');
    this.tokens.set(token, {
      buildId,
      expiresAt: Date.now() + this.TOKEN_EXPIRY_MS
    });
    return token;
  }

  validateToken(token: string): string | null {
    const data = this.tokens.get(token);
    if (!data) return null;

    if (Date.now() > data.expiresAt) {
      this.tokens.delete(token);
      return null;
    }

    // Token is valid for single use or multiple uses until expiry?
    // Usually download tokens are multi-use until expiry for resume support
    return data.buildId;
  }
}
