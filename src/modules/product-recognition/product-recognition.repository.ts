import { ProductModel } from '../product/product.model';

export interface RecognitionIndexImage {
  imageUrl: string;
  embedding: number[];
  embeddingModel: string;
}

export interface RecognitionIndexProduct {
  id: string;
  name: string;
  genericName?: string;
  strength?: string;
  dosageForm?: string;
  brand?: unknown;
  images: string[];
  recognitionImages: RecognitionIndexImage[];
}

export class ProductRecognitionRepository {
  async findRecognitionIndex(): Promise<RecognitionIndexProduct[]> {
    const documents = await ProductModel.find({
      isActive: true,
      'recognitionImages.0': { $exists: true },
    })
      .select('+recognitionImages _id name genericName strength dosageForm brand images')
      .populate('brand', 'name slug logo')
      .lean();

    return documents.map((document: any) => ({
      id: document._id.toString(),
      name: document.name,
      genericName: document.genericName,
      strength: document.strength,
      dosageForm: document.dosageForm,
      brand: document.brand,
      images: Array.isArray(document.images) ? document.images : [],
      recognitionImages: Array.isArray(document.recognitionImages)
        ? document.recognitionImages.filter((image: any) => Array.isArray(image.embedding) && image.embedding.length > 0)
        : [],
    }));
  }

  async findForEmbedding(id: string) {
    return ProductModel.findById(id)
      .select('+recognitionImages images')
      .lean();
  }

  async replaceEmbeddings(id: string, recognitionImages: unknown[]) {
    return ProductModel.findByIdAndUpdate(
      id,
      { $set: { recognitionImages } },
      { new: true, runValidators: true },
    )
      .select('+recognitionImages')
      .lean();
  }
}

export const productRecognitionRepository = new ProductRecognitionRepository();
