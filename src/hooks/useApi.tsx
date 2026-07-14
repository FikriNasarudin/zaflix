import type { Api } from '@jellyfin/sdk';
import type { UserDto } from '@jellyfin/sdk/lib/generated-client';
import type { ApiClient, Event } from 'jellyfin-apiclient';
import React, { type FC, type PropsWithChildren, createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { ServerConnections } from 'lib/jellyfin-apiclient';
import events from 'utils/events';

export interface JellyfinApiContext {
    __legacyApiClient__?: ApiClient
    api?: Api
    user?: UserDto
}

export const ApiContext = createContext<JellyfinApiContext>({});
export const useApi = () => useContext(ApiContext);

const SESSION_PING_INTERVAL = 5 * 60 * 1000;

export const ApiProvider: FC<PropsWithChildren<unknown>> = ({ children }) => {
    const [ legacyApiClient, setLegacyApiClient ] = useState<ApiClient>();
    const [ api, setApi ] = useState<Api>();
    const [ user, setUser ] = useState<UserDto>();
    const sessionPingRef = useRef<ReturnType<typeof setInterval>>();

    const resetApiUser = useCallback(() => {
        setLegacyApiClient(undefined);
        setUser(undefined);
    }, []);

    const updateApiUser = useCallback((_e: Event | undefined, newUser: UserDto) => {
        setUser(newUser);

        if (newUser?.ServerId) {
            setLegacyApiClient(ServerConnections.getApiClient(newUser.ServerId));
        }
    }, []);

    const context = useMemo(() => ({
        __legacyApiClient__: legacyApiClient,
        api,
        user
    }), [ api, legacyApiClient, user ]);

    useEffect(() => {
        ServerConnections.currentApiClient()
            ?.getCurrentUser()
            .then(newUser => updateApiUser(undefined, newUser))
            .catch(err => {
                console.info('[ApiProvider] Could not get current user', err);
            });

        events.on(ServerConnections, 'localusersignedin', updateApiUser);
        events.on(ServerConnections, 'localusersignedout', resetApiUser);

        const onSessionExpired = () => resetApiUser();
        document.addEventListener('session-expired', onSessionExpired);

        return () => {
            events.off(ServerConnections, 'localusersignedin', updateApiUser);
            events.off(ServerConnections, 'localusersignedout', resetApiUser);
            document.removeEventListener('session-expired', onSessionExpired);
        };
    }, [ updateApiUser, resetApiUser ]);

    useEffect(() => {
        setApi(legacyApiClient ? ServerConnections.getApi(legacyApiClient.serverId()) : undefined);
    }, [ legacyApiClient, setApi ]);

    useEffect(() => {
        if (!legacyApiClient) return;

        sessionPingRef.current = setInterval(async () => {
            try {
                const res = await fetch(
                    `${legacyApiClient.serverAddress()}/System/Ping`,
                    { cache: 'no-cache' }
                );
                if (res.status === 401) {
                    document.dispatchEvent(new CustomEvent('session-expired'));
                }
            } catch {
                // Network error — ignore, will retry next interval
            }
        }, SESSION_PING_INTERVAL);

        return () => {
            if (sessionPingRef.current) {
                clearInterval(sessionPingRef.current);
            }
        };
    }, [ legacyApiClient ]);

    return (
        <ApiContext.Provider value={context}>
            {children}
        </ApiContext.Provider>
    );
};
