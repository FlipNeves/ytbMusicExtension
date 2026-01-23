import { useEffect, useRef } from 'react';

export const useVisualizer = (visualizerRef: React.RefObject<HTMLDivElement | null>, isEnabled: boolean) => {
    const audioCtxRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
    const animationIdRef = useRef<number | null>(null);
    const audioInitFailedRef = useRef<boolean>(false);

    useEffect(() => {
        let lastFrameTime = 0;
        const targetFPS = 30;
        const frameInterval = 1000 / targetFPS;

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

            if (document.hidden || !visualizerRef.current) {
                animationIdRef.current = requestAnimationFrame(drawFallback);
                return;
            }

            const bars = visualizerRef.current.querySelectorAll<HTMLDivElement>('.bar');
            bars.forEach((bar) => {
                const scale = 0.2 + Math.random() * 0.8;
                bar.style.transform = `scaleY(${scale})`;
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
                animationIdRef.current = requestAnimationFrame(draw);
                return;
            }

            if (analyserRef.current && visualizerRef.current) {
                const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
                analyserRef.current.getByteFrequencyData(dataArray);

                const bars = visualizerRef.current.querySelectorAll<HTMLDivElement>('.bar');
                const barCount = bars.length;

                for (let i = 0; i < barCount; i++) {
                    const dataIndex = Math.floor(dataArray.length / barCount * i);
                    const val = dataArray[dataIndex] || 0;
                    const scale = (val / 255) * 1.5;
                    bars[i].style.transform = `scaleY(${Math.max(0.05, scale)})`;
                }
            }
            animationIdRef.current = requestAnimationFrame(draw);
        };

        if (isEnabled) {
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
                const bars = visualizerRef.current.querySelectorAll<HTMLDivElement>('.bar');
                bars.forEach((bar) => {
                    bar.style.transform = 'scaleY(0.1)';
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
