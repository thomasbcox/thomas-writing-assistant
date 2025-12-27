/**
 * MSW (Mock Service Worker) handlers for tRPC endpoints
 * 
 * This file provides handlers that intercept HTTP requests to tRPC endpoints
 * and return mock responses. This allows component tests to use real tRPC hooks
 * while controlling the responses.
 */

import { http, HttpResponse } from 'msw';
import type { AppRouter } from '~/server/api/root';
import type { TRPCErrorResponse } from '@trpc/server/rpc';
import superjson from 'superjson';

// Type helper for tRPC procedure paths
type ProcedurePath<T> = T extends Record<string, any>
  ? {
      [K in keyof T]: T[K] extends Record<string, any>
        ? `${string & K}.${string & keyof T[K]}`
        : never;
    }[keyof T]
  : never;

// Store mock responses by procedure path
const mockResponses = new Map<string, any>();
const mockErrors = new Map<string, TRPCErrorResponse>();

/**
 * Set a mock response for a tRPC procedure
 * @param path - The procedure path (e.g., "concept.list" or "capsule.getById")
 * @param data - The data to return
 */
export function mockTRPCResponse(path: string, data: any) {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/48af193b-4a6b-47dc-bfb1-a9e7f5836380',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'msw-handlers.ts:31',message:'Setting mock response',data:{path,dataType:typeof data,dataIsArray:Array.isArray(data),dataLength:Array.isArray(data)?data.length:'N/A',allMocks:Array.from(mockResponses.keys())},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
  // #endregion
  mockResponses.set(path, data);
  mockErrors.delete(path);
}

/**
 * Set a mock error for a tRPC procedure
 * @param path - The procedure path
 * @param error - The error response
 */
export function mockTRPCError(path: string, error: TRPCErrorResponse) {
  mockErrors.set(path, error);
  mockResponses.delete(path);
}

/**
 * Clear all mocks
 */
export function clearMocks() {
  mockResponses.clear();
  mockErrors.clear();
}

/**
 * Get the mock response for a procedure, or undefined if not set
 */
export function getMockResponse(path: string): any {
  return mockResponses.get(path);
}

/**
 * MSW handler for tRPC requests
 * tRPC uses POST requests to /api/trpc/[procedure] with JSON body
 * For batch requests, the body is an array
 * 
 * tRPC httpBatchStreamLink sends requests to URLs like:
 * - /api/trpc/concept.list
 * - /api/trpc/concept.create
 */
// Handler for tRPC requests - use a function matcher to catch all /api/trpc requests
export const trpcHandler = http.post(
  ({ url }) => url.pathname.startsWith('/api/trpc/'),
  async ({ request }) => {
    // PROOF: Log handler entry
    console.error(`\n[MSW] Handler called for: ${request.url}\n`);
    
    const url = new URL(request.url);
    const pathMatch = url.pathname.match(/^\/api\/trpc\/(.+)$/);
    const procedurePath = pathMatch ? pathMatch[1] : '';
    
    try {
      const body = await request.json() as any;
      
      // PROOF: Log request body
      try {
        const fs = require('fs');
        fs.appendFileSync('/tmp/msw-handler-called.log', `Request body type: ${Array.isArray(body) ? 'array' : typeof body}, length: ${Array.isArray(body) ? body.length : 'N/A'}\n`);
        if (Array.isArray(body)) {
          fs.appendFileSync('/tmp/msw-handler-called.log', `Batch items: ${body.map((r: any) => `id=${r.id}, path=${r.path}`).join(', ')}\n`);
        }
      } catch {}
      
      // Handle batch requests
      if (Array.isArray(body)) {
        const responses = body.map((req: any) => {
          const procPath = req.path || procedurePath;
          
          // Check for error first
          const error = mockErrors.get(procPath);
          if (error) {
            return {
              id: req.id,
              error: error.error,
            };
          }
          
          // Check for mock response
          const data = mockResponses.get(procPath);
          if (data !== undefined) {
            // Serialize with superjson exactly as the real server does
            const serialized = superjson.serialize(data);
            
            // tRPC batch response format (with superjson):
            // Each response: { id: number, result: { data: serialized.json, meta?: serialized.meta } }
            // The client transformer expects: result.data = serialized JSON, result.meta = meta (if present)
            // Client will call: superjson.deserialize({ json: result.data, meta: result.meta })
            const resultObj: any = {
              data: serialized.json,
            };
            
            // Only include meta if it exists and has content
            // Empty meta objects can cause transformation issues
            if (serialized.meta && Object.keys(serialized.meta).length > 0) {
              resultObj.meta = serialized.meta;
            }
            
            const response = {
              id: req.id,
              result: resultObj,
            };
            
            // CAPTURE: Log the response being returned
            process.stderr.write(`\n[MSW] Returning success response for ${procPath}:\n${JSON.stringify(response, null, 2)}\n\n`);
            
            return response;
          }
          
          // If no mock found, return error with details
          const errorMsg = `No mock found for procedure: "${procPath}". Available mocks: ${Array.from(mockResponses.keys()).join(', ')}`;
          return {
            id: req.id,
            error: {
              json: {
                code: 'INTERNAL_SERVER_ERROR',
                message: errorMsg,
                data: {},
              },
            },
          };
        });
        
        // Verify responses are valid JSON before sending
        try {
          const batchResponseStr = JSON.stringify(responses);
          // If JSON.stringify succeeds, the response is valid
          process.stderr.write(`\n[MSW] Sending batch response (${responses.length} items, ${batchResponseStr.length} bytes)\n`);
        } catch (jsonError: any) {
          process.stderr.write(`\n[MSW] ERROR: Failed to stringify batch response: ${jsonError.message}\n`);
          throw jsonError;
        }
        
        // Return batch response - tRPC expects array of responses
        return HttpResponse.json(responses, {
          headers: { 
            'Content-Type': 'application/json',
          },
        });
      }
      
      // Handle single request
      const data = mockResponses.get(procedurePath);
      if (data !== undefined) {
        const serialized = superjson.serialize(data);
        const response = {
          result: {
            data: serialized.json,
            ...(serialized.meta && Object.keys(serialized.meta).length > 0 ? { meta: serialized.meta } : {}),
          },
        };
        
        // CAPTURE: Log single response
        const responseStr = JSON.stringify(response, null, 2);
        try {
          const fs = require('fs');
          fs.writeFileSync('/tmp/msw-single-response.json', responseStr);
          fs.appendFileSync('/tmp/msw-responses.log', `\n=== Single Response for ${procedurePath} ===\n${responseStr}\n`);
        } catch {}
        
        return HttpResponse.json(response, {
          headers: { 'Content-Type': 'application/json' },
        });
      }
      
      return HttpResponse.json({
        result: { data: null },
      });
    } catch (err: any) {
      return HttpResponse.json({
        error: {
          json: {
            code: 'PARSE_ERROR',
            message: 'Failed to parse request body: ' + err.message,
            data: {},
          },
        },
      }, { status: 400 });
    }
});

/**
 * Helper to create a tRPC error response
 */
export function createTRPCError(
  code: 'PARSE_ERROR' | 'BAD_REQUEST' | 'UNAUTHORIZED' | 'FORBIDDEN' | 'NOT_FOUND' | 'METHOD_NOT_SUPPORTED' | 'TIMEOUT' | 'CONFLICT' | 'PRECONDITION_FAILED' | 'PAYLOAD_TOO_LARGE' | 'UNPROCESSABLE_CONTENT' | 'TOO_MANY_REQUESTS' | 'CLIENT_CLOSED_REQUEST' | 'INTERNAL_SERVER_ERROR',
  message: string,
  data?: any,
): TRPCErrorResponse {
  return {
    error: {
      json: {
        code,
        message,
        data: data ?? {},
      },
    },
  };
}

