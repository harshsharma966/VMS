const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  HeadObjectCommand,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
} = require('@aws-sdk/client-s3');
const { NodeHttpHandler } = require('@aws-sdk/node-http-handler');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const https = require('https');
const config = require('../config/env');
const logger = require('../config/logger');

class S3Service {
  constructor() {
    // Custom HTTPS agent for better connection handling with NetForChoice 10PB
    const httpsAgent = new https.Agent({
      keepAlive: true,
      keepAliveMsecs: 30000,      // Keep connections alive for 30s
      maxSockets: 50,              // Allow up to 50 concurrent connections
      maxFreeSockets: 10,          // Keep 10 idle connections in pool
      timeout: 300000,             // 5 min timeout
      scheduling: 'fifo',
    });

    this.client = new S3Client({
      endpoint: config.s3.endpoint,        // NetForChoice: https://s3.10pb.com
      region: config.s3.region,
      credentials: {
        accessKeyId: config.s3.accessKey,
        secretAccessKey: config.s3.secretKey,
      },
      forcePathStyle: true,                // Required for non-AWS S3 endpoints like 10PB
      requestHandler: new NodeHttpHandler({
        httpsAgent,
        connectionTimeout: 15000,          // 15s to establish connection
        requestTimeout: 300000,            // 5 min for request to complete
        socketTimeout: 300000,             // 5 min socket idle timeout
      }),
      maxAttempts: 3,                      // SDK-level retry
    });
    this.bucket = config.s3.bucket;

    logger.info('S3Service initialized', {
      endpoint: config.s3.endpoint,
      bucket: config.s3.bucket,
      region: config.s3.region,
      provider: 'NetForChoice 10PB'
    });
  }

  /**
   * Build the S3 key path for a recording.
   * Structure: recordings/{userId}/{groupName}/{cameraName}/{YYYY-MM-DD}/{filename}
   *
   * Example:
   *   recordings/user-uuid/office-13/camera-101/2026-02-16/clip_1708041600.mp4
   */
  buildRecordingKey(userId, groupName, cameraName, filename, date = null) {
    const safeGroup = groupName.toLowerCase().replace(/\s+/g, '-');
    const safeCamera = cameraName.toLowerCase().replace(/\s+/g, '-');
    const d = date || new Date().toISOString().slice(0, 10);
    return `recordings/${userId}/${safeGroup}/${safeCamera}/${d}/${filename}`;
  }

  /**
   * Build the S3 key prefix for listing a camera's recordings.
   * recordings/{userId}/{groupName}/{cameraName}/
   */
  buildCameraPrefix(userId, groupName, cameraName, date = null) {
    const safeGroup = groupName.toLowerCase().replace(/\s+/g, '-');
    const safeCamera = cameraName.toLowerCase().replace(/\s+/g, '-');
    const base = `recordings/${userId}/${safeGroup}/${safeCamera}/`;
    return date ? `${base}${date}/` : base;
  }

  /**
   * Upload a recording file (Buffer or Stream) to S3.
   * Automatically uses multipart upload for files >5MB.
   * Includes retry logic for transient network errors (ECONNRESET, ETIMEDOUT, etc.)
   */
  async uploadRecording(userId, groupName, cameraName, filename, body, contentType = 'video/mp4', date = null) {
    const key = this.buildRecordingKey(userId, groupName, cameraName, filename, date);
    const fileSize = Buffer.isBuffer(body) ? body.length : body.size || 0;

    // Use multipart upload for files larger than 5MB
    const MULTIPART_THRESHOLD = 5 * 1024 * 1024; // 5MB

    if (fileSize > MULTIPART_THRESHOLD) {
      logger.info('Using multipart upload for large file', { key, sizeMB: (fileSize / 1024 / 1024).toFixed(2) });
      return await this._multipartUpload(key, body, contentType, { userId, groupName, cameraName });
    }

    // Standard upload for small files
    const maxRetries = 3;
    const retryDelay = 2000; // 2 seconds base delay

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await this.client.send(new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: body,
          ContentType: contentType,
          Metadata: {
            userId,
            groupName,
            cameraName,
            uploadedAt: new Date().toISOString(),
          },
        }));

        if (attempt > 1) {
          logger.info('S3 upload success after retry', { key, attempt });
        } else {
          logger.info('S3 upload success', { key });
        }
        return key;

      } catch (err) {
        const isRetryable = ['ECONNRESET', 'ETIMEDOUT', 'EPIPE', 'ENOTFOUND'].includes(err.code) ||
                           err.message?.includes('socket hang up') ||
                           err.message?.includes('Connection reset');

        if (isRetryable && attempt < maxRetries) {
          const delay = retryDelay * Math.pow(2, attempt - 1); // Exponential backoff
          logger.warn('S3 upload failed, retrying...', {
            key,
            error: err.message,
            code: err.code,
            attempt,
            maxRetries,
            retryInMs: delay
          });

          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }

        // Final attempt failed or non-retryable error
        logger.error('S3 upload failed', {
          key,
          error: err.message,
          code: err.code,
          attempt,
          stack: err.stack
        });
        throw err;
      }
    }
  }

  /**
   * Multipart upload for large files (private method)
   * Splits file into 5MB chunks and uploads them separately for better reliability
   */
  async _multipartUpload(key, body, contentType, metadata) {
    const PART_SIZE = 5 * 1024 * 1024; // 5MB per part
    let uploadId;

    try {
      // Step 1: Initiate multipart upload
      const createResponse = await this.client.send(new CreateMultipartUploadCommand({
        Bucket: this.bucket,
        Key: key,
        ContentType: contentType,
        Metadata: {
          ...metadata,
          uploadedAt: new Date().toISOString(),
        },
      }));

      uploadId = createResponse.UploadId;
      logger.info('Multipart upload initiated', { key, uploadId });

      // Step 2: Upload parts
      const buffer = Buffer.isBuffer(body) ? body : Buffer.from(body);
      const numParts = Math.ceil(buffer.length / PART_SIZE);
      const uploadedParts = [];

      for (let partNumber = 1; partNumber <= numParts; partNumber++) {
        const start = (partNumber - 1) * PART_SIZE;
        const end = Math.min(start + PART_SIZE, buffer.length);
        const partData = buffer.subarray(start, end);

        // Retry logic for each part
        let partUploaded = false;
        let lastError;

        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            const uploadPartResponse = await this.client.send(new UploadPartCommand({
              Bucket: this.bucket,
              Key: key,
              UploadId: uploadId,
              PartNumber: partNumber,
              Body: partData,
            }));

            uploadedParts.push({
              PartNumber: partNumber,
              ETag: uploadPartResponse.ETag,
            });

            logger.info('Part uploaded', {
              key,
              partNumber,
              numParts,
              sizeMB: (partData.length / 1024 / 1024).toFixed(2),
              attempt: attempt > 1 ? attempt : undefined,
            });

            partUploaded = true;
            break;

          } catch (err) {
            lastError = err;
            logger.warn('Part upload failed, retrying...', {
              key,
              partNumber,
              attempt,
              error: err.message,
            });

            if (attempt < 3) {
              await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
            }
          }
        }

        if (!partUploaded) {
          throw lastError;
        }
      }

      // Step 3: Complete multipart upload
      await this.client.send(new CompleteMultipartUploadCommand({
        Bucket: this.bucket,
        Key: key,
        UploadId: uploadId,
        MultipartUpload: {
          Parts: uploadedParts,
        },
      }));

      logger.info('Multipart upload completed', {
        key,
        parts: uploadedParts.length,
        sizeMB: (buffer.length / 1024 / 1024).toFixed(2),
      });

      return key;

    } catch (err) {
      // Abort multipart upload on failure
      if (uploadId) {
        try {
          await this.client.send(new AbortMultipartUploadCommand({
            Bucket: this.bucket,
            Key: key,
            UploadId: uploadId,
          }));
          logger.warn('Multipart upload aborted', { key, uploadId });
        } catch (abortErr) {
          logger.error('Failed to abort multipart upload', { key, uploadId, error: abortErr.message });
        }
      }

      logger.error('Multipart upload failed', {
        key,
        error: err.message,
        code: err.code,
      });

      throw err;
    }
  }

  /**
   * Generate a pre-signed URL for playback (valid 1 hour by default).
   */
  async getPlaybackUrl(key, expiresInSeconds = 3600) {
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    return getSignedUrl(this.client, command, { expiresIn: expiresInSeconds });
  }

  /**
   * Generate a pre-signed URL that forces a file download.
   * Sets Content-Disposition: attachment so the browser downloads instead of playing.
   */
  async getDownloadUrl(key, filename, expiresInSeconds = 3600) {
    const safeFilename = filename || key.split('/').pop();
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ResponseContentDisposition: `attachment; filename="${safeFilename}"`,
      ResponseContentType: 'video/mp4',
    });
    return getSignedUrl(this.client, command, { expiresIn: expiresInSeconds });
  }

  /**
   * List all recordings for a camera (optionally filtered by date).
   * Returns array of { key, size, lastModified, filename }
   */
  async listRecordings(userId, groupName, cameraName, date = null) {
    const prefix = this.buildCameraPrefix(userId, groupName, cameraName, date);
    const results = [];
    let continuationToken;

    try {
      do {
        const resp = await this.client.send(new ListObjectsV2Command({
          Bucket: this.bucket,
          Prefix: prefix,
          MaxKeys: 1000,
          ContinuationToken: continuationToken,
        }));

        (resp.Contents || []).forEach((obj) => {
          // Skip 0-byte files — incomplete writes from Shinobi (crash, disk full, stream loss)
          if (!obj.Size || obj.Size === 0) return;
          results.push({
            key: obj.Key,
            filename: obj.Key.split('/').pop(),
            size: obj.Size,
            lastModified: obj.LastModified,
          });
        });

        continuationToken = resp.NextContinuationToken;
      } while (continuationToken);

      return results;
    } catch (err) {
      logger.error('S3 listRecordings failed', { prefix, error: err.message });
      throw err;
    }
  }

  /**
   * List all recordings for an entire camera group (all cameras under one IP).
   */
  async listGroupRecordings(userId, groupName, date = null) {
    const safeGroup = groupName.toLowerCase().replace(/\s+/g, '-');
    const base = `recordings/${userId}/${safeGroup}/`;
    const prefix = base; // list all, then filter by date below
    const results = [];
    let continuationToken;

    try {
      do {
        const resp = await this.client.send(new ListObjectsV2Command({
          Bucket: this.bucket,
          Prefix: prefix,
          MaxKeys: 1000,
          ContinuationToken: continuationToken,
        }));

        (resp.Contents || []).forEach((obj) => {
          // Skip 0-byte files — incomplete writes from Shinobi (crash, disk full, stream loss)
          if (!obj.Size || obj.Size === 0) return;
          const parts = obj.Key.split('/');
          // recordings/{userId}/{group}/{camera}/{date}/{filename}
          results.push({
            key: obj.Key,
            cameraName: parts[3] || '',
            date: parts[4] || '',
            filename: parts[5] || '',
            size: obj.Size,
            lastModified: obj.LastModified,
          });
        });

        continuationToken = resp.NextContinuationToken;
      } while (continuationToken);

      // S3 key: recordings/{userId}/{group}/{camera}/{date}/{filename}
      // Date is at depth [4], after camera — filter post-list because S3 prefix
      // cannot skip the camera segment to filter by date directly.
      return date ? results.filter((r) => r.date === date) : results;
    } catch (err) {
      logger.error('S3 listGroupRecordings failed', { prefix, error: err.message });
      throw err;
    }
  }

  /**
   * Delete a single recording from S3.
   */
  async deleteRecording(key) {
    try {
      await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
      logger.info('S3 delete success', { key });
    } catch (err) {
      logger.error('S3 delete failed', { key, error: err.message });
      throw err;
    }
  }

  /**
   * Return a readable stream for a recording (used for proxy streaming to browser).
   * Passes the Range header through to S3 so the browser can seek.
   * S3 returns 206 + Content-Range automatically when a range is requested.
   */
  async getReadStream(key, range = null) {
    const params = { Bucket: this.bucket, Key: key };
    if (range) params.Range = range;
    const resp = await this.client.send(new GetObjectCommand(params));
    return {
      stream:        resp.Body,
      contentLength: resp.ContentLength,
      contentType:   resp.ContentType || 'video/mp4',
      contentRange:  resp.ContentRange  || null,
      statusCode:    range ? 206 : 200,
    };
  }

  /**
   * Check if an object exists in S3.
   */
  async exists(key) {
    try {
      await this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }));
      return true;
    } catch {
      return false;
    }
  }
}

module.exports = new S3Service();
