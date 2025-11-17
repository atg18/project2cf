const exportService = require('../services/export.service');
const logger = require('../utils/logger');

const exportDocument = async (req, res, next) => {
  try {
    const { documentId } = req.params;
    const { format } = req.body;

    const exportResult = await exportService.exportDocument({
      documentId,
      userId: req.user.id,
      format: format || 'pdf'
    });

    // Set appropriate headers based on format
    const contentType = getContentType(format);
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', 
      `attachment; filename="${exportResult.filename}"`);

    // Send the file
    res.send(exportResult.data);
  } catch (error) {
    logger.error('Export document error:', error);
    next(error);
  }
};

const getExportFormats = async (req, res, next) => {
  try {
    const formats = exportService.getSupportedFormats();
    
    res.json({
      success: true,
      data: { formats }
    });
  } catch (error) {
    logger.error('Get export formats error:', error);
    next(error);
  }
};

function getContentType(format) {
  const contentTypes = {
    pdf: 'application/pdf',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    txt: 'text/plain',
    html: 'text/html',
    md: 'text/markdown'
  };
  return contentTypes[format] || 'application/octet-stream';
}

module.exports = {
  exportDocument,
  getExportFormats
};