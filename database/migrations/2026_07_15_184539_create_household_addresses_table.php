<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('household_addresses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('zone')
                ->nullable()
                ->constrained('barangay_zones')
                ->nullOnDelete();
            $table->string('street')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('household_addresses');
    }
};