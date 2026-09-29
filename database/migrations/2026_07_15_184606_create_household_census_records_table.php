<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('household_census_records', function (Blueprint $table) {
            $table->id();
            $table->foreignId('household_id')
                ->constrained('households')
                ->cascadeOnDelete();
            $table->year('census_year');
            $table->date('census_date');
            $table->decimal('monthly_income', 10, 2)->nullable();
            $table->foreignId('encoded_by')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();
            $table->string('data_status')->default('Saved');
            $table->timestamps();
            $table->unique(['household_id', 'census_year']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('household_census_records');
    }
};