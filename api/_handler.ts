/**
 * Vercel Serverless Function Source
 * This file is compiled by the build process into api-build/
 */

import { getApp } from '../server/index';

export default async function handler(req: any, res: any) {
  const app = await getApp();
  return app(req, res);
}
