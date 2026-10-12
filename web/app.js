'use strict';

const volume = document.querySelector('#volume');
const volumeValue = document.querySelector('#volumeValue');
const playButton = document.querySelector('#playButton');
const stopButton = document.querySelector('#stopButton');
const status = document.querySelector('#status');
const audioFileInput = document.querySelector('#audioFile');
const chooseAudioButton = document.querySelector('#chooseAudioButton');
const clearAudioButton = document.querySelector('#clearAudioButton');
const fileName = document.querySelector('#fileName');

const MAX_APP_GAIN = 0.20;
const MAX_PLAYBACK_MS = 2500;
const MAX_AUDIO_FILE_BYTES = 25 * 1024 * 1024;
let selectedAudioFile = null;
let audioContext = null;
let masterGain = null;
let activeNodes = [];
let activeAudioElement = null;
let activeObjectUrl = null;
let stopTimer = null;

function setStatus(message, active = false) {
  status.textContent = message;
  status.classList.toggle('active', active);
}

function refreshVolume() {
  volumeValue.value = `${volume.value}%`;
  if (masterGain && audioContext && audioContext.state !== 'closed') {
    masterGain.gain.setTargetAtTime(
      Math.min(Number(volume.value) / 100, MAX_APP_GAIN),
      audioContext.currentTime,
      0.025
    );
  }
}

volume.addEventListener('input', refreshVolume);
chooseAudioButton.addEventListener('click', () => audioFileInput.click());

audioFileInput.addEventListener('change', () => {
  const file = audioFileInput.files && audioFileInput.files[0];
  if (!file) return;
  if (!file.type.startsWith('audio/') && !/\.(mp3|wav|ogg|m4a|aac|flac|webm)$/i.test(file.name)) {
    setStatus('Escolha um arquivo de áudio compatível.');
    audioFileInput.value = '';
    return;
  }
  if (file.size > MAX_AUDIO_FILE_BYTES) {
    setStatus('Esse arquivo excede 25 MB. Escolha um áudio menor para evitar uso excessivo de memória.');
    audioFileInput.value = '';
    return;
  }
  selectedAudioFile = file;
  fileName.textContent = `${file.name} · ${(file.size / (1024 * 1024)).toFixed(1)} MB`;
  clearAudioButton.hidden = false;
  setStatus('Áudio selecionado. O botão de teste reproduz até 2,5 segundos.');
});

clearAudioButton.addEventListener('click', () => {
  selectedAudioFile = null;
  audioFileInput.value = '';
  fileName.textContent = 'Built-in test signal (default)';
  clearAudioButton.hidden = true;
  setStatus('Sinal interno selecionado.');
});

function makeDistortionCurve(amount = 90) {
  const samples = 44100;
  const curve = new Float32Array(samples);
  const k = amount;
  for (let i = 0; i < samples; i++) {
    const x = (i * 2) / samples - 1;
    curve[i] = Math.tanh(x * (k / 15));
  }
  return curve;
}

async function stopAudio(message = 'Teste interrompido.') {
  if (stopTimer) {
    clearTimeout(stopTimer);
    stopTimer = null;
  }

  const media = activeAudioElement;
  activeAudioElement = null;
  if (media) {
    media.onended = null;
    media.onerror = null;
    media.pause();
    try { media.currentTime = 0; } catch (_) { /* reprodução talvez ainda não tenha começado */ }
    media.removeAttribute('src');
    media.load();
  }
  if (activeObjectUrl) {
    URL.revokeObjectURL(activeObjectUrl);
    activeObjectUrl = null;
  }

  const ctx = audioContext;
  const gain = masterGain;
  audioContext = null;
  masterGain = null;
  const nodes = activeNodes;
  activeNodes = [];

  if (ctx && ctx.state !== 'closed') {
    try {
      if (gain && ctx.state === 'running') {
        gain.gain.cancelScheduledValues(ctx.currentTime);
        gain.gain.setValueAtTime(0, ctx.currentTime);
      }
      for (const node of nodes) {
        try { node.stop(); } catch (_) { /* nó já terminou */ }
      }
      await ctx.close();
    } catch (_) {
      // A reprodução já pode ter terminado ou estar fechando.
    }
  }

  playButton.disabled = false;
  stopButton.disabled = true;
  if (message) setStatus(message);
}

function createAudioChain(ctx) {
  const master = ctx.createGain();
  // Limitamos o ganho do aplicativo. Isso não modifica o volume do sistema.
  master.gain.value = Math.min(Number(volume.value) / 100, MAX_APP_GAIN);
  masterGain = master;

  const compressor = ctx.createDynamicsCompressor();
  compressor.threshold.value = -18;
  compressor.knee.value = 18;
  compressor.ratio.value = 8;
  compressor.attack.value = 0.004;
  compressor.release.value = 0.12;

  const shaper = ctx.createWaveShaper();
  shaper.curve = makeDistortionCurve(105);
  shaper.oversample = '2x';
  shaper.connect(compressor);
  compressor.connect(master);
  master.connect(ctx.destination);
  return shaper;
}

async function playSelectedFile(ctx, shaper) {
  activeAudioElement = new Audio();
  activeObjectUrl = URL.createObjectURL(selectedAudioFile);
  activeAudioElement.src = activeObjectUrl;
  activeAudioElement.preload = 'auto';
  activeAudioElement.volume = 1; // O nível final é limitado no nó masterGain.
  const source = ctx.createMediaElementSource(activeAudioElement);
  source.connect(shaper);
  await activeAudioElement.play();
  activeAudioElement.onended = () => {
    stopAudio('Reprodução concluída. O arquivo só foi tocado localmente.');
  };
  setStatus(`Reproduzindo ${selectedAudioFile.name} (máximo de 2,5 segundos)…`, true);
}

function playBuiltInSignal(ctx, shaper) {
  const notes = [155, 232, 185, 294, 164, 246, 207, 138];
  const start = ctx.currentTime + 0.045;
  const step = 0.235;
  for (let i = 0; i < notes.length; i++) {
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = i % 3 === 0 ? 'sawtooth' : 'square';
    osc.frequency.setValueAtTime(notes[i], start + i * step);
    osc.frequency.linearRampToValueAtTime(notes[i] * (i % 2 ? 1.16 : 0.87), start + i * step + step * 0.86);
    env.gain.setValueAtTime(0.0001, start + i * step);
    env.gain.linearRampToValueAtTime(0.42, start + i * step + 0.018);
    env.gain.setValueAtTime(0.42, start + i * step + step * 0.58);
    env.gain.exponentialRampToValueAtTime(0.0001, start + i * step + step * 0.92);
    osc.connect(env);
    env.connect(shaper);
    osc.start(start + i * step);
    osc.stop(start + i * step + step);
    activeNodes.push(osc);
  }
  setStatus('Gerando sinal interno de teste… use Stop para interromper.', true);
}

async function playTest() {
  if (audioContext) await stopAudio(null);
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) {
    setStatus('Este ambiente não oferece suporte ao áudio. Tente uma versão atual do Chrome ou Edge.');
    return;
  }

  try {
    audioContext = new AudioContextClass();
    await audioContext.resume();
    const ctx = audioContext;
    const shaper = createAudioChain(ctx);

    if (selectedAudioFile) {
      await playSelectedFile(ctx, shaper);
    } else {
      playBuiltInSignal(ctx, shaper);
    }

    playButton.disabled = true;
    stopButton.disabled = false;
    stopTimer = setTimeout(() => {
      stopAudio('Teste concluído. Resultado: excesso de confiança detectado. 😭');
    }, MAX_PLAYBACK_MS);
  } catch (error) {
    console.error('Não foi possível iniciar o teste de áudio.', error);
    await stopAudio('Não foi possível iniciar o áudio. Tente um arquivo MP3 ou WAV compatível.');
  }
}

playButton.addEventListener('click', playTest);
stopButton.addEventListener('click', () => stopAudio('Teste interrompido.'));
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && audioContext) stopAudio('Teste interrompido pelo teclado.');
});

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((error) => {
      console.warn('Modo offline indisponível neste momento.', error);
    });
  });
}
