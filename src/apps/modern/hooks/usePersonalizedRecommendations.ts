import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { useApi } from 'hooks/useApi';
import type { Api } from '@jellyfin/sdk/lib/api';
import { getMovieApi } from '@jellyfin/sdk/lib/utils/api/movie-api';
import type { RecommendationType } from '@jellyfin/sdk/lib/generated-client/models/recommendation-type';

interface RecommendationGroup {
    title: string;
    items: any[];
}

const RECOMMENDATION_TITLES: Partial<Record<RecommendationType, string>> = {
    SimilarToRecentlyPlayed: 'Because You Watched',
    SimilarToLikedItem: 'More Like Your Favorites',
    HasDirectorFromRecentlyPlayed: 'Directors You Enjoy',
    HasActorFromRecentlyPlayed: 'Actors You Enjoy',
    HasLikedDirector: 'Directors You Enjoy',
    HasLikedActor: 'Actors You Enjoy'
};

async function fetchRecommendations(api: Api, userId: string): Promise<RecommendationGroup[]> {
    const groups: RecommendationGroup[] = [];

    try {
        const resp = await getMovieApi(api).getMovieRecommendations({
            userId
        });

        const data = resp.data;

        if (Array.isArray(data)) {
            for (const rec of data) {
                const items = rec.Items;
                const recType = rec.RecommendationType as RecommendationType | undefined;
                if (items?.length && recType) {
                    const base = RECOMMENDATION_TITLES[recType] || 'For You';
                    const title = rec.BaselineItemName
                        ? `${base} ${rec.BaselineItemName}`
                        : base;
                    groups.push({
                        title,
                        items: items.slice(0, 15)
                    });
                }
            }
        }
    } catch {
        // Recommendations endpoint may not be available on all servers
    }

    return groups;
}

export const usePersonalizedRecommendations = () => {
    const { api, user } = useApi();

    return useQuery({
        queryKey: ['PersonalizedRecommendations', user?.Id],
        queryFn: ({ signal }) => {
            if (!api || !user?.Id) return [];
            return fetchRecommendations(api, user.Id);
        },
        enabled: !!api && !!user?.Id,
        staleTime: 15 * 60 * 1000,
        gcTime: 60 * 60 * 1000
    });
};

export function useTopUserGenres() {
    const { __legacyApiClient__: apiClient, user } = useApi();

    const { data: resumeItems = [] } = useQuery({
        queryKey: ['User', user?.Id, 'TopGenreSource'],
        queryFn: async () => {
            if (!apiClient || !user?.Id) return [];
            const result = await apiClient.getItems(user.Id, {
                SortBy: 'DatePlayed',
                SortOrder: 'Descending',
                Limit: 50,
                Recursive: true,
                IncludeItemTypes: 'Movie,Series',
                Fields: 'Genres,UserData'
            });
            return (result?.Items || []) as any[];
        },
        enabled: !!apiClient && !!user?.Id,
        staleTime: 10 * 60 * 1000,
        gcTime: 30 * 60 * 1000
    });

    const topGenres = useMemo(() => {
        const genreCount = new Map<string, number>();
        for (const item of resumeItems) {
            const genres: string[] = item.Genres || [];
            for (const g of genres) {
                genreCount.set(g, (genreCount.get(g) || 0) + 1);
            }
        }
        return Array.from(genreCount.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 4)
            .map(([genre]) => genre);
    }, [resumeItems]);

    return topGenres;
}
