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
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab) {
            currentTabId = tab.id;
            const url = new URL(tab.url);
            tabInfo.textContent = `Active Tab: ${url.hostname}`;
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
            const time = new Date(req.timestamp).toLocaleTimeString();
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

    clearBtn.addEventListener('click', () => {
        if (!currentTabId) return;
        chrome.storage.session.remove(`reqs_${currentTabId}`);
        body.innerHTML = '';
    });

    init();
})();
