<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('program_participants', function (Blueprint $table) {
            $table->id();
            $table->foreignId('program_id')
                ->constrained('programs')
                ->cascadeOnDelete();
            $table->foreignId('resident_id')
                ->constrained('residents')
                ->cascadeOnDelete();
            $table->timestamp('enrolled_at')->nullable();
            $table->enum('status', ['active', 'inactive', 'completed', 'dropped'])->default('active');
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->unique(['program_id', 'resident_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('program_participants');
    }
};