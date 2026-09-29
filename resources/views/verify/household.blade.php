<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Household {{ $household->household_number }} — Barangay Bagocboc</title>
    <style>
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            background: #f5f7fa;
            padding: 20px;
            color: #1a1a1a;
            min-height: 100vh;
        }

        .card {
            background: #fff;
            border-radius: 16px;
            max-width: 520px;
            margin: 0 auto;
            padding: 24px;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
        }

        .badge {
            display: inline-block;
            background: #4CAF50;
            color: #fff;
            font-size: 11px;
            font-weight: 700;
            padding: 4px 12px;
            border-radius: 12px;
            text-transform: uppercase;
            letter-spacing: 0.6px;
        }

        h1 {
            color: #2E7D32;
            font-size: 24px;
            margin: 12px 0 4px;
        }

        .sub {
            color: #666;
            font-size: 13px;
            margin-bottom: 20px;
        }

        .status-pill {
            display: inline-block;
            background: #E8F5E9;
            color: #2E7D32;
            font-size: 10px;
            font-weight: 700;
            padding: 3px 10px;
            border-radius: 10px;
            text-transform: uppercase;
            margin-left: 8px;
        }

        .section {
            margin-bottom: 20px;
            padding-bottom: 20px;
            border-bottom: 1px solid #eee;
        }

        .section:last-child {
            border: 0;
            padding-bottom: 0;
            margin-bottom: 0;
        }

        .section h2 {
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.6px;
            color: #999;
            margin-bottom: 10px;
        }

        .row {
            display: flex;
            justify-content: space-between;
            padding: 6px 0;
        }

        .row span:first-child {
            color: #666;
            font-size: 13px;
        }

        .row span:last-child {
            color: #1a1a1a;
            font-size: 13px;
            font-weight: 600;
            text-align: right;
        }

        .member {
            padding: 10px 0;
            border-bottom: 1px solid #f5f5f5;
        }

        .member:last-child {
            border: 0;
        }

        .member-name {
            font-weight: 600;
            margin-bottom: 2px;
            font-size: 14px;
        }

        .member-meta {
            font-size: 12px;
            color: #666;
        }

        .head-tag {
            background: #FF9800;
            color: #fff;
            font-size: 9px;
            font-weight: 800;
            padding: 2px 6px;
            border-radius: 4px;
            margin-left: 6px;
            vertical-align: middle;
        }

        .footer {
            text-align: center;
            margin-top: 24px;
            color: #999;
            font-size: 11px;
            line-height: 1.6;
        }
    </style>
</head>

<body>
    <div class="card">
        <span class="badge">✓ Verified Household</span>
        <h1>{{ $household->household_number }}</h1>
        <div class="sub">
            Tracking: {{ $household->household_tracking_number }}
            <span class="status-pill">{{ strtoupper($household->status ?? 'active') }}</span>
        </div>

        <div class="section">
            <h2>Address</h2>
            <div class="row">
                <span>Zone</span>
                <span>{{ $household->address->barangayZone->name ?? 'N/A' }}</span>
            </div>
            <div class="row">
                <span>Street</span>
                <span>{{ $household->address->street ?? 'N/A' }}</span>
            </div>
            @if ($household->address->subdivision ?? null)
            <div class="row">
                <span>Subdivision</span>
                <span>{{ $household->address->subdivision }}</span>
            </div>
            @endif
        </div>

        <div class="section">
            <h2>Members ({{ $household->residents->count() }})</h2>
            @foreach ($household->residents as $resident)
            <div class="member">
                <div class="member-name">
                    {{ trim($resident->first_name . ' ' . $resident->last_name) }}
                    @if ($resident->pivot->is_primary)
                    <span class="head-tag">HEAD</span>
                    @endif
                </div>
                <div class="member-meta">
                    {{ $resident->pivot->relationship_to_household ?? 'N/A' }}
                    • {{ $resident->gender ?? 'N/A' }}
                    @if ($resident->age) • {{ $resident->age }} yrs @endif
                </div>
            </div>
            @endforeach
        </div>

        @if ($household->censusRecords->first())
        @php $census = $household->censusRecords->first(); @endphp
        <div class="section">
            <h2>Census ({{ $census->census_year }})</h2>
            <div class="row">
                <span>Data Status</span>
                <span>{{ $census->data_status ?? 'N/A' }}</span>
            </div>
            <div class="row">
                <span>Monthly Income</span>
                <span>₱{{ number_format((float) ($census->monthly_income ?? 0), 2) }}</span>
            </div>
        </div>
        @endif

        <div class="footer">
            <strong>Barangay {{ $household->address->barangayZone->name ?? '' }} Bagocboc</strong><br>
            Opol, Misamis Oriental<br>
            Verified by Barangay Management System
        </div>
    </div>
</body>

</html>