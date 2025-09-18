import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { Lambda } from '@aws-sdk/client-lambda';
import fs from 'node:fs/promises';
import { createReadStream, createWriteStream } from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import archiver from 'archiver';

const s3 = new S3Client({});


const lambda = new Lambda();

export const handler = async (event) => {
  console.log(`Received event: ${JSON.stringify(event)}`);

  try {
    const { packages, layerName } = event;

    if (!packages || !layerName) {
      throw new Error('Missing required parameters: packages or layerName');
    }

    console.log(`Creating Lambda Layer: ${layerName} with packages: ${packages}`);

    // Step 1: Install packages
    const tempDir = '/tmp/layer';
    await fs.mkdir(tempDir, { recursive: true });

    const packageJson = {
      name: layerName,
      version: '1.0.0',
      dependencies: {}
    };

    await fs.writeFile(path.join(tempDir, 'package.json'), JSON.stringify(packageJson, null, 2));

    console.log('Installing packages...');
    const customCacheDir = path.join(tempDir, '.npmcache');
    process.env.NPM_CONFIG_CACHE = customCacheDir;

    const packageList = packages.split(' ');
    for (const pkg of packageList) {
      console.log(`Installing ${pkg}...`);
      execSync(
        `npm install ${pkg} --save-exact --no-package-lock --no-audit --no-fund --omit=dev`,
        {
          cwd: tempDir,
          env: {
            ...process.env,
            HOME: tempDir,
            NPM_CONFIG_CACHE: customCacheDir,
            npm_config_update_notifier: 'false'
          },
          stdio: 'inherit'
        }
      );
    }

    console.log(`Deleting npm cache...`);
    await fs.rm(path.join(tempDir, ".npmcache"), { recursive: true, force: true });
    console.log(`NPM cache deleted.`);

    // Step 2: Create zip file from the installed packages
    console.log('Creating zip file from installed packages...');
    const zipFilePath = path.join('/tmp', `${layerName}.zip`);
    
    await createZipFromDirectory(tempDir, zipFilePath);
    console.log(`Created zip file: ${zipFilePath}`);

    // Step 3: Upload zip to S3
    const bucketName = 'concept-cdn';
    const s3Key = `layers/${layerName}.zip`;
    
    console.log(`Uploading zip file to S3: s3://${bucketName}/${s3Key}`);
    await uploadToS3(bucketName, zipFilePath, s3Key);
    console.log(`Uploaded zip file to S3: s3://${bucketName}/${s3Key}`);

    // Step 4: Create Lambda Layer
    const createLayerResponse = await lambda.publishLayerVersion({
      LayerName: layerName,
      Description: `Layer containing node_modules for: ${packages}`,
      Content: {
        S3Bucket: bucketName,
        S3Key: s3Key,
      },
      CompatibleRuntimes: ['nodejs20.x', 'nodejs22.x'],
      CompatibleArchitectures: ['x86_64'],
    });

    console.log(`Created Lambda Layer: ${JSON.stringify(createLayerResponse)}`);



    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Lambda Layer created successfully',
        layerArn: createLayerResponse.LayerArn,
        layerVersion: createLayerResponse.Version,
      }),
    };
  } catch (error) {
    console.error(`Error in Lambda handler: ${error.message}`);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal Server Error', details: error.message }),
    };
  }
};


async function createZipFromDirectory(sourceDir, zipFilePath) {
  return new Promise((resolve, reject) => {
    const writable = createWriteStream(zipFilePath);
    
    const archive = archiver('zip', { zlib: { level: 9 } });
    
    archive.on('warning', (err) => console.warn('archiver warning:', err));
    archive.on('error', reject);
    writable.on('close', resolve);
    writable.on('error', reject);
    
    archive.pipe(writable);
    
    // Add the entire directory to the zip
    archive.directory(sourceDir, false);
    
    archive.finalize();
  });
}

async function uploadToS3(bucket, filePath, s3Key) {
  const fileStats = await fs.stat(filePath);
  
  await s3.send(new PutObjectCommand({
    Bucket: bucket,
    Key: s3Key,
    Body: createReadStream(filePath),
    ContentType: 'application/zip',
    ContentLength: fileStats.size,
  }));
  
  return {
    statusCode: 200,
    body: JSON.stringify({ 
      s3Url: `s3://${bucket}/${s3Key}`, 
      key: s3Key 
    })
  };
}
