import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { useApi } from 'hooks/useApi';

function shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

export const useBillboardItems = (filterType: 'all' | 'Movie' | 'Series' = 'all') => {
    const { __legacyApiClient__: apiClient, user } = useApi();

    const { data: rawItems = [], ...rest } = useQuery({
        queryKey: ['User', user?.Id, 'Billboard', filterType],
        queryFn: async () => {
            if (!apiClient || !user?.Id) return [];

            const result = await apiClient.getItems(user.Id, {
                SortBy: 'DateCreated',
                SortOrder: 'Descending',
                Limit: 30,
                IncludeItemTypes: filterType === 'all' ? 'Movie,Series' : filterType,
                Recursive: true,
                Fields: 'Overview,CommunityRating,ProductionYear,RunTimeTicks,UserData,Genres'
            });

            if (result?.Items) {
                return result.Items.filter(
                    (i: any) => i.Overview && i.BackdropImageTags && i.BackdropImageTags.length > 0
                ) as any[];
            }
            return [];
        },
        enabled: !!apiClient && !!user?.Id,
        staleTime: 5 * 60 * 1000,
        gcTime: 30 * 60 * 1000
    });

    // Quality filter: prefer items with ratings, then shuffle for variety
    const items = useMemo(() => {
        if (!rawItems.length) return [];

        const withRating = rawItems.filter((i: any) => i.CommunityRating && i.CommunityRating > 0);
        const withoutRating = rawItems.filter((i: any) => !i.CommunityRating || i.CommunityRating === 0);

        // Sort rated items by quality (rating desc, then year desc for tiebreak)
        withRating.sort((a: any, b: any) => {
            if (b.CommunityRating !== a.CommunityRating) return b.CommunityRating - a.CommunityRating;
            return (b.ProductionYear || 0) - (a.ProductionYear || 0);
        });

        // Combine: top quality picks first, then remaining, then shuffle the lower half for variety
        const topPicks = withRating.slice(0, 10);
        const remaining = [...withRating.slice(10), ...withoutRating];
        const shuffledRemaining = shuffleArray(remaining);

        return [...topPicks, ...shuffledRemaining].slice(0, 20);
    }, [rawItems]);

    return { data: items, ...rest };
};
