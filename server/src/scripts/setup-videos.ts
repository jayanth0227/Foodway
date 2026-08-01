import { uploadAndSeedVideos } from '../utils/videoUploader';

async function main() {
  console.log('🚀 Starting background videos upload and database seeding...');
  try {
    const urls = await uploadAndSeedVideos();
    console.log('✅ Background videos successfully configured!');
    console.log(JSON.stringify(urls, null, 2));
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Setup failed:');
    console.error(error.message || error);
    process.exit(1);
  }
}

main();
