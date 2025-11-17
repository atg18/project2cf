const collaborationService = require('../services/collaboration.service');
const { validationResult } = require('express-validator');
const logger = require('../utils/logger');

const getDocumentCollaborators = async (req, res, next) => {
  try {
    const { documentId } = req.params;
    const collaborators = await collaborationService.getDocumentCollaborators(
      documentId, 
      req.user.id
    );

    res.json({
      success: true,
      data: { collaborators }
    });
  } catch (error) {
    logger.error('Get collaborators error:', error);
    next(error);
  }
};

const removeCollaborator = async (req, res, next) => {
  try {
    const { documentId, userId } = req.params;
    await collaborationService.removeCollaborator(
      documentId,
      req.user.id,
      userId
    );

    res.json({
      success: true,
      message: 'Collaborator removed successfully'
    });
  } catch (error) {
    logger.error('Remove collaborator error:', error);
    next(error);
  }
};

const updateCollaboratorPermission = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { documentId, userId } = req.params;
    const { permission } = req.body;

    const documentAccess = await collaborationService.updateCollaboratorPermission(
      documentId,
      req.user.id,
      userId,
      permission
    );

    res.json({
      success: true,
      message: 'Permission updated successfully',
      data: { documentAccess }
    });
  } catch (error) {
    logger.error('Update permission error:', error);
    next(error);
  }
};

const getActiveSessions = async (req, res, next) => {
  try {
    const { documentId } = req.params;
    const activeSessions = await collaborationService.getActiveSessions(
      documentId,
      req.user.id
    );

    res.json({
      success: true,
      data: { activeSessions }
    });
  } catch (error) {
    logger.error('Get active sessions error:', error);
    next(error);
  }
};

module.exports = {
  getDocumentCollaborators,
  removeCollaborator,
  updateCollaboratorPermission,
  getActiveSessions
};