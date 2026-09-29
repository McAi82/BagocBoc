<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('census_food_productions', function (Blueprint $table) {
            $table->foreignId('household_census_record_id')
                ->constrained('household_census_records')
                ->cascadeOnDelete();
            $table->foreignId('food_production_type_id')
                ->constrained('food_production_types')
                ->cascadeOnDelete();
            $table->primary(['household_census_record_id', 'food_production_type_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('census_food_productions');
    }
};