/* 游戏引擎：物理碰撞、投放、合成、动画、音效及本地存档。自定义内容请改 config.js。 */
(() => {
  'use strict';
  const C = window.GAME_CONFIG;
  const $ = (id) => document.getElementById(id);
  function loadJSON(key, fallback) { try { const value = JSON.parse(localStorage.getItem(key) || 'null'); return value ?? fallback; } catch (_) { return fallback; } }
  function saveJSON(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) { /* Storage may be disabled in private browsing; the current game remains playable. */ } }
  const canvas = $('gameCanvas');
  const ctx = canvas.getContext('2d');
  const items = C.items;
  const play = C.play;
  const state = { score: 0, best: Number(localStorage.getItem('cat-home-best') || 0), balls: [], particles: [], specialFX: [], mouseX: play.width / 2, current: 0, next: 0, lastDrop: 0, drops: 0, gameOver: false, sound: C.sound.enabled, dark: localStorage.getItem('cat-home-theme') === 'dark', lastTime: 0, toastTimer: 0, shake: 0, pointerDown: false, activeSince: Date.now(), reviveUsed: false, dangerSince: null, revivePending: false, reviveFX: [], reviveUntil: 0, medalTimer: 0, gameHistory: loadJSON('cat-home-history', []), achievements: loadJSON('cat-home-achievements', []), unlockedAt: loadJSON('cat-home-achievement-times', {}), mascotImage: new Image(), catsMerged: 0, highestLevel: 0, mergesInRun: 0, chain: 0, maxChain: 0, rescueCount: 0, challenge: null, baseItems: null };
  let audio;
  let installPrompt = null;
  let achievementDefs;
  let hiddenAchievements;
  state.mascotImage.src = './assets/mascot-sprite.png';
  state.mascotImage.onload = () => { state.mascotFrames = buildMascotFrames(); draw(); };
  state.baseItems = items.map((item) => item.radius);

  const textMap = { gameTitle:'title', gameSubtitle:'subtitle', eyebrow:'eyebrow', welcomeTitle:'welcome', scoreLabel:'score', bestLabel:'best', nextLabel:'next', restartLabel:'restart', guideTitle:'guideTitle', guideText:'guide', recordTitle:'recordTitle', recordScoreLabel:'current', recordBestLabel:'personalBest', privacyNote:'privacy', tipText:'tip', controlsNote:'controls', boardHint:'hint', footerText:'footer', offlineLabel:'offline', endEyebrow:'endEyebrow', endTitle:'endTitle', resultLabel:'result', playAgainButton:'again', installLabel:'install' };
  Object.entries(textMap).forEach(([id,key]) => { if ($(id)) $(id).textContent = C.text[key]; });
  document.title = `${C.text.title} · ${C.text.pageSuffix}`;
  document.querySelector('.brand').setAttribute('aria-label', `${C.text.title}首页`);
  canvas.setAttribute('aria-label', C.text.canvasLabel);
  $('chain').innerHTML = items.map((item, index) => `${index ? '<i>›</i>' : ''}<span class="mascot-token" title="${escapeHTML(item.name)}" aria-label="${escapeHTML(item.name)}" style="--mascot-index:${item.mascot ?? index%7}"><img src="./assets/cat-${(item.mascot ?? index%7)+1}.png" alt="" loading="lazy">${item.emoji}</span>`).join('');
  function showNextMascot() {
    const item = items[state.next];
    const portrait = item.mascot ?? state.next % 7;
    $('nextItem').innerHTML = `<img src="./assets/cat-${portrait+1}.png" alt="${escapeHTML(item.name)}">`;
    $('nextItem').title = item.name;
  }
  $('soundButton').textContent = state.sound ? '♫' : '♩';
  setupInstallPrompt();
  applyTheme();
  updateScore();

  function escapeHTML(value) { return String(value).replace(/[&<>"']/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char])); }
  function applyTheme() {
    document.documentElement.style.setProperty('--page', state.dark ? C.theme.darkPage : C.theme.page);
    document.documentElement.style.setProperty('--ink', state.dark ? C.theme.darkInk : C.theme.ink);
    document.documentElement.style.setProperty('--muted', state.dark ? C.theme.darkMuted : C.theme.muted);
    document.documentElement.style.setProperty('--accent', C.theme.accent);
    document.documentElement.style.setProperty('--accent-dark', C.theme.accentDark);
    document.documentElement.style.setProperty('--board', state.dark ? C.theme.darkBoard : C.theme.board);
    document.documentElement.style.setProperty('--board-bottom', C.theme.boardBottom);
    document.documentElement.style.setProperty('--line', C.theme.line);
    document.documentElement.style.setProperty('--card', state.dark ? C.theme.darkCard : C.theme.card);
    document.documentElement.style.setProperty('--highlight', C.theme.highlight);
    document.body.classList.toggle('dark', state.dark);
    $('themeButton').textContent = state.dark ? '☾' : '☼';
  }
  function updateScore() {
    $('score').textContent = state.score;
    $('best').textContent = state.best;
    $('recordScore').textContent = state.score;
    $('recordBest').textContent = state.best;
  }
  achievementDefs = [
    ['first-meow','初次见面','投下第一只小猫','🐾',s=>s.drops>=1],
    ['first-merge','初次贴贴','完成第一次合成','💕',s=>s.catsMerged>=1],
    ['combo-5','猫猫连连看','累计合成 5 次','🧶',s=>s.catsMerged>=5],
    ['combo-100','猫窝大家族','累计合成 100 次','🏠',s=>s.catsMerged>=100],
    ['level-4','小猫长大啦','合成到第 4 级','🐈',s=>s.highestLevel>=3],
    ['level-6','高阶猫猫','合成到第 6 级','👑',s=>s.highestLevel>=5],
    ['level-8','七宝终极猫','合成到第 7 级','🌟',s=>s.highestLevel>=6],
    ['score-100','鱼干初存','单局获得 100 分','🐟',s=>s.score>=100],
    ['score-500','鱼干小富翁','单局获得 500 分','💰',s=>s.score>=500],
    ['score-1500','鱼干大亨','单局获得 1500 分','🪙',s=>s.score>=1500],
    ['survivor-60','稳稳猫步','游戏进行超过 60 秒','⏱️',s=>s.seconds>=60],
    ['survivor-180','耐心铲屎官','游戏进行超过 3 分钟','🧹',s=>s.seconds>=180],
    ['revive','浴火喵生','成功复活一次','✨',s=>s.revives>=1],
    ['study-pass','单词小能手','通过一次背词复活挑战','📚',s=>s.challengePassed],
    ['daily-return','常回猫窝','累计玩过 5 个不同日期','🌅',s=>s.days>=5],
    ['top-score','十佳留名','进入自己的十佳战绩','🏆',s=>s.topTen],
    ['clean-board','强迫症猫猫','连续合成 8 次','🧩',s=>s.maxChain>=8],
    ['hidden-night','月下巡逻','在本地时间 0 点到 5 点开局','🌙',s=>s.night],
    ['hidden-lucky','猫爪幸运日','一局内连锁合成 3 次','🍀',s=>s.maxChain>=3],
    ['hidden-streak','命运猫之爪','连续 3 局都达成合成','🔮',s=>s.winStreak>=3]
  ];
  hiddenAchievements = new Set(['hidden-night','hidden-lucky','hidden-streak']);
  function renderHistory() {
    const panel = $('historyPanel');
    const records = state.gameHistory.slice(0, 10);
    panel.innerHTML = records.length ? records.map((run, index) => `<div class="history-row"><span class="history-rank">${index + 1}</span><strong>${run.score}</strong><time>${escapeHTML(new Date(run.at).toLocaleString('zh-CN', { month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit' }))}</time></div>`).join('') : '<p class="journal-empty">还没有战绩，先和小猫玩一局吧！</p>';
  }
  function renderAchievements() {
    $('achievementCount').textContent = `${state.achievements.length}/20`;
    $('achievementsPanel').innerHTML = achievementDefs.map(([id,title,description,icon]) => {
      const earned = state.achievements.includes(id); const hidden = hiddenAchievements.has(id) && !earned;
      const shownTitle = hidden ? '??? 隐藏成就' : title;
      const shownDescription = hidden ? '继续探索猫猫家园，说不定会有惊喜。' : description;
      const date = state.unlockedAt[id] ? new Date(state.unlockedAt[id]).toLocaleDateString('zh-CN') : '';
      return `<article class="achievement-badge ${earned ? 'earned' : ''} ${hidden ? 'mystery' : ''}"><span class="badge-icon">${hidden ? '🔒' : icon}</span><span><strong>${shownTitle}</strong><small>${shownDescription}</small>${date ? `<time>${date}</time>` : ''}</span></article>`;
    }).join('');
  }
  function checkAchievements(extra = {}) {
    const today = new Date().toLocaleDateString('en-CA');
    const stats = { score:state.score, catsMerged:state.catsMerged, highestLevel:state.highestLevel, seconds:(Date.now()-state.activeSince)/1000, revives:state.rescueCount, challengePassed:!!extra.challengePassed, days:new Set(loadJSON('cat-home-days',[])).size, night:new Date().getHours()<5, maxChain:state.maxChain, topTen:!!extra.topTen, winStreak:Number(localStorage.getItem('cat-home-streak')||0), startedToday:loadJSON('cat-home-last-day','')===today };
    for (const [id,title,description,icon,predicate] of achievementDefs) {
      if (!state.achievements.includes(id) && predicate(stats)) unlockAchievement(id,title,description,icon);
    }
  }
  function unlockAchievement(id,title,description,icon) {
    state.achievements.push(id); state.unlockedAt[id]=Date.now();
    saveJSON('cat-home-achievements',state.achievements);
    saveJSON('cat-home-achievement-times',state.unlockedAt);
    renderAchievements(); $('medalTitle').textContent=`${icon} ${title}`; $('medalDescription').textContent=description;
    $('medalBurst').classList.remove('show'); void $('medalBurst').offsetWidth; $('medalBurst').classList.add('show');
    clearTimeout(state.medalTimer); state.medalTimer=setTimeout(()=>$('medalBurst').classList.remove('show'),3200);
    playMeow(3);
  }
  function setupInstallPrompt() {
    const installButton = $('installButton');
    const installDialog = $('installDialog');
    window.addEventListener('beforeinstallprompt', (event) => {
      event.preventDefault(); installPrompt = event;
      $('androidInstallStep').classList.remove('hidden');
    });
    window.addEventListener('appinstalled', () => {
      installPrompt = null; installButton.classList.add('hidden');
      showToast('🐾 小猫家园住进你的设备啦！', 1800);
    });
    installButton.addEventListener('click', () => {
      if (installPrompt) $('androidInstallStep').classList.remove('hidden');
      else $('androidInstallStep').classList.add('hidden');
      installDialog.showModal();
    });
    $('nativeInstallButton').addEventListener('click', async () => {
      if (!installPrompt) return;
      installPrompt.prompt();
      await installPrompt.userChoice;
      installPrompt = null;
      installDialog.close();
    });
  }
  function playTone(frequency, duration = C.sound.duration, type = 'sine') {
    if (!state.sound) return;
    try {
      audio ||= new (window.AudioContext || window.webkitAudioContext)();
      if (audio.state === 'suspended') audio.resume();
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, audio.currentTime);
      gain.gain.setValueAtTime(C.sound.volume, audio.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + duration);
      oscillator.connect(gain); gain.connect(audio.destination);
      oscillator.start(); oscillator.stop(audio.currentTime + duration);
    } catch (_) { /* 浏览器未提供 Web Audio 时静默运行。 */ }
  }
  function playMeow(level = 0) {
    if (!state.sound) return;
    try {
      audio ||= new (window.AudioContext || window.webkitAudioContext)();
      if (audio.state === 'suspended') audio.resume();
      const start = audio.currentTime;
      const length = C.sound.meowDuration;
      const base = C.sound.meowPitch + level * 28;
      const master = audio.createGain();
      master.gain.setValueAtTime(C.sound.volume * 0.8, start);
      master.gain.exponentialRampToValueAtTime(0.001, start + length);
      master.connect(audio.destination);
      for (const [ratio, peak, wave] of [[1, 1, 'sawtooth'], [2.03, .18, 'sine']]) {
        const voice = audio.createOscillator();
        const filter = audio.createBiquadFilter();
        const gain = audio.createGain();
        voice.type = wave;
        voice.frequency.setValueAtTime(base * ratio, start);
        voice.frequency.exponentialRampToValueAtTime(base * ratio * 1.7, start + length * .28);
        voice.frequency.exponentialRampToValueAtTime(base * ratio * .72, start + length);
        filter.type = 'bandpass'; filter.frequency.value = base * ratio * 1.65; filter.Q.value = 1.2;
        gain.gain.value = peak;
        voice.connect(filter); filter.connect(gain); gain.connect(master);
        voice.start(start); voice.stop(start + length);
      }
      const vibrato = audio.createOscillator();
      const vibratoGain = audio.createGain();
      vibrato.frequency.value = 15; vibratoGain.gain.value = base * .012;
      vibrato.connect(vibratoGain); vibratoGain.connect(master); vibrato.start(start); vibrato.stop(start + length);
    } catch (_) { /* Web Audio 不可用时跳过音效，不影响离线玩法。 */ }
  }
  function playPawSound(level = 0) {
    if (!state.sound) return;
    try {
      audio ||= new (window.AudioContext || window.webkitAudioContext)();
      if (audio.state === 'suspended') audio.resume();
      const start = audio.currentTime;
      const root = 390 + level * 18;
      for (const [offset, frequency, volume, length] of [[0, root, .45, .11], [.045, root * 1.48, .2, .15]]) {
        const voice = audio.createOscillator(); const envelope = audio.createGain();
        voice.type = 'sine'; voice.frequency.setValueAtTime(frequency, start + offset);
        voice.frequency.exponentialRampToValueAtTime(frequency * .76, start + offset + length);
        envelope.gain.setValueAtTime(.001, start + offset);
        envelope.gain.exponentialRampToValueAtTime(C.sound.volume * volume, start + offset + .012);
        envelope.gain.exponentialRampToValueAtTime(.001, start + offset + length);
        voice.connect(envelope); envelope.connect(audio.destination);
        voice.start(start + offset); voice.stop(start + offset + length);
      }
    } catch (_) { /* 不支持 Web Audio 的浏览器仍可正常游戏。 */ }
  }
  let renderHeight = play.height;
  function resize() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(rect.width * dpr); canvas.height = Math.round(rect.height * dpr);
    renderHeight = Math.round(play.width * rect.height / Math.max(rect.width, 1));
    ctx.setTransform(canvas.width / play.width, 0, 0, canvas.height / renderHeight, 0, 0);
    draw();
  }
  function radiusFor(index) { return items[Math.min(index, items.length - 1)].radius; }
  function buildMascotFrames() {
    const frames = [];
    for (let index = 0; index < 7; index++) {
      const source = document.createElement('canvas'); source.width = source.height = 128;
      const sourceCtx = source.getContext('2d');
      sourceCtx.drawImage(state.mascotImage, index * 128, 0, 128, 128, 0, 0, 128, 128);
      const frame = document.createElement('canvas'); frame.width = frame.height = 160;
      const frameCtx = frame.getContext('2d');
      const silhouette = document.createElement('canvas'); silhouette.width = silhouette.height = 160;
      const silhouetteCtx = silhouette.getContext('2d'); silhouetteCtx.drawImage(source, 16, 16);
      silhouetteCtx.globalCompositeOperation = 'source-in'; silhouetteCtx.fillStyle = '#fff'; silhouetteCtx.fillRect(0, 0, 160, 160);
      const offsets = Array.from({ length: 20 }, (_, step) => {
        const angle = step * Math.PI / 10;
        return [Math.cos(angle), Math.sin(angle)];
      });
      frameCtx.fillStyle = '#25334a';
      for (const [x, y] of offsets) frameCtx.drawImage(silhouette, x * 5 + .5, y * 5 + .5);
      frameCtx.fillStyle = '#fffdf9';
      for (const [x, y] of offsets) frameCtx.drawImage(silhouette, x * 2.7, y * 2.7);
      frameCtx.drawImage(source, 16, 16);
      frames.push(frame);
    }
    return frames;
  }
  function newBall(x, y, index, vy = 0) { return { x, y, vx: 0, vy, index, r: radiusFor(index), born: performance.now(), mergeAt: 0, dead: false }; }
  function reset() {
    state.score = 0; state.balls = []; state.particles = []; state.specialFX = []; state.gameOver = false; state.mouseX = play.width / 2; state.activeSince = Date.now(); state.reviveUsed = false; state.dangerSince = null; state.revivePending = false; state.reviveFX = []; state.catsMerged = 0; state.highestLevel = 0; state.mergesInRun = 0; state.chain = 0; state.maxChain = 0; state.rescueCount = 0; state.drops = 0; state.challenge = null;
    state.current = randomSmall(); state.next = randomSmall(); $('endScreen').classList.add('hidden');
    showNextMascot(); updateScore(); showToast(C.text.toastStart, 900); draw();
  }
  function randomSmall() { return Math.floor(Math.random() * Math.min(items.length, play.maxItemIndex + 1)); }
  function showToast(message, duration = 1000) {
    const toast = $('toast'); toast.textContent = message; toast.classList.add('visible');
    clearTimeout(state.toastTimer); state.toastTimer = setTimeout(() => toast.classList.remove('visible'), duration);
  }
  function pointerPosition(event) {
    const rect = canvas.getBoundingClientRect();
    return Math.max(play.wallPadding + radiusFor(state.current), Math.min(play.width - play.wallPadding - radiusFor(state.current), (event.clientX - rect.left) / rect.width * play.width));
  }
  function drop() {
    if (state.gameOver || performance.now() - state.lastDrop < play.dropDelay) return;
    state.lastDrop = performance.now();
    state.drops=(state.drops||0)+1; state.chain=0;
    const dayKey=new Date().toLocaleDateString('en-CA'), days=loadJSON('cat-home-days',[]);if(!days.includes(dayKey)){days.push(dayKey);saveJSON('cat-home-days',days);}
    checkAchievements();
    const r = radiusFor(state.current);
    state.balls.push(newBall(Math.max(play.wallPadding + r, Math.min(play.width - play.wallPadding - r, state.mouseX)), 39, state.current, 20));
    playPawSound(state.current);
    state.current = state.next; state.next = randomSmall(); showNextMascot();
    $('boardHint').style.opacity = '0';
  }
  function move(direction) { state.mouseX = Math.max(play.wallPadding + radiusFor(state.current), Math.min(play.width - play.wallPadding - radiusFor(state.current), state.mouseX + direction * 30)); }
  function burst(x, y, index) {
    const item = items[index];
    for (let i = 0; i < C.animation.particles; i++) {
      const angle = Math.PI * 2 * i / C.animation.particles;
      const speed = 75 + Math.random() * 150;
      state.particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 45, life: C.animation.particleLife, maxLife: C.animation.particleLife, color: item.color, emoji: Math.random() > .72 ? item.emoji : '' });
    }
  }
  function merge(a, b) {
    if (a.dead || b.dead || a.index !== b.index || a.index >= items.length - 1) return false;
    a.dead = b.dead = true;
    const nextIndex = a.index + 1;
    const merged = newBall((a.x + b.x) / 2, (a.y + b.y) / 2, nextIndex, -95);
    merged.mergeAt = performance.now(); state.balls.push(merged);
    state.score += items[nextIndex].points; state.catsMerged++; state.mergesInRun++; state.chain++; state.maxChain=Math.max(state.chain,state.maxChain); state.highestLevel=Math.max(state.highestLevel,nextIndex);
    if (state.score > state.best) { state.best = state.score; localStorage.setItem('cat-home-best', state.best); }
    updateScore(); burst(merged.x, merged.y, nextIndex); state.shake = C.animation.shake;
    showToast(nextIndex === items.length - 1 ? C.text.toastMax : C.text.toastMerge, 800);
    checkAchievements();
    playMeow(nextIndex);
    return true;
  }
  function update(dt, now) {
    const g = C.animation.gravity;
    if (state.gameOver) {
      for (const p of state.particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += g * .32 * dt; p.life -= dt * 1000; }
      state.particles = state.particles.filter((p) => p.life > 0);
      return;
    }
    for (const ball of state.balls) {
      if (ball.dead) continue;
      ball.vy += g * dt; ball.x += ball.vx * dt; ball.y += ball.vy * dt;
      const r = ball.r; const floor = renderHeight - r - 7;
      if (ball.x < play.wallPadding + r) { ball.x = play.wallPadding + r; ball.vx = Math.abs(ball.vx) * C.animation.wallBounce; }
      if (ball.x > play.width - play.wallPadding - r) { ball.x = play.width - play.wallPadding - r; ball.vx = -Math.abs(ball.vx) * C.animation.wallBounce; }
      if (ball.y > floor) { ball.y = floor; ball.vy *= -C.animation.floorBounce; if (Math.abs(ball.vy) < 30) ball.vy = 0; ball.vx *= .985; }
    }
    for (let i = 0; i < state.balls.length; i++) {
      const a = state.balls[i]; if (a.dead) continue;
      for (let j = i + 1; j < state.balls.length; j++) {
        const b = state.balls[j]; if (b.dead) continue;
        const dx = b.x - a.x, dy = b.y - a.y, distance = Math.hypot(dx, dy), min = a.r + b.r;
        if (distance >= min + C.animation.stickyRange) {
          if (a.specialWith === b) a.specialWith = null;
          if (b.specialWith === a) b.specialWith = null;
          continue;
        }
        const overlap = min - distance;
        if (overlap >= 0 && a.index === b.index && a.index < items.length - 1) { merge(a, b); continue; }
        const specialPair = C.animation.specialPair || [5, 6];
        if (overlap > 0 && a.specialWith !== b && b.specialWith !== a && [a.index, b.index].includes(specialPair[0]) && [a.index, b.index].includes(specialPair[1])) {
          a.specialWith = b; b.specialWith = a;
          state.specialFX.push({ x:(a.x+b.x)/2, y:(a.y+b.y)/2, start:now, duration:780 });
          burst((a.x+b.x)/2, (a.y+b.y)/2, b.index);
          playMeow(8);
          showToast(C.text.specialCollision || '💫 特别伙伴相遇：喵力共鸣！', 1200);
        }
        const nx = distance ? dx / distance : 1, ny = distance ? dy / distance : 0;
        const massA = a.r * a.r, massB = b.r * b.r;
        const inverseA = 1 / massA, inverseB = 1 / massB;
        const invMassSum = inverseA + inverseB;
        if (overlap > 0) {
          a.x -= nx * overlap * inverseA / invMassSum; a.y -= ny * overlap * inverseA / invMassSum;
          b.x += nx * overlap * inverseB / invMassSum; b.y += ny * overlap * inverseB / invMassSum;
          const relative = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
          if (relative < 0) {
            const impulse = -(1 + C.animation.bounce) * relative / invMassSum;
            a.vx -= impulse * nx * inverseA; a.vy -= impulse * ny * inverseA;
            b.vx += impulse * nx * inverseB; b.vy += impulse * ny * inverseB;
          }
        }
        // 软黏附：只在球面即将相碰的极小范围内拉近；接触后切向摩擦帮助猫咪堆叠。
        if (overlap > 0) {
          const tx = -ny, ty = nx;
          const tangentSpeed = (b.vx - a.vx) * tx + (b.vy - a.vy) * ty;
          const normalSpeed = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
          const friction = Math.min(Math.abs(tangentSpeed), C.animation.surfaceFriction * Math.abs(normalSpeed) * dt * 60);
          const frictionImpulse = Math.sign(tangentSpeed) * friction / invMassSum;
          a.vx += frictionImpulse * tx * inverseA; a.vy += frictionImpulse * ty * inverseA;
          b.vx -= frictionImpulse * tx * inverseB; b.vy -= frictionImpulse * ty * inverseB;
        } else if (overlap > -C.animation.stickyRange) {
          const gapRatio = Math.max(0, -overlap / C.animation.stickyRange);
          const pull = C.animation.adhesion * (1 - gapRatio) * dt;
          const pullA = pull * inverseA / invMassSum, pullB = pull * inverseB / invMassSum;
          a.vx += nx * pullA; a.vy += ny * pullA;
          b.vx -= nx * pullB; b.vy -= ny * pullB;
        }
      }
    }
    state.balls = state.balls.filter((ball) => !ball.dead);
    for (const p of state.particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += g * .32 * dt; p.life -= dt * 1000; }
    state.particles = state.particles.filter((p) => p.life > 0);
    state.specialFX = state.specialFX.filter((effect) => now - effect.start < effect.duration);
    if (state.shake > 0) state.shake = Math.max(0, state.shake - dt * 28);
    const dangerY = renderHeight * play.dangerLine;
    const touchingDangerLine = state.balls.some((ball) => ball.y - ball.r <= dangerY && now - ball.born > 800);
    if (touchingDangerLine) {
      state.dangerSince ??= now;
      if (now - state.dangerSince >= C.play.dangerSeconds * 1000) finishGame();
    } else state.dangerSince = null;
  }
  function draw() {
    if (!canvas.width) return;
    const dark = state.dark;
    ctx.save();
    if (state.shake) ctx.translate((Math.random() - .5) * state.shake, (Math.random() - .5) * state.shake);
    const visibleHeight = renderHeight || play.height;
    const gradient = ctx.createLinearGradient(0, 0, 0, visibleHeight);
    gradient.addColorStop(0, dark ? '#46353f' : '#fff7f8'); gradient.addColorStop(1, dark ? '#30272f' : '#ffe9ed');
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, play.width, visibleHeight);
    ctx.fillStyle = dark ? '#e5a5a540' : '#dc829c45'; ctx.fillRect(0, visibleHeight - 8, play.width, 8);
    const dangerY = visibleHeight * play.dangerLine;
    ctx.save(); ctx.setLineDash([9, 7]); ctx.strokeStyle = dark ? '#ff9eb8' : '#d94d78'; ctx.lineWidth = 3.4; ctx.shadowColor=dark?'#ff9eb875':'#d94d7844';ctx.shadowBlur=8;
    ctx.beginPath(); ctx.moveTo(0, dangerY); ctx.lineTo(play.width, dangerY); ctx.stroke(); ctx.setLineDash([]);ctx.shadowBlur=0;
    ctx.fillStyle = dark ? '#ffbad0' : '#b94468'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'bottom'; ctx.fillText('🐾 危险线 · 停留 3 秒', 10, dangerY - 6);
    if (state.dangerSince) {
      const remain = Math.max(0, 1 - (performance.now() - state.dangerSince) / (C.play.dangerSeconds * 1000));
      ctx.fillStyle = dark ? '#ffb9cc' : '#f26e91'; ctx.globalAlpha = .9;
      ctx.fillRect(0, dangerY - 2, play.width * remain, 4); ctx.globalAlpha = 1;
    }
    ctx.restore();
    if (!state.gameOver) {
      const r = radiusFor(state.current), x = Math.max(play.wallPadding + r, Math.min(play.width - play.wallPadding - r, state.mouseX));
      ctx.strokeStyle = dark ? '#e7ebd031' : '#aab89855'; ctx.setLineDash([4, 7]); ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 47); ctx.stroke(); ctx.setLineDash([]);
      drawBall({ x, y: 38, r, index: state.current, born: 0 }, true);
    }
    for (const ball of state.balls) drawBall(ball, false);
    for (const effect of state.specialFX) drawSpecialEffect(effect);
    for (const effect of state.reviveFX) drawReviveEffect(effect);
    for (const p of state.particles) {
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife); ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, 4 + (1 - p.life / p.maxLife) * 3, 0, Math.PI * 2); ctx.fill();
      if (p.emoji) { ctx.font = '14px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(p.emoji, p.x, p.y); }
    }
    ctx.globalAlpha = 1; ctx.restore();
  }
  function drawBall(ball, preview) {
    const item = items[ball.index];
    const age = performance.now() - ball.born;
    const pop = ball.mergeAt && age < C.animation.mergeDuration ? 1 + Math.sin(age / C.animation.mergeDuration * Math.PI) * (C.animation.mergeScale - 1) : 1;
    const r = ball.r * pop;
    ctx.save(); ctx.globalAlpha = preview ? .84 : 1;
    ctx.shadowColor = darkColor(); ctx.shadowBlur = preview ? 0 : 10; ctx.shadowOffsetY = preview ? 0 : 4;
    const artRadius = r * .9;
    const mascotIndex = item.mascot ?? ball.index % 7;
    const sprite = state.mascotFrames?.[mascotIndex];
    if (sprite) {
      const side = artRadius * 2;
      ctx.shadowColor = darkColor(); ctx.shadowBlur = preview ? 0 : Math.max(5, r * .16); ctx.shadowOffsetY = preview ? 0 : Math.max(2, r * .08);
      ctx.drawImage(sprite, ball.x - side/2, ball.y - side/2, side, side);
    } else {
      ctx.fillStyle = item.color; ctx.beginPath(); ctx.arc(ball.x, ball.y, artRadius, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }
  function drawReviveEffect(effect) {
    const progress=Math.min(1,(performance.now()-effect.start)/effect.duration), alpha=1-progress, scale=1+progress*.55;
    ctx.save();ctx.globalAlpha=alpha;ctx.translate(effect.x,effect.y);ctx.scale(scale,scale);
    ctx.strokeStyle='#ffda76';ctx.lineWidth=2.5;ctx.beginPath();ctx.arc(0,0,effect.r*(.5+progress),0,Math.PI*2);ctx.stroke();
    ctx.font=`${Math.max(14,effect.r*.75)}px sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(['✨','💫','🐾'][Math.floor(progress*3)%3],0,0);ctx.restore();
    if(progress>=1) state.reviveFX=state.reviveFX.filter(entry=>entry!==effect);
  }
  function drawSpecialEffect(effect) {
    const progress = Math.min(1, (performance.now() - effect.start) / effect.duration);
    ctx.save(); ctx.translate(effect.x, effect.y); ctx.globalAlpha = 1 - progress;
    ctx.strokeStyle = C.animation.specialColor || '#8cecf2'; ctx.lineWidth = 3 - progress;
    ctx.shadowColor = ctx.strokeStyle; ctx.shadowBlur = 18;
    ctx.beginPath(); ctx.arc(0, 0, 14 + progress * 64, 0, Math.PI * 2); ctx.stroke();
    ctx.font = `${22 + progress * 12}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('💫', Math.cos(progress * 12) * 20, Math.sin(progress * 12) * 20); ctx.fillText('🐾', 0, 0);
    ctx.restore();
  }
  function drawKitty(x, y, r, level, furColor) {
    const s = r / 25;
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    // 幼猫脸型：额头略窄、脸颊鼓鼓，轮廓做成柔软的绒毛暖边。
    ctx.beginPath(); ctx.moveTo(-21, -5); ctx.quadraticCurveTo(-23, -14, -20, -20); ctx.quadraticCurveTo(-18, -24, -15, -22);
    ctx.lineTo(-8, -17); ctx.quadraticCurveTo(0, -20, 8, -17); ctx.lineTo(15, -22); ctx.quadraticCurveTo(19, -24, 21, -18);
    ctx.quadraticCurveTo(25, -5, 22, 7); ctx.quadraticCurveTo(19, 20, 9, 23); ctx.quadraticCurveTo(0, 26, -9, 23);
    ctx.quadraticCurveTo(-20, 20, -23, 7); ctx.quadraticCurveTo(-24, 0, -21, -5); ctx.closePath();
    const fur = ctx.createRadialGradient(-8, -13, 2, 0, 1, 29);
    fur.addColorStop(0, '#fffef8'); fur.addColorStop(.62, furColor); fur.addColorStop(1, '#d39a76');
    ctx.fillStyle = fur; ctx.fill(); ctx.lineWidth = 1.1; ctx.strokeStyle = '#a77562'; ctx.stroke();
    ctx.strokeStyle = '#fffaf1aa'; ctx.lineWidth = .85;
    for (const side of [-1, 1]) {
      for (let tuft = 0; tuft < 4; tuft++) {
        const y = -9 + tuft * 5;
        ctx.beginPath(); ctx.moveTo(side * 21, y); ctx.quadraticCurveTo(side * 23, y + 1, side * 22, y + 3); ctx.stroke();
      }
    }
    // 耳朵里的桃粉色和浅色耳毛。
    ctx.beginPath(); ctx.moveTo(-18, -20); ctx.lineTo(-15, -11); ctx.lineTo(-10, -16); ctx.closePath();
    ctx.moveTo(18, -20); ctx.lineTo(15, -11); ctx.lineTo(10, -16); ctx.closePath(); ctx.fillStyle = '#e9a1a0'; ctx.fill();
    ctx.strokeStyle = '#fff0df'; ctx.lineWidth = .8;
    ctx.beginPath(); ctx.moveTo(-16, -18); ctx.lineTo(-14, -14); ctx.moveTo(16, -18); ctx.lineTo(14, -14); ctx.stroke();
    // 橘色额纹，呼应照片里的暖橘奶猫；不同等级仍保留各自毛色。
    ctx.strokeStyle = level % 3 === 0 ? '#a86d50' : '#d69668'; ctx.lineWidth = 3.2;
    ctx.beginPath(); ctx.moveTo(-4, -17); ctx.quadraticCurveTo(-6, -14, -8, -12); ctx.moveTo(4, -17); ctx.quadraticCurveTo(6, -14, 8, -12); ctx.moveTo(0, -17); ctx.lineTo(0, -13); ctx.stroke();
    // 奶油口鼻区域：两团圆滚滚的小脸颊。
    ctx.fillStyle = '#fff5e9';
    ctx.beginPath(); ctx.ellipse(-5, 6, 7.2, 5.5, -.12, 0, Math.PI * 2); ctx.ellipse(5, 6, 7.2, 5.5, .12, 0, Math.PI * 2); ctx.fill();
    // 水润的深棕大眼睛，搭配双层高光显得像幼猫。
    for (const eyeX of [-9, 9]) {
      const eye = ctx.createRadialGradient(eyeX - 1, -4, .4, eyeX, -2, 4.3);
      eye.addColorStop(0, '#71828d'); eye.addColorStop(.4, '#46505a'); eye.addColorStop(1, '#292c35');
      ctx.fillStyle = eye; ctx.beginPath(); ctx.ellipse(eyeX, -2, 3.5, 4.7, eyeX < 0 ? -.12 : .12, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(eyeX - 1, -3.8, 1.15, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffffffb8'; ctx.beginPath(); ctx.arc(eyeX + 1.3, -.2, .55, 0, Math.PI * 2); ctx.fill();
    }
    // 小小的粉鼻头、短短的嘴巴和照片同款淡淡腮红。
    ctx.fillStyle = '#d98283'; ctx.beginPath(); ctx.moveTo(-2.2, 3); ctx.quadraticCurveTo(0, 1.2, 2.2, 3); ctx.quadraticCurveTo(0, 5.5, -2.2, 3); ctx.fill();
    ctx.strokeStyle = '#78575a'; ctx.lineWidth = .85;
    ctx.beginPath(); ctx.moveTo(0, 5); ctx.lineTo(0, 6.4); ctx.quadraticCurveTo(-2.2, 8.5, -4, 7); ctx.moveTo(0, 6.4); ctx.quadraticCurveTo(2.2, 8.5, 4, 7); ctx.stroke();
    ctx.fillStyle = '#e99b9a78'; ctx.beginPath(); ctx.ellipse(-14, 5, 3.8, 2, -.15, 0, Math.PI * 2); ctx.ellipse(14, 5, 3.8, 2, .15, 0, Math.PI * 2); ctx.fill();
    // 几缕短短的脸边绒毛与细胡须，让圆球看起来更柔软。
    ctx.strokeStyle = '#fff5e8aa'; ctx.lineWidth = .75;
    for (const side of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(side * 19, 2); ctx.lineTo(side * 21, 1); ctx.moveTo(side * 20, 8); ctx.lineTo(side * 22, 9); ctx.stroke();
      ctx.strokeStyle = '#9b777099'; ctx.beginPath(); ctx.moveTo(side * 9, 6); ctx.lineTo(side * 20, 3); ctx.moveTo(side * 10, 8); ctx.lineTo(side * 20, 10); ctx.stroke();
      ctx.strokeStyle = '#fff5e8aa';
    }
    if (level === items.length - 1) { ctx.font = '12px sans-serif'; ctx.fillStyle = '#ffd85a'; ctx.fillText('✦', 0, -27); }
    ctx.restore();
  }
  function darkColor() { return state.dark ? '#10171338' : '#69523020'; }
  function darken(hex) { const n = parseInt(hex.slice(1), 16); const r = Math.max(0, (n >> 16) - 18), g = Math.max(0, ((n >> 8) & 255) - 18), b = Math.max(0, (n & 255) - 18); return `rgb(${r},${g},${b})`; }
  function finishGame() {
    if (state.gameOver) return;
    state.gameOver = true; state.dangerSince = null;
    const record = { score:state.score, at:Date.now(), localAt:new Date().toLocaleString('zh-CN'), catsMerged:state.catsMerged, highestLevel:state.highestLevel, revives:state.rescueCount };
    state.gameHistory.push(record); state.gameHistory.sort((a,b)=>b.score-a.score || a.at-b.at); state.gameHistory=state.gameHistory.slice(0,10);
    saveJSON('cat-home-history',state.gameHistory); renderHistory();
    const topTen = state.gameHistory.includes(record);
    const oldStreak=Number(localStorage.getItem('cat-home-streak')||0), newStreak=state.catsMerged>0?oldStreak+1:0;
    try { localStorage.setItem('cat-home-streak',String(newStreak)); } catch (_) {}
    checkAchievements({topTen,winStreak:newStreak});
    const days=loadJSON('cat-home-days',[]); const today=new Date().toLocaleDateString('en-CA'); if(!days.includes(today)){days.push(today);saveJSON('cat-home-days',days);}try{localStorage.setItem('cat-home-last-day',today);}catch(_){}
    $('resultScore').textContent = state.score; $('endBest').textContent = `${C.text.best} ${state.best}`;
    $('reviveChallengeButton').classList.toggle('hidden',state.reviveUsed);
    $('endScreen').classList.remove('hidden'); playTone(180, .35, 'sawtooth');
  }
  function normalizeAnswer(value) { return value.toLowerCase().trim().replace(/[.,;!?，。；！？、]/g,'').replace(/\s+/g,' '); }
  function beginChallenge() {
    const wordBank=window.WORD_BANK?.length ? window.WORD_BANK : (C.vocabulary?.length ? C.vocabulary : null);
    if(state.reviveUsed) return;
    state.gameOver = true;
    if(!wordBank?.length) { showToast('📚 本地词库没有加载，请重新打开页面再试。', 2400); return; }
    const pool=[...wordBank]; const picked=[];
    while(picked.length<10 && pool.length) picked.push(pool.splice(Math.floor(Math.random()*pool.length),1)[0]);
    state.challenge={words:picked,studyWords:picked,studyIndex:0,questions:[],questionIndex:0,correct:0,passed:false,reviewSet:new Set(),missed:[],retryMode:false,studyStarted:Date.now()};
    $('endScreen').classList.add('hidden'); $('challengeResult').classList.add('hidden'); $('quizStage').classList.add('hidden'); $('studyStage').classList.remove('hidden');
    $('retryMissedButton').classList.add('hidden');
    showStudyCard();
    const challengeDialog = $('challengeDialog');
    if (!challengeDialog.open) {
      if (typeof challengeDialog.showModal === 'function') {
        try { challengeDialog.showModal(); }
        catch (_) { challengeDialog.setAttribute('open', ''); }
      } else challengeDialog.setAttribute('open', '');
      if (!challengeDialog.open) challengeDialog.setAttribute('open', '');
    }
    challengeDialog.scrollTop = 0;
  }
  function showStudyCard() {
    const challenge=state.challenge, word=challenge.studyWords[challenge.studyIndex];
    $('challengeProgress').textContent=`${challenge.retryMode?'错词复习':'单词学习'} · ${challenge.studyIndex+1} / ${challenge.studyWords.length}`;
    $('studyWord').textContent=word.word; $('studyPhonetic').textContent=word.phonetic; $('studyMeaning').textContent=word.meaning;
    $('studyExample').textContent=word.example; $('studyExampleTranslation').textContent=word.translation; $('studyForms').textContent=`变形：${word.forms}`;
    $('challengeProgressBar').style.width=`${(challenge.studyIndex/10)*100}%`;
    $('reviewWordButton').classList.toggle('marked',challenge.reviewSet.has(word.word));
    $('reviewWordButton').textContent=challenge.reviewSet.has(word.word)?'🔖 已标记复习':'🔖 加入复习清单';
    $('studyFootnote').textContent=challenge.reviewSet.size?`已标记 ${challenge.reviewSet.size} 个词，抽查时优先复习。`:'标记不熟的词，抽查时会优先复习它们。';
    $('nextWordButton').textContent=challenge.studyIndex===challenge.studyWords.length-1?(challenge.retryMode?'错词复习完，重新抽查 →':'十个记完啦，开始抽查 →'):'记住啦，下一个 →';
  }
  function startQuiz() {
    const challenge=state.challenge;
    const marked=challenge.words.filter(word=>challenge.reviewSet.has(word.word));
    const unmarked=challenge.words.filter(word=>!challenge.reviewSet.has(word.word)).sort(()=>Math.random()-.5);
    const questionCount=Math.min(5,challenge.words.length);
    challenge.questions=[...marked,...unmarked].slice(0,questionCount).map(word=>({word,direction:Math.random()<.5?'en-zh':'zh-en'}));
    challenge.questionIndex=0; challenge.correct=0; challenge.missed=[];
    $('studyStage').classList.add('hidden'); $('quizStage').classList.remove('hidden'); showQuizQuestion();
  }
  function showQuizQuestion() {
    const challenge=state.challenge, entry=challenge.questions[challenge.questionIndex];
    $('quizProgress').textContent=`第 ${challenge.questionIndex+1} / ${challenge.questions.length} 题 · 已答对 ${challenge.correct}`;
    $('challengeProgressBar').style.width=`${(challenge.questionIndex/5)*100}%`;
    $('quizPrompt').textContent=entry.direction==='en-zh'?'请写出这个单词的中文意思':'请写出对应的英文单词';
    $('quizWord').textContent=entry.direction==='en-zh'?entry.word.word:entry.word.meaning;
    $('quizAnswer').value=''; $('quizFeedback').textContent=''; $('quizAnswer').disabled=false; $('submitAnswerButton').disabled=false;
    $('submitAnswerButton').textContent=challenge.questionIndex===challenge.questions.length-1?'提交并查看结果':'提交答案'; $('quizAnswer').focus();
  }
  function checkQuizAnswer() {
    const challenge=state.challenge; if(!challenge) return;
    const entry=challenge.questions[challenge.questionIndex]; const answer=normalizeAnswer($('quizAnswer').value);
    const accepted=entry.direction==='en-zh'?entry.word.meaning.split(/[；;，,]/).map(normalizeAnswer):[entry.word.word];
    const correct=accepted.some(value=>value && (answer===value || (entry.direction==='en-zh' && value.length>1 && (answer.includes(value) || value.includes(answer)))));
    if(correct) challenge.correct++; else challenge.missed.push(entry.word);
    $('quizFeedback').textContent=correct?'🐾 答对啦，小猫给你击个掌！':`答案：${entry.direction==='en-zh'?entry.word.meaning:entry.word.word}`;
    $('quizFeedback').classList.toggle('correct',correct); $('quizAnswer').disabled=true; $('submitAnswerButton').disabled=true;
    const quizDelay=window.matchMedia('(prefers-reduced-motion: reduce)').matches?120:520;
    setTimeout(()=>{
      challenge.questionIndex++;
      if(challenge.questionIndex<challenge.questions.length) showQuizQuestion(); else finishChallenge();
    },quizDelay);
  }
  function finishChallenge() {
    const challenge=state.challenge; challenge.passed=challenge.correct>=3;
    $('quizStage').classList.add('hidden'); $('challengeResult').classList.remove('hidden'); $('challengeProgress').textContent='背词挑战 · 已完成';
    $('challengeProgressBar').style.width='100%';
    $('challengeResultEmoji').textContent=challenge.passed?'🎉🐱':'📖🐱';
    $('challengeResultTitle').textContent=challenge.passed?'挑战通过！可以复活啦':'再练练就能通过';
    $('challengeResultText').textContent=`${challenge.questions.length} 题答对 ${challenge.correct} 题。${challenge.passed?'猫猫能量正在为你恢复！':'答对 3 题即可复活。已自动整理错词，复习后可以再抽查。'}`;
    $('claimReviveButton').classList.toggle('hidden',!challenge.passed);
    $('retryMissedButton').classList.toggle('hidden',challenge.passed || challenge.missed.length===0);
    checkAchievements({challengePassed:challenge.passed});
  }
  function reviveRun() {
    if(!state.gameOver || state.reviveUsed || !state.challenge?.passed) return;
    state.reviveUsed=true; state.gameOver=false; state.revivePending=true; state.dangerSince=null; state.rescueCount++;
    $('challengeDialog').close(); $('endScreen').classList.add('hidden');
    const sorted=[...state.balls].sort((a,b)=>a.r-b.r);
    const removeCount=Math.max(1,Math.round(sorted.length*.5));
    const removed=new Set(sorted.slice(0,removeCount));
    state.reviveFX=sorted.slice(0,removeCount).map(ball=>({x:ball.x,y:ball.y,r:ball.r,mascot:items[ball.index].mascot,start:performance.now(),duration:900}));
    state.balls=state.balls.filter(ball=>!removed.has(ball)); state.dangerSince=null;
    state.reviveUntil=performance.now()+1000; state.shake=12;
    const flash=$('reviveFlash'); flash.classList.remove('show'); void flash.offsetWidth; flash.classList.add('show');
    showToast(`✨ 清理较小的 ${removeCount} 只猫猫，复活成功！`,2200); playMeow(6); checkAchievements();
  }
  function frame(now) {
    const dt = Math.min((now - (state.lastTime || now)) / 1000, .035); state.lastTime = now;
    update(dt, now); draw(); requestAnimationFrame(frame);
  }
  canvas.addEventListener('pointermove', (event) => { state.mouseX = pointerPosition(event); });
  canvas.addEventListener('pointerdown', (event) => { event.preventDefault(); state.mouseX = pointerPosition(event); drop(); });
  $('dropButton').addEventListener('click', drop);
  $('leftButton').addEventListener('click', () => move(-1)); $('rightButton').addEventListener('click', () => move(1));
  $('restartButton').addEventListener('click', reset); $('playAgainButton').addEventListener('click', reset);
  $('historyTab').addEventListener('click',()=>{ $('historyTab').classList.add('active');$('achievementsTab').classList.remove('active');$('historyPanel').classList.remove('hidden');$('achievementsPanel').classList.add('hidden'); });
  $('achievementsTab').addEventListener('click',()=>{ $('achievementsTab').classList.add('active');$('historyTab').classList.remove('active');$('achievementsPanel').classList.remove('hidden');$('historyPanel').classList.add('hidden'); });
  $('reviveChallengeButton').addEventListener('click',beginChallenge);
  $('nextWordButton').addEventListener('click',()=>{const challenge=state.challenge;if(!challenge)return;if(challenge.studyIndex<challenge.studyWords.length-1){challenge.studyIndex++;showStudyCard();}else startQuiz();});
  $('reviewWordButton').addEventListener('click',()=>{const challenge=state.challenge;if(!challenge)return;const word=challenge.studyWords[challenge.studyIndex];if(challenge.reviewSet.has(word.word))challenge.reviewSet.delete(word.word);else challenge.reviewSet.add(word.word);showStudyCard();});
  $('retryMissedButton').addEventListener('click',()=>{const challenge=state.challenge;if(!challenge?.missed.length)return;challenge.retryMode=true;challenge.studyWords=[...new Map(challenge.missed.map(word=>[word.word,word])).values()];challenge.reviewSet=new Set(challenge.studyWords.map(word=>word.word));challenge.studyIndex=0;challenge.passed=false;$('challengeResult').classList.add('hidden');$('studyStage').classList.remove('hidden');showStudyCard();});
  $('submitAnswerButton').addEventListener('click',checkQuizAnswer);
  $('quizAnswer').addEventListener('keydown',event=>{if(event.key==='Enter')checkQuizAnswer();});
  $('claimReviveButton').addEventListener('click',reviveRun);
  function closeChallengeDialog() {
    const dialog = $('challengeDialog');
    if (dialog.open && typeof dialog.close === 'function') dialog.close();
    else dialog.removeAttribute('open');
    if (state.gameOver) $('endScreen').classList.remove('hidden');
  }
  $('closeResultButton').addEventListener('click',closeChallengeDialog);
  $('challengeClose').addEventListener('click',closeChallengeDialog);
  $('challengeDialog').addEventListener('cancel', (event) => { event.preventDefault(); closeChallengeDialog(); });
  $('soundButton').addEventListener('click', () => { state.sound = !state.sound; $('soundButton').textContent = state.sound ? '♫' : '♩'; if (state.sound) playTone(580); });
  $('themeButton').addEventListener('click', () => { state.dark = !state.dark; localStorage.setItem('cat-home-theme', state.dark ? 'dark' : 'light'); applyTheme(); });
  window.addEventListener('keydown', (event) => {
    if ($('challengeDialog').open && event.target.matches('input,textarea,select,[contenteditable="true"]')) return;
    if ($('challengeDialog').open && !['Escape','Tab'].includes(event.key)) return;
    if (['ArrowLeft','ArrowRight',' ','ArrowDown'].includes(event.key)) event.preventDefault();
    if (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'a') move(-1);
    if (event.key === 'ArrowRight' || event.key.toLowerCase() === 'd') move(1);
    if (event.key === ' ' || event.key === 'ArrowDown') drop();
    if (event.key.toLowerCase() === 'r') reset();
  });
  window.addEventListener('resize', resize);
  if ('serviceWorker' in navigator && location.protocol !== 'file:') window.addEventListener('load', () => navigator.serviceWorker.register('./service-worker.js').catch(() => {}));
  renderHistory(); renderAchievements(); reset(); resize(); requestAnimationFrame(frame);
})();
