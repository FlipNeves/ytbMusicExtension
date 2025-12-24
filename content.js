class FocusMode {
    constructor() {
        this.isActive = false;
        this.elements = {};
        this.observers = [];
        this.audioCtx = null;
        this.analyser = null;
        this.dataArray = null;
        this.source = null;
        this.animationId = null;

        this.toggle = this.toggle.bind(this);
        this.syncPlayerState = this.syncPlayerState.bind(this);
        this.updateTime = this.updateTime.bind(this);
        this.drawVisualizer = this.drawVisualizer.bind(this);

        this.init();
    }

    init() {
        const checkReady = setInterval(() => {
            if (document.querySelector('ytmusic-player-bar')) {
                clearInterval(checkReady);
                this.injectButton();
                this.createOverlay();
                this.startObservers();
                console.log('Focus Mode: Initialized');
            }
        }, 1000);
    }

    injectButton() {
        if (document.getElementById('btn-cinema-mode')) return;
        const rightControls = document.querySelector('.right-controls-buttons');
        if (!rightControls) return;

        const btn = document.createElement('button');
        btn.id = 'btn-cinema-mode';
        btn.title = 'Modo Foco';
        btn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>`;
        btn.onclick = this.toggle;
        rightControls.prepend(btn);
    }

    createOverlay() {
        const overlay = document.createElement('div');
        overlay.id = 'focus-overlay';
        overlay.innerHTML = `
            <button class="focus-close-btn" title="Sair do Modo Foco">
                <svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
            </button>
            
            <div class="focus-player">
                <div class="focus-visualizer">
                    <div class="bar"></div>
                    <div class="bar"></div>
                    <div class="bar"></div>
                    <div class="bar"></div>
                    <div class="bar"></div>
                </div>
                <img src="" class="focus-album-art" crossorigin="anonymous" />
                <div class="focus-info">
                    <h1 class="focus-title">Música</h1>
                    <h2 class="focus-artist">Artista</h2>
                </div>
                
                <div class="focus-progress-container">
                    <div class="focus-progress-fill"></div>
                </div>
                <div class="focus-time-display">
                    <span class="curr-time">0:00</span>
                    <span class="total-time">0:00</span>
                </div>

                <div class="focus-controls">
                    <button class="focus-btn prev" title="Anterior">
                        <svg viewBox="0 0 24 24"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg>
                    </button>
                    <button class="focus-btn play-pause" title="Play/Pause">
                        <svg viewBox="0 0 24 24" class="icon-play"><path d="M8 5v14l11-7z"/></svg>
                        <svg viewBox="0 0 24 24" class="icon-pause" style="display:none"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                    </button>
                    <button class="focus-btn next" title="Próximo">
                        <svg viewBox="0 0 24 24"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>
                    </button>
                </div>
            </div>

            <div class="focus-next">
                <h3>A SEGUIR</h3>
                <div class="next-track-card">
                    <img src="" class="next-art" />
                    <div class="next-info">
                        <span class="next-title">...</span>
                        <span class="next-artist">...</span>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);
        this.elements.overlay = overlay;
        this.elements.art = overlay.querySelector('.focus-album-art');
        this.elements.title = overlay.querySelector('.focus-title');
        this.elements.artist = overlay.querySelector('.focus-artist');
        this.elements.progressFill = overlay.querySelector('.focus-progress-fill');
        this.elements.progressContainer = overlay.querySelector('.focus-progress-container');
        this.elements.currTime = overlay.querySelector('.curr-time');
        this.elements.totalTime = overlay.querySelector('.total-time');
        this.elements.playBtn = overlay.querySelector('.play-pause');
        this.elements.prevBtn = overlay.querySelector('.prev');
        this.elements.nextBtn = overlay.querySelector('.next');
        this.elements.nextArt = overlay.querySelector('.next-art');
        this.elements.nextTitle = overlay.querySelector('.next-title');
        this.elements.nextArtist = overlay.querySelector('.next-artist');
        this.elements.nextContainer = overlay.querySelector('.focus-next');
        this.elements.visualizerBars = overlay.querySelectorAll('.focus-visualizer .bar');

        overlay.querySelector('.focus-close-btn').onclick = this.toggle;
        this.elements.playBtn.onclick = () => document.querySelector('#play-pause-button').click();
        this.elements.prevBtn.onclick = () => document.querySelector('.previous-button').click();
        this.elements.nextBtn.onclick = () => document.querySelector('.next-button').click();
        this.elements.progressContainer.onclick = (e) => {
            const rect = this.elements.progressContainer.getBoundingClientRect();
            const pct = (e.clientX - rect.left) / rect.width;
            const progressBar = document.querySelector('#progress-bar');
            if (progressBar) {
                const clickEvent = new MouseEvent('click', {
                    bubbles: true, cancelable: true, view: window,
                    clientX: progressBar.getBoundingClientRect().left + (progressBar.offsetWidth * pct),
                    clientY: progressBar.getBoundingClientRect().top + (progressBar.offsetHeight / 2)
                });
                progressBar.dispatchEvent(clickEvent);
            }
        };

        document.addEventListener('keydown', (e) => {
            if (this.isActive && e.key === 'Escape') this.toggle();
        });
    }

    toggle() {
        this.isActive = !this.isActive;
        document.body.classList.toggle('focus-mode-active', this.isActive);
        this.elements.overlay.classList.toggle('visible', this.isActive);

        if (this.isActive) {
            this.syncPlayerState();
            document.documentElement.requestFullscreen().catch(() => { });
            this.setupAudioContext(); 
        } else {
            if (document.fullscreenElement) document.exitFullscreen().catch(() => { });
        }
    }

    setupAudioContext() {
        if (this.audioCtx) return;

        try {
            const video = document.querySelector('video');
            if (!video) return;

            video.crossOrigin = "anonymous";

            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.audioCtx = new AudioContext();
            this.analyser = this.audioCtx.createAnalyser();
            this.analyser.fftSize = 32;

            this.source = this.audioCtx.createMediaElementSource(video);
            this.source.connect(this.analyser);
            this.analyser.connect(this.audioCtx.destination); 

            this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
            this.drawVisualizer();
        } catch (e) {
            console.warn("Audio Visualizer Error (likely CORS):", e);
        }
    }

    drawVisualizer() {
        if (!this.isActive || !this.analyser) {
            if (this.isActive) {
                requestAnimationFrame(this.drawVisualizer.bind(this));
            }
            return;
        }

        this.analyser.getByteFrequencyData(this.dataArray);

        const bars = this.elements.visualizerBars;

        for (let i = 0; i < bars.length; i++) {
            const val = this.dataArray[i] || 0;
            const scale = (val / 255) * 1.5;
            bars[i].style.transform = `scaleY(${Math.max(0.05, scale)})`;
        }

        requestAnimationFrame(this.drawVisualizer.bind(this));
    }
    
    startObservers() {
        const playerBar = document.querySelector('ytmusic-player-bar');
        if (!playerBar) return;

        const metaObserver = new MutationObserver(() => {
            setTimeout(() => this.syncPlayerState(), 50);
        });
        metaObserver.observe(playerBar, { subtree: true, attributes: true, childList: true });

        const bindVideo = () => {
            const video = document.querySelector('video');
            if (video && !video._focusModeBound) {
                video._focusModeBound = true;
                video.addEventListener('play', () => this.syncPlayerState());
                video.addEventListener('pause', () => this.syncPlayerState());
                video.addEventListener('timeupdate', () => this.updateTime());
                video.addEventListener('loadeddata', () => this.syncPlayerState());
            }
        }
        bindVideo();
        setInterval(bindVideo, 2000);
        setInterval(() => this.syncUpNext(), 2000);
    }

    async syncPlayerState() {
        const artEl = document.querySelector('.thumbnail-image-wrapper img');
        if (artEl) {
            let newSrc = artEl.src;
            if (newSrc.includes('googleusercontent.com')) {
                newSrc = newSrc.replace(/w\d+-h\d+/, 'w1200-h1200');
            }
            if (newSrc !== this.elements.art.src) {
                this.elements.art.src = newSrc;
                document.documentElement.style.setProperty('--ytm-album-art-url', `url('${newSrc}')`);

                try {
                    const color = await this.extractColor(newSrc);
                    const finalColor = this.adjustColorBrightness(color);

                    document.documentElement.style.setProperty('--ytm-focus-accent', finalColor);
                    document.documentElement.style.setProperty('--minha-cor-tema', finalColor);
                    document.documentElement.style.setProperty('--paper-slider-active-color', finalColor);
                    document.documentElement.style.setProperty('--paper-slider-knob-color', finalColor);
                    document.documentElement.style.setProperty('--ytmusic-play-button-icon-color', finalColor);
                    document.documentElement.style.setProperty('--yt-spec-themed-blue', finalColor);
                    document.documentElement.style.setProperty('--yt-spec-call-to-action', finalColor);
                } catch (e) {
                    console.warn(e);
                }
            }
        }

        if (!this.isActive) return;

        const titleEl = document.querySelector('.content-info-wrapper .title');
        const artistEl = document.querySelector('.content-info-wrapper .byline');
        if (titleEl) this.elements.title.textContent = titleEl.textContent;
        if (artistEl) this.elements.artist.textContent = artistEl.textContent.split('•')[0].trim();

        const video = document.querySelector('video');
        const isPlaying = video ? !video.paused : false;

        const iconPlay = this.elements.playBtn.querySelector('.icon-play');
        const iconPause = this.elements.playBtn.querySelector('.icon-pause');

        if (isPlaying) {
            this.elements.overlay.classList.add('is-playing');
            iconPlay.style.display = 'none';
            iconPause.style.display = 'block';
            if (this.audioCtx && this.audioCtx.state === 'suspended') this.audioCtx.resume();
        } else {
            this.elements.overlay.classList.remove('is-playing');
            iconPlay.style.display = 'block';
            iconPause.style.display = 'none';
        }
    }

    updateTime() {
        if (!this.isActive) return;
        const video = document.querySelector('video');
        if (video) {
            const curr = video.currentTime;
            const total = video.duration || 0;
            this.elements.currTime.textContent = this.formatTime(curr);
            this.elements.totalTime.textContent = this.formatTime(total);
            if (total > 0) {
                const percent = (curr / total) * 100;
                this.elements.progressFill.style.width = `${percent}%`;
            }
        }
    }

    syncUpNext() {
        const queueItems = document.querySelectorAll('ytmusic-player-queue-item');
        if (queueItems && queueItems.length > 0) {
            let foundRunning = false;
            let nextItem = null;
            for (const item of queueItems) {
                if (item.hasAttribute('selected')) { foundRunning = true; continue; }
                if (foundRunning) { nextItem = item; break; }
            }
            if (nextItem) {
                const title = nextItem.querySelector('.song-title') ? nextItem.querySelector('.song-title').textContent : '';
                const artist = nextItem.querySelector('.byline') ? nextItem.querySelector('.byline').textContent : '';
                const img = nextItem.querySelector('img');

                if (title) {
                    this.elements.nextTitle.textContent = title;
                    this.elements.nextArtist.textContent = artist;
                    if (img && img.src) {
                        this.elements.nextArt.src = img.src;
                        this.elements.nextArt.style.display = 'block';
                    } else {
                        this.elements.nextArt.style.display = 'none';
                    }
                    this.elements.nextContainer.style.opacity = '1';
                    return;
                }
            }
        }
    }

    formatTime(seconds) {
        if (!seconds || isNaN(seconds)) return "0:00";
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    }

    extractColor(imgSrc) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'Anonymous';
            img.src = imgSrc;
            img.onload = () => {
                try {
                    const canvas = document.createElement('canvas');
                    canvas.width = 1;
                    canvas.height = 1;
                    const ctx = canvas.getContext('2d', { willReadFrequently: true });
                    ctx.drawImage(img, 0, 0, 1, 1);
                    const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
                    resolve({ r, g, b });
                } catch (e) {
                    resolve({ r: 255, g: 0, b: 0 });
                }
            };
            img.onerror = () => resolve({ r: 255, g: 0, b: 0 });
        });
    }

    adjustColorBrightness(colorObj) {
        let { r, g, b } = colorObj;

        const brightness = (r * 299 + g * 587 + b * 114) / 1000;

        if (brightness < 60) {
            const factor = 1.5;
            r = Math.min(255, r * factor + 50);
            g = Math.min(255, g * factor + 50);
            b = Math.min(255, b * factor + 50);
        }

        return `rgb(${Math.floor(r)},${Math.floor(g)},${Math.floor(b)})`;
    }
}

new FocusMode();