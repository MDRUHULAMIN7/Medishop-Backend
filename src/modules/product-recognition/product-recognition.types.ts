export interface RecognitionImageInput {
  buffer: Buffer;
  mimeType: string;
  fileName?: string;
}

export type RecognitionMatchStatus = 'strong' | 'possible';

export interface RecognitionCandidate {
  productId: string;
  product: Record<string, unknown>;
  similarity: number;
  matchStatus: RecognitionMatchStatus;
  matchedReferenceImage?: string;
}

export interface ProductRecognitionResult {
  provider: 'local_clip';
  model: string;
  topK: number;
  minSimilarity: number;
  matches: RecognitionCandidate[];
  candidates: RecognitionCandidate[];
  noMatch: boolean;
  unavailable?: boolean;
}

export interface RecognitionProvider {
  readonly name: 'local_clip';
  readonly modelId: string;
  warmup(): Promise<void>;
  generateEmbedding(input: RecognitionImageInput): Promise<number[]>;
}
