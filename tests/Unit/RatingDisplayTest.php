<?php

namespace Tests\Unit;

use App\Support\RatingDisplay;
use PHPUnit\Framework\TestCase;

class RatingDisplayTest extends TestCase
{
    public function test_format_divides_stored_elo_by_one_hundred(): void
    {
        $this->assertSame('10.00', RatingDisplay::format(1000));
        $this->assertSame('10.50', RatingDisplay::format(1050));
        $this->assertSame('8.10', RatingDisplay::format(810));
    }

    public function test_format_change_divides_stored_delta_by_one_hundred(): void
    {
        $this->assertSame('+0.16', RatingDisplay::formatChange(16));
        $this->assertSame('-0.08', RatingDisplay::formatChange(-8));
        $this->assertSame('0.00', RatingDisplay::formatChange(0));
    }
}
