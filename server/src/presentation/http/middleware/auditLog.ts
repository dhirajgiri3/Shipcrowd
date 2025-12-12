import { Request, Response, NextFunction } from 'express';
import mongoose, { Document, Schema, UpdateQuery } from 'mongoose'; // Import Document, Schema, UpdateQuery
import AuditLog from '../../../infrastructure/database/mongoose/models/AuditLog';
import logger from '../../../shared/logger/winston.logger';
import { AuthRequest } from '../../../types/express';

// Define a base interface for documents that might have audit fields
interface AuditableDocument extends Document {
  createdBy?: mongoose.Types.ObjectId | string;
  updatedBy?: mongoose.Types.ObjectId | string;
  companyId?: mongoose.Types.ObjectId | string;
  _id: mongoose.Types.ObjectId | string; // Ensure _id is present
  // isNew is inherited from Document, no need to redefine
  // Add other common fields if necessary
}

/**
 * Create an audit log entry
 */
export const createAuditLog = async (
  userId: mongoose.Types.ObjectId | string,
  companyId: mongoose.Types.ObjectId | string | undefined,
  action: 'create' | 'read' | 'update' | 'delete' | 'login' | 'logout' | 'verify' | 'generate' | 'other' |
          'security' | 'password_change' | 'email_change' | 'account_lock' | 'account_unlock' | 'session_revoke' | 'profile_update',
  resource: string,
  resourceId: mongoose.Types.ObjectId | string | undefined,
  details: any, // Consider defining a more specific type for details
  req?: Request
) => {
  try {
    const auditLog = new AuditLog({
      userId,
      companyId,
      action,
      resource,
      resourceId,
      details,
      ipAddress: req?.ip,
      userAgent: req?.headers['user-agent'],
      timestamp: new Date(),
    });

    await auditLog.save();
    logger.debug(`Audit log created: ${action} ${resource} by user ${userId}`);
  } catch (error) {
    logger.error('Error creating audit log:', error);
  }
};

/**
 * Middleware to log API requests
 */
export const auditLogMiddleware = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const skipPaths = ['/api/health', '/api/metrics'];
  if (skipPaths.includes(req.path)) {
    return next();
  }

  const originalSend = res.send;
  const originalJson = res.json;
  const originalEnd = res.end;

  let logged = false;

  const logRequest = (body?: any) => {
    if (logged || !req.user?._id) return;
    logged = true;

    let action: 'create' | 'read' | 'update' | 'delete' | 'login' | 'logout' | 'verify' | 'generate' | 'other' |
                'security' | 'password_change' | 'email_change' | 'account_lock' | 'account_unlock' | 'session_revoke' | 'profile_update';

    // Determine action based on path and method
    if (req.path.includes('/auth/login')) {
      action = 'login';
    } else if (req.path.includes('/auth/logout')) {
      action = 'logout';
    } else if (req.path.includes('/auth/verify-email')) {
      action = 'verify';
    } else if (req.path.includes('/auth/reset-password')) {
      action = 'password_change';
    } else if (req.path.includes('/sessions') && req.method === 'DELETE') {
      action = 'session_revoke';
    } else if (req.path.includes('/users/profile') && (req.method === 'PUT' || req.method === 'PATCH')) {
      action = 'profile_update';
    } else if (req.path.includes('/users/email') && (req.method === 'PUT' || req.method === 'PATCH')) {
      action = 'email_change';
    } else {
      // Default mapping based on HTTP method
      switch (req.method) {
        case 'POST': action = 'create'; break;
        case 'GET': action = 'read'; break;
        case 'PUT': case 'PATCH': action = 'update'; break;
        case 'DELETE': action = 'delete'; break;
        default: action = 'other';
      }
    }

    const pathParts = req.path.split('/').filter(Boolean);
    const resource = pathParts.length > 1 ? pathParts[1] : 'unknown';
    // Ensure resourceId is correctly extracted and is a string or ObjectId if present
    const potentialId = pathParts.length > 2 ? pathParts[2] : undefined;
    let resourceId: string | mongoose.Types.ObjectId | undefined = undefined;
    if (potentialId && mongoose.Types.ObjectId.isValid(potentialId)) {
        resourceId = new mongoose.Types.ObjectId(potentialId);
    } else if (potentialId) {
        // Handle cases where ID might not be a valid ObjectId but still relevant
        resourceId = potentialId;
    }

    const userId = req.user._id;
    // Convert companyId to string if it exists
    const companyId = req.user.companyId;
    const isSuccess = res.statusCode >= 200 && res.statusCode < 300;

    // Filter sensitive data from request body
    const filteredBody = { ...req.body };
    if (filteredBody.password) filteredBody.password = '********';
    if (filteredBody.newPassword) filteredBody.newPassword = '********';
    if (filteredBody.currentPassword) filteredBody.currentPassword = '********';
    if (filteredBody.token) filteredBody.token = '********';
    if (filteredBody.refreshToken) filteredBody.refreshToken = '********';

    // Get additional context based on action type
    let additionalContext = {};
    if (action === 'login' || action === 'logout') {
      additionalContext = {
        userAgent: req.headers['user-agent'],
        ip: req.ip,
        timestamp: new Date(),
      };
    } else if (action === 'password_change') {
      additionalContext = {
        timestamp: new Date(),
      };
    } else if (action === 'session_revoke') {
      additionalContext = {
        sessionId: resourceId,
        timestamp: new Date(),
      };
    }

    createAuditLog(
      userId,
      companyId,
      action,
      resource,
      resourceId, // Pass the potentially converted ObjectId
      {
        method: req.method,
        path: req.path,
        query: req.query,
        body: filteredBody, // Use filtered body without sensitive data
        statusCode: res.statusCode,
        success: isSuccess,
        response: isSuccess ? undefined : (typeof body === 'string' || typeof body === 'object' ? body : undefined),
        ...additionalContext,
      },
      req
    );
  };

  res.send = function (body) {
    logRequest(body);
    // Use apply to pass arguments correctly
    return originalSend.apply(this, [body]);
  };

  res.json = function (body) {
    logRequest(body);
     // Use apply to pass arguments correctly
    return originalJson.apply(this, [body]);
  };

  res.end = function (...args: any[]) { // Revert to any[] for simplicity
    if (!logged) {
        logRequest();
    }
    // Use apply with the arguments array. Ignore TS error due to complex overloads.
    // @ts-ignore
    return originalEnd.apply(this, args);
  };

  next();
};

/**
 * Middleware/Plugin to log model changes (Mongoose Plugin)
 */
export const auditLogPlugin = (schema: Schema) => {
  // Log document creation
  schema.post('save', async function (doc: AuditableDocument) { // Type doc
    if (!doc.isNew) return;
    try {
      const userId = doc.createdBy || new mongoose.Types.ObjectId('000000000000000000000000');
      const companyId = doc.companyId;
      // Safely access modelName
      const modelName = (doc.constructor as mongoose.Model<any>)?.modelName?.toLowerCase() || 'unknown_model';

      await createAuditLog(
        userId,
        companyId,
        'create',
        modelName,
        doc._id, // Use doc._id directly (type is compatible)
        {
          document: doc.toObject(), // Consider filtering sensitive fields
          message: `Created new ${modelName}`,
        }
      );
    } catch (error) {
      const modelName = (doc.constructor as mongoose.Model<any>)?.modelName || 'Unknown Model';
      logger.error(`Error creating audit log for ${modelName} creation:`, error);
    }
  });

  // Store original document before update using findOne
  schema.pre('findOneAndUpdate', async function () {
    try {
      // @ts-ignore - 'this' context in Mongoose middleware
      const query = this.getQuery();
      // @ts-ignore
      const model = this.model as mongoose.Model<AuditableDocument>; // Cast model
      // Fetch the document using lean for a plain object
      const docToUpdate = await model.findOne(query).lean<AuditableDocument>();
      if (!docToUpdate) return;
      // @ts-ignore - Attaching custom property
      this._originalDoc = docToUpdate;
    } catch (error) {
      // @ts-ignore
      const modelName = (this.model as mongoose.Model<any>)?.modelName || 'Unknown Model';
      logger.error(`Error fetching original document for audit log in ${modelName} update:`, error);
    }
  });


  // Log document updates after successful update
  schema.post('findOneAndUpdate', async function () {
     // @ts-ignore - Accessing custom property and context
    if (!this || !this._originalDoc) {
        // @ts-ignore
        if (this && this._originalDoc === null) { // Handle case where doc didn't exist initially
             // @ts-ignore
             delete this._originalDoc;
        }
        return; // Exit if originalDoc wasn't stored or was explicitly null
    }


    try {
      // @ts-ignore
      const originalDoc = this._originalDoc as Record<string, any>; // Type originalDoc
      // @ts-ignore
      const query = this.getQuery();
      // @ts-ignore
      const model = this.model as mongoose.Model<AuditableDocument>; // Cast model
      // Fetch the *actually* updated document using lean
      const updatedDoc = await model.findOne(query).lean<AuditableDocument>();

      if (!updatedDoc) {
        logger.warn(`Audit log: Updated document not found after findOneAndUpdate for query: ${JSON.stringify(query)}`);
        return; // Don't proceed if the updated doc isn't found
      }

      // @ts-ignore
      const updateData = this.getUpdate() as UpdateQuery<any> | null; // Type updateData

      // Safely access potential updatedBy field from the update operation or the doc itself
      const userIdSource = (updateData?.$set as any)?.updatedBy ?? (updateData as any)?.updatedBy ?? updatedDoc.updatedBy;
      const userId = userIdSource || new mongoose.Types.ObjectId('000000000000000000000000');
      const companyId = updatedDoc.companyId || originalDoc.companyId;
      // Safely access modelName from the model context
      const modelName = model?.modelName?.toLowerCase() || 'unknown_model';


      const changes: Record<string, { from: any; to: any }> = {};
      const updatedDocRecord = updatedDoc as Record<string, any>; // Type updatedDoc for indexing

      // Iterate over keys of the updated document
      for (const key in updatedDocRecord) {
        // Ensure the key is an own property of updatedDoc
        if (Object.prototype.hasOwnProperty.call(updatedDocRecord, key)) {
          // Check if the key exists in the original document and compare values
          if (
            originalDoc &&
            Object.prototype.hasOwnProperty.call(originalDoc, key) &&
            JSON.stringify(originalDoc[key]) !== JSON.stringify(updatedDocRecord[key])
          ) {
            changes[key] = {
              from: originalDoc[key],
              to: updatedDocRecord[key],
            };
          }
        }
      }


      if (Object.keys(changes).length > 0) {
        await createAuditLog(
          userId,
          companyId,
          'update',
          modelName,
          updatedDoc._id, // Use updatedDoc._id directly
          {
            changes,
            // Optionally include before/after, but changes are often sufficient
            // before: originalDoc,
            // after: updatedDoc,
            message: `Updated ${modelName}`,
          }
        );
      }
    } catch (error) {
       // @ts-ignore
      const modelName = (this.model as mongoose.Model<any>)?.modelName || 'Unknown Model';
      logger.error(`Error creating audit log for ${modelName} update:`, error);
    } finally {
      // Clean up the temporary property regardless of success or failure
      // @ts-ignore
      delete this._originalDoc;
    }
  });


  // Log document deletion (soft delete via findOneAndUpdate)
  // This pre hook needs to run *before* the update pre hook that stores _originalDoc
  // if soft delete should be logged based on the state *before* the update.
  // However, logging *after* the update confirms it happened. Let's stick to pre for intent.
  schema.pre('findOneAndUpdate', async function () {
    // @ts-ignore
    const update = this.getUpdate() as UpdateQuery<any> | null; // Type update
    // Check for soft delete pattern (adjust field name if necessary)
    const isSoftDelete = (update?.$set as any)?.isDeleted === true || (update as any)?.isDeleted === true;

    if (isSoftDelete) {
      try {
        // @ts-ignore
        const query = this.getQuery();
         // @ts-ignore
        const model = this.model as mongoose.Model<AuditableDocument>;
        // Find the document *before* it's marked as deleted
        const docToDelete = await model.findOne(query).lean<AuditableDocument>();
        if (!docToDelete) return; // Document already gone or query mismatch

        // Determine userId from the update operation if possible
        const userIdSource = (update?.$set as any)?.updatedBy ?? (update as any)?.updatedBy;
        const userId = userIdSource || new mongoose.Types.ObjectId('000000000000000000000000'); // Fallback
        const companyId = docToDelete.companyId;
        const modelName = model?.modelName?.toLowerCase() || 'unknown_model';

        // Log the intent to soft delete
        await createAuditLog(
          userId,
          companyId,
          'delete', // Use 'delete' action
          modelName,
          docToDelete._id, // Use docToDelete._id
          {
            // document: docToDelete, // Optionally log the state before deletion
            message: `Soft deleted ${modelName}`,
          }
        );
      } catch (error) {
         // @ts-ignore
        const modelName = (this.model as mongoose.Model<any>)?.modelName || 'Unknown Model';
        logger.error(`Error creating audit log for ${modelName} soft deletion:`, error);
      }
    }
  });


  // Log hard deletions (deleteOne)
  schema.pre('deleteOne', { document: true, query: false }, async function () {
    // 'this' refers to the document being deleted
    const doc = this as AuditableDocument; // Type 'this'
    try {
      // Hard deletes might not have an associated user action easily available
      const userId = new mongoose.Types.ObjectId('000000000000000000000000'); // System ID
      const companyId = doc.companyId;
      const modelName = (doc.constructor as mongoose.Model<any>)?.modelName?.toLowerCase() || 'unknown_model';

      await createAuditLog(
        userId,
        companyId,
        'delete',
        modelName,
        doc._id, // Use doc._id
        {
          // document: doc.toObject(), // Optionally log the deleted document's data
          message: `Hard deleted ${modelName}`,
        }
      );
    } catch (error) {
      const modelName = (doc.constructor as mongoose.Model<any>)?.modelName || 'Unknown Model';
      logger.error(`Error creating audit log for ${modelName} hard deletion:`, error);
    }
  });

  // Consider adding pre hooks for deleteMany and remove if needed,
  // logging the query criteria instead of individual documents.
};


export default {
  createAuditLog,
  auditLogMiddleware,
  auditLogPlugin,
};
