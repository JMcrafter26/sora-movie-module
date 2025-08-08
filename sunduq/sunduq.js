async function searchResults(keyword) {
    try {
        const encodedKeyword = encodeURIComponent(keyword);
        const responseText = await soraFetch(`https://api.themoviedb.org/3/search/multi?api_key=9801b6b0548ad57581d111ea690c85c8&query=${encodedKeyword}&include_adult=false`);
        const data = await responseText.json();

        const transformedResults = data.results.map(result => {
            if(result.media_type === "movie" || result.title) {
                return {
                    title: result.title || result.name || result.original_title || result.original_name,
                    image: `https://image.tmdb.org/t/p/w500${result.poster_path}`,
                    href: `movie/${result.id}`
                };
            } else if(result.media_type === "tv" || result.name) {
                return {
                    title: result.name || result.title || result.original_name || result.original_title,
                    image: `https://image.tmdb.org/t/p/w500${result.poster_path}`,
                    href: `tv/${result.id}/1/1`
                };
            } else {
                return {
                    title: result.title || result.name || result.original_name || result.original_title || "Untitled",
                    image: `https://image.tmdb.org/t/p/w500${result.poster_path}`,
                    href: `tv/${result.id}/1/1`
                };
            }
        });

        console.log('Transformed Results: ' + transformedResults);
        return JSON.stringify(transformedResults);
    } catch (error) {
        console.log('Fetch error in searchResults:' + error);
        return JSON.stringify([{ title: 'Error', image: '', href: '' }]);
    }
}

async function extractDetails(url) {
    try {
        if(url.includes('movie')) {
            const match = url.match(/movie\/([^\/]+)/);
            if (!match) throw new Error("Invalid URL format");

            const movieId = match[1];
            const responseText = await soraFetch(`https://api.themoviedb.org/3/movie/${movieId}?api_key=ad301b7cc82ffe19273e55e4d4206885`);
            const data = await responseText.json();

            const transformedResults = [{
                description: data.overview || 'No description available',
                aliases: `Duration: ${data.runtime ? data.runtime + " minutes" : 'Unknown'}`,
                airdate: `Released: ${data.release_date ? data.release_date : 'Unknown'}`
            }];

            return JSON.stringify(transformedResults);
        } else if(url.includes('tv')) {
            const match = url.match(/tv\/([^\/]+)/);
            if (!match) throw new Error("Invalid URL format");

            const showId = match[1];
            const responseText = await soraFetch(`https://api.themoviedb.org/3/tv/${showId}?api_key=ad301b7cc82ffe19273e55e4d4206885`);
            const data = await responseText.json();

            const transformedResults = [{
                description: data.overview || 'No description available',
                aliases: `Duration: ${data.episode_run_time && data.episode_run_time.length ? data.episode_run_time.join(', ') + " minutes" : 'Unknown'}`,
                airdate: `Aired: ${data.first_air_date ? data.first_air_date : 'Unknown'}`
            }];

            console.log(JSON.stringify(transformedResults));
            return JSON.stringify(transformedResults);
        } else {
            throw new Error("Invalid URL format");
        }
    } catch (error) {
        console.log('Details error: ' + error);
        return JSON.stringify([{
            description: 'Error loading description',
            aliases: 'Duration: Unknown',
            airdate: 'Aired/Released: Unknown'
        }]);
    }
}

async function extractEpisodes(url) {
    try {
        if(url.includes('movie')) {
            const match = url.match(/movie\/([^\/]+)/);
            
            if (!match) throw new Error("Invalid URL format");
            
            const movieId = match[1];
            
            const movie = [
                { href: `movie/${movieId}`, number: 1, title: "Full Movie" }
            ];

            console.log(movie);
            return JSON.stringify(movie);
        } else if(url.includes('tv')) {
            const match = url.match(/tv\/([^\/]+)\/([^\/]+)\/([^\/]+)/);
            
            if (!match) throw new Error("Invalid URL format");
            
            const showId = match[1];
            
            const showResponseText = await soraFetch(`https://api.themoviedb.org/3/tv/${showId}?api_key=ad301b7cc82ffe19273e55e4d4206885`);
            const showData = await showResponseText.json();
            
            let allEpisodes = [];
            for (const season of showData.seasons) {
                const seasonNumber = season.season_number;

                if(seasonNumber === 0) continue;
                
                const seasonResponseText = await soraFetch(`https://api.themoviedb.org/3/tv/${showId}/season/${seasonNumber}?api_key=ad301b7cc82ffe19273e55e4d4206885`);
                const seasonData = await seasonResponseText.json();
                
                if (seasonData.episodes && seasonData.episodes.length) {
                    const episodes = seasonData.episodes.map(episode => ({
                        href: `tv/${showId}/${seasonNumber}/${episode.episode_number}`,
                        number: episode.episode_number,
                        title: episode.name || ""
                    }));
                    allEpisodes = allEpisodes.concat(episodes);
                }
            }
            
            console.log(allEpisodes);
            return JSON.stringify(allEpisodes);
        } else {
            throw new Error("Invalid URL format");
        }
    } catch (error) {
        console.log('Fetch error in extractEpisodes: ' + error);
        return JSON.stringify([]);
    }    
}

extractStreamUrl(`tv/1396/1/1`);

async function extractStreamUrl(url) {
    try {
        const match = url.match(/(movie|tv)\/(.+)/);
        if (!match) throw new Error('Invalid URL format');
        const [, type, path] = match;

        let streams = [];

        // --- Vidzee Fetches (Parallel) ---
        const vidzeePromises = Array.from({ length: 5 }, (_, i) => {
            const sr = i + 1;
            const apiUrl = type === 'movie'
                ? `https://player.vidzee.wtf/api/server?id=${path}&sr=${sr}`
                : (() => {
                    const [showId, seasonNumber, episodeNumber] = path.split('/');
                    return `https://player.vidzee.wtf/api/server?id=${showId}&sr=${sr}&ss=${seasonNumber}&ep=${episodeNumber}`;
                })();

            return soraFetch(apiUrl)
                .then(res => res.json())
                .then(data => {
                    if (!data.url) return null;
                    const stream = data.url.find(source =>
                        source.lang?.toLowerCase() === 'english'
                    );
                    if (!stream) return null;

                    return {
                        title: `Vidzee - ${data.provider}`,
                        streamUrl: stream.link,
                        headers: {
                            'Origin': 'https://player.vidzee.wtf',
                            'Referer': data.headers?.Referer || ''
                        }
                    };
                })
                .catch(() => null);
        });

        const vidzeeResults = await Promise.allSettled(vidzeePromises);
        
        for (const result of vidzeeResults) {
            if (result.status === 'fulfilled' && result.value) {
                streams.push(result.value);
            }
        }

        // --- VixSrc ---
        try {
            const vixsrcUrl = type === 'movie'
                ? `https://vixsrc.to/movie/${path}`
                : (() => {
                    const [showId, seasonNumber, episodeNumber] = path.split('/');
                    return `https://vixsrc.to/tv/${showId}/${seasonNumber}/${episodeNumber}`;
                })();
            const html = await soraFetch(vixsrcUrl).then(res => res.text());

            if (html.includes('window.masterPlaylist')) {
                const urlMatch = html.match(/url:\s*['"]([^'"]+)['"]/);
                const tokenMatch = html.match(/['"]?token['"]?\s*:\s*['"]([^'"]+)['"]/);
                const expiresMatch = html.match(/['"]?expires['"]?\s*:\s*['"]([^'"]+)['"]/);

                if (urlMatch && tokenMatch && expiresMatch) {
                    const baseUrl = urlMatch[1];
                    const token = tokenMatch[1];
                    const expires = expiresMatch[1];

                    if (baseUrl.includes('?b=1')) {
                        streams.push({
                            title: `VixSrc`,
                            streamUrl: `${baseUrl}&token=${token}&expires=${expires}&h=1&lang=en`,
                            headers: { Referer: "https://vixsrc.to/" }
                        });
                    } else {
                        streams.push({
                            title: `VixSrc`,
                            streamUrl: `${baseUrl}?token=${token}&expires=${expires}&h=1&lang=en`,
                            headers: { Referer: "https://vixsrc.to/" }
                        });
                    }
                }
            }

            if (!streams) {
                const m3u8Match = html.match(/(https?:\/\/[^'"\s]+\.m3u8[^'"\s]*)/);
                if (m3u8Match) {
                     streams.push({
                        title: `VixSrc`,
                        streamUrl: m3u8Match[1],
                        headers: { Referer: "https://vixsrc.to/" }
                    });
                }
            }

            if (!streams) {
                const scriptMatches = html.match(/<script[^>]*>(.*?)<\/script>/gs);
                if (scriptMatches) {
                    for (const script of scriptMatches) {
                        const streamMatch = script.match(/['"]?(https?:\/\/[^'"\s]+(?:\.m3u8|playlist)[^'"\s]*)/);
                        if (streamMatch) {
                            streams.push({
                                title: `VixSrc`,
                                streamUrl: streamMatch[1],
                                headers: { Referer: "https://vixsrc.to/" }
                            });
                            break;
                        }
                    }
                }
            }

            if (!streams) {
                const videoMatch = html.match(/(?:src|source|url)['"]?\s*[:=]\s*['"]?(https?:\/\/[^'"\s]+(?:\.mp4|\.m3u8|\.mpd)[^'"\s]*)/);
                if (videoMatch) {
                    streams.push({
                        title: `VixSrc`,
                        streamUrl: videoMatch[2] || videoMatch[1],
                        headers: { Referer: "https://vixsrc.to/" }
                    });
                }
            }
        } catch {
            console.log('VixSrc failed silently');
        }

        // --- XPrime Fetches (Parallel) ---
        const xprimeBaseUrl = 'https://xprime.tv/watch';
        let xprimeApiUrls = [];

        if (type === 'movie') {
            xprimeApiUrls.push(`${xprimeBaseUrl}/${path}`);
        } else if (type === 'tv') {
            // path: showId/season/episode
            const [showId, season, episode] = path.split('/');
            xprimeApiUrls.push(`${xprimeBaseUrl}/${showId}/${season}/${episode}`);
        }

        const xprimeServers = [
            'primebox', 'phoenix', 'primenet', 'kraken', 'harbour', 'volkswagen', 'fendi'
        ];

        // For each server, prepare the appropriate XPrime backend API URLs
        const xprimeFetchPromises = [];

        // --- Fetch TMDB metadata for XPrime ---
        let xprimeMetadata;
        if (type === 'movie') {
            const metadataRes = await soraFetch(`https://api.themoviedb.org/3/movie/${path}?api_key=84259f99204eeb7d45c7e3d8e36c6123`);
            xprimeMetadata = await metadataRes.json();

            for (const server of xprimeServers) {
                let apiUrl = '';
                const name = xprimeMetadata.title || xprimeMetadata.name || xprimeMetadata.original_title || xprimeMetadata.original_name || '';

                if (server === xprimeServers[0]) {
                    if (xprimeMetadata.release_date) {
                        apiUrl = `https://backend.xprime.tv/${server}?name=${encodeURIComponent(name)}&fallback_year=${xprimeMetadata.release_date.split('-')[0]}`;
                    } else {
                        apiUrl = `https://backend.xprime.tv/${server}?name=${encodeURIComponent(name)}`;
                    }
                } else {
                    if (xprimeMetadata.release_date) {
                        apiUrl = `https://backend.xprime.tv/${server}?name=${encodeURIComponent(name)}&year=${xprimeMetadata.release_date.split('-')[0]}&id=${path}&imdb=${xprimeMetadata.imdb_id || ''}`;
                    } else {
                        apiUrl = `https://backend.xprime.tv/${server}?name=${encodeURIComponent(name)}&id=${path}&imdb=${xprimeMetadata.imdb_id || ''}`;
                    }
                }

                xprimeFetchPromises.push(
                    soraFetch(apiUrl)
                        .then(res => res.json())
                        .then(data => {
                            if (server === 'volkswagen' && data?.url) {
                                streams.push({
                                    title: `XPrime - ${server} (German)`,
                                    streamUrl: data.url,
                                    headers: { Referer: "https://xprime.tv/" }
                                });
                            } else if (server === 'fendi' && data?.url) {
                                streams.push({
                                    title: `XPrime - ${server} (Italian)`,
                                    streamUrl: data.url,
                                    headers: { Referer: "https://xprime.tv/" }
                                });
                            } else if (data?.url) {
                                streams.push({
                                    title: `XPrime - ${server}`,
                                    streamUrl: data.url,
                                    headers: { Referer: "https://xprime.tv/" }
                                });
                            }

                            // subtitles from fendi
                            if (server === 'fendi' && data?.subtitles?.length) {
                                const engSub = data.subtitles.find(sub => sub.language === 'eng' && (sub.name === 'English' || sub.name === 'English [CC]'));
                                if (engSub) {
                                    subtitles = engSub.url;
                                }
                            } else if (data?.subtitle) {
                                subtitles = data.subtitle;
                            }
                        })
                        .catch(() => { })
                );
            }
        } else if (type === 'tv') {
            const [showId, season, episode] = path.split('/');
            const metadataRes = await soraFetch(`https://api.themoviedb.org/3/tv/${showId}?api_key=84259f99204eeb7d45c7e3d8e36c6123`);
            xprimeMetadata = await metadataRes.json();

            for (const server of xprimeServers) {
                let apiUrl = '';
                const name = xprimeMetadata.title || xprimeMetadata.name || xprimeMetadata.original_title || xprimeMetadata.original_name || '';

                if (server === xprimeServers[0]) {
                    if (xprimeMetadata.first_air_date) {
                        apiUrl = `https://backend.xprime.tv/${server}?name=${encodeURIComponent(name)}&fallback_year=${xprimeMetadata.first_air_date.split('-')[0]}&season=${season}&episode=${episode}`;
                    } else {
                        apiUrl = `https://backend.xprime.tv/${server}?name=${encodeURIComponent(name)}&season=${season}&episode=${episode}`;
                    }
                } else {
                    if (xprimeMetadata.first_air_date) {
                        apiUrl = `https://backend.xprime.tv/${server}?name=${encodeURIComponent(name)}&year=${xprimeMetadata.first_air_date.split('-')[0]}&id=${showId}&imdb=${xprimeMetadata.imdb_id || ''}&season=${season}&episode=${episode}`;
                    } else {
                        apiUrl = `https://backend.xprime.tv/${server}?name=${encodeURIComponent(name)}&id=${showId}&imdb=${xprimeMetadata.imdb_id || ''}&season=${season}&episode=${episode}`;
                    }
                }

                xprimeFetchPromises.push(
                    soraFetch(apiUrl)
                        .then(res => res.json())
                        .then(data => {
                            if (server === 'volkswagen' && data?.url) {
                                streams.push({
                                    title: `XPrime - ${server} (German)`,
                                    streamUrl: data.url,
                                    headers: { Referer: "https://xprime.tv/" }
                                });
                            } else if (server === 'fendi' && data?.url) {
                                streams.push({
                                    title: `XPrime - ${server} (Italian)`,
                                    streamUrl: data.url,
                                    headers: { Referer: "https://xprime.tv/" }
                                });
                            } else if (data?.url) {
                                streams.push({
                                    title: `XPrime - ${server}`,
                                    streamUrl: data.url,
                                    headers: { Referer: "https://xprime.tv/" }
                                });
                            }

                            // subtitles from fendi
                            if (server === 'fendi' && data?.subtitles?.length) {
                                const engSub = data.subtitles.find(sub => sub.language === 'eng' && (sub.name === 'English' || sub.name === 'English [CC]'));
                                if (engSub) {
                                    subtitles = engSub.url;
                                }
                            } else if (data?.subtitle) {
                                subtitles = data.subtitle;
                            }
                        })
                        .catch(() => { })
                );
            }
        }

        // Await all XPrime fetches
        await Promise.allSettled(xprimeFetchPromises);

        // --- CloudStream Pro (silent fallback) ---
        try {
            const cloudStreamUrl = type === 'movie'
                ? `https://cdn.moviesapi.club/embed/movie/${path}`
                : (() => {
                    const [showId, seasonNumber, episodeNumber] = path.split('/');
                    return `https://cdn.moviesapi.club/embed/tv/${showId}/${seasonNumber}/${episodeNumber}`;
                })();

            const html = await soraFetch(cloudStreamUrl).then(res => res.text());
            const embedRegex = /<iframe[^>]*src="([^"]+)"[^>]*>/g;
            const embedUrl = Array.from(html.matchAll(embedRegex), m => m[1].trim()).find(Boolean);

            if (embedUrl) {
                const completedUrl = embedUrl.startsWith('http') ? embedUrl : `https:${embedUrl}`;
                const html2 = await soraFetch(completedUrl).then(res => res.text());
                const match2 = html2.match(/src:\s*['"]([^'"]+)['"]/);

                if (match2 && match2[1]) {
                    const src = `https://cloudnestra.com${match2[1]}`;
                    const html3 = await soraFetch(src).then(res => res.text());
                    const match3 = html3.match(/file:\s*['"]([^'"]+)['"]/);

                    if (match3 && match3[1]) {
                        streams.push({
                            title: "CloudStream Pro",
                            streamUrl: match3[1],
                            headers: {}
                        });
                    }
                }
            }
        } catch (e) {
            console.log('CloudStream Pro fallback failed silently');
        }

        // --- Subtitles ---
        let subtitles = "";
        try {
            const subtitleApiUrl = type === 'movie'
                ? `https://sub.wyzie.ru/search?id=${path}`
                : (() => {
                    const [showId, seasonNumber, episodeNumber] = path.split('/');
                    return `https://sub.wyzie.ru/search?id=${showId}&season=${seasonNumber}&episode=${episodeNumber}`;
                })();

            const subtitleTrackResponse = await soraFetch(subtitleApiUrl);
            const subtitleTrackData = await subtitleTrackResponse.json();

            let subtitleTrack = subtitleTrackData.find(track =>
                track.display.includes('English') && ['ASCII', 'UTF-8'].includes(track.encoding)
            ) || subtitleTrackData.find(track =>
                track.display.includes('English') && track.encoding === 'CP1252'
            ) || subtitleTrackData.find(track =>
                track.display.includes('English') && track.encoding === 'CP1250'
            ) || subtitleTrackData.find(track =>
                track.display.includes('English') && track.encoding === 'CP850'
            );

            if (subtitleTrack) {
                subtitles = subtitleTrack.url;
            }
        } catch {
            console.log('Subtitle extraction failed silently.');
        }

        const result = { streams, subtitles };
        console.log('Result:', JSON.stringify(result));
        return JSON.stringify(result);
    } catch (error) {
        console.log('Fetch error in extractStreamUrl:', error);
        return JSON.stringify({ streams: [], subtitles: "" });
    }
}

async function soraFetch(url, options = { headers: {}, method: 'GET', body: null, encoding: 'utf-8' }) {
    try {
        return await fetchv2(
            url,
            options.headers ?? {},
            options.method ?? 'GET',
            options.body ?? null,
            true,
            options.encoding ?? 'utf-8'
        );
    } catch(e) {
        try {
            return await fetch(url, options);
        } catch(error) {
            return null;
        }
    }
}

function _0xCheck() {
    var _0x1a = typeof _0xB4F2 === 'function';
    var _0x2b = typeof _0x7E9A === 'function';
    return _0x1a && _0x2b ? (function(_0x3c) {
        return _0x7E9A(_0x3c);
    })(_0xB4F2()) : !1;
}

function _0x7E9A(_){return((___,____,_____,______,_______,________,_________,__________,___________,____________)=>(____=typeof ___,_____=___&&___[String.fromCharCode(...[108,101,110,103,116,104])],______=[...String.fromCharCode(...[99,114,97,110,99,105])],_______=___?[...___[String.fromCharCode(...[116,111,76,111,119,101,114,67,97,115,101])]()]:[],(________=______[String.fromCharCode(...[115,108,105,99,101])]())&&_______[String.fromCharCode(...[102,111,114,69,97,99,104])]((_________,__________)=>(___________=________[String.fromCharCode(...[105,110,100,101,120,79,102])](_________))>=0&&________[String.fromCharCode(...[115,112,108,105,99,101])](___________,1)),____===String.fromCharCode(...[115,116,114,105,110,103])&&_____===16&&________[String.fromCharCode(...[108,101,110,103,116,104])]===0))(_)}
