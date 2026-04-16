// ============================================
// MINDBRIDGE AI - Utility Functions
// ============================================

const Utils = {
    // Generate unique ID
    generateId() {
        return 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    },

    // Format timestamp
    formatTime(date = new Date()) {
        return date.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    },

    // Debounce function
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    // Auto-resize textarea
    autoResize(textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    },

    // Scroll to bottom of container
    scrollToBottom(container) {
        requestAnimationFrame(() => {
            container.scrollTop = container.scrollHeight;
        });
    },

    // Sanitize HTML
    sanitize(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    },

    // Format markdown-like text to HTML
    formatMessage(text) {
        if (!text) return '';
        let html = Utils.sanitize(text);
        // Bold
        html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        // Italic
        html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
        // Line breaks
        html = html.replace(/\n/g, '<br>');
        // Bullet points
        html = html.replace(/^[-•]\s(.+)/gm, '<li>$1</li>');
        if (html.includes('<li>')) {
            html = html.replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>');
        }
        return html;
    },

    // Store data locally
    store: {
        set(key, value) {
            try {
                localStorage.setItem('mindbridge_' + key, JSON.stringify(value));
            } catch (e) {
                console.warn('Storage failed:', e);
            }
        },
        get(key, defaultValue = null) {
            try {
                const val = localStorage.getItem('mindbridge_' + key);
                return val ? JSON.parse(val) : defaultValue;
            } catch (e) {
                return defaultValue;
            }
        },
        remove(key) {
            localStorage.removeItem('mindbridge_' + key);
        },
        clear() {
            Object.keys(localStorage)
                .filter(k => k.startsWith('mindbridge_'))
                .forEach(k => localStorage.removeItem(k));
        }
    },

    // Simple notification sound
    playSound(type = 'message') {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            if (type === 'message') {
                oscillator.frequency.value = 800;
                gainNode.gain.value = 0.1;
                oscillator.start();
                oscillator.stop(audioContext.currentTime + 0.1);
            } else if (type === 'call') {
                oscillator.frequency.value = 440;
                gainNode.gain.value = 0.15;
                oscillator.start();
                setTimeout(() => {
                    oscillator.frequency.value = 554;
                }, 200);
                oscillator.stop(audioContext.currentTime + 0.4);
            }
        } catch (e) {
            // Silent fail
        }
    },

    // Calculate distance between two coordinates (Haversine)
    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // Earth's radius in km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return (R * c).toFixed(1);
    }
};
