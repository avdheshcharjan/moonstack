/**
 * API Response Helpers
 *
 * Common response utilities for API routes
 */

import { NextResponse } from 'next/server';

export class CommonErrors {
  static badRequest(message: string) {
    return NextResponse.json(
      { error: message, code: 'BAD_REQUEST' },
      { status: 400 }
    );
  }

  static notFound(message: string) {
    return NextResponse.json(
      { error: message, code: 'NOT_FOUND' },
      { status: 404 }
    );
  }

  static unauthorized(message: string) {
    return NextResponse.json(
      { error: message, code: 'UNAUTHORIZED' },
      { status: 401 }
    );
  }

  static internalError(message: string) {
    return NextResponse.json(
      { error: message, code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

export function successResponse<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}
