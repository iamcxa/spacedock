import type { ShareLink } from "./types";

export interface CreateShareInput {
  password: string;
  entityPaths: string[];
  stages: string[];
  label: string;
  ttlHours: number;
}

function generateToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export class ShareRegistry {
  private links: Map<string, ShareLink> = new Map();

  async create(input: CreateShareInput): Promise<ShareLink> {
    const token = generateToken();
    const passwordHash = await Bun.password.hash(input.password);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + input.ttlHours * 60 * 60 * 1000);

    const link: ShareLink = {
      token,
      passwordHash,
      entityPaths: input.entityPaths,
      stages: input.stages,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      label: input.label,
    };

    this.links.set(token, link);
    return link;
  }

  async verify(token: string, password: string): Promise<boolean> {
    const link = this.get(token);
    if (!link) return false;
    return Bun.password.verify(password, link.passwordHash);
  }

  get(token: string): ShareLink | null {
    const link = this.links.get(token);
    if (!link) return null;
    if (new Date(link.expiresAt).getTime() < Date.now()) {
      this.links.delete(token);
      return null;
    }
    return link;
  }

  list(): ShareLink[] {
    const now = Date.now();
    const result: ShareLink[] = [];
    for (const [token, link] of this.links) {
      if (new Date(link.expiresAt).getTime() < now) {
        this.links.delete(token);
      } else {
        result.push(link);
      }
    }
    return result;
  }

  delete(token: string): boolean {
    return this.links.delete(token);
  }

  isInScope(token: string, entityPath: string): boolean {
    const link = this.get(token);
    if (!link) return false;
    return link.entityPaths.includes(entityPath);
  }

  entries(): IterableIterator<[string, ShareLink]> {
    return this.links.entries();
  }
}
