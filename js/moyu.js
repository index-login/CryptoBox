/* =========================================================
 * 摸鱼小站 —— 摸鱼日历 + 游戏中心 tab
 * 游戏本体各自独立：js/moyu-flappy.js / js/moyu-golf.js
 * 专属配置在 moyu.html 的 MOYU_CONFIG 里，改那个就行
 * ========================================================= */
(function () {
    'use strict';

    const CFG = window.MOYU_CONFIG || {};
    const NAME = CFG.name || '摸鱼人';
    const OFF_H = CFG.offWorkHour != null ? CFG.offWorkHour : 18;
    const OFF_M = CFG.offWorkMinute != null ? CFG.offWorkMinute : 0;
    const FESTIVALS = CFG.festivals || [];
    const QUOTES = CFG.quotes && CFG.quotes.length ? CFG.quotes : ['今天也要开心地摸鱼哦 ~'];

    const $ = (id) => document.getElementById(id);
    const pad = (n) => String(n).padStart(2, '0');

    /* ==================== 专属问候 ==================== */

    $('site-title').textContent = `🐟 ${NAME}的摸鱼小站`;
    document.title = `🐟 ${NAME}的摸鱼小站`;

    /* ==================== 摸鱼日历 ==================== */

    const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0]; // 周一 → 周日
    const WEEK_LABEL = ['日', '一', '二', '三', '四', '五', '六'];

    function renderWeekDots() {
        const wrap = $('week-dots');
        wrap.innerHTML = '';
        const today = new Date().getDay();
        WEEK_ORDER.forEach((d) => {
            const dot = document.createElement('div');
            dot.className = 'flex-1 h-1.5 rounded-full ' +
                (d === today ? 'bg-accent' : (d === 0 || d === 6) ? 'bg-red-500/20' : 'bg-dark-600');
            dot.title = `周${WEEK_LABEL[d]}${d === today ? '（今天）' : ''}`;
            wrap.appendChild(dot);
        });
        $('week-progress-text').textContent = `本周第 ${WEEK_ORDER.indexOf(today) + 1} 天`;
    }

    function updateCalendar() {
        const now = new Date();

        // 实时时钟
        $('clock').textContent = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
        $('today-line').textContent =
            `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 · 星期${WEEK_LABEL[now.getDay()]}`;

        // 下班倒计时
        const isWeekend = now.getDay() === 0 || now.getDay() === 6;
        const offValue = $('offwork-value');
        const offNote = $('offwork-note');
        if (isWeekend) {
            offValue.textContent = '🎉';
            offNote.textContent = '今天周末，光明正大不摸鱼';
        } else {
            const off = new Date(now.getFullYear(), now.getMonth(), now.getDate(), OFF_H, OFF_M, 0);
            if (now >= off) {
                offValue.textContent = '自由啦';
                offNote.textContent = '已下班，快乐摸鱼 ~';
            } else {
                let s = Math.floor((off - now) / 1000);
                const h = Math.floor(s / 3600); s %= 3600;
                const m = Math.floor(s / 60);
                offValue.textContent = `${pad(h)}:${pad(m)}:${pad(s % 60)}`;
                offNote.textContent = '坚持住，摸鱼就是胜利';
            }
        }

        // 下一个节日
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        let next = null;
        for (const f of FESTIVALS) {
            const d = new Date(f.date + 'T00:00:00');
            if (isNaN(d.getTime())) continue;
            if (d >= todayStart && (!next || d < next.d)) next = { name: f.name, d };
        }
        if (next) {
            const days = Math.round((next.d - todayStart) / 86400000);
            $('festival-name').textContent = next.name;
            $('festival-note').textContent = days === 0 ? '就是今天！🎉' : `还有 ${days} 天`;
        } else {
            $('festival-name').textContent = '—';
            $('festival-note').textContent = '节日表该更新啦';
        }

        // 今日语录（按天轮换，{name} 替换为专属称呼）
        const dayOfYear = Math.floor((todayStart - new Date(now.getFullYear(), 0, 1)) / 86400000) + 1;
        $('daily-quote').textContent = QUOTES[dayOfYear % QUOTES.length].replaceAll('{name}', NAME);
    }

    renderWeekDots();
    updateCalendar();
    setInterval(updateCalendar, 1000);

    /* ==================== Toast ==================== */

    let toastTimer = null;
    function showToast(msg) {
        const t = $('toast');
        t.textContent = msg;
        t.classList.add('toast-show');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => t.classList.remove('toast-show'), 2200);
    }
    window.moyuToast = showToast; // 给 moyu-flappy.js / moyu-golf.js / moyu-fun.js 共用

    /* ==================== 游戏中心 tab 切换 ==================== */

    // 新增游戏时在两头各加一项即可（tab 按钮 id，面板 id）
    const GAME_TABS = [
        ['tab-flappy', 'game-flappy'],
        ['tab-golf', 'game-golf'],
    ];

    function switchTab(tabId) {
        GAME_TABS.forEach(([tid, pid]) => {
            const active = tid === tabId;
            $(pid).classList.toggle('hidden', !active);
            $(tid).classList.toggle('active', active);
        });
    }
    GAME_TABS.forEach(([tid]) => {
        $(tid).addEventListener('click', () => switchTab(tid));
    });
})();
