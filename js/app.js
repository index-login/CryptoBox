/**
 * CryptoBox - Main Application
 * 主应用逻辑：工具注册、路由、UI 渲染、事件绑定
 */

import Format from './core/format.js';
import Preprocessor from './core/preprocessor.js';
import EncodingTools from './lib/encoding.js';
import HashTools from './lib/hash.js';

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

const dom = {
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
};

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
    currentAction = 'encode';

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
    let html = `
        <div class="flex items-center gap-4 mb-3${tool.options && tool.options.length > 0 ? ' pb-3 border-b border-dark-500' : ''}">
            <label class="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="action" value="encode" checked class="text-accent">
                <span class="text-sm">${getActionLabel(tool, 'encode')}</span>
            </label>
            <label class="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="action" value="decode" class="text-accent">
                <span class="text-sm">${getActionLabel(tool, 'decode')}</span>
            </label>
        </div>
    `;

    if (tool.options && tool.options.length > 0) {
        html += `<div class="tool-options-grid">`;

        tool.options.forEach(opt => {
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
            if (opt.id === 'key' || opt.id === 'iv') {
                html += `<span class="key-length-hint" id="hint-${opt.id}"></span>`;
            }
        } else if (opt.type === 'number') {
            html += `<input type="number" id="opt-${opt.id}" data-option="${opt.id}" 
                value="${opt.default || ''}" min="${opt.min || ''}" max="${opt.max || ''}">`;
        }

        html += `</div>`;
    });

        html += `</div>`;
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
    const fn = currentAction === 'encode' ? currentTool.encode : currentTool.decode;
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
        if (result.info) {
            showMessage(result.info, 'info');
        } else {
            hideMessage();
        }
    }
}

function executeBatch(input, opts) {
    const lines = input.split('\n').filter(line => line.trim() !== '');
    const fn = currentAction === 'encode' ? currentTool.encode : currentTool.decode;

    if (!fn) {
        showMessage('该工具不支持此操作', 'error');
        return;
    }

    const results = lines.map((line, idx) => {
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
    renderSidebar();
    bindEvents();

    // Check URL hash for initial tool
    const hash = window.location.hash.slice(1);
    if (hash && tools[hash]) {
        selectTool(hash);
    }

    // Auto-preprocess default on
    dom.autoPreprocess.checked = true;

    console.log(`[CryptoBox] Loaded ${Object.keys(tools).length} tools`);
}

// Start
document.addEventListener('DOMContentLoaded', init);
