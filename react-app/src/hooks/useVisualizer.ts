import { useEffect, useRef } from 'react';

export const useVisualizer = (visualizerRef: React.RefObject<HTMLDivElement | null>, isEnabled: boolean) => {
    const audioCtxRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
    const animationIdRef = useRef<number | null>(null);
    const audioInitFailedRef = useRef<boolean>(false);
    const barsRef = useRef<HTMLDivElement[]>([]);
    const lastValuesRef = useRef<number[]>([]);
    const isPausedRef = useRef<boolean>(false);
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

        const initAudioContext = () => {
            if (audioInitFailedRef.current) return false;

            const video = document.querySelector('video');
            if (!video) return false;

            if (!audioCtxRef.current) {
                try {
                    const AudioContext = window.AudioContext || (window as unknown as { webkitAudioContext: typeof window.AudioContext }).webkitAudioContext;
                    audioCtxRef.current = new AudioContext();
                    analyserRef.current = audioCtxRef.current.createAnalyser();
                    analyserRef.current.fftSize = 32;
                    analyserRef.current.smoothingTimeConstant = 0.8;
                    sourceRef.current = audioCtxRef.current.createMediaElementSource(video);
                    sourceRef.current.connect(analyserRef.current);
                    analyserRef.current.connect(audioCtxRef.current.destination);
                } catch {
                    audioInitFailedRef.current = true;
                    return false;
                }
            }
            return true;
        };

        // Fallback animation when audio context fails
        const drawFallback = (timestamp: number) => {
            if (timestamp - lastFrameTime < frameInterval) {
                animationIdRef.current = requestAnimationFrame(drawFallback);
                return;
            }
            lastFrameTime = timestamp;

            if (document.hidden) {
                isPausedRef.current = true;
                animationIdRef.current = requestAnimationFrame(drawFallback);
                return;
            }

            if (!visualizerRef.current || barsRef.current.length === 0) {
                animationIdRef.current = requestAnimationFrame(drawFallback);
                return;
            }

            barsRef.current.forEach((bar, i) => {
                const newScale = 0.2 + Math.random() * 0.8;
                const oldScale = lastValuesRef.current[i] || 0.1;
                
                if (Math.abs(newScale - oldScale) > minChangeThreshold) {
                    bar.style.transform = `scaleY(${newScale})`;
                    lastValuesRef.current[i] = newScale;
                }
            });

            animationIdRef.current = requestAnimationFrame(drawFallback);
        };

        const draw = (timestamp: number) => {
            if (timestamp - lastFrameTime < frameInterval) {
                animationIdRef.current = requestAnimationFrame(draw);
                return;
            }
            lastFrameTime = timestamp;

            if (document.hidden) {
                isPausedRef.current = true;
                animationIdRef.current = requestAnimationFrame(draw);
                return;
            }

            isPausedRef.current = false;

            if (analyserRef.current && barsRef.current.length > 0) {
                if (!dataArrayRef.current || dataArrayRef.current.length !== analyserRef.current.frequencyBinCount) {
                    dataArrayRef.current = new Uint8Array(analyserRef.current.frequencyBinCount);
                }
                const dataArray = dataArrayRef.current;
                analyserRef.current.getByteFrequencyData(dataArray);

                const bars = barsRef.current;
                const barCount = bars.length;

                let hasChanges = false;

                for (let i = 0; i < barCount; i++) {
                    const dataIndex = Math.floor(dataArray.length / barCount * i);
                    const val = dataArray[dataIndex] || 0;
                    const newScale = Math.max(0.05, (val / 255) * 1.5);
                    const oldScale = lastValuesRef.current[i] || 0.1;
                    
                    if (Math.abs(newScale - oldScale) > minChangeThreshold) {
                        bars[i].style.transform = `scaleY(${newScale})`;
                        lastValuesRef.current[i] = newScale;
                        hasChanges = true;
                    }
                }

                if (!hasChanges && barsRef.current.length > 0) {
                    lastFrameTime = timestamp + frameInterval * 2;
                }
            }
            
            animationIdRef.current = requestAnimationFrame(draw);
        };

        if (isEnabled) {
            updateBarsCache();
            const audioInitialized = initAudioContext();

            if (audioInitialized) {
                if (audioCtxRef.current?.state === 'suspended') {
                    audioCtxRef.current.resume();
                }
                if (animationIdRef.current === null) {
                    animationIdRef.current = requestAnimationFrame(draw);
                }
            } else {
                // Use fallback animation
                if (animationIdRef.current === null) {
                    animationIdRef.current = requestAnimationFrame(drawFallback);
                }
            }
        } else {
            if (animationIdRef.current) {
                cancelAnimationFrame(animationIdRef.current);
                animationIdRef.current = null;
            }
            // Reset bars when not playing
            if (visualizerRef.current) {
                if (barsRef.current.length === 0) updateBarsCache();

                barsRef.current.forEach((bar, i) => {
                    bar.style.transform = 'scaleY(0.1)';
                    lastValuesRef.current[i] = 0.1;
                });
            }
        }

        return () => {
            if (animationIdRef.current) {
                cancelAnimationFrame(animationIdRef.current);
                animationIdRef.current = null;
            }
        };
    }, [isEnabled, visualizerRef]);

    useEffect(() => {
        return () => {
            if (audioCtxRef.current) {
                audioCtxRef.current.close();
            }
        };
    }, []);
};
