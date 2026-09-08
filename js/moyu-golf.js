/* =========================================================
 * ⛳ 一杆进洞 —— 愤怒的小鸟式拉弓高尔夫（给林霞的摸鱼小站）
 * 玩法：一洞一杆，球停稳时在果岭台洞里才过关，否则丢心重试
 * 风格：耐看的黄昏球场（低饱和渐变 + 远山剪影视差），非可爱风
 * 物理反赖皮：坡度力（上坡掉速）+ 树干/树冠双碰撞 + 硬着陆掉速
 * ========================================================= */
(function () {
    'use strict';

    const $ = (id) => document.getElementById(id);
    const canvas = $('golf-canvas');
    if (!canvas) return;
    const toast = window.moyuToast || (() => {});
    const buzz = (p) => { if (navigator.vibrate) navigator.vibrate(p); };

    const CFG = window.MOYU_CONFIG || {};
    const NAME = CFG.name || '摸鱼人';
    const BEST_KEY = 'moyu-golf-best';
    const EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';

    // ===== 手感参数（想再调就改这里）=====
    const GRAVITY = 0.0024;      // 重力
    const PULL_K = 0.0108;       // 拉弓距离 → 初速系数
    const MAX_PULL = 130;        // 最大拉弓距离（px）
    const MIN_SHOT = 0.15;       // 太轻视为取消
    const MAX_SPEED = 1.5;       // 速度上限（含冲刺）
    const HOLE_TOL = 12;         // 进洞判定半径
    const CAPTURE_VX = 1.1;      // 滚进洞的最大速度（太快 lip-out 跳过）
    const MAGNET_R = 150;        // 磁力球吸附半径
    const FLIGHT_MAX = 8000;     // 单杆最长飞行时间（强制结算）

    // ===== 球种 =====
    const BALL_TYPES = {
        std: { emoji: '⚪', name: '标准球', gMul: 1, power: 1, rest: 0.45 },
        heart: { emoji: '💗', name: '爱心球', gMul: 0.6, power: 1, rest: 0.45 },
        bolt: { emoji: '⚡', name: '闪电球', gMul: 1, power: 1.4, rest: 0.7 },
        magnet: { emoji: '🧲', name: '磁力球', gMul: 1, power: 1, rest: 0.45, magnet: MAGNET_R },
        star: { emoji: '🌟', name: '星星球', gMul: 1, power: 1, rest: 0.45, dash: true },
    };
    const SPECIALS = ['heart', 'bolt', 'magnet', 'star'];
    const TEE_X = 60;

    const G = {
        ctx: canvas.getContext('2d'),
        W: 0, H: 0, dpr: 1,
        state: 'ready', // ready | aiming | flying | sunk | over
        level: 1, score: 0, hearts: 3, streak: 0,
        strokes: 0, strokeLimit: 3,
        holeX: 620, holeY: 0, greenW: 40,
        mapEnd: 900,
        ball: { x: TEE_X, y: 0, vx: 0, vy: 0, r: 9, onGround: true },
        type: 'std',
        bag: { heart: 0, bolt: 0, magnet: 0, star: 0 },
        dashUsed: false,
        cam: 0, camTarget: 0,
        terrain: (x) => 0,
        trees: [],
        stars: [], mountains: [], deco: [],
        aim: { sx: 0, sy: 0, cx: 0, cy: 0 },
        flightT: 0, sunkT: 0, t: 0, lastT: 0,
        best: 0,
        milestones: new Set(),
    };

    try { G.best = parseInt(localStorage.getItem(BEST_KEY) || '0', 10) || 0; } catch (err) { G.best = 0; }

    /* ---------- 尺寸与场景生成 ---------- */

    function resizeGame(initial) {
        const cssW = $('golf-wrap').clientWidth;
        if (!cssW) return; // 面板隐藏时跳过，可见后由循环自愈
        G.dpr = window.devicePixelRatio || 1;
        G.W = cssW;
        G.H = Math.min(Math.round(cssW * 0.85), Math.round(window.innerHeight * 0.55));
        canvas.width = Math.round(G.W * G.dpr);
        canvas.height = Math.round(G.H * G.dpr);
        canvas.style.height = G.H + 'px';
        buildScenery();
        buildTerrain(); // 尺寸变了地形基线跟着重建
        G.trees.forEach((t) => { t.baseY = G.terrain(t.x); }); // 树重新落到新地形上
        G.ball.y = G.terrain(G.ball.x) - G.ball.r;
    }

    function buildScenery() {
        G.stars = [];
        for (let i = 0; i < 26; i++) {
            G.stars.push({ fx: Math.random(), fy: Math.random() * 0.45, r: 0.6 + Math.random() * 1.2, tw: Math.random() * 6 });
        }
        G.mountains = [
            { par: 0.12, color: '#2a2440', base: 0.60, amp: 34, wl: 240, ph: Math.random() * 6 },
            { par: 0.26, color: '#372e4d', base: 0.68, amp: 26, wl: 170, ph: Math.random() * 6 },
            { par: 0.45, color: '#443a56', base: 0.76, amp: 18, wl: 110, ph: Math.random() * 6 },
        ];
        G.deco = [];
        for (let x = 90; x < 2600; x += 64) {
            const r = hash01(x);
            if (r < 0.18) G.deco.push({ x: x + r * 40, kind: 'grass', s: 9 + r * 10 });
            else if (r > 0.86) G.deco.push({ x: x + r * 30, kind: 'flower', s: 9 + r * 8 });
        }
    }

    function hash01(x) {
        const s = Math.sin(x * 12.9898 + G.level * 78.233) * 43758.5453;
        return s - Math.floor(s);
    }

    /* ---------- 地形：发球台 + 丘陵 + 果岭台 ---------- */

    function buildTerrain() {
        const base = G.H - 60;
        const ampBase = 8 + Math.min(G.level * 2.5, 16); // 关卡越深丘陵越刁钻
        const comps = [];
        for (let i = 0; i < 4; i++) {
            comps.push({
                amp: (ampBase + Math.random() * 10) / (i * 0.7 + 1),
                len: 90 + Math.random() * 240,
                ph: Math.random() * Math.PI * 2,
            });
        }
        const raw = (x) => {
            let y = base;
            for (const c of comps) y += Math.sin(x / c.len * Math.PI * 2 + c.ph) * c.amp;
            return y;
        };
        const smooth = (t) => t * t * (3 - 2 * t);
        const greenY = base - (24 + Math.min(G.level * 3, 24)); // 果岭台比地面高
        G.holeY = greenY;
        G.terrain = (x) => {
            let y = raw(x);
            const dt = Math.abs(x - TEE_X);
            if (dt < 56) y = base * (1 - smooth(dt / 56)) + y * smooth(dt / 56); // 发球台压平
            const dg = Math.abs(x - G.holeX);
            if (dg < G.greenW) y = greenY;                                       // 果岭台平顶
            else if (dg < G.greenW + 56) {
                const t = smooth((dg - G.greenW) / 56);
                y = greenY * (1 - t) + y * t;                                    // 台缘斜坡
            }
            return y;
        };
    }

    function buildTrees() {
        G.trees = [];
        const count = Math.min(1 + Math.floor(G.level / 2), 3);
        const minT = 190, maxT = G.holeX - G.greenW - 80;
        if (maxT - minT < 140) return;
        for (let i = 0; i < count; i++) {
            let x = 0, tries = 0;
            do {
                x = minT + 40 + Math.random() * (maxT - minT - 80);
                tries++;
            } while (tries < 20 && G.trees.some((t) => Math.abs(t.x - x) < 130));
            if (G.trees.some((t) => Math.abs(t.x - x) < 130)) continue;
            const h = 78 + Math.random() * 46;               // 树高（树干+树冠）
            const cr = 26 + Math.random() * 10;              // 树冠半径
            G.trees.push({ x, baseY: G.terrain(x), h, cr });
        }
    }

    function setupHole() {
        G.holeX = 470 + G.level * 120 + Math.random() * 100;
        G.greenW = Math.max(25, 40 - G.level * 2);           // 果岭台随关卡收窄
        G.strokeLimit = 3 + Math.floor((G.level - 1) / 4);   // 每洞杆数上限，随关卡微涨
        G.strokes = 0;
        G.mapEnd = G.holeX + G.greenW + 260;
        buildTerrain();
        buildTrees();
        G.ball.x = TEE_X;
        G.ball.y = G.terrain(TEE_X) - G.ball.r;
        G.ball.vx = 0;
        G.ball.vy = 0;
        G.ball.onGround = true;
        G.flightT = 0;
        if (G.type !== 'std' && G.bag[G.type] <= 0) G.type = 'std';
        G.state = 'ready';
        // 相机先停在洞口让玩家看一眼地形，再自动摇回发球台
        G.cam = Math.max(0, Math.min(G.holeX - G.W * 0.55, Math.max(0, G.mapEnd + 80 - G.W)));
        G.camTarget = 0;
        renderBag();
        updateHud();
    }

    /* ---------- HUD 与球架 ---------- */

    function updateHud() {
        $('golf-hole').textContent = G.level;
        $('golf-hearts').textContent = G.hearts;
        $('golf-strokes').textContent = G.strokes;
        $('golf-limit').textContent = G.strokeLimit;
        $('golf-streak').textContent = G.streak;
        $('golf-score').textContent = G.score;
        $('golf-best').textContent = G.best;
    }

    function renderBag() {
        const bag = $('golf-bag');
        bag.innerHTML = '';
        Object.keys(BALL_TYPES).forEach((key) => {
            const t = BALL_TYPES[key];
            const count = key === 'std' ? null : G.bag[key];
            const chip = document.createElement('button');
            chip.type = 'button';
            chip.className = 'bag-chip' + (G.type === key ? ' sel' : '') + (count === 0 ? ' none' : '');
            chip.title = t.name;
            chip.textContent = t.emoji;
            if (count !== null) {
                const c = document.createElement('span');
                c.className = 'cnt';
                c.textContent = count;
                chip.appendChild(c);
            }
            chip.addEventListener('click', () => {
                if (key !== 'std' && G.bag[key] <= 0) { toast('这个球用完啦 🫥'); return; }
                G.type = key;
                renderBag();
            });
            bag.appendChild(chip);
        });
    }

    /* ---------- 输入 ---------- */

    function bindInput() {
        canvas.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            if (G.state === 'ready') {
                if (G.type !== 'std' && G.bag[G.type] <= 0) { G.type = 'std'; renderBag(); }
                G.state = 'aiming';
                G.aim.sx = G.aim.cx = e.clientX;
                G.aim.sy = G.aim.cy = e.clientY;
                if (canvas.setPointerCapture) canvas.setPointerCapture(e.pointerId);
            } else if (G.state === 'flying') {
                const t = BALL_TYPES[G.type];
                if (t.dash && !G.dashUsed) {
                    G.dashUsed = true;
                    const sp = Math.hypot(G.ball.vx, G.ball.vy) || 0.3;
                    const k = Math.min(1.6 * sp, MAX_SPEED) / sp;
                    G.ball.vx *= k;
                    G.ball.vy *= k;
                    buzz(15);
                    toast('✨ 冲刺！');
                }
            }
        });
        canvas.addEventListener('pointermove', (e) => {
            if (G.state !== 'aiming') return;
            e.preventDefault();
            G.aim.cx = e.clientX;
            G.aim.cy = e.clientY;
        });
        canvas.addEventListener('pointerup', (e) => {
            if (G.state !== 'aiming') return;
            e.preventDefault();
            const t = BALL_TYPES[G.type];
            let vx = (G.aim.sx - e.clientX) * PULL_K * t.power;
            let vy = (G.aim.sy - e.clientY) * PULL_K * t.power;
            const sp = Math.hypot(vx, vy);
            if (sp < MIN_SHOT) { G.state = 'ready'; return; }
            const cap = MAX_PULL * PULL_K * t.power;
            if (sp > cap) { vx *= cap / sp; vy *= cap / sp; }
            G.ball.vx = vx;
            G.ball.vy = vy;
            G.ball.onGround = G.ball.onGround && vy <= 0; // 贴地平推保持贴地，往上打就离地
            if (G.type !== 'std') {
                G.bag[G.type]--; // 特技球用一次少一颗
                renderBag();
            }
            G.strokes++;
            G.dashUsed = false;
            G.flightT = 0;
            G.state = 'flying';
        });
    }

    /* ---------- 物理 ---------- */

    function circleRect(cx, cy, r, rx, ry, rw, rh) {
        const nx = Math.max(rx, Math.min(cx, rx + rw));
        const ny = Math.max(ry, Math.min(cy, ry + rh));
        const dx = cx - nx, dy = cy - ny;
        return dx * dx + dy * dy < r * r;
    }

    // 沿法向反弹（v·n < 0 才反弹）
    function reflect(b, nx, ny, rest) {
        const dot = b.vx * nx + b.vy * ny;
        if (dot < 0) {
            b.vx -= (1 + rest) * dot * nx;
            b.vy -= (1 + rest) * dot * ny;
        }
    }

    function physics(dt) {
        const b = G.ball;
        const t = BALL_TYPES[G.type];
        const prevX = b.x;

        // 磁力球：靠近洞口被吸引
        if (t.magnet) {
            const dx = G.holeX - b.x, dy = (G.holeY - 4) - b.y;
            const d = Math.hypot(dx, dy);
            if (d < t.magnet && d > 1) {
                const f = 0.002 * (1 - d / t.magnet);
                b.vx += (dx / d) * f * dt;
                b.vy += (dy / d) * f * dt;
            }
        }

        b.vy += GRAVITY * t.gMul * dt;

        // 贴地滚动：坡度力（上坡减速、下坡加速）
        if (b.onGround) {
            const slope = (G.terrain(b.x + 8) - G.terrain(b.x - 8)) / 16;
            b.vx += GRAVITY * slope * 0.8 * dt;
        }

        b.x += b.vx * dt;
        b.y += b.vy * dt;

        // 树：树干（矩形）+ 树冠（圆）
        for (const tr of G.trees) {
            // 树干
            if (circleRect(b.x, b.y, b.r, tr.x - 6, tr.baseY - tr.h * 0.6, 12, tr.h * 0.6)) {
                const side = b.x < tr.x ? -1 : 1;
                b.x = tr.x + side * (6 + b.r + 0.5);
                b.vx = Math.abs(b.vx) * 0.45 * side;
                b.vy *= 0.8;
                b.onGround = false;
                buzz(10);
            }
            // 树冠
            const cy = tr.baseY - tr.h * 0.62;
            const dx = b.x - tr.x, dy = b.y - cy;
            const d = Math.hypot(dx, dy);
            if (d < tr.cr + b.r && d > 0.001) {
                const nx = dx / d, ny = dy / d;
                b.x = tr.x + nx * (tr.cr + b.r + 0.5);
                b.y = cy + ny * (tr.cr + b.r + 0.5);
                reflect(b, nx, ny, 0.5);
                b.vx *= 0.9;
                b.vy *= 0.9;
                buzz(10);
            }
        }

        // 地形：硬着陆掉速 + 反弹 / 贴地下坡吸附
        const gy = G.terrain(b.x);
        if (b.y + b.r > gy) {
            const impact = b.vy;
            b.y = gy - b.r;
            b.vx *= 1 - Math.min(impact, 0.5) * 0.6; // 硬着陆掉速
            if (impact > 0.3) {
                b.vy = -impact * t.rest;
                b.onGround = false;
                buzz(6);
            } else {
                b.vy = 0;
                b.onGround = true;
            }
        } else if (b.onGround && b.vy >= 0 && b.y + b.r > gy - (18 + Math.abs(b.vx) * dt * 2)) {
            b.y = gy - b.r; // 贴地下坡：跟随地形
            b.vy = 0;
        } else {
            b.onGround = false;
        }

        // 左墙 / 右界（果岭台右侧 260px 的隐形墙）
        if (b.x < b.r + 4) { b.x = b.r + 4; b.vx = Math.abs(b.vx) * 0.5; }
        if (b.x > G.mapEnd - b.r) { b.x = G.mapEnd - b.r; b.vx = -Math.abs(b.vx) * 0.5; }

        // 进洞：贴地滚入（不能太快，太快 lip-out 跳过）或下落掉入
        if (G.state === 'flying') {
            const crossed = (prevX - G.holeX) * (b.x - G.holeX) <= 0;
            const near = Math.abs(b.x - G.holeX) < HOLE_TOL;
            const onGreen = b.y + b.r >= G.holeY - 6;
            if ((crossed && onGreen && Math.abs(b.vx) < CAPTURE_VX) ||
                (near && b.vy > 0 && b.y + b.r >= G.holeY - 4)) {
                sinkBall();
                return;
            }
        }

        // 单杆超时强制结算（先把球放到脚下的地面上，避免悬空判停）
        G.flightT += dt;
        if (G.flightT > FLIGHT_MAX) {
            b.y = G.terrain(b.x) - b.r;
            b.vy = 0;
            b.onGround = true;
            onBallRest();
        }
    }

    /* ---------- 一杆判定 ---------- */

    function onBallRest() {
        // 球停稳且不在洞里：还有杆数就从停球点继续，杆数用完才丢心
        if (G.strokes >= G.strokeLimit) {
            loseHeart();
        } else {
            G.state = 'ready'; // 从停球点继续打下一杆（撞树弹回来也能救）
            updateHud();
        }
    }

    function loseHeart() {
        G.hearts--;
        G.streak = 0;
        buzz([60, 40, 60]);
        updateHud();
        if (G.hearts <= 0) { endGame(); return; }
        toast(`本洞 ${G.strokeLimit} 杆没进，丢一颗心 💔 · 还剩 ${G.hearts} 颗`);
        // 同一洞重试（地形不变）——相机同样从洞口摇回发球台，看清距离
        G.strokes = 0;
        G.ball.x = TEE_X;
        G.ball.y = G.terrain(TEE_X) - G.ball.r;
        G.ball.vx = 0;
        G.ball.vy = 0;
        G.ball.onGround = true;
        G.flightT = 0;
        G.state = 'ready';
        G.cam = Math.max(0, Math.min(G.holeX - G.W * 0.55, Math.max(0, G.mapEnd + 80 - G.W)));
        G.camTarget = 0;
    }

    function sinkBall() {
        G.state = 'sunk';
        G.sunkT = 0;
        const calm = Math.abs(G.ball.vx) < 0.4 && Math.abs(G.ball.vy) < 0.4;
        G.streak++;
        // 杆数越少分越高：一杆过 > 两杆过 > 顶杆过
        const gain = 100 + Math.max(0, G.strokeLimit - G.strokes) * 20 + G.streak * 10 + (calm ? 30 : 0);
        G.score += gain;
        if (G.score > G.best) {
            G.best = G.score;
            try { localStorage.setItem(BEST_KEY, String(G.best)); } catch (err) { /* 忽略 */ }
        }
        if (G.strokes === 1) { toast('一杆过洞！🏆✨'); buzz([60, 40, 80]); }
        else if (calm) { toast('平稳进洞 +30 🎯'); buzz(20); }
        else { buzz(12); }
        if (G.streak >= 2) toast(`连击 x${G.streak}！🔥`);
        for (const m of [
            { at: 3, text: '连过三洞，渐入佳境 ⛳' },
            { at: 5, text: '五洞达成！黄昏都是你的 🌄' },
            { at: 8, text: `${NAME}把黄昏球场打穿了 ⛳👑` },
        ]) {
            if (G.level >= m.at && !G.milestones.has(m.at)) {
                G.milestones.add(m.at);
                toast(m.text);
            }
        }
        updateHud();
    }

    function nextHole() {
        G.level++;
        const s = SPECIALS[Math.floor(Math.random() * SPECIALS.length)];
        G.bag[s]++;
        toast(`🎁 获得特技球 ${BALL_TYPES[s].emoji}，发射前在球架点选`);
        setupHole();
    }

    function endGame() {
        G.state = 'over';
        $('golf-over-score').textContent = G.score;
        $('golf-over-holes').textContent = G.level - 1;
        $('golf-over-best').textContent = G.best;
        const tier = G.score >= 800 ? `${NAME}是黄昏球场的传说 ⛳`
            : G.score >= 400 ? '杆杆精彩，留了后劲 ✨'
            : G.score >= 150 ? '手感有了，下一轮更好'
            : '热身完毕，下一轮见 💪';
        $('golf-over-easter').textContent = tier;
        $('golf-over-emoji').textContent = G.score >= 800 ? '🏆' : '⛳';
        $('golf-over').classList.remove('hidden');
        buzz([60, 40, 60]);
    }

    /* ---------- 渲染 ---------- */

    function draw() {
        const { ctx, W, H } = G;
        ctx.setTransform(G.dpr, 0, 0, G.dpr, 0, 0);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // 黄昏天空
        const sky = ctx.createLinearGradient(0, 0, 0, H);
        sky.addColorStop(0, '#1b2a4a');
        sky.addColorStop(0.38, '#4a3a63');
        sky.addColorStop(0.62, '#96566b');
        sky.addColorStop(0.8, '#e8a87c');
        sky.addColorStop(1, '#f7c59f');
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, W, H);

        // 星子（上半空闪烁）
        for (const s of G.stars) {
            ctx.globalAlpha = 0.25 + 0.45 * Math.abs(Math.sin(G.t / 900 + s.tw));
            ctx.fillStyle = '#ffe9c9';
            ctx.beginPath();
            ctx.arc(s.fx * W, s.fy * H, s.r, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;

        // 落日
        ctx.save();
        ctx.shadowColor = '#ffcf9e';
        ctx.shadowBlur = 36;
        ctx.fillStyle = '#ffd9a0';
        ctx.beginPath();
        ctx.arc(W * 0.72, H * 0.56, 24, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // 远山三层（视差）
        for (const m of G.mountains) {
            ctx.fillStyle = m.color;
            ctx.beginPath();
            const horizon = H * m.base;
            ctx.moveTo(0, horizon);
            for (let sx = 0; sx <= W; sx += 10) {
                const wx = sx + G.cam * m.par;
                const y = horizon - Math.abs(Math.sin(wx / m.wl * Math.PI + m.ph)) * m.amp - 4;
                ctx.lineTo(sx, y);
            }
            ctx.lineTo(W, H);
            ctx.lineTo(0, H);
            ctx.closePath();
            ctx.fill();
        }

        // 草地（沿地形）
        const grassGrad = ctx.createLinearGradient(0, H * 0.55, 0, H);
        grassGrad.addColorStop(0, '#5d7a4f');
        grassGrad.addColorStop(0.4, '#46603f');
        grassGrad.addColorStop(1, '#31452f');
        ctx.fillStyle = grassGrad;
        ctx.beginPath();
        ctx.moveTo(0, H);
        for (let sx = 0; sx <= W; sx += 6) {
            ctx.lineTo(sx, G.terrain(sx + G.cam));
        }
        ctx.lineTo(W, H);
        ctx.closePath();
        ctx.fill();

        // 小草/小花装饰
        for (const d of G.deco) {
            const sx = d.x - G.cam;
            if (sx < -30 || sx > W + 30) continue;
            ctx.globalAlpha = 0.92;
            ctx.font = Math.round(d.s) + 'px ' + EMOJI_FONT;
            ctx.fillText(d.kind === 'grass' ? '🌿' : '🌸', sx, G.terrain(d.x) - d.s * 0.5);
            ctx.globalAlpha = 1;
        }

        // 树（障碍）
        for (const tr of G.trees) {
            const sx = tr.x - G.cam;
            if (sx < -80 || sx > W + 80) continue;
            ctx.font = Math.round(tr.h) + 'px ' + EMOJI_FONT;
            ctx.fillText('🌲', sx, tr.baseY - tr.h * 0.46);
        }

        // 洞 + 旗
        const hx = G.holeX - G.cam;
        if (hx > -60 && hx < W + 60) {
            ctx.fillStyle = 'rgba(20, 16, 12, 0.85)';
            ctx.beginPath();
            ctx.ellipse(hx, G.holeY + 2, 14, 4.5, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#e8e2d0';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(hx, G.holeY);
            ctx.lineTo(hx, G.holeY - 40);
            ctx.stroke();
            const wave = Math.sin(G.t / 320) * 3;
            ctx.fillStyle = '#e86a6a';
            ctx.beginPath();
            ctx.moveTo(hx, G.holeY - 40);
            ctx.lineTo(hx + 18, G.holeY - 34 + wave);
            ctx.lineTo(hx, G.holeY - 27);
            ctx.closePath();
            ctx.fill();
        }

        // 小地图条：全程鸟瞰（球/洞口/树），告别盲打
        const mapY = 14, mapL = 10, mapR = W - 10, mapSpan = mapR - mapL;
        ctx.fillStyle = 'rgba(255, 233, 201, 0.25)';
        ctx.fillRect(mapL, mapY, mapSpan, 3);
        // 树
        ctx.fillStyle = 'rgba(30, 60, 30, 0.9)';
        for (const tr of G.trees) {
            const mx = mapL + (tr.x / G.mapEnd) * mapSpan;
            ctx.fillRect(mx - 1.5, mapY - 2, 3, 7);
        }
        // 洞口（旗）
        const mh = mapL + (G.holeX / G.mapEnd) * mapSpan;
        ctx.fillStyle = '#e86a6a';
        ctx.beginPath();
        ctx.arc(mh, mapY + 1.5, 4, 0, Math.PI * 2);
        ctx.fill();
        // 球（实时）
        const mb = mapL + Math.min(Math.max(G.ball.x / G.mapEnd, 0), 1) * mapSpan;
        ctx.fillStyle = '#00d2d3';
        ctx.beginPath();
        ctx.arc(mb, mapY + 1.5, 4, 0, Math.PI * 2);
        ctx.fill();
        // 实时距洞
        ctx.fillStyle = 'rgba(255, 233, 201, 0.9)';
        ctx.font = 'bold 10px ' + EMOJI_FONT;
        ctx.textAlign = 'right';
        ctx.fillText(`距洞 ${Math.max(0, Math.round(G.holeX - G.ball.x))}`, W - 10, mapY + 14);
        ctx.textAlign = 'center';

        // 瞄准：预测轨迹（只显示前半段，留技巧空间）+ 拉弓指示
        if (G.state === 'aiming') {
            const t = BALL_TYPES[G.type];
            let vx = (G.aim.sx - G.aim.cx) * PULL_K * t.power;
            let vy = (G.aim.sy - G.aim.cy) * PULL_K * t.power;
            const sp = Math.hypot(vx, vy);
            const cap = MAX_PULL * PULL_K * t.power;
            if (sp > cap) { vx *= cap / sp; vy *= cap / sp; }
            const bx = G.ball.x - G.cam, by = G.ball.y;
            let px = G.ball.x, py = G.ball.y, pvx = vx, pvy = vy;
            for (let i = 0; i < 18; i++) {
                pvy += GRAVITY * t.gMul * 40;
                px += pvx * 40;
                py += pvy * 40;
                if (py > G.terrain(px)) break;
                if (i % 2 === 0) {
                    ctx.globalAlpha = 0.55 * (1 - i / 20);
                    ctx.fillStyle = '#ffffff';
                    ctx.beginPath();
                    ctx.arc(px - G.cam, py, 2.2, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
            ctx.globalAlpha = 1;
            ctx.strokeStyle = 'rgba(255, 233, 201, 0.8)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(bx, by);
            ctx.lineTo(bx - vx / (PULL_K * t.power), by - vy / (PULL_K * t.power));
            ctx.stroke();
            ctx.fillStyle = '#ffe9c9';
            ctx.font = 'bold 11px ' + EMOJI_FONT;
            ctx.fillText(Math.min(Math.round(sp / cap * 100), 100) + '%', bx, by - 24);
        }

        // 球
        const b = G.ball;
        let bs = 1;
        if (G.state === 'sunk') {
            G.sunkT += 16;
            bs = Math.max(0.25, 1 - G.sunkT / 500);
        }
        ctx.save();
        ctx.translate(b.x - G.cam, b.y + (1 - bs) * 6);
        ctx.scale(bs, bs);
        ctx.fillStyle = '#f7f3e8';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(0, 0, b.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.font = Math.round(b.r * 1.15) + 'px ' + EMOJI_FONT;
        ctx.fillText(BALL_TYPES[G.type].emoji, 0, 0);
        ctx.restore();
        if (G.state === 'sunk' && bs <= 0.26) {
            nextHole();
        }
    }

    /* ---------- 主循环 ---------- */

    function loop(now) {
        requestAnimationFrame(loop);
        let dt = now - G.lastT;
        G.lastT = now;
        G.t = now;
        if (dt > 50) dt = 50;
        const visible = !$('game-golf').classList.contains('hidden');
        if (!visible) return;
        if ($('golf-wrap').clientWidth !== G.W) resizeGame(false); // tab 切换/旋转屏自愈
        if (G.state === 'flying') physics(dt);
        G.camTarget = Math.max(0, Math.min(G.ball.x - G.W * 0.35, Math.max(0, G.mapEnd + 80 - G.W)));
        G.cam += (G.camTarget - G.cam) * Math.min(1, dt * 0.008);
        draw();
    }

    /* ---------- 启动 ---------- */

    resizeGame(true);
    setupHole();
    bindInput();
    $('btn-golf-restart').addEventListener('click', () => {
        G.level = 1;
        G.score = 0;
        G.hearts = 3;
        G.streak = 0;
        G.bag = { heart: 0, bolt: 0, magnet: 0, star: 0 };
        G.type = 'std';
        G.milestones = new Set();
        setupHole();
        $('golf-over').classList.add('hidden');
    });
    G.lastT = performance.now();
    requestAnimationFrame(loop);
})();
