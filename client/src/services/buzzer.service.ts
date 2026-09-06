// Real-Time 30-Second Web Audio API Buzzer Service
// Designed for local and production environment notifications
// Guarantees SINGLE continuous buzzer audio source per alert (no overlapping sound engines)

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
  private countdownTimer: any = null;
  private autoStopTimer: any = null;
  private listeners: Set<BuzzerListener> = new Set();
  private audioFallback: HTMLAudioElement | null = null;

  private state: BuzzerState = {
    isPlaying: false,
    title: '',
    message: '',
    orderId: undefined,
    remainingSeconds: 0
  };

  private initAudioContext(): AudioContext | null {
    if (!this.audioCtx) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        this.audioCtx = new AudioCtxClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
    return this.audioCtx;
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
   * Triggers a SINGLE continuous 30-second buzzer audio alarm and visual notification.
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

    this.isBuzzerActive = true;
    this.state = {
      isPlaying: true,
      title: options.title,
      message: options.message,
      orderId: options.orderId,
      remainingSeconds: initialSeconds
    };
    this.notifyListeners();

    // Mobile Vibration Alarm (400ms pulse pattern)
    if ('navigator' in window && 'vibrate' in navigator) {
      try {
        navigator.vibrate([400, 200, 400, 200, 400, 200, 400]);
      } catch (e) {}
    }

    // Trigger Mobile & Browser Native Push Notification Popup
    this.triggerNativePushNotification(options.title, options.message, options.orderId);

    // Try Web Audio API synthesizer pulse first
    const synthSuccess = this.startSynthAudioPulse();

    // Fallback: Use HTML5 Audio ONLY if Web Audio API fails / is unavailable
    if (!synthSuccess) {
      try {
        this.audioFallback = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
        this.audioFallback.loop = true;
        this.audioFallback.play().catch((err) => {
          console.warn('HTML5 Audio fallback playback warning:', err);
        });
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

      let isHighTone = true;

      const playTone = () => {
        if (!this.isBuzzerActive || !this.audioCtx) return;
        try {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          // High tone 880Hz (A5), Low tone 660Hz (E5) - Classic Emergency Buzzer
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(isHighTone ? 880 : 660, ctx.currentTime);
          isHighTone = !isHighTone;

          // Volume envelope
          gain.gain.setValueAtTime(0.3, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(ctx.currentTime);
          osc.stop(ctx.currentTime + 0.24);
        } catch (e) {
          console.warn('Synth tone play warning:', e);
        }
      };

      // Immediate first pulse
      playTone();
      // Repeat pulse tone every 250ms for 30s duration
      this.pulseInterval = setInterval(playTone, 250);
      return true;
    } catch (e) {
      console.warn('Web Audio synth initialization failed, using fallback audio:', e);
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
      } catch (e) {
        console.warn('Error requesting notification permission:', e);
      }
    }
    return false;
  }

  public triggerNativePushNotification(title: string, message: string, orderId?: string): void {
    if (typeof window === 'undefined' || !('Notification' in window)) return;

    const showNotification = () => {
      try {
        const notif = new Notification(title, {
          body: message,
          icon: '/logo.jpeg',
          tag: orderId ? `order-${orderId}` : `foodway-${Date.now()}`,
          requireInteraction: true,
          vibrate: [400, 200, 400, 200, 400]
        } as any);

        notif.onclick = () => {
          window.focus();
          notif.close();
        };
      } catch (e) {
        console.warn('Error creating native notification:', e);
      }
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
