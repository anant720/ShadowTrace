(() => {
    'use strict';

    // ── Section 1: Golden Reference Capture (Forensic Hardening) ─────
    // Capture native prototypes BEFORE any other script can pollute or restore them.
    const __ST_NATIVE = {
        fetch: window.fetch.bind(window),
        xhr_open: XMLHttpRequest.prototype.open,
        xhr_send: XMLHttpRequest.prototype.send,
        addEventListener: window.addEventListener.bind(window),
        postMessage: window.postMessage.bind(window)
    };
    Object.freeze(__ST_NATIVE);

    const MSG_KEY = 'ST_INJECT_DATA';
    const pageHostname = window.location.hostname;
    let dlpPolicy = {
        blockExfiltration: false,
        warningOnly: false,
        fleetBlockedDomains: [],
        fleetDLPRules: []
    };

    function isExternalDomain(urlString) {
        try {
            const url = new URL(urlString, window.location.href);
            return url.hostname !== pageHostname;
        } catch {
            return true; // Malformed URLs are suspicious
        }
    }

    function looksLikeCredentials(body) {
        if (!body) return false;

        let searchable = '';

        if (typeof body === 'string') {
            searchable = body.toLowerCase();
        } else if (body instanceof URLSearchParams) {
            searchable = body.toString().toLowerCase();
        } else if (body instanceof FormData) {
            // Check FormData keys only
            for (const key of body.keys()) {
                if (isCredentialKey(key)) return true;
            }
            return false;
        } else if (typeof body === 'object') {
            try {
                searchable = JSON.stringify(Object.keys(body)).toLowerCase();
            } catch {
                return false;
            }
        }

        const credentialPatterns = [
            'password', 'passwd', 'pwd', 'pass',
            'credential', 'secret', 'token',
            'login', 'signin', 'auth',
        ];

        return credentialPatterns.some(pattern => searchable.includes(pattern));
    }

    function isCredentialKey(key) {
        const k = key.toLowerCase();
        const patterns = ['password', 'passwd', 'pwd', 'pass', 'credential', 'secret', 'token'];
        return patterns.some(p => k.includes(p));
    }

    window.addEventListener('message', e => {
        if (e.source !== window || !e.data || e.data.type !== 'ST_SET_POLICY') return;
        dlpPolicy = e.data.policy;
        console.log('[ShadowTrace] Intelligence Policy Updated:', dlpPolicy);
    });

    function dispatchSignal(kind, destination, extras = {}) {
        __ST_NATIVE.postMessage({
            type: MSG_KEY,
            payload: {
                kind,
                destination,
                timestamp: new Date().toISOString(),
                ...extras,
            },
        }, '*');
    }

    window.fetch = function (input, init = {}) {
        try {
            const url = (typeof input === 'string')
                ? input
                : (input instanceof Request ? input.url : String(input));

            const method = (init.method || 'GET').toUpperCase();

            if (isExternalDomain(url)) {
                dispatchSignal('external_fetch', url, { method });

                // 1. Fleet Domain Block
                if (dlpPolicy.fleetBlockedDomains && dlpPolicy.fleetBlockedDomains.some(d => url.includes(d))) {
                    console.error('[ShadowTrace] Policy: Domain is administratively BLOCKED.');
                    return Promise.reject(new Error('ShadowTrace Fleet Policy: Connection to this domain is forbidden by your organization.'));
                }

                if (init.body && looksLikeCredentials(init.body)) {
                    dispatchSignal('credential_bearing_request', url, { method });

                    if (dlpPolicy.blockExfiltration) {
                        console.error('[ShadowTrace] DLP: External credential exfiltration BLOCKED.');
                        return Promise.reject(new Error('ShadowTrace DLP Block: Unauthorized exfiltration attempt to untrusted domain.'));
                    }
                }
            }
        } catch {
            // Fail silently — never break page functionality
        }

        return __ST_NATIVE.fetch.apply(window, arguments);
    };


    // ── XHR Interception (Hardened) ───────────────────────────────

    XMLHttpRequest.prototype.open = function (method, url, ...rest) {
        this.__st_method = method;
        this.__st_url = url;
        return __ST_NATIVE.xhr_open.apply(this, [method, url, ...rest]);
    };

    XMLHttpRequest.prototype.send = function (body) {
        try {
            if (this.__st_url && isExternalDomain(this.__st_url)) {
                dispatchSignal('external_xhr', this.__st_url, {
                    method: (this.__st_method || 'GET').toUpperCase(),
                });

                if (dlpPolicy.fleetBlockedDomains && dlpPolicy.fleetBlockedDomains.some(d => this.__st_url.includes(d))) {
                    console.error('[ShadowTrace] Policy: XHR to this domain is BLOCKED.');
                    return;
                }

                if (body && looksLikeCredentials(body)) {
                    dispatchSignal('credential_bearing_request', this.__st_url, {
                        method: (this.__st_method || 'GET').toUpperCase(),
                    });

                    if (dlpPolicy.blockExfiltration) {
                        console.error('[ShadowTrace] DLP: XHR exfiltration BLOCKED.');
                        return;
                    }
                }
            }
        } catch {
            // Fail silently
        }
        return __ST_NATIVE.xhr_send.apply(this, arguments);
    };

    // ── Form Submit Interception ─────────────────────────────────────

    __ST_NATIVE.addEventListener('submit', (event) => {
        try {
            const form = event.target;
            if (!(form instanceof HTMLFormElement)) return;

            const action = form.getAttribute('action') || '';
            if (action && isExternalDomain(action)) {
                const hasPassword = form.querySelector('input[type="password"]') !== null;
                if (hasPassword) {
                    dispatchSignal('credential_bearing_request', action, {
                        method: (form.method || 'GET').toUpperCase(),
                        source: 'form_submit',
                    });

                    if (dlpPolicy.blockExfiltration) {
                        console.error('[ShadowTrace] DLP: Form submission exfiltration BLOCKED.');
                        event.preventDefault();
                        alert('ShadowTrace Data Loss Prevention: This form submission has been blocked because it attempts to send credentials to an external untrusted domain.');
                        return;
                    }
                }
            }
        } catch {
            // Fail silently
        }
    }, true); // Capture phase to detect before any preventDefault


    // ── Section 6: Context Sealing — Dynamic Iframe Interception ────────
    //
    // Adversary pattern: document.createElement('iframe') + .srcdoc injection
    // bypasses inject.js since MV3 only injects into the top-level document.
    //
    // Strategy:
    //   A) Hook Document.prototype.createElement — intercept every 'iframe' creation.
    //   B) Seal the 'srcdoc' property BEFORE the element is attached, so our
    //      monitoring script tag is prepended to adversary-controlled HTML
    //      before the parser sees it.
    //   C) After DOM attachment, attempt same-origin re-injection via
    //      contentDocument (MutationObserver on document.body).
    //   D) Cross-origin iframes: silently skip (browser security invariant).

    (function _installContextSeal() {
        'use strict';

        // Save native references before hooking
        const _nativeCreateElement = Document.prototype.createElement;
        const _nativeCreateElementNS = Document.prototype.createElementNS;

        // Unique sentinel so we only seal once per element
        const SEALED = Symbol('__st_ctx_sealed');
        // Path to inject.js as a web-accessible extension resource
        // Note: chrome.runtime is available in the MAIN world.
        const INJECT_SRC = (typeof chrome !== 'undefined' && chrome.runtime)
            ? chrome.runtime.getURL('inject.js')
            : null;

        function _dispatchSealSignal(reason) {
            try {
                __ST_NATIVE.postMessage(
                    { type: MSG_KEY, payload: { kind: 'context_seal_' + reason, destination: 'self', timestamp: new Date().toISOString() } },
                    '*'
                );
            } catch (_) { /* Never interrupt page */ }
        }

        // ── srcdoc property seal ─────────────────────────────────────────
        function _sealSrcdoc(iframeEl) {
            let _internal = iframeEl.getAttribute('srcdoc') || '';

            Object.defineProperty(iframeEl, 'srcdoc', {
                get() { return _internal; },
                set(value) {
                    if (!INJECT_SRC) { _internal = value; return; }
                    // Prepend our monitor script as very first tag in srcdoc
                    const guard = `<script src="${INJECT_SRC}"><\/script>`;
                    _internal = guard + (value || '');
                    // Reflect back to attribute so the browser picks it up
                    HTMLElement.prototype.setAttribute.call(this, 'srcdoc', _internal);
                    _dispatchSealSignal('srcdoc_applied');
                },
                configurable: false,
                enumerable: true
            });
        }

        // ── Same-origin post-attach injection ────────────────────────────
        function _injectIntoSameOriginDocument(doc) {
            if (!doc || doc.__st_sealed || !INJECT_SRC) return;
            try {
                // Will throw DOMException if cross-origin — caught below
                doc.__st_sealed = true;
                const script = doc.createElement('script');
                script.src = INJECT_SRC;
                (doc.head || doc.documentElement || doc.body)
                    ?.insertBefore(script, (doc.head || doc.documentElement || doc.body).firstChild);
                _dispatchSealSignal('same_origin_injected');
            } catch (e) {
                // Cross-origin: browser invariant, silently ignore
                _dispatchSealSignal('xorigin_skipped');
            }
        }

        // ── Per-iframe setup ─────────────────────────────────────────────
        function _setupIframe(el) {
            if (!el || el[SEALED]) return;
            el[SEALED] = true;
            _sealSrcdoc(el);

            // Watch for the iframe being added to the DOM, then attempt
            // same-origin re-injection into its contentDocument.
            const bodyObserver = new MutationObserver(() => {
                if (el.contentDocument) {
                    _injectIntoSameOriginDocument(el.contentDocument);
                }
                // Once we get a contentDocument (even null), stop observing
                if (document.contains(el)) bodyObserver.disconnect();
            });
            bodyObserver.observe(document.documentElement || document.body || document, {
                childList: true,
                subtree: true
            });

            // Also hook the 'load' event for iframes added after observer starts
            el.addEventListener('load', () => {
                _injectIntoSameOriginDocument(el.contentDocument);
            }, { once: true, capture: true });
        }

        // ── Hook Document.prototype.createElement ────────────────────────
        Document.prototype.createElement = function (tagName, options) {
            const el = _nativeCreateElement.call(this, tagName, options);
            if (typeof tagName === 'string' && tagName.toLowerCase() === 'iframe') {
                _setupIframe(el);
            }
            return el;
        };

        Document.prototype.createElementNS = function (ns, tagName, options) {
            const el = _nativeCreateElementNS.call(this, ns, tagName, options);
            if (typeof tagName === 'string' && tagName.toLowerCase().includes('iframe')) {
                _setupIframe(el);
            }
            return el;
        };

        // ── Seal pre-existing iframes (inline in HTML before inject.js ran) ──
        // inject.js runs at document_start so this list is usually empty,
        // but guard against any edge cases.
        try {
            document.querySelectorAll('iframe').forEach(_setupIframe);
        } catch (_) { /* DOM might not be ready */ }

    })();

})();

