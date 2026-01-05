import { useEffect, useRef } from 'react';

export const useVisualizer = (visualizerRef: React.RefObject<HTMLDivElement | null>, isEnabled: boolean) => {
    const audioCtxRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
    const animationIdRef = useRef<number | null>(null);

    useEffect(() => {
        const initAudioContext = () => {
            const video = document.querySelector('video');
            if (!video) return false;

            if (!audioCtxRef.current) {
                try {
                    video.crossOrigin = "anonymous";
                    const AudioContext = window.AudioContext || (window as unknown as { webkitAudioContext: typeof window.AudioContext }).webkitAudioContext;
                    audioCtxRef.current = new AudioContext();
                    analyserRef.current = audioCtxRef.current.createAnalyser();
                    analyserRef.current.fftSize = 32;
                    sourceRef.current = audioCtxRef.current.createMediaElementSource(video);
                    sourceRef.current.connect(analyserRef.current);
                    analyserRef.current.connect(audioCtxRef.current.destination);
                } catch {
                    return false;
                }
            }
            return true;
        };

        const draw = () => {
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
            if (initAudioContext()) {
                if (audioCtxRef.current?.state === 'suspended') {
                    audioCtxRef.current.resume();
                }
                if (animationIdRef.current === null) {
                    animationIdRef.current = requestAnimationFrame(draw);
                }
            }
        } else {
            if (animationIdRef.current) {
                cancelAnimationFrame(animationIdRef.current);
                animationIdRef.current = null;
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
