# Environment Variables

To run the Remote Cloud Build Platform, configure the following variables in your `.env` file:

```env
# Node Environment
NODE_ENV=production

# Server Port (Default is 3000)
PORT=3000

# Gemini API Key (Required for AI features, Audits, and Error analysis)
GEMINI_API_KEY=your_gemini_api_key_here

# (Optional) Max Concurrent Builds per User
MAX_CONCURRENT_BUILDS=2

# (Optional) Storage paths overrides
# WORKSPACE_DIR=/var/cloud-build/workspace
# ARTIFACTS_DIR=/var/cloud-build/artifacts
```
