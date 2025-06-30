export interface ExecutorItem {
  name: string;
  command: string;
  args: string[];
  encoding: string;
  category: string;
  uniqueId: string;
}

export interface CurrentExecutors {
  run?: string;
  make?: string;
  help?: string;
}

export const CUREXEC = "language-hsp3.executor.current";

export enum ExecutorItemCategory {
  run = "run",
  make = "make",
  help = "help",
  custom = "custom",
}
