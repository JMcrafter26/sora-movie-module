async function searchResults(keyword) {
    try {
        const encodedKeyword = encodeURIComponent(keyword);
        const responseText = await soraFetch(`https://sudatchi-api.vercel.app/api/search?q=${encodedKeyword}`);
        const data = await responseText.json();

        const transformedResults = data.media.map(result => {
            return {
                title: result.title.english || result.title.romaji || result.title.native,
                image: result.coverImage.large || result.coverImage.extraLarge || result.coverImage.medium,
                href: `https://sudatchi.com/anime/${result.id}`
            };
        });

        return JSON.stringify(transformedResults);
    } catch (error) {
        console.log('Fetch error in searchResults: ' + error);
        return JSON.stringify([{ title: 'Error', image: '', href: '' }]);
    }
}

async function extractDetails(url) {
    try {
        const match = url.match(/https:\/\/sudatchi\.com\/anime\/([^\/]+)/);
        if (!match) throw new Error("Invalid URL format");

        const showId = match[1];
        const responseText = await soraFetch(`https://sudatchi.com/api/anime/${showId}`);
        const data = await responseText.json();

        const transformedResults = [{
            description: data.description || 'No description available',
            aliases: `Duration: ${data.duration ? data.duration : "Unknown"}`,
            airdate: `Aired: ${data.startDate.day}.${data.startDate.month}.${data.startDate.year}` || 'Aired: Unknown'
        }];

        console.log(transformedResults);
        return JSON.stringify(transformedResults);
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
        const match = url.match(/https:\/\/sudatchi\.com\/anime\/([^\/]+)/);
            
        if (!match) throw new Error("Invalid URL format");
            
        const showId = match[1];
        const responseText = await soraFetch(`https://sudatchi.com/api/anime/${showId}`);
        const data = await responseText.json();

        const transformedResults = data.episodes.map(episode => {
            return {
                href: `https://sudatchi.com/watch/${showId}/${episode.number}`,
                number: episode.number,
                title: episode.title || ""
            };
        });
        
        console.log(transformedResults);
        return JSON.stringify(transformedResults);
    } catch (error) {
        console.log('Fetch error in extractEpisodes: ' + error);
        return JSON.stringify([]);
    }    
}

async function extractStreamUrl(url) {
    if (!_0xCheck()) return 'https://files.catbox.moe/avolvc.mp4';

    try {
        const match = url.match(/https:\/\/sudatchi\.com\/watch\/([^\/]+)\/([^\/]+)/);
        if (!match) throw new Error("Invalid URL format");

        const showId = match[1];
        const episodeNumber = match[2];

        try {
            const episodesApiUrl = `https://sudatchi.com/api/episode/${showId}/${episodeNumber}`;

            const responseTextEpisodes = await soraFetch(episodesApiUrl);
            const episodesData = await responseTextEpisodes.json();

            const episode = episodesData?.episodes?.find(episode => String(episode.number) === episodeNumber);

            const streamApiUrl = `https://sudatchi.com/api/streams?episodeId=${episode.id}`;
            
            // const responseTextStream = await soraFetch(streamApiUrl);
            // const streamData = await responseTextStream.text();

            // console.log(streamData);



            
            // const hlsSource = `https://sudatchi.com/${streamData.url}`;

            // const responseFile = await fetch(hlsSource);
            // const fileData = await responseFile.text();

            // console.log(fileData);

            // const audioRegex = /#EXT-X-MEDIA:[^\n]*TYPE=AUDIO[^\n]*URI="(https?:\/\/[^"]+)"/;
            // const audioMatch = fileData.match(audioRegex);

            // if (audioMatch && audioMatch[1]) {
            //     const audioUrl = audioMatch[1];

            //     console.log(audioUrl);

            //     return audioUrl;
            // }

            // const subtitleTrack = episodesData.subtitlesMap["1"];

            // const result = {
            //     stream: hlsSource ? hlsSource : null,
            //     subtitles: subtitleTrack ? `https://ipfs.sudatchi.com${subtitleTrack}` : null,
            // };
            
            console.log(streamApiUrl);
            return streamApiUrl;
        } catch (err) {
            console.log(`Fetch error for show ${showId}:`, err);
        }
        
        return null;
    } catch (error) {
        console.log('Fetch error in extractStreamUrl: ' + error);

        const result = {
            streams: [],
            subtitles: ""
        };

        console.log(result);
        return JSON.stringify(result);
    }
}

// extractStreamUrl(`https://sudatchi.com/watch/167143/1`);

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
