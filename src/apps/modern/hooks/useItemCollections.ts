import { ItemFields } from '@jellyfin/sdk/lib/generated-client';
import { getLibraryApi } from '@jellyfin/sdk/lib/utils/api/library-api';
import { useQuery } from '@tanstack/react-query';

import { useApi } from 'hooks/useApi';

export const useItemCollections = (itemId?: string) => {
    const { api, user } = useApi();

    return useQuery({
        queryKey: ['User', user?.Id, 'Items', itemId, 'ParentCollections'],
        queryFn: async () => {
            if (!api || !user?.Id || !itemId) return [];

            const response = await getLibraryApi(api).getItemCollections({
                itemId,
                userId: user.Id,
                fields: [ItemFields.PrimaryImageAspectRatio]
            });

            return (response.data?.Items || []) as any[];
        },
        enabled: !!api && !!user?.Id && !!itemId,
        staleTime: 30 * 60 * 1000,
        gcTime: 60 * 60 * 1000
    });
};
