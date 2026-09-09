<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('users', function (Blueprint $table) {
            $table->string('id')->primary(); // Supabase Auth user UUID
            $table->string('name');
            $table->string('email')->unique();
            $table->string('profile_image')->nullable();
            $table->string('role')->default('CUSTOMER');
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('users');
    }
};
