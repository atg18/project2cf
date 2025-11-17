const { BlobServiceClient } = require('@azure/storage-blob');
const azureConfig = require('../config/azure.config');
const logger = require('../utils/logger');

class StorageService {
  constructor() {
    this.blobServiceClient = BlobServiceClient.fromConnectionString(
      azureConfig.azureStorageConnectionString
    );
    this.containerClient = this.blobServiceClient.getContainerClient(
      azureConfig.azureContainerName
    );
    this.initializeContainer();
  }

  async initializeContainer() {
    try {
      await this.containerClient.createIfNotExists({
        access: 'container'
      });
      logger.info('Azure Blob Storage container initialized');
    } catch (error) {
      logger.error('Error initializing Azure Blob Storage container:', error);
      throw error;
    }
  }

  async uploadFile(fileName, fileBuffer, contentType = 'application/octet-stream') {
    try {
      const blockBlobClient = this.containerClient.getBlockBlobClient(fileName);
      
      const uploadResponse = await blockBlobClient.uploadData(fileBuffer, {
        blobHTTPHeaders: { blobContentType: contentType }
      });

      logger.info(`File uploaded successfully: ${fileName}`);
      
      return {
        url: blockBlobClient.url,
        etag: uploadResponse.etag,
        fileName: fileName
      };
    } catch (error) {
      logger.error('Error uploading file to Azure Blob Storage:', error);
      throw error;
    }
  }

  async downloadFile(fileName) {
    try {
      const blockBlobClient = this.containerClient.getBlockBlobClient(fileName);
      const downloadResponse = await blockBlobClient.download();

      if (!downloadResponse.readableStreamBody) {
        throw new Error('File not found');
      }

      const chunks = [];
      for await (const chunk of downloadResponse.readableStreamBody) {
        chunks.push(chunk);
      }

      const buffer = Buffer.concat(chunks);
      
      logger.info(`File downloaded successfully: ${fileName}`);
      
      return buffer;
    } catch (error) {
      logger.error('Error downloading file from Azure Blob Storage:', error);
      throw error;
    }
  }

  async deleteFile(fileName) {
    try {
      const blockBlobClient = this.containerClient.getBlockBlobClient(fileName);
      await blockBlobClient.delete();

      logger.info(`File deleted successfully: ${fileName}`);
      
      return { success: true };
    } catch (error) {
      logger.error('Error deleting file from Azure Blob Storage:', error);
      throw error;
    }
  }

  async generateSasUrl(fileName, permissions = 'r', expiresInMinutes = 60) {
    try {
      const blockBlobClient = this.containerClient.getBlockBlobClient(fileName);
      
      // Check if blob exists
      await blockBlobClient.getProperties();

      const startsOn = new Date();
      const expiresOn = new Date(startsOn.getTime() + expiresInMinutes * 60 * 1000);

      const sasUrl = await blockBlobClient.generateSasUrl({
        permissions: permissions, // 'r' for read, 'w' for write, etc.
        expiresOn
      });

      logger.info(`SAS URL generated for file: ${fileName}`);
      
      return sasUrl;
    } catch (error) {
      logger.error('Error generating SAS URL:', error);
      throw error;
    }
  }

  async listFiles(prefix = '') {
    try {
      const files = [];
      for await (const blob of this.containerClient.listBlobsFlat({ prefix })) {
        files.push({
          name: blob.name,
          size: blob.properties.contentLength,
          lastModified: blob.properties.lastModified,
          etag: blob.properties.etag
        });
      }

      return files;
    } catch (error) {
      logger.error('Error listing files from Azure Blob Storage:', error);
      throw error;
    }
  }

  async getFileProperties(fileName) {
    try {
      const blockBlobClient = this.containerClient.getBlockBlobClient(fileName);
      const properties = await blockBlobClient.getProperties();

      return {
        fileName,
        size: properties.contentLength,
        contentType: properties.contentType,
        lastModified: properties.lastModified,
        etag: properties.etag
      };
    } catch (error) {
      logger.error('Error getting file properties:', error);
      throw error;
    }
  }

  async uploadDocumentBackup(documentId, content) {
    try {
      const fileName = `backups/documents/${documentId}/${Date.now()}.json`;
      const fileBuffer = Buffer.from(JSON.stringify({
        documentId,
        content,
        backedUpAt: new Date().toISOString()
      }));

      return await this.uploadFile(fileName, fileBuffer, 'application/json');
    } catch (error) {
      logger.error('Error uploading document backup:', error);
      throw error;
    }
  }

  async uploadUserAvatar(userId, imageBuffer) {
    try {
      const fileName = `avatars/${userId}.jpg`;
      return await this.uploadFile(fileName, imageBuffer, 'image/jpeg');
    } catch (error) {
      logger.error('Error uploading user avatar:', error);
      throw error;
    }
  }
}

module.exports = new StorageService();