import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const CONFIG_DIR = join(homedir(), '.m365migrate');
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');

interface Config {
  apiUrl: string;
  apiKey?: string;
}

export class ApiClient {
  private config: Config;

  constructor() {
    this.config = this.loadConfig();
  }

  setBaseUrl(url: string): void {
    this.config.apiUrl = url;
    this.saveConfig();
  }

  setApiKey(key: string): void {
    this.config.apiKey = key;
    this.saveConfig();
  }

  async get(path: string): Promise<any> {
    return this.request('GET', path);
  }

  async post(path: string, body?: unknown): Promise<any> {
    return this.request('POST', path, body);
  }

  async put(path: string, body?: unknown): Promise<any> {
    return this.request('PUT', path, body);
  }

  async delete(path: string): Promise<any> {
    return this.request('DELETE', path);
  }

  private async request(method: string, path: string, body?: unknown): Promise<any> {
    const url = `${this.config.apiUrl}/api/v1${path}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.config.apiKey) {
      headers['x-api-key'] = this.config.apiKey;
    }

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });

      const data = await response.json();

      if (!response.ok) {
        console.error(`Error ${response.status}: ${data.error?.message ?? 'Unknown error'}`);
        process.exit(1);
      }

      return data;
    } catch (error: any) {
      console.error(`Request failed: ${error.message}`);
      console.error(`Is the API running at ${this.config.apiUrl}?`);
      process.exit(1);
    }
  }

  private loadConfig(): Config {
    if (existsSync(CONFIG_FILE)) {
      return JSON.parse(readFileSync(CONFIG_FILE, 'utf-8'));
    }
    return { apiUrl: process.env.M365_API_URL ?? 'http://localhost:3001' };
  }

  private saveConfig(): void {
    if (!existsSync(CONFIG_DIR)) {
      mkdirSync(CONFIG_DIR, { recursive: true });
    }
    writeFileSync(CONFIG_FILE, JSON.stringify(this.config, null, 2));
  }
}
