import { Injectable } from '@angular/core';
import { Storage } from '@ionic/storage-angular';

export type ThemeMode = 'light' | 'dark';

const THEME_KEY = 'app_theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private _storage: Storage | null = null;
  private _current: ThemeMode = 'light';

  constructor(private storage: Storage) {}

  async init(): Promise<void> {
    this._storage = await this.storage.create();
    const saved = await this._storage.get(THEME_KEY) as ThemeMode | null;
    const preferred = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    this._current = saved ?? preferred;
    this._apply(this._current);
  }

  get current(): ThemeMode {
    return this._current;
  }

  get isDark(): boolean {
    return this._current === 'dark';
  }

  async setTheme(mode: ThemeMode): Promise<void> {
    this._current = mode;
    this._apply(mode);
    await this._storage?.set(THEME_KEY, mode);
  }

  async toggle(): Promise<void> {
    await this.setTheme(this._current === 'dark' ? 'light' : 'dark');
  }

  private _apply(mode: ThemeMode): void {
    document.documentElement.classList.toggle('ion-palette-dark', mode === 'dark');
  }
}
