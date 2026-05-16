/**
 * CryptoBox - Main Application
 * 主应用逻辑：工具注册、路由、UI 渲染、事件绑定
 */

// ============================================================
// Tool Registry
// ============================================================

const categories = [
    { id: 'encoding', name: '编码/解码', icon: '🔤' },
    { id: 'cipher', name: '加密/解密', icon: '🔐' },
    { id: 'hash', name: '哈希计算', icon: '#️⃣' },
    { id: 'utils', name: '实用工具', icon: '🛠️' },
    { id: 'file', name: '文件工具', icon: '📁' },
];

// All registered tools
const tools = {};

function registerTools(toolModule) {
    for (const [key, tool] of Object.entries(toolModule)) {
        tools[tool.id] = tool;
    }
}

// Register all tool modules
registerTools(EncodingTools);
registerTools(HashTools);
if (typeof CipherTools !== 'undefined') registerTools(CipherTools);
if (typeof ClassicalCiphers !== 'undefined') registerTools(ClassicalCiphers);
if (typeof SM2Tools !== 'undefined') registerTools(SM2Tools);
if (typeof RSATools !== 'undefined') registerTools(RSATools);

// ============================================================
// State
// ============================================================

let currentTool = null;
let currentAction = 'encode'; // 'encode' or 'decode'

// ============================================================
// DOM References
// ============================================================

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

let dom = {};

// ============================================================
// Sidebar Rendering
// ============================================================

function renderSidebar(filter = '') {
    const nav = dom.toolNav;
    nav.innerHTML = '';

    const filterLower = filter.toLowerCase();

    categories.forEach(cat => {
        const catTools = Object.values(tools).filter(t => {
            if (t.category !== cat.id) return false;
            if (filter) {
                return t.name.toLowerCase().includes(filterLower) ||
                       t.description.toLowerCase().includes(filterLower) ||
                       t.id.toLowerCase().includes(filterLower);
            }
            return true;
        });

        if (catTools.length === 0) return;

        const catDiv = document.createElement('div');
        catDiv.className = 'nav-category';

        const header = document.createElement('div');
        header.className = 'nav-category-header';
        header.innerHTML = `<span>${cat.icon} ${cat.name}</span><span class="arrow">▼</span>`;
        header.addEventListener('click', () => {
            header.classList.toggle('collapsed');
            itemsDiv.classList.toggle('collapsed');
        });

        const itemsDiv = document.createElement('div');
        itemsDiv.className = 'nav-category-items';

        catTools.forEach(tool => {
            const item = document.createElement('div');
            item.className = 'nav-item';
            if (currentTool && currentTool.id === tool.id) {
                item.classList.add('active');
            }
            item.textContent = tool.name;
            item.title = tool.description;
            item.dataset.toolId = tool.id;
            item.addEventListener('click', () => selectTool(tool.id));
            itemsDiv.appendChild(item);
        });

        catDiv.appendChild(header);
        catDiv.appendChild(itemsDiv);
        nav.appendChild(catDiv);
    });
}

// ============================================================
// Tool Selection
// ============================================================

function selectTool(toolId) {
    const tool = tools[toolId];
    if (!tool) return;

    currentTool = tool;
    currentAction = tool.autoDetectable ? 'auto' : 'encode';

    // Update URL hash
    window.location.hash = toolId;

    // Update UI
    dom.welcomePage.classList.add('hidden');
    dom.toolWorkspace.classList.remove('hidden');
    dom.toolTitle.textContent = tool.name;

    // Update sidebar active state
    $$('.nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.toolId === toolId);
    });

    // Render tool options
    renderToolOptions(tool);

    // Clear output
    dom.outputText.value = '';
    hideMessage();

    // Close mobile sidebar
    closeMobileSidebar();
}

// ============================================================
// Tool Options Rendering
// ============================================================

function renderToolOptions(tool) {
    const container = dom.toolOptions;
    container.classList.remove('hidden');

    // Always show action toggle
    const hasAuto = tool.autoDetectable;
    let html = `
        <div class="flex items-center gap-4 mb-3${tool.options && tool.options.length > 0 ? ' pb-3 border-b border-dark-500' : ''}">
            ${hasAuto ? `
            <label class="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="action" value="auto" checked class="text-accent">
                <span class="text-sm">自动识别</span>
            </label>` : ''}
            <label class="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="action" value="encode" ${hasAuto ? '' : 'checked'} class="text-accent">
                <span class="text-sm">${getActionLabel(tool, 'encode')}</span>
            </label>
            <label class="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="action" value="decode" class="text-accent">
                <span class="text-sm">${getActionLabel(tool, 'decode')}</span>
            </label>
        </div>
    `;

    if (tool.options && tool.options.length > 0) {
        // Separate key/IV options from other options
        const keyIvOpts = tool.options.filter(o => o.id === 'key' || o.id === 'iv');
        const formatOpts = tool.options.filter(o => o.id === 'keyFormat' || o.id === 'ivFormat');
        const otherOpts = tool.options.filter(o => 
            !['key', 'iv', 'keyFormat', 'ivFormat'].includes(o.id)
        );

        // Render other options in grid
        if (otherOpts.length > 0) {
            html += `<div class="tool-options-grid">`;
            otherOpts.forEach(opt => {
                html += `<div class="option-group">`;
                html += `<label for="opt-${opt.id}">${opt.label}</label>`;
                if (opt.type === 'select') {
                    html += `<select id="opt-${opt.id}" data-option="${opt.id}">`;
                    opt.values.forEach(v => {
                        const selected = v.value === opt.default ? 'selected' : '';
                        html += `<option value="${v.value}" ${selected}>${v.label}</option>`;
                    });
                    html += `</select>`;
                } else if (opt.type === 'text') {
                    html += `<input type="text" id="opt-${opt.id}" data-option="${opt.id}" 
                        placeholder="${opt.placeholder || ''}" value="${opt.default || ''}">`;
                } else if (opt.type === 'number') {
                    html += `<input type="number" id="opt-${opt.id}" data-option="${opt.id}" 
                        value="${opt.default || ''}" min="${opt.min || ''}" max="${opt.max || ''}">`;
                }
                html += `</div>`;
            });
            html += `</div>`;
        }

        // Render key/IV as full-width rows
        keyIvOpts.forEach(opt => {
            const fmtOpt = formatOpts.find(f => f.id === opt.id + 'Format');
            html += `<div class="key-iv-row mt-3">`;
            html += `<div class="flex items-center gap-2 mb-1">`;
            html += `<label class="text-xs text-gray-400">${opt.label}</label>`;
            if (fmtOpt) {
                html += `<select id="opt-${fmtOpt.id}" data-option="${fmtOpt.id}" class="bg-dark-700 border border-dark-500 rounded text-xs px-1.5 py-0.5">`;
                fmtOpt.values.forEach(v => {
                    const selected = v.value === fmtOpt.default ? 'selected' : '';
                    html += `<option value="${v.value}" ${selected}>${v.label}</option>`;
                });
                html += `</select>`;
            }
            html += `<span class="key-length-hint" id="hint-${opt.id}"></span>`;
            html += `</div>`;
            html += `<input type="text" id="opt-${opt.id}" data-option="${opt.id}" 
                placeholder="${opt.placeholder || ''}" value="${opt.default || ''}"
                class="w-full bg-dark-700 border border-dark-500 rounded-md px-3 py-1.5 text-sm font-mono focus:outline-none focus:border-accent placeholder-gray-600">`;
            html += `</div>`;
        });
    }

    container.innerHTML = html;

    // Bind action radio events
    container.querySelectorAll('input[name="action"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            currentAction = e.target.value;
        });
    });

    // Bind key length hints
    container.querySelectorAll('input[data-option="key"], input[data-option="iv"]').forEach(input => {
        input.addEventListener('input', updateKeyLengthHint);
    });
}

function getActionLabel(tool, action) {
    if (tool.category === 'hash') {
        return action === 'encode' ? '计算哈希' : '(不可逆)';
    }
    if (tool.category === 'encoding') {
        return action === 'encode' ? '编码' : '解码';
    }
    return action === 'encode' ? '加密' : '解密';
}

function updateKeyLengthHint(e) {
    const input = e.target;
    const optId = input.dataset.option;
    const hint = $(`#hint-${optId}`);
    if (!hint) return;

    const formatSelect = $(`#opt-${optId}Format`) || $(`#opt-keyFormat`);
    const format = formatSelect ? formatSelect.value : 'utf8';
    const len = Format.getByteLength(input.value, format);

    if (len >= 0) {
        hint.textContent = `${len} 字节`;
        hint.className = 'key-length-hint ok';
    } else {
        hint.textContent = '格式错误';
        hint.className = 'key-length-hint error';
    }
}

// ============================================================
// Execution
// ============================================================

function execute() {
    if (!currentTool) return;

    let input = dom.inputText.value;

    // Auto preprocess
    if (dom.autoPreprocess.checked) {
        input = Preprocessor.process(input);
    }

    // Gather options
    const opts = {};
    dom.toolOptions.querySelectorAll('[data-option]').forEach(el => {
        opts[el.dataset.option] = el.value;
    });

    // Batch mode
    if (dom.batchMode.checked) {
        executeBatch(input, opts);
        return;
    }

    // Execute
    let action = currentAction;
    if (action === 'auto' && currentTool.autoDetectable && currentTool.detectEncoded) {
        action = currentTool.detectEncoded(input) ? 'decode' : 'encode';
        showMessage(`自动识别: ${action === 'decode' ? '检测到已编码内容，执行解码' : '执行编码'}`, 'info');
    }

    const fn = action === 'encode' ? currentTool.encode : currentTool.decode;
    if (!fn) {
        showMessage('该工具不支持此操作', 'error');
        return;
    }

    const result = fn.call(currentTool, input, opts);

    if (result.error) {
        dom.outputText.value = '';
        showMessage(result.error, 'error');
    } else {
        dom.outputText.value = result.output || '';
        // Save to history on success
        addToHistory(input, result.output, opts);
        if (action !== currentAction && currentAction === 'auto') {
            // 自动模式下显示识别结果
            showMessage(`自动识别: ${action === 'decode' ? '→ 解码' : '→ 编码'}`, 'success');
        } else if (result.info) {
            showMessage(result.info, 'info');
        } else {
            hideMessage();
        }
    }
}

function executeBatch(input, opts) {
    const lines = input.split('\n').filter(line => line.trim() !== '');

    const results = lines.map((line, idx) => {
        let action = currentAction;
        if (action === 'auto' && currentTool.autoDetectable && currentTool.detectEncoded) {
            action = currentTool.detectEncoded(line) ? 'decode' : 'encode';
        }
        const fn = action === 'encode' ? currentTool.encode : currentTool.decode;
        if (!fn) {
            return `[行${idx + 1} 错误] 不支持此操作`;
        }
        const result = fn.call(currentTool, line, opts);
        if (result.error) {
            return `[行${idx + 1} 错误] ${result.error}`;
        }
        return result.output;
    });

    dom.outputText.value = results.join('\n');
    hideMessage();
}

// ============================================================
// UI Helpers
// ============================================================

function showMessage(msg, type = 'info') {
    dom.outputMessage.textContent = msg;
    dom.outputMessage.className = `mt-2 text-xs output-msg-${type}`;
    dom.outputMessage.classList.remove('hidden');
}

function hideMessage() {
    dom.outputMessage.classList.add('hidden');
}

function showToast(msg, duration = 2000) {
    dom.toast.textContent = msg;
    dom.toast.classList.add('toast-show');
    setTimeout(() => {
        dom.toast.classList.remove('toast-show');
    }, duration);
}

function closeMobileSidebar() {
    dom.sidebar.classList.remove('open');
    const overlay = $('.sidebar-overlay');
    if (overlay) overlay.remove();
}

// ============================================================
// Event Bindings
// ============================================================

function bindEvents() {
    // Execute button
    dom.btnExecute.addEventListener('click', execute);

    // Swap input/output
    dom.btnSwap.addEventListener('click', () => {
        const temp = dom.inputText.value;
        dom.inputText.value = dom.outputText.value;
        dom.outputText.value = temp;
    });

    // Clear all
    dom.btnClearAll.addEventListener('click', () => {
        dom.inputText.value = '';
        dom.outputText.value = '';
        hideMessage();
    });

    // Clear input
    dom.btnClearInput.addEventListener('click', () => {
        dom.inputText.value = '';
    });

    // Copy output
    dom.btnCopy.addEventListener('click', () => {
        const text = dom.outputText.value;
        if (!text) return;
        navigator.clipboard.writeText(text).then(() => {
            showToast('已复制到剪贴板');
        }).catch(() => {
            // Fallback
            dom.outputText.select();
            document.execCommand('copy');
            showToast('已复制到剪贴板');
        });
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Ctrl+Enter: Execute
        if (e.ctrlKey && e.key === 'Enter') {
            e.preventDefault();
            execute();
        }
        // Ctrl+L: Clear all
        if (e.ctrlKey && e.key === 'l') {
            e.preventDefault();
            dom.inputText.value = '';
            dom.outputText.value = '';
            hideMessage();
        }
        // Ctrl+K: Focus search
        if (e.ctrlKey && e.key === 'k') {
            e.preventDefault();
            dom.globalSearch.focus();
        }
        // Escape: Close search / mobile sidebar
        if (e.key === 'Escape') {
            dom.globalSearch.blur();
            closeMobileSidebar();
        }
    });

    // Global search
    dom.globalSearch.addEventListener('input', (e) => {
        renderSidebar(e.target.value);
    });

    dom.globalSearch.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            // Select first visible tool
            const firstItem = dom.toolNav.querySelector('.nav-item');
            if (firstItem) {
                selectTool(firstItem.dataset.toolId);
                dom.globalSearch.value = '';
                dom.globalSearch.blur();
                renderSidebar();
            }
        }
    });

    // Sidebar toggle (mobile)
    dom.sidebarToggle.addEventListener('click', () => {
        const isOpen = dom.sidebar.classList.contains('open');
        if (isOpen) {
            closeMobileSidebar();
        } else {
            dom.sidebar.classList.add('open');
            // Add overlay
            const overlay = document.createElement('div');
            overlay.className = 'sidebar-overlay';
            overlay.addEventListener('click', closeMobileSidebar);
            document.body.appendChild(overlay);
        }
    });

    // Hash route
    window.addEventListener('hashchange', () => {
        const hash = window.location.hash.slice(1);
        if (hash && tools[hash]) {
            selectTool(hash);
        }
    });
}

// ============================================================
// Initialization
// ============================================================

function init() {
    // Initialize DOM references
    dom = {
        sidebar: $('#sidebar'),
        sidebarToggle: $('#sidebar-toggle'),
        toolNav: $('#tool-nav'),
        welcomePage: $('#welcome-page'),
        toolWorkspace: $('#tool-workspace'),
        toolTitle: $('#tool-title'),
        toolOptions: $('#tool-options'),
        inputText: $('#input-text'),
        outputText: $('#output-text'),
        inputFormat: $('#input-format'),
        outputFormat: $('#output-format'),
        btnExecute: $('#btn-execute'),
        btnSwap: $('#btn-swap'),
        btnClearAll: $('#btn-clear-all'),
        btnClearInput: $('#btn-clear-input'),
        btnCopy: $('#btn-copy'),
        autoPreprocess: $('#auto-preprocess'),
        batchMode: $('#batch-mode'),
        outputMessage: $('#output-message'),
        globalSearch: $('#global-search'),
        toast: $('#toast'),
        historyPanel: $('#history-panel'),
        historyList: $('#history-list'),
        historyToggle: $('#history-toggle'),
        btnClearHistory: $('#btn-clear-history'),
    };

    renderSidebar();
    bindEvents();
    bindHistoryEvents();
    renderHistory();

    // Check URL hash for initial tool
    const hash = window.location.hash.slice(1);
    if (hash && tools[hash]) {
        selectTool(hash);
    }

    // Auto-preprocess default on
    dom.autoPreprocess.checked = true;

    console.log(`[CryptoBox] Loaded ${Object.keys(tools).length} tools`);
}

// ============================================================
// History Panel
// ============================================================

function renderHistory() {
    if (!dom.historyList) return;
    const items = History.getAll();

    if (items.length === 0) {
        dom.historyList.innerHTML = '<div class="text-center text-xs text-gray-600 py-8">暂无历史记录</div>';
        return;
    }

    dom.historyList.innerHTML = items.map(item => {
        const keyDisplay = item.key ? `<div class="history-card-key">Key: ${escapeHtml(item.key)}</div>` : '';
        const ivDisplay = item.iv ? `<div class="history-card-key">IV: ${escapeHtml(item.iv)}</div>` : '';
        return `
            <div class="history-card" data-history-id="${item.id}">
                <div class="history-card-header">
                    <span class="history-card-tool">${item.toolName}</span>
                    <span class="history-card-time">${History.formatTime(item.timestamp)}</span>
                </div>
                <div class="history-card-content">
                    <div><span class="label">输入:</span><span class="value">${escapeHtml(item.input.substring(0, 40))}</span></div>
                    <div><span class="label">输出:</span><span class="value">${escapeHtml(item.output.substring(0, 40))}</span></div>
                    ${keyDisplay}
                    ${ivDisplay}
                </div>
                <div class="history-card-actions">
                    <button class="restore" data-action="restore" title="恢复此操作">恢复</button>
                    <button class="delete" data-action="delete" title="删除">删除</button>
                </div>
            </div>
        `;
    }).join('');
}

function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function addToHistory(input, output, opts) {
    if (!currentTool || !output) return;
    History.add({
        toolId: currentTool.id,
        toolName: currentTool.name,
        action: currentAction,
        input: input,
        output: output,
        opts: opts,
    });
    renderHistory();
}

function restoreFromHistory(id) {
    const items = History.getAll();
    const item = items.find(i => i.id === id);
    if (!item) return;

    // Switch to the tool
    if (tools[item.toolId]) {
        selectTool(item.toolId);
    }

    // Restore input
    dom.inputText.value = item.input;

    // Restore options (key, iv, etc.)
    setTimeout(() => {
        if (item.opts) {
            Object.entries(item.opts).forEach(([key, value]) => {
                const el = document.querySelector(`[data-option="${key}"]`);
                if (el && value) el.value = value;
            });
        }
    }, 50);

    showToast('已恢复历史操作');
}

function bindHistoryEvents() {
    // Toggle history panel
    if (dom.historyToggle) {
        dom.historyToggle.addEventListener('click', () => {
            const panel = dom.historyPanel;
            if (panel.classList.contains('open') || !panel.classList.contains('hidden')) {
                panel.classList.add('hidden');
                panel.classList.remove('open');
                dom.historyToggle.style.display = '';
            } else {
                panel.classList.remove('hidden');
                panel.classList.add('open');
                dom.historyToggle.style.display = 'none';
            }
        });
    }

    // Clear history
    if (dom.btnClearHistory) {
        dom.btnClearHistory.addEventListener('click', () => {
            History.clear();
            renderHistory();
            showToast('历史记录已清空');
        });
    }

    // History list click delegation
    if (dom.historyList) {
        dom.historyList.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-action]');
            if (!btn) return;

            const card = btn.closest('[data-history-id]');
            if (!card) return;

            const id = card.dataset.historyId;
            const action = btn.dataset.action;

            if (action === 'restore') {
                restoreFromHistory(id);
            } else if (action === 'delete') {
                History.remove(id);
                renderHistory();
                showToast('已删除');
            }
        });
    }

    // Ctrl+H toggle history
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'h') {
            e.preventDefault();
            if (dom.historyToggle) dom.historyToggle.click();
        }
    });
}

// Start - handle both cases: DOMContentLoaded already fired or not
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
