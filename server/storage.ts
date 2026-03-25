// Storage interface — the TQQQ Scalper uses in-memory state in routes.ts
// for real-time market simulation, so we keep this minimal.

export interface IStorage {}

export class MemStorage implements IStorage {}

export const storage = new MemStorage();
