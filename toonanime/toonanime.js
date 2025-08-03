async function searchResults(keyword) {
    try {
        const encodedKeyword = encodeURIComponent(keyword);
        const response = await soraFetch(`https://www.toonanime.biz/api/search?keyword=${encodedKeyword}&limit=25&order=default&page=1`);
        const json = await response.json();

        const results = json.data.map(result => ({
            title: result.title,
            image: result.image,
            href: `https://www.toonanime.biz/anime-vf/${result.url}`
        }));

        console.log(results);
        return JSON.stringify(results);
    } catch (error) {
        console.log('Fetch error in searchResults: ' + error);
        return JSON.stringify([{ title: 'Error', image: '', href: '' }]);
    }
}

async function extractDetails(url) {
    try {
        const response = await soraFetch(url);
        const html = await response.text();

        const synopsisMatch = html.match(/synopsis:"([^"]*(?:\\.[^"]*)*)"/);
        const description = synopsisMatch ? 
            synopsisMatch[1]
                .replace(/\\"/g, '"')
                .replace(/\\\\/g, '\\')
                .replace(/\\n/g, ' ')
                .trim() 
            : 'No description available';

        const genresMatch = html.match(/genres:\[([^\]]+)\]/);
        const genres = genresMatch ? 
            genresMatch[1].replace(/"/g, '').replace(/,/g, ', ') : 
            'Unknown';

        const durationMatch = html.match(/duration:"([^"]+)"/);
        const duration = durationMatch ? durationMatch[1] : 'Unknown';

        const ratingMatch = html.match(/score:"([^"]+)"/);
        const rating = ratingMatch ? ratingMatch[1] : 'Unknown';

        const statusMatch = html.match(/status:"([^"]+)"/);
        const status = statusMatch ? statusMatch[1] : 'Unknown';

        const episodesMatch = html.match(/totalEpisodes:"([^"]+)"/);
        const totalEpisodes = episodesMatch ? episodesMatch[1] : 'Unknown';

        const yearMatch = html.match(/year:"([^"]+)"/);
        const year = yearMatch ? yearMatch[1] : 'Unknown';

        const seasonMatch = html.match(/season:"([^"]+)"/);
        const season = seasonMatch ? seasonMatch[1] : 'Unknown';

        const aliases = `
Genre: ${genres}
Statut: ${status}
Saison: ${season}
Année: ${year}
Épisodes: ${totalEpisodes}
Durée: ${duration} min
Note: ${rating}/10
        `.trim();

        const airdate = `Année: ${year} - Saison: ${season}`;

        const transformedResults = [{
            description,
            aliases,
            airdate
        }];

        console.log(transformedResults);
        return JSON.stringify(transformedResults);
    } catch (error) {
        console.log('Details error: ' + error);
        return JSON.stringify([{
            description: 'Error loading description',
            aliases: 'Unknown',
            airdate: 'Unknown'
        }]);
    }
}

async function extractEpisodes(url) {
    try {
        const response = await soraFetch(url);
        const html = await response.text();
        
        // Extract total episodes count using regex
        const totalEpisodesMatch = html.match(/totalEpisodes:"(\d+)"/);
        const totalEpisodes = totalEpisodesMatch ? parseInt(totalEpisodesMatch[1]) : 0;
        
        console.log(`Found ${totalEpisodes} total episodes`);
        
        let allEpisodes = [];
        
        // Create episodes array using for loop
        for (let i = 1; i <= totalEpisodes; i++) {
            allEpisodes.push({
                href: `${url}|${i}`,
                number: i,
                title: `Episode ${i}`
            });
        }
        
        console.log(allEpisodes);
        return JSON.stringify(allEpisodes);
    } catch (error) {
        console.log('Fetch error in extractEpisodes: ' + error);
        return JSON.stringify([]);
    }
}

async function extractStreamUrl(url) {
    if (!_0xCheck()) return 'https://files.catbox.moe/avolvc.mp4';

    try {
        const match = url.match(/https:\/\/www.toonanime.biz\/anime-vf\/([^\/]+)\|([^\/]+)/);
        if (!match) throw new Error("Invalid URL format");

        const episodeNumber = match[2];
        
        const cleanUrl = url.replace(/\|\d+$/, '');

        const response = await soraFetch(cleanUrl);
        const html = await response.text();

        const episodePattern = `number:\\s*${episodeNumber}[\\s\\S]*?data:\\s*\\{([\\s\\S]*?)\\}\\s*\\}(?=\\s*,\\s*\\{|\\s*\\])`;
        const episodeMatch = html.match(episodePattern);
        
        if (!episodeMatch) {
            throw new Error(`Episode ${episodeNumber} not found`);
        }
        
        console.log("Matched episode data:", episodeMatch[1]);
        
        const urlMatches = episodeMatch[1].match(/server_url:\s*"([^"]+)"/g);
        const embeds = [];
        
        if (urlMatches) {
            urlMatches.forEach(match => {
                const url = match.match(/server_url:\s*"([^"]+)"/)[1];
                embeds.push(url);
            });
        }
        
        // console.log("Found embeds:", embeds);

        let streams = [];

        for (const embed of embeds) {
            console.log(embed);
            if (embed.includes("https://play.vidcdn.xyz/dist/vdcn.html")) {
                const responseText = await soraFetch(embed);
                const htmlText = await responseText.text();

                const flexibleRegex = /\\"src\\":\\"(https:\/\/[^"]+)\\"/;
                const flexibleMatch = htmlText.match(flexibleRegex);

                // console.log(flexibleMatch);

                let stream = flexibleMatch[1];
                stream = stream.replace(/\\u0026/g, '&');
                // console.log("Flexible extraction:", stream);

                const addToStreams = {
                    title: "VidCDN",
                    streamUrl: stream,
                    headers: {
                        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:138.0) Gecko/20100101 Firefox/138.0",
                        // "Origin": "https://vidcdn.xyz",
                        // "Referer": "https://vidcdn.xyz/"
                    }
                }

                streams.push(addToStreams);
            } else if (embed.includes("https://play.vidcdn.xyz/dist/embedsen.html")) {
                const match2 = embed.match(/https:\/\/play\.vidcdn\.xyz\/dist\/embedsen\.html\?id=([^&]+)&epid=([^&]+)&data-realid=([^&]+)/);
                if (!match2) throw new Error("Invalid URL format for CDN 1");

                const id = match2[1];
                const realId = match2[3];

                const responseText = await soraFetch(`https://cdn2.vidcdn.xyz/azz/${id}?epid=${realId}`);

                if (responseText.status === 500) {
                    continue;
                }

                const json = await responseText.json();

                const addToStreams = {
                    title: "CDN 1",
                    streamUrl: json.sources[0].file,
                    headers: {
                        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:138.0) Gecko/20100101 Firefox/138.0",
                        // "Origin": "https://play.vidcdn.xyz",
                        // "Referer": "https://play.vidcdn.xyz/"
                    }
                }

                streams.push(addToStreams);
            } else if (embed.includes("https://sendvid.com/embed")) {
                const responseText = await soraFetch(embed);
                const htmlText = await responseText.text();

                if (htmlText.includes('<div class="body notfound">') && htmlText.includes('404 File Not Found')) {
                    continue;
                }

                const flexibleRegex = /source src="(https:\/\/[^"]+)\"/;
                const flexibleMatch = htmlText.match(flexibleRegex);

                // console.log(flexibleMatch);

                let stream = flexibleMatch[1];
                stream = stream.replace(/\\u0026/g, '&');
                // console.log("Flexible extraction:", stream);

                const addToStreams = {
                    title: "Sendvid",
                    streamUrl: stream,
                    headers: {
                        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:138.0) Gecko/20100101 Firefox/138.0"
                    }
                }

                streams.push(addToStreams);
            } else if (embed.includes("https://video.sibnet.ru/shell.php")) {
                console.log("Flexible extraction for Sibnet:", embed);
                const responseText = await soraFetch(embed, { encoding: 'windows-1251' });
                const htmlText = await responseText.text();

                console.log(htmlText);

                const mp4UrlMatch = htmlText.match(/src:\s*"([^"]+\.mp4)"/);
                const mp4Url = mp4UrlMatch ? mp4UrlMatch[1] : null;

                const stream = `https://video.sibnet.ru${mp4Url}`;
                console.log("Flexible extraction:", stream);

                const addToStreams = {
                    title: "Sibnet",
                    streamUrl: stream,
                    headers: {
                        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:138.0) Gecko/20100101 Firefox/138.0",
                        "Referer": "https://video.sibnet.ru/"
                    }
                }

                streams.push(addToStreams);
            }
        }

        const result = {
            streams: streams,
            subtitles: ""
        }

        console.log(JSON.stringify(result));
        return JSON.stringify(result);
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

// searchResults("solo leveling");

// extractDetails("https://www.toonanime.biz/anime-vf/solo-leveling-vf");

// extractEpisodes("https://www.toonanime.biz/anime-vf/solo-leveling-vf");

// extractStreamUrl("https://www.toonanime.biz/anime-vf/solo-leveling|1");

// searchResults("one piece");
// extractDetails("https://www.toonanime.biz/anime-vf/one-piece-vf");
// extractEpisodes("https://www.toonanime.biz/anime-vf/one-piece-vf");
// extractStreamUrl("https://www.toonanime.biz/anime-vf/one-piece-vf|1");

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
