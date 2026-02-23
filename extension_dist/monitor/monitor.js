(() => {
    'use strict';

    const $ = (id) => document.getElementById(id);
    const body = $('requestBody');
    const tabInfo = $('tabInfo');
    const statCount = $('statCount');
    const statPost = $('statPost');
    const clearBtn = $('clearBtn');

    let currentTabId = null;

    async function init() {
        const urlParams = new URLSearchParams(window.location.search);
        const urlTabId = urlParams.get('tabId');

        if (urlTabId) {
            currentTabId = parseInt(urlTabId);
            chrome.tabs.get(currentTabId, (tab) => {
                if (chrome.runtime.lastError || !tab) {
                    tabInfo.textContent = `Target Tab ID: ${currentTabId} (Inactive)`;
                } else {
                    const url = new URL(tab.url);
                    tabInfo.textContent = `Active Tab: ${url.hostname}`;
                }
            });
        } else {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tab) {
                currentTabId = tab.id;
                const url = new URL(tab.url);
                tabInfo.textContent = `Active Tab: ${url.hostname}`;
            }
        }

        pollRequests();
        setInterval(pollRequests, 1000);
    }

    async function pollRequests() {
        if (!currentTabId) return;

        chrome.runtime.sendMessage({ type: 'ST_GET_RISK', tabId: currentTabId }, (data) => {
            if (data && data.requests) {
                renderTable(data.requests);
            }
        });
    }

    function renderTable(requests) {
        if (!requests || requests.length === 0) {
            body.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #64748b; padding: 40px;">No traffic detected yet. Ensure the tab is active.</td></tr>';
            return;
        }

        statCount.textContent = requests.length;
        const postCount = requests.filter(r => r.method === 'POST').length;
        statPost.textContent = `${Math.round((postCount / requests.length) * 100)}%`;

        const html = requests.map(req => {
            const time = formatTime(req.timestamp);
            const risk = req.method === 'POST' ? 'MEDIUM' : 'LOW';
            const riskClass = req.method === 'POST' ? 'm-risk-med' : 'm-risk-low';

            return `
                <tr>
                    <td>${time}</td>
                    <td><span class="m-method ${req.method}">${req.method}</span></td>
                    <td style="color: #94A3B8; font-size: 12px;">${req.type}</td>
                    <td class="m-url" title="${req.url}">${req.url}</td>
                    <td class="${riskClass}">${risk}</td>
                </tr>
            `;
        }).join('');

        body.innerHTML = html;
    }

    function formatTime(ts) {
        const d = new Date(ts);
        const h = String(d.getHours()).padStart(2, '0');
        const m = String(d.getMinutes()).padStart(2, '0');
        const s = String(d.getSeconds()).padStart(2, '0');
        const ms = String(d.getMilliseconds()).padStart(3, '0');
        return `${h}:${m}:${s}.${ms}`;
    }

    clearBtn.addEventListener('click', () => {
        if (!currentTabId) return;
        chrome.storage.session.remove(`reqs_${currentTabId}`);
        body.innerHTML = '';
    });

    init();
})();
