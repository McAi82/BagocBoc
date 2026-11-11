@extends('verify.layout')

@section('title', 'QR code not recognized')

@section('content')

<section class="card center">
    <div class="banner bad" style="flex-direction: column; text-align: center;">
        <div class="icon" style="flex-basis: 56px; width: 56px; height: 56px;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="9" />
                <path d="M15 9l-6 6M9 9l6 6" />
            </svg>
        </div>
        <div>
            <strong style="font-size: 1.2rem;">QR code not recognized</strong>
            <span>We could not find a household for this code.</span>
        </div>
    </div>

    <p class="muted" style="margin: 18px 0 0;">
        The label may be damaged, copied incorrectly, or no longer valid.
        Please visit the barangay office so staff can check or reprint it.
    </p>
</section>

@endsection