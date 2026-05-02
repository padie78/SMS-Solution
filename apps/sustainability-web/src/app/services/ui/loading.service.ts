import { Injectable, signal, computed } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class LoadingService {
  private readonly counter = signal(0);

  readonly isLoading = computed(() => this.counter() > 0);

  begin(): void {
    this.counter.update((c) => c + 1);
  }

  end(): void {
    this.counter.update((c) => Math.max(0, c - 1));
  }

  async track<T>(work: () => Promise<T>): Promise<T> {
    this.begin();
    try {
      return await work();
    } finally {
      this.end();
    }
  }
}
