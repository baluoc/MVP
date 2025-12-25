        let scratchConfig = {};
        let currentView = 'dashboard';
        let userPage = 1;
        let isConnected = false;

        // Composer State
        let selectedSceneId = null;
        let selectedWidgetId = null;
        let availableWidgets = [];

        const VIEW_TITLES = {
            "dashboard": "Live Übersicht",
            "settings-system": "Einstellungen: System",
            "settings-points": "Einstellungen: Punkte & Level",
            "settings-broadcast": "Einstellungen: Broadcast",
            "settings-chat": "Einstellungen: Chat",
            "settings-commands": "Einstellungen: Befehle",
            "settings-tts": "Einstellungen: TTS",
            "settings-gifts": "Einstellungen: Geschenke",
            "overlays": "Overlays",
            "overlay-composer": "Overlay-Composer",
            "users": "User DB",
            "mcp": "MCP - Master Control Program"
        };

        // --- CORE NAVIGATION ---
        function showView(id) {
            // 1. Reset all Views and Navs
            document.querySelectorAll('.view').forEach(el => {
                el.classList.remove('active');
                el.style.display = ''; // Reset inline display if toggled by CSS
            });
            document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));

            // 2. Activate Target View
            const view = document.getElementById('view-' + id);
            if (view) {
                view.classList.add('active');
            }

            // 3. Highlight Target Nav (Strict Match)
            const activeNav = document.querySelector(`.nav-item[data-view='${id}']`);
            if (activeNav) {
                activeNav.classList.add('active');
            }

            currentView = id;
            // Strict German Titles
            const t = VIEW_TITLES[id] || id.toUpperCase();
            document.getElementById('page-title').innerText = t;

            // Context specific actions
            document.getElementById('btn-save').style.display = id.startsWith('settings') ? 'block' : 'none';

            if(id === 'users') loadUsers(1);
            if(id === 'overlays') loadOverlaySettings();
            if(id === 'overlay-composer') initComposer();
            if(id === 'mcp') initMCPView();

            // If Dashboard, update iframe scale and render mock data if needed
            if(id === 'dashboard') {
                setTimeout(resizePreview, 100);
                if (!isConnected) {
                    checkMockData();
                }
            }
        }

        // --- MCP LOGIC ---
        let mcpInterval = null;
        let allDivs = [];

        async function initMCPView() {
            if(mcpInterval) clearInterval(mcpInterval);
            mcpInterval = setInterval(updateMCPStatus, 2000);
            updateMCPStatus();
            loadMCPDivs();
            loadCredentials();
            loadTasks();
            loadArtifacts();

            document.getElementById('mcp-start-btn').onclick = async () => {
                await fetch('/api/mcp/start', { method: 'POST' });
                updateMCPStatus();
            };
            document.getElementById('mcp-stop-btn').onclick = async () => {
                await fetch('/api/mcp/stop', { method: 'POST' });
                updateMCPStatus();
            };
            document.getElementById('mcp-auth-test-btn').onclick = async () => {
                const res = await fetch('/.well-known/oauth-authorization-server');
                const pRes = await fetch('/.well-known/oauth-protected-resource');
                const mcpRes = await fetch('/mcp', { method: 'POST' }); // Challenge check

                let report = "";
                if(res.ok) {
                    const data = await res.json();
                    report += "✅ Auth Server Discovery OK\n";
                } else report += "❌ Auth Server Discovery Failed\n";

                if(pRes.ok) {
                    const data = await pRes.json();
                    report += "✅ Protected Resource Discovery OK\n";
                } else report += "❌ Protected Resource Discovery Failed\n";

                if(mcpRes.status === 401) {
                    const challenge = mcpRes.headers.get('www-authenticate');
                    if(challenge && challenge.includes('Bearer') && challenge.includes('resource_metadata')) {
                         report += "✅ 401 Challenge OK\n";
                    } else {
                         report += "⚠️ 401 Received but Challenge Header missing/wrong\n";
                    }
                } else {
                    report += `❌ /mcp returned ${mcpRes.status} (expected 401)\n`;
                }

                document.getElementById('mcp-auth-result').innerText = report;
                document.getElementById('mcp-auth-result').style.color = report.includes('❌') ? "#ef4444" : "#4ade80";
            }
        }

        async function loadCredentials() {
            // Get credentials
            const res = await fetch('/api/auth/credentials');
            const data = await res.json();
            document.getElementById('mcp-client-id').value = data.clientId || "";

            // Masked secret is returned by default
            const secretInput = document.getElementById('mcp-client-secret');
            secretInput.value = data.clientSecret || "";

            // Disable copy if masked (contains *)
            const copyBtn = secretInput.nextElementSibling;
            if(data.clientSecret && data.clientSecret.includes('*')) {
                copyBtn.disabled = true;
                copyBtn.title = "Secret ist maskiert. Neu generieren zum Kopieren.";
            } else {
                copyBtn.disabled = false;
            }

            // Get Discovery info for URL
            const discRes = await fetch('/.well-known/oauth-authorization-server');
            if (discRes.ok) {
                const disc = await discRes.json();
                document.getElementById('mcp-public-url').value = disc.issuer || "";
            }
        }

        async function generateCredentials() {
            if(!confirm("Neue Credentials generieren? Alte werden ungültig!")) return;
            const res = await fetch('/api/auth/credentials/generate', { method: 'POST' });
            const data = await res.json();

            // Update UI with CLEAR TEXT secret immediately
            document.getElementById('mcp-client-id').value = data.clientId;
            document.getElementById('mcp-client-secret').value = data.clientSecret;

            // Enable copy button
            const copyBtn = document.getElementById('mcp-client-secret').nextElementSibling;
            copyBtn.disabled = false;

            alert("Credentials generiert! Bitte Secret JETZT kopieren, es wird nicht erneut angezeigt.");
        }

        function copySecret() {
            const id = document.getElementById('mcp-client-secret').value;
            navigator.clipboard.writeText(id);
            alert("Client Secret kopiert.");
        }

        async function loadTasks() {
            try {
                const res = await fetch('/api/mcp/tasks'); // Proxy
                if(!res.ok) return;
                const tasks = await res.json();

                ['backlog', 'in_progress', 'done'].forEach(s => {
                    const list = document.getElementById(`task-list-${s}`);
                    list.innerHTML = "";
                    tasks.filter(t => t.status === s).forEach(t => {
                        const el = document.createElement('div');
                        el.className = 'task-card';
                        el.innerHTML = `<strong>${t.title}</strong><div style="font-size:0.7rem; color:var(--muted);">${new Date(t.updated).toLocaleTimeString()}</div>`;
                        el.ondblclick = async () => {
                            // Simple toggle status flow
                            let next = 'in_progress';
                            if(s === 'in_progress') next = 'done';
                            if(s === 'done') next = 'backlog';
                            await fetch(`/api/mcp/tasks/${t.id}`, { method: 'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({status: next})});
                            loadTasks();
                        };
                        list.appendChild(el);
                    });
                });
            } catch(e) { console.error("Tasks load error", e); }
        }

        async function createTask() {
            const t = prompt("Task Titel:");
            if(!t) return;
            await fetch('/api/mcp/tasks', { method: 'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({title: t}) });
            loadTasks();
        }

        async function loadArtifacts() {
            // "Artefakte: Tests/Screens/Logs".
            // Let's assume strict filenames for now as per requirements: "1_dashboard.png", etc.
            const files = [
                '1_dashboard.png', '2_einstellungen_system.png', '3_einstellungen_tts.png',
                '4_einstellungen_overlay.png', '5_overlay_composer.png', '6_einstellungen_broadcast.png',
                '7_einstellungen_chat.png', '8_einstellungen_befehle.png', '9_einstellungen_gifts.png',
                '10_users.png', '11_mcp.png'
            ];

            const list = document.getElementById('mcp-artifacts-list');
            list.innerHTML = "";
            files.forEach(f => {
                const div = document.createElement('div');
                div.style.minWidth = "100px";
                div.style.textAlign = "center";
                div.innerHTML = `
                    <a href="/artifacts/${f}" target="_blank">
                        <img src="/artifacts/${f}" style="width:100px; height:60px; object-fit:cover; border:1px solid var(--border); border-radius:4px;" onerror="this.src='https://via.placeholder.com/100x60?text=Missing'">
                    </a>
                    <div style="font-size:0.6rem; margin-top:2px; overflow:hidden; text-overflow:ellipsis;">${f}</div>
                `;
                list.appendChild(div);
            });
        }

        async function updateMCPStatus() {
            if(currentView !== 'mcp') {
                if(mcpInterval) clearInterval(mcpInterval);
                return;
            }
            try {
                const res = await fetch('/api/mcp/status');
                const data = await res.json();
                const dot = document.querySelector('#mcp-status-display .status-dot');
                const text = document.querySelector('#mcp-status-display .status-text');
                const details = document.getElementById('mcp-status-details');

                if(data.status === 'running') {
                    dot.className = 'status-dot running';
                    text.innerText = "Läuft (PID: " + data.pid + ", Port: " + data.port + ")";
                    details.innerHTML = `URL: ${data.url}<br>Uptime: Running`;

                    // Fetch Logs
                    const logsRes = await fetch('/api/mcp/logs');
                    const logs = await logsRes.json();
                    const logContainer = document.getElementById('mcp-logs');
                    if (logs && logs.length > 0) {
                        logContainer.innerText = logs.join('\n');
                        logContainer.scrollTop = logContainer.scrollHeight;
                    }

                } else {
                    dot.className = 'status-dot ' + (data.status === 'error' ? 'error' : '');
                    text.innerText = data.status === 'stopped' ? "Gestoppt" : "Fehler";
                    details.innerHTML = data.lastError ? `Fehler: ${data.lastError}` : '';
                }
            } catch(e) {
                console.error(e);
            }
        }

        async function loadMCPDivs() {
             const list = document.getElementById('mcp-div-list');
             try {
                 const res = await fetch('/api/mcp/div'); // Proxies to MCP service
                 if(res.status === 503) {
                     list.innerHTML = "<p class='empty-state'>MCP Service läuft nicht.</p>";
                     return;
                 }
                 const divs = await res.json();
                 allDivs = divs;
                 renderDivs(divs);
             } catch(e) {
                 list.innerHTML = "<p class='empty-state'>Verbindungsfehler</p>";
             }
        }

        function filterDivs(filter) {
            if(filter === 'all') renderDivs(allDivs);
            else renderDivs(allDivs.filter(d => d.review.status.includes(filter) || d.review.status === filter));
        }

        function renderDivs(divs) {
             const list = document.getElementById('mcp-div-list');
             if(divs.length === 0) {
                 list.innerHTML = "<p class='empty-state'>Keine Pakete gefunden.</p>";
                 return;
             }
             list.innerHTML = "";
             divs.forEach(div => {
                 const item = document.createElement('div');
                 item.className = 'card';
                 item.style.marginBottom = '10px';
                 item.style.padding = '10px';
                 const planItems = div.plan ? div.plan.slice(0,3).map(p=>`<li>${p}</li>`).join('') : '';

                 item.innerHTML = `
                    <div style="display:flex; justify-content:space-between;">
                        <strong>${div.titel}</strong>
                        <span style="font-size:0.75rem; background:rgba(255,255,255,0.1); padding:2px 6px; border-radius:4px;">${div.review.status}</span>
                    </div>
                    <div style="font-size:0.8rem; color:var(--muted); margin-top:5px;">
                        ${div.autor} • ${new Date(div.erstelltAm).toLocaleString()} • ${div.rolle}
                    </div>
                    <ul style="font-size:0.75rem; color:#bbb; padding-left:15px; margin:5px 0;">${planItems}</ul>
                    <div style="display:flex; gap:10px; margin-top:10px;">
                        <button class="btn-secondary" onclick="mcpAction('${div.id}', 'validate')">Validieren</button>
                        <button class="btn-secondary" onclick="mcpAction('${div.id}', 'apply')" ${div.review.status === 'applied' ? 'disabled' : ''}>Anwenden</button>
                        <button class="btn-secondary" onclick="mcpAction('${div.id}', 'rollback')" ${div.review.status !== 'applied' ? 'disabled' : ''}>Rollback</button>
                    </div>
                 `;
                 list.appendChild(item);
             });
        }

        async function mcpAction(id, action) {
            const res = await fetch(`/api/mcp/div/${id}/${action}`, { method: 'POST' });
            const data = await res.json();
            if(res.ok) {
                alert(action + " erfolgreich!");
                loadMCPDivs();
            } else {
                alert("Fehler: " + (data.error || JSON.stringify(data)));
            }
        }

        // --- SCRATCHPAD LOGIC ---
        // Deep set helper
        function setPath(obj, path, val) {
            const keys = path.split('.');
            let last = keys.pop();
            let target = obj;
            for(let k of keys) {
                if(!target[k]) target[k] = {};
                target = target[k];
            }
            target[last] = val;
        }

        // Deep get helper
        function getPath(obj, path) {
            return path.split('.').reduce((o, i) => o ? o[i] : undefined, obj);
        }

        async function initSettings() {
            const res = await fetch('/api/settings');
            scratchConfig = await res.json();
            renderSettings();
        }

        function renderSettings() {
            document.querySelectorAll('[data-bind]').forEach(el => {
                const path = el.getAttribute('data-bind');
                const val = getPath(scratchConfig, path);

                if(el.type === 'checkbox') el.checked = !!val;
                else el.value = (val === undefined || val === null) ? '' : val;

                // Bind Event
                el.onchange = (e) => {
                    const newVal = el.type === 'checkbox' ? el.checked :
                                   (el.type === 'number' || el.type === 'range') ? Number(el.value) : el.value;
                    setPath(scratchConfig, path, newVal);
                    updateUIState(); // Refresh calculated UI
                };
            });
            updateUIState();
        }

        async function saveSettings() {
            await fetch('/api/settings', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(scratchConfig)
            });
            alert("Konfiguration gespeichert!");
        }

        // --- SESSION LOGIC ---
        async function loadSession() {
            const res = await fetch('/api/tiktok/session');
            const data = await res.json();

            document.getElementById('session-mode').value = data.mode;
            document.getElementById('lbl-session-active').innerText = data.hasSessionId
                ? `Gesetzt (Aktualisiert: ${new Date(data.updatedAt).toLocaleString()})`
                : "Nicht gesetzt";
            document.getElementById('lbl-session-active').style.color = data.hasSessionId ? "var(--success)" : "var(--muted)";

            updateSessionUI();
        }

        function updateSessionUI() {
            const mode = document.getElementById('session-mode').value;
            document.getElementById('session-manual-ui').style.display = (mode === 'manual') ? 'block' : 'none';
        }

        async function saveSession() {
            const mode = document.getElementById('session-mode').value;
            const sessionId = document.getElementById('session-id-input').value;

            const payload = { mode };
            if(mode === 'manual' && sessionId) {
                payload.sessionId = sessionId;
            }

            const res = await fetch('/api/tiktok/session', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(payload)
            });

            if(res.ok) {
                alert("Session gespeichert!");
                document.getElementById('session-id-input').value = ""; // clear for security
                loadSession();
            } else {
                alert("Fehler beim Speichern");
            }
        }

        async function clearSession() {
            if(!confirm("Session wirklich löschen?")) return;
            await fetch('/api/tiktok/session/clear', { method: 'POST' });
            loadSession();
            alert("Session gelöscht.");
        }

        async function sendTestChat() {
            const txt = document.getElementById('chat-test-msg').value;
            if(!txt) return;

            const res = await fetch('/api/chat/send', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ text: txt })
            });
            const data = await res.json();

            if(data.ok) {
                alert("Nachricht gesendet!");
            } else {
                alert(`Fehler: ${data.reason} (Mode: ${data.mode})`);
            }
        }

        function updateUIState() {
            // Visual Updates (Chips, Summaries) derived from scratchConfig
            const tts = scratchConfig.tts || {};
            document.getElementById('sum-tts').innerText = tts.enabled ? "An" : "Aus";
            document.getElementById('sum-tts').className = tts.enabled ? "sum-val on" : "sum-val";
            document.getElementById('sum-trigger').innerText = (tts.trigger || "any").toUpperCase();
        }

        // --- FEATURES & INTEGRATIONS ---

        // Integrations Tester (OBS, Streamerbot)
        async function testIntegration(service) {
            const res = await fetch(`/api/${service}/test`, { method: 'POST' });
            const data = await res.json();
            if(data.ok) {
                alert(`${service} verbunden! Status: ` + JSON.stringify(data.info));
            } else {
                alert(`Test fehlgeschlagen: ${data.reason}`);
            }
        }

        // OBS Functions
        async function obsLoadScenes() {
            const res = await fetch('/api/obs/action', {
                method: 'POST',
                headers: {'Content-Type':'application/json'},
                body: JSON.stringify({ type: 'getScenes' })
            });
            const data = await res.json();
            if(data.ok && data.scenes) {
                const sel = document.getElementById('obs-scenes-list');
                sel.innerHTML = "";
                data.scenes.forEach(s => {
                    const opt = document.createElement("option");
                    opt.value = s.sceneName;
                    opt.innerText = s.sceneName;
                    sel.appendChild(opt);
                });
            } else {
                alert("Konnte Szenen nicht laden: " + (data.reason || 'Unbekannt'));
            }
        }

        async function obsSwitchScene() {
            const s = document.getElementById('obs-scenes-list').value;
            if(!s) return;
            await fetch('/api/obs/action', {
                method: 'POST',
                headers: {'Content-Type':'application/json'},
                body: JSON.stringify({ type: 'switchScene', data: { sceneName: s } })
            });
        }

        async function obsToggleSource() {
            const name = document.getElementById('obs-source-name').value;
            if(!name) return;
            const enabled = confirm("Soll die Quelle '" + name + "' aktiviert werden? (Cancel=Deaktivieren)");
            await fetch('/api/obs/action', {
                method: 'POST',
                headers: {'Content-Type':'application/json'},
                body: JSON.stringify({ type: 'toggleInput', data: { inputName: name, enabled: enabled } })
            });
        }

        async function obsToggleMute() {
            const name = document.getElementById('obs-audio-source').value;
            if(!name) return;
            await fetch('/api/obs/action', {
                method: 'POST',
                headers: {'Content-Type':'application/json'},
                body: JSON.stringify({ type: 'toggleMute', data: { inputName: name } })
            });
            alert("Mute toggled for " + name);
        }

        async function obsStream(start) {
             const type = start ? 'startStream' : 'stopStream';
             await fetch('/api/obs/action', {
                method: 'POST',
                headers: {'Content-Type':'application/json'},
                body: JSON.stringify({ type: type })
            });
            alert(start ? "Stream gestartet" : "Stream gestoppt");
        }


        // Streamer.bot Functions
        async function sbLoadActions() {
            const res = await fetch('/api/streamerbot/actions');
            const actions = await res.json();
            const sel = document.getElementById('sb-actions-list');
            sel.innerHTML = "";
            actions.forEach(a => {
                const opt = document.createElement("option");
                opt.value = a.id;
                opt.innerText = a.name;
                sel.appendChild(opt);
            });
            if(actions.length === 0) alert("Keine Actions gefunden oder nicht verbunden.");
        }

        async function sbDoAction() {
            const id = document.getElementById('sb-actions-list').value;
            if(!id) return;
            await fetch('/api/streamerbot/action', {
                method: 'POST',
                headers: {'Content-Type':'application/json'},
                body: JSON.stringify({ actionId: id })
            });
            alert("Action ausgeführt");
        }


        // Danger Zone
        function openResetModal() {
            document.getElementById('reset-confirm-input').value = "";
            document.getElementById('btn-do-reset').disabled = true;
            document.getElementById('modal-reset').classList.add('active');
        }

        function checkResetBtn() {
            const val = document.getElementById('reset-confirm-input').value;
            document.getElementById('btn-do-reset').disabled = (val !== 'RESET');
        }

        async function doReset() {
            await fetch('/api/reset-stats', { method: 'POST' });
            document.getElementById('modal-reset').classList.remove('active');
            alert("Statistiken zurückgesetzt.");
        }

        // Gifts
        async function openGiftBrowser() {
            document.getElementById('modal-gifts').classList.add('active');
            const res = await fetch('/api/gifts');
            const gifts = await res.json();
            const grid = document.getElementById('gift-grid');
            grid.innerHTML = "";

            if(gifts.length === 0) {
                grid.innerHTML = "<div style='grid-column:1/-1; text-align:center; color:gray;'>Noch keine Geschenke im Cache. Verbinde mit TikTok und warte auf Geschenke!</div>";
                return;
            }

            gifts.forEach(g => {
                const div = document.createElement('div');
                div.style.background = "rgba(0,0,0,0.3)";
                div.style.padding = "10px";
                div.style.borderRadius = "8px";
                div.style.textAlign = "center";
                div.innerHTML = `
                    <img src="${g.iconUrl}" style="width:40px; height:40px;">
                    <div style="font-size:0.7rem; margin-top:5px; overflow:hidden; text-overflow:ellipsis;">${g.name}</div>
                    <div style="font-size:0.65rem; color:#ffd700;">💎 ${g.cost}</div>
                `;
                grid.appendChild(div);
            });
        }

        // Users
        async function loadUsers(p) {
            if(p < 1) return;
            userPage = p;
            document.getElementById('user-page-lbl').innerText = p;

            const res = await fetch(`/api/users?page=${p}&limit=20&sort=score`);
            const data = await res.json();
            const tbody = document.querySelector('#user-table tbody');
            tbody.innerHTML = "";

            data.users.forEach(u => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td style="display:flex; align-items:center; gap:8px;">
                        <img src="${u.profilePictureUrl || ''}" style="width:24px; height:24px; border-radius:50%; background:#333;">
                        ${u.nickname || u.uniqueId}
                    </td>
                    <td><b>${u.points}</b></td>
                    <td>${u.diamondCount}</td>
                    <td>
                        <button class="btn-icon" onclick="adjustPoints('${u.key}', 100)">+100</button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        }

        async function adjustPoints(id, delta) {
            // Quick stub logic
            await fetch(`/api/users/${encodeURIComponent(id)}/adjust`, {
                method: 'POST',
                headers: {'Content-Type':'application/json'},
                body: JSON.stringify({ delta })
            });
            loadUsers(userPage);
        }

        // Connection Modal & Logic
        function openConnectModal() {
             document.getElementById('modal-connect').classList.add('active');
        }

        async function connectSystemModal() {
            const u = document.getElementById('conn-user-modal').value;
            if(!u) return;
            await fetch('/api/connect', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ uniqueId: u }) });
            document.getElementById('modal-connect').classList.remove('active');
        }

        async function checkStatus() {
            const res = await fetch('/api/status');
            const s = await res.json();
            document.getElementById('sys-uptime').innerText = Math.floor(s.uptime) + "s";
            document.getElementById('sys-addons').innerText = s.addonsLoaded;

            if(s.connected) {
                isConnected = true;
                document.getElementById('status-text').innerText = `Online: @${s.uniqueId}`;
                document.getElementById('status-dot').style.background = "#4ade80";

                // Top Bar Update
                document.getElementById('top-conn-user').innerText = "@" + s.uniqueId;
                const b = document.getElementById('live-badge');
                b.className = "live-badge active";
                b.innerText = "● LIVE STREAM AKTIV";
                b.style.opacity = "1";

                if(s.roomInfo) {
                    document.getElementById('status-meta').innerText = `Zuschauer: ${s.roomInfo.roomUserCount || 0}`;
                }
                clearMockData();
            } else {
                isConnected = false;
                document.getElementById('status-text').innerText = "Offline";
                document.getElementById('status-dot').style.background = "#666";
                document.getElementById('top-conn-user').innerText = "@Nicht Verbunden";
                const b = document.getElementById('live-badge');
                b.className = "live-badge active";

                // DEMO MODE VISUALS
                // User wants "LIVE STREAM AKTIV" look even in Demo/Offline if we want to show it populated.
                // We use a slight distinction: "LIVE STREAM (DEMO)" but with red pulse
                b.innerText = "● LIVE STREAM (DEMO)";
                b.style.opacity = "0.7";

                // Show mock data if viewing dashboard and list is empty
                if (currentView === 'dashboard') checkMockData();
            }
        }
        setInterval(checkStatus, 3000);

        // --- Mock Data Logic ---
        function checkMockData() {
            const chatList = document.getElementById('chat-list');
            const eventList = document.getElementById('event-list');

            if (chatList.children.length === 0) {
                renderMockChat();
            }
            if (eventList.children.length === 0) {
                renderMockEvents();
            }
        }

        function clearMockData() {
            // Remove elements with class 'mock-item'
            document.querySelectorAll('.mock-item').forEach(el => el.remove());
        }

        function renderMockChat() {
            const list = document.getElementById('chat-list');
            const items = [
                { name: 'UserA', text: 'Hallo, das ist ein Test!', sub: false },
                { name: 'Subscriber', text: 'Cooles Dashboard Design!', sub: true }
            ];
            items.forEach(i => {
                const d = document.createElement('div');
                d.className = "chat-bubble mock-item";
                d.innerHTML = `
                    <div class="chat-avatar"></div>
                    <div>
                        <span class="chat-name" style="color:${i.sub ? 'var(--warning)' : 'var(--text)'};">${i.name}:</span>
                        <span class="chat-text">${i.text}</span>
                    </div>
                `;
                list.appendChild(d); // Reverse column-reverse
            });
        }

        function renderMockEvents() {
            const list = document.getElementById('event-list');

            const e1 = document.createElement('div');
            e1.className = "log-entry gift mock-item";
            e1.innerHTML = `
                <div class="log-icon" style="border:1px solid var(--primary);">🎁</div>
                <div class="log-content">
                    <div class="log-title">Gifter_One</div>
                    <div class="log-desc">sendet 10x Rose</div>
                </div>
                <div class="log-time">12:00</div>
            `;

            const e2 = document.createElement('div');
            e2.className = "log-entry sub mock-item";
            e2.innerHTML = `
                <div class="log-icon">⭐</div>
                <div class="log-content">
                    <div class="log-title">New Subscriber</div>
                    <div class="log-desc">hat abonniert</div>
                </div>
                <div class="log-time">12:01</div>
            `;

            const e3 = document.createElement('div');
            e3.className = "log-entry chat mock-item";
            e3.innerHTML = `
                <div class="log-icon">💬</div>
                <div class="log-content">
                    <div class="log-title">Chatter</div>
                    <div class="log-desc">Hat einen Befehl genutzt</div>
                </div>
                <div class="log-time">12:02</div>
            `;

            list.appendChild(e1);
            list.appendChild(e2);
            list.appendChild(e3);
        }


        // TTS Test
        function testVoice() {
             const text = document.getElementById('test-text').value;
             const msg = new SpeechSynthesisUtterance(text);
             msg.lang = scratchConfig.tts.language;
             msg.volume = scratchConfig.tts.volume;
             msg.rate = scratchConfig.tts.speed;
             msg.pitch = scratchConfig.tts.pitch;
             window.speechSynthesis.speak(msg);
        }

        // --- OVERLAY SETTINGS ---
        function loadOverlaySettings() {
             if (!scratchConfig || !scratchConfig.overlay) {
                 // Not loaded yet? Should not happen with new bootstrap
                 return;
             }
             const sel = document.getElementById('active-scene-select');
             sel.innerHTML = "";
             const scenes = scratchConfig.overlay?.scenes || [];

             if (scenes.length === 0) {
                 const opt = document.createElement("option");
                 opt.innerText = "Keine Szenen vorhanden";
                 sel.appendChild(opt);
             } else {
                 scenes.forEach(s => {
                     const opt = document.createElement("option");
                     opt.value = s.id;
                     opt.innerText = s.name || s.id || "(Unbenannt)";
                     sel.appendChild(opt);
                 });
             }
             sel.value = scratchConfig.overlay?.activeSceneId;

             // Quick buttons
             const btns = document.getElementById('quick-scene-btns');
             btns.innerHTML = "";
             scenes.slice(0, 10).forEach((s, idx) => {
                 const container = document.createElement("div");
                 container.style.display = "flex";
                 container.style.flexDirection = "column";
                 container.style.gap = "4px";

                 const btn = document.createElement("button");
                 btn.className = "btn-secondary";
                 btn.innerText = (idx+1) + ". " + (s.name || "(Unbenannt)");
                 btn.onclick = () => changeActiveScene(s.id);

                 const linkWrap = document.createElement("div");
                 linkWrap.style.display = "flex";
                 linkWrap.style.gap = "2px";

                 const linkBtn = document.createElement("button");
                 linkBtn.className = "btn-icon";
                 linkBtn.style.fontSize = "0.7rem";
                 linkBtn.innerText = "🔗";
                 linkBtn.title = "Link zur Szene kopieren";
                 linkBtn.onclick = () => {
                     const url = `${location.protocol}//${location.host}/overlay/main?scene=${s.id}`;
                     navigator.clipboard.writeText(url);
                     alert("Link kopiert: " + url);
                 };

                 linkWrap.appendChild(linkBtn);
                 container.appendChild(btn);
                 container.appendChild(linkWrap);
                 btns.appendChild(container);
             });
        }

        async function changeActiveScene(id) {
            scratchConfig.overlay.activeSceneId = id;
            await fetch('/api/overlay/active-scene', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ sceneId: id })
            });
            document.getElementById('active-scene-select').value = id;
        }


        // --- OVERLAY COMPOSER ---
        async function initComposer() {
            // Load Widgets Registry
            const res = await fetch('/api/overlay/widgets');
            availableWidgets = await res.json();
            renderComposerWidgetLib();

            // Render Scene List
            renderComposerSceneList();

            // Resize Stage
            resizeComposerStage();
            window.addEventListener('resize', resizeComposerStage);

            // Select active scene by default if none selected
            if(!selectedSceneId && scratchConfig.overlay?.scenes?.length > 0) {
                selectScene(scratchConfig.overlay.scenes[0].id);
            }
        }

        function resizeComposerStage() {
            const container = document.getElementById('stage-container');
            const wrapper = document.getElementById('stage-wrapper');
            if(!container || !wrapper) return;
            const scale = Math.min((container.clientWidth - 40) / 1080, (container.clientHeight - 40) / 1920);
            wrapper.style.transform = `scale(${scale})`;
            wrapper.style.width = "1080px";
            wrapper.style.height = "1920px";
        }

        function renderComposerSceneList() {
            const list = document.getElementById('composer-scene-list');
            list.innerHTML = "";
            const scenes = scratchConfig.overlay?.scenes || [];
            scenes.forEach(s => {
                 const div = document.createElement("div");
                 div.style.padding = "8px";
                 div.style.background = (s.id === selectedSceneId) ? "rgba(255,0,80,0.2)" : "transparent";
                 div.style.border = "1px solid var(--border)";
                 div.style.borderRadius = "4px";
                 div.style.cursor = "pointer";
                 div.innerText = s.name || s.id; // Bug fix: fallback if name missing
                 div.onclick = () => selectScene(s.id);
                 list.appendChild(div);
            });
        }

        function renderComposerWidgetLib() {
            const list = document.getElementById('composer-widget-lib');
            list.innerHTML = "";
            availableWidgets.forEach(w => {
                const div = document.createElement("div");
                div.className = "chip";
                div.style.padding = "10px";
                div.style.cursor = "pointer";
                div.innerText = "+ " + w.name;
                div.onclick = () => addWidgetToScene(w);
                list.appendChild(div);
            });
        }

        function selectScene(id) {
            selectedSceneId = id;
            const s = scratchConfig.overlay.scenes.find(s=>s.id===id);
            document.getElementById('composer-current-scene-name').innerText = (s?.name || s?.id) || "Szene";
            renderComposerSceneList();
            renderStage();
            renderProps();
        }

        function addScene() {
             if(!scratchConfig.overlay.scenes) scratchConfig.overlay.scenes = [];
             const id = "scene_" + Date.now();
             scratchConfig.overlay.scenes.push({
                 id: id,
                 name: "Neue Szene",
                 width: 1080,
                 height: 1920,
                 widgets: []
             });
             selectScene(id);
        }

        function addWidgetToScene(def) {
            if(!selectedSceneId) return;
            const scene = scratchConfig.overlay.scenes.find(s=>s.id===selectedSceneId);
            const wId = "w_" + Date.now();
            scene.widgets.push({
                id: wId,
                type: def.type,
                x: 100, y: 100,
                w: def.defaultSize.w,
                h: def.defaultSize.h,
                visible: true,
                scale: 1,
                props: def.defaultProps || {}
            });
            renderStage();
        }

        function renderStage() {
            const stage = document.getElementById('stage');
            stage.innerHTML = "";
            if(!selectedSceneId) return;
            const scene = scratchConfig.overlay.scenes.find(s=>s.id===selectedSceneId);

            scene.widgets.forEach(w => {
                const el = document.createElement("div");
                el.className = "stage-widget " + (selectedWidgetId === w.id ? "selected" : "");
                el.style.left = w.x + "px";
                el.style.top = w.y + "px";
                el.style.width = w.w + "px";
                el.style.height = w.h + "px";
                el.innerText = w.type;
                el.onmousedown = (e) => startDrag(e, w.id);

                const handle = document.createElement("div");
                handle.className = "handle";
                el.appendChild(handle);

                stage.appendChild(el);
            });
        }

        // --- DRAG LOGIC (Simplified) ---
        let dragTarget = null;
        let dragStart = {x:0, y:0};
        let dragOrig = {x:0, y:0};

        function startDrag(e, wId) {
            e.stopPropagation();
            selectedWidgetId = wId;
            renderStage();
            renderProps();

            dragTarget = wId;
            dragStart = { x: e.clientX, y: e.clientY };
            const scene = scratchConfig.overlay.scenes.find(s=>s.id===selectedSceneId);
            const w = scene.widgets.find(x => x.id === wId);
            dragOrig = { x: w.x, y: w.y };

            document.addEventListener('mousemove', onDrag);
            document.addEventListener('mouseup', stopDrag);
        }

        function onDrag(e) {
             if(!dragTarget) return;
             // Calculate delta with scale factor
             // We need to know current scale of stage-wrapper
             // Simplification: we calculated scale in resizeComposerStage
             const container = document.getElementById('stage-container');
             const scale = Math.min((container.clientWidth - 40) / 1080, (container.clientHeight - 40) / 1920);

             const dx = (e.clientX - dragStart.x) / scale;
             const dy = (e.clientY - dragStart.y) / scale;

             const scene = scratchConfig.overlay.scenes.find(s=>s.id===selectedSceneId);
             const w = scene.widgets.find(x => x.id === dragTarget);

             w.x = Math.round(dragOrig.x + dx);
             w.y = Math.round(dragOrig.y + dy);
             renderStage();
             renderProps(); // Update inputs live
        }

        function stopDrag() {
            dragTarget = null;
            document.removeEventListener('mousemove', onDrag);
            document.removeEventListener('mouseup', stopDrag);
        }

        function renderProps() {
             const div = document.getElementById('composer-props');
             div.innerHTML = "";

             if(!selectedSceneId) return;

             // Scene Props
             const scene = scratchConfig.overlay.scenes.find(s=>s.id===selectedSceneId);

             div.innerHTML += `<label>Szene Name</label><input type="text" value="${scene.name}" onchange="updateSceneName(this.value)">`;
             div.innerHTML += `<hr style="width:100%; border:0; border-bottom:1px solid #333;">`;

             if(!selectedWidgetId) {
                 div.innerHTML += `<div style="color:var(--muted); font-size:0.8rem;">Wähle ein Widget aus</div>`;
                 return;
             }

             const w = scene.widgets.find(x => x.id === selectedWidgetId);
             if(!w) return;

             div.innerHTML += `
                <div class="form-row"><label>Type</label> <span>${w.type}</span></div>
                <div class="form-row"><label>X</label> <input type="number" value="${w.x}" onchange="updateWidgetProp('x', this.value)"></div>
                <div class="form-row"><label>Y</label> <input type="number" value="${w.y}" onchange="updateWidgetProp('y', this.value)"></div>
                <div class="form-row"><label>W</label> <input type="number" value="${w.w}" onchange="updateWidgetProp('w', this.value)"></div>
                <div class="form-row"><label>H</label> <input type="number" value="${w.h}" onchange="updateWidgetProp('h', this.value)"></div>
                <div class="check-group"><input type="checkbox" ${w.visible?'checked':''} onchange="updateWidgetProp('visible', this.checked)"> <span>Sichtbar</span></div>
                <button class="btn-danger" style="margin-top:20px; width:100%;" onclick="deleteWidget()">Widget löschen</button>
             `;
        }

        function updateSceneName(val) {
             const scene = scratchConfig.overlay.scenes.find(s=>s.id===selectedSceneId);
             scene.name = val;
             renderComposerSceneList();
        }

        function updateWidgetProp(prop, val) {
             const scene = scratchConfig.overlay.scenes.find(s=>s.id===selectedSceneId);
             const w = scene.widgets.find(x => x.id === selectedWidgetId);
             w[prop] = (prop==='visible') ? val : Number(val);
             renderStage();
        }

        function deleteWidget() {
             const scene = scratchConfig.overlay.scenes.find(s=>s.id===selectedSceneId);
             scene.widgets = scene.widgets.filter(x => x.id !== selectedWidgetId);
             selectedWidgetId = null;
             renderStage();
             renderProps();
        }


        // --- PREVIEW SCALING ---
        function resizePreview() {
            const container = document.getElementById('preview-container');
            const iframe = document.getElementById('preview-frame');
            if(!container || !iframe) return;

            // Container size
            const cWidth = container.clientWidth;
            const cHeight = container.clientHeight;

            // Target size (1080x1920)
            const baseW = 1080;
            const baseH = 1920;

            const scale = Math.min(cWidth / baseW, cHeight / baseH);

            iframe.style.transform = `scale(${scale})`;

            // Important: we must also force the URL if not set
            if(iframe.src === 'about:blank' || iframe.src === '') {
                 const proto = location.protocol;
                 const host = location.host;
                 iframe.src = `${proto}//${host}/overlay/main`;
            }
        }
        window.addEventListener('resize', () => {
             if(currentView === 'dashboard') resizePreview();
        });


        // --- BOOTSTRAP ---
        async function bootstrap() {
            await initSettings();
            await loadSession(); // Load session status
            showView('dashboard');
        }
        bootstrap();

        // --- WS MOCK OVERLAY (Events & Toast) ---
        const wsProto = location.protocol === 'https:' ? 'wss' : 'ws';
        const ws = new WebSocket(`${wsProto}://${location.host}/overlay/ws`);
        ws.onmessage = (msg) => {
            const data = JSON.parse(msg.data);
            if(data.kind === 'speak') {
                const u = new SpeechSynthesisUtterance(data.text);
                const t = scratchConfig.tts || {};
                u.lang = t.language || 'de-DE';
                u.volume = t.volume;
                u.rate = t.speed;
                u.pitch = t.pitch;
                window.speechSynthesis.speak(u);
            } else if (data.kind === 'toast' || data.kind === 'gift') {
                 // Clean up mock data if present
                 clearMockData();

                 // Event List Panel
                 const list = document.getElementById('event-list');
                 const d = document.createElement('div');
                 const isGift = data.kind === 'gift';
                 d.className = `log-entry ${isGift ? 'gift' : ''}`;

                 if(isGift) {
                     d.innerHTML = `
                        <div class="log-icon" style="border:1px solid var(--primary);"><img src="${data.giftIconUrl || 'https://via.placeholder.com/24'}" style="width:20px; height:20px;"></div>
                        <div class="log-content">
                            <div class="log-title">${data.from || 'User'}</div>
                            <div class="log-desc">sendet ${data.count}x ${data.giftName}</div>
                        </div>
                        <div class="log-time">${new Date().toLocaleTimeString('de-DE', {hour:'2-digit', minute:'2-digit'})}</div>
                     `;
                 } else {
                     d.innerHTML = `
                        <div class="log-icon">🔔</div>
                        <div class="log-content">
                            <div class="log-title">${data.title || 'Event'}</div>
                            <div class="log-desc">${data.text}</div>
                        </div>
                        <div class="log-time">${new Date().toLocaleTimeString('de-DE', {hour:'2-digit', minute:'2-digit'})}</div>
                     `;
                 }
                 list.prepend(d);
            } else if (data.kind === 'chat') {
                 // Clean up mock data
                 clearMockData();

                 // Chat Panel
                 const list = document.getElementById('chat-list');
                 const d = document.createElement('div');
                 d.className = "chat-bubble";
                 d.innerHTML = `
                    <img class="chat-avatar" src="${data.profilePictureUrl || ''}">
                    <div>
                        <span class="chat-name" style="color:${data.isSubscriber ? 'var(--warning)' : 'var(--text)'};">${data.nickname}:</span>
                        <span class="chat-text">${data.text}</span>
                    </div>
                 `;
                 list.prepend(d);
            } else if (data.kind === 'dashboard-update') {
                 if(document.getElementById('metric-viewers'))
                     document.getElementById('metric-viewers').innerText = data.stats?.viewers || 0;
            }
        };
