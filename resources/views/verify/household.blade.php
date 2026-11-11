@extends('verify.layout')

@section('title', 'Household ' . $household['household_number'])

@section('content')

{{-- Verified banner --}}
<section class="card">
    <div class="banner {{ $household['is_active'] ? '' : 'bad' }}">
        <div class="icon">
            @if ($household['is_active'])
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M20 6L9 17l-5-5" />
            </svg>
            @else
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 8v5M12 16h.01" />
            </svg>
            @endif
        </div>
        <div>
            <strong>{{ $household['is_active'] ? 'Registered household' : 'Household record is not active' }}</strong>
            <span>Found in the {{ $barangay['name'] }} household registry</span>
        </div>
    </div>

    <div class="big">{{ $household['household_number'] }}</div>
    <span class="badge {{ $household['is_active'] ? '' : 'bad' }}">{{ $household['status'] }}</span>
</section>

{{-- Household details --}}
<section class="card">
    <h2>Household</h2>
    <dl>
        <div class="row">
            <dt>Household No.</dt>
            <dd>{{ $household['household_number'] }}</dd>
        </div>
        @if (!empty($household['tracking_number']))
        <div class="row">
            <dt>Tracking No.</dt>
            <dd>{{ $household['tracking_number'] }}</dd>
        </div>
        @endif
        <div class="row">
            <dt>Head of household</dt>
            <dd>{{ $household['head'] ?: 'Not recorded' }}</dd>
        </div>
        <div class="row">
            <dt>Living members</dt>
            <dd>{{ $household['member_count'] }}</dd>
        </div>
        @if (!empty($household['census_year']))
        <div class="row">
            <dt>Last census</dt>
            <dd>{{ $household['census_year'] }}</dd>
        </div>
        @endif
    </dl>
</section>

{{-- Address --}}
<section class="card">
    <h2>Address</h2>
    <dl>
        <div class="row">
            <dt>Zone</dt>
            <dd>{{ $household['zone'] ?: 'Not recorded' }}</dd>
        </div>
        <div class="row">
            <dt>Street / Purok</dt>
            <dd>{{ $household['street'] ?: 'Not recorded' }}</dd>
        </div>
    </dl>

    @if (!empty($household['map_url']))
    <div style="margin-top: 14px;">
        <a class="btn ghost" href="{{ $household['map_url'] }}" target="_blank" rel="noopener">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M12 21s-7-6.2-7-11a7 7 0 0114 0c0 4.8-7 11-7 11z" />
                <circle cx="12" cy="10" r="2.5" />
            </svg>
            Open location in Maps
        </a>
    </div>
    @endif
</section>

{{-- Members --}}
@if ($household['show_members'])
<section class="card">
    <h2>Household members ({{ count($household['members']) }})</h2>

    @if (count($household['members']) > 0)
    <ul class="members">
        @foreach ($household['members'] as $member)
        <li>
            <div>
                <div class="name">{{ $member['name'] }}</div>
                @if (!empty($member['relationship']))
                <div class="rel">{{ $member['relationship'] }}</div>
                @endif
            </div>
            <div class="tags">
                @if ($member['is_head'])
                <span class="badge head">Head</span>
                @endif
                @if (!empty($member['note']))
                <span class="badge note">{{ $member['note'] }}</span>
                @endif
            </div>
        </li>
        @endforeach
    </ul>
    @else
    <p class="muted" style="margin: 0;">No members are recorded for this household yet.</p>
    @endif
</section>
@endif

{{-- Privacy note + staff access --}}
<section class="card">
    <div class="privacy">
        For privacy, only basic household details are shown here. Personal,
        health and census information is available to authorized barangay
        staff only.
    </div>

    <div style="margin-top: 14px;">
        <a class="btn primary" href="{{ $household['staff_url'] }}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <rect x="4" y="11" width="16" height="9" rx="2" />
                <path d="M8 11V8a4 4 0 018 0v3" />
            </svg>
            Barangay staff: open full record
        </a>
    </div>
</section>

<p class="center muted" style="font-size: .8rem; margin: 6px 0 0;">
    Scanned on {{ $scanned_at }}
</p>

@endsection