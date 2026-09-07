/* =========================================================
 * 🐻 熊熊飞呀 —— 可爱风 Flappy（给林霞的摸鱼小站）
 * 点一下往上飞，不点就掉下去；穿过棉花糖柱 +1，接住 💕 +2
 * ========================================================= */
(function () {
    'use strict';

    const $ = (id) => document.getElementById(id);
    const canvas = $('flappy-canvas');
    if (!canvas) return;
    const toast = window.moyuToast || (() => {});
    const buzz = (p) => { if (navigator.vibrate) navigator.vibrate(p); };

    const CFG = window.MOYU_CONFIG || {};
    const NAME = CFG.name || '摸鱼人';
    const BEST_KEY = 'moyu-flappy-best';

    // 马卡龙配色
    const SKY_TOP = '#ffd9ec', SKY_MID = '#e8d6ff', SKY_BOT = '#fff3d6';
    const CANDY = ['#ffb7d5', '#cdb4f6', '#a8e6cf', '#ffd6a5'];
    const GROUND = '#b8ecc9', GROUND_EDGE = '#8fd9a8', INK = '#6b4a6f';
    const EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';

    // 手感参数（觉得难/简单就调这里）：数值按毫秒计
    const GRAVITY = 0.0012;    // 下落加速度（调小 = 飘）
    const FLAP_VY = -0.36;     // 点击时向上的冲量（绝对值越大 = 一下飞越高）
    const MAX_FALL = 0.6;      // 下落限速（调小 = 掉得慢）
    const BASE_SPEED = 0.15;   // 柱子水平速度起点
    const MAX_SPEED = 0.22;    // 柱子水平速度上限

    const F = {
        ctx: canvas.getContext('2d'),
        W: 0, H: 0, dpr: 1,
        state: 'idle', // idle | play | over
        bird: { x: 0, y: 0, vy: 0 },
        r: 14,
        pipes: [], hearts: [], clouds: [], trail: [],
        score: 0, best: 0,
        dist: 0, speed: BASE_SPEED,
        trailT: 0, t: 0,
        lastT: 0,
        milestones: new Set(),
    };
    const GROUND_H = 42;

    try { F.best = parseInt(localStorage.getItem(BEST_KEY) || '0', 10) || 0; } catch (err) { F.best = 0; }
    $('flappy-best').textContent = F.best;

    const heartR = () => F.r;
    const groundY = () => F.H - GROUND_H;

    function updateHud() {
        $('flappy-score').textContent = F.score;
        $('flappy-best').textContent = F.best;
    }

    /* ---------- 尺寸 ---------- */

    function resizeGame(initial) {
        const oldW = F.W, oldH = F.H;
        const cssW = $('flappy-wrap').clientWidth;
        if (!cssW) return; // 面板还隐藏着（display:none 时 clientWidth 为 0），等可见时再校准
        const cssH = Math.min(Math.round(cssW * 1.15), Math.round(window.innerHeight * 0.62));
        F.dpr = window.devicePixelRatio || 1;
        canvas.width = Math.round(cssW * F.dpr);
        canvas.height = Math.round(cssH * F.dpr);
        canvas.style.height = cssH + 'px';
        F.W = cssW;
        F.H = cssH;
        F.r = Math.max(12, cssW * 0.045);
        F.bird.x = cssW * 0.28;
        if (initial || oldW === 0) {
            F.bird.y = cssH * 0.42;
            F.clouds = [
                { x: cssW * 0.18, y: cssH * 0.14, s: 30 },
                { x: cssW * 0.58, y: cssH * 0.30, s: 22 },
                { x: cssW * 0.85, y: cssH * 0.10, s: 26 },
            ];
        } else {
            const sx = cssW / oldW, sy = cssH / oldH;
            F.bird.y *= sy;
            F.pipes.forEach((p) => { p.x *= sx; p.gapY *= sy; p.gapH *= sy; });
            F.hearts.forEach((h) => { h.x *= sx; h.y *= sy; });
        }
    }

    /* ---------- 游戏流程 ---------- */

    function startPlay() {
        F.score = 0;
        F.dist = 0;
        F.speed = BASE_SPEED;
        F.pipes = [];
        F.hearts = [];
        F.trail = [];
        F.milestones = new Set();
        F.bird.y = F.H * 0.42;
        F.bird.vy = -0.3;
        F.state = 'play';
        $('flappy-over').classList.add('hidden');
        updateHud();
    }

    function flap() {
        F.bird.vy = FLAP_VY;
        buzz(8);
    }

    function addScore(n, x, y) {
        F.score += n;
        F.speed = Math.min(MAX_SPEED, BASE_SPEED + F.score * 0.0015);
        if (F.score > F.best) {
            F.best = F.score;
            try { localStorage.setItem(BEST_KEY, String(F.best)); } catch (err) { /* 隐私模式忽略 */ }
        }
        for (const m of [{ at: 10, text: '双位数！老板看了都点赞 👍' }, { at: 25, text: '熊熊都替你骄傲 🐻✨' }]) {
            if (F.score >= m.at && !F.milestones.has(m.at)) {
                F.milestones.add(m.at);
                toast(m.text);
            }
        }
        updateHud();
    }

    function endGame() {
        F.state = 'over';
        $('flappy-over-score').textContent = F.score;
        $('flappy-over-best').textContent = F.best;
        const tier = F.score >= 30 ? `${NAME}制霸了整片天空 👑`
            : F.score >= 15 ? '摸鱼金牌飞行员 ✈️'
            : F.score >= 5 ? '飞得有模有样 ✨'
            : '熊熊还没睡醒 💤';
        $('flappy-over-easter').textContent = tier;
        $('flappy-over-emoji').textContent = F.score >= 30 ? '👑' : '🐻';
        $('flappy-over').classList.remove('hidden');
        buzz([60, 40, 60]);
    }

    /* ---------- 生成 ---------- */

    function spawnPipe() {
        const w = Math.max(44, F.W * 0.13);
        const gapH = F.H * 0.30;
        const minY = F.H * 0.12;
        const maxY = groundY() - gapH - F.H * 0.10;
        const gapY = minY + Math.random() * Math.max(maxY - minY, 10);
        const color = CANDY[F.pipes.length % CANDY.length];
        F.pipes.push({ x: F.W + 24, w, gapY, gapH, color, passed: false });
        // 柱对之间随机放一颗可收集的 💕
        if (Math.random() < 0.6) {
            F.hearts.push({
                x: F.W + 24 + w + Math.max(40, F.W * 0.31 - w),
                y: minY + gapH * 0.2 + Math.random() * Math.max(maxY + gapH - minY - gapH * 0.4, 20),
                taken: false,
            });
        }
    }

    /* ---------- 物理 ---------- */

    function circleRect(cx, cy, r, rx, ry, rw, rh) {
        const nx = Math.max(rx, Math.min(cx, rx + rw));
        const ny = Math.max(ry, Math.min(cy, ry + rh));
        const dx = cx - nx, dy = cy - ny;
        return dx * dx + dy * dy < r * r;
    }

    function physics(dt) {
        const b = F.bird;
        b.vy = Math.min(b.vy + GRAVITY * dt, MAX_FALL);
        b.y += b.vy * dt;
        if (b.y < F.r) { b.y = F.r; b.vy = 0; }

        F.dist += F.speed * dt;
        const spacing = F.W * 0.62;
        const last = F.pipes[F.pipes.length - 1];
        if (!last || last.x < F.W - spacing) spawnPipe();

        // 移动
        const move = F.speed * dt;
        F.pipes.forEach((p) => { p.x -= move; });
        F.hearts.forEach((h) => { h.x -= move; });
        F.clouds.forEach((c) => {
            c.x -= move * 0.25;
            if (c.x < -50) { c.x = F.W + 50; c.y = F.H * (0.08 + Math.random() * 0.25); }
        });

        // 拖尾
        F.trailT += dt;
        if (F.trailT > 70) {
            F.trailT = 0;
            F.trail.push({ x: b.x - F.r * 0.6, y: b.y + F.r * 0.3, life: 420 });
            if (F.trail.length > 7) F.trail.shift();
        }
        F.trail.forEach((t) => { t.life -= dt; t.x -= move * 0.5; });
        F.trail = F.trail.filter((t) => t.life > 0);

        // 穿柱得分 + 碰撞
        const gy = groundY();
        for (const p of F.pipes) {
            if (!p.passed && p.x + p.w < b.x) {
                p.passed = true;
                addScore(1);
                buzz(15);
            }
            if (circleRect(b.x, b.y, F.r, p.x, 0, p.w, p.gapY) ||
                circleRect(b.x, b.y, F.r, p.x, p.gapY + p.gapH, p.w, gy - p.gapY - p.gapH)) {
                endGame();
                return;
            }
        }
        F.pipes = F.pipes.filter((p) => p.x + p.w > -60);
        F.hearts = F.hearts.filter((h) => h.x > -40);

        // 接住 💕
        for (const h of F.hearts) {
            if (!h.taken) {
                const dx = b.x - h.x, dy = b.y - h.y;
                if (dx * dx + dy * dy < (F.r + 18) * (F.r + 18)) {
                    h.taken = true;
                    addScore(2);
                    buzz([12, 30, 12]);
                    toast('接住爱心 +2 💕');
                }
            }
        }
        F.hearts = F.hearts.filter((h) => !h.taken);

        // 落地
        if (b.y + F.r >= gy) {
            b.y = gy - F.r;
            endGame();
        }
    }

    /* ---------- 绘制 ---------- */

    function roundRect(ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
    }

    function draw() {
        const { ctx, W, H } = F;
        ctx.setTransform(F.dpr, 0, 0, F.dpr, 0, 0);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // 梦幻渐变天空
        const sky = ctx.createLinearGradient(0, 0, 0, H);
        sky.addColorStop(0, SKY_TOP);
        sky.addColorStop(0.55, SKY_MID);
        sky.addColorStop(1, SKY_BOT);
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, W, H);

        // 云朵
        ctx.globalAlpha = 0.8;
        F.clouds.forEach((c) => {
            ctx.font = Math.round(c.s) + 'px ' + EMOJI_FONT;
            ctx.fillText('☁️', c.x, c.y);
        });
        ctx.globalAlpha = 1;

        // 棉花糖柱
        const gy = groundY();
        for (const p of F.pipes) {
            ctx.fillStyle = p.color;
            ctx.strokeStyle = 'rgba(107, 74, 111, 0.25)';
            ctx.lineWidth = 3;
            roundRect(ctx, p.x, -12, p.w, p.gapY + 12, 10);
            ctx.fill();
            ctx.stroke();
            roundRect(ctx, p.x, p.gapY + p.gapH, p.w, gy - p.gapY - p.gapH + 12, 10);
            ctx.fill();
            ctx.stroke();
            // 柱口云朵帽
            ctx.font = Math.round(p.w * 0.95) + 'px ' + EMOJI_FONT;
            ctx.fillText('☁️', p.x + p.w / 2, p.gapY);
            ctx.fillText('☁️', p.x + p.w / 2, p.gapY + p.gapH);
        }

        // 可收集的 💕
        for (const h of F.hearts) {
            const bob = Math.sin(F.t / 260 + h.x) * 4;
            ctx.font = '24px ' + EMOJI_FONT;
            ctx.fillText('💕', h.x, h.y + bob);
        }

        // 草地 + 小花
        ctx.fillStyle = GROUND;
        ctx.fillRect(0, gy, W, GROUND_H);
        ctx.fillStyle = GROUND_EDGE;
        ctx.fillRect(0, gy, W, 3);
        const flowerGap = 92;
        const offset = F.dist % flowerGap;
        for (let x = -offset; x < W + flowerGap; x += flowerGap) {
            ctx.font = '15px ' + EMOJI_FONT;
            ctx.fillText('🌸', x, gy + GROUND_H * 0.55);
        }

        // 拖尾小心心
        for (const t of F.trail) {
            ctx.globalAlpha = (t.life / 420) * 0.55;
            ctx.font = Math.round(F.r * 0.9) + 'px ' + EMOJI_FONT;
            ctx.fillText('💗', t.x, t.y);
        }
        ctx.globalAlpha = 1;

        // 熊熊
        const b = F.bird;
        const r = F.r;
        const y = F.state === 'idle' ? H * 0.45 + Math.sin(F.t / 300) * 8 : b.y;
        ctx.save();
        ctx.translate(b.x, y);
        const ang = F.state === 'play' ? Math.max(-0.45, Math.min(1.0, b.vy * 2.2)) : 0;
        ctx.rotate(ang);
        ctx.font = Math.round(r * 2.05) + 'px ' + EMOJI_FONT;
        ctx.fillText('🐻', 0, 0);
        ctx.font = Math.round(r * 0.85) + 'px ' + EMOJI_FONT;
        ctx.fillText('🎀', r * 0.72, -r * 0.78);
        ctx.restore();

        // 待机提示
        if (F.state === 'idle') {
            ctx.fillStyle = INK;
            ctx.font = 'bold 15px ' + EMOJI_FONT;
            ctx.fillText('👆 点一下，熊熊就飞！', W / 2, H * 0.62);
            ctx.globalAlpha = 0.75;
            ctx.font = '12px ' + EMOJI_FONT;
            ctx.fillText('穿过棉花糖柱 +1 · 接住 💕 +2', W / 2, H * 0.62 + 24);
            ctx.globalAlpha = 1;
        }
    }

    function loop(now) {
        requestAnimationFrame(loop);
        let dt = now - F.lastT;
        F.lastT = now;
        F.t = now;
        if (dt > 50) dt = 50;
        const visible = !$('game-flappy').classList.contains('hidden'); // 切走 tab 就暂停
        if (!visible) return;
        // 面板初始隐藏、tab 切换、旋转屏后 clientWidth 会变，这里每帧自愈校准
        if ($('flappy-wrap').clientWidth !== F.W) resizeGame(false);
        if (F.state === 'play') physics(dt);
        draw();
    }

    /* ---------- 启动 ---------- */

    resizeGame(true); // 面板隐藏时 safe-return，切 tab 后由循环里的自愈校准补尺寸
    canvas.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        if (F.state === 'idle') { startPlay(); flap(); return; }
        if (F.state === 'play') flap();
    });
    $('btn-flappy-restart').addEventListener('click', () => {
        F.state = 'idle';
        F.bird.y = F.H * 0.42;
        F.bird.vy = 0;
        F.pipes = [];
        F.hearts = [];
        F.trail = [];
        F.score = 0;
        updateHud();
        $('flappy-over').classList.add('hidden');
    });

    F.lastT = performance.now();
    requestAnimationFrame(loop);
})();
