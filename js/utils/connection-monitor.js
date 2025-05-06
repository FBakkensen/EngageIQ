// js/utils/connection-monitor.js
// Utility for monitoring connection status to a local LM Studio server
// SOLID, DRY, and event-driven design as required by EngageIQ architecture

class ConnectionMonitor {
    constructor({ serverUrl, interval = 5000, retryInterval = 3000 } = {}) {
        if (!serverUrl) throw new Error('serverUrl is required');
        this.serverUrl = serverUrl;
        this.interval = interval;
        this.retryInterval = retryInterval;
        this._timer = null;
        this._connected = null; // null = unknown, true = connected, false = disconnected
        this._listeners = { connected: [], disconnected: [], reconnected: [] };
    }

    // Lightweight ping to check if server is reachable
    async checkConnection() {
        try {
            const response = await fetch(this.serverUrl, { method: 'HEAD', cache: 'no-store' });
            return response.ok;
        } catch (e) {
            return false;
        }
    }

    // Subscribe to connection events
    on(event, callback) {
        if (this._listeners[event]) {
            this._listeners[event].push(callback);
        }
    }

    // Unsubscribe from connection events
    off(event, callback) {
        if (this._listeners[event]) {
            this._listeners[event] = this._listeners[event].filter(cb => cb !== callback);
        }
    }

    // Notify listeners
    _emit(event) {
        if (this._listeners[event]) {
            this._listeners[event].forEach(cb => {
                try { cb(); } catch (e) { console.error('ConnectionMonitor listener error:', e); }
            });
        }
    }

    // Start periodic monitoring
    start() {
        if (this._timer) return;
        this._monitor();
    }

    // Stop monitoring
    stop() {
        if (this._timer) {
            clearTimeout(this._timer);
            this._timer = null;
        }
    }

    // Internal monitor loop
    async _monitor() {
        const wasConnected = this._connected;
        const isConnected = await this.checkConnection();
        if (wasConnected === null) {
            this._connected = isConnected;
            if (isConnected) this._emit('connected');
            else this._emit('disconnected');
        } else if (wasConnected !== isConnected) {
            this._connected = isConnected;
            if (isConnected) this._emit('reconnected');
            else this._emit('disconnected');
        }
        this._timer = setTimeout(() => this._monitor(), isConnected ? this.interval : this.retryInterval);
    }

    // For external status query
    isConnected() {
        return !!this._connected;
    }
}

// Export as ES module
export default ConnectionMonitor;
