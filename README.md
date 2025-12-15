# WhatsApp Bot with whatsapp-web.js

A robust WhatsApp bot built with **whatsapp-web.js** that provides a REST API for sending messages, media, and managing sessions. Features comprehensive error handling, automatic reconnection, and a web dashboard for monitoring.

## Features

### ✨ Core Functionality
- 📱 **QR Code Authentication** - Easy setup with QR code scanning
- 💾 **Persistent Sessions** - LocalAuth strategy for session persistence
- 📨 **Message Sending** - Send text messages via REST API
- 🖼️ **Media Support** - Send images, videos, audio, and documents
- 🔄 **Auto Reconnection** - Automatic reconnection with exponential backoff
- 📊 **Statistics Tracking** - Monitor sends, pings, and uptime
- 🌐 **Web Dashboard** - Beautiful UI for status monitoring and testing

### 🛡️ Reliability & Error Handling
- **Robust Error Handling** - Comprehensive error catching and logging
- **Retry Logic** - Automatic retry with exponential backoff for recoverable errors
- **Connection Management** - Handles disconnections and reconnects automatically
- **Graceful Shutdown** - Clean shutdown on SIGINT/SIGTERM signals
- **Rate Limiting** - Built-in rate limiting to prevent abuse
- **API Key Authentication** - Secure endpoints with API key validation

### 📡 API Endpoints
- `GET /health` - Server health check
- `GET /status` - WhatsApp connection status
- `GET /qr` - Get QR code for authentication
- `GET /ping` - Send keepalive ping
- `GET /ping-stats` - Get statistics
- `POST /send-message` - Send text message
- `POST /send-media` - Send media (image, video, audio, document)
- `POST /logout` - Logout and clear session

## Migration from Baileys

This bot has been converted from Baileys to whatsapp-web.js. Key differences:

### whatsapp-web.js Benefits
- ✅ More stable and actively maintained
- ✅ Better session management with LocalAuth
- ✅ More reliable media handling
- ✅ Better error messages and debugging
- ✅ Active community and support
- ✅ Compatible with latest WhatsApp Web updates

### What Changed
- **Library**: Baileys → whatsapp-web.js
- **Session Strategy**: Multi-file auth state → LocalAuth
- **Phone Format**: `@s.whatsapp.net` → `@c.us`
- **Client API**: Completely rewritten to use whatsapp-web.js events and methods

### What Stayed the Same
- ✅ All API endpoints remain identical
- ✅ Same configuration options
- ✅ Same error handling approach
- ✅ Same web dashboard UI
- ✅ Same folder structure

## Installation

### Prerequisites
- Node.js >= 18
- Google Chrome or Chromium browser (or Puppeteer will download one)
- Internet connection for WhatsApp Web

### Quick Start (Digital Ocean VPS / Ubuntu / Debian)

**For Digital Ocean droplets and Ubuntu/Debian VPS**, Chrome is not installed by default. Follow these steps:

1. **Install Chrome (Recommended)**
   ```bash
   # Add Google Chrome repository
   wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | sudo apt-key add -
   sudo sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google-chrome.list'
   
   # Update and install Chrome
   sudo apt-get update
   sudo apt-get install -y google-chrome-stable
   ```

2. **OR Install Puppeteer dependencies** (if using bundled Chromium)
   ```bash
   sudo apt-get install -y \
     ca-certificates fonts-liberation libappindicator3-1 libasound2 \
     libatk-bridge2.0-0 libatk1.0-0 libc6 libcairo2 libcups2 \
     libdbus-1-3 libexpat1 libfontconfig1 libgbm1 libgcc1 \
     libglib2.0-0 libgtk-3-0 libnspr4 libnss3 libpango-1.0-0 \
     libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 libxcb1 \
     libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 \
     libxi6 libxrandr2 libxrender1 libxss1 libxtst6 lsb-release wget xdg-utils
   ```

3. **Clone and setup the bot**
   ```bash
   git clone <repository-url>
   cd wa-bot
   
   # Install Node.js dependencies
   npm install
   
   # Configure environment
   cp config/example.env .env
   nano .env  # Edit your settings
   
   # Start the bot
   npm start
   ```

4. **Access the dashboard**
   - Open `http://YOUR_VPS_IP:3000` in your browser
   - Scan the QR code with WhatsApp mobile app
   - Wait for "Connected" status

### Setup Steps (General)

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd wa-bot
   ```

2. **Install dependencies**
   ```bash
   # If Chrome/Chromium is already installed on your system
   PUPPETEER_SKIP_DOWNLOAD=true npm install
   
   # Otherwise, let Puppeteer download Chromium (requires dependencies above)
   npm install
   ```

3. **Configure environment**
   ```bash
   # Copy example environment file
   cp config/example.env .env
   
   # Edit .env with your settings
   nano .env
   ```

4. **Start the bot**
   ```bash
   # Production
   npm start
   
   # Development (with auto-reload)
   npm run dev
   ```

5. **Scan QR Code**
   - Open your browser: http://localhost:3000
   - Scan the QR code with WhatsApp mobile app
   - Go to WhatsApp → Settings → Linked Devices → Link a Device

## Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
# Server Configuration
PORT=3000

# Session Configuration
SESSION_ID=session1                    # Unique session identifier
API_KEY=your-secure-api-key-here      # API key for authentication

# Authentication Directory
AUTH_DIR=./auth_session1              # Where session data is stored
QR_FILE=./qr.txt                      # QR code storage location

# Keepalive & Reconnect Configuration
KEEPALIVE_INTERVAL=60000              # Keepalive interval (60 seconds)
REINIT_DELAY=3000                     # Initial reconnect delay (3 seconds)
MAX_RECONNECT_ATTEMPTS=10             # Max automatic reconnect attempts

# Logging
DEBUG=false                            # Enable debug logging

# Version
APP_VERSION=2.0.0
```

### Chrome/Chromium Configuration

The bot uses Puppeteer to run a headless Chrome browser with **automatic Chrome detection**.

**Auto-detection** (default): The bot automatically searches for Chrome/Chromium in common locations:
- `/usr/bin/google-chrome-stable`
- `/usr/bin/google-chrome`
- `/usr/bin/chromium-browser`
- `/usr/bin/chromium`
- `/snap/bin/chromium`
- macOS: `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`
- Windows: `C:\Program Files\Google\Chrome\Application\chrome.exe`

**Fallback**: If no Chrome installation is found, Puppeteer will use its bundled Chromium (downloaded automatically on first run).

**Manual configuration** (optional): Override auto-detection by setting `CHROME_PATH` in your `.env` file:

```env
CHROME_PATH=/usr/bin/google-chrome
# or
CHROME_PATH=/usr/bin/chromium-browser
```

**Finding Chrome on your system**:
```bash
which google-chrome
which chromium-browser
which chromium
```

## API Usage

### Authentication

All POST endpoints require an API key:

```bash
# In request body
{
  "apiKey": "your-api-key-here",
  ...
}

# Or as query parameter
?apiKey=your-api-key-here
```

### Send Text Message

```bash
curl -X POST http://localhost:3000/send-message \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "923001234567",
    "message": "Hello from WhatsApp Bot!",
    "apiKey": "your-api-key-here"
  }'
```

**Response:**
```json
{
  "status": true,
  "message": "Message sent successfully",
  "attempts": 1,
  "timestamp": "2025-12-15T16:00:00.000Z"
}
```

### Send Media

```bash
curl -X POST http://localhost:3000/send-media \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "923001234567",
    "mediaUrl": "https://example.com/image.jpg",
    "caption": "Check out this image!",
    "apiKey": "your-api-key-here"
  }'
```

**Supported Media Types:**
- Images (JPEG, PNG, GIF, WebP)
- Videos (MP4, AVI, MOV)
- Audio (MP3, OGG, WAV)
- Documents (PDF, DOC, XLS, etc.)

**File Size Limits:**
- Maximum recommended: 50MB
- Larger files may cause memory issues
- The bot will log a warning for files >50MB

### Check Status

```bash
curl http://localhost:3000/status
```

**Response:**
```json
{
  "connected": true,
  "phoneNumber": "923001234567"
}
```

### Get Statistics

```bash
curl http://localhost:3000/ping-stats
```

**Response:**
```json
{
  "connected": true,
  "totalPings": 150,
  "failedPings": 2,
  "successfulPings": 148,
  "successfulSends": 342,
  "failedSends": 5,
  "uptime": 86400,
  "uptimeHuman": "1d 0h"
}
```

## Error Handling

### Built-in Error Recovery

The bot handles various error scenarios:

1. **Connection Errors**
   - Automatic reconnection with exponential backoff
   - Maximum retry attempts configurable
   - Manual reconnection via `/ping` endpoint

2. **Message Send Failures**
   - Retry with exponential backoff (up to 3 attempts)
   - Distinguishes between retryable and non-retryable errors
   - Detailed error logging

3. **Media Download/Upload Errors**
   - Timeout protection (30 seconds)
   - Buffer size validation
   - Proper error messages

4. **Session Errors**
   - Auto-logout on authentication failure
   - Session cleanup on logout
   - Fresh QR code generation

### Error Response Format

```json
{
  "status": false,
  "message": "Error description",
  "error": "Detailed error message",
  "attempts": 3
}
```

## Logging

Logs are stored in the `logs/` directory with automatic rotation:

- `app.log` - General application logs
- `send.log` - Message send operations
- `errors.log` - Error logs

Logs rotate daily and keep only the last 24 hours (compressed with gzip).

### Enable Debug Logging

Set `DEBUG=true` in `.env` for verbose logging.

## Testing

### Manual Testing Checklist

- [ ] QR code generation and scanning
- [ ] Message sending to individual number
- [ ] Media sending (image, video, document)
- [ ] Connection drop and auto-reconnection
- [ ] Manual reconnection via `/ping` endpoint
- [ ] Logout and re-login
- [ ] API key validation
- [ ] Rate limiting
- [ ] Graceful shutdown (Ctrl+C)

### Automated Testing

The bot has been tested with:
- ✅ Syntax validation
- ✅ Server startup
- ✅ API endpoint responses
- ✅ Error handling
- ✅ Graceful shutdown

## Troubleshooting

### QR Code Not Showing (Digital Ocean VPS / Ubuntu)

**Problem**: `/qr` endpoint shows "QR not available" or QR doesn't appear in dashboard

**Root Cause**: Chrome/Chromium is not installed or browser failed to launch

**Solutions**:

1. **Check server logs** for initialization errors:
   ```bash
   # Look for errors in logs
   tail -f logs/app.log
   # or
   pm2 logs wa-bot
   ```

2. **Install Chrome on Digital Ocean VPS** (Ubuntu/Debian):
   ```bash
   wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | sudo apt-key add -
   sudo sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google-chrome.list'
   sudo apt-get update
   sudo apt-get install -y google-chrome-stable
   
   # Restart the bot
   pm2 restart wa-bot
   # or
   npm start
   ```

3. **OR Install Puppeteer dependencies** (if using bundled Chromium):
   ```bash
   sudo apt-get install -y ca-certificates fonts-liberation \
     libappindicator3-1 libasound2 libatk-bridge2.0-0 libatk1.0-0 \
     libc6 libcairo2 libcups2 libdbus-1-3 libexpat1 libfontconfig1 \
     libgbm1 libgcc1 libglib2.0-0 libgtk-3-0 libnspr4 libnss3 \
     libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libx11-6 \
     libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 libxdamage1 \
     libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 \
     libxtst6 lsb-release wget xdg-utils
   ```

4. **Verify Chrome is detected**:
   ```bash
   which google-chrome
   # or
   which chromium-browser
   ```

5. **After installing Chrome**, restart the bot and check logs:
   - You should see: `✅ Auto-detected Chrome: /usr/bin/google-chrome-stable`
   - Then: `📱 QR Code received, generating...`
   - Finally: `✅ QR code saved`

6. **Access the QR code**:
   - Dashboard: `http://YOUR_VPS_IP:3000`
   - Direct: `http://YOUR_VPS_IP:3000/qr`

### QR Code Not Showing (General)

**Problem**: QR code doesn't appear in the dashboard

**Solutions**:
1. Check if the bot is initializing: Look for "Initializing WhatsApp bot..." in logs
2. Wait 10-15 seconds for QR generation after bot starts
3. Refresh the browser
4. Check `qr.txt` file exists and has content
5. Ensure internet connection is active
6. Check browser console for errors (F12)

### Connection Keeps Dropping

**Problem**: Bot disconnects frequently

**Solutions**:
1. Check internet connection stability
2. Increase `KEEPALIVE_INTERVAL` in `.env`
3. Check if phone is connected to internet
4. Verify WhatsApp account is not logged in elsewhere
5. Check for WhatsApp Web updates

### Messages Not Sending

**Problem**: Send message returns error

**Solutions**:
1. Verify bot is connected: `curl http://localhost:3000/status`
2. Check phone number format (include country code, no spaces)
3. Verify API key is correct
4. Check error message for details
5. Ensure recipient number is valid on WhatsApp

### Chrome/Puppeteer Issues

**Problem**: "Failed to launch the browser process" or "spawn ENOENT"

**Solutions**:
1. **Digital Ocean VPS**: Install Chrome (see "QR Code Not Showing" above)
2. **Check Chrome path**: `which google-chrome`
3. **Set custom path** in `.env`: `CHROME_PATH=/usr/bin/google-chrome-stable`
4. **Ensure dependencies installed** (see installation section)

### High Memory Usage

**Problem**: Bot consumes too much memory

**Solutions**:
1. Reduce `MAX_RECONNECT_ATTEMPTS` in `.env`
2. Increase `KEEPALIVE_INTERVAL` to reduce activity
3. Restart bot periodically
4. Monitor Chrome process for memory leaks

## Production Deployment

### Recommendations

1. **Process Manager**: Use PM2 or systemd
   ```bash
   npm install -g pm2
   pm2 start index.js --name wa-bot
   pm2 save
   pm2 startup
   ```

2. **Reverse Proxy**: Use Nginx for SSL/TLS
   ```nginx
   server {
       listen 443 ssl;
       server_name your-domain.com;
       
       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

3. **Security**:
   - Change default API key
   - Use strong API keys
   - Enable HTTPS
   - Restrict API access by IP
   - Keep dependencies updated

4. **Monitoring**:
   - Set up health checks
   - Monitor logs
   - Track statistics
   - Set up alerts for failures

5. **Backup**:
   - Backup `auth_*` directory for session persistence
   - Keep environment variables secure
   - Document configuration

## Architecture

### Key Components

```
wa-bot/
├── index.js              # Main server file
├── lib/
│   ├── whatsapp.js       # WhatsApp client wrapper
│   └── logger.js         # Logging utility
├── public/
│   ├── index.html        # Web dashboard
│   └── app.js            # Dashboard JavaScript
├── config/
│   └── example.env       # Example configuration
├── logs/                 # Rotating log files
└── auth_*/               # Session data (auto-generated)
```

### Technology Stack

- **Backend**: Node.js, Express.js
- **WhatsApp**: whatsapp-web.js
- **Browser Automation**: Puppeteer
- **Security**: Helmet, express-rate-limit
- **Logging**: rotating-file-stream
- **Frontend**: Vanilla JavaScript, Bootstrap 5

## Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues, questions, or contributions:
- Open an issue on GitHub
- Check existing issues for solutions
- Review documentation thoroughly

## Changelog

### Version 2.0.1 (Current)
- ✅ Migrated from Baileys to whatsapp-web.js
- ✅ Enhanced error handling and retry logic
- ✅ Improved session management with LocalAuth
- ✅ Updated documentation
- ✅ All features tested and working

### Version 2.0.0
- Initial release with Baileys

## Acknowledgments

- [whatsapp-web.js](https://github.com/pedroslopez/whatsapp-web.js) - WhatsApp Web API client
- [Express.js](https://expressjs.com/) - Web framework
- [Puppeteer](https://pptr.dev/) - Browser automation
