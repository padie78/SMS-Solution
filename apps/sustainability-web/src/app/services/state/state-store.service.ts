import { BehaviorSubject, Observable } from 'rxjs';

/**
 * Base store using BehaviorSubject for non-signal state slices.
 */
export abstract class StateStoreService<T extends object> {
  private readonly subject: BehaviorSubject<T>;

  protected constructor(initial: T) {
    this.subject = new BehaviorSubject<T>(initial);
  }

  protected get snapshot(): T {
    return this.subject.value;
  }

  readonly state$: Observable<T> = this.subject.asObservable();

  protected setState(next: T): void {
    this.subject.next(next);
  }

  protected patch(partial: Partial<T>): void {
    this.subject.next({ ...this.subject.value, ...partial });
  }
}
