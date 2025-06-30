declare module 'bull' {
  export interface JobOptions {
    priority?: number;
    attempts?: number;
    delay?: number;
    removeOnComplete?: boolean | number;
    removeOnFail?: boolean | number;
    backoff?: number | { type: string; delay: number };
    lifo?: boolean;
    timeout?: number;
    jobId?: string;
  }

  export interface QueueOptions {
    redis?: any;
    prefix?: string;
    defaultJobOptions?: JobOptions;
    settings?: any;
    limiter?: any;
  }

  export interface Job<T = any> {
    id: string;
    data: T;
    opts: JobOptions;
    progress(progress: number): Promise<void>;
    finished(): Promise<any>;
    retry(): Promise<void>;
    remove(): Promise<void>;
    discard(): Promise<void>;
  }

  export class Queue<T = any> {
    constructor(name: string, options?: QueueOptions);
    add(data: T, opts?: JobOptions): Promise<Job<T>>;
    process(handler: (job: Job<T>) => Promise<any>): void;
    process(concurrency: number, handler: (job: Job<T>) => Promise<any>): void;
    getJob(jobId: string): Promise<Job<T> | null>;
    getJobs(types: string[], page?: number, pageSize?: number): Promise<Array<Job<T>>>;
    getJobCounts(): Promise<{ [key: string]: number }>;
    getCompleted(start?: number, end?: number): Promise<Array<Job<T>>>;
    getFailed(start?: number, end?: number): Promise<Array<Job<T>>>;
    getWaiting(start?: number, end?: number): Promise<Array<Job<T>>>;
    getActive(start?: number, end?: number): Promise<Array<Job<T>>>;
    getDelayed(start?: number, end?: number): Promise<Array<Job<T>>>;
    removeJobs(pattern: string): Promise<void>;
    empty(): Promise<void>;
    close(): Promise<void>;
    pause(isLocal?: boolean): Promise<void>;
    resume(isLocal?: boolean): Promise<void>;
    on(event: string, callback: (...args: any[]) => void): this;
    once(event: string, callback: (...args: any[]) => void): this;
    off(event: string, callback: (...args: any[]) => void): this;
  }

  export default Queue;
} 