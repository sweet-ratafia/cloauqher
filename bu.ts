export interface Build {
  version: number;
  stamp: string;
}

export function makeBuild(version: number): Build {
  return { version, stamp: new Date().toISOString() };
}

export function describeBuild(b: Build): string {
  return `build@${b.version} (${b.stamp})`;
}

export const DEFAULT_BUILD: Build = makeBuild(1);
