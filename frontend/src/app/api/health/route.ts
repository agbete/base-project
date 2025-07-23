import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Check if we can reach the backend API
    const backendUrl = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    
    let backendStatus = 'unknown';
    try {
      const response = await fetch(`${backendUrl}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        // Add timeout
        signal: AbortSignal.timeout(5000),
      });
      
      if (response.ok) {
        backendStatus = 'healthy';
      } else {
        backendStatus = 'unhealthy';
      }
    } catch (error) {
      backendStatus = 'unreachable';
    }

    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'frontend',
      version: '1.0.0',
      backend: {
        status: backendStatus,
        url: backendUrl,
      },
      environment: process.env.NODE_ENV || 'development',
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        service: 'frontend',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

