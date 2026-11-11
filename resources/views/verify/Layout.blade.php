<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="noindex, nofollow">
    <meta name="theme-color" content="#2e7d32">
    <title>@yield('title', 'Household Verification') &middot; {{ $barangay['name'] }}</title>

    <style>
        :root {
            --bg: #f1f5f2;
            --card: #ffffff;
            --text: #14231a;
            --muted: #5b6b61;
            --line: #e0e8e2;
            --brand: #2e7d32;
            --brand-dark: #1b5e20;
            --ok-bg: #e6f4e8;
            --ok-text: #1b5e20;
            --bad-bg: #fdecea;
            --bad-text: #a32218;
            --note-bg: #fff6e0;
            --note-text: #7a5200;
            --radius: 16px;
            --shadow: 0 1px 2px rgba(16, 36, 24, .06), 0 6px 18px rgba(16, 36, 24, .06);
        }

        @media (prefers-color-scheme: dark) {
            :root {
                --bg: #0e1511;
                --card: #16201a;
                --text: #e8f0ea;
                --muted: #9db0a3;
                --line: #263329;
                --brand: #66bb6a;
                --brand-dark: #2e7d32;
                --ok-bg: #173320;
                --ok-text: #a5d6a7;
                --bad-bg: #3a1a17;
                --bad-text: #ffab9f;
                --note-bg: #352a10;
                --note-text: #ffd98a;
                --shadow: none;
            }
        }

        * {
            box-sizing: border-box;
        }

        html {
            -webkit-text-size-adjust: 100%;
        }

        body {
            margin: 0;
            background: var(--bg);
            color: var(--text);
            font-family: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            line-height: 1.5;
            padding-bottom: env(safe-area-inset-bottom, 0);
        }

        .hero {
            background: linear-gradient(135deg, #1b5e20 0%, #2e7d32 55%, #43a047 100%);
            color: #fff;
            padding: calc(28px + env(safe-area-inset-top, 0px)) 20px 84px;
            text-align: center;
        }

        .hero .logo {
            width: 64px;
            height: 64px;
            border-radius: 50%;
            background: rgba(255, 255, 255, .18);
            border: 2px solid rgba(255, 255, 255, .55);
            margin: 0 auto 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
        }

        .hero .logo img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }

        .hero .logo svg {
            width: 32px;
            height: 32px;
        }

        .hero h1 {
            margin: 0;
            font-size: 1.25rem;
            font-weight: 700;
            letter-spacing: .2px;
        }

        .hero p {
            margin: 4px 0 0;
            font-size: .9rem;
            opacity: .88;
        }

        main {
            max-width: 560px;
            margin: -56px auto 0;
            padding: 0 16px 32px;
        }

        .card {
            background: var(--card);
            border-radius: var(--radius);
            box-shadow: var(--shadow);
            border: 1px solid var(--line);
            padding: 18px;
            margin-bottom: 14px;
        }

        .card h2 {
            margin: 0 0 12px;
            font-size: .78rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: .08em;
            color: var(--muted);
        }

        .banner {
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .banner .icon {
            flex: 0 0 44px;
            height: 44px;
            border-radius: 50%;
            background: var(--ok-bg);
            color: var(--ok-text);
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .banner .icon svg {
            width: 24px;
            height: 24px;
        }

        .banner.bad .icon {
            background: var(--bad-bg);
            color: var(--bad-text);
        }

        .banner strong {
            display: block;
            font-size: 1.05rem;
        }

        .banner span {
            color: var(--muted);
            font-size: .88rem;
        }

        .big {
            font-size: 1.9rem;
            font-weight: 800;
            letter-spacing: .3px;
            margin: 14px 0 2px;
            word-break: break-word;
        }

        .badge {
            display: inline-block;
            padding: 3px 10px;
            border-radius: 999px;
            font-size: .75rem;
            font-weight: 700;
            background: var(--ok-bg);
            color: var(--ok-text);
        }

        .badge.bad {
            background: var(--bad-bg);
            color: var(--bad-text);
        }

        .badge.note {
            background: var(--note-bg);
            color: var(--note-text);
        }

        .badge.head {
            background: var(--brand);
            color: #fff;
        }

        dl {
            margin: 0;
        }

        .row {
            display: flex;
            justify-content: space-between;
            gap: 16px;
            padding: 10px 0;
            border-top: 1px solid var(--line);
        }

        .row:first-child {
            border-top: 0;
            padding-top: 0;
        }

        .row:last-child {
            padding-bottom: 0;
        }

        dt {
            color: var(--muted);
            font-size: .9rem;
        }

        dd {
            margin: 0;
            font-weight: 600;
            text-align: right;
            word-break: break-word;
        }

        .members {
            list-style: none;
            margin: 0;
            padding: 0;
        }

        .members li {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            padding: 11px 0;
            border-top: 1px solid var(--line);
        }

        .members li:first-child {
            border-top: 0;
            padding-top: 0;
        }

        .members li:last-child {
            padding-bottom: 0;
        }

        .members .name {
            font-weight: 600;
        }

        .members .rel {
            color: var(--muted);
            font-size: .85rem;
        }

        .members .tags {
            display: flex;
            gap: 6px;
            flex-wrap: wrap;
            justify-content: flex-end;
        }

        .btn {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            width: 100%;
            padding: 13px 16px;
            border-radius: 12px;
            border: 0;
            font: inherit;
            font-weight: 700;
            text-decoration: none;
            cursor: pointer;
        }

        .btn svg {
            width: 18px;
            height: 18px;
        }

        .btn.primary {
            background: var(--brand-dark);
            color: #fff;
        }

        .btn.ghost {
            background: transparent;
            color: var(--brand);
            border: 1.5px solid var(--brand);
        }

        .btn+.btn {
            margin-top: 10px;
        }

        .privacy {
            background: var(--note-bg);
            color: var(--note-text);
            border-radius: 12px;
            padding: 12px 14px;
            font-size: .85rem;
        }

        .muted {
            color: var(--muted);
        }

        .center {
            text-align: center;
        }

        footer {
            max-width: 560px;
            margin: 0 auto;
            padding: 4px 20px 32px;
            text-align: center;
            font-size: .8rem;
            color: var(--muted);
        }

        footer a {
            color: var(--brand);
            text-decoration: none;
        }
    </style>
</head>

<body>
    <header class="hero">
        <div class="logo">
            @if (!empty($barangay['logo']))
            <img src="{{ \Illuminate\Support\Str::startsWith($barangay['logo'], ['http://', 'https://']) ? $barangay['logo'] : asset($barangay['logo']) }}"
                alt="" onerror="this.style.display='none'">
            @else
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M3 11l9-8 9 8" />
                <path d="M5 10v10h14V10" />
                <path d="M10 20v-6h4v6" />
            </svg>
            @endif
        </div>
        <h1>{{ $barangay['name'] }}</h1>
        <p>{{ $barangay['location'] }}</p>
    </header>

    <main>
        @yield('content')
    </main>

    <footer>
        @if (!empty($barangay['phone']) || !empty($barangay['email']))
        <p>
            Questions? Contact the barangay office
            @if (!empty($barangay['phone']))
            &middot; <a href="tel:{{ preg_replace('/[^0-9+]/', '', $barangay['phone']) }}">{{ $barangay['phone'] }}</a>
            @endif
            @if (!empty($barangay['email']))
            &middot; <a href="mailto:{{ $barangay['email'] }}">{{ $barangay['email'] }}</a>
            @endif
        </p>
        @endif
        <p>&copy; {{ date('Y') }} {{ $barangay['name'] }}</p>
    </footer>
</body>

</html>