import React, { useState, useEffect, useRef } from 'react';
import Hls from 'hls.js';
import { 
  Play, 
  Info, 
  ChevronLeft, 
  ChevronRight, 
  X, 
  Volume2, 
  VolumeX, 
  Maximize, 
  Minimize, 
  RotateCcw, 
  RotateCw, 
  Subtitles, 
  SkipForward, 
  Settings, 
  Tv, 
  Film, 
  Grid,
  Plus,
  Check,
  Sparkles,
  Home,
  Heart
} from 'lucide-react';

// Client-side GET requests Cache
const apiCache = {
  data: {},
  get(url) {
    const entry = this.data[url];
    if (entry && Date.now() - entry.timestamp < 120000) { // 2 minutes TTL
      return entry.data;
    }
    return null;
  },
  set(url, data) {
    this.data[url] = {
      data,
      timestamp: Date.now()
    };
  },
  clear() {
    this.data = {};
  }
};

const fetchWithCache = async (url, options = {}) => {
  const method = options.method || 'GET';
  if (method.toUpperCase() !== 'GET') {
    // Modify requests clear cache, EXCEPT playback progress reports which happen frequently
    if (typeof url === 'string' && !url.includes('/PlayingItems')) {
      apiCache.clear();
    }
    return window.fetch(url, options);
  }

  const cached = apiCache.get(url);
  if (cached) {
    return {
      ok: true,
      status: 200,
      json: async () => JSON.parse(JSON.stringify(cached)),
      text: async () => JSON.stringify(cached)
    };
  }

  const res = await window.fetch(url, options);
  if (res.ok) {
    try {
      const cloned = res.clone();
      const data = await cloned.json();
      apiCache.set(url, data);
    } catch (e) {
      // Ignore JSON parse errors for non-JSON responses
    }
  }
  return res;
};

// Override standard fetch with our cached version for this file
const fetch = fetchWithCache;

// Unique device ID for Jellyfin X-Emby-Authorization
const getDeviceId = () => {
  let id = localStorage.getItem('zaflix_device_id');
  if (!id) {
    id = 'zaflix-' + Math.random().toString(36).substring(2, 15);
    localStorage.setItem('zaflix_device_id', id);
  }
  return id;
};
const deviceId = getDeviceId();

export default function App() {
  // Connection config states
  const [serverUrl, setServerUrl] = useState(localStorage.getItem('zaflix_server') || '');
  const [userId, setUserId] = useState(localStorage.getItem('zaflix_userid') || '');
  const [token, setToken] = useState(localStorage.getItem('zaflix_token') || '');
  const [isConnected, setIsConnected] = useState(!!(serverUrl && userId && token));
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleRefresh = () => {
    apiCache.clear();
    setRefreshTrigger(prev => prev + 1);
  };
  
  // Auth form states
  const [formServerUrl, setFormServerUrl] = useState(serverUrl || '');
  const [formUserId, setFormUserId] = useState(userId || '');
  const [formToken, setFormToken] = useState(token || '');
  const [formUsername, setFormUsername] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [authMethod, setAuthMethod] = useState('login'); // 'token' or 'login'
  const [errorMsg, setErrorMsg] = useState('');

  // Media dashboard states
  const [filterType, setFilterType] = useState('All'); // 'All', 'Movie', 'Series', 'MyList', 'BoxSet', 'Anime', 'Network'
  const [selectedNetwork, setSelectedNetwork] = useState(null);
  const [networkOrigin, setNetworkOrigin] = useState('All');
  const [availableNetworks, setAvailableNetworks] = useState([]);
  
  const networks = [
    { name: 'Netflix', className: 'network-netflix' },
    { name: 'Disney+', className: 'network-disney', studioName: 'Disney' },
    { name: 'Hulu', className: 'network-hulu' },
    { name: 'HBO', className: 'network-hbo', studioName: 'HBO' },
    { name: 'Fox', className: 'network-fox', studioName: 'Fox' },
    { name: 'Prime Video', className: 'network-prime', studioName: 'Amazon' },
    { name: 'Apple TV+', className: 'network-apple', studioName: 'Apple' },
    { name: 'Animax', className: 'network-animax' },
    { name: 'Crunchyroll', className: 'network-crunchyroll' },
    { name: 'Paramount+', className: 'network-paramount', studioName: 'Paramount' }
  ];

  const handleNetworkClick = (network, origin = 'All') => {
    const netName = typeof network === 'string' ? network : (network.name || '');
    setSelectedNetwork(netName);
    setNetworkOrigin(origin);
    setFilterType('Network');
  };

  const [animeLibraryId, setAnimeLibraryId] = useState(null);
  const [topAnime, setTopAnime] = useState([]);
  const [billboardItem, setBillboardItem] = useState(null);
  const [topMovies, setTopMovies] = useState([]);
  const [topShows, setTopShows] = useState([]);
  const [recentlyAddedMovies, setRecentlyAddedMovies] = useState([]);
  const [recentlyAddedShows, setRecentlyAddedShows] = useState([]);
  const [continueWatching, setContinueWatching] = useState([]);
  const [movieTopPicks, setMovieTopPicks] = useState([]);
  const [userTopGenres, setUserTopGenres] = useState([]);
  const [genreMoviesMap, setGenreMoviesMap] = useState({});
  const [selectedGenreView, setSelectedGenreView] = useState(null);
  const [allMoviesLatest, setAllMoviesLatest] = useState([]);
  
  // TV Shows custom sections states
  const [showTopPicks, setShowTopPicks] = useState([]);
  const [userTopGenresSeries, setUserTopGenresSeries] = useState([]);
  const [genreShowsMap, setGenreShowsMap] = useState({});
  const [selectedGenreViewSeries, setSelectedGenreViewSeries] = useState(null);

  const [myList, setMyList] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [similarItems, setSimilarItems] = useState([]);
  const [collections, setCollections] = useState([]);
  const [collectionItems, setCollectionItems] = useState([]);
  const [collectionMap, setCollectionMap] = useState({});
  const [itemCollections, setItemCollections] = useState([]);
  const [itemCollectionContents, setItemCollectionContents] = useState([]);
  const [filteredGridItems, setFilteredGridItems] = useState([]);






  // Billboard Slideshow states
  const [billboardItems, setBillboardItems] = useState([]);
  const [billboardIndex, setBillboardIndex] = useState(0);
  const [playClip, setPlayClip] = useState(false);
  const [billboardVideoMap, setBillboardVideoMap] = useState({});
  const [isClipMuted, setIsClipMuted] = useState(true);

  // Modal detail states
  const [selectedShow, setSelectedShow] = useState(null);
  const [seasons, setSeasons] = useState([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState('');
  const [episodes, setEpisodes] = useState([]);

  // Player overlay states
  const [activePlayback, setActivePlayback] = useState(null); // { id, title, subtitle, isEpisode, episodesList, currentEpisodeIndex }
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showTracksPopup, setShowTracksPopup] = useState(false);
  const [showSettingsPopup, setShowSettingsPopup] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [videoQuality, setVideoQuality] = useState('direct');
  const [selectedAudioIndex, setSelectedAudioIndex] = useState(null);
  const [defaultAudioIndex, setDefaultAudioIndex] = useState(null);
  const [audioStreams, setAudioStreams] = useState([]);
  const [subtitleStreams, setSubtitleStreams] = useState([]);
  const [selectedSubtitleIndex, setSelectedSubtitleIndex] = useState(null);
  const [mediaSourceId, setMediaSourceId] = useState('');
  const [introMarker, setIntroMarker] = useState(null); // { start, end }
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [aspectRatio, setAspectRatio] = useState('contain');

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Video player references
  const videoRef = useRef(null);
  const playerContainerRef = useRef(null);
  const controlsTimeoutRef = useRef(null);
  const seekTargetTimeRef = useRef(0);
  const durationRef = useRef(0);
  const lastPlayheadTimeRef = useRef(0);
  const [hoverTime, setHoverTime] = useState(null);
  const [hoverX, setHoverX] = useState(0);
  const [hoverImageSrc, setHoverImageSrc] = useState('');

  // Card hover preview states & logic
  const [hoveredItemId, setHoveredItemId] = useState(null);
  const [previewActiveId, setPreviewActiveId] = useState(null);
  const [previewEpisodeId, setPreviewEpisodeId] = useState(null);
  const hoverTimeoutRef = useRef(null);

  const handleCardMouseEnter = (e, item) => {
    if (e && e.currentTarget) {
      const card = e.currentTarget;
      const container = card.parentElement;
      if (container) {
        const cardRect = card.getBoundingClientRect();
        const isNearLeft = cardRect.left < 120;
        const isNearRight = (window.innerWidth - cardRect.right) < 120;

        if (isNearLeft) {
          card.style.transformOrigin = 'left center';
        } else if (isNearRight) {
          card.style.transformOrigin = 'right center';
        } else {
          card.style.transformOrigin = 'center center';
        }
      }
    }

    setHoveredItemId(item.Id);
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);

    hoverTimeoutRef.current = setTimeout(async () => {
      if (item.Type === 'Series') {
        try {
          const res = await fetch(`${serverUrl}/Shows/${item.Id}/Episodes?limit=1&userId=${userId}`, {
            headers: getHeaders()
          });
          if (res.ok) {
            const data = await res.json();
            if (data.Items && data.Items.length > 0) {
              setPreviewEpisodeId(data.Items[0].Id);
              setPreviewActiveId(item.Id);
            }
          }
        } catch (err) {
          console.error('Failed to fetch preview episode', err);
        }
      } else if (item.Type === 'Movie' || item.Type === 'Episode') {
        setPreviewActiveId(item.Id);
      }
    }, 800); // 800ms hover delay
  };

  const handleCardMouseLeave = (e) => {
    if (e && e.currentTarget) {
      e.currentTarget.style.transformOrigin = '';
    }
    setHoveredItemId(null);
    setPreviewActiveId(null);
    setPreviewEpisodeId(null);
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
  };

  const getPreviewStreamUrl = (item) => {
    const videoId = item.Type === 'Series' ? previewEpisodeId : item.Id;
    if (!videoId) return '';
    return `${serverUrl}/Videos/${videoId}/stream?static=false&VideoCodec=h264&AudioCodec=aac&Container=mp4&maxWidth=640&maxHeight=360&VideoBitrate=600000&api_key=${token}`;
  };

  // Helper: Request Headers
  const getHeaders = () => {
    return {
      'Content-Type': 'application/json',
      'X-Emby-Authorization': `MediaBrowser Client="MyAntigravityPlayer", Device="WebBrowser", DeviceId="${deviceId}", Version="1.0.0", Token="${token}"`
    };
  };

  const fetchItemDetailsForRoute = async (itemId, mode) => {
    try {
      const res = await fetch(`${serverUrl}/Items/${itemId}?userId=${userId}&Fields=Overview,CommunityRating,ProductionYear,RunTimeTicks,UserData,Genres`, {
        headers: getHeaders()
      });
      if (res.ok) {
        const item = await res.json();
        if (mode === 'watch') {
          setActivePlayback(item);
        } else {
          setSelectedShow(item);
          if (item.Type === 'Series') {
            fetch(`${serverUrl}/Shows/${item.Id}/Seasons?userId=${userId}`, { headers: getHeaders() })
              .then(r => r.ok ? r.json() : { Items: [] })
              .then(data => {
                setSeasons(data.Items || []);
                if (data.Items && data.Items.length > 0) {
                  setSelectedSeasonId(data.Items[0].Id);
                }
              });
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch item for route', err);
    }
  };

  const syncHashToState = () => {
    const hash = window.location.hash || '#/home';
    
    if (hash.startsWith('#/watch/')) {
      const itemId = hash.substring('#/watch/'.length);
      if (!activePlayback || activePlayback.Id !== itemId) {
        fetchItemDetailsForRoute(itemId, 'watch');
      }
      return;
    }
    
    if (hash.startsWith('#/details/')) {
      const itemId = hash.substring('#/details/'.length);
      if (!selectedShow || selectedShow.Id !== itemId) {
        fetchItemDetailsForRoute(itemId, 'details');
      }
      return;
    }

    setSelectedShow(null);
    setActivePlayback(null);
    
    if (hash === '#/home' || hash === '#/') {
      setFilterType('All');
      setSelectedGenreView(null);
      setSelectedGenreViewSeries(null);
      setSelectedNetwork(null);
    } else if (hash === '#/movies') {
      setFilterType('Movie');
      setSelectedGenreView(null);
      setSelectedGenreViewSeries(null);
      setSelectedNetwork(null);
    } else if (hash.startsWith('#/movies/genre/')) {
      const genre = decodeURIComponent(hash.substring('#/movies/genre/'.length));
      setFilterType('Movie');
      handleSeeAllGenre(genre);
      setSelectedGenreViewSeries(null);
      setSelectedNetwork(null);
    } else if (hash === '#/shows') {
      setFilterType('Series');
      setSelectedGenreView(null);
      setSelectedGenreViewSeries(null);
      setSelectedNetwork(null);
    } else if (hash.startsWith('#/shows/genre/')) {
      const genre = decodeURIComponent(hash.substring('#/shows/genre/'.length));
      setFilterType('Series');
      setSelectedGenreView(null);
      handleSeeAllGenreSeries(genre);
      setSelectedNetwork(null);
    } else if (hash === '#/anime') {
      setFilterType('Anime');
      setSelectedGenreView(null);
      setSelectedGenreViewSeries(null);
      setSelectedNetwork(null);
    } else if (hash === '#/mylist') {
      setFilterType('MyList');
      setSelectedGenreView(null);
      setSelectedGenreViewSeries(null);
      setSelectedNetwork(null);
    } else if (hash === '#/collections') {
      setFilterType('BoxSet');
      setSelectedGenreView(null);
      setSelectedGenreViewSeries(null);
      setSelectedNetwork(null);
    } else if (hash.startsWith('#/network/')) {
      const networkQuery = decodeURIComponent(hash.substring('#/network/'.length));
      const parts = networkQuery.split('?origin=');
      const netName = parts[0];
      const origin = parts[1] || 'All';
      setSelectedNetwork(netName);
      setNetworkOrigin(origin);
      setFilterType('Network');
    }
  };

  useEffect(() => {
    if (isConnected) {
      syncHashToState();
      window.addEventListener('hashchange', syncHashToState);
      return () => window.removeEventListener('hashchange', syncHashToState);
    }
  }, [isConnected, serverUrl, userId, token]);

  useEffect(() => {
    if (!isConnected) return;
    
    let newHash = '#/home';
    if (activePlayback) {
      newHash = `#/watch/${activePlayback.Id}`;
    } else if (selectedShow) {
      newHash = `#/details/${selectedShow.Id}`;
    } else if (filterType === 'Network' && selectedNetwork) {
      newHash = `#/network/${encodeURIComponent(selectedNetwork)}?origin=${networkOrigin}`;
    } else if (filterType === 'Movie') {
      if (selectedGenreView) {
        newHash = `#/movies/genre/${encodeURIComponent(selectedGenreView.name)}`;
      } else {
        newHash = '#/movies';
      }
    } else if (filterType === 'Series') {
      if (selectedGenreViewSeries) {
        newHash = `#/shows/genre/${encodeURIComponent(selectedGenreViewSeries.name)}`;
      } else {
        newHash = '#/shows';
      }
    } else if (filterType === 'Anime') {
      newHash = '#/anime';
    } else if (filterType === 'MyList') {
      newHash = '#/mylist';
    } else if (filterType === 'BoxSet') {
      newHash = '#/collections';
    }
    
    if (window.location.hash !== newHash) {
      window.location.hash = newHash;
    }
  }, [filterType, selectedGenreView, selectedGenreViewSeries, selectedNetwork, networkOrigin, activePlayback, selectedShow, isConnected]);

  // Helper: Handle Image URL
  const getImageUrl = (itemId, type = 'Primary', tag = '', positionTicks = null) => {
    if (!itemId) return '';
    let url = `${serverUrl}/Items/${itemId}/Images/${type}?quality=90`;
    if (positionTicks) {
      url += `&positionTicks=${positionTicks}`;
    }
    return url;
  };


  // Log out / Reset connection settings
  const handleLogout = () => {
    localStorage.removeItem('zaflix_server');
    localStorage.removeItem('zaflix_userid');
    localStorage.removeItem('zaflix_token');
    setServerUrl('');
    setUserId('');
    setToken('');
    setIsConnected(false);
    setErrorMsg('');
  };

  // Handle Connection / Authentication
  const handleConnect = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    let cleanUrl = formServerUrl.trim().replace(/\/$/, '');
    
    if (authMethod === 'token') {
      if (!cleanUrl || !formUserId.trim() || !formToken.trim()) {
        setErrorMsg('Please fill in all fields.');
        return;
      }
      // Verify connection
      try {
        const res = await fetch(`${cleanUrl}/Users/${formUserId}`, {
          headers: {
            'X-Emby-Authorization': `MediaBrowser Client="MyAntigravityPlayer", Device="WebBrowser", DeviceId="${deviceId}", Version="1.0.0", Token="${formToken}"`
          }
        });
        if (!res.ok) throw new Error('Failed to fetch user. Check Server URL / Token.');
        
        // Save
        localStorage.setItem('zaflix_server', cleanUrl);
        localStorage.setItem('zaflix_userid', formUserId.trim());
        localStorage.setItem('zaflix_token', formToken.trim());
        setServerUrl(cleanUrl);
        setUserId(formUserId.trim());
        setToken(formToken.trim());
        setIsConnected(true);
      } catch (err) {
        setErrorMsg(err.message || 'Connection failed.');
      }
    } else {
      // AuthenticateByName
      if (!cleanUrl || !formUsername.trim() || !formPassword.trim()) {
        setErrorMsg('Please fill in all credentials.');
        return;
      }
      try {
        const res = await fetch(`${cleanUrl}/Users/AuthenticateByName`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Emby-Authorization': `MediaBrowser Client="MyAntigravityPlayer", Device="WebBrowser", DeviceId="${deviceId}", Version="1.0.0"`
          },
          body: JSON.stringify({
            Username: formUsername.trim(),
            Pw: formPassword
          })
        });
        if (!res.ok) throw new Error('Invalid Username or Password.');
        const data = await res.json();
        
        // Save
        localStorage.setItem('zaflix_server', cleanUrl);
        localStorage.setItem('zaflix_userid', data.User.Id);
        localStorage.setItem('zaflix_token', data.AccessToken);
        setServerUrl(cleanUrl);
        setUserId(data.User.Id);
        setToken(data.AccessToken);
        setIsConnected(true);
      } catch (err) {
        setErrorMsg(err.message || 'Login failed.');
      }
    }
  };

  const fetchTopMovies = async () => {
    try {
      const res = await fetch(`${serverUrl}/Items?SortBy=CommunityRating,ProductionYear&SortOrder=Descending&IncludeItemTypes=Movie&Filters=IsNotFolder&Recursive=true&Limit=10&Fields=Overview,CommunityRating,ProductionYear,RunTimeTicks,UserData`, {
        headers: getHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setTopMovies(data.Items || []);
        // Set random item as Billboard hero if not set
        if (data.Items && data.Items.length > 0 && !billboardItem) {
          setBillboardItem(data.Items[Math.floor(Math.random() * Math.min(5, data.Items.length))]);
        }
      }
    } catch (err) {
      console.error('Failed to fetch Top Movies', err);
    }
  };

  const fetchTopShows = async () => {
    try {
      const res = await fetch(`${serverUrl}/Items?SortBy=CommunityRating,ProductionYear&SortOrder=Descending&IncludeItemTypes=Series&Recursive=true&Limit=10&Fields=Overview,CommunityRating,ProductionYear,RunTimeTicks,UserData`, {
        headers: getHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setTopShows(data.Items || []);
      }
    } catch (err) {
      console.error('Failed to fetch Top Shows', err);
    }
  };

  const fetchTopAnime = async (currentAnimeLibId = animeLibraryId) => {
    try {
      const promises = [];
      promises.push(
        fetch(`${serverUrl}/Items?SortBy=CommunityRating,ProductionYear&SortOrder=Descending&Genres=Anime&Recursive=true&Limit=30&Fields=Overview,CommunityRating,ProductionYear,RunTimeTicks,UserData`, {
          headers: getHeaders()
        }).then(r => r.ok ? r.json() : { Items: [] })
      );

      if (currentAnimeLibId) {
        promises.push(
          fetch(`${serverUrl}/Items?SortBy=CommunityRating,ProductionYear&SortOrder=Descending&ParentId=${currentAnimeLibId}&Recursive=true&Limit=30&Fields=Overview,CommunityRating,ProductionYear,RunTimeTicks,UserData`, {
            headers: getHeaders()
          }).then(r => r.ok ? r.json() : { Items: [] })
        );
      }

      const results = await Promise.all(promises);
      const combinedItems = [];
      const seenIds = new Set();

      results.forEach(res => {
        if (res && res.Items) {
          res.Items.forEach(item => {
            if (!seenIds.has(item.Id)) {
              seenIds.add(item.Id);
              combinedItems.push(item);
            }
          });
        }
      });

      combinedItems.sort((a, b) => {
        const ratingA = a.CommunityRating || 0;
        const ratingB = b.CommunityRating || 0;
        if (ratingB !== ratingA) return ratingB - ratingA;
        const yearA = a.ProductionYear || 0;
        const yearB = b.ProductionYear || 0;
        return yearB - yearA;
      });

      setTopAnime(combinedItems.slice(0, 10));
    } catch (err) {
      console.error('Failed to fetch Top Anime', err);
    }
  };

  const fetchContinueWatching = async () => {
    try {
      const res = await fetch(`${serverUrl}/Users/${userId}/Items/Resume?Limit=12&Recursive=true&Fields=Overview,CommunityRating,ProductionYear,RunTimeTicks,UserData`, {
        headers: getHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setContinueWatching(data.Items || []);
      }
    } catch (err) {
      console.error('Failed to fetch Continue Watching', err);
    }
  };

  const fetchMyList = async () => {
    try {
      const res = await fetch(`${serverUrl}/Users/${userId}/Items?Filters=IsFavorite&Recursive=true&Fields=Overview,CommunityRating,ProductionYear,RunTimeTicks,UserData`, {
        headers: getHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setMyList(data.Items || []);
      }
    } catch (err) {
      console.error('Failed to fetch My List', err);
    }
  };

  const fetchSuggestions = async () => {
    try {
      const res = await fetch(`${serverUrl}/Users/${userId}/Suggestions?Limit=20&Fields=Overview,CommunityRating,ProductionYear,RunTimeTicks,UserData,SeriesId,SeriesName`, {
        headers: getHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        const processed = [];
        const seenSeriesIds = new Set();
        
        for (const item of data.Items || []) {
          if (item.Type === 'Movie') {
            processed.push(item);
          } else if (item.Type === 'Series') {
            if (!seenSeriesIds.has(item.Id)) {
              seenSeriesIds.add(item.Id);
              processed.push(item);
            }
          } else if (item.Type === 'Episode' && item.SeriesId) {
            if (!seenSeriesIds.has(item.SeriesId)) {
              seenSeriesIds.add(item.SeriesId);
              processed.push({
                Id: item.SeriesId,
                Name: item.SeriesName || item.Name,
                Type: 'Series',
                ProductionYear: item.ProductionYear,
                CommunityRating: item.CommunityRating,
                Overview: item.Overview,
                UserData: item.UserData
              });
            }
          }
        }
        setSuggestions(processed.slice(0, 12));
      }
    } catch (err) {
      console.error('Failed to fetch Suggestions', err);
    }
  };

  const fetchMovieTopPicks = async () => {
    try {
      const res = await fetch(`${serverUrl}/Users/${userId}/Suggestions?Limit=40&IncludeItemTypes=Movie&Fields=Overview,CommunityRating,ProductionYear,RunTimeTicks,UserData`, {
        headers: getHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        const movies = (data.Items || []).filter(item => item.Type === 'Movie').slice(0, 10);
        setMovieTopPicks(movies);
      }
    } catch (err) {
      console.error('Failed to fetch Movie Top Picks', err);
    }
  };

  const fetchTopGenreMovies = async () => {
    try {
      const [resCw, resFav, resRecent] = await Promise.all([
        fetch(`${serverUrl}/Users/${userId}/Items/Resume?Limit=20&Recursive=true&IncludeItemTypes=Movie&Fields=Genres`, { headers: getHeaders() }).then(r => r.ok ? r.json() : { Items: [] }),
        fetch(`${serverUrl}/Users/${userId}/Items?Filters=IsFavorite&Recursive=true&IncludeItemTypes=Movie&Fields=Genres`, { headers: getHeaders() }).then(r => r.ok ? r.json() : { Items: [] }),
        fetch(`${serverUrl}/Users/${userId}/Items?SortBy=DateCreated&SortOrder=Descending&Limit=30&IncludeItemTypes=Movie&Recursive=true&Fields=Genres`, { headers: getHeaders() }).then(r => r.ok ? r.json() : { Items: [] })
      ]);

      const items = [...(resCw.Items || []), ...(resFav.Items || []), ...(resRecent.Items || [])];
      const genreCounts = {};
      items.forEach(item => {
        if (item.Genres) {
          item.Genres.forEach(genre => {
            genreCounts[genre] = (genreCounts[genre] || 0) + 1;
          });
        }
      });

      const sortedGenres = Object.entries(genreCounts)
        .sort((a, b) => b[1] - a[1])
        .map(entry => entry[0]);

      // Get top 3 genres, padding with defaults if needed
      const defaults = ['Action', 'Comedy', 'Drama'];
      const top3 = [];
      for (const g of sortedGenres) {
        if (top3.length < 3 && !top3.includes(g)) {
          top3.push(g);
        }
      }
      for (const d of defaults) {
        if (top3.length < 3 && !top3.includes(d)) {
          top3.push(d);
        }
      }

      setUserTopGenres(top3);

      const map = {};
      await Promise.all(top3.map(async (genre) => {
        try {
          const resGenre = await fetch(`${serverUrl}/Users/${userId}/Items?IncludeItemTypes=Movie&Recursive=true&Genres=${encodeURIComponent(genre)}&Limit=20&Fields=Overview,CommunityRating,ProductionYear,RunTimeTicks,UserData`, {
            headers: getHeaders()
          });
          if (resGenre.ok) {
            const data = await resGenre.json();
            map[genre] = data.Items || [];
          }
        } catch (e) {
          console.error('Failed to fetch movies for genre', genre, e);
        }
      }));
      setGenreMoviesMap(map);
    } catch (err) {
      console.error('Failed to fetch Top Genre Movies', err);
    }
  };

  const fetchAllMoviesLatest = async () => {
    try {
      const res = await fetch(`${serverUrl}/Items?userId=${userId}&IncludeItemTypes=Movie&Recursive=true&SortBy=ProductionYear,PremiereDate,SortName&SortOrder=Descending&Limit=30&Fields=Overview,CommunityRating,ProductionYear,RunTimeTicks,UserData`, {
        headers: getHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setAllMoviesLatest(data.Items || []);
      }
    } catch (err) {
      console.error('Failed to fetch Latest Movies', err);
    }
  };

  const handleSeeAllGenre = async (genreName) => {
    setSelectedGenreView({ name: genreName, items: [], loading: true });
    try {
      let items = [];
      if (genreName === 'All Movies') {
        const res = await fetch(`${serverUrl}/Items?userId=${userId}&IncludeItemTypes=Movie&Recursive=true&SortBy=ProductionYear,PremiereDate,SortName&SortOrder=Descending&Limit=100&Fields=Overview,CommunityRating,ProductionYear,RunTimeTicks,UserData`, {
          headers: getHeaders()
        });
        if (res.ok) {
          const data = await res.json();
          items = data.Items || [];
        }
      } else {
        const res = await fetch(`${serverUrl}/Items?userId=${userId}&IncludeItemTypes=Movie&Recursive=true&Genres=${encodeURIComponent(genreName)}&SortBy=SortName&SortOrder=Ascending&Limit=100&Fields=Overview,CommunityRating,ProductionYear,RunTimeTicks,UserData`, {
          headers: getHeaders()
        });
        if (res.ok) {
          const data = await res.json();
          items = data.Items || [];
        }
      }
      setSelectedGenreView({ name: genreName, items, loading: false });
    } catch (err) {
      console.error('Failed to fetch see all movies', err);
      setSelectedGenreView({ name: genreName, items: [], loading: false, error: true });
    }
  };

  const fetchShowTopPicks = async () => {
    try {
      const res = await fetch(`${serverUrl}/Users/${userId}/Suggestions?Limit=40&IncludeItemTypes=Series&Fields=Overview,CommunityRating,ProductionYear,RunTimeTicks,UserData`, {
        headers: getHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        const shows = (data.Items || []).filter(item => item.Type === 'Series').slice(0, 10);
        setShowTopPicks(shows);
      }
    } catch (err) {
      console.error('Failed to fetch TV Show Top Picks', err);
    }
  };

  const fetchTopGenreShows = async () => {
    try {
      const [resCw, resFav, resRecent] = await Promise.all([
        fetch(`${serverUrl}/Users/${userId}/Items/Resume?Limit=20&Recursive=true&IncludeItemTypes=Series,Episode&Fields=Genres`, { headers: getHeaders() }).then(r => r.ok ? r.json() : { Items: [] }),
        fetch(`${serverUrl}/Users/${userId}/Items?Filters=IsFavorite&Recursive=true&IncludeItemTypes=Series&Fields=Genres`, { headers: getHeaders() }).then(r => r.ok ? r.json() : { Items: [] }),
        fetch(`${serverUrl}/Users/${userId}/Items?SortBy=DateCreated&SortOrder=Descending&Limit=30&IncludeItemTypes=Series&Recursive=true&Fields=Genres`, { headers: getHeaders() }).then(r => r.ok ? r.json() : { Items: [] })
      ]);

      const items = [...(resCw.Items || []), ...(resFav.Items || []), ...(resRecent.Items || [])];
      const genreCounts = {};
      items.forEach(item => {
        if (item.Genres) {
          item.Genres.forEach(genre => {
            genreCounts[genre] = (genreCounts[genre] || 0) + 1;
          });
        }
      });

      const sortedGenres = Object.entries(genreCounts)
        .sort((a, b) => b[1] - a[1])
        .map(entry => entry[0]);

      const defaults = ['Action', 'Comedy', 'Drama'];
      const top3 = [];
      for (const g of sortedGenres) {
        if (top3.length < 3 && !top3.includes(g)) {
          top3.push(g);
        }
      }
      for (const d of defaults) {
        if (top3.length < 3 && !top3.includes(d)) {
          top3.push(d);
        }
      }

      setUserTopGenresSeries(top3);

      const map = {};
      await Promise.all(top3.map(async (genre) => {
        try {
          const resGenre = await fetch(`${serverUrl}/Items?userId=${userId}&IncludeItemTypes=Series&Recursive=true&Genres=${encodeURIComponent(genre)}&Limit=20&Fields=Overview,CommunityRating,ProductionYear,RunTimeTicks,UserData`, {
            headers: getHeaders()
          });
          if (resGenre.ok) {
            const data = await resGenre.json();
            map[genre] = data.Items || [];
          }
        } catch (e) {
          console.error('Failed to fetch TV shows for genre', genre, e);
        }
      }));
      setGenreShowsMap(map);
    } catch (err) {
      console.error('Failed to fetch Top Genre TV Shows', err);
    }
  };

  const handleSeeAllGenreSeries = async (genreName) => {
    setSelectedGenreViewSeries({ name: genreName, items: [], loading: true });
    try {
      let items = [];
      if (genreName === 'All TV Shows') {
        const res = await fetch(`${serverUrl}/Items?userId=${userId}&IncludeItemTypes=Series&Recursive=true&SortBy=ProductionYear,PremiereDate,SortName&SortOrder=Descending&Limit=100&Fields=Overview,CommunityRating,ProductionYear,RunTimeTicks,UserData`, {
          headers: getHeaders()
        });
        if (res.ok) {
          const data = await res.json();
          items = data.Items || [];
        }
      } else {
        const res = await fetch(`${serverUrl}/Items?userId=${userId}&IncludeItemTypes=Series&Recursive=true&Genres=${encodeURIComponent(genreName)}&SortBy=SortName&SortOrder=Ascending&Limit=100&Fields=Overview,CommunityRating,ProductionYear,RunTimeTicks,UserData`, {
          headers: getHeaders()
        });
        if (res.ok) {
          const data = await res.json();
          items = data.Items || [];
        }
      }
      setSelectedGenreViewSeries({ name: genreName, items, loading: false });
    } catch (err) {
      console.error('Failed to fetch see all TV shows', err);
      setSelectedGenreViewSeries({ name: genreName, items: [], loading: false, error: true });
    }
  };


  const fetchCollections = async () => {
    try {
      const res = await fetch(`${serverUrl}/Items?IncludeItemTypes=BoxSet&Recursive=true&Fields=Overview,CommunityRating,ProductionYear,RunTimeTicks,UserData`, {
        headers: getHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        const cols = data.Items || [];
        setCollections(cols);

        // Fetch children for each collection to build a mapping of which items are in which collection
        const mapping = {};
        await Promise.all(cols.map(async (col) => {
          try {
            const childRes = await fetch(`${serverUrl}/Items?ParentId=${col.Id}&userId=${userId}&Fields=Id`, {
              headers: getHeaders()
            });
            if (childRes.ok) {
              const childData = await childRes.json();
              mapping[col.Id] = (childData.Items || []).map(i => i.Id);
            }
          } catch (e) {
            console.error('Failed to fetch items for collection', col.Name, e);
          }
        }));
        setCollectionMap(mapping);
      }
    } catch (err) {
      console.error('Failed to fetch Collections', err);
    }
  };



  const toggleFavorite = async (item) => {
    const isFav = item.UserData?.IsFavorite;
    const url = `${serverUrl}/Users/${userId}/FavoriteItems/${item.Id}`;
    const method = isFav ? 'DELETE' : 'POST';
    try {
      const res = await fetch(url, {
        method,
        headers: getHeaders()
      });
      if (res.ok) {
        const updatedUserData = { ...item.UserData, IsFavorite: !isFav };
        const updateItem = (i) => i.Id === item.Id ? { ...i, UserData: updatedUserData } : i;

        if (billboardItem && billboardItem.Id === item.Id) {
          setBillboardItem(prev => ({ ...prev, UserData: updatedUserData }));
        }
        setBillboardItems(prev => prev.map(updateItem));
        setTopMovies(prev => prev.map(updateItem));
        setTopShows(prev => prev.map(updateItem));
        setTopAnime(prev => prev.map(updateItem));
        setRecentlyAddedMovies(prev => prev.map(updateItem));
        setRecentlyAddedShows(prev => prev.map(updateItem));
        setFilteredGridItems(prev => prev.map(updateItem));
        setContinueWatching(prev => prev.map(updateItem));
        setSuggestions(prev => prev.map(updateItem));
        setMovieTopPicks(prev => prev.map(updateItem));
        setAllMoviesLatest(prev => prev.map(updateItem));
        setShowTopPicks(prev => prev.map(updateItem));
        if (selectedGenreView) {
          setSelectedGenreView(prev => {
            if (!prev) return null;
            return {
              ...prev,
              items: prev.items.map(updateItem)
            };
          });
        }
        if (selectedGenreViewSeries) {
          setSelectedGenreViewSeries(prev => {
            if (!prev) return null;
            return {
              ...prev,
              items: prev.items.map(updateItem)
            };
          });
        }
        setGenreMoviesMap(prev => {
          const newMap = {};
          Object.keys(prev).forEach(genre => {
            newMap[genre] = prev[genre].map(updateItem);
          });
          return newMap;
        });
        setGenreShowsMap(prev => {
          const newMap = {};
          Object.keys(prev).forEach(genre => {
            newMap[genre] = prev[genre].map(updateItem);
          });
          return newMap;
        });
        setSimilarItems(prev => prev.map(updateItem));
        setCollections(prev => prev.map(updateItem));
        setCollectionItems(prev => prev.map(updateItem));
        setItemCollections(prev => prev.map(updateItem));
        setItemCollectionContents(prev => prev.map(updateItem));
        if (selectedShow && selectedShow.Id === item.Id) {
          setSelectedShow(prev => ({ ...prev, UserData: updatedUserData }));
        }


        if (isFav) {
          setMyList(prev => prev.filter(i => i.Id !== item.Id));
        } else {
          fetchMyList();
        }
      }
    } catch (err) {
      console.error('Failed to toggle favorite:', err);
    }
  };




  // Fetch Homepage Recommendation Rows
  useEffect(() => {
    if (!isConnected) return;

    // Fetch Recently Added (Movies and TV Shows separately)
    const fetchRecentlyAdded = async () => {
      try {
        const [moviesRes, showsRes] = await Promise.all([
          fetch(`${serverUrl}/Users/${userId}/Items?SortBy=DateCreated&SortOrder=Descending&Limit=20&IncludeItemTypes=Movie&Recursive=true&Fields=Overview,CommunityRating,ProductionYear,RunTimeTicks,UserData,Genres`, { headers: getHeaders() }),
          fetch(`${serverUrl}/Users/${userId}/Items?SortBy=DateCreated&SortOrder=Descending&Limit=20&IncludeItemTypes=Series&Recursive=true&Fields=Overview,CommunityRating,ProductionYear,RunTimeTicks,UserData,Genres`, { headers: getHeaders() })
        ]);

        let movies = [];
        let shows = [];

        if (moviesRes.ok) {
          const data = await moviesRes.json();
          movies = data.Items || [];
          setRecentlyAddedMovies(movies);
        }
        if (showsRes.ok) {
          const data = await showsRes.json();
          shows = data.Items || [];
          setRecentlyAddedShows(shows);
        }

        // Combine them (interleaved) for Billboard slide items
        const combined = [];
        const maxLen = Math.max(movies.length, shows.length);
        for (let i = 0; i < maxLen; i++) {
          if (movies[i]) combined.push(movies[i]);
          if (shows[i]) combined.push(shows[i]);
        }

        if (combined.length > 0) {
          const slideItems = combined.slice(0, 5);
          setBillboardItems(slideItems);
          setBillboardItem(slideItems[0]);
          setBillboardIndex(0);

          // Fetch trailer or video clip/episode details for all slide items
          slideItems.forEach(async (item) => {
            try {
              // 1. Try to fetch local trailers
              const trailerRes = await fetch(`${serverUrl}/Users/${userId}/Items/${item.Id}/LocalTrailers`, {
                headers: {
                  'Content-Type': 'application/json',
                  'X-Emby-Authorization': `MediaBrowser Client="Zaflix", Device="Web", DeviceId="zaflix-web-client", Version="0.1.0", Token="${token}"`
                }
              });
              if (trailerRes.ok) {
                const trailerData = await trailerRes.json();
                if (trailerData.Items && trailerData.Items.length > 0) {
                  setBillboardVideoMap(prev => ({
                    ...prev,
                    [item.Id]: {
                      videoId: trailerData.Items[0].Id,
                      startTimeTicks: 0,
                      isTrailer: true
                    }
                  }));
                  return;
                }
              }
            } catch (err) {
              console.error('Failed to fetch local trailers for billboard:', item.Name, err);
            }

            // 2. Fallback if no local trailer is found
            if (item.Type === 'Movie') {
              const runTimeTicks = item.RunTimeTicks || 0;
              const startTimeTicks = runTimeTicks > 0 ? Math.floor(runTimeTicks / 2) : 0;
              setBillboardVideoMap(prev => ({
                ...prev,
                [item.Id]: {
                  videoId: item.Id,
                  startTimeTicks,
                  isTrailer: false
                }
              }));
            } else if (item.Type === 'Series') {
              try {
                const epRes = await fetch(`${serverUrl}/Shows/${item.Id}/Episodes?limit=1&userId=${userId}&Fields=RunTimeTicks`, {
                  headers: {
                    'Content-Type': 'application/json',
                    'X-Emby-Authorization': `MediaBrowser Client="Zaflix", Device="Web", DeviceId="zaflix-web-client", Version="0.1.0", Token="${token}"`
                  }
                });
                if (epRes.ok) {
                  const epData = await epRes.json();
                  if (epData.Items && epData.Items.length > 0) {
                    const episode = epData.Items[0];
                    const runTimeTicks = episode.RunTimeTicks || 0;
                    const startTimeTicks = runTimeTicks > 0 ? Math.floor(runTimeTicks / 2) : 0;
                    setBillboardVideoMap(prev => ({
                      ...prev,
                      [item.Id]: {
                        videoId: episode.Id,
                        startTimeTicks,
                        isTrailer: false
                      }
                    }));
                  }
                }
              } catch (err) {
                console.error('Failed to fetch first episode for billboard:', item.Name, err);
              }
            }
          });
        }
      } catch (err) {
        console.error('Failed to fetch Recently Added Items', err);
      }
    };

    const initAnime = async () => {
      let animeLibId = null;
      try {
        const viewsRes = await fetch(`${serverUrl}/Users/${userId}/Views`, { headers: getHeaders() });
        if (viewsRes.ok) {
          const viewsData = await viewsRes.json();
          const animeView = (viewsData.Items || []).find(v => v.Name.toLowerCase() === 'anime');
          if (animeView) {
            animeLibId = animeView.Id;
            setAnimeLibraryId(animeLibId);
          }
        }
      } catch (err) {
        console.error('Failed to fetch user views', err);
      }
      fetchTopAnime(animeLibId);
    };

    const fetchAvailableNetworks = async () => {
      try {
        const res = await fetch(`${serverUrl}/Studios?userId=${userId}&IncludeItemTypes=Series`, {
          headers: getHeaders()
        });
        if (res.ok) {
          const data = await res.json();
          const serverStudios = data.Items || [];
          const matched = [];
          
          await Promise.all(serverStudios.map(async (studio) => {
            try {
              const checkRes = await fetch(`${serverUrl}/Users/${userId}/Items?IncludeItemTypes=Movie,Series&Recursive=true&Studios=${encodeURIComponent(studio.Name)}&Limit=3&Fields=Id`, {
                headers: getHeaders()
              });
              if (checkRes.ok) {
                const checkData = await checkRes.json();
                if (checkData.Items && checkData.Items.length >= 3) {
                  const nameLower = studio.Name.toLowerCase();
                  const predefined = networks.find(p => 
                    p.name.toLowerCase() === nameLower || 
                    (p.studioName && p.studioName.toLowerCase() === nameLower) ||
                    nameLower.includes(p.name.toLowerCase()) ||
                    (p.studioName && nameLower.includes(p.studioName.toLowerCase()))
                  );
                  if (predefined) {
                    if (!matched.some(m => m.name === predefined.name)) {
                      matched.push(predefined);
                    }
                  } else {
                    if (!matched.some(m => m.name === studio.Name)) {
                      matched.push({
                        name: studio.Name,
                        className: 'network-generic',
                        studioName: studio.Name,
                        isGeneric: true
                      });
                    }
                  }
                }
              }
            } catch (e) {
              console.error('Failed to check content count for studio', studio.Name, e);
            }
          }));
          
          setAvailableNetworks(matched);
        } else {
          setAvailableNetworks(networks);
        }
      } catch (err) {
        console.error('Failed to fetch studios', err);
        setAvailableNetworks(networks);
      }
    };

    fetchTopMovies();
    fetchTopShows();
    initAnime();
    fetchRecentlyAdded();
    fetchContinueWatching();
    fetchMyList();
    fetchSuggestions();
    fetchCollections();
    fetchAvailableNetworks();
    fetchMovieTopPicks();
    fetchTopGenreMovies();
    fetchAllMoviesLatest();
    fetchShowTopPicks();
    fetchTopGenreShows();
  }, [isConnected, serverUrl, userId, token, refreshTrigger]);

  useEffect(() => {
    setSelectedGenreView(null);
    setSelectedGenreViewSeries(null);
  }, [filterType]);




  // Slideshow auto-advance and play clip delay
  useEffect(() => {
    // If active playback is running, completely freeze all background activities to save Jellyfin server resources
    if (billboardItems.length === 0 || activePlayback) {
      setPlayClip(false);
      return;
    }
    
    // Set active item
    const active = billboardItems[billboardIndex];
    setBillboardItem(active);
    
    // Reset play clip state and trigger delay
    setPlayClip(false);
    const delayTimer = setTimeout(() => {
      // Only play clip if no fullscreen player or modal is open to save CPU/Network
      if (!selectedShow) {
        setPlayClip(true);
      }
    }, 2500);

    // Auto-advance interval
    const intervalTimer = setInterval(() => {
      setBillboardIndex(prev => (prev + 1) % billboardItems.length);
    }, 30000); // cycle every 30 seconds

    return () => {
      clearTimeout(delayTimer);
      clearInterval(intervalTimer);
    };
  }, [billboardIndex, billboardItems, activePlayback, selectedShow]);

  // Fetch Filtered/Grid Content based on toggle chips
  useEffect(() => {
    if (!isConnected) return;
    if (filterType === 'All') {
      setFilteredGridItems([]);
      return;
    }

    const fetchFiltered = async () => {
      try {
        if (filterType === 'Network' && selectedNetwork) {
          const networkObj = networks.find(p => p.name === selectedNetwork);
          const studioQueryName = networkObj ? (networkObj.studioName || networkObj.name) : selectedNetwork;
          
          let itemTypes = 'Movie,Series';
          if (networkOrigin === 'Movie') {
            itemTypes = 'Movie';
          } else if (networkOrigin === 'Series') {
            itemTypes = 'Series';
          }
          
          const res = await fetch(`${serverUrl}/Users/${userId}/Items?IncludeItemTypes=${itemTypes}&Recursive=true&Studios=${encodeURIComponent(studioQueryName)}&Fields=Overview,CommunityRating,ProductionYear,RunTimeTicks,UserData`, {
            headers: getHeaders()
          });
          if (res.ok) {
            const data = await res.json();
            setFilteredGridItems(data.Items || []);
          }
          return;
        }
        if (filterType === 'MyList') {
          const res = await fetch(`${serverUrl}/Items?Filters=IsFavorite&Recursive=true&Fields=Overview,CommunityRating,ProductionYear,RunTimeTicks,UserData`, {
            headers: getHeaders()
          });
          if (res.ok) {
            const data = await res.json();
            setFilteredGridItems(data.Items || []);
          }
          return;
        }
        if (filterType === 'BoxSet') {
          const res = await fetch(`${serverUrl}/Items?IncludeItemTypes=BoxSet&Recursive=true&Fields=Overview,CommunityRating,ProductionYear,RunTimeTicks,UserData`, {
            headers: getHeaders()
          });
          if (res.ok) {
            const data = await res.json();
            setFilteredGridItems(data.Items || []);
          }
          return;
        }
        if (filterType === 'Anime') {
          const promises = [];
          promises.push(
            fetch(`${serverUrl}/Items?SortBy=SortName&SortOrder=Ascending&Genres=Anime&Recursive=true&Limit=50&Fields=Overview,CommunityRating,ProductionYear,RunTimeTicks,UserData`, {
              headers: getHeaders()
            }).then(r => r.ok ? r.json() : { Items: [] })
          );
          if (animeLibraryId) {
            promises.push(
              fetch(`${serverUrl}/Items?SortBy=SortName&SortOrder=Ascending&ParentId=${animeLibraryId}&Recursive=true&Limit=50&Fields=Overview,CommunityRating,ProductionYear,RunTimeTicks,UserData`, {
                headers: getHeaders()
              }).then(r => r.ok ? r.json() : { Items: [] })
            );
          }
          const results = await Promise.all(promises);
          const combinedItems = [];
          const seenIds = new Set();
          results.forEach(res => {
            if (res && res.Items) {
              res.Items.forEach(item => {
                if (!seenIds.has(item.Id)) {
                  seenIds.add(item.Id);
                  combinedItems.push(item);
                }
              });
            }
          });
          combinedItems.sort((a, b) => (a.SortName || a.Name || '').localeCompare(b.SortName || b.Name || ''));
          setFilteredGridItems(combinedItems);
          return;
        }
        const itemType = filterType === 'Movie' ? 'Movie' : 'Series';
        const res = await fetch(`${serverUrl}/Items?IncludeItemTypes=${itemType}&SortBy=SortName&SortOrder=Ascending&Recursive=true&Limit=30&Fields=Overview,CommunityRating,ProductionYear,RunTimeTicks,UserData`, {
          headers: getHeaders()
        });
        if (res.ok) {
          const data = await res.json();
          setFilteredGridItems(data.Items || []);
        }
      } catch (err) {
        console.error('Failed to fetch filtered list', err);
      }
    };
    fetchFiltered();
  }, [filterType, selectedNetwork, isConnected, serverUrl, token, userId, animeLibraryId, refreshTrigger]);

  useEffect(() => {
    if (filterType !== 'Network') {
      setSelectedNetwork(null);
    }
  }, [filterType]);



  // Open Details Modal for TV Series or Movie
  const handleItemClick = (item) => {
    setSelectedShow(item);
    setSimilarItems([]);
    setItemCollections([]);
    setItemCollectionContents([]);

    // Fetch similar items: GET /Items/{ItemId}/Similar
    fetch(`${serverUrl}/Items/${item.Id}/Similar?limit=6&userId=${userId}&Fields=Overview,CommunityRating,ProductionYear,RunTimeTicks,UserData`, {
      headers: getHeaders()
    })
    .then(res => res.json())
    .then(data => {
      setSimilarItems(data.Items || []);
    })
    .catch(err => console.error('Failed to fetch similar items', err));

    // Find parent collections from pre-fetched collections list using collectionMap mapping
    const parentCols = collections.filter(col => collectionMap[col.Id] && collectionMap[col.Id].includes(item.Id));
    setItemCollections(parentCols);
    if (parentCols.length > 0) {
      const col = parentCols[0];
      fetch(`${serverUrl}/Items?ParentId=${col.Id}&userId=${userId}&Fields=Overview,CommunityRating,ProductionYear,RunTimeTicks,UserData`, {
        headers: getHeaders()
      })
      .then(res => res.json())
      .then(data => {
        setItemCollectionContents(data.Items || []);
      })
      .catch(err => console.error('Failed to fetch parent collection items', err));
    }

    if (item.Type === 'Series') {
      setSeasons([]);
      setEpisodes([]);
      // Fetch seasons: GET /Shows/{SeriesId}/Seasons?userId={UserId}
      fetch(`${serverUrl}/Shows/${item.Id}/Seasons?userId=${userId}`, {
        headers: getHeaders()
      })
      .then(res => res.json())
      .then(data => {
        setSeasons(data.Items || []);
        if (data.Items && data.Items.length > 0) {
          // Select first season by default
          setSelectedSeasonId(data.Items[0].Id);
        }
      })
      .catch(err => console.error('Failed to fetch seasons', err));
    }

    if (item.Type === 'BoxSet') {
      setCollectionItems([]);
      let includeTypes = 'Movie,Series';
      if (filterType === 'Movie') {
        includeTypes = 'Movie';
      } else if (filterType === 'Series') {
        includeTypes = 'Series';
      }
      fetch(`${serverUrl}/Items?ParentId=${item.Id}&userId=${userId}&IncludeItemTypes=${includeTypes}&Fields=Overview,CommunityRating,ProductionYear,RunTimeTicks,UserData`, {
        headers: getHeaders()
      })
      .then(res => res.json())
      .then(data => {
        setCollectionItems(data.Items || []);
      })
      .catch(err => console.error('Failed to fetch collection items', err));
    }

  };


  // Fetch episodes when selected season changes
  useEffect(() => {
    if (!selectedShow || !selectedSeasonId) return;
    // GET /Shows/{SeriesId}/Episodes?seasonId={SeasonId}&userId={UserId}
    fetch(`${serverUrl}/Shows/${selectedShow.Id}/Episodes?seasonId=${selectedSeasonId}&userId=${userId}&Fields=Overview,RunTimeTicks`, {
      headers: getHeaders()
    })
    .then(res => res.json())
    .then(data => {
      setEpisodes(data.Items || []);
    })
    .catch(err => console.error('Failed to fetch episodes', err));
  }, [selectedSeasonId, selectedShow, serverUrl, userId, token]);

  const loadIntroMarkers = async (mediaId) => {
    setIntroMarker(null);
    
    // 1. Try Intro Skipper Plugin
    try {
      const res = await fetch(`${serverUrl}/Videos/${mediaId}/Intro`, {
        headers: getHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        let start = data.Start || 0;
        let end = data.End || 0;
        if (data.Interval) {
          start = data.Interval.Start || start;
          end = data.Interval.End || end;
        }
        if (start > 10000) start = start / 10000000;
        if (end > 10000) end = end / 10000000;
        
        if (end > start && end > 0) {
          setIntroMarker({ start, end });
          return;
        }
      }
    } catch (e) {
      console.log("Intro Skipper plugin check failed, trying chapters", e);
    }
    
    // 2. Try Jellyfin Built-in Chapters
    try {
      const res = await fetch(`${serverUrl}/Videos/${mediaId}/Chapters`, {
        headers: getHeaders()
      });
      if (res.ok) {
        const chapters = await res.json();
        if (Array.isArray(chapters)) {
          const introIndex = chapters.findIndex(c => c.Name && c.Name.toLowerCase().includes('intro'));
          if (introIndex !== -1) {
            const introChapter = chapters[introIndex];
            let start = introChapter.StartPositionTicks / 10000000;
            let end = start + 90; // Default 90s intro length if last chapter
            if (introIndex + 1 < chapters.length) {
              end = chapters[introIndex + 1].StartPositionTicks / 10000000;
            }
            setIntroMarker({ start, end });
            return;
          }
        }
      }
    } catch (e) {
      console.log("Chapters check failed", e);
    }
  };

  // Launch direct media streaming
  const handlePlayMedia = (mediaId, title, subtitle, isEpisode = false, episodesList = [], currentIndex = 0, durationTicks = null, startPositionTicks = 0) => {
    setSelectedAudioIndex(null);
    setDefaultAudioIndex(null);
    setSelectedSubtitleIndex(null);
    setMediaSourceId('');
    setAudioStreams([]);
    setSubtitleStreams([]);
    setActivePlayback({
      id: mediaId,
      title,
      subtitle,
      isEpisode,
      episodesList,
      currentEpisodeIndex: currentIndex
    });
    setIsPlaying(true);
    const startSecs = startPositionTicks ? (startPositionTicks / 10000000) : 0;
    setCurrentTime(startSecs);
    seekTargetTimeRef.current = startSecs;
    lastPlayheadTimeRef.current = startSecs;
    if (durationTicks) {
      const secs = durationTicks / 10000000;
      setDuration(secs);
      durationRef.current = secs;
    } else {
      setDuration(0);
      durationRef.current = 0;
    }
    loadIntroMarkers(mediaId);
  };


  // Skip to next episode
  const handleNextEpisode = () => {
    if (!activePlayback || !activePlayback.isEpisode) return;
    const { episodesList, currentEpisodeIndex } = activePlayback;
    const nextIndex = currentEpisodeIndex + 1;
    if (nextIndex < episodesList.length) {
      const nextEp = episodesList[nextIndex];
      handlePlayMedia(
        nextEp.Id,
        `${selectedShow.Name} - S${nextEp.ParentIndexNumber.toString().padStart(2, '0')}E${nextEp.IndexNumber.toString().padStart(2, '0')}`,
        nextEp.Name,
        true,
        episodesList,
        nextIndex,
        nextEp.RunTimeTicks
      );
    }
  };

  // Video controller handlers
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      if (video.currentTime > 0 && video.readyState > 0) {
        lastPlayheadTimeRef.current = video.currentTime;
      }
    };
    const onDurationChange = () => {
      if (durationRef.current === 0 && video.duration) {
        setDuration(video.duration);
        durationRef.current = video.duration;
      }
    };
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    
    const onLoadedMetadata = () => {
      if (durationRef.current === 0 && video.duration) {
        setDuration(video.duration);
        durationRef.current = video.duration;
      }
      if (seekTargetTimeRef.current > 0) {
        video.currentTime = seekTargetTimeRef.current;
        seekTargetTimeRef.current = 0;
      }
      // If was playing, resume playback
      video.play().catch(e => console.log('Resume playback prevented', e));
    };

    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('durationchange', onDurationChange);
    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('loadedmetadata', onLoadedMetadata);

    // Auto play
    video.play().catch(e => console.log('Autoplay blocked, waiting for interaction'));

    return () => {
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('durationchange', onDurationChange);
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('loadedmetadata', onLoadedMetadata);
    };
  }, [activePlayback]);

  // Fetch active item audio and subtitle streams
  useEffect(() => {
    if (!activePlayback || !isConnected) return;
    
    const fetchPlaybackInfo = async () => {
      try {
        const res = await fetch(`${serverUrl}/Users/${userId}/Items/${activePlayback.id}`, {
          headers: getHeaders()
        });
        if (res.ok) {
          const data = await res.json();
          const mediaSource = data.MediaSources?.[0];
          if (mediaSource) {
            const streams = mediaSource.MediaStreams || [];
            setMediaSourceId(mediaSource.Id);
            
            const audios = streams.filter(s => s.Type === 'Audio');
            const subtitles = streams.filter(s => s.Type === 'Subtitle');
            
            setAudioStreams(audios);
            setSubtitleStreams(subtitles);
            
            // Set default audio index
            const defaultAudio = audios.find(s => s.IsDefault) || audios[0];
            if (defaultAudio) {
              setDefaultAudioIndex(defaultAudio.Index);
              if (selectedAudioIndex === null) {
                setSelectedAudioIndex(defaultAudio.Index);
              }
            }
          }
        }
      } catch (err) {
        console.error('Failed to fetch media streams:', err);
      }
    };
    
    fetchPlaybackInfo();
  }, [activePlayback, isConnected]);

  // Keep HTML5 video volume and muted properties in sync
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = volume;
      videoRef.current.muted = isMuted;
    }
  }, [activePlayback, volume, isMuted]);

  // Ensure subtitle mode is active immediately
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const syncSubtitles = () => {
      const tracks = video.textTracks;
      for (let i = 0; i < tracks.length; i++) {
        tracks[i].mode = selectedSubtitleIndex === null ? 'disabled' : 'showing';
      }
    };

    syncSubtitles();
    video.textTracks.addEventListener('addtrack', syncSubtitles);
    return () => {
      video.textTracks.removeEventListener('addtrack', syncSubtitles);
    };
  }, [selectedSubtitleIndex]);

  // Set up HLS Video streaming URL and initialize Hls.js player
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !activePlayback) return;

    // Generate a unique session ID for this segment transcoding request to force fresh generation
    const playSessionId = 'zaflix-session-' + Math.random().toString(36).substring(2, 11);

    let streamUrl = `${serverUrl}/Videos/${activePlayback.id}/live.m3u8?Static=false&PlayMethod=DirectStream&VideoCodec=h264&videoCodec=h264&AudioCodec=aac&audioCodec=aac&AudioChannels=2&audioChannels=2&Container=ts,mp4,m4v&SegmentContainer=ts&TranscodingProtocols=hls&EnableDirectStream=true&EnableDirectPlay=false&TranscodeReasons=AudioCodecNotSupported&PlaySessionId=${playSessionId}&api_key=${token}`;

    if (selectedAudioIndex !== null) {
      streamUrl += `&AudioStreamIndex=${selectedAudioIndex}`;
    }

    // Save current time position to resume playback correctly when switching quality/audio
    const prevTime = lastPlayheadTimeRef.current;
    console.log("Zaflix Debug: Audio switched. prevTime:", prevTime, "lastPlayheadTimeRef:", lastPlayheadTimeRef.current, "video.currentTime:", video.currentTime);
    let hlsInstance = null;

    const restoreTime = () => {
      if (prevTime > 0) {
        video.currentTime = prevTime;
      }
      video.play().catch(e => console.log('Playback start prevented/failed', e));
      video.removeEventListener('loadedmetadata', restoreTime);
    };

    video.addEventListener('loadedmetadata', restoreTime);

    if (Hls.isSupported()) {
      hlsInstance = new Hls({
        maxBufferLength: 30,             // seconds of buffer ahead
        maxMaxBufferLength: 600,         // seconds max buffer
        maxBufferSize: 100 * 1000 * 1000, // 100MB max buffer size
        backBufferLength: 30,            // seconds to keep in back buffer
      });

      hlsInstance.loadSource(streamUrl);
      hlsInstance.attachMedia(video);

      hlsInstance.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(e => console.log('Playback start prevented', e));
      });

      hlsInstance.on(Hls.Events.ERROR, (event, data) => {
        console.error('HLS error:', data);
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              hlsInstance.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hlsInstance.recoverMediaError();
              break;
            default:
              // Cannot recover, destroy and fallback to direct src
              hlsInstance.destroy();
              hlsInstance = null;
              video.src = streamUrl;
              break;
          }
        }
      });
    } else {
      // Native HLS support (Safari/iOS) or MSE fallback
      video.src = streamUrl;
    }

    return () => {
      video.removeEventListener('loadedmetadata', restoreTime);
      if (hlsInstance) {
        hlsInstance.destroy();
      }
    };
  }, [activePlayback, videoQuality, selectedAudioIndex, defaultAudioIndex, serverUrl, token]);

  const handleProgressBarMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = Math.min(Math.max(0, (e.clientX - rect.left) / rect.width), 1);
    const targetSecs = percent * duration;
    setHoverTime(targetSecs);
    setHoverX(e.clientX - rect.left);
    
    if (activePlayback) {
      const ticks = Math.round(targetSecs * 10000000);
      const previewUrl = getImageUrl(activePlayback.id, 'Primary', '', ticks);
      setHoverImageSrc(previewUrl);
    }
  };

  const handleProgressBarMouseLeave = () => {
    setHoverTime(null);
  };


  // Auto hide controls logic
  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 4000);
  };

  useEffect(() => {
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, [isPlaying]);

  // Report playback progress to Jellyfin
  useEffect(() => {
    if (!isConnected || !activePlayback || !videoRef.current) return;

    const reportProgress = async () => {
      const video = videoRef.current;
      if (!video) return;
      const ticks = Math.round(video.currentTime * 10000000);
      try {
        await fetch(`${serverUrl}/Users/${userId}/PlayingItems/${activePlayback.id}?PositionTicks=${ticks}`, {
          method: 'POST',
          headers: getHeaders()
        });
      } catch (e) {
        console.error('Failed to report playback progress', e);
      }
    };

    // Report every 10 seconds
    const interval = setInterval(reportProgress, 10000);

    return () => {
      clearInterval(interval);
      // Report one last time on cleanup
      reportProgress();
    };
  }, [isConnected, activePlayback, serverUrl, userId]);


  const handlePlayPause = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
  };

  const handleVideoClick = (e) => {
    const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || isMobile;
    if (isTouch) {
      e.preventDefault();
      e.stopPropagation();
      setShowControls(prev => {
        const next = !prev;
        if (next) {
          if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
          controlsTimeoutRef.current = setTimeout(() => {
            if (videoRef.current && !videoRef.current.paused) setShowControls(false);
          }, 4000);
        }
        return next;
      });
    } else {
      handlePlayPause();
    }
  };

  const handleTouchSeek = (e) => {
    if (!videoRef.current || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const touch = e.touches[0];
    const clickPct = Math.max(0, Math.min(1, (touch.clientX - rect.left) / rect.width));
    videoRef.current.currentTime = clickPct * duration;
  };


  const handleSkip = (seconds) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = Math.min(
      Math.max(0, videoRef.current.currentTime + seconds),
      duration
    );
  };

  const handleVolumeChange = (e) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = val === 0;
    }
    setIsMuted(val === 0);
  };

  const handleToggleMute = () => {
    if (!videoRef.current) return;
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    videoRef.current.muted = nextMute;
    if (!nextMute && volume === 0) {
      setVolume(0.5);
      videoRef.current.volume = 0.5;
    }
  };

  const handleToggleFullscreen = () => {
    if (!playerContainerRef.current) return;
    if (!document.fullscreenElement) {
      playerContainerRef.current.requestFullscreen()
        .then(() => setIsFullscreen(true))
        .catch(err => console.error(err));
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const changeQuality = (quality) => {
    if (!videoRef.current) return;
    const time = videoRef.current.currentTime;
    seekTargetTimeRef.current = time;
    lastPlayheadTimeRef.current = time;
    setVideoQuality(quality);
  };

  const toggleAspectRatio = () => {
    setAspectRatio(prev => {
      if (prev === 'contain') return 'cover';
      if (prev === 'cover') return 'fill';
      return 'contain';
    });
  };

  useEffect(() => {
    const handleFsChange = () => {
      const isFs = !!document.fullscreenElement;
      setIsFullscreen(isFs);
      if (isFs) {
        if (screen.orientation && screen.orientation.lock) {
          screen.orientation.lock('landscape').catch(e => console.log('Screen orientation lock prevented:', e));
        }
      } else {
        if (screen.orientation && screen.orientation.unlock) {
          screen.orientation.unlock();
        }
      }
    };
    document.addEventListener('fullscreenchange', handleFsChange);

    // Auto enter fullscreen & rotate to landscape on mobile/tablet when activePlayback starts
    if (activePlayback && (isMobile || ('ontouchstart' in window) || navigator.maxTouchPoints > 0)) {
      const timer = setTimeout(async () => {
        try {
          if (playerContainerRef.current && !document.fullscreenElement) {
            await playerContainerRef.current.requestFullscreen();
          }
          if (screen.orientation && screen.orientation.lock) {
            await screen.orientation.lock('landscape');
          }
        } catch (err) {
          console.log('Auto-fullscreen or orientation lock prevented/unsupported:', err);
        }
      }, 150);
      return () => {
        clearTimeout(timer);
        document.removeEventListener('fullscreenchange', handleFsChange);
      };
    }

    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
    };
  }, [activePlayback, isMobile]);

  // Auto-refresh cache and content every 1 hour (3,600,000 ms)
  useEffect(() => {
    if (!isConnected) return;
    const interval = setInterval(() => {
      console.log('Auto-refreshing cache and content (1-hour interval)...');
      handleRefresh();
    }, 3600000);
    return () => clearInterval(interval);
  }, [isConnected]);

  // Format ticks to minutes
  const formatRuntime = (ticks) => {
    if (!ticks) return '';
    const minutes = Math.floor(ticks / 600000000);
    return `${minutes}m`;
  };

  // Format seconds to mm:ss
  const formatTime = (seconds) => {
    if (isNaN(seconds)) return '00:00';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Slider navigation helper
  const scrollSlider = (id, direction) => {
    const container = document.getElementById(id);
    if (!container) return;
    const scrollAmount = container.clientWidth * 0.8;
    const maxScroll = container.scrollWidth - container.clientWidth;
    
    if (direction === 'left') {
      if (container.scrollLeft <= 5) {
        container.scrollTo({
          left: maxScroll,
          behavior: 'smooth'
        });
      } else {
        container.scrollBy({
          left: -scrollAmount,
          behavior: 'smooth'
        });
      }
    } else {
      if (container.scrollLeft >= maxScroll - 5) {
        container.scrollTo({
          left: 0,
          behavior: 'smooth'
        });
      } else {
        container.scrollBy({
          left: scrollAmount,
          behavior: 'smooth'
        });
      }
    }
  };

  return (
    <div className="app-root">
      {/* 1. Connection / Login Overlay */}
      {!isConnected && (
        <div className="setup-overlay">
          <div className="setup-card">
            <h1 className="setup-logo">
              <svg className="brand-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
                <defs>
                  <linearGradient id="setupTopGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#9C3FE4" />
                    <stop offset="60%" stopColor="#C03FE4" />
                    <stop offset="100%" stopColor="#E43F9C" />
                  </linearGradient>
                  <linearGradient id="setupBottomGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#7B2CBF" />
                    <stop offset="50%" stopColor="#9D4EDD" />
                    <stop offset="100%" stopColor="#C77DFF" />
                  </linearGradient>
                  <linearGradient id="setupDiagGrad" x1="100%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#FF007F" />
                    <stop offset="30%" stopColor="#D000B0" />
                    <stop offset="70%" stopColor="#8000A0" />
                    <stop offset="100%" stopColor="#4A0070" />
                  </linearGradient>
                  <filter id="setupShadow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="-3" dy="3" stdDeviation="3" floodColor="#000000" floodOpacity="0.6"/>
                  </filter>
                </defs>
                <path d="M 28 64 L 80 64 L 80 80 L 20 80 Z" fill="url(#setupBottomGrad)" />
                <path d="M 80 20 L 72 36 L 20 80 L 28 64 Z" fill="url(#setupDiagGrad)" filter="url(#setupShadow)" />
                <path d="M 20 20 L 80 20 L 72 36 L 20 36 Z" fill="url(#setupTopGrad)" filter="url(#setupShadow)" />
              </svg>
              <span>ZAFLIX</span>
            </h1>
            <form onSubmit={handleConnect}>
              <div className="form-group">
                <label className="form-label">Jellyfin Server URL</label>
                <input 
                  type="url" 
                  className="form-input" 
                  placeholder="https://jellyfin.example.com" 
                  value={formServerUrl} 
                  onChange={(e) => setFormServerUrl(e.target.value)} 
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Username</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Jellyfin Username" 
                  value={formUsername} 
                  onChange={(e) => setFormUsername(e.target.value)} 
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Password</label>
                <input 
                  type="password" 
                  className="form-input" 
                  placeholder="Password" 
                  value={formPassword} 
                  onChange={(e) => setFormPassword(e.target.value)} 
                />
              </div>

              {errorMsg && (
                <div style={{ color: '#e50914', fontSize: '0.85rem', marginBottom: '15px', fontWeight: 600 }}>
                  {errorMsg}
                </div>
              )}

              <button type="submit" className="btn btn-primary setup-btn">Connect Client</button>
            </form>
            <p className="setup-note">
              Connecting directly to your home streaming server. Credentials are saved locally on your browser.
            </p>
          </div>
        </div>
      )}

      {/* Main Netflix Home Dashboard */}
      {isConnected && (
        <>
          <nav className="navbar">
            <a href="#" className="nav-logo" onClick={() => setFilterType('All')}>
              <svg className="brand-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
                <defs>
                  <linearGradient id="navTopGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#9C3FE4" />
                    <stop offset="60%" stopColor="#C03FE4" />
                    <stop offset="100%" stopColor="#E43F9C" />
                  </linearGradient>
                  <linearGradient id="navBottomGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#7B2CBF" />
                    <stop offset="50%" stopColor="#9D4EDD" />
                    <stop offset="100%" stopColor="#C77DFF" />
                  </linearGradient>
                  <linearGradient id="navDiagGrad" x1="100%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#FF007F" />
                    <stop offset="30%" stopColor="#D000B0" />
                    <stop offset="70%" stopColor="#8000A0" />
                    <stop offset="100%" stopColor="#4A0070" />
                  </linearGradient>
                  <filter id="navShadow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="-3" dy="3" stdDeviation="3" floodColor="#000000" floodOpacity="0.6"/>
                  </filter>
                </defs>
                <path d="M 28 64 L 80 64 L 80 80 L 20 80 Z" fill="url(#navBottomGrad)" />
                <path d="M 80 20 L 72 36 L 20 80 L 28 64 Z" fill="url(#navDiagGrad)" filter="url(#navShadow)" />
                <path d="M 20 20 L 80 20 L 72 36 L 20 36 Z" fill="url(#navTopGrad)" filter="url(#navShadow)" />
              </svg>
              <span>ZAFLIX</span>
            </a>
            <ul className="nav-links">
              <li className={`nav-item ${filterType === 'All' ? 'active' : ''}`} onClick={() => setFilterType('All')}>Home</li>
              <li className={`nav-item ${filterType === 'Movie' ? 'active' : ''}`} onClick={() => setFilterType('Movie')}>Movies</li>
              <li className={`nav-item ${filterType === 'Series' ? 'active' : ''}`} onClick={() => setFilterType('Series')}>TV Shows</li>
              <li className={`nav-item ${filterType === 'Anime' ? 'active' : ''}`} onClick={() => setFilterType('Anime')}>Anime</li>
              <li className={`nav-item ${filterType === 'MyList' ? 'active' : ''}`} onClick={() => setFilterType('MyList')}>My List</li>
              <li className={`nav-item ${filterType === 'BoxSet' ? 'active' : ''}`} onClick={() => setFilterType('BoxSet')}>Collections</li>
              <li style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button 
                  onClick={handleRefresh} 
                  className="btn btn-secondary" 
                  style={{ padding: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px' }}
                  title="Refresh Cache"
                >
                  <RotateCw size={14} />
                </button>
                <button 
                  onClick={handleLogout} 
                  className="btn btn-secondary" 
                  style={{ padding: '6px 12px', fontSize: '0.8rem', borderRadius: '4px' }}
                >
                  Disconnect
                </button>
              </li>
            </ul>
          </nav>

          {/* Top-Bar Toggle Chips to isolate grids */}
          <div className="filter-container">
            <button 
              className={`filter-chip ${filterType === 'All' ? 'active' : ''}`} 
              onClick={() => setFilterType('All')}
            >
              <Grid size={14} style={{ marginRight: '6px', verticalAlign: 'middle', display: 'inline' }} />
              All Content
            </button>
            <button 
              className={`filter-chip ${filterType === 'Movie' ? 'active' : ''}`} 
              onClick={() => setFilterType('Movie')}
            >
              <Film size={14} style={{ marginRight: '6px', verticalAlign: 'middle', display: 'inline' }} />
              Movies
            </button>
            <button 
              className={`filter-chip ${filterType === 'Series' ? 'active' : ''}`} 
              onClick={() => setFilterType('Series')}
            >
              <Tv size={14} style={{ marginRight: '6px', verticalAlign: 'middle', display: 'inline' }} />
              TV Shows
            </button>
            <button 
              className={`filter-chip ${filterType === 'Anime' ? 'active' : ''}`} 
              onClick={() => setFilterType('Anime')}
            >
              <Sparkles size={14} style={{ marginRight: '6px', verticalAlign: 'middle', display: 'inline' }} />
              Anime
            </button>
            <button 
              className={`filter-chip ${filterType === 'MyList' ? 'active' : ''}`} 
              onClick={() => setFilterType('MyList')}
            >
              <Plus size={14} style={{ marginRight: '6px', verticalAlign: 'middle', display: 'inline' }} />
              My List
            </button>
            <button 
              className={`filter-chip ${filterType === 'BoxSet' ? 'active' : ''}`} 
              onClick={() => setFilterType('BoxSet')}
            >
              <Grid size={14} style={{ marginRight: '6px', verticalAlign: 'middle', display: 'inline' }} />
              Collections
            </button>
          </div>



          {/* Conditionally render sliders OR network grid OR isolate grids */}
          {filterType === 'Network' ? (
            <div className="network-view">
              <div className="network-header-container">
                <h1 className="network-header-title">
                  <span>{selectedNetwork} Collection</span>
                </h1>
                <button className="btn-back" onClick={() => setFilterType('All')}>
                  <ChevronLeft size={16} /> Back to Home
                </button>
              </div>
              <div className="grid-container">
                {filteredGridItems.length > 0 ? (
                  filteredGridItems.map((item) => {
                    const cardClass = isMobile ? "card" : "card horizontal";
                    const imageSrc = isMobile ? getImageUrl(item.Id, 'Primary') : getImageUrl(item.Id, 'Backdrop');
                    return (
                      <div key={item.Id} className={cardClass} onClick={() => handleItemClick(item)} onMouseEnter={(e) => handleCardMouseEnter(e, item)} onMouseLeave={handleCardMouseLeave}>
                        <img 
                          className="card-img" 
                          src={imageSrc} 
                          alt={item.Name} 
                          loading="lazy"
                        />
                        {previewActiveId === item.Id && (
                          <video
                            className="card-preview-video"
                            src={getPreviewStreamUrl(item)}
                            autoPlay
                            muted
                            loop
                            playsInline
                          />
                        )}
                        {!isMobile && (
                          <div className="card-title-overlay">
                            {item.ImageTags && item.ImageTags.Logo ? (
                              <img 
                                className="card-logo" 
                                src={`${serverUrl}/Items/${item.Id}/Images/Logo?maxHeight=40`} 
                                alt={item.Name} 
                              />
                            ) : (
                              <span className="card-text-title">{item.Name}</span>
                            )}
                          </div>
                        )}
                        <div className="card-details">
                          <p className="card-title">{item.Name}</p>
                          <div className="card-meta">
                            {item.CommunityRating && <span className="rating-pill">{item.CommunityRating.toFixed(1)}</span>}
                            <span>{item.ProductionYear}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="no-content-message" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '80px 20px', color: 'var(--text-muted)' }}>
                    No content found on {selectedNetwork}
                  </div>
                )}
              </div>
            </div>
          ) : filterType === 'All' ? (
            <>
              {/* Hero Banner Billboard */}
              {billboardItem && (
                isMobile ? (
                  <div 
                    className="billboard mobile-billboard"
                    onClick={() => handleItemClick(billboardItem)}
                  >
                    <div className="mobile-poster-card">
                      <img 
                        className="mobile-poster-img"
                        src={getImageUrl(billboardItem.Id, 'Primary')}
                        alt={billboardItem.Name}
                      />
                      <div className="mobile-card-brand">
                        <svg className="brand-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" style={{ width: '24px', height: '24px' }}>
                          <path d="M 28 64 L 80 64 L 80 80 L 20 80 Z" fill="url(#navBottomGrad)" />
                          <path d="M 80 20 L 72 36 L 20 80 L 28 64 Z" fill="url(#navDiagGrad)" filter="url(#navShadow)" />
                          <path d="M 20 20 L 80 20 L 72 36 L 20 36 Z" fill="url(#navTopGrad)" filter="url(#navShadow)" />
                        </svg>
                      </div>
                      <div className="mobile-card-overlay">
                        {billboardItem.ImageTags && billboardItem.ImageTags.Logo ? (
                          <img 
                            className="billboard-title-logo mobile-logo"
                            src={`${serverUrl}/Items/${billboardItem.Id}/Images/Logo?maxHeight=50`}
                            alt={billboardItem.Name}
                          />
                        ) : (
                          <h1 className="billboard-title mobile-title">{billboardItem.Name}</h1>
                        )}

                        {billboardItem.Genres && billboardItem.Genres.length > 0 && (
                          <div className="mobile-genres">
                            {billboardItem.Genres.slice(0, 3).join('  ·  ')}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mobile-actions" onClick={(e) => e.stopPropagation()}>
                      <button 
                        className="mobile-btn btn-play"
                        onClick={() => {
                          if (billboardItem.Type === 'Series') {
                            handleItemClick(billboardItem);
                          } else {
                            handlePlayMedia(billboardItem.Id, billboardItem.Name, billboardItem.ProductionYear || '', false, [], 0, billboardItem.RunTimeTicks, billboardItem.UserData?.PlaybackPositionTicks || 0);
                          }
                        }}
                      >
                        <Play fill="#000" size={16} /> Play
                      </button>
                      <button 
                        className="mobile-btn btn-mylist"
                        onClick={(e) => { e.stopPropagation(); toggleFavorite(billboardItem); }}
                      >
                        {billboardItem.UserData?.IsFavorite ? <Check size={16} /> : <Plus size={16} />}
                        My List
                      </button>
                    </div>
                  </div>
                ) : (
                  <div 
                    className="billboard"
                    style={{ backgroundImage: `url(${getImageUrl(billboardItem.Id, 'Backdrop')})` }}
                  >
                    {/* Background Video Preview Clip */}
                    {playClip && billboardVideoMap[billboardItem.Id] && (
                      <video
                        key={billboardItem.Id}
                        className="billboard-video"
                        src={`${serverUrl}/Videos/${billboardVideoMap[billboardItem.Id].videoId}/stream?static=false&VideoCodec=h264&AudioCodec=aac&Container=mp4&maxWidth=854&maxHeight=480&VideoBitrate=800000&StartTimeTicks=${billboardVideoMap[billboardItem.Id].startTimeTicks}&api_key=${token}`}
                        autoPlay
                        loop
                        muted={isClipMuted}
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          zIndex: 1
                        }}
                      />
                    )}

                    {/* Slideshow Control Arrows */}
                    {billboardItems.length > 1 && (
                      <>
                        <button 
                          className="btn-secondary" 
                          onClick={(e) => { e.stopPropagation(); setBillboardIndex(prev => (prev - 1 + billboardItems.length) % billboardItems.length); }}
                          style={{ position: 'absolute', left: '20px', top: '50%', transform: 'translateY(-50%)', zIndex: 10, border: 'none', background: 'rgba(0,0,0,0.4)', color: '#fff', width: '44px', height: '44px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                        >
                          <ChevronLeft size={28} />
                        </button>
                        <button 
                          className="btn-secondary" 
                          onClick={(e) => { e.stopPropagation(); setBillboardIndex(prev => (prev + 1) % billboardItems.length); }}
                          style={{ position: 'absolute', right: '20px', top: '50%', transform: 'translateY(-50%)', zIndex: 10, border: 'none', background: 'rgba(0,0,0,0.4)', color: '#fff', width: '44px', height: '44px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                        >
                          <ChevronRight size={28} />
                        </button>
                      </>
                    )}

                    {/* Volume Control Mute/Unmute */}
                    {playClip && billboardVideoMap[billboardItem.Id] && (
                      <button 
                        className="btn-secondary"
                        onClick={(e) => { e.stopPropagation(); setIsClipMuted(!isClipMuted); }}
                        style={{ position: 'absolute', bottom: '30px', right: '4%', zIndex: 10, border: '1px solid rgba(255,255,255,0.4)', background: 'rgba(0,0,0,0.5)', color: '#fff', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                      >
                        {isClipMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                      </button>
                    )}

                    <div className="billboard-content">
                      {billboardItem.ImageTags && billboardItem.ImageTags.Logo ? (
                        <img 
                          className="billboard-title-logo"
                          src={`${serverUrl}/Items/${billboardItem.Id}/Images/Logo?maxHeight=120`}
                          alt={billboardItem.Name}
                          style={{ 
                            maxHeight: '120px', 
                            maxWidth: '80%', 
                            objectFit: 'contain', 
                            marginBottom: '20px',
                            display: 'block'
                          }}
                        />
                      ) : (
                        <h1 className="billboard-title">{billboardItem.Name}</h1>
                      )}

                      <p className="billboard-synopsis">
                        {billboardItem.Overview ? (billboardItem.Overview.substring(0, 180) + '...') : 'A Premium streaming item from your Jellyfin server.'}
                      </p>
                      <div className="billboard-actions">
                        <button 
                          className="btn btn-primary"
                          onClick={() => {
                            if (billboardItem.Type === 'Series') {
                              handleItemClick(billboardItem);
                            } else {
                               handlePlayMedia(billboardItem.Id, billboardItem.Name, billboardItem.ProductionYear || '', false, [], 0, billboardItem.RunTimeTicks, billboardItem.UserData?.PlaybackPositionTicks || 0);
                            }
                          }}
                        >
                          <Play fill="#fff" size={16} /> Play
                        </button>
                        <button 
                          className="btn btn-secondary"
                          onClick={(e) => { e.stopPropagation(); toggleFavorite(billboardItem); }}
                        >
                          {billboardItem.UserData?.IsFavorite ? <Check size={16} /> : <Plus size={16} />}
                          {billboardItem.UserData?.IsFavorite ? 'In My List' : 'My List'}
                        </button>
                        <button className="btn btn-secondary" onClick={() => handleItemClick(billboardItem)}>
                          <Info size={16} /> More Info
                        </button>
                      </div>

                    </div>
                  </div>
                )
              )}

              {/* Slider: Networks */}
              {/* Slider: Networks */}
              {(availableNetworks.length > 0 ? availableNetworks : networks).length > 0 && (
                <div className="row">
                  <h2 className="row-header">Featured Networks</h2>
                  <div className="slider-wrapper">
                    <button className="slider-arrow slider-arrow-left" onClick={() => scrollSlider('slider-networks', 'left')}>
                      <ChevronLeft size={30} />
                    </button>
                    <div className="slider-container" id="slider-networks">
                      {(availableNetworks.length > 0 ? availableNetworks : networks).map((network) => (
                        <div 
                          key={network.name} 
                          className={`network-card ${network.className}`}
                          onClick={() => handleNetworkClick(network, 'All')}
                        >
                          <div className="network-card-content">
                            {network.name}
                          </div>
                        </div>
                      ))}
                    </div>
                    <button className="slider-arrow slider-arrow-right" onClick={() => scrollSlider('slider-networks', 'right')}>
                      <ChevronRight size={30} />
                    </button>
                  </div>
                </div>
              )}

              {/* Slider: Continue Watching */}
              {continueWatching.length > 0 && (
                <div className="row">
                  <h2 className="row-header">Continue Watching</h2>
                  <div className="slider-wrapper">
                    <button className="slider-arrow slider-arrow-left" onClick={() => scrollSlider('slider-resume', 'left')}>
                      <ChevronLeft size={30} />
                    </button>
                    <div className="slider-container" id="slider-resume">
                      {continueWatching.map((item) => (
                        <div key={item.Id} className="card horizontal" onClick={() => {
                          if (item.Type === 'Episode') {
                            const epTitle = item.SeriesName ? `${item.SeriesName} - S${item.ParentIndexNumber.toString().padStart(2, '0')}E${item.IndexNumber.toString().padStart(2, '0')}` : item.Name;
                            handlePlayMedia(item.Id, epTitle, item.Name, true, [item], 0, item.RunTimeTicks, item.UserData?.PlaybackPositionTicks || 0);
                          } else {
                            handleItemClick(item);
                          }
                        }} onMouseEnter={(e) => handleCardMouseEnter(e, item)} onMouseLeave={handleCardMouseLeave} style={{ position: 'relative' }}>
                          <img 
                            className="card-img" 
                            src={item.Type === 'Episode' ? getImageUrl(item.Id, 'Primary', '', item.UserData?.PlaybackPositionTicks) : getImageUrl(item.Id, 'Backdrop', '', item.UserData?.PlaybackPositionTicks)} 
                            alt={item.Name} 
                            loading="lazy"
                            onError={(e) => {
                              if (item.Type === 'Episode' && item.SeriesId) {
                                e.target.src = getImageUrl(item.SeriesId, 'Backdrop');
                              } else {
                                e.target.src = getImageUrl(item.Id, 'Primary');
                              }
                            }}
                          />
                          {previewActiveId === item.Id && (
                            <video
                              className="card-preview-video"
                              src={getPreviewStreamUrl(item)}
                              autoPlay
                              muted
                              loop
                              playsInline
                            />
                          )}
                          <div className="card-title-overlay">
                            {item.Type === 'Episode' && item.SeriesId ? (
                              <img 
                                className="card-logo" 
                                src={`${serverUrl}/Items/${item.SeriesId}/Images/Logo?maxHeight=40`} 
                                alt={item.SeriesName || item.Name}
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  const p = e.target.parentElement;
                                  if (p) {
                                    const fallback = p.querySelector('.card-text-title-fallback');
                                    if (fallback) fallback.style.display = 'block';
                                  }
                                }}
                              />
                            ) : item.ImageTags && item.ImageTags.Logo ? (
                              <img 
                                className="card-logo" 
                                src={`${serverUrl}/Items/${item.Id}/Images/Logo?maxHeight=40`} 
                                alt={item.Name} 
                              />
                            ) : (
                              <span className="card-text-title">
                                {item.Type === 'Episode' && item.SeriesName ? item.SeriesName : item.Name}
                              </span>
                            )}
                            {item.Type === 'Episode' && item.SeriesId && (
                              <span className="card-text-title card-text-title-fallback" style={{ display: 'none' }}>
                                {item.SeriesName || item.Name}
                              </span>
                            )}
                          </div>
                          {item.UserData && item.UserData.PlaybackPositionTicks && item.RunTimeTicks && (
                            <div className="progress-bar-container" style={{ position: 'absolute', bottom: '0', left: '0', width: '100%', height: '4px', backgroundColor: 'rgba(255,255,255,0.3)', zIndex: 5 }}>
                              <div className="progress-bar-fill" style={{ width: `${(item.UserData.PlaybackPositionTicks / item.RunTimeTicks) * 100}%`, height: '100%', backgroundColor: 'var(--accent-color)' }} />
                            </div>
                          )}

                          <div className="card-details">
                            <p className="card-title">{item.Type === 'Episode' && item.SeriesName ? item.SeriesName : item.Name}</p>
                            <div className="card-meta">
                              {item.Type === 'Episode' ? (
                                <span>S{item.ParentIndexNumber} E{item.IndexNumber}</span>
                              ) : (
                                <span>{item.ProductionYear}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <button className="slider-arrow slider-arrow-right" onClick={() => scrollSlider('slider-resume', 'right')}>
                      <ChevronRight size={30} />
                    </button>
                  </div>
                </div>
              )}

              {/* Slider: My List */}
              {/* Slider: Suggestions Based on Watch History */}
              {suggestions.length > 0 && (
                <div className="row">
                  <h2 className="row-header">Suggested for You</h2>
                  <div className="slider-wrapper">
                    <button className="slider-arrow slider-arrow-left" onClick={() => scrollSlider('slider-suggestions', 'left')}>
                      <ChevronLeft size={30} />
                    </button>
                    <div className="slider-container" id="slider-suggestions">
                      {suggestions.map((item) => {
                        const cardClass = isMobile ? "card" : "card horizontal";
                        const imageSrc = isMobile ? getImageUrl(item.Id, 'Primary') : getImageUrl(item.Id, 'Backdrop');
                        return (
                          <div key={item.Id} className={cardClass} onClick={() => handleItemClick(item)} onMouseEnter={(e) => handleCardMouseEnter(e, item)} onMouseLeave={handleCardMouseLeave}>
                            <img 
                              className="card-img" 
                              src={imageSrc} 
                              alt={item.Name} 
                              loading="lazy"
                            />
                            {previewActiveId === item.Id && (
                              <video
                                className="card-preview-video"
                                src={getPreviewStreamUrl(item)}
                                autoPlay
                                muted
                                loop
                                playsInline
                              />
                            )}
                            {!isMobile && (
                              <div className="card-title-overlay">
                                {item.ImageTags && item.ImageTags.Logo ? (
                                  <img 
                                    className="card-logo" 
                                    src={`${serverUrl}/Items/${item.Id}/Images/Logo?maxHeight=40`} 
                                    alt={item.Name} 
                                  />
                                ) : (
                                  <span className="card-text-title">{item.Name}</span>
                                )}
                              </div>
                            )}
                            <div className="card-details">
                              <p className="card-title">{item.Name}</p>
                              <div className="card-meta">
                              {item.CommunityRating && <span className="rating-pill">{item.CommunityRating.toFixed(1)}</span>}
                              <span>{item.ProductionYear}</span>
                            </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <button className="slider-arrow slider-arrow-right" onClick={() => scrollSlider('slider-suggestions', 'right')}>
                      <ChevronRight size={30} />
                    </button>
                  </div>
                </div>
              )}

              {myList.length > 0 && (

                <div className="row">
                  <h2 className="row-header">My List</h2>
                  <div className="slider-wrapper">
                    <button className="slider-arrow slider-arrow-left" onClick={() => scrollSlider('slider-mylist', 'left')}>
                      <ChevronLeft size={30} />
                    </button>
                    <div className="slider-container" id="slider-mylist">
                      {myList.map((item) => {
                        const cardClass = isMobile ? "card" : "card horizontal";
                        const imageSrc = isMobile ? getImageUrl(item.Id, 'Primary') : getImageUrl(item.Id, 'Backdrop');
                        return (
                          <div key={item.Id} className={cardClass} onClick={() => handleItemClick(item)} onMouseEnter={(e) => handleCardMouseEnter(e, item)} onMouseLeave={handleCardMouseLeave}>
                            <img 
                              className="card-img" 
                              src={imageSrc} 
                              alt={item.Name} 
                              loading="lazy"
                            />
                            {previewActiveId === item.Id && (
                              <video
                                className="card-preview-video"
                                src={getPreviewStreamUrl(item)}
                                autoPlay
                                muted
                                loop
                                playsInline
                              />
                            )}
                            {!isMobile && (
                              <div className="card-title-overlay">
                                {item.ImageTags && item.ImageTags.Logo ? (
                                  <img 
                                    className="card-logo" 
                                    src={`${serverUrl}/Items/${item.Id}/Images/Logo?maxHeight=40`} 
                                    alt={item.Name} 
                                  />
                                ) : (
                                  <span className="card-text-title">{item.Name}</span>
                                )}
                              </div>
                            )}
                            <div className="card-details">
                              <p className="card-title">{item.Name}</p>
                              <div className="card-meta">
                              {item.CommunityRating && <span className="rating-pill">{item.CommunityRating.toFixed(1)}</span>}
                              <span>{item.ProductionYear}</span>
                            </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <button className="slider-arrow slider-arrow-right" onClick={() => scrollSlider('slider-mylist', 'right')}>
                      <ChevronRight size={30} />
                    </button>
                  </div>
                </div>
              )}

              {/* Slider: Collections */}
              {collections.length > 0 && (
                <div className="row">
                  <h2 className="row-header">Featured Collections</h2>
                  <div className="slider-wrapper">
                    <button className="slider-arrow slider-arrow-left" onClick={() => scrollSlider('slider-collections', 'left')}>
                      <ChevronLeft size={30} />
                    </button>
                    <div className="slider-container" id="slider-collections">
                      {collections.map((item) => {
                        const cardClass = isMobile ? "card" : "card horizontal";
                        const imageSrc = isMobile ? getImageUrl(item.Id, 'Primary') : getImageUrl(item.Id, 'Backdrop');
                        return (
                          <div key={item.Id} className={cardClass} onClick={() => handleItemClick(item)} onMouseEnter={(e) => handleCardMouseEnter(e, item)} onMouseLeave={handleCardMouseLeave}>
                            <img 
                              className="card-img" 
                              src={imageSrc} 
                              alt={item.Name} 
                              loading="lazy"
                            />
                            {previewActiveId === item.Id && (
                              <video
                                className="card-preview-video"
                                src={getPreviewStreamUrl(item)}
                                autoPlay
                                muted
                                loop
                                playsInline
                              />
                            )}
                            {!isMobile && (
                              <div className="card-title-overlay">
                                {item.ImageTags && item.ImageTags.Logo ? (
                                  <img 
                                    className="card-logo" 
                                    src={`${serverUrl}/Items/${item.Id}/Images/Logo?maxHeight=40`} 
                                    alt={item.Name} 
                                  />
                                ) : (
                                  <span className="card-text-title">{item.Name}</span>
                                )}
                              </div>
                            )}
                            <div className="card-details">
                              <p className="card-title">{item.Name}</p>
                              <div className="card-meta">
                              <span>Collection</span>
                            </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <button className="slider-arrow slider-arrow-right" onClick={() => scrollSlider('slider-collections', 'right')}>
                      <ChevronRight size={30} />
                    </button>
                  </div>
                </div>
              )}

              {/* Slider: Top Movies */}

              <div className="row">
                <h2 className="row-header">Top 10 Movies</h2>
                <div className="slider-wrapper">
                  <button className="slider-arrow slider-arrow-left" onClick={() => scrollSlider('slider-top-movies', 'left')}>
                    <ChevronLeft size={30} />
                  </button>
                  <div className="slider-container" id="slider-top-movies">
                    {topMovies.slice(0, 10).map((item, index) => {
                      const cardClass = isMobile ? "card top10-card" : "card horizontal top10-card";
                      const imageSrc = isMobile ? getImageUrl(item.Id, 'Primary') : getImageUrl(item.Id, 'Backdrop');
                      return (
                        <div key={item.Id} className={cardClass} onClick={() => handleItemClick(item)} onMouseEnter={(e) => handleCardMouseEnter(e, item)} onMouseLeave={handleCardMouseLeave} style={{ position: 'relative', display: 'flex', alignItems: 'stretch' }}>
                          <div className="top10-rank-container">
                            <span className="top10-rank-number">{index + 1}</span>
                          </div>
                          <div className="top10-card-inner" style={{ position: 'relative', flex: 1, overflow: 'hidden' }}>
                            <img 
                              className="card-img" 
                              src={imageSrc} 
                              alt={item.Name} 
                              loading="lazy"
                            />
                            {previewActiveId === item.Id && (
                              <video
                                className="card-preview-video"
                                src={getPreviewStreamUrl(item)}
                                autoPlay
                                muted
                                loop
                                playsInline
                              />
                            )}
                            {!isMobile && (
                              <div className="card-title-overlay">
                                {item.ImageTags && item.ImageTags.Logo ? (
                                  <img 
                                    className="card-logo" 
                                    src={`${serverUrl}/Items/${item.Id}/Images/Logo?maxHeight=40`} 
                                    alt={item.Name} 
                                  />
                                ) : (
                                  <span className="card-text-title">{item.Name}</span>
                                )}
                              </div>
                            )}
                            <div className="card-details">
                              <p className="card-title">{item.Name}</p>
                              <div className="card-meta">
                                <span className="rating-pill">{item.CommunityRating ? item.CommunityRating.toFixed(1) : 'NR'}</span>
                                <span>{item.ProductionYear}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <button className="slider-arrow slider-arrow-right" onClick={() => scrollSlider('slider-top-movies', 'right')}>
                    <ChevronRight size={30} />
                  </button>
                </div>
              </div>

              {/* Slider: Top TV Shows */}
              <div className="row">
                <h2 className="row-header">Top 10 TV Shows</h2>
                <div className="slider-wrapper">
                  <button className="slider-arrow slider-arrow-left" onClick={() => scrollSlider('slider-top-shows', 'left')}>
                    <ChevronLeft size={30} />
                  </button>
                  <div className="slider-container" id="slider-top-shows">
                    {topShows.slice(0, 10).map((item, index) => {
                      const cardClass = isMobile ? "card top10-card" : "card horizontal top10-card";
                      const imageSrc = isMobile ? getImageUrl(item.Id, 'Primary') : getImageUrl(item.Id, 'Backdrop');
                      return (
                        <div key={item.Id} className={cardClass} onClick={() => handleItemClick(item)} onMouseEnter={(e) => handleCardMouseEnter(e, item)} onMouseLeave={handleCardMouseLeave} style={{ position: 'relative', display: 'flex', alignItems: 'stretch' }}>
                          <div className="top10-rank-container">
                            <span className="top10-rank-number">{index + 1}</span>
                          </div>
                          <div className="top10-card-inner" style={{ position: 'relative', flex: 1, overflow: 'hidden' }}>
                            <img 
                              className="card-img" 
                              src={imageSrc} 
                              alt={item.Name} 
                              loading="lazy"
                            />
                            {previewActiveId === item.Id && (
                              <video
                                className="card-preview-video"
                                src={getPreviewStreamUrl(item)}
                                autoPlay
                                muted
                                loop
                                playsInline
                              />
                            )}
                            {!isMobile && (
                              <div className="card-title-overlay">
                                {item.ImageTags && item.ImageTags.Logo ? (
                                  <img 
                                    className="card-logo" 
                                    src={`${serverUrl}/Items/${item.Id}/Images/Logo?maxHeight=40`} 
                                    alt={item.Name} 
                                  />
                                ) : (
                                  <span className="card-text-title">{item.Name}</span>
                                )}
                              </div>
                            )}
                            <div className="card-details">
                              <p className="card-title">{item.Name}</p>
                              <div className="card-meta">
                                <span className="rating-pill">{item.CommunityRating ? item.CommunityRating.toFixed(1) : 'NR'}</span>
                                <span>{item.ProductionYear}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <button className="slider-arrow slider-arrow-right" onClick={() => scrollSlider('slider-top-shows', 'right')}>
                    <ChevronRight size={30} />
                  </button>
                </div>
              </div>

              {/* Slider: Top Anime */}
              {topAnime.length > 0 && (
                <div className="row">
                  <h2 className="row-header">Top 10 Anime</h2>
                  <div className="slider-wrapper">
                    <button className="slider-arrow slider-arrow-left" onClick={() => scrollSlider('slider-top-anime', 'left')}>
                      <ChevronLeft size={30} />
                    </button>
                    <div className="slider-container" id="slider-top-anime">
                    {topAnime.slice(0, 10).map((item, index) => {
                      const cardClass = isMobile ? "card top10-card" : "card horizontal top10-card";
                      const imageSrc = isMobile ? getImageUrl(item.Id, 'Primary') : getImageUrl(item.Id, 'Backdrop');
                      return (
                        <div key={item.Id} className={cardClass} onClick={() => handleItemClick(item)} onMouseEnter={(e) => handleCardMouseEnter(e, item)} onMouseLeave={handleCardMouseLeave} style={{ position: 'relative', display: 'flex', alignItems: 'stretch' }}>
                          <div className="top10-rank-container">
                            <span className="top10-rank-number">{index + 1}</span>
                          </div>
                          <div className="top10-card-inner" style={{ position: 'relative', flex: 1, overflow: 'hidden' }}>
                            <img 
                              className="card-img" 
                              src={imageSrc} 
                              alt={item.Name} 
                              loading="lazy"
                            />
                            {previewActiveId === item.Id && (
                              <video
                                className="card-preview-video"
                                src={getPreviewStreamUrl(item)}
                                autoPlay
                                muted
                                loop
                                playsInline
                              />
                            )}
                            {!isMobile && (
                              <div className="card-title-overlay">
                                {item.ImageTags && item.ImageTags.Logo ? (
                                  <img 
                                    className="card-logo" 
                                    src={`${serverUrl}/Items/${item.Id}/Images/Logo?maxHeight=40`} 
                                    alt={item.Name} 
                                  />
                                ) : (
                                  <span className="card-text-title">{item.Name}</span>
                                )}
                              </div>
                            )}
                            <div className="card-details">
                              <p className="card-title">{item.Name}</p>
                              <div className="card-meta">
                                <span className="rating-pill">{item.CommunityRating ? item.CommunityRating.toFixed(1) : 'NR'}</span>
                                <span>{item.ProductionYear}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    </div>
                    <button className="slider-arrow slider-arrow-right" onClick={() => scrollSlider('slider-top-anime', 'right')}>
                      <ChevronRight size={30} />
                    </button>
                  </div>
                </div>
              )}

              {/* Slider: Recently Added Movies */}
              <div className="row">
                <h2 className="row-header">Recently Added Movies</h2>
                <div className="slider-wrapper">
                  <button className="slider-arrow slider-arrow-left" onClick={() => scrollSlider('slider-recent-movies', 'left')}>
                    <ChevronLeft size={30} />
                  </button>
                  <div className="slider-container" id="slider-recent-movies">
                    {recentlyAddedMovies.map((item) => {
                      const cardClass = isMobile ? "card" : "card horizontal";
                      const imageSrc = isMobile ? getImageUrl(item.Id, 'Primary') : getImageUrl(item.Id, 'Backdrop');
                      return (
                        <div key={item.Id} className={cardClass} onClick={() => handleItemClick(item)} onMouseEnter={(e) => handleCardMouseEnter(e, item)} onMouseLeave={handleCardMouseLeave}>
                          <img 
                            className="card-img" 
                            src={imageSrc} 
                            alt={item.Name} 
                            loading="lazy"
                          />
                          {previewActiveId === item.Id && (
                            <video
                              className="card-preview-video"
                              src={getPreviewStreamUrl(item)}
                              autoPlay
                              muted
                              loop
                              playsInline
                            />
                          )}
                          {!isMobile && (
                            <div className="card-title-overlay">
                              {item.ImageTags && item.ImageTags.Logo ? (
                                <img 
                                  className="card-logo" 
                                  src={`${serverUrl}/Items/${item.Id}/Images/Logo?maxHeight=40`} 
                                  alt={item.Name} 
                                />
                              ) : (
                                <span className="card-text-title">{item.Name}</span>
                              )}
                            </div>
                          )}
                          <div className="card-details">
                            <p className="card-title">{item.Name}</p>
                            <div className="card-meta">
                              {item.CommunityRating && <span className="rating-pill">{item.CommunityRating.toFixed(1)}</span>}
                              <span>{item.ProductionYear}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <button className="slider-arrow slider-arrow-right" onClick={() => scrollSlider('slider-recent-movies', 'right')}>
                    <ChevronRight size={30} />
                  </button>
                </div>
              </div>

              {/* Slider: Recently Added TV Shows */}
              <div className="row">
                <h2 className="row-header">Recently Added TV Shows</h2>
                <div className="slider-wrapper">
                  <button className="slider-arrow slider-arrow-left" onClick={() => scrollSlider('slider-recent-shows', 'left')}>
                    <ChevronLeft size={30} />
                  </button>
                  <div className="slider-container" id="slider-recent-shows">
                    {recentlyAddedShows.map((item) => {
                      const cardClass = isMobile ? "card" : "card horizontal";
                      const imageSrc = isMobile ? getImageUrl(item.Id, 'Primary') : getImageUrl(item.Id, 'Backdrop');
                      return (
                        <div key={item.Id} className={cardClass} onClick={() => handleItemClick(item)} onMouseEnter={(e) => handleCardMouseEnter(e, item)} onMouseLeave={handleCardMouseLeave}>
                          <img 
                            className="card-img" 
                            src={imageSrc} 
                            alt={item.Name} 
                            loading="lazy"
                          />
                          {previewActiveId === item.Id && (
                            <video
                              className="card-preview-video"
                              src={getPreviewStreamUrl(item)}
                              autoPlay
                              muted
                              loop
                              playsInline
                            />
                          )}
                          {!isMobile && (
                            <div className="card-title-overlay">
                              {item.ImageTags && item.ImageTags.Logo ? (
                                <img 
                                  className="card-logo" 
                                  src={`${serverUrl}/Items/${item.Id}/Images/Logo?maxHeight=40`} 
                                  alt={item.Name} 
                                />
                              ) : (
                                <span className="card-text-title">{item.Name}</span>
                              )}
                            </div>
                          )}
                          <div className="card-details">
                            <p className="card-title">{item.Name}</p>
                            <div className="card-meta">
                              {item.CommunityRating && <span className="rating-pill">{item.CommunityRating.toFixed(1)}</span>}
                              <span>{item.ProductionYear}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <button className="slider-arrow slider-arrow-right" onClick={() => scrollSlider('slider-recent-shows', 'right')}>
                    <ChevronRight size={30} />
                  </button>
                </div>
              </div>

            </>          ) : filterType === 'Movie' ? (
            selectedGenreView ? (
              <div className="network-view" style={{ marginTop: 'calc(var(--header-height) + 20px)' }}>
                <div className="network-header-container" style={{ margin: '0 4% 20px 4%' }}>
                  <h1 className="network-header-title">
                    <span>{selectedGenreView.name}</span>
                  </h1>
                  <button className="btn-back" onClick={() => setSelectedGenreView(null)}>
                    <ChevronLeft size={16} /> Back to Movies
                  </button>
                </div>
                {selectedGenreView.loading ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '100px 0', width: '100%', color: 'var(--text-muted)' }}>
                    <style>{`
                      @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                      }
                    `}</style>
                    <div className="spinner" style={{ border: '4px solid rgba(255,255,255,0.1)', width: '36px', height: '36px', borderRadius: '50%', borderLeftColor: 'var(--accent-color)', animation: 'spin 1s linear infinite', marginBottom: '15px' }}></div>
                    <span>Loading movies...</span>
                  </div>
                ) : selectedGenreView.items.length === 0 ? (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: '100px 0', width: '100%', color: 'var(--text-muted)', fontSize: '1.1rem' }}>
                    No movies found in this category.
                  </div>
                ) : (
                  <div className="grid-container">
                    {selectedGenreView.items.map((item) => {
                      const cardClass = isMobile ? "card" : "card horizontal";
                      const imageSrc = isMobile ? getImageUrl(item.Id, 'Primary') : getImageUrl(item.Id, 'Backdrop');
                      return (
                        <div key={item.Id} className={cardClass} onClick={() => handleItemClick(item)} onMouseEnter={(e) => handleCardMouseEnter(e, item)} onMouseLeave={handleCardMouseLeave}>
                          <img 
                            className="card-img" 
                            src={imageSrc} 
                            alt={item.Name} 
                            loading="lazy"
                          />
                          {previewActiveId === item.Id && (
                            <video
                              className="card-preview-video"
                              src={getPreviewStreamUrl(item)}
                              autoPlay
                              muted
                              loop
                              playsInline
                            />
                          )}
                          {!isMobile && (
                            <div className="card-title-overlay">
                              {item.ImageTags && item.ImageTags.Logo ? (
                                <img 
                                  className="card-logo" 
                                  src={`${serverUrl}/Items/${item.Id}/Images/Logo?maxHeight=40`} 
                                  alt={item.Name} 
                                />
                              ) : (
                                <span className="card-text-title">{item.Name}</span>
                              )}
                            </div>
                          )}
                          <div className="card-details">
                            <p className="card-title">{item.Name}</p>
                            <div className="card-meta">
                              {item.CommunityRating && <span className="rating-pill">{item.CommunityRating.toFixed(1)}</span>}
                              <span>{item.ProductionYear}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <>
                {/* Subheader with Browse All button */}
                <div className="network-header-container" style={{ margin: '20px 4% 10px 4%', borderBottom: 'none' }}>
                  <h1 className="network-header-title" style={{ fontSize: '2.2rem' }}>
                    <span>Movies</span>
                  </h1>
                  <button className="btn-back" onClick={() => handleSeeAllGenre('All Movies')}>
                    Browse All Movies
                  </button>
                </div>

                {/* Slider: Networks */}
                {(availableNetworks.length > 0 ? availableNetworks : networks).length > 0 && (
                  <div className="row">
                    <h2 className="row-header">Networks</h2>
                    <div className="slider-wrapper">
                      <button className="slider-arrow slider-arrow-left" onClick={() => scrollSlider('slider-movies-networks', 'left')}>
                        <ChevronLeft size={30} />
                      </button>
                      <div className="slider-container" id="slider-movies-networks">
                        {(availableNetworks.length > 0 ? availableNetworks : networks).map((network) => (
                          <div key={network.name} className={`network-card ${network.className || 'network-generic'}`} onClick={() => handleNetworkClick(network, 'Movie')}>
                            {network.isGeneric ? (
                              <span className="network-name">{network.name}</span>
                            ) : (
                              <span className="network-logo-placeholder">{network.name}</span>
                            )}
                          </div>
                        ))}
                      </div>
                      <button className="slider-arrow slider-arrow-right" onClick={() => scrollSlider('slider-movies-networks', 'right')}>
                        <ChevronRight size={30} />
                      </button>
                    </div>
                  </div>
                )}

                {/* Slider: Movie Collections */}
                {collections.length > 0 && (
                  <div className="row">
                    <h2 className="row-header">Movie Collections</h2>
                    <div className="slider-wrapper">
                      <button className="slider-arrow slider-arrow-left" onClick={() => scrollSlider('slider-movies-collections', 'left')}>
                        <ChevronLeft size={30} />
                      </button>
                      <div className="slider-container" id="slider-movies-collections">
                        {collections.map((item) => {
                          const cardClass = isMobile ? "card" : "card horizontal";
                          const imageSrc = isMobile ? getImageUrl(item.Id, 'Primary') : getImageUrl(item.Id, 'Backdrop');
                          return (
                            <div key={item.Id} className={cardClass} onClick={() => handleItemClick(item)} onMouseEnter={(e) => handleCardMouseEnter(e, item)} onMouseLeave={handleCardMouseLeave}>
                              <img 
                                className="card-img" 
                                src={imageSrc} 
                                alt={item.Name} 
                                loading="lazy"
                              />
                              {!isMobile && (
                                <div className="card-title-overlay">
                                  {item.ImageTags && item.ImageTags.Logo ? (
                                    <img 
                                      className="card-logo" 
                                      src={`${serverUrl}/Items/${item.Id}/Images/Logo?maxHeight=40`} 
                                      alt={item.Name} 
                                    />
                                  ) : (
                                    <span className="card-text-title">{item.Name}</span>
                                  )}
                                </div>
                              )}
                              <div className="card-details">
                                <p className="card-title">{item.Name}</p>
                                <div className="card-meta">
                                  <span>Collection</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <button className="slider-arrow slider-arrow-right" onClick={() => scrollSlider('slider-movies-collections', 'right')}>
                        <ChevronRight size={30} />
                      </button>
                    </div>
                  </div>
                )}

                {/* Slider: Continue Watching (Movies only) */}
                {continueWatching.filter(item => item.Type === 'Movie').length > 0 && (
                  <div className="row">
                    <h2 className="row-header">Continue Watching</h2>
                    <div className="slider-wrapper">
                      <button className="slider-arrow slider-arrow-left" onClick={() => scrollSlider('slider-movies-resume', 'left')}>
                        <ChevronLeft size={30} />
                      </button>
                      <div className="slider-container" id="slider-movies-resume">
                        {continueWatching.filter(item => item.Type === 'Movie').map((item) => (
                          <div key={item.Id} className="card horizontal" onClick={() => handleItemClick(item)} onMouseEnter={(e) => handleCardMouseEnter(e, item)} onMouseLeave={handleCardMouseLeave} style={{ position: 'relative' }}>
                            <img 
                              className="card-img" 
                              src={getImageUrl(item.Id, 'Backdrop', '', item.UserData?.PlaybackPositionTicks)} 
                              alt={item.Name} 
                              loading="lazy"
                              onError={(e) => {
                                e.target.src = getImageUrl(item.Id, 'Primary');
                              }}
                            />
                            {previewActiveId === item.Id && (
                              <video
                                className="card-preview-video"
                                src={getPreviewStreamUrl(item)}
                                autoPlay
                                muted
                                loop
                                playsInline
                              />
                            )}
                            <div className="card-title-overlay">
                              {item.ImageTags && item.ImageTags.Logo ? (
                                <img 
                                  className="card-logo" 
                                  src={`${serverUrl}/Items/${item.Id}/Images/Logo?maxHeight=40`} 
                                  alt={item.Name} 
                                />
                              ) : (
                                <span className="card-text-title">{item.Name}</span>
                              )}
                            </div>
                            {item.UserData && item.UserData.PlaybackPositionTicks && item.RunTimeTicks && (
                              <div className="progress-bar-container" style={{ position: 'absolute', bottom: '0', left: '0', width: '100%', height: '4px', backgroundColor: 'rgba(255,255,255,0.3)', zIndex: 5 }}>
                                <div className="progress-bar-fill" style={{ width: `${(item.UserData.PlaybackPositionTicks / item.RunTimeTicks) * 100}%`, height: '100%', backgroundColor: 'var(--accent-color)' }} />
                              </div>
                            )}
                            <div className="card-details">
                              <p className="card-title">{item.Name}</p>
                              <div className="card-meta">
                                {item.CommunityRating && <span className="rating-pill">{item.CommunityRating.toFixed(1)}</span>}
                                <span>{item.ProductionYear}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      <button className="slider-arrow slider-arrow-right" onClick={() => scrollSlider('slider-movies-resume', 'right')}>
                        <ChevronRight size={30} />
                      </button>
                    </div>
                  </div>
                )}

                {/* Slider: Top 10 Movies */}
                {topMovies.length > 0 && (
                  <div className="row">
                    <h2 className="row-header">Top 10 Movies</h2>
                    <div className="slider-wrapper">
                      <button className="slider-arrow slider-arrow-left" onClick={() => scrollSlider('slider-movies-top10', 'left')}>
                        <ChevronLeft size={30} />
                      </button>
                      <div className="slider-container" id="slider-movies-top10">
                        {topMovies.slice(0, 10).map((item, index) => {
                          const cardClass = isMobile ? "card top10-card" : "card horizontal top10-card";
                          const imageSrc = isMobile ? getImageUrl(item.Id, 'Primary') : getImageUrl(item.Id, 'Backdrop');
                          return (
                            <div key={item.Id} className={cardClass} onClick={() => handleItemClick(item)} onMouseEnter={(e) => handleCardMouseEnter(e, item)} onMouseLeave={handleCardMouseLeave} style={{ position: 'relative', display: 'flex', alignItems: 'stretch' }}>
                              <div className="top10-rank-container">
                                <span className="top10-rank-number">{index + 1}</span>
                              </div>
                              <div className="top10-card-inner" style={{ position: 'relative', flex: 1, overflow: 'hidden' }}>
                                <img 
                                  className="card-img" 
                                  src={imageSrc} 
                                  alt={item.Name} 
                                  loading="lazy"
                                />
                                {previewActiveId === item.Id && (
                                  <video
                                    className="card-preview-video"
                                    src={getPreviewStreamUrl(item)}
                                    autoPlay
                                    muted
                                    loop
                                    playsInline
                                  />
                                )}
                                {!isMobile && (
                                  <div className="card-title-overlay">
                                    {item.ImageTags && item.ImageTags.Logo ? (
                                      <img 
                                        className="card-logo" 
                                        src={`${serverUrl}/Items/${item.Id}/Images/Logo?maxHeight=40`} 
                                        alt={item.Name} 
                                      />
                                    ) : (
                                      <span className="card-text-title">{item.Name}</span>
                                    )}
                                  </div>
                                )}
                                <div className="card-details">
                                  <p className="card-title">{item.Name}</p>
                                  <div className="card-meta">
                                    <span className="rating-pill">{item.CommunityRating ? item.CommunityRating.toFixed(1) : 'NR'}</span>
                                    <span>{item.ProductionYear}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <button className="slider-arrow slider-arrow-right" onClick={() => scrollSlider('slider-movies-top10', 'right')}>
                        <ChevronRight size={30} />
                      </button>
                    </div>
                  </div>
                )}

                {/* Slider: Top Pick for You (10 Items) */}
                {movieTopPicks.length > 0 && (
                  <div className="row">
                    <h2 className="row-header">Top Picks For You</h2>
                    <div className="slider-wrapper">
                      <button className="slider-arrow slider-arrow-left" onClick={() => scrollSlider('slider-movies-picks', 'left')}>
                        <ChevronLeft size={30} />
                      </button>
                      <div className="slider-container" id="slider-movies-picks">
                        {movieTopPicks.slice(0, 10).map((item) => {
                          const cardClass = isMobile ? "card" : "card horizontal";
                          const imageSrc = isMobile ? getImageUrl(item.Id, 'Primary') : getImageUrl(item.Id, 'Backdrop');
                          return (
                            <div key={item.Id} className={cardClass} onClick={() => handleItemClick(item)} onMouseEnter={(e) => handleCardMouseEnter(e, item)} onMouseLeave={handleCardMouseLeave}>
                              <img 
                                className="card-img" 
                                src={imageSrc} 
                                alt={item.Name} 
                                loading="lazy"
                              />
                              {previewActiveId === item.Id && (
                                <video
                                  className="card-preview-video"
                                  src={getPreviewStreamUrl(item)}
                                  autoPlay
                                  muted
                                  loop
                                  playsInline
                                />
                              )}
                              {!isMobile && (
                                <div className="card-title-overlay">
                                  {item.ImageTags && item.ImageTags.Logo ? (
                                    <img 
                                      className="card-logo" 
                                      src={`${serverUrl}/Items/${item.Id}/Images/Logo?maxHeight=40`} 
                                      alt={item.Name} 
                                    />
                                  ) : (
                                    <span className="card-text-title">{item.Name}</span>
                                  )}
                                </div>
                              )}
                              <div className="card-details">
                                <p className="card-title">{item.Name}</p>
                                <div className="card-meta">
                                  <span className="rating-pill">{item.CommunityRating ? item.CommunityRating.toFixed(1) : 'NR'}</span>
                                  <span>{item.ProductionYear}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <button className="slider-arrow slider-arrow-right" onClick={() => scrollSlider('slider-movies-picks', 'right')}>
                        <ChevronRight size={30} />
                      </button>
                    </div>
                  </div>
                )}

                {/* Slider: Recently Added Movies */}
                {recentlyAddedMovies.length > 0 && (
                  <div className="row">
                    <h2 className="row-header">Recently Added Movies</h2>
                    <div className="slider-wrapper">
                      <button className="slider-arrow slider-arrow-left" onClick={() => scrollSlider('slider-movies-recent', 'left')}>
                        <ChevronLeft size={30} />
                      </button>
                      <div className="slider-container" id="slider-movies-recent">
                        {recentlyAddedMovies.map((item) => {
                          const cardClass = isMobile ? "card" : "card horizontal";
                          const imageSrc = isMobile ? getImageUrl(item.Id, 'Primary') : getImageUrl(item.Id, 'Backdrop');
                          return (
                            <div key={item.Id} className={cardClass} onClick={() => handleItemClick(item)} onMouseEnter={(e) => handleCardMouseEnter(e, item)} onMouseLeave={handleCardMouseLeave}>
                              <img 
                                className="card-img" 
                                src={imageSrc} 
                                alt={item.Name} 
                                loading="lazy"
                              />
                              {previewActiveId === item.Id && (
                                <video
                                  className="card-preview-video"
                                  src={getPreviewStreamUrl(item)}
                                  autoPlay
                                  muted
                                  loop
                                  playsInline
                                />
                              )}
                              {!isMobile && (
                                <div className="card-title-overlay">
                                  {item.ImageTags && item.ImageTags.Logo ? (
                                    <img 
                                      className="card-logo" 
                                      src={`${serverUrl}/Items/${item.Id}/Images/Logo?maxHeight=40`} 
                                      alt={item.Name} 
                                    />
                                  ) : (
                                    <span className="card-text-title">{item.Name}</span>
                                  )}
                                </div>
                              )}
                              <div className="card-details">
                                <p className="card-title">{item.Name}</p>
                                <div className="card-meta">
                                  <span className="rating-pill">{item.CommunityRating ? item.CommunityRating.toFixed(1) : 'NR'}</span>
                                  <span>{item.ProductionYear}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <button className="slider-arrow slider-arrow-right" onClick={() => scrollSlider('slider-movies-recent', 'right')}>
                        <ChevronRight size={30} />
                      </button>
                    </div>
                  </div>
                )}

                {/* Sliders: Top 3 Genres */}
                {userTopGenres.map((genre, idx) => {
                  const movies = genreMoviesMap[genre] || [];
                  if (movies.length === 0) return null;
                  const sliderId = `slider-movies-genre-${idx}`;
                  return (
                    <div key={genre} className="row">
                      <h2 className="row-header">Popular in {genre}</h2>
                      <div className="slider-wrapper">
                        <button className="slider-arrow slider-arrow-left" onClick={() => scrollSlider(sliderId, 'left')}>
                          <ChevronLeft size={30} />
                        </button>
                        <div className="slider-container" id={sliderId}>
                          {movies.map((item) => {
                            const cardClass = isMobile ? "card" : "card horizontal";
                            const imageSrc = isMobile ? getImageUrl(item.Id, 'Primary') : getImageUrl(item.Id, 'Backdrop');
                            return (
                              <div key={item.Id} className={cardClass} onClick={() => handleItemClick(item)} onMouseEnter={(e) => handleCardMouseEnter(e, item)} onMouseLeave={handleCardMouseLeave}>
                                <img 
                                  className="card-img" 
                                  src={imageSrc} 
                                  alt={item.Name} 
                                  loading="lazy"
                                />
                                {previewActiveId === item.Id && (
                                  <video
                                    className="card-preview-video"
                                    src={getPreviewStreamUrl(item)}
                                    autoPlay
                                    muted
                                    loop
                                    playsInline
                                  />
                                )}
                                {!isMobile && (
                                  <div className="card-title-overlay">
                                    {item.ImageTags && item.ImageTags.Logo ? (
                                      <img 
                                        className="card-logo" 
                                        src={`${serverUrl}/Items/${item.Id}/Images/Logo?maxHeight=40`} 
                                        alt={item.Name} 
                                      />
                                    ) : (
                                      <span className="card-text-title">{item.Name}</span>
                                    )}
                                  </div>
                                )}
                                <div className="card-details">
                                  <p className="card-title">{item.Name}</p>
                                  <div className="card-meta">
                                    <span className="rating-pill">{item.CommunityRating ? item.CommunityRating.toFixed(1) : 'NR'}</span>
                                    <span>{item.ProductionYear}</span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <button className="slider-arrow slider-arrow-right" onClick={() => scrollSlider(sliderId, 'right')}>
                          <ChevronRight size={30} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </>
            )
          ) : filterType === 'Series' ? (
            selectedGenreViewSeries ? (
              <div className="network-view" style={{ marginTop: 'calc(var(--header-height) + 20px)' }}>
                <div className="network-header-container" style={{ margin: '0 4% 20px 4%' }}>
                  <h1 className="network-header-title">
                    <span>{selectedGenreViewSeries.name}</span>
                  </h1>
                  <button className="btn-back" onClick={() => setSelectedGenreViewSeries(null)}>
                    <ChevronLeft size={16} /> Back to TV Shows
                  </button>
                </div>
                {selectedGenreViewSeries.loading ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '100px 0', width: '100%', color: 'var(--text-muted)' }}>
                    <style>{`
                      @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                      }
                    `}</style>
                    <div className="spinner" style={{ border: '4px solid rgba(255,255,255,0.1)', width: '36px', height: '36px', borderRadius: '50%', borderLeftColor: 'var(--accent-color)', animation: 'spin 1s linear infinite', marginBottom: '15px' }}></div>
                    <span>Loading TV shows...</span>
                  </div>
                ) : selectedGenreViewSeries.items.length === 0 ? (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: '100px 0', width: '100%', color: 'var(--text-muted)', fontSize: '1.1rem' }}>
                    No TV shows found in this category.
                  </div>
                ) : (
                  <div className="grid-container">
                    {selectedGenreViewSeries.items.map((item) => {
                      const cardClass = isMobile ? "card" : "card horizontal";
                      const imageSrc = isMobile ? getImageUrl(item.Id, 'Primary') : getImageUrl(item.Id, 'Backdrop');
                      return (
                        <div key={item.Id} className={cardClass} onClick={() => handleItemClick(item)} onMouseEnter={(e) => handleCardMouseEnter(e, item)} onMouseLeave={handleCardMouseLeave}>
                          <img 
                            className="card-img" 
                            src={imageSrc} 
                            alt={item.Name} 
                            loading="lazy"
                          />
                          {previewActiveId === item.Id && (
                            <video
                              className="card-preview-video"
                              src={getPreviewStreamUrl(item)}
                              autoPlay
                              muted
                              loop
                              playsInline
                            />
                          )}
                          {!isMobile && (
                            <div className="card-title-overlay">
                              {item.ImageTags && item.ImageTags.Logo ? (
                                <img 
                                  className="card-logo" 
                                  src={`${serverUrl}/Items/${item.Id}/Images/Logo?maxHeight=40`} 
                                  alt={item.Name} 
                                />
                              ) : (
                                <span className="card-text-title">{item.Name}</span>
                              )}
                            </div>
                          )}
                          <div className="card-details">
                            <p className="card-title">{item.Name}</p>
                            <div className="card-meta">
                              {item.CommunityRating && <span className="rating-pill">{item.CommunityRating.toFixed(1)}</span>}
                              <span>{item.ProductionYear}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <>
                {/* Subheader with Browse All button */}
                <div className="network-header-container" style={{ margin: '20px 4% 10px 4%', borderBottom: 'none' }}>
                  <h1 className="network-header-title" style={{ fontSize: '2.2rem' }}>
                    <span>TV Shows</span>
                  </h1>
                  <button className="btn-back" onClick={() => handleSeeAllGenreSeries('All TV Shows')}>
                    Browse All TV Shows
                  </button>
                </div>

                {/* Slider: Networks */}
                {(availableNetworks.length > 0 ? availableNetworks : networks).length > 0 && (
                  <div className="row">
                    <h2 className="row-header">Networks</h2>
                    <div className="slider-wrapper">
                      <button className="slider-arrow slider-arrow-left" onClick={() => scrollSlider('slider-shows-networks', 'left')}>
                        <ChevronLeft size={30} />
                      </button>
                      <div className="slider-container" id="slider-shows-networks">
                        {(availableNetworks.length > 0 ? availableNetworks : networks).map((network) => (
                          <div key={network.name} className={`network-card ${network.className || 'network-generic'}`} onClick={() => handleNetworkClick(network, 'Series')}>
                            {network.isGeneric ? (
                              <span className="network-name">{network.name}</span>
                            ) : (
                              <span className="network-logo-placeholder">{network.name}</span>
                            )}
                          </div>
                        ))}
                      </div>
                      <button className="slider-arrow slider-arrow-right" onClick={() => scrollSlider('slider-shows-networks', 'right')}>
                        <ChevronRight size={30} />
                      </button>
                    </div>
                  </div>
                )}

                {/* Slider: Continue Watching */}
                {continueWatching.filter(i => i.Type === 'Episode' || i.Type === 'Series').length > 0 && (
                  <div className="row">
                    <h2 className="row-header">Continue Watching</h2>
                    <div className="slider-wrapper">
                      <button className="slider-arrow slider-arrow-left" onClick={() => scrollSlider('slider-shows-resume', 'left')}>
                        <ChevronLeft size={30} />
                      </button>
                      <div className="slider-container" id="slider-shows-resume">
                        {continueWatching.filter(i => i.Type === 'Episode' || i.Type === 'Series').map((item) => {
                          const cardClass = isMobile ? "card" : "card horizontal";
                          const imageSrc = isMobile ? getImageUrl(item.Id, 'Primary') : getImageUrl(item.Id, 'Backdrop');
                          const progress = item.UserData && item.UserData.PlaybackPositionTicks && item.RunTimeTicks
                            ? (item.UserData.PlaybackPositionTicks / item.RunTimeTicks) * 100
                            : 0;
                          return (
                            <div key={item.Id} className={cardClass} onClick={() => handleItemClick(item)} onMouseEnter={(e) => handleCardMouseEnter(e, item)} onMouseLeave={handleCardMouseLeave}>
                              <img 
                                className="card-img" 
                                src={imageSrc} 
                                alt={item.Name} 
                                loading="lazy"
                              />
                              {previewActiveId === item.Id && (
                                <video
                                  className="card-preview-video"
                                  src={getPreviewStreamUrl(item)}
                                  autoPlay
                                  muted
                                  loop
                                  playsInline
                                />
                              )}
                              <div className="progress-container">
                                <div className="progress-bar" style={{ width: `${progress}%` }}></div>
                              </div>
                              {!isMobile && (
                                <div className="card-title-overlay">
                                  {item.ImageTags && item.ImageTags.Logo ? (
                                    <img 
                                      className="card-logo" 
                                      src={`${serverUrl}/Items/${item.Id}/Images/Logo?maxHeight=40`} 
                                      alt={item.Name} 
                                    />
                                  ) : (
                                    <span className="card-text-title">{item.Name}</span>
                                  )}
                                </div>
                              )}
                              <div className="card-details">
                                <p className="card-title">{item.SeriesName || item.Name}</p>
                                <div className="card-meta">
                                  {item.Type === 'Episode' && <span>S{item.ParentIndexNumber} E{item.IndexNumber}</span>}
                                  <span>{formatTicks(item.RunTimeTicks - (item.UserData ? item.UserData.PlaybackPositionTicks : 0))} left</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <button className="slider-arrow slider-arrow-right" onClick={() => scrollSlider('slider-shows-resume', 'right')}>
                        <ChevronRight size={30} />
                      </button>
                    </div>
                  </div>
                )}

                {/* Slider: Top 10 TV Shows */}
                {topShows.length > 0 && (
                  <div className="row">
                    <h2 className="row-header">Top 10 TV Shows</h2>
                    <div className="slider-wrapper">
                      <button className="slider-arrow slider-arrow-left" onClick={() => scrollSlider('slider-shows-top10', 'left')}>
                        <ChevronLeft size={30} />
                      </button>
                      <div className="slider-container" id="slider-shows-top10">
                        {topShows.slice(0, 10).map((item, index) => {
                          const cardClass = isMobile ? "card top10-card" : "card horizontal top10-card";
                          const imageSrc = isMobile ? getImageUrl(item.Id, 'Primary') : getImageUrl(item.Id, 'Backdrop');
                          return (
                            <div key={item.Id} className={cardClass} onClick={() => handleItemClick(item)} onMouseEnter={(e) => handleCardMouseEnter(e, item)} onMouseLeave={handleCardMouseLeave} style={{ position: 'relative', display: 'flex', alignItems: 'stretch' }}>
                              <div className="top10-rank-container">
                                <span className="top10-rank-number">{index + 1}</span>
                              </div>
                              <div className="top10-card-inner" style={{ position: 'relative', flex: 1, overflow: 'hidden' }}>
                                <img 
                                  className="card-img" 
                                  src={imageSrc} 
                                  alt={item.Name} 
                                  loading="lazy"
                                />
                                {previewActiveId === item.Id && (
                                  <video
                                    className="card-preview-video"
                                    src={getPreviewStreamUrl(item)}
                                    autoPlay
                                    muted
                                    loop
                                    playsInline
                                  />
                                )}
                                {!isMobile && (
                                  <div className="card-title-overlay">
                                    {item.ImageTags && item.ImageTags.Logo ? (
                                      <img 
                                        className="card-logo" 
                                        src={`${serverUrl}/Items/${item.Id}/Images/Logo?maxHeight=40`} 
                                        alt={item.Name} 
                                      />
                                    ) : (
                                      <span className="card-text-title">{item.Name}</span>
                                    )}
                                  </div>
                                )}
                                <div className="card-details">
                                  <p className="card-title">{item.Name}</p>
                                  <div className="card-meta">
                                    <span className="rating-pill">{item.CommunityRating ? item.CommunityRating.toFixed(1) : 'NR'}</span>
                                    <span>{item.ProductionYear}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <button className="slider-arrow slider-arrow-right" onClick={() => scrollSlider('slider-shows-top10', 'right')}>
                        <ChevronRight size={30} />
                      </button>
                    </div>
                  </div>
                )}

                {/* Slider: Top Picks for You */}
                {showTopPicks.length > 0 && (
                  <div className="row">
                    <h2 className="row-header">Top Picks For You</h2>
                    <div className="slider-wrapper">
                      <button className="slider-arrow slider-arrow-left" onClick={() => scrollSlider('slider-shows-picks', 'left')}>
                        <ChevronLeft size={30} />
                      </button>
                      <div className="slider-container" id="slider-shows-picks">
                        {showTopPicks.map((item) => {
                          const cardClass = isMobile ? "card" : "card horizontal";
                          const imageSrc = isMobile ? getImageUrl(item.Id, 'Primary') : getImageUrl(item.Id, 'Backdrop');
                          return (
                            <div key={item.Id} className={cardClass} onClick={() => handleItemClick(item)} onMouseEnter={(e) => handleCardMouseEnter(e, item)} onMouseLeave={handleCardMouseLeave}>
                              <img 
                                className="card-img" 
                                src={imageSrc} 
                                alt={item.Name} 
                                loading="lazy"
                              />
                              {previewActiveId === item.Id && (
                                <video
                                  className="card-preview-video"
                                  src={getPreviewStreamUrl(item)}
                                  autoPlay
                                  muted
                                  loop
                                  playsInline
                                />
                              )}
                              {!isMobile && (
                                <div className="card-title-overlay">
                                  {item.ImageTags && item.ImageTags.Logo ? (
                                    <img 
                                      className="card-logo" 
                                      src={`${serverUrl}/Items/${item.Id}/Images/Logo?maxHeight=40`} 
                                      alt={item.Name} 
                                    />
                                  ) : (
                                    <span className="card-text-title">{item.Name}</span>
                                  )}
                                </div>
                              )}
                              <div className="card-details">
                                <p className="card-title">{item.Name}</p>
                                <div className="card-meta">
                                  <span className="rating-pill">{item.CommunityRating ? item.CommunityRating.toFixed(1) : 'NR'}</span>
                                  <span>{item.ProductionYear}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <button className="slider-arrow slider-arrow-right" onClick={() => scrollSlider('slider-shows-picks', 'right')}>
                        <ChevronRight size={30} />
                      </button>
                    </div>
                  </div>
                )}

                {/* Slider: Recently Added */}
                {recentlyAddedShows.length > 0 && (
                  <div className="row">
                    <h2 className="row-header">Recently Added</h2>
                    <div className="slider-wrapper">
                      <button className="slider-arrow slider-arrow-left" onClick={() => scrollSlider('slider-shows-recent', 'left')}>
                        <ChevronLeft size={30} />
                      </button>
                      <div className="slider-container" id="slider-shows-recent">
                        {recentlyAddedShows.map((item) => {
                          const cardClass = isMobile ? "card" : "card horizontal";
                          const imageSrc = isMobile ? getImageUrl(item.Id, 'Primary') : getImageUrl(item.Id, 'Backdrop');
                          return (
                            <div key={item.Id} className={cardClass} onClick={() => handleItemClick(item)} onMouseEnter={(e) => handleCardMouseEnter(e, item)} onMouseLeave={handleCardMouseLeave}>
                              <img 
                                className="card-img" 
                                src={imageSrc} 
                                alt={item.Name} 
                                loading="lazy"
                              />
                              {previewActiveId === item.Id && (
                                <video
                                  className="card-preview-video"
                                  src={getPreviewStreamUrl(item)}
                                  autoPlay
                                  muted
                                  loop
                                  playsInline
                                />
                              )}
                              {!isMobile && (
                                <div className="card-title-overlay">
                                  {item.ImageTags && item.ImageTags.Logo ? (
                                    <img 
                                      className="card-logo" 
                                      src={`${serverUrl}/Items/${item.Id}/Images/Logo?maxHeight=40`} 
                                      alt={item.Name} 
                                    />
                                  ) : (
                                    <span className="card-text-title">{item.Name}</span>
                                  )}
                                </div>
                              )}
                              <div className="card-details">
                                <p className="card-title">{item.Name}</p>
                                <div className="card-meta">
                                  <span className="rating-pill">{item.CommunityRating ? item.CommunityRating.toFixed(1) : 'NR'}</span>
                                  <span>{item.ProductionYear}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <button className="slider-arrow slider-arrow-right" onClick={() => scrollSlider('slider-shows-recent', 'right')}>
                        <ChevronRight size={30} />
                      </button>
                    </div>
                  </div>
                )}

                {/* Sliders: Top 3 Genres */}
                {userTopGenresSeries.map((genre, idx) => {
                  const shows = genreShowsMap[genre] || [];
                  if (shows.length === 0) return null;
                  const sliderId = `slider-shows-genre-${idx}`;
                  return (
                    <div key={genre} className="row">
                      <h2 className="row-header">Popular in {genre}</h2>
                      <div className="slider-wrapper">
                        <button className="slider-arrow slider-arrow-left" onClick={() => scrollSlider(sliderId, 'left')}>
                          <ChevronLeft size={30} />
                        </button>
                        <div className="slider-container" id={sliderId}>
                          {shows.map((item) => {
                            const cardClass = isMobile ? "card" : "card horizontal";
                            const imageSrc = isMobile ? getImageUrl(item.Id, 'Primary') : getImageUrl(item.Id, 'Backdrop');
                            return (
                              <div key={item.Id} className={cardClass} onClick={() => handleItemClick(item)} onMouseEnter={(e) => handleCardMouseEnter(e, item)} onMouseLeave={handleCardMouseLeave}>
                                <img 
                                  className="card-img" 
                                  src={imageSrc} 
                                  alt={item.Name} 
                                  loading="lazy"
                                />
                                {previewActiveId === item.Id && (
                                  <video
                                    className="card-preview-video"
                                    src={getPreviewStreamUrl(item)}
                                    autoPlay
                                    muted
                                    loop
                                    playsInline
                                  />
                                )}
                                {!isMobile && (
                                  <div className="card-title-overlay">
                                    {item.ImageTags && item.ImageTags.Logo ? (
                                      <img 
                                        className="card-logo" 
                                        src={`${serverUrl}/Items/${item.Id}/Images/Logo?maxHeight=40`} 
                                        alt={item.Name} 
                                      />
                                    ) : (
                                      <span className="card-text-title">{item.Name}</span>
                                    )}
                                  </div>
                                )}
                                <div className="card-details">
                                  <p className="card-title">{item.Name}</p>
                                  <div className="card-meta">
                                    <span className="rating-pill">{item.CommunityRating ? item.CommunityRating.toFixed(1) : 'NR'}</span>
                                    <span>{item.ProductionYear}</span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <button className="slider-arrow slider-arrow-right" onClick={() => scrollSlider(sliderId, 'right')}>
                          <ChevronRight size={30} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </>
            )
          ) : (
            <div className="grid-container">
              {filteredGridItems.map((item) => {
                const cardClass = isMobile ? "card" : "card horizontal";
                const imageSrc = isMobile ? getImageUrl(item.Id, 'Primary') : getImageUrl(item.Id, 'Backdrop');
                return (
                  <div key={item.Id} className={cardClass} onClick={() => handleItemClick(item)} onMouseEnter={(e) => handleCardMouseEnter(e, item)} onMouseLeave={handleCardMouseLeave}>
                    <img 
                      className="card-img" 
                      src={imageSrc} 
                      alt={item.Name} 
                      loading="lazy"
                    />
                    {previewActiveId === item.Id && (
                      <video
                        className="card-preview-video"
                        src={getPreviewStreamUrl(item)}
                        autoPlay
                        muted
                        loop
                        playsInline
                      />
                    )}
                    {!isMobile && (
                      <div className="card-title-overlay">
                        {item.ImageTags && item.ImageTags.Logo ? (
                          <img 
                            className="card-logo" 
                            src={`${serverUrl}/Items/${item.Id}/Images/Logo?maxHeight=40`} 
                            alt={item.Name} 
                          />
                        ) : (
                          <span className="card-text-title">{item.Name}</span>
                        )}
                      </div>
                    )}
                    <div className="card-details">
                      <p className="card-title">{item.Name}</p>
                      <div className="card-meta">
                        {item.CommunityRating && <span className="rating-pill">{item.CommunityRating.toFixed(1)}</span>}
                        <span>{item.ProductionYear}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Mobile Bottom Navigation Bar */}
          {!activePlayback && (
            <nav className="mobile-bottom-nav">
              <div className={`mobile-bottom-nav-item ${filterType === 'All' ? 'active' : ''}`} onClick={() => setFilterType('All')}>
                <Home size={20} />
                <span>Home</span>
              </div>
              <div className={`mobile-bottom-nav-item ${filterType === 'Movie' ? 'active' : ''}`} onClick={() => setFilterType('Movie')}>
                <Film size={20} />
                <span>Movies</span>
              </div>
              <div className={`mobile-bottom-nav-item ${filterType === 'Series' ? 'active' : ''}`} onClick={() => setFilterType('Series')}>
                <Tv size={20} />
                <span>TV Shows</span>
              </div>
              <div className={`mobile-bottom-nav-item ${filterType === 'Anime' ? 'active' : ''}`} onClick={() => setFilterType('Anime')}>
                <Sparkles size={20} />
                <span>Anime</span>
              </div>
              <div className={`mobile-bottom-nav-item ${filterType === 'MyList' ? 'active' : ''}`} onClick={() => setFilterType('MyList')}>
                <Heart size={20} />
                <span>My List</span>
              </div>
              <div className={`mobile-bottom-nav-item ${filterType === 'BoxSet' ? 'active' : ''}`} onClick={() => setFilterType('BoxSet')}>
                <Grid size={20} />
                <span>Collections</span>
              </div>
            </nav>
          )}

          {/* 2. Netflix-Style TV Show & Movie Details Modal */}
          {selectedShow && (
            <div className="modal-overlay" onClick={() => setSelectedShow(null)}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <button className="modal-close" onClick={() => setSelectedShow(null)}>
                  <X size={20} />
                </button>
                <div 
                  className="modal-banner"
                  style={{ backgroundImage: `url(${getImageUrl(selectedShow.Id, 'Backdrop')})` }}
                >
                  <div className="modal-banner-content">
                    <h2 className="modal-title">{selectedShow.Name}</h2>
                    
                    {/* Play Button inside Banner */}
                    <div style={{ marginBottom: '20px', display: 'flex', gap: '15px' }}>
                      <button 
                        className="btn btn-primary"
                        onClick={() => {
                          if (selectedShow.Type === 'Series') {
                            if (episodes && episodes.length > 0) {
                              const ep = episodes[0];
                              handlePlayMedia(ep.Id, `${selectedShow.Name} - S${ep.ParentIndexNumber.toString().padStart(2, '0')}E${ep.IndexNumber.toString().padStart(2, '0')}`, ep.Name, true, episodes, 0, ep.RunTimeTicks, ep.UserData?.PlaybackPositionTicks || 0);
                            } else {
                              alert('Loading series content... please wait or select an episode below.');
                            }
                          } else if (selectedShow.Type === 'BoxSet') {
                            if (collectionItems && collectionItems.length > 0) {
                              handleItemClick(collectionItems[0]);
                            } else {
                              alert('Loading collection... please click an item below.');
                            }
                          } else {
                            // Movie
                            handlePlayMedia(selectedShow.Id, selectedShow.Name, selectedShow.ProductionYear || '', false, [], 0, selectedShow.RunTimeTicks, selectedShow.UserData?.PlaybackPositionTicks || 0);
                          }
                          if (selectedShow.Type !== 'BoxSet') {
                            setSelectedShow(null);
                          }
                        }}
                      >
                        <Play fill="#fff" size={16} /> Play
                      </button>
                      <button 
                        className="btn btn-secondary" 
                        onClick={() => toggleFavorite(selectedShow)} 
                        style={{ border: '1px solid rgba(255,255,255,0.2)', backgroundColor: 'rgba(0,0,0,0.5)' }}
                      >
                        {selectedShow.UserData?.IsFavorite ? <Check size={14} /> : <Plus size={14} />}
                        {selectedShow.UserData?.IsFavorite ? 'In My List' : 'Add to List'}
                      </button>
                    </div>

                    <div className="modal-meta-grid" style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
                      <span className="rating-pill" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
                        {selectedShow.CommunityRating ? selectedShow.CommunityRating.toFixed(1) : 'NR'}
                      </span>
                      <span>{selectedShow.ProductionYear}</span>
                      <span>{selectedShow.Type === 'Series' ? 'TV Show' : selectedShow.Type === 'BoxSet' ? 'Collection' : 'Movie'}</span>
                    </div>

                  </div>
                </div>

                <div className="modal-body">
                  <p className="modal-synopsis">{selectedShow.Overview || 'No synopsis description available.'}</p>
                  
                  {selectedShow.Type === 'Series' && (
                    <>
                      <div className="dropdown-container">
                        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem' }}>Episodes</h3>
                        {seasons.length > 0 && (
                          <div className="custom-select-wrapper">
                            <select 
                              className="custom-select" 
                              value={selectedSeasonId}
                              onChange={(e) => setSelectedSeasonId(e.target.value)}
                            >
                              {seasons.map((season) => (
                                <option key={season.Id} value={season.Id}>
                                  {season.Name}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>

                      <div className="episodes-list">
                        {episodes.map((ep, idx) => (
                          <div key={ep.Id} className="episode-card">
                            <div className="episode-number">
                              {ep.IndexNumber !== undefined ? ep.IndexNumber : idx + 1}
                            </div>
                            <div className="episode-thumbnail-wrapper" onClick={() => handlePlayMedia(
                              ep.Id,
                              `${selectedShow.Name} - S${ep.ParentIndexNumber.toString().padStart(2, '0')}E${ep.IndexNumber.toString().padStart(2, '0')}`,
                              ep.Name,
                              true,
                              episodes,
                              idx,
                              ep.RunTimeTicks,
                              ep.UserData?.PlaybackPositionTicks || 0
                            )}>
                              <img 
                                className="episode-thumbnail"
                                src={getImageUrl(ep.Id, 'Primary')} 
                                alt={ep.Name} 
                                onError={(e) => {
                                  e.target.src = getImageUrl(selectedShow.Id, 'Backdrop');
                                }}
                              />
                              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.3)' }}>
                                <Play fill="#fff" size={24} style={{ color: '#fff' }} />
                              </div>
                            </div>
                            <div className="episode-info">
                              <div className="episode-header">
                                <h4 className="episode-title">{ep.Name}</h4>
                                <span className="episode-duration">{formatRuntime(ep.RunTimeTicks)}</span>
                              </div>
                              <p className="episode-synopsis">{ep.Overview || 'No episode description available.'}</p>
                            </div>
                          </div>
                        ))}
                        {episodes.length === 0 && (
                          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                            No episodes found for this season.
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  {selectedShow.Type === 'BoxSet' && (
                    <>
                      <div className="dropdown-container">
                        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem' }}>Collection Items</h3>
                      </div>

                      <div className="episodes-list">
                        {collectionItems.map((item, idx) => (
                          <div key={item.Id} className="episode-card" style={{ cursor: 'pointer' }} onClick={() => handleItemClick(item)}>
                            <div className="episode-number">
                              {idx + 1}
                            </div>
                            <div className="episode-thumbnail-wrapper" style={{ width: '120px', height: '68px', position: 'relative' }}>
                              <img 
                                className="episode-thumbnail"
                                src={getImageUrl(item.Id, 'Primary')} 
                                alt={item.Name} 
                                onError={(e) => {
                                  e.target.src = getImageUrl(selectedShow.Id, 'Backdrop');
                                }}
                              />
                            </div>
                            <div className="episode-info">
                              <div className="episode-header">
                                <h4 className="episode-title">{item.Name}</h4>
                                <span className="episode-duration">{item.ProductionYear}</span>
                              </div>
                              <p className="episode-synopsis">{item.Overview || 'No description available.'}</p>
                            </div>
                          </div>
                        ))}
                        {collectionItems.length === 0 && (
                          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                            No items found in this collection.
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  {/* Collection Series Contents */}
                  {selectedShow.Type !== 'BoxSet' && itemCollectionContents.length > 0 && (
                    <div style={{ marginTop: '40px', borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '30px' }}>
                      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', marginBottom: '20px' }}>
                        Collection: {itemCollections.length > 0 ? itemCollections[0].Name : 'Related Titles'}
                      </h3>
                      <div className="grid-container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '20px', padding: 0 }}>
                        {itemCollectionContents.map((item) => {
                          const cardClass = isMobile ? "card" : "card horizontal";
                          const imageSrc = isMobile ? getImageUrl(item.Id, 'Primary') : getImageUrl(item.Id, 'Backdrop');
                          return (
                            <div key={item.Id} className={cardClass} onClick={() => handleItemClick(item)}>
                              <img 
                                className="card-img" 
                                src={imageSrc} 
                                alt={item.Name} 
                                loading="lazy"
                              />
                              {!isMobile && (
                                <div className="card-title-overlay">
                                  {item.ImageTags && item.ImageTags.Logo ? (
                                    <img 
                                      className="card-logo" 
                                      src={`${serverUrl}/Items/${item.Id}/Images/Logo?maxHeight=40`} 
                                      alt={item.Name} 
                                    />
                                  ) : (
                                    <span className="card-text-title">{item.Name}</span>
                                  )}
                                </div>
                              )}
                              <div className="card-details">
                                <p className="card-title">{item.Name}</p>
                                <div className="card-meta">
                                  {item.CommunityRating && <span className="rating-pill">{item.CommunityRating.toFixed(1)}</span>}
                                  <span>{item.ProductionYear}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* More Like This (Similar Recommendations) */}
                  {similarItems.filter(s => !itemCollectionContents.some(c => c.Id === s.Id)).length > 0 && (

                    <div style={{ marginTop: '40px', borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '30px' }}>
                      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', marginBottom: '20px' }}>More Like This</h3>
                      <div className="grid-container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '20px', padding: 0 }}>
                        {similarItems
                          .filter(s => !itemCollectionContents.some(c => c.Id === s.Id))
                          .map((item) => {
                            const cardClass = isMobile ? "card" : "card horizontal";
                            const imageSrc = isMobile ? getImageUrl(item.Id, 'Primary') : getImageUrl(item.Id, 'Backdrop');
                            return (
                              <div key={item.Id} className={cardClass} onClick={() => handleItemClick(item)}>
                                <img 
                                  className="card-img" 
                                  src={imageSrc} 
                                  alt={item.Name} 
                                  loading="lazy"
                                />
                                {!isMobile && (
                                  <div className="card-title-overlay">
                                    {item.ImageTags && item.ImageTags.Logo ? (
                                      <img 
                                        className="card-logo" 
                                        src={`${serverUrl}/Items/${item.Id}/Images/Logo?maxHeight=40`} 
                                        alt={item.Name} 
                                      />
                                    ) : (
                                      <span className="card-text-title">{item.Name}</span>
                                    )}
                                  </div>
                                )}
                                <div className="card-details">
                                  <p className="card-title">{item.Name}</p>
                                  <div className="card-meta">
                                    {item.CommunityRating && <span className="rating-pill">{item.CommunityRating.toFixed(1)}</span>}
                                    <span>{item.ProductionYear}</span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}



          {/* 3. Immersive Playback Dashboard Overlay */}
          {activePlayback && (
            <div 
              ref={playerContainerRef}
              className="player-overlay"
              onMouseMove={handleMouseMove}
              style={{ cursor: showControls ? 'default' : 'none' }}
            >
              {/* HTML5 video tag configured for direct stream */}
              <video 
                ref={videoRef}
                className="player-video"
                style={{ objectFit: aspectRatio }}
                onClick={handleVideoClick}
                onEnded={() => {
                  if (activePlayback && activePlayback.isEpisode) {
                    handleNextEpisode();
                  } else {
                    setActivePlayback(null);
                    fetchContinueWatching();
                  }
                }}
                muted={isMuted}
                crossOrigin="anonymous"
              >
                {selectedSubtitleIndex !== null && (
                  <track
                    key={`${selectedSubtitleIndex}-${selectedAudioIndex}-${videoQuality}`}
                    kind="subtitles"
                    src={`${serverUrl}/Videos/${activePlayback.id}/${mediaSourceId || '0'}/Subtitles/${selectedSubtitleIndex}/Stream.vtt?api_key=${token}`}
                    srcLang="en"
                    label="Selected Subtitle"
                    default
                    onLoad={(e) => {
                      if (e.target.track) {
                        e.target.track.mode = 'showing';
                      }
                    }}
                  />
                )}
              </video>

              {/* Skip Intro Overlay */}
              {((introMarker && currentTime >= introMarker.start && currentTime <= introMarker.end) ||
                (!introMarker && activePlayback.isEpisode && duration >= 180 && currentTime >= 10 && currentTime <= 90)) && (
                <button 
                  className="btn btn-secondary"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (videoRef.current) {
                      videoRef.current.currentTime = introMarker ? introMarker.end : 90;
                    }
                  }}
                  style={{
                    position: 'absolute',
                    bottom: '140px',
                    right: '4%',
                    zIndex: 20,
                    fontSize: '0.95rem',
                    padding: '10px 20px',
                    border: '1px solid rgba(255, 255, 255, 0.4)',
                    backgroundColor: 'rgba(20, 20, 20, 0.85)',
                    color: '#fff',
                    borderRadius: '4px',
                    fontWeight: 'bold',
                    cursor: 'pointer'
                  }}
                >
                  Skip Intro
                </button>
              )}

              {/* Next Episode / Skip Credits Card Overlay */}
              {activePlayback.isEpisode && 
               activePlayback.currentEpisodeIndex < activePlayback.episodesList.length - 1 &&
               duration > 0 && 
               (duration > 45 ? currentTime >= duration - 45 : currentTime >= duration * 0.9) && (
                <div 
                  style={{
                    position: 'absolute',
                    bottom: '140px',
                    right: '4%',
                    zIndex: 20,
                    background: 'rgba(24, 24, 24, 0.95)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    padding: '20px',
                    width: '280px',
                    boxShadow: '0 8px 30px rgba(0,0,0,0.8)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Next Episode</p>
                  <h4 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>
                    {activePlayback.episodesList[activePlayback.currentEpisodeIndex + 1]?.Name || "Episode " + (activePlayback.currentEpisodeIndex + 2)}
                  </h4>
                  <div style={{ display: 'flex', gap: '10px', marginTop: '5px' }}>
                    <button 
                      className="btn btn-primary"
                      style={{ flex: 1, padding: '8px 16px', fontSize: '0.85rem' }}
                      onClick={handleNextEpisode}
                    >
                      Play Now
                    </button>
                    <button 
                      className="btn btn-secondary"
                      style={{ flex: 1, padding: '8px 16px', fontSize: '0.85rem' }}
                      onClick={() => {
                        if (videoRef.current) videoRef.current.currentTime = duration - 1;
                      }}
                    >
                      Skip Credits
                    </button>
                  </div>
                </div>
              )}

              {/* Theater Control Overlay */}
              <div className={`player-controls ${showControls ? 'active' : 'hide'}`}>
                
                {/* Top Control Bar */}
                <div className="player-top-bar">
                  <button className="player-back-btn" onClick={() => { setActivePlayback(null); fetchContinueWatching(); }}>

                    <ChevronLeft size={36} />
                  </button>
                  <div>
                    <h2 className="player-title">{activePlayback.title}</h2>
                    {activePlayback.subtitle && (
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{activePlayback.subtitle}</p>
                    )}
                  </div>
                </div>

                {/* Bottom Control Bar */}
                <div className="player-bottom-bar">
                  
                  {/* Progress track */}
                  <div className="player-progress-container">
                    <span className="player-time">{formatTime(currentTime)}</span>
                    <div 
                      className="player-progress-bar-wrapper"
                      onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const clickPct = (e.clientX - rect.left) / rect.width;
                        if (videoRef.current) {
                          videoRef.current.currentTime = clickPct * duration;
                        }
                      }}
                      onTouchStart={handleTouchSeek}
                      onTouchMove={handleTouchSeek}
                      onMouseMove={handleProgressBarMouseMove}
                      onMouseLeave={handleProgressBarMouseLeave}
                    >
                      <div 
                        className="player-progress-bar" 
                        style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
                      />
                      <div 
                        className="player-progress-bar-handle" 
                        style={{ left: `${(currentTime / (duration || 1)) * 100}%` }}
                      />

                      {hoverTime !== null && (
                        <div 
                          className="player-timeline-preview"
                          style={{
                            position: 'absolute',
                            bottom: '25px',
                            left: `${hoverX}px`,
                            transform: 'translateX(-50%)',
                            backgroundColor: 'rgba(10, 6, 20, 0.95)',
                            border: '1px solid rgba(211, 82, 255, 0.4)',
                            borderRadius: '6px',
                            padding: '6px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '6px',
                            pointerEvents: 'none',
                            zIndex: 100,
                            boxShadow: '0 8px 24px rgba(0,0,0,0.8)',
                            backdropFilter: 'blur(10px)'
                          }}
                        >
                          {hoverImageSrc && (
                            <img 
                              src={hoverImageSrc} 
                              alt="Preview" 
                              style={{
                                width: '160px',
                                height: '90px',
                                objectFit: 'cover',
                                borderRadius: '4px',
                                border: '1px solid rgba(255, 255, 255, 0.15)'
                              }}
                              onError={(e) => {
                                e.target.style.display = 'none';
                              }}
                            />
                          )}
                          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#ffffff', fontFamily: 'var(--font-display)' }}>
                            {formatTime(hoverTime)}
                          </span>
                        </div>
                      )}
                    </div>
                    <span className="player-time">{formatTime(duration)}</span>
                  </div>

                  <div className="player-controls-row">
                    {/* Bottom Left controls */}
                    <div className="player-controls-left">
                      <button className="player-btn" onClick={handlePlayPause}>
                        {isPlaying ? (
                          <div style={{ width: '16px', height: '18px', display: 'flex', gap: '4px' }}>
                            <div style={{ width: '5px', backgroundColor: '#fff', borderRadius: '1px' }} />
                            <div style={{ width: '5px', backgroundColor: '#fff', borderRadius: '1px' }} />
                          </div>
                        ) : (
                          <Play fill="#fff" size={24} />
                        )}
                      </button>

                      <button className="player-btn" onClick={() => handleSkip(-10)}>
                        <RotateCcw size={22} />
                      </button>
                      
                      <button className="player-btn" onClick={() => handleSkip(10)}>
                        <RotateCw size={22} />
                      </button>

                      <div className="volume-control">
                        <button className="player-btn" onClick={handleToggleMute}>
                          {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                        </button>
                        <input 
                          type="range" 
                          min="0" 
                          max="1" 
                          step="0.05"
                          className="volume-slider" 
                          value={isMuted ? 0 : volume} 
                          onChange={handleVolumeChange}
                        />
                      </div>
                    </div>

                    {/* Bottom Right controls */}
                    <div className="player-controls-right">
                      <div className="track-selectors">
                        <button className="player-btn" onClick={() => { setShowTracksPopup(!showTracksPopup); setShowSettingsPopup(false); }}>
                          <Subtitles size={22} />
                        </button>
                        {showTracksPopup && (
                          <div className="tracks-popup" onClick={(e) => e.stopPropagation()}>
                            <div className="tracks-column">
                              <span className="tracks-column-header">Audio</span>
                              {audioStreams.length > 0 ? (
                                audioStreams.map(stream => (
                                  <div 
                                    key={stream.Index} 
                                    className={`track-option ${selectedAudioIndex === stream.Index ? 'active' : ''}`}
                                    onClick={() => {
                                      if (videoRef.current) {
                                        lastPlayheadTimeRef.current = videoRef.current.currentTime;
                                      }
                                      setSelectedAudioIndex(stream.Index);
                                    }}
                                  >
                                    {stream.DisplayTitle || stream.Language || `Track ${stream.Index}`}
                                  </div>
                                ))
                              ) : (
                                <div className="track-option active">Primary Track (Default)</div>
                              )}
                            </div>
                            <div className="tracks-column">
                              <span className="tracks-column-header">Subtitles</span>
                              <div 
                                className={`track-option ${selectedSubtitleIndex === null ? 'active' : ''}`}
                                onClick={() => setSelectedSubtitleIndex(null)}
                              >
                                Off
                              </div>
                              {subtitleStreams.map(stream => (
                                <div 
                                  key={stream.Index} 
                                  className={`track-option ${selectedSubtitleIndex === stream.Index ? 'active' : ''}`}
                                  onClick={() => setSelectedSubtitleIndex(stream.Index)}
                                >
                                  {stream.DisplayTitle || stream.Language || `Subtitle ${stream.Index}`}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Aspect Ratio selector */}
                      <button 
                        className="player-btn" 
                        onClick={toggleAspectRatio}
                        title={`Aspect Ratio: ${aspectRatio === 'contain' ? 'Fit' : aspectRatio === 'cover' ? 'Zoom' : 'Stretch'}`}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <span style={{ fontSize: '0.75rem', fontWeight: 800, border: '2px solid #fff', borderRadius: '4px', padding: '2px 4px', textTransform: 'uppercase' }}>
                          {aspectRatio === 'contain' ? 'Fit' : aspectRatio === 'cover' ? 'Zoom' : 'Stretch'}
                        </span>
                      </button>

                      {/* Resolution Cog settings selector */}
                      <div className="track-selectors">
                        <button className="player-btn" onClick={() => { setShowSettingsPopup(!showSettingsPopup); setShowTracksPopup(false); }}>
                          <Settings size={22} />
                        </button>
                        {showSettingsPopup && (
                          <div className="tracks-popup" style={{ bottom: '50px', right: '-10px', width: '200px' }} onClick={(e) => e.stopPropagation()}>
                            <div className="tracks-column">
                              <span className="tracks-column-header">Video Quality</span>
                              <div className={`track-option ${videoQuality === 'auto' ? 'active' : ''}`} onClick={() => { changeQuality('auto'); setShowSettingsPopup(false); }}>Auto (Direct)</div>
                              <div className={`track-option ${videoQuality === '1080p' ? 'active' : ''}`} onClick={() => { changeQuality('1080p'); setShowSettingsPopup(false); }}>1080p (4 Mbps)</div>
                              <div className={`track-option ${videoQuality === '720p' ? 'active' : ''}`} onClick={() => { changeQuality('720p'); setShowSettingsPopup(false); }}>720p (2 Mbps)</div>
                              <div className={`track-option ${videoQuality === '480p' ? 'active' : ''}`} onClick={() => { changeQuality('480p'); setShowSettingsPopup(false); }}>480p (800 Kbps)</div>
                            </div>
                          </div>
                        )}
                      </div>

                      {activePlayback.isEpisode && 
                       activePlayback.currentEpisodeIndex < activePlayback.episodesList.length - 1 && (
                        <button className="player-btn" onClick={handleNextEpisode}>
                          <SkipForward size={22} />
                        </button>
                      )}

                      <button className="player-btn" onClick={handleToggleFullscreen}>
                        {isFullscreen ? <Minimize size={22} /> : <Maximize size={22} />}
                      </button>
                    </div>
                  </div>
                  
                </div>

              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
