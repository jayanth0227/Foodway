import fs from 'fs';
import path from 'path';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { s3Client, dynamoDocClient, bucketName, tableName } from '../config/aws';

export async function uploadAndSeedVideos() {
  if (!bucketName || !tableName) {
    throw new Error('S3 bucket name or DynamoDB table name is not configured. Please set them in your .env file.');
  }

  // Find the video files in the client public directory
  const videoFiles = [
    { key: 'darkest', filename: 'darkest.mp4' },
    { key: 'dark_mobile', filename: 'dark_mobile.mp4' },
    { key: 'lightest', filename: 'lightest.mp4' },
    { key: 'light_mobile', filename: 'light_mobile.mp4' },
  ];

  // Resolve the path to Foodway/client/public
  const possibleDirs = [
    path.resolve(__dirname, '../../../client/public'),
    path.resolve(__dirname, '../../client/public'),
    path.resolve(__dirname, '../client/public'),
    path.resolve(process.cwd(), './client/public'),
    path.resolve(process.cwd(), '../client/public'),
  ];

  let publicDir = '';
  for (const dir of possibleDirs) {
    if (fs.existsSync(dir) && fs.existsSync(path.join(dir, 'darkest.mp4'))) {
      publicDir = dir;
      break;
    }
  }

  if (!publicDir) {
    throw new Error(
      `Could not locate the client public directory containing background videos. Searched paths: ${possibleDirs.join(', ')}`
    );
  }

  console.log(`Found client public directory at: ${publicDir}`);

  const s3Region = process.env.AWS_S3_REGION || 'ap-south-2';
  const urls: Record<string, string> = {};

  for (const video of videoFiles) {
    const filePath = path.join(publicDir, video.filename);
    console.log(`Uploading ${video.filename} to S3 (${filePath})...`);

    const fileBuffer = fs.readFileSync(filePath);
    const s3Key = `hero-videos/${video.filename}`;

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: s3Key,
      Body: fileBuffer,
      ContentType: 'video/mp4',
    });

    await s3Client.send(command);

    const s3Url = `https://${bucketName}.s3.${s3Region}.amazonaws.com/${s3Key}`;
    urls[video.key] = s3Url;
    console.log(`Uploaded ${video.filename} to S3: ${s3Url}`);
  }

  console.log('Storing video URLs in DynamoDB table:', tableName);

  const ddbCommand = new PutCommand({
    TableName: tableName,
    Item: {
      id: 'hero_videos',
      email: 'hero_videos', // Safe fallback for whichever partition key schema is used ('id' or 'email')
      darkest: urls.darkest,
      dark_mobile: urls.dark_mobile,
      lightest: urls.lightest,
      light_mobile: urls.light_mobile,
      updatedAt: new Date().toISOString(),
    },
  });

  await dynamoDocClient.send(ddbCommand);
  console.log('Successfully stored video URLs in DynamoDB.');

  return urls;
}
