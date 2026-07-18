import { getLibraryApi } from '@jellyfin/sdk/lib/utils/api/library-api';
import { useQuery } from '@tanstack/react-query';

import { useApi } from 'hooks/useApi';

export const useItemBoxSets = (itemId?: string) => {
    const { api, user } = useApi();

    return useQuery({
        queryKey: ['User', user?.Id, 'ItemBoxSets', itemId],
        queryFn: async ({ signal }) => {
            if (!api || !user?.Id || !itemId) return [];

            const response = await getLibraryApi(api).getItemCollections({
                itemId,
                userId: user.Id
            }, { signal });

            return (response.data.Items || []) as any[];
        },
        enabled: !!api && !!user?.Id && !!itemId,
        staleTime: 30 * 60 * 1000,
        gcTime: 60 * 60 * 1000
    });
};
