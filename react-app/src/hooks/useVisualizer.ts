import { useEffect, useRef } from 'react';

export const useVisualizer = (visualizerRef: React.RefObject<HTMLDivElement | null>, isEnabled: boolean) => {
    const audioCtxRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
    const animationIdRef = useRef<number | null>(null);

    const draw = () => {
        if (!analyserRef.current || !visualizerRef.current) {
            animationIdRef.current = requestAnimationFrame(draw);
            return;
        };

        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);

        const bars = visualizerRef.current.querySelectorAll<HTMLDivElement>('.bar');
        for (let i = 0; i < bars.length; i++) {
            const val = dataArray[i] || 0;
            const scale = (val / 255) * 1.5;
            bars[i].style.transform = `scaleY(${Math.max(0.05, scale)})`;
        }

        animationIdRef.current = requestAnimationFrame(draw);
    };

    useEffect(() => {
        const initAudioContext = () => {
            const video = document.querySelector('video');
            if (!video) {
                return;
            }

            if (!audioCtxRef.current) {
                try {
                    video.crossOrigin = "anonymous";
                    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
                    audioCtxRef.current = new AudioContext();
                    analyserRef.current = audioCtxRef.current.createAnalyser();
                    analyserRef.current.fftSize = 32;
                    sourceRef.current = audioCtxRef.current.createMediaElementSource(video);
                    sourceRef.current.connect(analyserRef.current);
                    analyserRef.current.connect(audioCtxRef.current.destination);
                } catch (e) {
                }
            }
        };

        if (isEnabled) {
            if (!audioCtxRef.current) {
                initAudioContext();
            }
            if (audioCtxRef.current?.state === 'suspended') {
                audioCtxRef.current.resume();
            }
            if (animationIdRef.current === null) {
                draw();
            }
        } else {
            if (animationIdRef.current) {
                cancelAnimationFrame(animationIdRef.current);
                animationIdRef.current = null;
            }
        }

        return () => {
        };
    }, [isEnabled, visualizerRef]);

    useEffect(() => {
        return () => {
            if (audioCtxRef.current) {
                audioCtxRef.current.close();
            }
            if (animationIdRef.current) {
                cancelAnimationFrame(animationIdRef.current);
            }
        }
    }, []);
};
