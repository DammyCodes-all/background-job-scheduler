import { Injectable, OnModuleDestroy, MessageEvent } from '@nestjs/common';
import { Subject, Observable } from 'rxjs';

@Injectable()
export class SseService implements OnModuleDestroy {
  private subject = new Subject<MessageEvent>();
  private subscriberCount = 0;

  emit(event: string, data: Record<string, unknown>): void {
    this.subject.next({
      data: JSON.stringify(data),
      type: event,
    });
  }

  get events$(): Observable<MessageEvent> {
    this.subscriberCount++;
    return new Observable<MessageEvent>((subscriber) => {
      const sub = this.subject.subscribe(subscriber);
      return () => {
        this.subscriberCount--;
        sub.unsubscribe();
      };
    });
  }

  get connectedClients(): number {
    return this.subscriberCount;
  }

  onModuleDestroy(): void {
    this.subject.complete();
  }
}
