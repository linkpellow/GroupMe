declare module '@shared/config/queryConfig' {
  export const US_STATES: readonly string[];
  export const ALLOWED_DISPOSITIONS: readonly string[];
  export const PIPELINE_SOURCES: { readonly [key: string]: string };
  export const QUERY_CONFIG: any;

  export type StateCode = (typeof US_STATES)[number];
  export type DispositionType = (typeof ALLOWED_DISPOSITIONS)[number];
  export type PipelineSource = keyof typeof PIPELINE_SOURCES;
}
