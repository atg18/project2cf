const PDFDocument = require('pdfkit');
const { Document, Packer, Paragraph, TextRun, HeadingLevel } = require('docx');
const fs = require('fs');
const path = require('path');
const storageService = require('./storage.service');
const documentService = require('./document.service');
const logger = require('../utils/logger');

class ExportService {
  getSupportedFormats() {
    return [
      { format: 'pdf', name: 'PDF Document', mimeType: 'application/pdf' },
      { format: 'docx', name: 'Microsoft Word', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
      { format: 'txt', name: 'Plain Text', mimeType: 'text/plain' },
      { format: 'html', name: 'HTML Document', mimeType: 'text/html' },
      { format: 'md', name: 'Markdown', mimeType: 'text/markdown' }
    ];
  }

  async exportDocument({ documentId, userId, format = 'pdf' }) {
    try {
      const document = await documentService.getDocumentById(documentId, userId);

      let exportData;
      let filename = `${this.sanitizeFilename(document.title)}.${format}`;
      let mimeType;

      switch (format) {
        case 'pdf':
          exportData = await this.exportToPdf(document);
          mimeType = 'application/pdf';
          break;
        case 'docx':
          exportData = await this.exportToDocx(document);
          mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
          break;
        case 'txt':
          exportData = this.exportToTxt(document);
          mimeType = 'text/plain';
          break;
        case 'html':
          exportData = this.exportToHtml(document);
          mimeType = 'text/html';
          break;
        case 'md':
          exportData = this.exportToMarkdown(document);
          mimeType = 'text/markdown';
          break;
        default:
          throw new Error(`Unsupported export format: ${format}`);
      }

      // Optionally upload to cloud storage
      if (process.env.UPLOAD_EXPORTS_TO_CLOUD === 'true') {
        const uploadResult = await storageService.uploadFile(
          `exports/${filename}`,
          exportData,
          mimeType
        );
        
        logger.info(`Export uploaded to cloud: ${uploadResult.url}`);
      }

      return {
        data: exportData,
        filename,
        mimeType,
        format,
        documentTitle: document.title
      };
    } catch (error) {
      logger.error('Error in exportDocument:', error);
      throw error;
    }
  }

  async exportToPdf(document) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          margins: {
            top: 50,
            bottom: 50,
            left: 50,
            right: 50
          }
        });

        const buffers = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
          const pdfData = Buffer.concat(buffers);
          resolve(pdfData);
        });

        // Title
        doc.fontSize(20)
           .font('Helvetica-Bold')
           .text(document.title, { align: 'center' })
           .moveDown(0.5);

        // Metadata
        doc.fontSize(10)
           .font('Helvetica')
           .text(`Created: ${new Date(document.createdAt).toLocaleDateString()}`, { align: 'center' })
           .text(`Last Updated: ${new Date(document.updatedAt).toLocaleDateString()}`, { align: 'center' })
           .moveDown(1);

        // Content
        doc.fontSize(12)
           .text(document.content, {
             align: 'left',
             width: 500,
             lineGap: 5
           });

        // Footer
        const totalPages = doc.bufferedPageRange().count;
        for (let i = 0; i < totalPages; i++) {
          doc.switchToPage(i);
          doc.fontSize(8)
             .text(
               `Page ${i + 1} of ${totalPages} - ${document.title}`,
               50,
               doc.page.height - 50,
               { align: 'center' }
             );
        }

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  async exportToDocx(document) {
    try {
      const doc = new Document({
        sections: [{
          properties: {},
          children: [
            new Paragraph({
              text: document.title,
              heading: HeadingLevel.TITLE,
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: `Created: ${new Date(document.createdAt).toLocaleDateString()}`,
                  size: 20,
                })
              ]
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: `Last Updated: ${new Date(document.updatedAt).toLocaleDateString()}`,
                  size: 20,
                })
              ]
            }),
            new Paragraph({
              children: [new TextRun("")] // Empty line
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: document.content,
                  size: 24,
                })
              ]
            })
          ]
        }]
      });

      const buffer = await Packer.toBuffer(doc);
      return buffer;
    } catch (error) {
      logger.error('Error creating DOCX document:', error);
      throw error;
    }
  }

  exportToTxt(document) {
    const content = `
Title: ${document.title}
Created: ${new Date(document.createdAt).toLocaleDateString()}
Last Updated: ${new Date(document.updatedAt).toLocaleDateString()}

${document.content}
    `.trim();

    return Buffer.from(content, 'utf8');
  }

  exportToHtml(document) {
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${this.escapeHtml(document.title)}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            margin: 0;
            padding: 20px;
            max-width: 800px;
            margin: 0 auto;
        }
        .header {
            border-bottom: 2px solid #333;
            padding-bottom: 10px;
            margin-bottom: 20px;
        }
        .metadata {
            color: #666;
            font-size: 14px;
            margin-bottom: 20px;
        }
        .content {
            white-space: pre-wrap;
            font-size: 16px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>${this.escapeHtml(document.title)}</h1>
    </div>
    <div class="metadata">
        <p><strong>Created:</strong> ${new Date(document.createdAt).toLocaleDateString()}</p>
        <p><strong>Last Updated:</strong> ${new Date(document.updatedAt).toLocaleDateString()}</p>
    </div>
    <div class="content">${this.escapeHtml(document.content)}</div>
</body>
</html>
    `.trim();

    return Buffer.from(html, 'utf8');
  }

  exportToMarkdown(document) {
    const content = `# ${document.title}

**Created:** ${new Date(document.createdAt).toLocaleDateString()}  
**Last Updated:** ${new Date(document.updatedAt).toLocaleDateString()}

${document.content}
    `.trim();

    return Buffer.from(content, 'utf8');
  }

  sanitizeFilename(filename) {
    return filename.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  }

  escapeHtml(text) {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
  }

  async getExportHistory(userId, page = 1, limit = 10) {
    // This would typically query a database table for export history
    // For now, return mock data
    return {
      exports: [],
      pagination: {
        page,
        limit,
        totalCount: 0,
        totalPages: 0
      }
    };
  }
}

module.exports = new ExportService();