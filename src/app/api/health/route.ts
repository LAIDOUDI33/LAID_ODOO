// ============================================================
// HASSIBA Suite ERP v2.0.0 - Health Check Endpoint
// ============================================================
// Production health monitoring endpoint
// Used by load balancers, Docker HEALTHCHECK, monitoring systems
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  checks: {
    database: {
      status: 'up' | 'down';
      latency_ms?: number;
      error?: string;
    };
    memory: {
      status: 'ok' | 'warning' | 'critical';
      used_mb: number;
      total_mb: number;
      percent: number;
    };
  };
}

const START_TIME = Date.now();
const APP_VERSION = '2.0.0';
const MEMORY_WARNING_THRESHOLD = 75; // %
const MEMORY_CRITICAL_THRESHOLD = 90; // %

async function checkDatabase(): Promise<{
  status: 'up' | 'down';
  latency_ms?: number;
  error?: string;
}> {
  const start = Date.now();
  
  try {
    await db.$queryRaw`SELECT 1`;
    const latency = Date.now() - start;
    
    return {
      status: 'up',
      latency_ms: latency,
    };
  } catch (error) {
    return {
      status: 'down',
      error: error instanceof Error ? error.message : 'Unknown database error',
    };
  }
}

function getMemoryUsage(): {
  status: 'ok' | 'warning' | 'critical';
  used_mb: number;
  total_mb: number;
  percent: number;
} {
  const memUsage = process.memoryUsage();
  const usedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
  const totalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
  const percent = totalMB > 0 ? (usedMB / totalMB) * 100 : 0;

  let status: 'ok' | 'warning' | 'critical' = 'ok';
  if (percent >= MEMORY_CRITICAL_THRESHOLD) {
    status = 'critical';
  } else if (percent >= MEMORY_WARNING_THRESHOLD) {
    status = 'warning';
  }

  return {
    status,
    used_mb: usedMB,
    total_mb: totalMB,
    percent: Math.round(percent * 100) / 100,
  };
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();

  const [dbCheck, memoryCheck] = await Promise.all([
    checkDatabase(),
    Promise.resolve(getMemoryUsage()),
  ]);

  let overallStatus: HealthStatus['status'] = 'healthy';
  
  if (dbCheck.status === 'down') {
    overallStatus = 'unhealthy';
  } else if (memoryCheck.status === 'critical') {
    overallStatus = 'degraded';
  }

  const healthData: HealthStatus = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptime: Math.round((Date.now() - START_TIME) / 1000),
    version: APP_VERSION,
    environment: process.env.NODE_ENV || 'development',
    checks: {
      database: dbCheck,
      memory: memoryCheck,
    },
  };

  let httpStatus = 200;
  if (overallStatus === 'unhealthy') {
    httpStatus = 503;
  }

  const response = NextResponse.json(healthData, { status: httpStatus });
  response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  response.headers.set('X-Response-Time', `${Date.now() - startTime}ms`);

  return response;
}

export async function HEAD(): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'X-App-Version': APP_VERSION,
      'X-Status': 'ok',
    },
  });
}
