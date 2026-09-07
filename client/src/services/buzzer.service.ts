// Real-Time 30-Second Web Audio API Buzzer Service
// Designed for local and production environment notifications
// Guarantees SINGLE continuous buzzer audio source per alert (no overlapping sound engines)
// Includes Mobile Audio Autoplay Unlocking & Vibration Loop Engine

export type BuzzerState = {
  isPlaying: boolean;
  title: string;
  message: string;
  orderId?: string;
  remainingSeconds: number;
};

type BuzzerListener = (state: BuzzerState) => void;

class BuzzerService {
  private audioCtx: AudioContext | null = null;
  private isBuzzerActive: boolean = false;
  private pulseInterval: any = null;
  private vibrationInterval: any = null;
  private countdownTimer: any = null;
  private autoStopTimer: any = null;
  private listeners: Set<BuzzerListener> = new Set();
  private audioFallback: HTMLAudioElement | null = null;
  private isUnlocked: boolean = false;

  private state: BuzzerState = {
    isPlaying: false,
    title: '',
    message: '',
    orderId: undefined,
    remainingSeconds: 0
  };

  constructor() {
    this.setupAutoUnlock();
  }

  /**
   * Listens to user interactions (touch/click/pointer/key) anywhere on document
   * to immediately resume & unlock Web Audio API on iOS Safari & Android Chrome.
   */
  public setupAutoUnlock(): void {
    if (typeof window === 'undefined') return;

    const events = ['touchstart', 'touchend', 'click', 'pointerdown', 'keydown'];
    const handleUnlock = () => {
      this.unlockAudio();
      if (this.audioCtx && this.audioCtx.state === 'running') {
        events.forEach((evt) => {
          try {
            window.removeEventListener(evt, handleUnlock, true);
            document.removeEventListener(evt, handleUnlock, true);
          } catch (e) {}
        });
      }
    };

    events.forEach((evt) => {
      try {
        window.addEventListener(evt, handleUnlock, { capture: true, passive: true });
        document.addEventListener(evt, handleUnlock, { capture: true, passive: true });
      } catch (e) {}
    });
  }

  public unlockAudio(): AudioContext | null {
    if (typeof window === 'undefined') return null;

    try {
      if (!this.audioCtx) {
        const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtxClass) {
          this.audioCtx = new AudioCtxClass();
        }
      }

      if (this.audioCtx) {
        if (this.audioCtx.state === 'suspended') {
          this.audioCtx.resume().catch(() => {});
        }

        // Play silent 1ms audio buffer to prime iOS Safari & Mobile Chrome audio engine
        try {
          const buffer = this.audioCtx.createBuffer(1, 1, 22050);
          const source = this.audioCtx.createBufferSource();
          source.buffer = buffer;
          source.connect(this.audioCtx.destination);
          source.start(0);
          this.isUnlocked = true;
        } catch (e) {}
      }
    } catch (e) {}

    return this.audioCtx;
  }

  private initAudioContext(): AudioContext | null {
    return this.unlockAudio();
  }

  public subscribe(listener: BuzzerListener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach((cb) => cb({ ...this.state }));
  }

  /**
   * Triggers a SINGLE continuous 30-second buzzer audio alarm, mobile vibration, and visual notification.
   * Auto stops after durationMs (default 30,000ms = 30s).
   */
  public triggerBuzzer(options: {
    title: string;
    message: string;
    orderId?: string;
    durationMs?: number;
  }): void {
    const durationMs = options.durationMs || 30000;
    const initialSeconds = Math.ceil(durationMs / 1000);

    // Always stop any active sound first to ensure strictly 1 buzzer plays at a time
    this.stopBuzzer();

    // Ensure audio context is resumed & unlocked
    this.unlockAudio();

    this.isBuzzerActive = true;
    this.state = {
      isPlaying: true,
      title: options.title,
      message: options.message,
      orderId: options.orderId,
      remainingSeconds: initialSeconds
    };
    this.notifyListeners();

    // Mobile Vibration Alarm (Continuous haptic pulse loop)
    const triggerVibration = () => {
      if ('navigator' in window && 'vibrate' in navigator && this.isBuzzerActive) {
        try {
          navigator.vibrate([600, 200, 600, 200, 600, 200, 600]);
        } catch (e) {}
      }
    };
    triggerVibration();
    this.vibrationInterval = setInterval(triggerVibration, 2500);

    // Trigger Mobile & Browser Native Push Notification Popup
    this.triggerNativePushNotification(options.title, options.message, options.orderId);

    // Try Web Audio API synthesizer pulse first
    const synthSuccess = this.startSynthAudioPulse();

    // Fallback: Use HTML5 Audio ONLY if Web Audio API synthesizer fails
    if (!synthSuccess) {
      try {
        this.audioFallback = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
        this.audioFallback.loop = true;
        this.audioFallback.play().catch(() => {});
      } catch (e) {}
    }

    // Countdown Timer (Every 1s update remainingSeconds)
    this.countdownTimer = setInterval(() => {
      if (this.state.remainingSeconds > 1) {
        this.state.remainingSeconds -= 1;
        this.notifyListeners();
      } else {
        this.stopBuzzer();
      }
    }, 1000);

    // Hard Auto-Stop Timer at 30s
    this.autoStopTimer = setTimeout(() => {
      this.stopBuzzer();
    }, durationMs);
  }

  private startSynthAudioPulse(): boolean {
    try {
      const ctx = this.initAudioContext();
      if (!ctx) return false;

      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }

      let isHighTone = true;

      const playTone = () => {
        if (!this.isBuzzerActive || !this.audioCtx) return;
        try {
          if (ctx.state === 'suspended') {
            ctx.resume().catch(() => {});
          }

          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          // High tone 960Hz (B5), Low tone 720Hz (F#5) - Penetrating Emergency Alarm Tone
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(isHighTone ? 960 : 720, ctx.currentTime);
          isHighTone = !isHighTone;

          // Volume envelope
          gain.gain.setValueAtTime(0.5, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(ctx.currentTime);
          osc.stop(ctx.currentTime + 0.24);
        } catch (e) {}
      };

      // Immediate first pulse
      playTone();
      // Repeat pulse tone every 250ms for 30s duration
      this.pulseInterval = setInterval(playTone, 250);
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * Stops the buzzer audio completely and resets timers.
   */
  public stopBuzzer(): void {
    this.isBuzzerActive = false;

    if (this.pulseInterval) {
      clearInterval(this.pulseInterval);
      this.pulseInterval = null;
    }

    if (this.vibrationInterval) {
      clearInterval(this.vibrationInterval);
      this.vibrationInterval = null;
    }

    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }

    if (this.autoStopTimer) {
      clearTimeout(this.autoStopTimer);
      this.autoStopTimer = null;
    }

    if (this.audioFallback) {
      try {
        this.audioFallback.pause();
        this.audioFallback.currentTime = 0;
      } catch (e) {}
      this.audioFallback = null;
    }

    this.state = {
      isPlaying: false,
      title: '',
      message: '',
      orderId: undefined,
      remainingSeconds: 0
    };
    this.notifyListeners();
  }

  public async requestNotificationPermission(): Promise<boolean> {
    if (typeof window === 'undefined' || !('Notification' in window)) return false;
    if (Notification.permission === 'granted') return true;
    if (Notification.permission !== 'denied') {
      try {
        const permission = await Notification.requestPermission();
        return permission === 'granted';
      } catch (e) {}
    }
    return false;
  }

  public triggerNativePushNotification(title: string, message: string, orderId?: string): void {
    if (typeof window === 'undefined' || !('Notification' in window)) return;

    const showNotification = () => {
      try {
        const notif = new Notification(title, {
          body: message,
          icon: '/logo.png',
          tag: orderId ? `order-${orderId}` : `foodway-${Date.now()}`,
          requireInteraction: true,
          vibrate: [400, 200, 400, 200, 400]
        } as any);

        notif.onclick = () => {
          window.focus();
          notif.close();
        };
      } catch (e) {}
    };

    if (Notification.permission === 'granted') {
      showNotification();
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then((perm) => {
        if (perm === 'granted') {
          showNotification();
        }
      });
    }
  }

  public getState(): BuzzerState {
    return { ...this.state };
  }
}

export const buzzerService = new BuzzerService();
export default buzzerService;
