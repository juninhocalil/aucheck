'use strict';

/* ================= CONFIGURAÇÃO (ajuste aqui) ================= */
// Arquivos de áudio tentados em ordem. Coloque seu meme em web/audio/
const AUDIO_CANDIDATES = ['./audio/meme.mp3', './audio/meme.wav', './audio/meme.ogg', './audio/meme.m4a'];
const BOOST = 4;            // multiplicador antes da distorção (maior = mais "estourado")
const DRIVE = 3;            // intensidade da saturação
const MAX_SECONDS = 20;     // tempo máximo de reprodução
const STOP_DELAY_MS = 3000; // botão Parar (e Esc) só liberam depois disso
/* ============================================================== */

const $ = (s) => document.querySelector(s);
const panel = $('#panel');
const stages = document.querySelectorAll('.stage');
const els = {
  icon: $('#panelIcon'), title: $('#panelTitle'), sub: $('#panelSub'), tag: $('#panelTag'),
  compileBar: $('#compileBar'), compileText: $('#compileText'),
  playBar: $('#playBar'), stop: $('#stopButton'),
};

const SCREENS = {
  compiling: { icon: '♫', title: 'Compilando relatório', sub: 'Audio compiler · etapa 1 de 3', tag: 'RUNNING' },
  volume:    { icon: '🔊', title: 'Ajuste o volume', sub: 'Audio output · etapa 2 de 3', tag: 'ACTION' },
  playing:   { icon: '▶', title: 'Áudio compilado', sub: 'Playback · em andamento', tag: 'PLAYING' },
  done:      { icon: '✔', title: 'Diagnóstico concluído', sub: 'Report · finalizado', tag: 'DONE' },
};

let rawAudio = null;        // ArrayBuffer baixado do arquivo (ou null)
let ctx = null, source = null, playTimer = null, rafId = null, stopTimer = null, canStop = false;

function show(state) {
  panel.dataset.state = state;
  stages.forEach((s) => { s.hidden = s.dataset.for !== state; });
  const c = SCREENS[state];
  els.icon.textContent = c.icon; els.title.textContent = c.title;
  els.sub.textContent = c.sub; els.tag.textContent = c.tag;
}

/* ---------- carrega o meme (se existir) ---------- */
async function loadAudioFile() {
  for (const url of AUDIO_CANDIDATES) {
    try {
      const res = await fetch(url);
      if (res.ok) return await res.arrayBuffer();
    } catch (_) { /* tenta o próximo */ }
  }
  return null;
}

/* ---------- som sintético padrão (caso não haja meme.mp3) ---------- */
function makeFallbackBuffer(c) {
  const sr = c.sampleRate, secs = 4, buf = c.createBuffer(1, sr * secs, sr);
  const d = buf.getChannelData(0);
  let phase = 0;
  for (let i = 0; i < d.length; i++) {
    const t = i / sr;
    const f = 700 + 600 * Math.sin(2 * Math.PI * 3.5 * t) + 200 * Math.sin(2 * Math.PI * 11 * t);
    phase += (2 * Math.PI * f) / sr;
    const sq = Math.sin(phase) > 0 ? 1 : -1;
    d[i] = (0.7 * sq + 0.3 * (Math.random() * 2 - 1)) * (t > secs - 0.1 ? (secs - t) * 10 : 1);
  }
  return buf;
}

/* ---------- cadeia de áudio "estourada" ---------- */
function makeCurve() {
  const n = 2048, curve = new Float32Array(n), norm = Math.tanh(DRIVE);
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / (n - 1) - 1;
    curve[i] = Math.tanh(x * DRIVE) / norm;
  }
  return curve;
}

function buildChain(c) {
  const bass = c.createBiquadFilter();           // reforço de graves
  bass.type = 'lowshelf'; bass.frequency.value = 140; bass.gain.value = 10;

  const pre = c.createGain(); pre.gain.value = BOOST;

  const clip = c.createWaveShaper();             // distorção/clipping
  clip.curve = makeCurve(); clip.oversample = '2x';

  const limiter = c.createDynamicsCompressor();  // evita estourar além do 0 dBFS
  limiter.threshold.value = -3; limiter.knee.value = 0;
  limiter.ratio.value = 20; limiter.attack.value = 0.001; limiter.release.value = 0.08;

  const out = c.createGain(); out.gain.value = 1; // ganho final do app: máximo

  bass.connect(pre); pre.connect(clip); clip.connect(limiter); limiter.connect(out); out.connect(c.destination);
  return bass;
}

/* ---------- controle de reprodução ---------- */
function cleanup() {
  clearTimeout(playTimer); clearTimeout(stopTimer); cancelAnimationFrame(rafId);
  playTimer = stopTimer = rafId = null; canStop = false;
  if (source) { source.onended = null; try { source.stop(); } catch (_) {} source = null; }
  if (ctx && ctx.state !== 'closed') { ctx.close().catch(() => {}); }
  ctx = null;
}

function finish() { cleanup(); show('done'); }

async function start() {
  cleanup();
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) { show('done'); return; }

  // este clique é o "gesto do usuário" que libera o áudio
  ctx = new AC();
  const myCtx = ctx;
  try { await ctx.resume(); } catch (_) {}

  // decodifica o áudio e toca direto, sem contagem
  let buffer;
  try {
    buffer = rawAudio ? await ctx.decodeAudioData(rawAudio.slice(0)) : makeFallbackBuffer(ctx);
  } catch (_) {
    buffer = makeFallbackBuffer(ctx);
  }
  if (ctx !== myCtx) return; // foi cancelado
  play(buffer);
}

function play(buffer) {
  if (!ctx) return;
  source = ctx.createBufferSource();
  source.buffer = buffer;
  source.connect(buildChain(ctx));
  source.onended = finish;
  const dur = Math.min(buffer.duration, MAX_SECONDS);
  source.start();
  playTimer = setTimeout(finish, dur * 1000 + 150);

  show('playing');
  canStop = false;
  els.stop.hidden = true;
  stopTimer = setTimeout(() => { canStop = true; els.stop.hidden = false; }, STOP_DELAY_MS);
  const t0 = performance.now();
  const frame = () => {
    els.playBar.style.width = Math.min(100, ((performance.now() - t0) / (dur * 1000)) * 100) + '%';
    rafId = requestAnimationFrame(frame);
  };
  frame();
}

/* ---------- fluxo inicial: "compilando" falso ---------- */
function runCompile() {
  show('compiling');
  const steps = ['Analisando canais de saída…', 'Compilando amostras de áudio…', 'Verificando integridade do relatório…', 'Relatório pronto.'];
  const t0 = performance.now(), total = 3200;
  const frame = () => {
    const p = Math.min(1, (performance.now() - t0) / total);
    els.compileBar.style.width = (p * 100).toFixed(1) + '%';
    els.compileText.textContent = steps[Math.min(steps.length - 1, Math.floor(p * steps.length))];
    if (p < 1) requestAnimationFrame(frame); else setTimeout(() => show('volume'), 350);
  };
  frame();
}

$('#continueButton').addEventListener('click', start);
els.stop.addEventListener('click', () => { if (canStop) finish(); });
$('#againButton').addEventListener('click', () => { cleanup(); runCompile(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && ctx && canStop) finish(); });

loadAudioFile().then((buf) => { rawAudio = buf; });
runCompile();
