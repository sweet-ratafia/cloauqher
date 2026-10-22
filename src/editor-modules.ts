declare module "semver" {
  const semver: {
    valid(version: string): string | null;
    gte(a: string, b: string): boolean;
  };
  export default semver;
}

declare module "react" {
  export function createElement(
    type: unknown,
    props?: unknown,
    ...children: unknown[]
  ): unknown;
}

declare module "react-dom/server" {
  export function renderToStaticMarkup(element: unknown): string;
}
