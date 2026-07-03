import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class HealthService {
  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${environment.apiUrl}/health`);

      if (!response.ok) {
        return false;
      }

      const result = (await response.json()) as { status: string };
      return result.status === 'ok';
    } catch {
      return false;
    }
  }
}
