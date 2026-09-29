<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('household_environments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('household_census_id')
                ->unique()
                ->constrained('household_census_records')
                ->cascadeOnDelete();
            $table->string('toilet_type');
            $table->string('water_source');
            $table->string('garbage_disposal');
            $table->enum('tenure_status', ['Owned', 'Rent Free Without Consent', 'Informal Settler', 'Rent'])->default('Owned');
            $table->boolean('couple_practices_family_planning')->default(false);
            $table->enum('uses_iodized_salt', ['Yes', 'No', 'Unknown'])->default('Unknown');
            $table->integer('OSY_count')->default(0);
            $table->integer('ISY_count')->default(0);
            $table->string('type_of_dwelling_unit');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('household_environments');
    }
};