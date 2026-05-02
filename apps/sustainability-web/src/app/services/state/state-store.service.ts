import { BehaviorSubject, Observable } from 'rxjs';

/**
 * Base store using BehaviorSubject for non-signal state slices.
 */
export abstract class StateStoreService<T extends object> {
  private readonly subject: BehaviorSubject<T>;
  readonly state$: Observable<T>;

  protected constructor(initial: T) {
    this.subject = new BehaviorSubject<T>(initial);
    this.state$ = this.subject.asObservable();
  }

  protected get snapshot(): T {
    return this.subject.value;
  }

  protected setState(next: T): void {
    this.subject.next(next);
  }

  protected patch(partial: Partial<T>): void {
    this.subject.next({ ...this.subject.value, ...partial });
  }
}
