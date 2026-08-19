import { config } from '../../../config/env';
import { normalizeEmbedding } from '../cosine-similarity';
import { preprocessForClip } from '../image-preprocessing';
import { RecognitionImageInput, RecognitionProvider } from '../product-recognition.types';

interface ClipRuntime {
  processor: any;
  model: any;
}

let runtimePromise: Promise<ClipRuntime> | null = null;
let transformersModulePromise: Promise<any> | null = null;
let runtimeState: 'not_loaded' | 'loading' | 'ready' | 'failed' = 'not_loaded';
let inferenceTail = Promise.resolve();

const withInferenceLock = async <T>(work: () => Promise<T>): Promise<T> => {
  const previous = inferenceTail;
  let release!: () => void;
  inferenceTail = new Promise<void>((resolve) => {
    release = resolve;
  });

  await previous;
  try {
    return await work();
  } finally {
    release();
  }
};

const loadTransformers = () => {
  if (!transformersModulePromise) {
    transformersModulePromise = import('@huggingface/transformers');
  }
  return transformersModulePromise;
};

const loadRuntime = (): Promise<ClipRuntime> => {
  if (!runtimePromise) {
    runtimeState = 'loading';
    runtimePromise = loadTransformers()
      .then(async (transformers) => {
        transformers.env.cacheDir = config.PRODUCT_RECOGNITION_CACHE_DIR;
        transformers.env.useFSCache = true;
        const [processor, model] = await Promise.all([
          transformers.AutoProcessor.from_pretrained(config.PRODUCT_RECOGNITION_MODEL, {
            cache_dir: config.PRODUCT_RECOGNITION_CACHE_DIR,
          }),
          transformers.CLIPVisionModelWithProjection.from_pretrained(config.PRODUCT_RECOGNITION_MODEL, {
            cache_dir: config.PRODUCT_RECOGNITION_CACHE_DIR,
            device: 'cpu',
            dtype: config.PRODUCT_RECOGNITION_DTYPE,
          }),
        ]);
        runtimeState = 'ready';
        return { processor, model };
      })
      .catch((error) => {
        runtimeState = 'failed';
        runtimePromise = null;
        throw error;
      });
  }

  return runtimePromise;
};

export class LocalClipRecognitionProvider implements RecognitionProvider {
  readonly name = 'local_clip' as const;
  readonly modelId = config.PRODUCT_RECOGNITION_MODEL;

  getStatus() {
    return { state: runtimeState, model: this.modelId };
  }

  async warmup(): Promise<void> {
    await loadRuntime();
  }

  async generateEmbedding(input: RecognitionImageInput): Promise<number[]> {
    return withInferenceLock(async () => {
      // Validate and bound the upload before triggering model work.
      const normalized = await preprocessForClip(input.buffer);
      const runtime = await loadRuntime();
      const { RawImage } = await loadTransformers();
      const image = new RawImage(
        new Uint8Array(normalized.data.buffer, normalized.data.byteOffset, normalized.data.byteLength),
        normalized.width,
        normalized.height,
        3,
      );
      const imageInputs = await runtime.processor(image);
      const output = await runtime.model(imageInputs);
      return normalizeEmbedding(output.image_embeds.data as Iterable<number>);
    });
  }
}

export const localClipRecognitionProvider = new LocalClipRecognitionProvider();
