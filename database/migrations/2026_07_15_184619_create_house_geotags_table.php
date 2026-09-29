<?php
// database/migrations/2026_07_15_184619_create_house_geotags_table.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('house_geotags', function (Blueprint $table) {
            $table->id();

            $table->foreignId('household_id')
                ->constrained('households')
                ->cascadeOnDelete();

            // ✅ Coordinates - signed decimals for negative lat/lng
            $table->decimal('latitude', 10, 8);
            $table->decimal('longitude', 11, 8);
            $table->timestamp('captured_at')->nullable();

            // ✅ QR Code fields (required by HouseGeotag model $fillable)
            $table->longText('qr_code')->nullable();
            $table->longText('qr_data')->nullable();
            $table->timestamp('qr_generated_at')->nullable();

            $table->timestamps();

            // ✅ Indexes
            $table->index('household_id');
            $table->unique('household_id'); // one geotag per household
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('house_geotags');
    }
};
