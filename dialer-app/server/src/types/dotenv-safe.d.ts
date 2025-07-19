declare module 'dotenv-safe' {
  interface DotenvSafeOptions {
    path?: string;
    sample?: string;
    allowEmptyValues?: boolean;
    example?: string;
  }

  interface DotenvSafeConfigOutput {
    parsed?: { [key: string]: string };
    required: { [key: string]: string };
  }

  export function config(options?: DotenvSafeOptions): DotenvSafeConfigOutput;
  export default { config };
} 