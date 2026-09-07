<?php

namespace App\Actions;

use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class ListAdminMembers
{
    /**
     * @return LengthAwarePaginator<int, User>
     */
    public function execute(int $perPage = 20, string $search = ''): LengthAwarePaginator
    {
        $perPage = max(1, min($perPage, 50));
        $search = trim($search);

        $query = User::query()
            ->orderByDesc('created_at')
            ->orderByDesc('id');

        if ($search !== '') {
            $query->where(function ($sub) use ($search): void {
                $sub->where('name', 'like', '%'.$search.'%')
                    ->orWhere('email', 'like', '%'.$search.'%');
            });
        }

        return $query->paginate($perPage)->withQueryString();
    }
}
