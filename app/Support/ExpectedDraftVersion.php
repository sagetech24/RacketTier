<?php

namespace App\Support;

use Illuminate\Http\Request;

class ExpectedDraftVersion
{
    public static function fromRequest(?Request $request = null): ?int
    {
        $request ??= request();

        $header = $request->header('X-Draft-Version')
            ?? $request->header('If-Match');

        if (is_string($header) && $header !== '' && $header !== '*') {
            $header = trim($header, '" ');
            if (ctype_digit($header)) {
                return (int) $header;
            }
        }

        if ($request->has('draft_version')) {
            $value = $request->input('draft_version');
            if ($value === null || $value === '') {
                return null;
            }

            return (int) $value;
        }

        return null;
    }
}
