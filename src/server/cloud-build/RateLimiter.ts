export class RateLimiter {
  private ipRequests: Map<string, number[]> = new Map();
  private userBuilds: Map<string, number> = new Map(); // Concurrent builds
  
  private readonly MAX_REQUESTS_PER_MINUTE = 100;
  private readonly MAX_CONCURRENT_BUILDS = 2;

  checkIpRateLimit(ip: string): boolean {
    const now = Date.now();
    const windowStart = now - 60000;
    
    let requests = this.ipRequests.get(ip) || [];
    requests = requests.filter(time => time > windowStart);
    
    if (requests.length >= this.MAX_REQUESTS_PER_MINUTE) {
      return false; // Rate limited
    }
    
    requests.push(now);
    this.ipRequests.set(ip, requests);
    return true;
  }

  canStartBuild(userId: string): boolean {
    const currentBuilds = this.userBuilds.get(userId) || 0;
    return currentBuilds < this.MAX_CONCURRENT_BUILDS;
  }

  incrementBuild(userId: string) {
    const current = this.userBuilds.get(userId) || 0;
    this.userBuilds.set(userId, current + 1);
  }

  decrementBuild(userId: string) {
    const current = this.userBuilds.get(userId) || 0;
    this.userBuilds.set(userId, Math.max(0, current - 1));
  }
}
