(() => {
    'use strict';

    console.log('[ShadowTrace] Content script active');

    let behavior = {
        externalFetchDetected: false,
        externalXHRDetected: false,
        suspiciousSubmissions: [],
        pasteEvents: [],
        keyloggerDetected: false,
        unnaturalInputSpeed: false
    };
    let scanTimeout = null;
    let observer = null;

    function inject() {
        try {
            const s = document.createElement('script');
            s.src = chrome.runtime.getURL('inject.js');
            s.onload = () => s.remove();
            (document.head || document.documentElement).appendChild(s);
            console.log('[ShadowTrace] Core protection injected');
        } catch (err) {
            console.error('[ShadowTrace] Injection failed:', err);
        }
    }

    window.addEventListener('message', e => {
        if (e.source !== window || !e.data || e.data.type !== 'ST_INJECT_DATA') return;
        const p = e.data.payload;

        if (p.kind === 'external_fetch') {
            behavior.externalFetchDetected = true;
        } else if (p.kind === 'external_xhr') {
            behavior.externalXHRDetected = true;
        } else if (p.kind === 'credential_bearing_request') {
            console.warn('[ShadowTrace] Suspicious submission detected');
            behavior.suspiciousSubmissions.push({
                type: 'credential_bearing',
                destination: p.destination,
                method: p.method,
                timestamp: p.timestamp
            });
        }
        // ── Behavioral Fingerprinting (Keyboard/Hooks) ──────────────────
        document.addEventListener('paste', e => {
            const target = e.target;
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
                const text = e.clipboardData.getData('text');
                behavior.pasteEvents.push({
                    length: text.length,
                    timestamp: new Date().toISOString(),
                    isPassword: target.type === 'password'
                });
                console.log('[ShadowTrace] Paste event captured');
            }
        }, true);

        let lastKeyPress = 0;
        document.addEventListener('keydown', e => {
            const now = Date.now();
            if (lastKeyPress && (now - lastKeyPress < 20)) {
                // Very fast typing or automated input
                behavior.unnaturalInputSpeed = true;
            }
            lastKeyPress = now;

            // Detect potential keyloggers (excessive global hooks in inject.js would be better, but we can track context here)
        }, true);

        // Listen for manual scan trigger from popup
        chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
            if (msg.type === 'ST_MANUAL_SCAN') {
                console.log('[ShadowTrace] Manual scan triggered');
                inject(); // Inject core only when user asks
                performScan().then(() => sendResponse({ status: 'ok' }));
                return true;
            } else if (msg.type === 'ST_UPDATE_POLICY') {
                window.postMessage({ type: 'ST_SET_POLICY', policy: msg.policy }, '*');
            }
        });

        function triggerScan(delay = 1000) {
            clearTimeout(scanTimeout);
            scanTimeout = setTimeout(performScan, delay);
        }

        async function performScan() {
            try {
                if (typeof STSignals === 'undefined') {
                    console.warn('[ShadowTrace] Signal engine loading...');
                    // Briefly wait if just injected
                    await new Promise(r => setTimeout(r, 100));
                }

                const domain = STSignals.extractDomainSignals(window.location.href);
                const forms = STSignals.scanForLoginForms();

                console.log(`[ShadowTrace] Manual scan: ${domain.hostname}...`);

                chrome.runtime.sendMessage({
                    type: 'ST_SIGNAL_REPORT',
                    payload: STSignals.buildPayload(domain, forms, behavior)
                });
            } catch (err) {
                console.error('[ShadowTrace] Scan error:', err);
            }
        }

        // React to page changes
        function setupObserver() {
            if (observer) observer.disconnect();
            observer = new MutationObserver(() => triggerScan(1500));
            observer.observe(document.body, { childList: true, subtree: true });
        }

        // Start: Proactive protection
        triggerScan(500);
        setupObserver();
        console.log('[ShadowTrace] Real-time protection active.');
    })();
