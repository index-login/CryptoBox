/* =========================================================
 * 摸鱼小站趣味件：今天吃什么 / 指尖仙女棒 / 爱心氛围特效
 * 三个功能共用 fx-canvas 一个粒子层，无粒子时自动休眠省电
 * ========================================================= */
(function () {
    'use strict';

    const CFG = window.MOYU_CONFIG || {};
    const $ = (id) => document.getElementById(id);
    const toast = window.moyuToast || (() => {});
    const EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';

    /* ============ 粒子层（爱心 + 火花） ============ */

    const fx = $('fx-canvas');
    const fctx = fx.getContext('2d');
    const particles = [];
    let fw = 0, fh = 0, dpr = 1, rafOn = false, lastT = 0;
    const HEART_EMOJIS = ['💗', '💕', '💖', '❤️', '💞'];
    const SPARK_COLORS = ['#ffd700', '#ff9f43', '#ff6b9d', '#ffffff', '#ffe66d'];

    function sizeFx() {
        dpr = window.devicePixelRatio || 1;
        fw = window.innerWidth;
        fh = window.innerHeight;
        fx.width = Math.round(fw * dpr);
        fx.height = Math.round(fh * dpr);
    }
    sizeFx();
    window.addEventListener('resize', sizeFx);

    function ensureLoop() {
        if (rafOn) return;
        rafOn = true;
        lastT = performance.now();
        requestAnimationFrame(tick);
    }

    function heartBurst(x, y, count, opts = {}) {
        for (let i = 0; i < count; i++) {
            if (particles.length > 420) particles.shift();
            particles.push({
                type: 'heart',
                emoji: HEART_EMOJIS[Math.floor(Math.random() * HEART_EMOJIS.length)],
                x: x + (Math.random() - 0.5) * 20,
                y: y + (Math.random() - 0.5) * 10,
                vx: (Math.random() - 0.5) * 0.06,
                vy: opts.fall ? 0.12 + Math.random() * 0.1 : -(0.06 + Math.random() * 0.09),
                size: opts.size || (11 + Math.random() * 12),
                life: opts.life || (900 + Math.random() * 500),
                maxLife: opts.life || 1400,
                sway: Math.random() * Math.PI * 2,
            });
        }
        ensureLoop();
    }

    function sparkBurst(x, y, count, spread) {
        for (let i = 0; i < count; i++) {
            if (particles.length > 420) particles.shift();
            const ang = Math.random() * Math.PI * 2;
            const sp = (0.04 + Math.random() * 0.18) * spread;
            particles.push({
                type: 'spark',
                color: SPARK_COLORS[Math.floor(Math.random() * SPARK_COLORS.length)],
                x, y,
                vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp - 0.03,
                r: 1.2 + Math.random() * 2.2,
                life: 320 + Math.random() * 320,
                maxLife: 640,
            });
        }
        ensureLoop();
    }

    function tick(now) {
        const dt = Math.min(now - lastT, 50);
        lastT = now;
        fctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        fctx.clearRect(0, 0, fw, fh);
        fctx.textAlign = 'center';
        fctx.textBaseline = 'middle';
        let alive = false;
        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.life -= dt;
            if (p.life <= 0) { particles.splice(i, 1); continue; }
            alive = true;
            fctx.globalAlpha = Math.max(0, Math.min(p.life / p.maxLife, 1));
            if (p.type === 'heart') {
                p.sway += 0.004 * dt;
                p.x += (p.vx + Math.sin(p.sway) * 0.025) * dt;
                p.y += p.vy * dt;
                fctx.font = Math.round(p.size) + 'px ' + EMOJI_FONT;
                fctx.fillText(p.emoji, p.x, p.y);
            } else {
                p.vy += 0.00035 * dt;
                p.x += p.vx * dt;
                p.y += p.vy * dt;
                fctx.fillStyle = p.color;
                fctx.shadowColor = p.color;
                fctx.shadowBlur = 8;
                fctx.beginPath();
                fctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                fctx.fill();
                fctx.shadowBlur = 0;
            }
        }
        fctx.globalAlpha = 1;
        if (alive) {
            requestAnimationFrame(tick);
        } else {
            rafOn = false;
            fctx.clearRect(0, 0, fw, fh);
        }
    }

    /* ============ 爱心氛围：点击冒爱心 + 开屏爱心雨 ============ */

    document.addEventListener('pointerdown', (e) => {
        if (window.__moyuSparkOn) return; // 仙女棒模式下不叠加爱心
        heartBurst(e.clientX, e.clientY, 3, { size: 10 + Math.random() * 8 });
    }, { passive: true });

    // 开屏爱心雨（轻量，2 秒左右结束）
    for (let i = 0; i < 36; i++) {
        setTimeout(() => {
            heartBurst(Math.random() * window.innerWidth, -16, 1, {
                fall: true, size: 10 + Math.random() * 16, life: 2200,
            });
        }, i * 55);
    }

    /* ============ 指尖仙女棒 ============ */

    const shield = $('spark-shield');
    const sparkBtn = $('btn-sparkler');
    const sparkHint = $('spark-hint');
    let sparkOn = false;
    let lastTrail = 0;

    function setSparkler(on) {
        sparkOn = on;
        window.__moyuSparkOn = on;
        shield.style.display = on ? 'block' : 'none';
        sparkHint.classList.toggle('hidden', !on);
        sparkBtn.classList.toggle('on', on);
        document.body.style.overflow = on ? 'hidden' : ''; // 烟花模式锁滚动
        if (on) sparkBurst(window.innerWidth / 2, window.innerHeight / 2, 26, 1.4);
    }

    sparkBtn.addEventListener('click', () => setSparkler(!sparkOn));

    shield.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        if (shield.setPointerCapture) {
            try { shield.setPointerCapture(e.pointerId); } catch (err) { /* 忽略 */ }
        }
        sparkBurst(e.clientX, e.clientY, 22, 1.2);
    });
    shield.addEventListener('pointermove', (e) => {
        const now = performance.now();
        if (now - lastTrail < 16) return; // 拖尾节流
        lastTrail = now;
        sparkBurst(e.clientX, e.clientY, 3, 0.5);
    });

    /* ============ 今天吃什么 ============ */

    // 菜单优先读手机里保存的（编辑菜单改过），没有就用 CONFIG 默认
    const DEFAULT_MENU = CFG.menu && CFG.menu.length ? CFG.menu.slice() : ['食堂随便吃点'];
    const MENU_KEY = 'moyu-food-menu';
    let MENU = loadMenu();

    function loadMenu() {
        try {
            const raw = localStorage.getItem(MENU_KEY);
            if (raw) {
                const arr = JSON.parse(raw);
                if (Array.isArray(arr)) {
                    const cleaned = arr.filter((x) => typeof x === 'string' && x.trim());
                    if (cleaned.length) return cleaned;
                }
            }
        } catch (err) { /* 隐私模式/数据损坏，退回默认 */ }
        return DEFAULT_MENU.slice();
    }
    function saveMenu() {
        try { localStorage.setItem(MENU_KEY, JSON.stringify(MENU)); } catch (err) { /* 忽略 */ }
    }

    const foodBtn = $('btn-food');
    const foodResult = $('food-result');
    let rolling = false;
    let lastPick = null;

    foodBtn.addEventListener('click', () => {
        if (rolling) return;
        if (!MENU.length) { toast('菜单空啦，先去加个菜 🍽️'); return; }
        rolling = true;
        const start = Date.now();
        const timer = setInterval(() => {
            // 轮盘滚动 1.2 秒后定格
            foodResult.textContent = MENU[Math.floor(Math.random() * MENU.length)] + ' ？';
            if (Date.now() - start >= 1200) {
                clearInterval(timer);
                let pick = MENU[Math.floor(Math.random() * MENU.length)];
                if (MENU.length > 1) {
                    let guard = 0;
                    while (pick === lastPick && guard++ < 20) pick = MENU[Math.floor(Math.random() * MENU.length)];
                }
                lastPick = pick;
                foodResult.textContent = `今天就去吃「${pick}」！🥢`;
                rolling = false;
                toast('已选定：' + pick + ' 🍜');
            }
        }, 80);
    });

    /* ---- 编辑菜单弹层 ---- */

    const editor = $('menu-editor');
    const chipsEl = $('menu-chips');
    const menuInput = $('menu-input');

    function renderChips() {
        chipsEl.innerHTML = '';
        MENU.forEach((item) => {
            const chip = document.createElement('span');
            chip.className = 'inline-flex items-center gap-1.5 bg-dark-700 border border-dark-500 rounded-full pl-3 pr-1.5 py-1 text-xs text-gray-300';
            const label = document.createElement('span');
            label.textContent = item;
            const del = document.createElement('button');
            del.type = 'button';
            del.textContent = '×';
            del.setAttribute('aria-label', '删除' + item);
            del.className = 'w-[18px] h-[18px] flex items-center justify-center rounded-full bg-dark-600 text-gray-500 hover:text-red-400 text-[11px] leading-none transition-colors';
            del.addEventListener('click', () => {
                if (MENU.length <= 1) { toast('至少留一个菜吧 🙏'); return; }
                MENU = MENU.filter((x) => x !== item);
                saveMenu();
                renderChips();
            });
            chip.appendChild(label);
            chip.appendChild(del);
            chipsEl.appendChild(chip);
        });
        $('menu-count').textContent = `共 ${MENU.length} 个菜`;
    }

    function openEditor() {
        renderChips();
        menuInput.value = '';
        editor.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }
    function closeEditor() {
        editor.classList.add('hidden');
        document.body.style.overflow = '';
    }
    function addMenuItem() {
        const v = (menuInput.value || '').trim();
        if (!v) return;
        if (MENU.includes(v)) { toast('菜单里已经有啦 😋'); menuInput.value = ''; return; }
        if (MENU.length >= 30) { toast('菜太多啦，先删几个 🤣'); return; }
        MENU.push(v);
        menuInput.value = '';
        saveMenu();
        renderChips();
    }

    $('btn-menu-edit').addEventListener('click', openEditor);
    $('btn-menu-close').addEventListener('click', closeEditor);
    $('btn-menu-add').addEventListener('click', addMenuItem);
    menuInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') addMenuItem();
    });
    $('btn-menu-reset').addEventListener('click', () => {
        MENU = DEFAULT_MENU.slice();
        saveMenu();
        renderChips();
        toast('已恢复默认菜单 ↺');
    });
    editor.addEventListener('click', (e) => {
        if (e.target === editor) closeEditor(); // 点遮罩关闭
    });
})();
