import { Injectable, MessageEvent } from '@nestjs/common';
import { Subject, Observable } from 'rxjs';

@Injectable()
export class SseService {
  private subject = new Subject<MessageEvent>();

  emit(event: string, data: Record<string, unknown>): void {
    this.subject.next({ data: JSON.stringify(data), event } as MessageEvent);
  }

  get events$(): Observable<MessageEvent> {
    return this.subject.asObservable();
  }
}
