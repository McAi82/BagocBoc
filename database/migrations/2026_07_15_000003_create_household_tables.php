<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('barangay_zones', function (Blueprint $table) {
            $table->id();
            $table->integer('zone_number');
            $table->string('name');
            $table->decimal('latitude', 10, 8)->nullable();
            $table->decimal('longitude', 11, 8)->nullable();
            $table->timestamps();
        });

        Schema::create('household_addresses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('zone')->nullable()->constrained('barangay_zones')->nullOnDelete();
            $table->string('street')->nullable();
            $table->timestamps();
        });

        Schema::create('households', function (Blueprint $table) {
            $table->id();
            $table->foreignId('address_id')->constrained('household_addresses')->cascadeOnDelete();
            $table->string('household_tracking_number')->unique();
            $table->string('household_number')->unique();
            $table->string('status')->default('active');
            $table->timestamps();
        });

        Schema::create('resident_households', function (Blueprint $table) {
            $table->id();
            $table->foreignId('resident_id')->constrained('residents')->cascadeOnDelete();
            $table->foreignId('household_id')->constrained('households')->cascadeOnDelete();
            $table->string('relationship_to_household');
            $table->boolean('is_primary')->default(false);
            $table->date('start_date')->nullable();
            $table->date('end_date')->nullable();
            $table->enum('status', ['active', 'moveout'])->default('active');
            $table->timestamps();

            $table->unique(['resident_id', 'household_id', 'status']);
        });

        Schema::create('house_geotags', function (Blueprint $table) {
            $table->id();
            $table->foreignId('household_id')->constrained('households')->cascadeOnDelete();
            $table->decimal('latitude', 10, 8);
            $table->decimal('longitude', 11, 8);
            $table->timestamp('captured_at')->nullable();
            $table->longText('qr_code')->nullable();
            $table->longText('qr_data')->nullable();
            $table->timestamp('qr_generated_at')->nullable();
            $table->timestamps();

            $table->index('household_id');
            $table->unique('household_id');
        });

        Schema::create('household_census_records', function (Blueprint $table) {
            $table->id();
            $table->foreignId('household_id')->constrained('households')->cascadeOnDelete();
            $table->year('census_year');
            $table->date('census_date');
            $table->decimal('monthly_income', 10, 2)->nullable();
            $table->foreignId('encoded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('data_status')->default('Saved');
            $table->timestamps();
            $table->unique(['household_id', 'census_year']);
        });

        Schema::create('household_environments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('household_census_id')->unique()->constrained('household_census_records')->cascadeOnDelete();
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

        Schema::create('food_production_types', function (Blueprint $table) {
            $table->id();
            $table->string('name');
        });

        Schema::create('census_food_productions', function (Blueprint $table) {
            $table->foreignId('household_census_record_id')->constrained('household_census_records')->cascadeOnDelete();
            $table->foreignId('food_production_type_id')->constrained('food_production_types')->cascadeOnDelete();
            $table->primary(['household_census_record_id', 'food_production_type_id']);
        });

        Schema::create('zone_check_ins', function (Blueprint $table) {
            $table->id();
            $table->foreignId('zone_leader_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('zone_id')->constrained('barangay_zones')->cascadeOnDelete();
            $table->decimal('latitude', 10, 8)->nullable();
            $table->decimal('longitude', 11, 8)->nullable();
            $table->text('notes')->nullable();
            $table->enum('status', ['clear', 'needs_attention', 'urgent'])->default('clear');
            $table->timestamp('checked_in_at')->nullable();
            $table->text('findings')->nullable();
            $table->json('attachments')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('zone_check_ins');
        Schema::dropIfExists('census_food_productions');
        Schema::dropIfExists('food_production_types');
        Schema::dropIfExists('household_environments');
        Schema::dropIfExists('household_census_records');
        Schema::dropIfExists('house_geotags');
        Schema::dropIfExists('resident_households');
        Schema::dropIfExists('households');
        Schema::dropIfExists('household_addresses');
        Schema::dropIfExists('barangay_zones');
    }
};