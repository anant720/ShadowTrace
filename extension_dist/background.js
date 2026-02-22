const CONFIG = {
    API_ENDPOINT: 'https://showtrace.onrender.com/analyze',
    API_KEY: 'st_api_kG9vX2mN8pL4wR5tZ1yQ7jS4nB0hF3d_',
    API_TIMEOUT_MS: 5000,
    API_RETRY_LIMIT: 2,
    MSG_TYPE: {
        SIGNAL_REPORT: 'ST_SIGNAL_REPORT',
        BEHAVIOR_ALERT: 'ST_BEHAVIOR_ALERT',
        RISK_RESULT: 'ST_RISK_RESULT',
        GET_RISK: 'ST_GET_RISK',
    },
    RISK_LEVELS: { Safe: 'low', Suspicious: 'medium', Dangerous: 'high' }
};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!message || !message.type) return;
    const tabId = sender?.tab?.id;
    if (message.type === CONFIG.MSG_TYPE.SIGNAL_REPORT) {
        if (!tabId) return;
        handleSignalReport(tabId, message.payload);
        sendResponse({ received: true });
    } else if (message.type === CONFIG.MSG_TYPE.GET_RISK) {
        chrome.storage.session.get(`tab_${message.tabId}`).then(data => {
            sendResponse(data[`tab_${message.tabId}`] || null);
        });
    }
    return true;
});

async function handleSignalReport(tabId, payload) {
    // Clear old data for this tab immediately to avoid showing stale results
    await chrome.storage.session.remove(`tab_${tabId}`);

    let risk;
    try {
        risk = await sendToBackend(payload);
    } catch (err) {
        console.error('Scan failed:', err);
        risk = { risk_score: 0, risk_level: 'low', reasons: ['Analysis engine unreachable'], source: 'local' };
    }
    await chrome.storage.session.set({ [`tab_${tabId}`]: { ...risk, ...payload } });
    updateBadge(tabId, risk.risk_level);
}

async function getAuthToken(interactive = false) {
    return new Promise((resolve) => {
        if (!chrome.identity) {
            console.warn('[ShadowTrace] Identity API not available');
            return resolve(null);
        }
        chrome.identity.getAuthToken({ interactive }, (token) => {
            if (chrome.runtime.lastError) {
                // Silent failure for non-interactive (expected if not logged in)
                if (interactive) console.warn('[ShadowTrace] Auth Error:', chrome.runtime.lastError.message);
                resolve(null);
            } else resolve(token);
        });
    });
}

async function sendToBackend(payload, retry = 0) {
    try {
        const token = await getAuthToken(false); // Background is non-interactive
        const headers = { 'Content-Type': 'application/json' };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        } else {
            headers['X-API-Key'] = CONFIG.API_KEY;
        }

        console.log(`[ShadowTrace] Dispatching to ${CONFIG.API_ENDPOINT}`);

        const res = await fetch(CONFIG.API_ENDPOINT, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            if (res.status === 401 && token) {
                chrome.identity.removeCachedAuthToken({ token }, () => { });
                if (retry < CONFIG.API_RETRY_LIMIT) return sendToBackend(payload, retry + 1);
            }
            const errorText = await res.text().catch(() => 'No error detail');
            throw new Error(`Backend Error (${res.status}): ${errorText}`);
        }

        const data = await res.json();
        const levelMap = { 'Safe': 'low', 'Suspicious': 'medium', 'Dangerous': 'high' };
        return {
            risk_score: data.risk_score,
            risk_level: levelMap[data.risk_level] || 'low',
            reasons: data.reasons || [],
            source: 'backend'
        };
    } catch (err) {
        console.error('[ShadowTrace] Network Error:', err.message);
        if (retry < CONFIG.API_RETRY_LIMIT) return sendToBackend(payload, retry + 1);
        throw err;
    }
}

function updateBadge(tabId, level) {
    const colors = { low: '#22C55E', medium: '#F59E0B', high: '#EF4444' };
    const text = level === 'low' ? '✓' : level === 'medium' ? '!' : '✕';
    try {
        chrome.action.setBadgeBackgroundColor({ tabId, color: colors[level] || '#6B7280' });
        chrome.action.setBadgeText({ tabId, text });
    } catch (err) {
        // Tab might be closed
    }
}

chrome.tabs.onRemoved.addListener(id => {
    try {
        chrome.storage.session.remove(`tab_${id}`);
    } catch (e) { }
});

chrome.tabs.onUpdated.addListener((id, change) => {
    if (change.status === 'loading') {
        try {
            chrome.action.setBadgeText({ tabId: id, text: '' });
        } catch (e) { }
    }
});
