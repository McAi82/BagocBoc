<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('resident_households', function (Blueprint $table) {
            $table->id();
            $table->foreignId('resident_id')
                ->constrained('residents')
                ->cascadeOnDelete();
            $table->foreignId('household_id')
                ->constrained('households')
                ->cascadeOnDelete();
            $table->string('relationship_to_household');
            $table->boolean('is_primary')->default(false);
            $table->date('start_date')->nullable();
            $table->date('end_date')->nullable();
            $table->enum('status', ['active', 'moveout'])->default('active');
            $table->timestamps();

            $table->unique(['resident_id', 'household_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('resident_households');
    }
};