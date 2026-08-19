import { config } from '../../config/env';
import { productRepository } from '../product/product.repository';
import { cosineSimilarity } from './cosine-similarity';
import { fetchReferenceImage } from './image-preprocessing';
import {
  ProductRecognitionResult,
  RecognitionCandidate,
  RecognitionImageInput,
} from './product-recognition.types';
import {
  productRecognitionRepository,
  RecognitionIndexProduct,
} from './product-recognition.repository';
import { localClipRecognitionProvider } from './providers/local-clip.provider';

interface RebuildOptions {
  force?: boolean;
}

interface RebuildResult {
  productId: string;
  generated: number;
  skipped: number;
  failed: number;
}

const asImageUrls = (images: unknown): string[] =>
  Array.from(
    new Set(
      (Array.isArray(images) ? images : [])
        .filter((image): image is string => typeof image === 'string')
        .map((image) => image.trim())
        .filter(Boolean),
    ),
  );

const statusForSimilarity = (similarity: number): 'strong' | 'possible' =>
  similarity >= Math.min(0.98, config.PRODUCT_RECOGNITION_MIN_SIMILARITY + 0.08) ? 'strong' : 'possible';

export class ProductRecognitionService {
  private recognitionIndexPromise: Promise<RecognitionIndexProduct[]> | null = null;

  invalidateRecognitionIndex(): void {
    this.recognitionIndexPromise = null;
  }

  private getRecognitionIndex(): Promise<RecognitionIndexProduct[]> {
    if (!this.recognitionIndexPromise) {
      this.recognitionIndexPromise = productRecognitionRepository.findRecognitionIndex().catch((error) => {
        this.recognitionIndexPromise = null;
        throw error;
      });
    }
    return this.recognitionIndexPromise;
  }

  async warmup(): Promise<void> {
    await localClipRecognitionProvider.warmup();
  }

  getModelStatus() {
    return localClipRecognitionProvider.getStatus();
  }

  async recognizeProduct(input: RecognitionImageInput): Promise<ProductRecognitionResult> {
    const queryEmbedding = await localClipRecognitionProvider.generateEmbedding(input);
    const index = await this.getRecognitionIndex();
    const ranked = index
      .map((product) => {
        let bestSimilarity = 0;
        let matchedReferenceImage: string | undefined;
        for (const reference of product.recognitionImages) {
          const similarity = cosineSimilarity(queryEmbedding, reference.embedding);
          if (similarity > bestSimilarity) {
            bestSimilarity = similarity;
            matchedReferenceImage = reference.imageUrl;
          }
        }
        return { product, similarity: bestSimilarity, matchedReferenceImage };
      })
      .filter((item) => item.similarity >= config.PRODUCT_RECOGNITION_MIN_SIMILARITY)
      .sort((left, right) => right.similarity - left.similarity)
      .slice(0, config.PRODUCT_RECOGNITION_TOP_K);

    const matches = (await Promise.all(
      ranked.map(async (item): Promise<RecognitionCandidate | null> => {
        const product = await productRepository.findById(item.product.id);
        if (!product) return null;
        return {
          productId: item.product.id,
          product: product as unknown as Record<string, unknown>,
          similarity: Number(item.similarity.toFixed(6)),
          matchStatus: statusForSimilarity(item.similarity),
          matchedReferenceImage: item.matchedReferenceImage,
        };
      }),
    )).filter((candidate): candidate is RecognitionCandidate => candidate !== null);

    return {
      provider: 'local_clip',
      model: localClipRecognitionProvider.modelId,
      topK: config.PRODUCT_RECOGNITION_TOP_K,
      minSimilarity: config.PRODUCT_RECOGNITION_MIN_SIMILARITY,
      matches,
      candidates: matches,
      noMatch: matches.length === 0,
    };
  }

  async rebuildProductEmbeddings(
    productId: string,
    images: unknown,
    options: RebuildOptions = {},
  ): Promise<RebuildResult> {
    const product = await productRecognitionRepository.findForEmbedding(productId);
    if (!product) throw new Error(`Product ${productId} not found`);

    const imageUrls = asImageUrls(images);
    const previousImages = Array.isArray((product as any).recognitionImages)
      ? (product as any).recognitionImages
      : [];
    const nextRecognitionImages: any[] = [];
    let generated = 0;
    let skipped = 0;
    let failed = 0;

    for (const imageUrl of imageUrls) {
      const previous = previousImages.find(
        (image: any) => image.imageUrl === imageUrl && image.embeddingModel === localClipRecognitionProvider.modelId,
      );
      if (!options.force && previous && Array.isArray(previous.embedding) && previous.embedding.length > 0) {
        nextRecognitionImages.push(previous);
        skipped += 1;
        continue;
      }

      try {
        const buffer = await fetchReferenceImage(imageUrl);
        const embedding = await localClipRecognitionProvider.generateEmbedding({
          buffer,
          mimeType: 'image/*',
          fileName: imageUrl,
        });
        nextRecognitionImages.push({
          imageUrl,
          embedding,
          embeddingModel: localClipRecognitionProvider.modelId,
          generatedAt: new Date(),
        });
        generated += 1;
      } catch (error) {
        failed += 1;
        console.warn(`Recognition embedding failed for product ${productId} image ${imageUrl}:`, (error as Error).message);
        if (previous && Array.isArray(previous.embedding) && previous.embedding.length > 0) {
          nextRecognitionImages.push(previous);
        }
      }
    }

    await productRecognitionRepository.replaceEmbeddings(productId, nextRecognitionImages);
    this.invalidateRecognitionIndex();
    return { productId, generated, skipped, failed };
  }
}

export const productRecognitionService = new ProductRecognitionService();
