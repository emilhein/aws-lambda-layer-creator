# AWS Lambda Layer Creator

An automated AWS Lambda function that creates Lambda layers by installing npm packages and packaging them for distribution. This tool simplifies the process of creating reusable Lambda layers with custom dependencies.

## 🚀 Overview

AWS Lambda Layer Creator automates the entire process of:
- **Installing npm packages** in a temporary environment
- **Creating zip archives** from installed packages
- **Uploading to S3** for storage and distribution
- **Publishing Lambda layers** with proper metadata

## 🏗️ Architecture

```
Lambda Function → npm install → Zip Creation → S3 Upload → Layer Publishing
      ↓              ↓            ↓           ↓           ↓
Event Input → Package Install → Archive → Storage → AWS Lambda Layer
```

### Components

- **Main Handler**: `index.js` - Orchestrates the entire layer creation process
- **S3 Zip Utility**: `s3-zip.js` - Handles zip file creation from S3 objects
- **Package Installation**: Automated npm package installation
- **Layer Publishing**: Creates AWS Lambda layers with proper configuration

## 📋 Prerequisites

- **AWS Account** with appropriate permissions
- **Node.js 20.x** (Lambda runtime)
- **AWS CLI** configured (for deployment)
- **S3 Bucket** for storing layer zip files

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd aws-lambda-layer
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure AWS credentials**
   ```bash
   aws configure
   # or set environment variables
   export AWS_ACCESS_KEY_ID="your-access-key"
   export AWS_SECRET_ACCESS_KEY="your-secret-key"
   export AWS_REGION="us-east-1"
   ```

## 🚀 Usage

### Invoking the Function

The Lambda function accepts events with the following structure:

```json
{
  "packages": "package1 package2 package3",
  "layerName": "my-custom-layer"
}
```

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `packages` | string | ✅ | Space-separated list of npm packages to install |
| `layerName` | string | ✅ | Name for the Lambda layer |

### Example Invocations

**DuckDB Node API (Real Example)**
```json
{
  "packages": "@duckdb/node-api@1.3.4-alpha.27",
  "layerName": "DuckDB_Node_API"
}
```

**Single Package**
```json
{
  "packages": "lodash",
  "layerName": "lodash-layer"
}
```

**Multiple Packages**
```json
{
  "packages": "axios moment uuid",
  "layerName": "utility-packages-layer"
}
```

**Complex Package with Version**
```json
{
  "packages": "axios@1.6.0 moment@2.29.4",
  "layerName": "versioned-packages-layer"
}
```

### AWS CLI Invocation

```bash
# Invoke the function directly (DuckDB example)
aws lambda invoke \
  --function-name aws-lambda-layer-creator \
  --payload '{"packages":"@duckdb/node-api@1.3.4-alpha.27","layerName":"DuckDB_Node_API"}' \
  response.json

# Check the response
cat response.json
```

### Expected Response

```json
{
  "statusCode": 200,
  "body": "{\"message\":\"Lambda Layer created successfully\",\"layerArn\":\"arn:aws:lambda:us-east-1:123456789012:layer:DuckDB_Node_API:1\",\"layerVersion\":1}"
}
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `AWS_REGION` | AWS region for operations | `us-east-1` |
| `S3_BUCKET` | S3 bucket for layer storage | `concept-cdn` |

### Lambda Configuration

The function is configured with:
- **Memory**: 1024 MB (adjustable based on package size)
- **Timeout**: 15 minutes (for large package installations)
- **Runtime**: Node.js 20.x
- **Architecture**: x86_64

## 📊 Process Flow

### Step-by-Step Process

1. **Package Installation**
   - Creates temporary directory (`/tmp/layer`)
   - Generates `package.json` with specified packages
   - Installs packages using npm with optimized flags
   - Cleans up npm cache to reduce size

2. **Zip Creation**
   - Creates zip archive from installed packages
   - Uses maximum compression (level 9)
   - Stores in `/tmp` directory

3. **S3 Upload**
   - Uploads zip file to S3 bucket
   - Uses structured key: `layers/{layerName}.zip`
   - Sets appropriate content type and metadata

4. **Layer Publishing**
   - Creates Lambda layer using S3 zip file
   - Sets compatible runtimes (Node.js 20.x, 22.x)
   - Configures layer metadata and description

### Package Installation Flags

The function uses optimized npm installation flags:
```bash
npm install {package} --save-exact --no-package-lock --no-audit --no-fund --omit=dev
```

- `--save-exact`: Installs exact versions
- `--no-package-lock`: Skips lock file generation
- `--no-audit`: Skips security audit
- `--no-fund`: Skips funding messages
- `--omit=dev`: Excludes development dependencies

## 🎯 Use Cases

### Common Scenarios

**1. DuckDB Analytics (Real Use Case)**
```json
{
  "packages": "@duckdb/node-api@1.3.4-alpha.27",
  "layerName": "DuckDB_Node_API"
}
```
*Perfect for data analytics, SQL queries, and MotherDuck integration in Lambda functions.*

**2. Database Libraries**
```json
{
  "packages": "mysql2 pg sequelize",
  "layerName": "database-layer"
}
```

**3. Utility Libraries**
```json
{
  "packages": "lodash moment uuid crypto-js",
  "layerName": "utility-layer"
}
```

**4. AWS SDK Extensions**
```json
{
  "packages": "@aws-sdk/client-s3 @aws-sdk/client-dynamodb",
  "layerName": "aws-sdk-layer"
}
```

**5. Custom Packages**
```json
{
  "packages": "my-private-package@1.0.0",
  "layerName": "custom-layer"
}
```

## 🔍 Monitoring

### CloudWatch Logs

Monitor the function execution through CloudWatch Logs:
- **Function Logs**: `/aws/lambda/aws-lambda-layer-creator`
- **Installation Logs**: Package installation progress
- **Error Logs**: Detailed error information

### Key Metrics

- **Duration**: Package installation and layer creation time
- **Memory Usage**: Peak memory consumption
- **Error Rate**: Failed layer creation attempts
- **Success Rate**: Successful layer publications

## 🛠️ Development

### Local Testing

```bash
# Test the function locally
node index.js

# Test with sample event
node -e "
import('./index.js').then(module => {
  const event = {
    packages: 'lodash',
    layerName: 'test-layer'
  };
  module.handler(event).then(console.log);
});
"
```

### Project Structure

```
aws-lambda-layer/
├── index.js              # Main Lambda handler
├── s3-zip.js            # S3 zip utility (unused in current implementation)
├── package.json         # Project dependencies
└── package-lock.json    # Dependency lock file
```

## 🔒 Security

### IAM Permissions

The Lambda function requires the following permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject"
      ],
      "Resource": "arn:aws:s3:::concept-cdn/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "lambda:PublishLayerVersion",
        "lambda:GetLayerVersion"
      ],
      "Resource": "*"
    }
  ]
}
```

### Security Considerations

- **Package Validation**: Consider adding package validation
- **Size Limits**: Monitor layer size (250MB unzipped limit)
- **Access Control**: Restrict layer creation permissions
- **Audit Logging**: Enable CloudTrail for audit trails

## 🐛 Troubleshooting

### Common Issues

**1. Package Installation Failed**
```
Error: npm install failed
```
- **Solution**: Check package names and versions
- **Check**: Network connectivity and npm registry access

**2. Layer Size Exceeded**
```
Error: Layer size exceeds 250MB limit
```
- **Solution**: Reduce package count or use smaller packages
- **Check**: Package dependencies and size

**3. S3 Upload Failed**
```
Error: AccessDenied
```
- **Solution**: Verify S3 bucket permissions
- **Check**: IAM policies and bucket configuration

**4. Layer Publishing Failed**
```
Error: InvalidParameterValueException
```
- **Solution**: Check layer name format and compatibility
- **Check**: Runtime compatibility settings

### Debug Mode

Enable detailed logging:
```bash
export DEBUG=true
export LOG_LEVEL=debug
```

## 📈 Performance

### Optimization Tips

- **Memory Scaling**: Increase memory for large packages
- **Timeout Adjustment**: Set appropriate timeout for package size
- **Parallel Processing**: Consider parallel package installation
- **Caching**: Implement package caching for repeated requests

### Size Optimization

- **Tree Shaking**: Use packages that support tree shaking
- **Minimal Dependencies**: Choose packages with minimal dependencies
- **Custom Builds**: Create custom builds for specific use cases

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 📞 Support

For support and questions:
- **Issues**: Create an issue in the repository
- **Documentation**: Check the project documentation
- **Team**: Contact the development team

---

**Built with ❤️ by the CNCPT Team**
