async function searchResults(keyword) {
    try {
        const encodedKeyword = encodeURIComponent(keyword);
        const responseText = await soraFetch(`https://anify.to/search-ajax`, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            method: 'POST',
            body: `query=${encodedKeyword}`
        });
        const html = await responseText.text();

        const regex = /<a href="([^"]+)">\s*<img src="([^"]+)"[^>]*>\s*<\/a>[\s\S]+?<span class="animename[^"]*"[^>]*>([^<]+)<\/span>/g;

        const results = [];
        let match;

        while ((match = regex.exec(html)) !== null) {
            results.push({
                title: match[3].trim(),
                image: `https://anify.to${match[2].trim()}`,
                href: `https://anify.to${match[1].trim()}`
            });
        }

        console.log(results);
        return JSON.stringify(results);
    } catch (error) {
        console.log('Fetch error in searchResults: ' + error);
        return JSON.stringify([{ title: 'Error', image: '', href: '' }]);
    }
}

// searchResults("clannad");
// extractDetails("https://anify.to/anime/5349/clannad");
// extractEpisodes("https://anify.to/anime/5349/clannad");
// extractStreamUrl("https://anify.to/watch/5349/clannad/1");

// extractStreamUrl("https://anify.to/watch/1066/solo-leveling/1");

async function extractDetails(url) {
    try {
        const response = await soraFetch(url);
        const htmlText = await response.text();

        // Extract description
        const descMatch = htmlText.match(/<span class="description">([\s\S]*?)<\/span>/i);
        const description = descMatch ? descMatch[1]
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/&quot;/g, '"')
            .replace(/&#039;/g, "'")
            .replace(/\s+/g, ' ')
            .trim() : 'No description available';

        // Extract rating score
        const ratingMatch = htmlText.match(/<span class="badge badge-score">.*?([\d.]+)<\/span>/i);
        const rating = ratingMatch ? ratingMatch[1] : 'Unknown';

        // Extract age rating
        const ageRatingMatch = htmlText.match(/<span class="badge badge-rating">.*?<\/i>\s*(.*?)\s*<\/span>/i);
        const ageRating = ageRatingMatch ? ageRatingMatch[1] : 'Unknown';

        // Extract status
        const statusMatch = htmlText.match(/<span class="badge badge-status[^"]*">.*?<\/i>\s*(.*?)\s*<\/span>/i);
        const status = statusMatch ? statusMatch[1] : 'Unknown';

        // Extract year
        const yearMatch = htmlText.match(/<span class="badge badge-year">.*?<\/i>\s*(\d{4})\s*<\/span>/i);
        const year = yearMatch ? yearMatch[1] : 'Unknown';

        // Extract genres
        const genreRegex = /<span class="badge badge-genre[^"]*">.*?<\/i>\s*(.*?)\s*<\/span>/gi;
        const genreList = [];
        let genreMatch;
        while ((genreMatch = genreRegex.exec(htmlText)) !== null) {
            genreList.push(genreMatch[1].trim());
        }

        const aliases = `
Rating: ${rating}
Age Rating: ${ageRating}
Status: ${status}
Genres: ${genreList.join(', ') || 'Unknown'}
        `.trim();

        const airdate = `Released: ${year}`;

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

        const episodeRegex = /<a href="(\/watch\/[^"]+)">[\s\S]*?<span class="animename">Episode (\d+)<\/span>/g;
        const episodes = [];
        let match;

        while ((match = episodeRegex.exec(html)) !== null) {
            episodes.push({
                title: `Episode ${match[2]}`,
                href: `https://anify.to${match[1].trim()}`,
                number: parseInt(match[2], 10)
            });
        }

        console.log(episodes);
        return JSON.stringify(episodes);
    } catch (error) {
        console.log('Fetch error in extractEpisodes: ' + error);
        return JSON.stringify([]);
    }
}

async function extractStreamUrl(url) {
    if (!_0xCheck()) return 'https://files.catbox.moe/avolvc.mp4';

    try {
        const response = await soraFetch(url);
        const htmlText = await response.text();

        const iframeSrcRegex = /<iframe\s+src="([^"]+)"[^>]*><\/iframe>/g;
        const matches = [];
        let match;

        while ((match = iframeSrcRegex.exec(htmlText)) !== null) {
            matches.push(`https://anify.to${match[1]}`);
        }

        if (matches.length === 0) {
            throw new Error('Iframe source not found');
        }

        let streams = [];

        for (const iframeUrl of matches) {
            const response2 = await soraFetch(iframeUrl);
            const htmlText2 = await response2.text();

            const regex = /streaming_url\s*:\s*"([^"]+\.m3u8)"/;
            const match = htmlText2.match(regex);

            if (match) {
                const streamUrl = match[1];
                console.log("Stream URL: " + streamUrl);

                streams.push({
                    title: "Streamup",
                    streamUrl,
                    headers: {
                        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/244.178.44.111 Safari/537.36",
                        "Referer": "https://strmup.to/",
                        "Origin": "https://strmup.to"
                    }
                });
            }

            const iframeMatches = [...htmlText2.matchAll(/<iframe\s+src="([^"]+)"[^>]*><\/iframe>/g)];

            if (iframeMatches.length !== 0) {
                for (const iframeMatch of iframeMatches) {
                    const rawSrc = iframeMatch[1];
                    const iframeSrc = rawSrc;

                    try {
                        const response3 = await soraFetch(iframeSrc);
                        const htmlText3 = await response3.text();

                        const scriptMatch = htmlText3.match(/<script[^>]*>\s*(eval\(function\(p,a,c,k,e,d[\s\S]*?)<\/script>/);
                        if (!scriptMatch) continue;

                        const unpackedScript = unpack(scriptMatch[1]);

                        const regex2 = /file:\s*"([^"]+)"/;
                        const match3 = unpackedScript.match(regex2);
                        const streamUrl = match3 ? match3[1] : '';

                        console.log("Filemoon Stream URL: " + streamUrl);

                        streams.push({
                            title: "FileMoon",
                            streamUrl,
                            headers: {
                                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/244.178.44.111 Safari/537.36"
                            }
                        });
                    } catch (err) {
                        console.log("Failed to fetch iframe: " + iframeSrc + " " + err);
                    }
                }
            }
        }

        const result = {
            streams,
            subtitles: ""
        };

        console.log(result);
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

class Unbaser {
    constructor(base) {
        /* Functor for a given base. Will efficiently convert
          strings to natural numbers. */
        this.ALPHABET = {
            62: "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ",
            95: "' !\"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~'",
        };
        this.dictionary = {};
        this.base = base;
        // fill elements 37...61, if necessary
        if (36 < base && base < 62) {
            this.ALPHABET[base] = this.ALPHABET[base] ||
                this.ALPHABET[62].substr(0, base);
        }
        // If base can be handled by int() builtin, let it do it for us
        if (2 <= base && base <= 36) {
            this.unbase = (value) => parseInt(value, base);
        }
        else {
            // Build conversion dictionary cache
            try {
                [...this.ALPHABET[base]].forEach((cipher, index) => {
                    this.dictionary[cipher] = index;
                });
            }
            catch (er) {
                throw Error("Unsupported base encoding.");
            }
            this.unbase = this._dictunbaser;
        }
    }
    _dictunbaser(value) {
        /* Decodes a value to an integer. */
        let ret = 0;
        [...value].reverse().forEach((cipher, index) => {
            ret = ret + ((Math.pow(this.base, index)) * this.dictionary[cipher]);
        });
        return ret;
    }
}

function detect(source) {
    /* Detects whether `source` is P.A.C.K.E.R. coded. */
    return source.replace(" ", "").startsWith("eval(function(p,a,c,k,e,");
}

function unpack(source) {
    /* Unpacks P.A.C.K.E.R. packed js code. */
    let { payload, symtab, radix, count } = _filterargs(source);
    if (count != symtab.length) {
        throw Error("Malformed p.a.c.k.e.r. symtab.");
    }
    let unbase;
    try {
        unbase = new Unbaser(radix);
    }
    catch (e) {
        throw Error("Unknown p.a.c.k.e.r. encoding.");
    }
    function lookup(match) {
        /* Look up symbols in the synthetic symtab. */
        const word = match;
        let word2;
        if (radix == 1) {
            //throw Error("symtab unknown");
            word2 = symtab[parseInt(word)];
        }
        else {
            word2 = symtab[unbase.unbase(word)];
        }
        return word2 || word;
    }
    source = payload.replace(/\b\w+\b/g, lookup);
    return _replacestrings(source);
    function _filterargs(source) {
        /* Juice from a source file the four args needed by decoder. */
        const juicers = [
            /}\('(.*)', *(\d+|\[\]), *(\d+), *'(.*)'\.split\('\|'\), *(\d+), *(.*)\)\)/,
            /}\('(.*)', *(\d+|\[\]), *(\d+), *'(.*)'\.split\('\|'\)/,
        ];
        for (const juicer of juicers) {
            //const args = re.search(juicer, source, re.DOTALL);
            const args = juicer.exec(source);
            if (args) {
                let a = args;
                if (a[2] == "[]") {
                    //don't know what it is
                    // a = list(a);
                    // a[1] = 62;
                    // a = tuple(a);
                }
                try {
                    return {
                        payload: a[1],
                        symtab: a[4].split("|"),
                        radix: parseInt(a[2]),
                        count: parseInt(a[3]),
                    };
                }
                catch (ValueError) {
                    throw Error("Corrupted p.a.c.k.e.r. data.");
                }
            }
        }
        throw Error("Could not make sense of p.a.c.k.e.r data (unexpected code structure)");
    }
    function _replacestrings(source) {
        /* Strip string lookup table (list) and replace values in source. */
        /* Need to work on this. */
        return source;
    }
}