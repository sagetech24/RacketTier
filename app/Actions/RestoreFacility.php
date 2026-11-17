<?php

namespace App\Actions;

use App\Models\Facility;
use App\Services\ReferenceDataCache;

class RestoreFacility
{
    public function __construct(
        private ReferenceDataCache $referenceDataCache,
    ) {}

    public function execute(Facility $facility): Facility
    {
        $facility->restore();
        $this->referenceDataCache->forgetFacilitiesIndex();

        return $facility;
    }
}
