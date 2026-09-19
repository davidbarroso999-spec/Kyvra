/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Kyvra Scroll Audio Processor - Desativado a pedido do usuário
 */

export interface ResonanceState {
  intensity: number;
  velocity: number;
  direction: number;
}

type ResonanceListener = (state: ResonanceState) => void;

export function subscribeResonanceState(_listener: ResonanceListener): () => void {
  return () => {};
}

export interface MediaResonanceFX {
  context: AudioContext;
  dryGain: GainNode;
  resonantFilter: BiquadFilterNode;
  delayNode: DelayNode;
  feedbackFilter: BiquadFilterNode;
  feedbackGain: GainNode;
  wetGain: GainNode;
}

/**
 * Conexão direta sem qualquer efeito sonoro ou delay de scroll.
 */
export function attachScrollResonanceToMedia(
  context: AudioContext,
  sourceNode: MediaElementAudioSourceNode,
  destination: AudioNode
): MediaResonanceFX {
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
