import { CollectionType } from '@jellyfin/sdk/lib/generated-client/models/collection-type';
import React, { type FC, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import LibraryPage from 'apps/modern/features/libraries/components/LibraryPage';
import Loading from 'components/loading/LoadingComponent';
import { useUserViews } from 'hooks/api/useUserViews';

const Shows: FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const topParentId = searchParams.get('topParentId');
    const { data: userViews } = useUserViews();

    useEffect(() => {
        if (!topParentId && userViews?.Items) {
            const showLib = userViews.Items.find(
                (i: any) => i.CollectionType === 'tvshows'
            );
            if (showLib?.Id) {
                navigate(
                    `/tv?topParentId=${showLib.Id}&collectionType=tvshows`,
                    { replace: true }
                );
            }
        }
    }, [topParentId, userViews, navigate]);

    if (!topParentId) return <Loading />;

    return <LibraryPage type={CollectionType.Tvshows} />;
};

export default Shows;
