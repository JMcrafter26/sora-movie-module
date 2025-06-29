async function searchResults(keyword) {
    try {
        const encodedKeyword = encodeURIComponent(keyword);
        const responseText = await soraFetch(`https://api.themoviedb.org/3/search/multi?api_key=84259f99204eeb7d45c7e3d8e36c6123&query=${encodedKeyword}`);
        const data = await responseText.json();

        const transformedResults = data.results.map(result => {
            if(result.media_type === "movie" || result.title) {
                return {
                    title: result.title || result.name || result.original_title || result.original_name,
                    image: `https://image.tmdb.org/t/p/w500${result.poster_path}`,
                    href: `https://xprime.tv/title/${result.id}`
                };
            } else if(result.media_type === "tv" || result.name) {
                return {
                    title: result.name || result.title || result.original_name || result.original_title,
                    image: `https://image.tmdb.org/t/p/w500${result.poster_path}`,
                    href: `https://xprime.tv/title/t${result.id}`
                };
            } else {
                return {
                    title: result.title || result.name || result.original_name || result.original_title || "Untitled",
                    image: `https://image.tmdb.org/t/p/w500${result.poster_path}`,
                    href: `https://xprime.tv/title/t${result.id}`
                };
            }
        });

        console.log(transformedResults);
        return JSON.stringify(transformedResults);
    } catch (error) {
        console.log('Fetch error in searchResults:', error);
        return JSON.stringify([{ title: 'Error', image: '', href: '' }]);
    }
}

async function extractDetails(url) {
    try {
        if (isSeriesOrMovie(url) === "movie") {
            const match = url.match(/https:\/\/xprime\.tv\/title\/([^\/]+)/);
            if (!match) throw new Error("Invalid URL format");

            const movieId = match[1];
            const responseText = await soraFetch(`https://api.themoviedb.org/3/movie/${movieId}?api_key=84259f99204eeb7d45c7e3d8e36c6123`);
            const data = await responseText.json();

            const transformedResults = [{
                description: data.overview || 'No description available',
                aliases: `Duration: ${data.runtime ? data.runtime + " minutes" : 'Unknown'}`,
                airdate: `Released: ${data.release_date ? data.release_date : 'Unknown'}`
            }];

            console.log(transformedResults);
            return JSON.stringify(transformedResults);
        } else if (isSeriesOrMovie(url) === "series") {
            const match = url.match(/https:\/\/xprime\.tv\/title\/t([^\/]+)/);
            if (!match) throw new Error("Invalid URL format");

            const showId = match[1];
            const responseText = await soraFetch(`https://api.themoviedb.org/3/tv/${showId}?api_key=84259f99204eeb7d45c7e3d8e36c6123`);
            const data = await responseText.json();

            const transformedResults = [{
                description: data.overview || 'No description available',
                aliases: `Duration: ${data.episode_run_time && data.episode_run_time.length ? data.episode_run_time.join(', ') + " minutes" : 'Unknown'}`,
                airdate: `Aired: ${data.first_air_date ? data.first_air_date : 'Unknown'}`
            }];

            console.log(transformedResults);
            return JSON.stringify(transformedResults);
        } else {
            throw new Error("Invalid URL format");
        }
    } catch (error) {
        console.log('Details error:', error);
        return JSON.stringify([{
            description: 'Error loading description',
            aliases: 'Duration: Unknown',
            airdate: 'Aired/Released: Unknown'
        }]);
    }
}

async function extractEpisodes(url) {
    try {
        if (isSeriesOrMovie(url) === "movie") {
            const match = url.match(/https:\/\/xprime\.tv\/title\/([^\/]+)/);

            if (!match) throw new Error("Invalid URL format");
            
            const movieId = match[1];
            
            const movie = [
                { href: `https://xprime.tv/watch/${movieId}`, number: 1, title: "Full Movie" }
            ];

            console.log(movie);
            return JSON.stringify(movie);
        } else if (isSeriesOrMovie(url) === "series") {
            const match = url.match(/https:\/\/xprime\.tv\/title\/t([^\/]+)/);

            if (!match) throw new Error("Invalid URL format");
            
            const showId = match[1];
            
            const showResponseText = await soraFetch(`https://api.themoviedb.org/3/tv/${showId}?api_key=84259f99204eeb7d45c7e3d8e36c6123`);
            const showData = await showResponseText.json();
            
            let allEpisodes = [];
            for (const season of showData.seasons) {
                const seasonNumber = season.season_number;

                if(seasonNumber === 0) continue;
                
                const seasonResponseText = await soraFetch(`https://api.themoviedb.org/3/tv/${showId}/season/${seasonNumber}?api_key=84259f99204eeb7d45c7e3d8e36c6123`);
                const seasonData = await seasonResponseText.json();
                
                if (seasonData.episodes && seasonData.episodes.length) {
                    const episodes = seasonData.episodes.map(episode => ({
                        href: `https://xprime.tv/watch/${showId}/${seasonNumber}/${episode.episode_number}`,
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
        console.log('Fetch error in extractEpisodes:', error);
        return JSON.stringify([]);
    }    
}

async function extractStreamUrl(url) {
    if (!_0xCheck()) return 'https://files.catbox.moe/avolvc.mp4';

    if (isSeriesOrMovieForStreams(url) === "series") {
        const match = url.match(/xprime\.tv\/watch\/([^?]+)\/(\d+)\/(\d+)/);

        if (!match) {
            console.log('Invalid URL format for series: ' + url);
            return null;
        }

        const [, id, season, episode] = match;

        if (!id || !season || !episode) {
            console.log('Missing parameters in URL: ' + url);
            return null;
        }

        console.log('Extracting stream URL for series: ' + JSON.stringify({ id, season, episode }));

        const responseText = await soraFetch(`https://api.themoviedb.org/3/tv/${id}?api_key=84259f99204eeb7d45c7e3d8e36c6123`);
        const dataText = await responseText.json();

        const servers = [
            'primebox',
            'phoenix',
            'primenet',
            'kraken',
            'harbour',
            'volkswagen',
            'fendi'
        ];

        let streams = [];
        let subtitles = "";

        for (let i = 0; i < servers.length; i++) {
            const server = servers[i];

            if (i === 0) {
                let apiUrl = '';
                let name =  dataText.title || dataText.name || dataText.original_title || dataText.original_name;

                if (dataText.first_air_date) {
                    apiUrl = `https://backend.xprime.tv/${server}?name=${name}&fallback_year=${dataText.first_air_date.split('-')[0]}&season=${season}&episode=${episode}`;
                } else {
                    apiUrl = `https://backend.xprime.tv/${server}?name=${name}&season=${season}&episode=${episode}`;
                }

                const response = await soraFetch(apiUrl);

                if (!response && !response.ok) {
                    console.log('Error fetching data from server: ' + server);
                    continue;
                }

                let data;

                try {
                    data = await response.json();

                    // if (data && data.streams && Object.keys(data.streams).length > 0) {
                    //     const qualities = data.available_qualities;

                    //     if (qualities && qualities.length > 0) {
                    //         for (const quality of qualities) {
                    //             const stream = data.streams[quality];
                    //             if (stream) {
                    //                 streams.push({
                    //                     title: server + " - " + quality,
                    //                     streamUrl: stream,
                    //                     headers: { "Referer": "https://xprime.tv/" }
                    //                 });
                    //             }
                    //         }
                    //     }
                    // }

                    if (data && data.subtitles && data.subtitles.length > 0) {
                        const subtitle = data.subtitles.find(sub => sub.label === 'English')?.file;
                        if (subtitle) {
                            subtitles = subtitle;
                        }
                    }
                } catch (error) {
                    console.log('Error parsing data from server: ' + server);
                    continue;
                }
            } else {
                let apiUrl = '';
                let name =  dataText.title || dataText.name || dataText.original_title || dataText.original_name;

                if (dataText.first_air_date) {
                    apiUrl = `https://backend.xprime.tv/${server}?name=${name}&year=${dataText.first_air_date.split('-')[0]}&id=${id}&imdb=${dataText.imdb_id}&season=${season}&episode=${episode}`;
                } else {
                    apiUrl = `https://backend.xprime.tv/${server}?name=${name}&id=${id}&imdb=${dataText.imdb_id}&season=${season}&episode=${episode}`;
                }

                const response = await soraFetch(apiUrl);

                if (!response && !response.ok) {
                    console.log('Error fetching data from server: ' + server);
                    continue;
                }

                let data;

                try {
                    data = await response.json();

                    if (server === 'volkswagen' && data && data.url) {
                        const stream = data.url;
                        if (stream) {
                            streams.push({
                                title: server + " (German)",
                                streamUrl: stream,
                                headers: { "Referer": "https://xprime.tv/" }
                            });
                        }
                    } else if (server === 'fendi' && data && data.url) {
                        const stream = data.url;
                        if (stream) {
                            streams.push({
                                title: server + " (Italian)",
                                streamUrl: stream,
                                headers: { "Referer": "https://xprime.tv/" }
                            });
                        }
                    } else if (data && data.url) {
                        const stream = data.url;
                        if (stream) {
                            streams.push({
                                title: server,
                                streamUrl: stream,
                                headers: { "Referer": "https://xprime.tv/" }
                            });
                        }
                    }

                    if (server === 'fendi' && data.subtitles) {
                        if (data.subtitles.length > 0) {
                            subtitles = data.subtitles.find(sub => sub.language === 'eng' && (sub.name === 'English' || sub.name === 'English [CC]'))?.url;
                        }
                    } else {
                        const subtitleUrl = data.subtitle;
                        if (subtitleUrl) {
                            subtitles = subtitleUrl;
                        }
                    }
                } catch (error) {
                    console.log('Error parsing data from server: ' + server);
                    continue;
                }
            }
        }

        const result = {
            streams,
            subtitles
        };

        console.log('Result:', result);

        return JSON.stringify(result);
    } else if (isSeriesOrMovieForStreams(url) === "movie") {
        const match = url.match(/xprime\.tv\/watch\/([^?]+)/);
        if (!match) {
            console.log('Invalid URL format for movie: ' + url);
            return null;
        }

        const [, id] = match;

        if (!id) {
            console.log('Missing parameters in URL: ' + url);
            return null;
        }

        console.log('Extracting stream URL for movie: ' + JSON.stringify({ id }));

        const responseText = await soraFetch(`https://api.themoviedb.org/3/movie/${id}?api_key=84259f99204eeb7d45c7e3d8e36c6123`);
        const dataText = await responseText.json();;

        const servers = [
            'primebox',
            'phoenix',
            'primenet',
            'kraken',
            'harbour',
            'volkswagen',
            'fendi'
        ];

        let streams = [];
        let subtitles = "";

        for (let i = 1; i < servers.length; i++) {
            const server = servers[i];

            if (i === 0) {
                let apiUrl = '';
                let name =  dataText.title || dataText.name || dataText.original_title || dataText.original_name;

                if (dataText.first_air_date) {
                    apiUrl =`https://backend.xprime.tv/${server}?name=${name}&fallback_year=${dataText.first_air_date.split('-')[0]}`;
                } else {
                    apiUrl = `https://backend.xprime.tv/${server}?name=${name}`;
                }

                console.log('API URL: ' + apiUrl);
                const response = await soraFetch(apiUrl);

                if (!response && !response.ok) {
                    console.log('Error fetching data from server: ' + server);
                    continue;
                }
                
                console.log('Data from server:', data);

                let data;

                try {
                    data = await response.json();
                    
                    // if (data && data.streams && Object.keys(data.streams).length > 0) {
                    //     const qualities = data.available_qualities;

                    //     if (qualities && qualities.length > 0) {
                    //         for (const quality of qualities) {
                    //             const stream = data.streams[quality];
                    //             if (stream) {
                    //                 streams.push({
                    //                     title: server + " - " + quality,
                    //                     streamUrl: stream,
                    //                     headers: { "Referer": "https://xprime.tv/" }
                    //                 });
                    //             }
                    //         }
                    //     }
                    // }

                    if (data && data.subtitles && data.subtitles.length > 0) {
                        const subtitle = data.subtitles.find(sub => sub.label === 'English')?.file;
                        console.log('Subtitle found Primebox: ' + subtitle);
                        if (subtitle) {
                            subtitles = subtitle;
                        }
                    }
                } catch (error) {
                    console.log('Error parsing data from server: ' + server);
                    continue;
                }
            } else {
                let apiUrl = '';
                let name =  dataText.title || dataText.name || dataText.original_title || dataText.original_name;

                if (dataText.first_air_date) {
                    apiUrl =`https://backend.xprime.tv/${server}?name=${name}&year=${dataText.first_air_date.split('-')[0]}&id=${id}&imdb=${dataText.imdb_id}`;
                } else {
                    apiUrl = `https://backend.xprime.tv/${server}?name=${name}&id=${id}&imdb=${dataText.imdb_id}`;
                }
                console.log('API URL: ' + apiUrl);
                const response = await soraFetch(apiUrl);

                if (!response && !response.ok) {
                    console.log('Error fetching data from server: ' + server);
                    continue;
                }

                let data;

                try {
                    data = await response.json();

                    if (server === 'volkswagen' && data && data.url) {
                        const stream = data.url;
                        if (stream) {
                            streams.push({
                                title: server + " (German)",
                                streamUrl: stream,
                                headers: { "Referer": "https://xprime.tv/" }
                            });
                        }
                    } else if (server === 'fendi' && data && data.url) {
                        const stream = data.url;
                        if (stream) {
                            streams.push({
                                title: server + " (Italian)",
                                streamUrl: stream,
                                headers: { "Referer": "https://xprime.tv/" }
                            });
                        }
                    } else if (data && data.url) {
                        const stream = data.url;
                        if (stream) {
                            streams.push({
                                title: server,
                                streamUrl: stream,
                                headers: { "Referer": "https://xprime.tv/" }
                            });
                        }
                    }

                    if (server === 'fendi' && data.subtitles) {
                        if (data.subtitles.length > 0) {
                            subtitles = data.subtitles.find(sub => sub.language === 'eng' && (sub.name === 'English' || sub.name === 'English [CC]'))?.url;
                        }
                    } else {
                        const subtitleUrl = data.subtitle;
                        console.log('Subtitle URL: ' + subtitleUrl);
                        if (subtitleUrl && subtitleUrl !== "" && subtitleUrl !== null && subtitleUrl !== undefined) {
                            subtitles = subtitleUrl;
                        }
                    }
                } catch (error) {
                    console.log('Error parsing data from server: ' + server);
                    continue;
                }
            }
        }

        // streams.push({
        //     title: "BONUS (4K only external players)",
        //     streamUrl: `https://kendrickl-3amar.site/${id}/master.m3u8`,
        //     headers: { "Referer": "https://xprime.tv/" }
        // });

        const result = {
            streams,
            subtitles
        };

        console.log('Result:', result);
        return JSON.stringify(result);
    } else if (isSeriesOrMovieForStreams(url) === "unknown") {
        console.log('Unknown URL format: ' + url);
        return null;
    }
}

// searchResults('Naruto');
// extractEpisodes('https://xprime.tv/title/t46260');
// extractStreamUrl("https://xprime.tv/watch/46260/1/1");

// searchResults('Interstellar');
// extractEpisodes('https://xprime.tv/title/157336');
// extractStreamUrl('https://xprime.tv/watch/157336');

function isSeriesOrMovie(url) {
    const seriesRegex = /^https:\/\/xprime\.tv\/title\/t\d+$/;
    const movieRegex = /^https:\/\/xprime\.tv\/title\/\d+$/;

    if (seriesRegex.test(url)) {
        return "series";
    } else if (movieRegex.test(url)) {
        return "movie";
    } else {
        return "unknown";
    }
}

function isSeriesOrMovieForStreams(url) {
    const seriesRegex = /^https:\/\/xprime\.tv\/watch\/\d+\/\d+\/\d+$/;
    const movieRegex = /^https:\/\/xprime\.tv\/watch\/\d+$/;

    if (seriesRegex.test(url)) {
        return "series";
    } else if (movieRegex.test(url)) {
        return "movie";
    } else {
        return "unknown";
    }
}

async function soraFetch(url, options = { headers: {}, method: 'GET', body: null }) {
    try {
        return await fetchv2(url, options.headers ?? {}, options.method ?? 'GET', options.body ?? null);
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
