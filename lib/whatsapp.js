const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const fs = require('fs');
const path = require('path');
const logger = require('./logger');

class WhatsAppClient {
  constructor(config = {}) {
    this.config = Object.assign({
      authDir: './auth',
      qrFile: './qr.txt',
      keepaliveInterval: 60_000,
      reinitDelay: 3000,
      maxReconnectAttempts: 10,
      autoReinitAfterLogout: false
    }, config);

    this.client = null;
    this.isInitializing = false;
    this.reconnectAttempts = 0;
    this.reconnectTimer = null;
    this.keepaliveInterval = null;
    this.qrData = null;
    this.isReady = false;
    this.isAuthenticated = false;

    this.stats = {
      totalPings: 0,
      failedPings: 0,
      successfulSends: 0,
      failedSends: 0,
      startTime: Date.now()
    };
  }

  /**
   * Initialize the WhatsApp bot (idempotent)
   */
  async initialize() {
    // Guard: if already initializing or client already exists and ready, skip
    if (this.isInitializing || (this.client && this.isReady)) {
      logger.debugLog('Initialize skipped - already initializing or connected');
      return;
    }

    this.isInitializing = true;
    logger.log('🔄 Initializing WhatsApp bot...');

    try {
      // Hard cleanup if previous client exists
      if (this.client) {
        await this._hardCleanupClient();
      }

      // Create new WhatsApp client with LocalAuth for session persistence
      this.client = new Client({
        authStrategy: new LocalAuth({
          clientId: this.config.sessionId || 'session1',
          dataPath: this.config.authDir
        }),
        puppeteer: {
          headless: true,
          executablePath: '/usr/bin/google-chrome',
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu'
          ]
        },
        qrMaxRetries: 5,
        restartOnAuthFail: true,
        takeoverOnConflict: true,
        takeoverTimeoutMs: 0
      });

      // Setup event handlers
      this.setupEventHandlers();

      // Initialize the client
      await this.client.initialize();

      logger.log('✅ WhatsApp client initialized');
    } catch (err) {
      logger.error('❌ Failed to initialize bot:', err?.message || err);
      // Schedule reconnect with backoff
      this.isInitializing = false;
      this.scheduleReconnect();
      return;
    }

    // Success - clear flags
    this.isInitializing = false;
  }

  /**
   * Attach event handlers for current client
   */
  setupEventHandlers() {
    if (!this.client) return;

    // Remove all existing listeners first
    this.client.removeAllListeners();

    // QR code received
    this.client.on('qr', async (qr) => {
      logger.log('📱 QR Code received, generating...');
      try {
        this.qrData = await qrcode.toDataURL(qr);
        fs.writeFileSync(this.config.qrFile, this.qrData);
        logger.log('✅ QR code saved');
      } catch (err) {
        logger.error('❌ Failed to generate QR code:', err?.message || err);
      }
    });

    // Authenticated successfully
    this.client.on('authenticated', () => {
      logger.log('✅ Authentication successful');
      this.isAuthenticated = true;
      this.qrData = null;
      try { 
        fs.writeFileSync(this.config.qrFile, ''); 
      } catch (e) {
        logger.debugLog('Failed to clear QR file:', e?.message);
      }
    });

    // Authentication failure
    this.client.on('auth_failure', (msg) => {
      logger.error('❌ Authentication failed:', msg);
      this.isAuthenticated = false;
      this.scheduleReconnect();
    });

    // Client is ready
    this.client.on('ready', async () => {
      logger.log('✅ WhatsApp connected successfully');
      this.isReady = true;
      this.reconnectAttempts = 0;
      
      // Clear QR data
      this.qrData = null;
      try { 
        fs.writeFileSync(this.config.qrFile, ''); 
      } catch (e) {
        logger.debugLog('Failed to clear QR file:', e?.message);
      }

      // Clear reconnect timer if exists
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }

      // Start keepalive
      this.startKeepalive();

      // Log connection info
      const info = this.client.info;
      if (info) {
        logger.log(`📞 Connected as: ${info.pushname} (${info.wid.user})`);
      }
    });

    // Message received - auto responder could be added here
    this.client.on('message', async (msg) => {
      try {
        // Log incoming messages if debug enabled
        logger.debugLog(`📨 Message received from ${msg.from}: ${msg.body}`);
        
        // Auto-responder logic can be added here if needed
        // Example: if (msg.body === 'ping') { await msg.reply('pong'); }
      } catch (err) {
        logger.error('Error handling incoming message:', err?.message || err);
      }
    });

    // Call received - auto reject
    this.client.on('call', async (call) => {
      logger.log(`📞 Incoming call from ${call.from}, rejecting...`);
      try {
        await call.reject();
        logger.log('❌ Call rejected');
      } catch (err) {
        logger.error('⚠️ Failed to reject call:', err?.message || err);
      }
    });

    // Disconnected
    this.client.on('disconnected', async (reason) => {
      logger.log(`❌ Client disconnected. Reason: ${reason}`);
      this.isReady = false;
      this.isAuthenticated = false;

      // Stop keepalive
      this.stopKeepalive();

      // Hard cleanup
      await this._hardCleanupClient();

      // If logged out, clear session
      if (reason === 'LOGOUT' || reason === 'NAVIGATION') {
        logger.log('🧹 Logged out - clearing session...');
        await this.clearSession();
      }

      // Schedule reconnect
      if (reason !== 'LOGOUT') {
        this.scheduleReconnect();
      } else if (this.config.autoReinitAfterLogout) {
        this.reconnectAttempts = 0;
        this.scheduleReconnect(true);
      }
    });

    // Remote session saved
    this.client.on('remote_session_saved', () => {
      logger.debugLog('Remote session saved');
    });

    // Loading screen
    this.client.on('loading_screen', (percent, message) => {
      logger.debugLog(`Loading: ${percent}% - ${message}`);
    });

    // Change state
    this.client.on('change_state', (state) => {
      logger.debugLog(`State changed: ${state}`);
    });
  }

  /**
   * Hard cleanup of client resources
   */
  async _hardCleanupClient() {
    if (!this.client) return;

    try {
      // Remove all listeners
      this.client.removeAllListeners();
      
      // Try to destroy the client
      try {
        await this.client.destroy();
      } catch (e) {
        logger.debugLog('Error destroying client:', e?.message);
      }
    } catch (err) {
      logger.debugLog('Client hard cleanup error:', err?.message || err);
    } finally {
      this.client = null;
      this.isReady = false;
      this.isAuthenticated = false;
      this.isInitializing = false;
    }
  }

  /**
   * Schedule reconnect with exponential backoff
   */
  scheduleReconnect(immediate = false) {
    // If already at max attempts, stop automatic reconnect
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      logger.error(`⛔ Max reconnect attempts (${this.config.maxReconnectAttempts}) reached.`);
      logger.log('💡 Use external /ping endpoint to trigger manual reconnection.');
      return;
    }

    // Clear existing timer
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.reconnectAttempts++;

    let delay;
    if (immediate) {
      delay = this.config.reinitDelay;
    } else {
      // Exponential backoff with cap
      delay = Math.min(this.config.reinitDelay * Math.pow(2, this.reconnectAttempts - 1), 60_000);
    }

    logger.log(`⏳ Scheduling reconnect attempt ${this.reconnectAttempts}/${this.config.maxReconnectAttempts} in ${delay}ms`);

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      // Guard again to prevent overlapping
      if (this.isInitializing || (this.client && this.isReady)) {
        logger.debugLog('Reconnect skipped - already initializing or connected');
        return;
      }
      this.initialize();
    }, delay);
  }

  /**
   * Start internal keepalive (single interval)
   */
  startKeepalive() {
    // Ensure single interval
    if (this.keepaliveInterval) return;

    this.keepaliveInterval = setInterval(async () => {
      if (this.client && this.isReady) {
        try {
          // Send presence update to keep connection alive
          const state = await this.client.getState();
          logger.debugLog(`💓 Internal keepalive - State: ${state}`);
        } catch (err) {
          logger.debugLog('⚠️ Internal keepalive failed:', err?.message || err);
        }
      }
    }, this.config.keepaliveInterval);

    logger.log(`💚 Internal keepalive started (interval: ${this.config.keepaliveInterval}ms)`);
  }

  /**
   * Stop internal keepalive
   */
  stopKeepalive() {
    if (this.keepaliveInterval) {
      clearInterval(this.keepaliveInterval);
      this.keepaliveInterval = null;
      logger.debugLog('🛑 Internal keepalive stopped');
    }
  }

  /**
   * External keepalive (called by /ping)
   */
  async externalKeepalive() {
    if (!this.client || !this.isReady) {
      this.stats.failedPings++;
      throw new Error('WhatsApp not connected');
    }

    try {
      // Get current state to verify connection
      const state = await this.client.getState();
      const info = this.client.info;
      
      this.stats.totalPings++;
      logger.log(`💚 External ping processed (Total: ${this.stats.totalPings}, State: ${state})`);

      // Reset reconnect attempts after a successful ping
      if (this.reconnectAttempts > 0) this.reconnectAttempts = 0;

      return {
        status: 'alive',
        message: 'Session kept alive',
        connected: true,
        phoneNumber: info?.wid?.user || null,
        state: state,
        timestamp: new Date().toISOString(),
        totalPings: this.stats.totalPings,
        failedPings: this.stats.failedPings
      };
    } catch (err) {
      this.stats.failedPings++;
      logger.error('❌ External ping error:', err?.message || err);
      throw err;
    }
  }

  /**
   * Send a text message (with retry wrapper)
   */
  async sendMessage(phoneNumber, message) {
    if (!this.client || !this.isReady) {
      throw new Error('WhatsApp is not connected');
    }

    const chatId = this.normalizePhoneNumber(phoneNumber);

    const result = await this.retryWithBackoff(async () => {
      return await this.client.sendMessage(chatId, message);
    });

    if (result.success) {
      this.stats.successfulSends++;
      logger.send && logger.send('Message sent successfully', { 
        to: chatId, 
        attempts: result.attempts 
      });
    } else {
      this.stats.failedSends++;
      logger.send && logger.send('Message failed', { 
        to: chatId, 
        attempts: result.attempts, 
        error: result.error?.message 
      });
    }

    return result;
  }

  /**
   * Send media (with retry wrapper)
   */
  async sendMedia(phoneNumber, buffer, mimetype, caption, fileName) {
    if (!this.client || !this.isReady) {
      throw new Error('WhatsApp is not connected');
    }

    const chatId = this.normalizePhoneNumber(phoneNumber);

    const result = await this.retryWithBackoff(async () => {
      // Create MessageMedia from buffer
      const media = new MessageMedia(
        mimetype,
        buffer.toString('base64'),
        fileName || 'file'
      );

      // Send media with optional caption
      return await this.client.sendMessage(chatId, media, {
        caption: caption || undefined
      });
    });

    if (result.success) {
      this.stats.successfulSends++;
      logger.send && logger.send('Media sent successfully', { 
        to: chatId, 
        type: mimetype, 
        attempts: result.attempts 
      });
    } else {
      this.stats.failedSends++;
      logger.send && logger.send('Media failed', { 
        to: chatId, 
        type: mimetype, 
        attempts: result.attempts, 
        error: result.error?.message 
      });
    }

    return result;
  }

  /**
   * Retry helper (exponential backoff + jitter)
   */
  async retryWithBackoff(fn, maxRetries = 3, maxDuration = 15_000) {
    let lastError;
    let totalWaitTime = 0;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        logger.debugLog && logger.debugLog(`📤 Attempt ${attempt}/${maxRetries}...`);
        const result = await fn();
        logger.debugLog && logger.debugLog(`✅ Success on attempt ${attempt}`);
        return { success: true, result, attempts: attempt };
      } catch (err) {
        lastError = err;
        logger.debugLog && logger.debugLog(`❌ Attempt ${attempt} failed: ${err?.message || err}`);

        if (!this.isRetryableError(err) || attempt === maxRetries) break;

        const baseDelay = 1000 * Math.pow(2, attempt - 1);
        const jitter = Math.random() * 500;
        const waitTime = Math.min(baseDelay + jitter, 5000);

        if (totalWaitTime + waitTime > maxDuration) {
          logger.debugLog && logger.debugLog(`⏱️ Max retry duration (${maxDuration}ms) reached`);
          break;
        }

        totalWaitTime += waitTime;
        await new Promise(r => setTimeout(r, waitTime));
      }
    }

    return { success: false, error: lastError, attempts: maxRetries };
  }

  /**
   * Check if error is retryable
   */
  isRetryableError(err) {
    const errorMsg = (err?.message || '').toLowerCase();
    const nonRetryable = [
      'unauthorized', 
      'invalid', 
      'malformed', 
      'forbidden', 
      'not found', 
      'logged out',
      'no active session',
      'evaluation failed'
    ];
    return !nonRetryable.some(k => errorMsg.includes(k));
  }

  /**
   * Normalize phone number to WhatsApp format
   */
  normalizePhoneNumber(phoneNumber) {
    // Remove all non-digit characters
    const cleaned = phoneNumber.toString().replace(/\D/g, '');
    
    if (cleaned.length < 9 || cleaned.length > 15) {
      throw new Error('Invalid phone number length');
    }

    // WhatsApp Web.js uses @c.us for individual chats
    if (phoneNumber.includes('@c.us')) {
      return phoneNumber;
    }
    
    if (phoneNumber.includes('@s.whatsapp.net')) {
      // Convert from Baileys format to whatsapp-web.js format
      return phoneNumber.replace('@s.whatsapp.net', '@c.us');
    }

    return `${cleaned}@c.us`;
  }

  /**
   * Get connection status
   */
  getStatus() {
    let phoneNumber = null;
    
    if (this.client && this.isReady && this.client.info) {
      phoneNumber = this.client.info.wid?.user || this.client.info.wid?._serialized || null;
    }

    return {
      connected: this.isReady && !!this.client,
      phoneNumber: phoneNumber,
      isAuthenticated: this.isAuthenticated,
      reconnectAttempts: this.reconnectAttempts,
      qrAvailable: !!this.qrData
    };
  }

  /**
   * Get statistics
   */
  getStats() {
    const uptime = Date.now() - this.stats.startTime;
    return {
      connected: this.isReady && !!this.client,
      totalPings: this.stats.totalPings,
      failedPings: this.stats.failedPings,
      successfulPings: this.stats.totalPings - this.stats.failedPings,
      successfulSends: this.stats.successfulSends,
      failedSends: this.stats.failedSends,
      uptime: Math.floor(uptime / 1000),
      uptimeHuman: this.formatUptime(uptime)
    };
  }

  /**
   * Format uptime in human-readable format
   */
  formatUptime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }

  /**
   * Get QR code data
   */
  getQR() {
    if (this.qrData) return this.qrData;
    try {
      if (fs.existsSync(this.config.qrFile)) {
        const d = fs.readFileSync(this.config.qrFile, 'utf-8');
        return d || null;
      }
    } catch (err) {
      logger.error('Failed to read QR file:', err?.message || err);
    }
    return null;
  }

  /**
   * Logout and clear session
   */
  async logout() {
    logger.log('🚪 Logging out...');

    // Stop keepalive
    this.stopKeepalive();

    // Attempt graceful logout
    if (this.client && this.isReady) {
      try {
        await this.client.logout();
        logger.log('✅ Graceful logout successful');
      } catch (err) {
        logger.error('⚠️ Graceful logout failed:', err?.message || err);
      }
    }

    // Hard cleanup
    await this._hardCleanupClient();

    // Clear session files
    await this.clearSession();

    // Optionally reinitialize after logout
    if (this.config.autoReinitAfterLogout) {
      this.reconnectAttempts = 0;
      this.scheduleReconnect(true);
    }
  }

  /**
   * Clear session data
   */
  async clearSession() {
    try {
      if (fs.existsSync(this.config.authDir)) {
        fs.rmSync(this.config.authDir, { recursive: true, force: true });
        logger.log('🧹 Auth directory cleared');
      }
      try { 
        fs.writeFileSync(this.config.qrFile, ''); 
      } catch (e) {
        logger.debugLog('Failed to clear QR file:', e?.message);
      }
      this.qrData = null;
    } catch (err) {
      logger.error('⚠️ Failed to clear session:', err?.message || err);
    }
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    logger.log('🛑 Shutting down gracefully...');

    // Stop keepalive
    this.stopKeepalive();

    // Clear reconnect timer
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    // Hard cleanup client
    await this._hardCleanupClient();

    logger.log('👋 Shutdown complete');
  }
}

module.exports = WhatsAppClient;
