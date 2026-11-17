<?php

namespace App\Actions;

use App\Models\TierRank;
use App\Services\ReferenceDataCache;
use Illuminate\Validation\ValidationException;

class UpdateTierRank
{
    public function __construct(
        private ReferenceDataCache $referenceDataCache,
    ) {}

    /**
     * @param  array{
     *   name?: string,
     *   start_point?: int,
     *   end_point?: int,
     *   status?: bool,
     *   tier_no?: int
     * }  $data
     */
    public function execute(TierRank $tier, array $data): TierRank
    {
        $name = array_key_exists('name', $data) ? trim((string) $data['name']) : (string) $tier->name;
        $start = array_key_exists('start_point', $data) ? (int) $data['start_point'] : (int) $tier->start_point;
        $end = array_key_exists('end_point', $data) ? (int) $data['end_point'] : (int) $tier->end_point;
        $status = array_key_exists('status', $data) ? (bool) $data['status'] : (bool) $tier->status;
        $tierNo = array_key_exists('tier_no', $data) ? (int) $data['tier_no'] : (int) $tier->tier_no;

        if ($name === '') {
            throw ValidationException::withMessages(['name' => ['Tier name is required.']]);
        }

        if ($start > $end) {
            throw ValidationException::withMessages([
                'start_point' => ['Start point must be less than or equal to end point.'],
            ]);
        }

        $overlap = TierRank::query()
            ->where('sport_id', $tier->sport_id)
            ->where('id', '!=', $tier->id)
            ->where('status', true)
            ->when($status, function ($q) use ($start, $end): void {
                $q->where(function ($inner) use ($start, $end): void {
                    $inner->whereBetween('start_point', [$start, $end])
                        ->orWhereBetween('end_point', [$start, $end])
                        ->orWhere(function ($wrap) use ($start, $end): void {
                            $wrap->where('start_point', '<=', $start)
                                ->where('end_point', '>=', $end);
                        });
                });
            })
            ->exists();

        if ($status && $overlap) {
            throw ValidationException::withMessages([
                'start_point' => ['Point range overlaps another active tier for this sport.'],
            ]);
        }

        $duplicateTierNo = TierRank::query()
            ->where('sport_id', $tier->sport_id)
            ->where('tier_no', $tierNo)
            ->where('id', '!=', $tier->id)
            ->exists();

        if ($duplicateTierNo) {
            throw ValidationException::withMessages([
                'tier_no' => ['Tier number already exists for this sport.'],
            ]);
        }

        $tier->update([
            'name' => $name,
            'start_point' => $start,
            'end_point' => $end,
            'status' => $status,
            'tier_no' => $tierNo,
        ]);

        $this->referenceDataCache->forgetTierRanksForSport((int) $tier->sport_id);

        return $tier->fresh(['sport:id,name']) ?? $tier;
    }
}
