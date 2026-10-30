import { environment } from '../../../environments/environment';

export const API_BASE_URL = environment.apiUrl;

export function apiUrl(path: string): string {
  return `${API_BASE_URL}/api/${path.replace(/^\/+/, '')}`;
}
