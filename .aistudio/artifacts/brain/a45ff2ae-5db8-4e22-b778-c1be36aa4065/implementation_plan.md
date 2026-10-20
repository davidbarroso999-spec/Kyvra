# Plano de Implementação: Efeito MorphSlider nas Passagens de Capa

Integrar a transição de capas do componente **MorphSlider (React Bits)** utilizando **WebGL (OGL) e shaders de distorção orgânica ("melt")** em dois locais essenciais do sistema:
1. **No Player de Música (MiniPlayer / Full Player)**: transição GPU fluida entre capas ao avançar, retroceder ou selecionar faixas, eliminando qualquer piscar e aplicando a distorção cinematográfica de "melt" com aberração cromática e drift.
2. **Na Seção de Fragmentos em Destaque (Home)**: atualização do slider com a especificação exata do React Bits (parâmetros `transition="melt"`, `intensity=0.55`, `aberration=0.35`, `drift=0.4`, autoplay sincronizado com os metadados da faixa).

---

## Análise e Arquitetura

### 1. Núcleo do MorphSlider (`src/components/ui/MorphSlider.tsx` e `MorphSlider.css`)
- Atualizar a implementação de base com o código oficial fornecido do React Bits, assegurando:
  - Shaders WebGL de alta precisão (`precision highp float`) com matriz de ruído procedural, FBM, deslocamento "melt", aberração cromática (`uAberration`) e respiração contínua (`uDrift`).
  - Classe `MorphEngine` com gerenciamento de texturas via OGL, ciclo `requestAnimationFrame` otimizado e tratamento de redimensionamento via `ResizeObserver`.
  - Exportação de ref imperativo (`next()`, `prev()`, `goTo()`, `morphTo(imageUrl)`) para acionamento programático por eventos externos (como o player de áudio).

### 2. Transição de Capa no Player de Música (`src/components/ui/MiniPlayer.tsx`)
- Criar ou integrar o componente `PlayerMorphCover` no Full Player (tanto no layout vertical/retrato quanto no layout horizontal/paisagem):
  - Em vez de um simples `<img />` com crossfade padrão, a capa será renderizada através do canvas WebGL do MorphSlider com proporção 1:1 e cantos arredondados (`radius=16`).
  - Ao mudar a faixa (`currentTrack.coverUrl`), o MorphEngine dispara a transição `melt` da capa anterior para a nova com duração de 1.1s e easing `power2.inOut`.
  - Preserva integralmente o gesto vertical de arrastar para baixo para fechar o player e os controles de áudio.

### 3. Seção de Fragmentos em Destaque (`src/components/ui/FeaturedSlider.tsx` e `src/pages/Home.tsx`)
- Configurar as props do `MorphSlider` exatamente como especificado:
  - `transition="melt"`
  - `intensity={0.55}`
  - `aberration={0.35}`
  - `drift={0.4}`
  - `duration={1.1}`
  - `autoplay={true}` com delay configurado
- Garantir que a lista de faixas enviada pelo `Home.tsx` mantenha capas distintas por álbum para que a transição de morphing execute visualmente de forma rica e perceptível a cada ciclo.

---

## Fases de Execução

### Fase 1: Atualização e Aprimoramento do Componente MorphSlider
- Atualizar `src/components/ui/MorphSlider.tsx` e `src/components/ui/MorphSlider.css` para refletir fielmente a fonte oficial do React Bits.
- Adicionar o método `morphTo(image: string)` no `MorphEngine` e na interface `MorphSliderRef` para permitir transição sob demanda direcionada a uma URL específica.

### Fase 2: Aplicação na Seção de Fragmentos em Destaque (Home)
- Ajustar `FeaturedSlider.tsx` para passar os parâmetros exatos do prompt (`intensity=0.55`, `aberration=0.35`, `drift=0.4`, etc.).
- Verificar a sincronização de título, vibe e botão reproduzir.

### Fase 3: Aplicação na Passagem de Capas do Player
- Implementar o componente de capa no `MiniPlayer.tsx` integrando o motor do MorphSlider com efeito melt.
- Testar troca de faixa pelo botão avançar, voltar e seleção direta na lista.
- Manter suporte responsivo aos modos Retrato e Paisagem móvel.

### Fase 4: Verificação e Validação
- Executar `lint_applet` e `compile_applet` para garantir ausência de erros TypeScript e de compilação.
- Validar a performance de renderização GPU (60fps) e o descarte correto de contextos WebGL (`destroy()`).
