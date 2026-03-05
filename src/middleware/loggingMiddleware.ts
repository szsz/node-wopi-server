import { NextFunction, Request, Response } from 'express';

// Add verbose logging flag to environment
const VERBOSE_LOGGING = process.env.VERBOSE_LOGGING === 'true';

// Middleware to log all requests and responses
export function verboseLogging(req: Request, res: Response, next: NextFunction): void {
  if (!VERBOSE_LOGGING) {
    next();
    return;
  }

  const startTime = Date.now();
  
  // Log incoming request
  console.log('\n========== INCOMING REQUEST ==========');
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  console.log('Headers:', JSON.stringify(req.headers, null, 2));
  console.log('Query:', JSON.stringify(req.query, null, 2));
  
  // Log body for non-file operations (avoid logging binary data)
  const isFileOperation = req.url.includes('/contents') || req.url.includes('/add-file');
  if (req.body && !isFileOperation && typeof req.body === 'object') {
    console.log('Body:', JSON.stringify(req.body, null, 2));
  } else if (!isFileOperation && (req as any).rawBody) {
    // Log raw body if it's not a file operation
    const rawBody = (req as any).rawBody;
    if (rawBody && rawBody.length < 1000) {
      console.log('Raw Body:', rawBody.toString('utf-8').substring(0, 500));
    } else if (rawBody) {
      console.log('Raw Body Length:', rawBody.length, 'bytes');
    }
  }

  // Capture original response methods
  const originalSend = res.send;
  const originalJson = res.json;
  const originalSendFile = res.sendFile;
  const originalStatus = res.status;

  let statusCode = 200;

  // Override res.status to capture status code
  res.status = function(code: number) {
    statusCode = code;
    return originalStatus.call(this, code);
  };

  // Override res.send to log response
  res.send = function(body?: any) {
    logResponse(statusCode, body, isFileOperation);
    return originalSend.call(this, body);
  };

  // Override res.json to log response
  res.json = function(body?: any) {
    logResponse(statusCode, body, isFileOperation);
    return originalJson.call(this, body);
  };

  // Override res.sendFile (don't log file contents)
  res.sendFile = function(...args: any[]) {
    console.log('\n========== OUTGOING RESPONSE ==========');
    console.log(`[${new Date().toISOString()}] Status: ${statusCode || res.statusCode}`);
    console.log('Response: [FILE DATA - NOT LOGGED]');
    console.log(`Duration: ${Date.now() - startTime}ms`);
    console.log('=======================================\n');
    return originalSendFile.apply(this, args as any);
  };

  function logResponse(status: number, body: any, isFile: boolean): void {
    console.log('\n========== OUTGOING RESPONSE ==========');
    console.log(`[${new Date().toISOString()}] Status: ${status}`);
    console.log('Headers:', JSON.stringify(res.getHeaders(), null, 2));
    
    if (isFile) {
      console.log('Response: [FILE DATA - NOT LOGGED]');
      if (body && body.length) {
        console.log('Response Body Length:', body.length, 'bytes');
      }
    } else if (body) {
      if (typeof body === 'string') {
        console.log('Response Body:', body.substring(0, 1000));
      } else if (typeof body === 'object') {
        console.log('Response Body:', JSON.stringify(body, null, 2));
      } else {
        console.log('Response Body Type:', typeof body);
      }
    }
    
    console.log(`Duration: ${Date.now() - startTime}ms`);
    console.log('=======================================\n');
  }

  next();
}