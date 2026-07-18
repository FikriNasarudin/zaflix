import { getSearchApi } from '@jellyfin/sdk/lib/utils/api/search-api';
import { useQuery } from '@tanstack/react-query';

import { useApi } from 'hooks/useApi';

import type { SearchHint } from '@jellyfin/sdk/lib/generated-client/models/search-hint';

export const useSearch = (searchTerm: string, parentId?: string, limit = 50) => {
    const { api, user } = useApi();
    const userId = user?.Id;

    return useQuery({
        queryKey: ['Search', 'Hints', parentId, searchTerm],
        queryFn: async ({ signal }) => {
            const response = await getSearchApi(api!).getSearchHints(
                {
                    searchTerm,
                    userId,
                    limit,
                    includePeople: true,
                    includeMedia: true,
                    includeGenres: false,
                    includeStudios: false,
                    includeArtists: false,
                    parentId
                },
                { signal }
            );
            return (response.data.SearchHints?.filter(h => h.Id && h.Type) ?? []) as SearchHint[];
        },
        enabled: !!api && !!userId && searchTerm.trim().length >= 2,
        staleTime: 2 * 60 * 1000,
        gcTime: 10 * 60 * 1000
    });
};
