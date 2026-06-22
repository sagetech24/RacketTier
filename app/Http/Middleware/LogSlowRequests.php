<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

class LogSlowRequests
{
    private const THRESHOLD_MS = 500;

    public function handle(Request $request, Closure $next): Response
    {
        $started = microtime(true);

        /** @var Response $response */
        $response = $next($request);

        $elapsedMs = (microtime(true) - $started) * 1000;

        if ($elapsedMs >= self::THRESHOLD_MS) {
            Log::channel('daily')->warning('Slow request', [
                'method' => $request->method(),
                'path' => $request->path(),
                'duration_ms' => (int) round($elapsedMs),
                'status' => $response->getStatusCode(),
            ]);
        }

        $response->headers->set('Server-Timing', 'app;dur='.(int) round($elapsedMs));

        return $response;
    }
}
