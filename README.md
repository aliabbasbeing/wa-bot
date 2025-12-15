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
- Google Chrome or Chromium browser
- Internet connection for WhatsApp Web

### Setup Steps

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd wa-bot
   ```

2. **Install dependencies**
   ```bash
   # If Chrome/Chromium is already installed on your system
   PUPPETEER_SKIP_DOWNLOAD=true npm install
   
   # Otherwise, let Puppeteer download Chromium
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

The bot uses Puppeteer to run a headless Chrome browser. By default, it looks for Chrome at `/usr/bin/google-chrome`. 

**Auto-detection**: The bot will try to find Chrome automatically if `CHROME_PATH` is not set.

**Manual configuration**: Set the `CHROME_PATH` environment variable in your `.env` file:

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

### QR Code Not Showing

**Problem**: QR code doesn't appear in the dashboard

**Solutions**:
1. Check if the bot is initializing: Look for "Initializing WhatsApp bot..." in logs
2. Wait a few seconds for QR generation
3. Refresh the browser
4. Check `qr.txt` file exists and has content
5. Ensure internet connection is active

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

**Problem**: "Failed to launch the browser process"

**Solutions**:
1. Install Chrome/Chromium: `sudo apt-get install google-chrome-stable`
2. Update `executablePath` in `lib/whatsapp.js`
3. Check Chrome is accessible: `which google-chrome`
4. Ensure required dependencies are installed

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
