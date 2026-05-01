<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>{{ config('app.name') }}</title>
    @if (file_exists(public_path('build/manifest.json')) || file_exists(public_path('hot')))
        @viteReactRefresh
        @vite(['resources/css/app.css', 'resources/js/main.jsx'])
    @else
        <link rel="preconnect" href="https://fonts.bunny.net">
        <link href="https://fonts.bunny.net/css?family=instrument-sans:400,500,600" rel="stylesheet" />
        @include('partials.tailwind-fallback-styles')
    @endif
</head>
<body class="min-h-screen bg-black text-white antialiased">
    <div id="root"></div>
    <script>
        window.__RT_APP_NAME__ = @json(config('app.name'));
        window.__RT_USER__ = @json(auth()->user());
    </script>
</body>
</html>
