/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Kyvra Spatial Scroll Resonance & Delay Engine
 * Web Audio API real-time acoustic processor reacting to page scrolling.
 */

import { subscribeToScroll, ScrollEventPayload } from './smoothScroll';
import { useStore } from '../store/useStore';

export interface ResonanceState {
  intensity: number; // 0 to 1
  velocity: number;
  direction: number; // 1 (down) or -1 (up)
}

type ResonanceListener = (state: ResonanceState) => void;
const resonanceListeners = new Set<ResonanceListener>();

export function subscribeResonanceState(listener: ResonanceListener): () => void {
  resonanceListeners.add(listener);
  return () => {
    resonanceListeners.delete(listener);
  };
}

function emitResonanceState(intensity: number, velocity: number, direction: number) {
  const state: ResonanceState = { intensity, velocity, direction };
  resonanceListeners.forEach(listener => {
    try {
      listener(state);
    } catch (err) {
      console.error('Kyvra [ScrollResonance]: listener error', err);
    }
  });
}

// =========================================================================
// 1. Audio Track FX Bus (conectado diretamente ao elemento de áudio em reprodução)
// =========================================================================

interface MediaResonanceFX {
  context: AudioContext;
  dryGain: GainNode;
  resonantFilter: BiquadFilterNode;
  delayNode: DelayNode;
  feedbackFilter: BiquadFilterNode;
  feedbackGain: GainNode;
  wetGain: GainNode;
}

let activeMediaFX: MediaResonanceFX | null = null;

/**
 * Conecta o processador de ressonância e delay ao MediaElementAudioSourceNode ativo.
 */
export function attachScrollResonanceToMedia(
  context: AudioContext,
  sourceNode: MediaElementAudioSourceNode,
  destination: AudioNode
): MediaResonanceFX {
  try {
    // 1. Caminho Dry direto (sem latência, fidelidade 100%)
    const dryGain = context.createGain();
    dryGain.gain.value = 1.0;
    sourceNode.connect(dryGain);
    dryGain.connect(destination);

    // 2. Filtro Ressonante Dinâmico
    const resonantFilter = context.createBiquadFilter();
    resonantFilter.type = 'peaking';
    resonantFilter.frequency.value = 1100;
    resonantFilter.Q.value = 0.7;
    resonantFilter.gain.value = 0; // dB
    sourceNode.connect(resonantFilter);

    // 3. Linha de Delay Espacial
    const delayNode = context.createDelay(1.0);
    delayNode.delayTime.value = 0.22; // 220ms de delay cavernoso/espacial
    resonantFilter.connect(delayNode);

    // 4. Loop de Feedback com amortecimento analógico escuro
    const feedbackFilter = context.createBiquadFilter();
    feedbackFilter.type = 'lowpass';
    feedbackFilter.frequency.value = 3200; // Corta altas frequências nas repetições
    const feedbackGain = context.createGain();
    feedbackGain.gain.value = 0.28; // 2 a 3 repetições sutis

    delayNode.connect(feedbackFilter);
    feedbackFilter.connect(feedbackGain);
    feedbackGain.connect(delayNode);

    // 5. Saída Wet (mistura do efeito ao sinal principal)
    const wetGain = context.createGain();
    wetGain.gain.value = 0.0; // Silencioso quando o scroll está parado
    delayNode.connect(wetGain);
    wetGain.connect(destination);

    const fx: MediaResonanceFX = {
      context,
      dryGain,
      resonantFilter,
      delayNode,
      feedbackFilter,
      feedbackGain,
      wetGain,
    };

    activeMediaFX = fx;
    return fx;
  } catch (err) {
    console.warn('Kyvra [ScrollResonance]: Erro ao conectar FX ao áudio:', err);
    // Fallback de conexão direta
    sourceNode.connect(destination);
    const dummyGain = context.createGain();
    return {
      context,
      dryGain: dummyGain,
      resonantFilter: context.createBiquadFilter(),
      delayNode: context.createDelay(),
      feedbackFilter: context.createBiquadFilter(),
      feedbackGain: dummyGain,
      wetGain: dummyGain,
    };
  }
}

// =========================================================================
// 2. Sintetizador de Ressonância Ambiente (para quando nenhuma música estiver tocando)
// =========================================================================

class AmbientResonanceSynthesizer {
  private ctx: AudioContext | null = null;
  private osc1: OscillatorNode | null = null;
  private osc2: OscillatorNode | null = null;
  private filter: BiquadFilterNode | null = null;
  private delay: DelayNode | null = null;
  private feedback: GainNode | null = null;
  private feedbackFilter: BiquadFilterNode | null = null;
  private masterGain: GainNode | null = null;
  private isInitialized = false;

  private init() {
    if (this.isInitialized && this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();

      // Osciladores harmônicos afinados no "vazio" cósmico (Ré e Lá sutis)
      this.osc1 = this.ctx.createOscillator();
      this.osc1.type = 'sine';
      this.osc1.frequency.value = 146.83; // D3

      this.osc2 = this.ctx.createOscillator();
      this.osc2.type = 'triangle';
      this.osc2.frequency.value = 220.0; // A3

      this.filter = this.ctx.createBiquadFilter();
      this.filter.type = 'bandpass';
      this.filter.frequency.value = 380;
      this.filter.Q.value = 4.0;

      this.delay = this.ctx.createDelay(1.0);
      this.delay.delayTime.value = 0.25;

      this.feedbackFilter = this.ctx.createBiquadFilter();
      this.feedbackFilter.type = 'lowpass';
      this.feedbackFilter.frequency.value = 1800;

      this.feedback = this.ctx.createGain();
      this.feedback.gain.value = 0.32;

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0; // Inicia mudo

      // Roteamento do sintetizador ambiente
      this.osc1.connect(this.filter);
      this.osc2.connect(this.filter);

      // Direto + Delay
      this.filter.connect(this.masterGain);
      this.filter.connect(this.delay);

      this.delay.connect(this.feedbackFilter);
      this.feedbackFilter.connect(this.feedback);
      this.feedback.connect(this.delay);
      this.delay.connect(this.masterGain);

      this.masterGain.connect(this.ctx.destination);

      this.osc1.start();
      this.osc2.start();

      this.isInitialized = true;
    } catch (e) {
      console.warn('Kyvra [AmbientSynth]: Não foi possível inicializar áudio ambiente:', e);
    }
  }

  public trigger(intensity: number, velocity: number) {
    this.init();
    if (!this.ctx || !this.masterGain || !this.filter || !this.delay) return;

    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    const now = this.ctx.currentTime;
    // Volume sutil, como um sussurro de vento cósmico e ressonância etérea
    const targetGain = Math.min(0.032, intensity * 0.032);
    this.masterGain.gain.cancelScheduledValues(now);
    this.masterGain.gain.setTargetAtTime(targetGain, now, 0.08);

    // Variação de frequência da ressonância de acordo com velocidade
    const targetFreq = 340 + Math.abs(velocity) * 45;
    this.filter.frequency.setTargetAtTime(Math.min(800, targetFreq), now, 0.1);
  }

  public stop() {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    this.masterGain.gain.setTargetAtTime(0, now, 0.4);
  }
}

const ambientSynth = new AmbientResonanceSynthesizer();

// =========================================================================
// 3. Orquestrador de Scroll & Modulação
// =========================================================================

let decayTimeout: ReturnType<typeof setTimeout> | null = null;
let currentIntensity = 0;

function applyResonance(velocity: number, direction: number) {
  const isEnabled = useStore.getState().scrollResonanceEnabled;
  if (!isEnabled) {
    if (activeMediaFX && activeMediaFX.context) {
      const now = activeMediaFX.context.currentTime;
      activeMediaFX.wetGain.gain.setTargetAtTime(0, now, 0.1);
    }
    ambientSynth.stop();
    emitResonanceState(0, 0, 1);
    return;
  }

  const absVel = Math.abs(velocity);
  // Normaliza a velocidade de 0 a 1 (3.5 px/frame é um scroll rápido natural)
  const targetIntensity = Math.min(1, absVel / 3.2);
  currentIntensity = targetIntensity;

  emitResonanceState(targetIntensity, velocity, direction);

  const isMusicPlaying = useStore.getState().isPlaying;

  if (isMusicPlaying && activeMediaFX && activeMediaFX.context) {
    const fx = activeMediaFX;
    const ctx = fx.context;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    const now = ctx.currentTime;

    // 1. Wet Gain do delay (sobe suavemente com o movimento, máx 0.18 para não saturar a música)
    const targetWet = targetIntensity * 0.18;
    fx.wetGain.gain.cancelScheduledValues(now);
    fx.wetGain.gain.setTargetAtTime(targetWet, now, 0.06);

    // 2. Ressonância Q e Ganho do filtro
    const targetQ = 0.7 + targetIntensity * 2.8;
    const targetPeakGain = targetIntensity * 5.0; // +5dB no pico da frequência
    const targetFreq = 1100 + direction * targetIntensity * 200; // Desvio Doppler acústico

    fx.resonantFilter.Q.setTargetAtTime(targetQ, now, 0.08);
    fx.resonantFilter.gain.setTargetAtTime(targetPeakGain, now, 0.08);
    fx.resonantFilter.frequency.setTargetAtTime(targetFreq, now, 0.08);

    // 3. Micro-deslocamento espacial do delay para criar sensação de ar em movimento
    const microDelay = 0.22 + direction * 0.012 * targetIntensity;
    fx.delayNode.delayTime.setTargetAtTime(microDelay, now, 0.08);
  } else if (!isMusicPlaying && targetIntensity > 0.08) {
    // Quando a música está pausada, ativamos a ressonância etérea do espaço
    ambientSynth.trigger(targetIntensity, velocity);
  }

  // Agendamento do decaimento suave quando a rolagem parar
  if (decayTimeout) {
    clearTimeout(decayTimeout);
  }

  decayTimeout = setTimeout(() => {
    currentIntensity = 0;
    emitResonanceState(0, 0, direction);

    if (activeMediaFX && activeMediaFX.context) {
      const fx = activeMediaFX;
      const now = fx.context.currentTime;
      fx.wetGain.gain.setTargetAtTime(0, now, 0.45);
      fx.resonantFilter.Q.setTargetAtTime(0.7, now, 0.45);
      fx.resonantFilter.gain.setTargetAtTime(0, now, 0.45);
      fx.resonantFilter.frequency.setTargetAtTime(1100, now, 0.45);
      fx.delayNode.delayTime.setTargetAtTime(0.22, now, 0.45);
    }

    ambientSynth.stop();
  }, 120);
}

// Inicialização automática de listeners
if (typeof window !== 'undefined') {
  // 1. Conexão com o Lenis Smooth Scroll
  subscribeToScroll((e: ScrollEventPayload) => {
    applyResonance(e.velocity, e.direction || 1);
  });

  // 2. Fallback de Wheel nativo (para resposta instantânea em desktops)
  let lastWheelTime = 0;
  let lastWheelDeltaY = 0;

  window.addEventListener('wheel', (e: WheelEvent) => {
    const now = performance.now();
    const dt = Math.max(16, now - lastWheelTime);
    lastWheelTime = now;
    lastWheelDeltaY = e.deltaY;
    const velocity = (e.deltaY / dt) * 0.4;
    const direction = e.deltaY >= 0 ? 1 : -1;
    applyResonance(velocity, direction);
  }, { passive: true });

  // 3. Fallback de Touch no mobile
  let lastTouchY = 0;
  let lastTouchTime = 0;

  window.addEventListener('touchstart', (e: TouchEvent) => {
    if (e.touches.length > 0) {
      lastTouchY = e.touches[0].clientY;
      lastTouchTime = performance.now();
    }
  }, { passive: true });

  window.addEventListener('touchmove', (e: TouchEvent) => {
    if (e.touches.length > 0) {
      const currentY = e.touches[0].clientY;
      const now = performance.now();
      const dt = Math.max(16, now - lastTouchTime);
      const deltaY = lastTouchY - currentY;
      lastTouchY = currentY;
      lastTouchTime = now;

      const velocity = (deltaY / dt) * 0.5;
      const direction = deltaY >= 0 ? 1 : -1;
      applyResonance(velocity, direction);
    }
  }, { passive: true });
}
