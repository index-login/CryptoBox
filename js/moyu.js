/* =========================================================
 * 摸鱼小站 —— 摸鱼日历 + 合成爱心小游戏
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
    const BEST_KEY = 'moyu-best-score';

    const $ = (id) => document.getElementById(id);
    const pad = (n) => String(n).padStart(2, '0');
    const debounce = (fn, ms) => {
        let t = null;
        return (...args) => {
            clearTimeout(t);
            t = setTimeout(() => fn(...args), ms);
        };
    };

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

    /* ==================== 合成爱心小游戏 ==================== */

    if (typeof Matter === 'undefined') {
        $('game-wrap').innerHTML =
            '<div class="p-8 text-center text-sm text-gray-500">物理引擎加载失败，请检查网络后刷新重试</div>';
        return;
    }

    const { Engine, Bodies, Body, Composite, Events } = Matter;

    // 11 级爱心，r 是相对画布宽度的半径比例
    const HEARTS = [
        { e: '🤍', r: 0.034 },
        { e: '💙', r: 0.047 },
        { e: '💚', r: 0.061 },
        { e: '💛', r: 0.077 },
        { e: '🧡', r: 0.095 },
        { e: '❤️', r: 0.115 },
        { e: '💖', r: 0.137 },
        { e: '💘', r: 0.161 },
        { e: '💞', r: 0.187 },
        { e: '💝', r: 0.215 },
        { e: '💍', r: 0.245 },
    ];
    // 合成出第 index 级的得分（💍 + 💍 额外奖励 150）
    const MERGE_SCORE = [0, 2, 5, 9, 14, 20, 27, 35, 44, 54, 80];
    const MAX_LEVEL_BONUS = 150;
    // 分数档位彩蛋（游戏结束弹层，从高往低匹配）
    const EASTER_EGGS = [
        { min: 1000, text: `${NAME}是全宇宙最会摸鱼的人！` },
        { min: 600, text: '摸鱼大师非你莫属 👑' },
        { min: 300, text: '老板来了也不慌，稳住 💪' },
        { min: 100, text: '摸鱼技术渐入佳境 ✨' },
        { min: 0, text: '摸鱼新手，下局一定行 💪' },
    ];
    const MILESTONES = [
        { at: 500, text: '摸鱼小成！老板还没发现 👀' },
        { at: 1000, text: '千分达成！今天必须早点下班 🍉' },
    ];

    const Game = {
        engine: null, walls: null,
        canvas: null, ctx: null,
        W: 0, H: 0, dpr: 1,
        over: false, score: 0, best: 0,
        nextLevel: 0,
        aimX: null, aiming: false, lastDrop: -1000,
        mergeQueue: [],
        particles: [],
        overTimer: 0,
        acc: 0, lastTime: 0,
        milestoneHit: new Set(),
    };

    const heartRadius = (lvl) => HEARTS[lvl].r * Game.W;
    const clampX = (x, r) => Math.min(Math.max(x, r + 2), Game.W - r - 2);

    function rollNext() {
        // 随机出前 5 级，小的更常见
        const r = Math.random();
        Game.nextLevel = r < 0.34 ? 0 : r < 0.60 ? 1 : r < 0.80 ? 2 : r < 0.93 ? 3 : 4;
    }

    function updateHud() {
        $('game-score').textContent = Game.score;
        $('game-best').textContent = Game.best;
        $('game-next').textContent = HEARTS[Game.nextLevel].e;
    }

    /* ---------- 画布与边界 ---------- */

    function buildWalls() {
        Composite.clear(Game.walls, false);
        const T = 200;
        const opts = { isStatic: true, friction: 0.4, restitution: 0.05 };
        const floor = Bodies.rectangle(Game.W / 2, Game.H + T / 2 - 4, Game.W * 2, T, opts);
        const left = Bodies.rectangle(-T / 2 + 2, Game.H / 2, T, Game.H * 4, opts);
        const right = Bodies.rectangle(Game.W + T / 2 - 2, Game.H / 2, T, Game.H * 4, opts);
        Composite.add(Game.walls, [floor, left, right]);
    }

    function resizeGame(initial) {
        const oldW = Game.W, oldH = Game.H;
        const cssW = $('game-wrap').clientWidth;
        const cssH = Math.min(Math.round(cssW * 1.15), Math.round(window.innerHeight * 0.62));
        Game.dpr = window.devicePixelRatio || 1;
        Game.canvas.width = Math.round(cssW * Game.dpr);
        Game.canvas.height = Math.round(cssH * Game.dpr);
        Game.canvas.style.height = cssH + 'px';
        Game.W = cssW;
        Game.H = cssH;
        buildWalls();
        if (!initial && oldW > 0) {
            // 旋转/缩放时按比例迁移已有爱心
            const sx = cssW / oldW, sy = cssH / oldH;
            const s = (sx + sy) / 2;
            Composite.allBodies(Game.engine.world).forEach((b) => {
                if (!b.plugin || b.plugin.level === undefined) return;
                Body.scale(b, s, s);
                Body.setPosition(b, { x: b.position.x * sx, y: b.position.y * sy });
            });
        }
        if (Game.aimX !== null) Game.aimX = clampX(Game.aimX, heartRadius(Game.nextLevel));
    }

    /* ---------- 投放与合成 ---------- */

    function bindInput() {
        const c = Game.canvas;
        const getX = (e) => e.clientX - c.getBoundingClientRect().left;

        c.addEventListener('pointerdown', (e) => {
            if (Game.over) return;
            e.preventDefault();
            if (c.setPointerCapture) c.setPointerCapture(e.pointerId);
            Game.aiming = true;
            Game.aimX = clampX(getX(e), heartRadius(Game.nextLevel));
        });
        c.addEventListener('pointermove', (e) => {
            if (!Game.aiming || Game.over) return;
            e.preventDefault();
            Game.aimX = clampX(getX(e), heartRadius(Game.nextLevel));
        });
        c.addEventListener('pointerup', (e) => {
            if (!Game.aiming || Game.over) return;
            e.preventDefault();
            Game.aiming = false;
            tryDrop();
        });
        c.addEventListener('pointercancel', () => { Game.aiming = false; });
    }

    function tryDrop() {
        const now = performance.now();
        if (now - Game.lastDrop < 380) return;
        Game.lastDrop = now;
        const lvl = Game.nextLevel;
        const r = heartRadius(lvl);
        const body = Bodies.circle(clampX(Game.aimX, r), r + 6, r, {
            restitution: 0.12, friction: 0.35, frictionStatic: 0.6, frictionAir: 0.008,
        });
        body.plugin = { level: lvl, bornAt: now };
        Composite.add(Game.engine.world, body);
        rollNext();
        if (Game.aimX !== null) Game.aimX = clampX(Game.aimX, heartRadius(Game.nextLevel));
        updateHud();
    }

    function onCollide(e) {
        if (Game.over) return;
        for (const pair of e.pairs) {
            const a = pair.bodyA, b = pair.bodyB;
            const la = a.plugin && a.plugin.level, lb = b.plugin && b.plugin.level;
            if (la === undefined || la !== lb) continue;
            if (a.plugin.merging || b.plugin.merging) continue;
            a.plugin.merging = b.plugin.merging = true;
            Game.mergeQueue.push(a, b);
        }
    }

    function processMerges() {
        while (Game.mergeQueue.length) {
            const a = Game.mergeQueue.shift(), b = Game.mergeQueue.shift();
            if (a.plugin.dead || b.plugin.dead) continue;
            const lvl = a.plugin.level;
            const mx = (a.position.x + b.position.x) / 2;
            const my = (a.position.y + b.position.y) / 2;
            Composite.remove(Game.engine.world, a);
            Composite.remove(Game.engine.world, b);
            a.plugin.dead = b.plugin.dead = true;

            if (lvl >= HEARTS.length - 1) {
                // 💍 + 💍：满级彩蛋
                addScore(MAX_LEVEL_BONUS, mx, my);
                burst(mx, my, '💍', 18);
                showToast('两个戒指合在一起，是双倍的闪亮 💍✨');
            } else {
                const nl = lvl + 1;
                const r = heartRadius(nl);
                const nb = Bodies.circle(clampX(mx, r), Math.min(my, Game.H - r - 6), r, {
                    restitution: 0.12, friction: 0.35, frictionStatic: 0.6, frictionAir: 0.008,
                });
                nb.plugin = { level: nl, bornAt: performance.now() };
                Composite.add(Game.engine.world, nb);
                addScore(MERGE_SCORE[nl], mx, my);
                burst(mx, my, HEARTS[nl].e, 10);
            }
            if (navigator.vibrate) navigator.vibrate(18);
        }
    }

    /* ---------- 分数 / 特效 / 结束 ---------- */

    function addScore(n, x, y) {
        Game.score += n;
        if (Game.score > Game.best) {
            Game.best = Game.score;
            try { localStorage.setItem(BEST_KEY, String(Game.best)); } catch (err) { /* 隐私模式忽略 */ }
        }
        Game.particles.push({ type: 'text', text: '+' + n, x, y, vy: -0.05, life: 900, maxLife: 900 });
        for (const m of MILESTONES) {
            if (Game.score >= m.at && !Game.milestoneHit.has(m.at)) {
                Game.milestoneHit.add(m.at);
                showToast(m.text);
            }
        }
        updateHud();
    }

    function burst(x, y, emoji, count) {
        for (let i = 0; i < count; i++) {
            const ang = Math.random() * Math.PI * 2;
            const sp = 0.08 + Math.random() * 0.22;
            Game.particles.push({
                type: 'burst', emoji, x, y,
                vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp - 0.1,
                life: 500 + Math.random() * 300, maxLife: 800,
                size: 10 + Math.random() * 10,
            });
        }
    }

    function updateParticles(dt) {
        for (let i = Game.particles.length - 1; i >= 0; i--) {
            const p = Game.particles[i];
            p.life -= dt;
            if (p.life <= 0) { Game.particles.splice(i, 1); continue; }
            if (p.type === 'burst') {
                p.vy += 0.0006 * dt;
                p.x += p.vx * dt;
                p.y += p.vy * dt;
            } else {
                p.y += p.vy * dt;
            }
        }
    }

    function checkGameOver(dt) {
        const dangerY = Game.H * 0.15;
        const now = performance.now();
        let offender = false;
        Composite.allBodies(Game.engine.world).forEach((b) => {
            if (!b.plugin || b.plugin.level === undefined) return;
            if (now - b.plugin.bornAt < 1500) return; // 刚投放的宽限期
            if (b.position.y - b.circleRadius < dangerY) offender = true;
        });
        // 越线累计计时；未越线时按 2 倍速衰减，轻微晃动不会把进度清零
        Game.overTimer = offender ? Game.overTimer + dt : Math.max(0, Game.overTimer - dt * 2);
        if (Game.overTimer > 2000) endGame();
    }

    function endGame() {
        Game.over = true;
        $('game-over-score').textContent = Game.score;
        $('game-over-best').textContent = Game.best;
        const egg = EASTER_EGGS.find((t) => Game.score >= t.min);
        $('game-over-easter').textContent = egg ? egg.text : '';
        $('game-over-emoji').textContent = Game.score >= 1000 ? '👑' : '💍';
        $('game-over').classList.remove('hidden');
        if (navigator.vibrate) navigator.vibrate([60, 40, 60]);
    }

    function newRound() {
        Composite.allBodies(Game.engine.world).forEach((b) => {
            if (b.plugin && b.plugin.level !== undefined) Composite.remove(Game.engine.world, b);
        });
        Game.score = 0;
        Game.over = false;
        Game.overTimer = 0;
        Game.particles = [];
        Game.mergeQueue = [];
        Game.milestoneHit = new Set();
        Game.aimX = Game.W / 2;
        Game.aiming = false;
        Game.lastDrop = -1000;
        rollNext();
        updateHud();
        $('game-over').classList.add('hidden');
    }

    /* ---------- 渲染 ---------- */

    const EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';

    function draw() {
        const { ctx, W, H, dpr } = Game;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, W, H);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // 警戒线（有爱心越线时变红）
        const dangerY = H * 0.15;
        ctx.save();
        ctx.setLineDash([6, 6]);
        ctx.strokeStyle = Game.overTimer > 0 ? 'rgba(248,81,73,0.9)' : 'rgba(139,148,158,0.35)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, dangerY);
        ctx.lineTo(W, dangerY);
        ctx.stroke();
        ctx.restore();

        // 场上的爱心
        Composite.allBodies(Game.engine.world).forEach((b) => {
            if (!b.plugin || b.plugin.level === undefined) return;
            const r = b.circleRadius;
            ctx.font = Math.round(r * 2.1) + 'px ' + EMOJI_FONT;
            ctx.fillText(HEARTS[b.plugin.level].e, b.position.x, b.position.y + r * 0.08);
        });

        // 投放虚影 + 辅助线
        if (!Game.over && Game.aimX !== null) {
            const r = heartRadius(Game.nextLevel);
            const y = r + 6;
            ctx.globalAlpha = 0.55;
            ctx.font = Math.round(r * 2.1) + 'px ' + EMOJI_FONT;
            ctx.fillText(HEARTS[Game.nextLevel].e, Game.aimX, y);
            ctx.globalAlpha = 1;
            ctx.save();
            ctx.setLineDash([3, 7]);
            ctx.strokeStyle = 'rgba(0,210,211,0.25)';
            ctx.beginPath();
            ctx.moveTo(Game.aimX, y + r);
            ctx.lineTo(Game.aimX, H);
            ctx.stroke();
            ctx.restore();
        }

        // 粒子与飘分
        Game.particles.forEach((p) => {
            ctx.globalAlpha = Math.max(p.life / p.maxLife, 0);
            if (p.type === 'burst') {
                ctx.font = Math.round(p.size) + 'px ' + EMOJI_FONT;
                ctx.fillText(p.emoji, p.x, p.y);
            } else {
                ctx.font = 'bold 16px ' + EMOJI_FONT;
                ctx.fillStyle = '#00d2d3';
                ctx.fillText(p.text, p.x, p.y);
            }
            ctx.globalAlpha = 1;
        });
    }

    function loop(now) {
        requestAnimationFrame(loop);
        let dt = now - Game.lastTime;
        Game.lastTime = now;
        if (dt > 50) dt = 50; // 切后台回来防止物理爆炸
        if (!Game.over && Game.engine) {
            Game.acc += dt;
            const step = 1000 / 60;
            while (Game.acc >= step) {
                Engine.update(Game.engine, step);
                Game.acc -= step;
            }
            processMerges();
            checkGameOver(dt);
        }
        updateParticles(dt);
        draw();
    }

    /* ---------- 启动 ---------- */

    Game.canvas = $('game-canvas');
    Game.ctx = Game.canvas.getContext('2d');
    try { Game.best = parseInt(localStorage.getItem(BEST_KEY) || '0', 10) || 0; } catch (err) { Game.best = 0; }

    Game.engine = Engine.create();
    Game.engine.gravity.y = 1.35;
    Game.walls = Composite.create();
    Composite.add(Game.engine.world, Game.walls);
    Events.on(Game.engine, 'collisionStart', onCollide);

    resizeGame(true);
    window.addEventListener('resize', debounce(() => resizeGame(false), 200));
    bindInput();
    newRound();
    $('btn-restart').addEventListener('click', newRound);
    Game.lastTime = performance.now();
    requestAnimationFrame(loop);
})();
