import mongoose from 'mongoose';
import { connectDatabase } from '../src/database/connection';
import { config } from '../src/config/env';
import { ProductModel } from '../src/modules/product/product.model';
import { productRecognitionService } from '../src/modules/product-recognition/product-recognition.service';

const force = process.argv.includes('--force');

async function main() {
  await connectDatabase();

  const products = await ProductModel.find({
    images: { $exists: true, $ne: [] },
  })
    .select('+recognitionImages _id images')
    .lean();

  console.log(`Found ${products.length} product(s) with reference images.`);
  console.log(`Model: ${config.PRODUCT_RECOGNITION_MODEL}; mode: ${force ? 'force regenerate' : 'skip existing'}`);

  let generated = 0;
  let skipped = 0;
  let failed = 0;

  for (let index = 0; index < products.length; index += 1) {
    const product: any = products[index];
    const productId = product._id.toString();
    try {
      const result = await productRecognitionService.rebuildProductEmbeddings(
        productId,
        product.images,
        { force },
      );
      generated += result.generated;
      skipped += result.skipped;
      failed += result.failed;
      console.log(`[${index + 1}/${products.length}] ${productId}: generated=${result.generated}, skipped=${result.skipped}, failed=${result.failed}`);
    } catch (error) {
      failed += 1;
      console.error(`[${index + 1}/${products.length}] ${productId}: failed`, (error as Error).message);
    }
  }

  console.log(`Embedding migration complete. generated=${generated}, skipped=${skipped}, failed=${failed}`);
}

main()
  .catch((error) => {
    console.error('Embedding migration aborted:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
