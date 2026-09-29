<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('maternal_profiles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('resident_id')
                ->constrained('residents')
                ->cascadeOnDelete();
            $table->enum('pregnancy_status', ['pregnant', 'postpartum', 'terminated']);
            $table->date('expected_delivery_date')->nullable();
            $table->date('last_checkup_date')->nullable();
            $table->boolean('family_planning')->default(false);
            $table->text('remarks')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('maternal_profiles');
    }
};