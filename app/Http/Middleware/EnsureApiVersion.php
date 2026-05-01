<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureApiVersion
{
    /**
     * Ensure the request targets the expected API version.
     */
    public function handle(Request $request, Closure $next, string $version): Response
    {
        $requestedVersion = (string) $request->header('X-API-Version', '');
        $pathMatches = $request->is("api/{$version}/*") || $request->is("api/{$version}");
        $headerMatches = $requestedVersion === '' || $requestedVersion === $version;

        if (! $pathMatches || ! $headerMatches) {
            return response()->json([
                'message' => 'Unsupported API version.',
            ], 400);
        }

        return $next($request);
    }
}
