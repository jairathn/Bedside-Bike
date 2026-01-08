/**
 * Vercel Serverless Function Entry Point
 * Wraps the Express app for Vercel's serverless environment
 */

import { getApp } from '../server/index';

// Export the Express app as a Vercel serverless function
export default async function handler(req: any, res: any) {
  const app = await getApp();
  return app(req, res);
}
