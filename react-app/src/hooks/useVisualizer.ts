import { useEffect, useRef } from 'react';

/**
 * useVisualizer - Barras de frequência do player
 *
 * O YTM substitui o elemento <video> ao longo do uso (anúncios, troca
 * música/vídeo, navegação SPA); o grafo de áudio é reconstruído quando isso
 * acontece. Como createMediaElementSource só pode ser chamado uma vez por
 * elemento, os source nodes são reaproveitados via WeakMap.
 */
export const useVisualizer = (visualizerRef: React.RefObject<HTMLDivElement | null>, isEnabled: boolean) => {
    const audioCtxRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
    const sourceElRef = useRef<HTMLVideoElement | null>(null);
    const sourcesByElementRef = useRef(new WeakMap<HTMLMediaElement, MediaElementAudioSourceNode>());
    const animationIdRef = useRef<number | null>(null);
    const barsRef = useRef<HTMLDivElement[]>([]);
    const lastValuesRef = useRef<number[]>([]);
    const dataArrayRef = useRef<Uint8Array<ArrayBuffer> | null>(null);

    useEffect(() => {
        let lastFrameTime = 0;
        const targetFPS = 20;
        const frameInterval = 1000 / targetFPS;
        const minChangeThreshold = 0.02;

        const updateBarsCache = () => {
            if (visualizerRef.current) {
                barsRef.current = Array.from(visualizerRef.current.querySelectorAll<HTMLDivElement>('.bar'));
                lastValuesRef.current = new Array(barsRef.current.length).fill(0.1);
            }
        };

        /**
         * Garante o grafo de áudio ligado ao <video> atual,
         * reconstruindo a conexão se o elemento tiver sido substituído
         */
        const ensureAudioGraph = (): boolean => {
            const video = document.querySelector('video');
            if (!video) return false;
            if (video === sourceElRef.current && audioCtxRef.current) return true;

            try {
                if (!audioCtxRef.current) {
                    const AudioContextCtor = window.AudioContext ||
                        (window as unknown as { webkitAudioContext: typeof window.AudioContext }).webkitAudioContext;
                    audioCtxRef.current = new AudioContextCtor();
                    analyserRef.current = audioCtxRef.current.createAnalyser();
                    analyserRef.current.fftSize = 32;
                    analyserRef.current.smoothingTimeConstant = 0.8;
                    analyserRef.current.connect(audioCtxRef.current.destination);
                }

                let source = sourcesByElementRef.current.get(video);
                if (!source) {
                    source = audioCtxRef.current.createMediaElementSource(video);
                    sourcesByElementRef.current.set(video, source);
                }

                sourceRef.current?.disconnect();
                source.connect(analyserRef.current!);
                sourceRef.current = source;
                sourceElRef.current = video;
                return true;
            } catch {
                return false;
            }
        };

        const hasLiveAnalyser = (): boolean =>
            !!analyserRef.current && !!sourceElRef.current?.isConnected;

        const draw = (timestamp: number) => {
            animationIdRef.current = requestAnimationFrame(draw);

            if (timestamp - lastFrameTime < frameInterval) return;
            lastFrameTime = timestamp;

            if (document.hidden) return;
            if (barsRef.current.length === 0) return;

            const bars = barsRef.current;
            const barCount = bars.length;

            if (hasLiveAnalyser()) {
                const analyser = analyserRef.current!;
                if (!dataArrayRef.current || dataArrayRef.current.length !== analyser.frequencyBinCount) {
                    dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);
                }
                const dataArray = dataArrayRef.current;
                analyser.getByteFrequencyData(dataArray);

                for (let i = 0; i < barCount; i++) {
                    const dataIndex = Math.floor(dataArray.length / barCount * i);
                    const val = dataArray[dataIndex] || 0;
                    const newScale = Math.max(0.05, (val / 255) * 1.5);
                    const oldScale = lastValuesRef.current[i] || 0.1;

                    if (Math.abs(newScale - oldScale) > minChangeThreshold) {
                        bars[i].style.transform = `scaleY(${newScale})`;
                        lastValuesRef.current[i] = newScale;
                    }
                }
            } else {
                // Fallback animado enquanto o grafo de áudio não está disponível
                bars.forEach((bar, i) => {
                    const newScale = 0.2 + Math.random() * 0.8;
                    const oldScale = lastValuesRef.current[i] || 0.1;

                    if (Math.abs(newScale - oldScale) > minChangeThreshold) {
                        bar.style.transform = `scaleY(${newScale})`;
                        lastValuesRef.current[i] = newScale;
                    }
                });
            }
        };

        if (isEnabled) {
            updateBarsCache();
            ensureAudioGraph();
            if (audioCtxRef.current?.state === 'suspended') {
                audioCtxRef.current.resume();
            }
            if (animationIdRef.current === null) {
                animationIdRef.current = requestAnimationFrame(draw);
            }

            // Reconecta o grafo se o YTM substituir o <video> durante a sessão
            const graphInterval = setInterval(() => {
                ensureAudioGraph();
                if (audioCtxRef.current?.state === 'suspended') {
                    audioCtxRef.current.resume();
                }
            }, 2000);

            return () => {
                clearInterval(graphInterval);
                if (animationIdRef.current) {
                    cancelAnimationFrame(animationIdRef.current);
                    animationIdRef.current = null;
                }
            };
        }

        if (animationIdRef.current) {
            cancelAnimationFrame(animationIdRef.current);
            animationIdRef.current = null;
        }
        // Reset das barras quando não está tocando
        if (visualizerRef.current) {
            if (barsRef.current.length === 0) updateBarsCache();

            barsRef.current.forEach((bar, i) => {
                bar.style.transform = 'scaleY(0.1)';
                lastValuesRef.current[i] = 0.1;
            });
        }
    }, [isEnabled, visualizerRef]);

    useEffect(() => {
        return () => {
            if (audioCtxRef.current) {
                audioCtxRef.current.close();
            }
        };
    }, []);
};
