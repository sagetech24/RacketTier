<?php

namespace App\Actions;

use App\Models\Facility;
use App\Services\ReferenceDataCache;
use RuntimeException;

class ArchiveFacility
{
    public function __construct(
        private ReferenceDataCache $referenceDataCache,
    ) {}

    public function execute(Facility $facility): Facility
    {
        $activeSessions = $facility->gameSessions()
            ->where('is_active', true)
            ->exists();

        if ($activeSessions) {
            throw new RuntimeException('Cannot archive a facility with active sessions.');
        }

        $facility->delete();
        $this->referenceDataCache->forgetFacilitiesIndex();
        $this->referenceDataCache->forgetPublicStats();

        return $facility;
    }
}
