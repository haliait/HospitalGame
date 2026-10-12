import { Injectable, signal } from '@angular/core';

const STORAGE_KEY = 'musicEnabled';

@Injectable({ providedIn: 'root' })
export class MusicService {
  private audio = new Audio('music/theme.wav');

  // activée par défaut, le choix du joueur est mémorisé dans le navigateur
  enabled = signal(this.loadPreference());

  constructor() {
    this.audio.loop = true;
    this.audio.volume = 0.35;

    // les navigateurs bloquent la lecture automatique : on démarre au premier clic/touche
    const start = () => {
      if (this.enabled()) this.play();
      document.removeEventListener('click', start);
      document.removeEventListener('keydown', start);
    };
    document.addEventListener('click', start);
    document.addEventListener('keydown', start);
  }

  toggle() {
    this.enabled.set(!this.enabled());
    this.savePreference();
    if (this.enabled()) this.play();
    else this.audio.pause();
  }

  private play() {
    this.audio.play().catch(() => {});
  }

  private loadPreference(): boolean {
    try {
      return localStorage.getItem(STORAGE_KEY) !== 'false';
    } catch {
      return true;
    }
  }

  private savePreference() {
    try {
      localStorage.setItem(STORAGE_KEY, String(this.enabled()));
    } catch {}
  }
}
