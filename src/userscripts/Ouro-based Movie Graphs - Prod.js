// ==UserScript==
// @name         Ouro-based Movie Graphs - Prod
// @namespace    http://tampermonkey.net/
// @version      7.3
// @description  Use the Ouro framework to cross ref movies
// @author       You

// @grant        unsafeWindow
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// @grant        GM_listValues
// @grant        GM_addStyle

// @match        https://api.themoviedb.org/3/movie/*?language=en-US&append_to_response=credits,release_dates&api_key=*
// @match        https://movies-api.accel.li/api/v2/movie_details.json?movie_id=*
// @match        https://www.imdb.com/title/*/*
// @match        https://www.imdb.com/title/*
// @match        *://plex.tv/api/resources?includeHttps=1&X-Plex-Token=*
// @match        *://*.plex.direct:*/library/sections?X-Plex-Token=*
// @match        *://*.plex.direct:*/library/sections/*/all?X-Plex-Token=*&title=*&year=*
// @match        *://*.plex.direct:*/library/sections/*/all?X-Plex-Token=*&X-Plex-Container-Start=*&X-Plex-Container-Size=*
// @match        *://*.plex.direct:*/library/metadata/*?X-Plex-Token=*
// @match        *://app.plex.tv/desktop/*
// @match        *://app.plex.tv/desktop/#!/server/*
// @match        https://*/*.json*
// @match        file:///Volumes/Media/Movies/*.json
// @match        http://server:8080/media/*json

// @match        *://yts.gg/browse-movies*
// @match        *://yts.gg/movies/*
// @match        *://yts.gg/trending-movies
// @match        *://yts.gg/home
// @match        *://yts.gg/

// @require      https://raw.githubusercontent.com/16-9/ouro/main/src/ouro.js
// @require      https://raw.githubusercontent.com/16-9/ouro/main/src/scraper.js
// @require      https://raw.githubusercontent.com/16-9/ouro/main/src/graph.js
// ==/UserScript==

//                                   .:-----.
//                            :#@@@@%###++++*##%@@@@@*:.
//                        .@@@%:                      +%@@.
//                     .@@@:.        :*##:     =         .@%
//                   =@@:        .-###%@@@@@@@@=      .@@. .%%.
//                 -@#    *%@@@@@@%-.        -@%             .#@.
//                %@: +@@@+--%@=              .%@-  #@@@@%++ =%+
//              :@#:@@%-  =@*.                  .#@= -@%    %*
//             :@@@@=   .@%.                       =@# #%   -
//             @@@=   .@@#                           .%%:%@. :%@=
//            #@%    %@@#                OURO                  *@@+
//           -@*   -@@@%                                        +@+@:
//           #@   +@#-@.    Object Unified Reflective Ontology   ##-@=
//           %+  +@* *%    a JavaScript AOP Metaobject Protocol  =@.=@
//           %- =@*  @%                                          :@: @#
//           %- @@.  #%       The Forging of the Ouroboros       +@  @%
//           ##=@+   -@.    Out of the void, the forge is lit.   @+ -@%
//           #@*@=   -@%     The serpent bites its own tail,    #% .@@#
//            @@@=   =@@-        and from the circle,          %% .@@@+
//            *@@=   -@@@.        true creation begins.      =@= +@%%%
//             %@%   :@%-@*                                 @@.=@@-=@:
//              %@=   @@..@@.      Userscript loader      %@:+@@= -@=
//               #@.  :@%  -%@:                        =@@*@@#.  +@-
//                =@-  *@+   .%@@=                  =@@@@@+.    %%.
//                  #@: %@=     *@@@@@%--------=@@@@%*-      .#@=
//                    %@-#@%       #@@@*:.....            :@@@=
//                      =@@@@-         #@@@@@@@#=-=#@@@@@@@@:
//                         -@@@%             ...--:..*@@@.
//                             :#@@@%#*-    :+##%@@@=:
//                                    .::---:.
//

// v1.0 Able to replace Locate movie meta and torrent
// v2.0 Able to replace Available on Plex (generic2.5) for browse pages.
// v3.0 YTS Ultimate Ad-Interceptor Neutralizer (Hardened)
// v4.0 Able to replace Available on Plex (generic2.5) for movie pages
// v5.0 Collapsible JSON Syntax Highlighter with Path Tracking
// v6.0 Caching trait extension
// v7.0 Huge refactoring using antigravity

/* global Ouro Trait Class RouteURL NativeElement DOMValue Extractor DOMExtractor JSONExtractor Page Exportable Downloadable */
/* global APIContent JSONContent DOMContent HTMLContent XMLContent JSONPage DOMPage XMLPage HTMLPage */
/* global Cacheable sessionCache localCache domainCache globalCache Graph */
/* global MovieDownloadable MovieGraph PlexRecord movieJSON movieDirectoryListing */
/* global TMDB tmdbHTMLPage tmdbAPIPage tmdbMovieInfoPage */
/* global YTS ytsHTMLPage ytsAPIPage ytsMovieInfoPage ytsMovieInfoPageThroughYTS_ID ytsMovieInfoPageThroughIMDB_ID ytsBrowsePage ytsMoviePage */
/* global IMDB imdbHTMLPage imdbAPIPage imdbMoviePage imdbMoviePageWithYTS */
/* global Plex plexServerInfoPage plexLibraryPage plexHTMLPage plexMoviePage plexBrowsePage plexAPIPage plexSearchPage plexSearchPageByNameYear plexSearchPageByPlexKey plexInventoryPage */

Ouro.boros;
Ouro.exportTo(unsafeWindow);

function getSecret(key, description = key) {
    let val = GM_getValue(`secret_${key}`, null);
    if (!val) {
        val = window.prompt(`[Ouro Setup] Enter your ${description}:`)?.trim();
        if (val) GM_setValue(`secret_${key}`, val);
    }
    return val;
}

console.groupCollapsed("[Ouro — Page Definitions]");

new Trait({
    name: "MovieDownloadable",
    methods: {
        async downloadFiles() {
            // 1. JIT Enrichment: 'this' correctly points to the Page instance
            if (!this.data.tmdb) {
                console.info("[Ouro - JIT] Fetching TMDB data for download...");
                await this.enrichWith("tmdb", tmdbMovieInfoPage, (d) => ({
                    movieId: d.yts?.imdb_id || d.imdb?.id,
                }));
            }

            // 2. Resolve filenames with guaranteed TMDb data
            const filetitle = `${this.data.tmdb?.title || this.data.yts?.title || this.data.imdb?.title} (${this.data.tmdb?.year || this.data.yts?.year || this.data.imdb?.year})`;

            // 3. Leverage the agnostic utilities provided by the Downloadable trait
            this.downloadPage(`${filetitle}.ini`);
            this.downloadPage(`${filetitle}.json`);

            const url = this.data.yts?.torrent?.url;
            if (url) {
                this.downloadUrl(`${filetitle}.torrent`, url);
            }

            // 4. Update the graph
            const imdbId = this.data?.imdb?.id || this.data?.yts?.imdb_id;
            const graph = {
                ...(imdbId && { imdb_id: imdbId }),
                ...(this.data?.tmdb?.id && { tmdb_id: this.data.tmdb.id }),
                ...(this.data?.yts?.id && { yts_id: this.data.yts.id }),
                ...(this.data?.yts?.slug && { yts_slug: this.data.yts.slug }),
            };

            MovieGraph.put(graph);
            console.info(
                `[Ouro - Graph] created MovieGraph(${JSON.stringify(graph)})`,
            );
        },
    },
});

// ============================================================================
// TMDB PAGES HIERARCHY
// ============================================================================
Page.register({
    name: "TMDB",
    class: {
        apiKey: { init: undefined, ifNeeded: () => getSecret("tmdbAPIkey") },
        providers: {
            tmdbKey: () => TMDB.apiKey,
        },
        imagePath: "https://image.tmdb.org/t/p/original",
        encodingLanguage: {
            aa: "aar",
            ab: "abk",
            af: "afr",
            ak: "aka",
            am: "amh",
            ar: "ara",
            az: "aze",
            be: "bel",
            bg: "bul",
            bm: "bam",
            bn: "ben",
            bo: "tib",
            bs: "bos",
            ca: "cat",
            cn: "chi",
            cr: "cre",
            cs: "cze",
            cy: "wel",
            da: "dan",
            de: "ger",
            dz: "dzo",
            el: "gre",
            en: "eng",
            es: "spa",
            et: "est",
            eu: "baq",
            fa: "per",
            fi: "fin",
            fil: "tgl",
            fr: "fre",
            ga: "gle",
            gl: "glg",
            gsw: "gsw",
            gu: "guj",
            he: "heb",
            hi: "hin",
            hr: "hrv",
            ht: "hat",
            hu: "hun",
            hy: "arm",
            id: "ind",
            ig: "ibo",
            is: "ice",
            it: "ita",
            iu: "iku",
            ja: "jpn",
            jv: "jav",
            ka: "geo",
            kk: "kaz",
            km: "khm",
            kn: "kan",
            ko: "kor",
            ku: "kur",
            ky: "kir",
            la: "lat",
            lb: "ltz",
            lg: "lug",
            ln: "lin",
            lo: "lao",
            lt: "lit",
            lv: "lav",
            mi: "mao",
            mk: "mac",
            ml: "mal",
            mn: "mon",
            mo: "rum",
            mr: "mar",
            ms: "may",
            mt: "mlt",
            my: "bur",
            nan: "chi",
            nb: "nob",
            ne: "nep",
            nl: "dut",
            no: "nor",
            or: "ori",
            os: "oss",
            pa: "pan",
            pl: "pol",
            ps: "pus",
            pt: "por",
            ro: "rum",
            rom: "rom",
            ru: "rus",
            rw: "kin",
            sa: "san",
            sh: "hrv",
            sk: "slo",
            sl: "slv",
            so: "som",
            sq: "alb",
            sr: "srp",
            st: "sot",
            sv: "swe",
            sw: "swa",
            ta: "tam",
            te: "tel",
            th: "tha",
            tl: "tgl",
            tn: "tsn",
            tr: "tur",
            tw: "twi",
            ug: "uig",
            uk: "ukr",
            ur: "urd",
            vi: "vie",
            wo: "wol",
            xh: "xho",
            yi: "yid",
            yo: "yor",
            yue: "chi",
            zh: "chi",
            zu: "zul",
        },
    },
});
TMDB.register({
    name: "tmdbHTMLPage",
    traits: [HTMLContent, MovieDownloadable],
});
TMDB.register({
    name: "tmdbAPIPage",
    traits: [JSONContent, Cacheable(sessionCache, "scrape", "route.signature")],
});
tmdbAPIPage.register({
    name: "tmdbMovieInfoPage",
    description: "TMDB Movie Info API",
    class: {
        routeTemplate:
            "https://api.themoviedb.org/3/movie/${movieId}?language=en-US&append_to_response=credits,release_dates&api_key=${tmdbKey}",
    },
    schema: {
        // 1. Direct Field Mappings & Aliases
        id: "id",
        title: "title",
        original_title: "original_title",
        tagline: "tagline",
        description: "tagline",
        overview: "overview",
        synopsis: "overview",
        release_date: "release_date",
        date: [
            "release_date",
            function (d) {
                return d ? `${d}T00:00:00Z` : "";
            },
        ],
        imdb_id: "imdb_id",
        original_language: "original_language",
        language: [
            "original_language",
            function (lang) {
                return TMDB.encodingLanguage?.[lang] || lang || "";
            },
        ],
        belongs_to_collection: "belongs_to_collection",
        collection: [
            "belongs_to_collection",
            function (c) {
                return c?.name || "";
            },
        ],
        media_type: [
            ".",
            function () {
                return 9;
            },
        ],

        // 2. Genres & URLs
        genres: "genres",
        genre: [
            "genres",
            function (genres) {
                return Array.isArray(genres)
                    ? genres.map((g) => g.name).join(", ")
                    : "";
            },
        ],

        poster_url: [
            "poster_path",
            function (p) {
                return p ? `${TMDB.imagePath}${p}` : "";
            },
        ],
        backdrop_url: [
            "backdrop_path",
            function (p) {
                return p ? `${TMDB.imagePath}${p}` : "";
            },
        ],
        collection_poster_url: [
            "poster_path",
            function (p) {
                return p ? `${TMDB.imagePath}${p}` : "";
            },
        ],
        collection_backdrop_url: [
            "backdrop_path",
            function (p) {
                return p ? `${TMDB.imagePath}${p}` : "";
            },
        ],
        url: [
            "id",
            function (id) {
                return id
                    ? `https://www.themoviedb.org/movie/${id}?language=en-US`
                    : "";
            },
        ],
        imdb_url: [
            "imdb_id",
            function (id) {
                return id
                    ? `https://www.imdb.com/title/${id}/?ref_=fn_al_tt_1`
                    : "";
            },
        ],

        // 3. Credits & Cast
        artists: [
            "credits.cast",
            function (cast) {
                return Array.isArray(cast) ? cast.map((c) => c.name) : [];
            },
        ],
        artist: [
            "credits.cast",
            function (cast) {
                return Array.isArray(cast)
                    ? cast.map((c) => c.name).join(", ")
                    : "";
            },
        ],
        directors: [
            "credits.crew",
            function (crew) {
                return Array.isArray(crew)
                    ? crew
                          .filter(
                              (c) =>
                                  c.job === "Director" ||
                                  c.job?.includes("Assistant Director"),
                          )
                          .map((c) => c.name)
                    : [];
            },
        ],
        producers: [
            "credits.crew",
            function (crew) {
                return Array.isArray(crew)
                    ? crew
                          .filter(
                              (c) =>
                                  c.job === "Producer" ||
                                  c.job === "Executive Producer",
                          )
                          .map((c) => c.name)
                    : [];
            },
        ],
        screenwriters: [
            "credits.crew",
            function (crew) {
                return Array.isArray(crew)
                    ? crew.filter((c) => c.job === "Writer").map((c) => c.name)
                    : [];
            },
        ],

        // 4. Intermediate Raw Data needed by extract()
        release_results: "release_dates.results",
    },
    extract() {
        const data = this.data;

        // 1. API Guard: If TMDB returned an error instead of a movie, abort extracting!
        if (!data.id) {
            this.data = { throttled: true };
            return;
        }
        data.tmdb_id = data.id;
        // 2. Earliest Release Year Calculation
        const releaseResults = data.release_results;
        const releaseDates = Array.isArray(releaseResults)
            ? releaseResults
                  .flatMap((rd) => rd.release_dates || [])
                  .map((rd) => rd.release_date)
                  .filter(Boolean)
                  .sort()
            : [];
        data.year = (releaseDates[0] || data.release_date || "").substring(
            0,
            4,
        );

        // 3. Safe Array Fallbacks for iTunes MOVI XML Plist
        const artists = data.artists || [];
        const directors = data.directors || [];
        const producers = data.producers || [];
        const screenwriters = data.screenwriters || [];

        // 4. iTunes MOVI XML Plist
        const dStart = "/key><array><dict><key>name</key><string";
        const dJoin = "</string></dict><dict><key>name</key><string>";
        const dEnd = "/string></dict></array>";

        data.iTunMOVI =
            `<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd"><plist version="1.0"><dict><key>cast` +
            `<${dStart}>${data.artists.join(dJoin)}<${dEnd}` +
            `<key>directors<${dStart}>${data.directors.join(dJoin)}<${dEnd}` +
            `<key>producers<${dStart}>${data.producers.join(dJoin)}<${dEnd}` +
            `<key>screenwriters<${dStart}>${data.screenwriters.join(dJoin)}<${dEnd}</dict></plist>`;

        // 5. MPAA / Certification Ratings (US Releases)
        const us = Array.isArray(releaseResults)
            ? releaseResults.find((r) => r.iso_3166_1 === "US")
            : null;
        const validReleases = Array.isArray(us?.release_dates)
            ? us.release_dates.filter((r) => r.certification !== "")
            : [];

        if (validReleases.length > 0) {
            const typePriority = {
                premiere: 1,
                theatrical_limited: 2,
                theatrical: 3,
                digital: 4,
                physical: 5,
                tv: 6,
            };
            const defaultOrder = 7;

            validReleases.sort((a, b) => {
                const orderA = typePriority[a.type] || defaultOrder;
                const orderB = typePriority[b.type] || defaultOrder;
                if (orderA !== orderB) return orderA - orderB;
                return (a.release_date || "").localeCompare(
                    b.release_date || "",
                );
            });

            data.mpa_rating = validReleases[0]?.certification || "";
        } else {
            data.mpa_rating = "";
        }

        // 4. iTunes EXTC Rating
        if (data.mpa_rating) {
            const extcList = [
                "us-tv|TV-MA|600|",
                "us-tv|TV-14|500|",
                "us-tv|TV-PG|400|",
                "us-tv|TV-G|300|",
                "us-tv|TV-Y|200|",
                "us-tv|TV-Y7|100|",
                "mpaa|UNRATED|600|",
                "mpaa|NC-17|500|",
                "mpaa|R|400|",
                "mpaa|PG-13|300|",
                "mpaa|PG|200|",
                "mpaa|G|100|",
                "mpaa|bunch_o_sphincters|0|",
            ];
            data.iTunEXTC =
                extcList.find((e) => e.includes(`|${data.mpa_rating}|`)) || "";
        } else {
            data.iTunEXTC = "";
        }

        // Clean up temporary keys
        delete data.release_results;
    },
});

// ============================================================================
// YTS PAGES HIERARCHY
// ============================================================================
Page.register({
    name: "YTS",
    class: {
        rejectedLanguages: "HI|TE|TA|BN|ML|UR|MR|KN|PA|GU",
        icon: "https://yts.lt/assets/images/website/logo-YTS.svg",
        selectPreferredTorrent(data) {
            const rawList = Array.isArray(data.torrents) ? data.torrents : [];

            // 1. Sort torrents by quality, codec, and release type priority
            const qualityPriority = { "1080p": 1, "2160p": 2, "720p": 3 };
            const codecPriority = { x265: 1, x264: 2 };
            const typePriority = { bluray: 1, web: 2 };

            data.torrentsSorted = [...rawList].sort((a, b) => {
                const qA = qualityPriority[a.quality] || 99;
                const qB = qualityPriority[b.quality] || 99;
                if (qA !== qB) return qA - qB;

                const cA = codecPriority[a.videoCodec] || 99;
                const cB = codecPriority[b.videoCodec] || 99;
                if (cA !== cB) return cA - cB;

                const tA = typePriority[a.type] || 99;
                const tB = typePriority[b.type] || 99;
                if (tA !== tB) return tA - tB;

                return 0;
            });

            // 2. Select specific stream qualities
            data.HDTorrent =
                data.torrentsSorted.find((t) => t.quality === "720p") || null;
            data.FHD_torrent =
                data.torrentsSorted.find((t) => t.quality === "1080p") || null;
            data.UHDTorrent =
                data.torrentsSorted.find((t) => t.quality === "2160p") || null;

            // Default preference order: 1080p -> 720p -> null
            data.torrent = data.FHD_torrent || data.HDTorrent || null;
            // Guard against movies that have no valid torrents on YTS
            if (data.torrent) {
                data.torrent.videoCodec =
                    data.torrent.videoCodec === "x265"
                        ? "h265"
                        : data.torrent.videoCodec === "x264"
                          ? "h264"
                          : data.torrent.videoCodec;
            }

            // 3. Construct YTS Badge HTML
            if (!data.torrent) {
                data.HTML = `<a href="#" class="noDownload" style="color: white;"><img src="${YTS.icon}" style="width: 20%; height: auto;">not found</a>`;
            } else {
                const sizeLabel = String(
                    data.torrent.sizeGB || data.torrent.size || "",
                ).replace(" ", "");
                const res = data.torrent.quality || "Unknown";
                const video = data.torrent.videoCodec || "Unknown";
                const audio = data.torrent.audioChannels;
                const type = data.torrent.type || "Unknown";
                data.torrent.shortDesc = `<span style="font-size: 0.7em">[${sizeLabel},${res},${video},${audio},${type}]</span>`;

                data.HTML = `<a href="#" class="withDownload" style="color: white;"><img src="${YTS.icon}" style="width: 20%; height: auto;">${data.torrent.shortDesc}</a>`;
            }
        },
    },
});

YTS.register({
    name: "ytsHTMLPage",
    traits: [HTMLContent, MovieDownloadable],
    css: `
        .browse-movie-wrap:hover figcaption,
        .browse-movie-link:hover figcaption,
        a:hover > figure > figcaption {
            opacity: 1 !important;
            visibility: visible !important;
            display: block !important;
            background: rgba(0,0,0,0.8) !important;
            transition: all 0.2s ease-in-out !important;
        }
        .browse-movie-wrap:hover figcaption h4,
        a:hover figcaption h4 {
            opacity: 1 !important;
            color: #fff !important;
            visibility: visible !important;
        }
    `,
    before: {
        // YTS ads injector removal

        async extract() {
            this.addStyle(this.css || this.constructor.css);
            Page.showToast("Removing YTS ads injector");
            // --- 1. BEHAVIORAL INTERCEPTION ENGINE ---
            // Instead of matching variable names, we scan the function text for suspicious behaviors
            // common to popunder/redirect scripts (like calling window.open or checking window.event).
            function isSuspiciousListener(listenerFunc) {
                if (typeof listenerFunc !== "function") return false;
                const source = listenerFunc.toString();

                // High-confidence indicators for ad-tech click hijacking
                const hasWindowOpen =
                    source.includes("window.open") || source.includes(".open(");
                const hasObfuscation =
                    (source.match(/_0x[a-f0-9]{4,6}/g) || []).length > 3; // Looks for 4+ hex vars
                const hasArrayRotator =
                    source.includes("shift()") && source.includes("push(");

                return hasWindowOpen && (hasObfuscation || hasArrayRotator);
            }

            function applyStealthFilter(proto, contextName) {
                const originalAddEventListener = proto.addEventListener;

                proto.addEventListener = function (type, listener, options) {
                    // Intercept click, mousedown, and pointerdown (common bypass methods)
                    if (["click", "mousedown", "pointerdown"].includes(type)) {
                        if (isSuspiciousListener(listener)) {
                            console.warn(
                                `🛡️ [Anti-Ad] Blocked suspicious ${type} listener on [${contextName}]!`,
                            );
                            return; // Drop the listener completely
                        }
                    }
                    return originalAddEventListener.apply(this, arguments);
                };
            }

            // Apply engine level interception
            applyStealthFilter(window, "WINDOW");
            applyStealthFilter(Document.prototype, "DOCUMENT");
            applyStealthFilter(Element.prototype, "ELEMENT");

            // --- 2. NUCLEAR WINDOW.OPEN OVERRIDE ---
            // Catch-all: If a script evades the listener trap, intercept the window creation itself
            const originalOpen = window.open;
            window.open = function (url, name, specs) {
                // Legitimate user clicks on YTS should only be navigating the current tab, not spawning popups.
                // Exception: If you explicitly want to allow a specific popup behavior, configure it here.
                console.warn(
                    `🛑 [Anti-Ad] Blocked window.open attempt to: ${url}`,
                );
                return null;
            };

            // --- 3. DOM CLEANUP PROTECTION ---
            function startPageWatcher() {
                const targetId = "dontfoid";

                const checkAndDelete = () => {
                    document
                        .querySelectorAll("body > iframe")
                        .forEach((iframe) => {
                            iframe.remove();
                        });

                    const overlay = document.getElementById(targetId);
                    if (overlay) overlay.remove();

                    if (
                        document.body &&
                        document.body.classList.contains("non-touch")
                    ) {
                        document.body.classList.remove("non-touch");
                    }
                };

                checkAndDelete();

                new MutationObserver((mutations) => {
                    for (const { addedNodes } of mutations) {
                        for (const node of addedNodes) {
                            if (node.nodeType !== Node.ELEMENT_NODE) continue;

                            // Immediately neutralize inline hijackers on newly injected elements
                            if (
                                node.hasAttribute &&
                                node.hasAttribute("onclick")
                            ) {
                                node.removeAttribute("onclick");
                            }

                            if (
                                node.tagName === "IFRAME" &&
                                node.parentElement === document.body
                            ) {
                                node.remove();
                            }
                            if (
                                node.id === targetId ||
                                (node.querySelector &&
                                    node.querySelector(`#${targetId}`))
                            ) {
                                const overlay =
                                    node.id === targetId
                                        ? node
                                        : node.querySelector(`#${targetId}`);
                                overlay.remove();
                            }
                        }
                    }
                    if (
                        document.body &&
                        document.body.classList.contains("non-touch")
                    ) {
                        document.body.classList.remove("non-touch");
                    }
                }).observe(document.body, { childList: true, subtree: true });
            }

            if (document.body) {
                startPageWatcher();
            } else {
                new MutationObserver((mutations, obs) => {
                    if (document.body) {
                        obs.disconnect();
                        startPageWatcher();
                    }
                }).observe(document.documentElement, {
                    childList: true,
                    subtree: true,
                });
            }
        },
    }, // END YTS ads injector removal
});
YTS.register({
    name: "ytsAPIPage",
    traits: [JSONContent, Cacheable(sessionCache, "scrape", "route.signature")],
});
ytsAPIPage.register({
    name: "ytsMovieInfoPage",
    description: "YTS JSON Page",
    class: { routeTemplate: "no route" },
    extract() {
        const data = this.data;
        data.yts_id = data.id;
        YTS.selectPreferredTorrent(data);
    },
});

ytsMovieInfoPage.register({
    name: "ytsMovieInfoPageThroughYTS_ID",
    description: "YTS JSON Page Obtained by Way of YTS ID",
    class: {
        routeTemplate:
            "https://movies-api.accel.li/api/v2/movie_details.json?movie_id=${ytsId}",
    },
    schema: [
        "data.movie",
        {
            title: "title",
            year: "year",
            imdbCode: "imdb_code",
            rating: "rating",
            id: "id",
            url: "url",
            torrents: [
                [
                    "torrents",
                    {
                        url: "url",
                        hash: "hash",
                        quality: "quality",
                        type: "type",
                        videoCodec: "video_codec",
                        audioChannels: "audio_channels",
                        size: "size",
                        size_bytes: "size_bytes",
                    },
                ],
            ],
        },
    ],
});
ytsMovieInfoPage.register({
    name: "ytsMovieInfoPageThroughIMDB_ID",
    description: "YTS JSON Page Obtained by Way of IMDB ID",
    class: {
        routeTemplate:
            "https://movies-api.accel.li/api/v2/list_movies.json?query_term=${imdbId}",
    },
    schema: [
        "data.movies[0]",
        {
            title: "title",
            year: "year",
            imdbCode: "imdb_code",
            rating: "rating",
            id: "id",
            url: "url",
            torrents: [
                [
                    "torrents",
                    {
                        url: "url",
                        hash: "hash",
                        quality: "quality",
                        type: "type",
                        videoCodec: "video_codec",
                        audioChannels: "audio_channels",
                        size: "size",
                        size_bytes: "size_bytes",
                    },
                ],
            ],
        },
    ],
});

ytsHTMLPage.register({
    name: "ytsBrowsePage",
    class: {
        routeTemplate: [
            "https://yts.gg/home",
            "yts.gg/browse-movies*",
            "yts.gg/movies/*",
            "yts.gg/trending-movies",
            "yts.gg/home",
            "yts.gg/",
        ],
    },
    schema: {
        movies: [
            [
                "div.browse-movie-wrap",
                {
                    title: "a.browse-movie-title",
                    year: "div.browse-movie-year",
                    posterUrl: ["img", "src"],
                    url: ["a.browse-movie-link", "href"],
                },
            ],
        ],
    },
    extract() {
        if (!this.data || !Array.isArray(this.data.movies)) return;
        const langRegex = /^\s*\[([A-Z]{2,})\]\s*(.*)/i;
        // Build the regex once outside the loop
        const rejectRegex = new RegExp(`^(${YTS.rejectedLanguages})$`, "i");

        this.data.movies.forEach((movie) => {
            // 1. Clean the Year and Extract Resolution
            const rawYear = movie.year || "";

            const yearMatch = rawYear.match(/\d{4}/);
            movie.year = yearMatch ? yearMatch[0] : "";

            const resMatch = rawYear.match(/\s+(\d+p)/i);
            if (resMatch) {
                movie.resolution = resMatch[1];
            }

            // 2. Clean the Title & Language
            const rawTitle = movie.title || "";
            const match = rawTitle.match(langRegex);

            if (match) {
                movie.language = match[1].toUpperCase();
                movie.title = match[2].trim();
            } else {
                movie.language = "EN";
                movie.title = rawTitle.trim();
            }

            // 3. Flag for Rejection
            movie.reject = rejectRegex.test(movie.language);
        });
    },

    async enrich() {
        await plexLibraryPage.extract(); // Ensure library section is available

        const validMovies = this.data.movies.filter((movie) => !movie.reject);

        for (const movie of validMovies) {
            movie.details = { data: {} };

            const slugMatch = movie.url.match(/movies\/([^/]+)/);
            const yts_slug = slugMatch ? slugMatch[1] : null;

            // Retrieve the active Graph instance to expose its payload and commit() capabilities //[cite: 1]
            const graphInstance = yts_slug
                ? MovieGraph.get({ yts_slug: yts_slug })
                : null;
            const records = graphInstance?.records || [];

            // 1. Copy each plex_id stored in the graph into a separate variable
            const storedPlexIds = [
                ...new Set(records.map((r) => r.plex_id).filter((id) => id)),
            ];

            let plexData = null;

            // 2. Loop over those ids stored in that variable
            for (const plex_id of storedPlexIds) {
                console.info(`[Ouro - Testing Stored Plex ID]`, plex_id);

                // 3. Search Plex by key
                const result = (
                    await plexSearchPageByPlexKey.extract({
                        args: { id: plex_id },
                    })
                )?.data;

                if (result && result.id) {
                    // 5. If result, we found plex data and exit the loop at once
                    console.info(`[Ouro - Valid Plex ID Found]`, plex_id);
                    plexData = result;
                    break;
                } else if (graphInstance) {
                    // 4. If no result, prune that stale plex_id variant from the MovieGraph record
                    console.info(
                        `[Ouro - Stale Plex ID Detected, Pruning Graph]`,
                        plex_id,
                    );
                    graphInstance.prune({ plex_id });
                }
            }

            // 6. Only then, once out of that loop, conduct a Plex Search by Name Year if we still don't have data
            if (!plexData || !plexData.id) {
                console.info("[Ouro - Search Plex by Name/Year]", movie.title);
                plexData = (
                    await plexSearchPageByNameYear.extract({
                        args: {
                            title: encodeURIComponent(movie.title),
                            year: movie.year,
                            librarySection: Plex.librarySection,
                        },
                    })
                )?.data;
            }

            // Isolate Plex assignment
            movie.details.data.plex = plexData || {};

            // Keep a reference to the first valid graph record for the YTS check
            const graphRecord = records[0] || null;

            // Extract the YTS page if either there is a Plex ID OR there is a YTS ID
            if (
                (plexData && plexData.id) ||
                (graphRecord && graphRecord.yts_id)
            ) {
                // Use the JSON endpoint if we have a yts_id
                if (graphRecord && graphRecord.yts_id) {
                    console.info(
                        "[Ouro - Graph found, Fetching Lightweight YTS JSON]",
                        movie.title,
                    );

                    const jsonPage =
                        await ytsMovieInfoPageThroughYTS_ID.extract({
                            args: { ytsId: graphRecord.yts_id },
                        });

                    // Ensure JSON data is placed under .yts and add HTML if missing
                    let ytsData = jsonPage?.data || {};
                    if (
                        ytsData.torrent &&
                        !ytsData.torrent.shortDesc &&
                        ytsData.HTML
                    ) {
                        ytsData.torrent.shortDesc = ytsData.HTML;
                    }

                    movie.details.data.yts = ytsData;
                } else {
                    console.info(
                        "[Ouro - Plex found but no Graph, Fetching Heavy YTS HTML]",
                        movie.title,
                    );

                    const htmlPage = new ytsMoviePage(movie.url);
                    if (htmlPage.route.host === this.route.host) {
                        await htmlPage.extract();
                        movie.details.data.yts =
                            htmlPage.data?.yts || htmlPage.data || {};
                    }
                }
            } else {
                console.info(
                    "[Ouro - Not in Plex and No Graph, Skipping YTS Fetch]",
                    movie.title,
                );
            }
        }
    },

    process() {
        if (!this.data?.movies || !this.scraps?.movies) return;

        this.data.movies.forEach((movie, index) => {
            const scrap = this.scraps.movies[index];
            const poster = scrap?.v?.posterUrl;

            if (movie.reject) {
                scrap?.css({ display: "none" });
                return;
            }

            const detailsData = movie.details?.data || {};
            const plex = detailsData.plex || {};
            const yts = detailsData.yts || detailsData;
            const torrent = yts.torrent || {};

            const ytsDesc =
                torrent.shortDesc ||
                (torrent.quality
                    ? `<span>[${torrent.size || ""},${torrent.quality},${torrent.videoCodec || ""},${torrent.audioChannels || ""},${torrent.type || ""}]</span>`
                    : null);

            if (poster && ytsDesc) {
                const isUpgrade =
                    plex.id &&
                    (plex.title === undefined ||
                        (plex.videoResolution === "720p" &&
                            torrent.quality === "1080p") ||
                        (plex.videoCodec === "h264" &&
                            torrent.videoCodec === "h265"));

                poster.badge(ytsDesc, "top-left", {
                    backgroundColor: isUpgrade ? "green" : "black",
                });

                if (plex.id && plex.shortDesc) {
                    poster.badge(plex.shortDesc, "bottom-left");
                }
            }
        });
    },
});

ytsHTMLPage.register({
    name: "ytsMoviePage",
    description: "YTS Movie Page",
    class: { routeTemplate: "https://yts.gg/movies/${movieStub}" },
    schema: {
        id: ["div#movie-info", "data-movie-id"],
        titles: [["h1"]],
        title: "div#movie-info h1",
        years_genres: [["h2"]],
        year: "div#movie-info h2",
        language: ["div#movie-info h2 > a", "href"],
        genres: "div#movie-info h2:nth-child(3)",
        imdbLink: ['a[href*="imdb.com"].icon', "href"],
        torrents: [
            [
                '.hidden-md.hidden-lg > a[rel="nofollow"]',
                {
                    title: [".", "title"],
                    url: [".", "href"],
                    videoCodec: "small",
                },
            ],
        ],
        torrents_info: [
            [
                ".tech-spec-info",
                {
                    sizeGB: [
                        'span[title="File Size"]',
                        (span) => span.nextSibling.textContent.trim(),
                    ],
                    audioChannels: [
                        'span[title="Language"]',
                        (span) => span.nextSibling.textContent.trim(),
                    ],
                },
            ],
        ],
        similarMovies: [
            [
                "div#movie-related > a",
                {
                    url: [".", "href"],
                    titleYear: [".", "title"],
                },
            ],
        ],
    },
    async extract() {
        // assumes that we do not enrich further with yts API
        this.data = { yts: this.data, noYtsAPI: true };
        const data = this.data.yts;
        // const data = this.data; // if not enriching further with yts API

        data.imdb_code = data?.imdbLink
            ? data.imdbLink.match(/(tt\d+)/)[1]
            : "";
        data.imdb_id = data.imdb_code;
        data.yts_id = data.id;
        data.url = this.route.href;
        data.slug = data.url.split("/").pop();

        const languageMatch = String(data.year).match(
            /^(\d{4})(?:\s*\[(.*?)\])?$/,
        );
        if (languageMatch) {
            data.year = languageMatch[1];
            data.language = languageMatch[2]
                ? data.language.split("/").pop()
                : "en";
        }
        data.title_long = `${data.title} (${data.year})`;
        data.genres = data.genres.split(" / ");

        data.torrents.forEach((torrent, index) => {
            torrent.videoCodec =
                torrent.videoCodec === ".x265" ? "x265" : "x264";

            torrent.hash = torrent.url.split("/").pop();

            // Matches a resolution (e.g., 720p, 1080p, 2160p) and an optional quality (e.g., .WEB) right before " Torrent"
            const resMatch = torrent.title.match(
                /(\d{3,4}p)(?:\.([A-Za-z0-9]+))?(?=\s+Torrent$)/,
            );
            if (resMatch) {
                torrent.quality = resMatch[1]; // Extracts "720p"
                if (resMatch[2]) {
                    torrent.type = resMatch[2].toLowerCase(); // Extracts "WEB" (if present)
                }
            }
            delete torrent.title;

            torrent.sizeGB = data.torrents_info[index].sizeGB;
            const sizeMatch = torrent.sizeGB.match(/([\d.]+)\s*(GB|MB|KB|B)/i);
            if (sizeMatch) {
                const value = parseFloat(sizeMatch[1]); // Extracts the number (e.g., 1.24)
                const unit = sizeMatch[2].toUpperCase(); // Extracts the unit (e.g., GB)

                let multiplier = 1;
                if (unit === "GB")
                    multiplier = 1073741824; // 1024^3
                else if (unit === "MB")
                    multiplier = 1048576; // 1024^2
                else if (unit === "KB") multiplier = 1024; // 1024^1

                // Multiply and round to the nearest integer
                torrent.size = Math.round(value * multiplier);
            }

            const audioMatch =
                data.torrents_info[index].audioChannels.match(/(\d+\.\d+)/);
            if (audioMatch) {
                torrent.audioChannels = audioMatch[1]; // Extracts "5.1"
            }
            // end processing torrent and torrent_info
        });
        delete data.torrents_info;

        YTS.selectPreferredTorrent(data);

        // processing similar movies
        data.similarMovies?.forEach((similar) => {
            // Extract slug from the end of the URL
            similar.slug = similar.url.split("/").pop();

            // Extract title and year using regular expression
            const match = similar.titleYear.match(/^(.+?)\s*\((\d{4})\)$/);

            if (match) {
                similar.title = match[1];
                similar.year = parseInt(match[2], 10);
            }
        });
    },

    async enrich() {
        const graph = MovieGraph.get({
            yts_id: this.data?.yts?.id,
            yts_slug: this.data?.yts?.slug,
            imdb_id: this.data?.yts?.imdb_id,
        })?.records?.[0];
        if (graph?.tmdb_id || graph?.plex_id) {
            console.info("[Ouro - Graph]", graph);
        }
        if (!this.data?.noYtsAPI)
            await this.enrichWith(
                "yts",
                ytsMovieInfoPageThroughYTS_ID,
                (d) => ({ ytsId: d.id }),
            );

        await this.enrichWith("tmdb", tmdbMovieInfoPage, (d) => ({
            movieId: d.yts.imdb_id,
        })); // No opportunity to rely upon downloadFiles, need tmdb title

        await this.ensure(() => Plex.librarySection, plexLibraryPage);

        if (graph?.plex_id) {
            await this.enrichWith("plex", plexSearchPageByPlexKey, (d) => ({
                id: graph.plex_id,
            }));
        } else {
            await this.enrichWith("plex", plexSearchPageByNameYear, (d) => ({
                title: encodeURIComponent(d.tmdb.title),
                year: d.tmdb.year,
                librarySection: Plex.librarySection,
            }));
        }
        const similarMovies = this.data.yts?.similarMovies;
        if (Array.isArray(similarMovies)) {
            await similarMovies.parallel(async (similar) => {
                similar.plex = (
                    await plexSearchPageByNameYear.extract({
                        args: {
                            title: encodeURIComponent(similar.title),
                            year: similar.year,
                            librarySection: Plex.librarySection,
                        },
                    })
                )?.data;
            });
        }
    },
    async process() {
        const containers = this.scraps.titles.v.map((t) => t.e.parentNode);
        // const container = this.scraps.title.e.parentNode;

        const wrappers = containers.map((container) => {
            // Make parent relative so absolute positioning inside works
            container.style.position = "relative";
            const wrapper = document.createElement("div");
            wrapper.className = "custom-injected-wrapper";
            Object.assign(wrapper.style, {
                position: "absolute",
                top: "0px",
                right: "0px",
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-end",
                textAlign: "right",
                zIndex: "10",
                pointerEvents: "auto",
                maxWidth: "100%",
            });
            container.appendChild(wrapper);
            return wrapper;
        });

        // Helper to inject HTML and right-align child h2 nodes
        const flushedLeftStyle = {
            maxWidth: "50%", // Prevents expanding past half the container width
            wordBreak: "break-word", // Ensures long titles wrap gracefully
            overflowWrap: "break-word",
            marginRight: "auto", // Keeps content left-aligned relative to available space
        };
        const flushedRightStyle = {
            textAlign: "right",
            margin: "0",
            maxWidth: "50%",
            wordBreak: "break-word",
            overflowWrap: "break-word",
        };
        const appendAndAlign = (html) => {
            wrappers.forEach((wrapper) => {
                const temp = document.createElement("div");
                temp.innerHTML = html;
                const el = temp.firstElementChild;
                if (el) {
                    Object.assign(el.style, flushedRightStyle);
                    wrapper.appendChild(el);
                    return el;
                }
            });
        };
        var absence = true;
        if (this.data?.plex?.HTML) {
            appendAndAlign(this.data.plex.HTML);
            appendAndAlign(
                `<span style="font-size: 0.7em">/Volumes${this.data.plex.file.replace("m", "M")}</span>`,
            );
            absence =
                (this.data.plex?.videoResolution == "720p" &&
                    this.data.yts.torrent.quality == "1080p") ||
                (this.data.plex?.videoCodec == "h264" &&
                    this.data.yts.torrent.videoCodec == "h265") ||
                this.data.yts.torrent.size <= 0.95 * this.data.plex.size;
        }

        if (this.data?.yts?.HTML) {
            //const torrentElement = this.scraps.torrents.find(tDV => tDV.v.url.v === this.data.yts.torrent.url).e;
            // do not rely upon scraps as there are multiple locations where torrent is located
            const torrentElements = this.content.querySelectorAll(
                `a[href="${this.data.yts.torrent.url}"]`,
            );
            const glowStyle = `
    background-color: #2e7d32 !important;
    border-radius: 6px !important;
    color: #ffffff !important;
    display: inline-block !important;
    font-weight: bold !important;
    padding: 6px 12px !important;
    text-align: center !important;
    width: 140px !important;

    border: 2px solid #00e676 !important;
    box-shadow: 0 0 10px 2px #00e676 !important;
  `;
            const existingStyle = `

background-color: #81c784;
border-radius: 6px;
color: #ffffff;
display: inline-block;
font-weight: bold;
padding: 6px 12px;
text-align: center;
width: 140px;
`;
            Array.from(torrentElements).map((torrentElement) => {
                torrentElement.style.cssText = absence
                    ? glowStyle
                    : existingStyle;
                torrentElement.href =
                    "javascript:Page.browser.downloadFiles();";
            });
        }
        this.scraps.titles.v.forEach((t) =>
            Object.assign(t.e.style, flushedLeftStyle),
        );
        this.scraps.years_genres.v.map((yg) =>
            Object.assign(yg.e, flushedLeftStyle),
        );
    },
});

// ============================================================================
// IMDB PAGES HIERARCHY
// ============================================================================
Page.register({ name: "IMDB" });
IMDB.register({
    name: "imdbHTMLPage",
    traits: [HTMLContent, MovieDownloadable],
});
IMDB.register({ name: "imdbAPIPage", traits: [] }); // is there such a thing?

imdbHTMLPage.register({
    name: "imdbMoviePage",
    description: "IMDB Movie Page",
    namespace: "imdb",
    class: { routeTemplate: "https://www.imdb.com/title/${imdbId}/" },
    schema: {
        pagetitle: "title",
        titleBlock: '[data-testid="hero__pageTitle"]',
    },
    extract() {
        const data = this.data.imdb;

        const href = this.route.href;
        data.id = href.match(/\/title\/(tt\d+)/)?.[1] || "";
        data.imdb_id = data.id;
        const match = data.pagetitle
            .slice(0, -7)
            ?.match(/^(.*)\s\([\w,\s]*(\d{4})\)$/);

        data.titleyear = match?.[0] || "";
        data.title = match?.[1] || "";
        data.year = match?.[2] || "";
        delete data.titleBlock;
        delete data.pagetitle;
    },
    before: {
        async enrich() {
            await this.ensure(() => Plex.librarySection, plexLibraryPage);
        },
    },
    async enrich() {
        const graph = MovieGraph.get({
            imdb_id: this.data.imdb.id,
            yts_id: this.data.imdb.yts_id,
        })?.records?.[0];
        if (graph?.plex_id) {
            console.info("[Ouro - Enrich]", graph);
            //await this.ensure( () => Plex.serverUrl, plexServerInfoPage);
            await this.enrichWith("plex", plexSearchPageByPlexKey, (d) => ({
                id: graph.plex_id,
            }));
        } else {
            await this.enrichWith("plex", plexSearchPageByNameYear, (d) => ({
                title: encodeURIComponent(d.imdb.title),
                year: d.imdb.year,
                librarySection: Plex.librarySection,
            }));
        }
        // await this.enrichWith('tmdb', tmdbMovieInfoPage, d => ({ movieId: d.imdb.id })); // Opportunity to place in downloadFiles?
        console.info(`[Ouro - delayed TMDB retrieval] ${this.data.imdb.id}`);
        await this.enrichWith("yts", ytsMovieInfoPageThroughIMDB_ID, (d) => ({
            imdbId: d.imdb.id,
        }));
    },
    process() {
        const downloadAssement =
            this.autoDownload &&
            (this.data.plex?.title === undefined ||
                (this.data.plex?.videoResolution == "720p" &&
                    this.data.yts.torrent.quality == "1080p") ||
                (this.data.plex?.videoCodec == "h264" &&
                    this.data.yts.torrent.videoCodec == "h265"));

        console.info(`Autodownload: ${this.autoDownload}
Plex Title: ${this.data.plex.title}
Plex Resolution: ${this.data.plex.videoResolution}
Plex Codec: ${this.data.plex.videoCodec}
Torrent Quality: ${this.data.yts.torrent.quality}
Torrent Codec: ${this.data.yts.torrent.videoCodec}
Assesment: ${downloadAssement}
`);

        // tweak the page to show the eventual Plex and YTS links
        const titleElement = document.querySelector(
            '[data-testid="hero__pageTitle"]',
        ).parentNode;
        if (this.data.yts.HTML) {
            titleElement.insertAdjacentHTML("afterend", this.data.yts.HTML);
        }
        titleElement.insertAdjacentHTML(
            "afterend",
            this.data.plex.HTML || "Not found",
        );
        // if (downloadAssement) {downloadFiles()}
    },
});
imdbMoviePage.register({
    name: "imdbMoviePageWithYTS",
    description: "IMDB Movie Page with YTS Info in Path",
    class: {
        routeTemplate: "https://www.imdb.com/title/${imdbId}/?yts=${ytsId}",
    },
    async enrich() {
        const graph = MovieGraph.get({
            imdb_id: this.data.imdb.id,
            yts_id: this.data.imdb.yts_id,
        })?.records?.[0];
        if (graph?.plex_id) {
            console.info("[Ouro - Enrich]", graph);
            //await this.ensure( () => Plex.serverUrl, plexServerInfoPage);
            await this.enrichWith("plex", plexSearchPageByPlexKey, (d) => ({
                id: graph.plex_id,
            }));
        } else {
            await this.enrichWith("plex", plexSearchPageByNameYear, (d) => ({
                title: encodeURIComponent(d.imdb.title),
                year: d.imdb.year,
                librarySection: Plex.librarySection,
            }));
        }
        // await this.enrichWith('tmdb', tmdbMovieInfoPage, d => ({ movieId: d.imdb.id })); // Opportunity to place in downloadFiles?
        console.info(`[Ouro - delayed TMDB retrieval] ${this.data.imdb.id}`);
        await this.enrichWith("yts", ytsMovieInfoPageThroughYTS_ID, (d) => ({
            ytsId: d.imdb.yts_id,
        }));
    },
    after: {
        extract() {
            this.data.imdb.yts_id =
                (this.route.href.match(/yts=(\d+)/) || [])[1] || null;
        },
    },
});

// ============================================================================
// PLEX PAGES HIERARCHY
// ============================================================================
Page.register({
    name: "Plex",
    class: {
        serverUrl: undefined,
        moviesSection: undefined,
        limitedSection: undefined,
        librarySection: {
            init: undefined,
            ifNeeded() {
                return this.moviesSection;
            },
        },
        machineIdentifier: undefined,
        remoteBaseUrl: undefined,
        infoXMLurl: {
            init: undefined,
            ifNeeded: () => getSecret("plexInfoXMLurl"),
        },
        token: {
            init: undefined,
            ifNeeded() {
                return new URL(this.infoXMLurl).searchParams.get(
                    "X-Plex-Token",
                );
            },
        },
        providers: {
            plexToken: () => Plex.token,
            serverUrl: [() => Plex.serverUrl, () => plexServerInfoPage],
            machineIdentifier: [
                () => Plex.machineIdentifier,
                () => plexServerInfoPage,
            ],
            librarySection: [() => Plex.librarySection, () => plexLibraryPage],
        },
        icon: "https://upload.wikimedia.org/wikipedia/commons/8/8e/Plex_favicon.png",
    },
});

Plex.register({
    name: "plexServerInfoPage",
    description: "Plex Server Discovery",
    class: {
        routeTemplate:
            "https://plex.tv/api/resources?includeHttps=1&X-Plex-Token=${plexToken}",
    },

    // Cache the scrape phase
    traits: [XMLContent, Cacheable(globalCache, "scrape", "route.signature")],
    schema: {
        machineIdentifier: ["Device", "clientIdentifier"],
        serverUrl: [
            'Connection[local="0"]',
            (el) => el.getAttribute("uri").replace(/https?:\/\//, ""),
        ],
    },

    // State mutation safely executed in the 'after' hook post-cache rehydration
    after: {
        extract() {
            Object.assign(Plex, this.data);
        },
    },
});

Plex.register({
    name: "plexLibraryPage",
    description: "Plex Library Sections",
    class: {
        routeTemplate:
            "https://${serverUrl}/library/sections?X-Plex-Token=${plexToken}",
    },

    // Cache the scrape phase
    traits: [XMLContent, Cacheable(globalCache, "scrape", "route.signature")],
    schema: {
        moviesSection: ['Directory[title="Movies"]', "key"],
        limitedSection: ['Directory[title="Limited"]', "key"],
    },

    // State mutation safely executed in the 'after' hook
    after: {
        extract() {
            Object.assign(Plex, this.data);
        },
    },
});

Plex.register({
    name: "plexHTMLPage",
    traits: [HTMLContent, MovieDownloadable],
});
plexHTMLPage.register({
    name: "plexMoviePage",
    //class: { routeTemplate: "https://app.plex.tv/desktop/#!/server/${machineIdentifier}/details?key=/library/metadata/${plexId}" },
    class: {
        routeTemplate: [
            "https://app.plex.tv/desktop/#!/server/${machineIdentifier}/details?key=/library/metadata/${plexId}",
            "/details?key=%2Flibrary%2Fmetadata%2F",
        ],
    },
    schema: {
        id: ['h2[title="Cast & Crew"]>a', "href"],
        imdb_rating: 'span[title^="IMDb Rating "]',
        tmdb_rating: 'span[title^="TMDB Rating "]',
        section: ['a[class^="PageHeaderTitle-container"]', "href"],
    },
    before: {
        async extract() {
            await this.waitForElement('h2[title="Cast & Crew"]');
        },
    },
    async extract() {
        const re1 = /metadata%2F(\d+)&/i;
        this.data.id = parseInt(this.data.id.match(re1)[1], 10);
        const re2 = /source=(\d+)/;
        this.data.section = parseInt(this.data.section.match(re2)[1], 10);
    },
    async enrich() {
        var oldGraph = MovieGraph.records({ plex_id: this.data.id })[0] || null;
        if (!oldGraph) {
            const legacyYtsId = PlexRecord.get({ plex_id: this.data.id })
                ?.records?.[0]?.yts_id;
            if (legacyYtsId)
                oldGraph =
                    MovieGraph.records({ yts_id: legacyYtsId })[0] || null;
        }
        var img = document.createElement("img");
        img.style = "width:24px; height:24px; margin-left: 12px;";
        document.querySelector("h1").appendChild(img);
        if (oldGraph?.yts_slug) {
            console.info(`[Ouro - existing graph]`, oldGraph);
            //img.src='https://cdn-icons-png.flaticon.com/512/617/617127.png';
            img.style = "height: 24px; width: auto; margin-left: 12px;";
            img.src = YTS.icon;
            img.onclick = () => {
                window.location.href = `https://yts.gg/movies/${oldGraph.yts_slug}`;
            };
            this.data.graph = oldGraph;
        } else {
            await this.ensure(() => Plex.librarySection, plexLibraryPage); // Ensure library section is available
            await this.enrichWith("plex", plexSearchPageByPlexKey, (data) => ({
                id: data.id,
            }));
            const jsonUrl =
                "http://server:8080" +
                encodeURI(this.data.plex.file.replace(/\.[^/.]+$/, ".json"));
            console.info("[Ouro - JSON URL]", jsonUrl);
            let json = await this.enrichWith("json", movieJSON, jsonUrl);
            if (json && json.nodeType === 9) {
                console.info("[Ouro - No JSON file in directory");
                json = await this.enrichWith(
                    "json",
                    movieDirectoryListing,
                    jsonUrl.replace(/[^/]*$/, ""),
                );
            }
            // 2. Safely calculate all key values first
            const imdb_id =
                json.imdb?.id ||
                json.tmdb_api?.imdb_id ||
                json.yts?.imdb_id ||
                json.yts_api?.imdb_id;
            const plex_id = this.data?.id;
            const tmdb_id = json.tmdb?.id || json.tmdb_api?.id;
            const yts_id = json.yts?.id || json.yts?.yts_id || json.yts_api?.id;
            const yts_slug = json.yts?.slug || json.yts_api?.slug;
            oldGraph =
                MovieGraph.records({
                    yts_id,
                    imdb_id,
                    tmdb_id,
                    yts_slug,
                    plex_id,
                })[0] || null;
            if (oldGraph?.yts_id) {
                console.info(`[Ouro - partial graph]`, oldGraph);
                img.src =
                    "https://cdn-icons-png.flaticon.com/512/616/616998.png";
            } else {
                oldGraph = {};
            }
            // 3. Build an array of strings, adding them only if the value is defined (not null/undefined)
            const params = [];
            const newGraph = {};

            if (imdb_id != null) {
                params.push(`imdb_id: "${imdb_id}"`);
                newGraph.imdb_id = imdb_id;
            }
            if (plex_id != null) {
                params.push(`plex_id: ${plex_id}`);
                newGraph.plex_id = plex_id;
            }
            if (tmdb_id != null) {
                params.push(`tmdb_id: ${tmdb_id}`);
                newGraph.tmdb_id = tmdb_id;
            }
            if (yts_id != null) {
                params.push(`yts_id: ${yts_id}`);
                newGraph.yts_id = yts_id;
            }
            if (yts_slug != null) {
                params.push(`yts_slug: "${yts_slug}"`);
                newGraph.yts_slug = yts_slug;
            }

            // 4. Join the defined parameters and log the final string
            if (
                Object.keys(oldGraph).length === Object.keys(newGraph).length &&
                Object.entries(oldGraph).every(([k, v]) => v == newGraph[k])
            ) {
                console.info(`[Ouro - no new graph needed]`);
            } else {
                console.info(
                    `[Ouro - new graph] MovieGraph.put({${params.join(", ")}});`,
                    newGraph,
                );
                img.onclick = () => {
                    MovieGraph.put(newGraph);
                    location.reload();
                };
                img.style =
                    "width:24px; height:24px; margin-left: 12px;border: 2px solid #00e676 !important; box-shadow: 0 0 10px 2px #00e676 !important;";
            }
            this.data.graph = newGraph;
        }
    },
    async process() {
        if (this.data?.graph?.imdb_id) {
            this.scraps.imdb_rating?.linkify(
                `https://www.imdb.com/title/${this.data.graph.imdb_id}/`,
            );
        }
        if (this.data?.graph?.tmdb_id) {
            this.scraps.tmdb_rating?.linkify(
                `https://www.themoviedb.org/movie/${this.data.graph.tmdb_id}/`,
            );
        }
    },
});
plexHTMLPage.register({
    name: "plexBrowsePage",
    class: {
        routeTemplate: ["https://app.plex.tv/desktop/#!/", "placeholder"],
    },
    schema: {
        movies: [
            [
                'div[data-testid="cellItem"]',
                {
                    card: ".",
                    url: ['a[data-testid="metadataTitleLink"]', "href"],
                    title: 'a[data-testid="metadataTitleLink"]',
                    year: "span",
                },
            ],
        ],
    },
    before: {
        async extract() {
            await this.waitForElement('div[data-testid="cellItem"]', 10000);
            // Give Plex's virtual DOM 1.5 seconds to paint the rest of the cards
            await new Promise((resolve) => setTimeout(resolve, 1500));
        },
    },
    async extract() {
        this.data.movies.forEach((m) => {
            const match = m.url?.match(/metadata%2F(\d+)&context/);
            m.id = match ? match[1] : null;
        });
    },
});

Plex.register({ name: "plexAPIPage", traits: [XMLContent] });
plexAPIPage.register({
    name: "plexSearchPage",
    traits: [Cacheable(sessionCache, "scrape", "route.signature")],
    schema: [
        "Video",
        {
            title: [".", "title"],
            year: [".", "year"],
            id: [".", "ratingKey"],
            key: [".", "key"],
            mediaId: ["Media", "id"],
            duration: ["Media", "duration"],
            width: ["Media", "width"],
            height: ["Media", "height"],
            audioChannels: ["Media", "audioChannels"],
            audioCodec: ["Media", "audioCodec"],
            videoCodec: ["Media", "videoCodec"],
            videoResolution: ["Media", "videoResolution"],
            container: ["Media", "container"],
            file: ["Media > Part", "file"],
            size: ["Media > Part", "size"],
        },
    ],
    extract() {
        const data = this.data;
        if (data.id) {
            data.plex_id = data.id;
            data.videoResolution = data.videoResolution.replace(/p?$/, "p"); //ensure there is a p at the end
            data.videoCodec =
                data.videoCodec === "hevc" ? "h265" : data.videoCodec;
            data.url = `https://app.plex.tv/desktop/#!/server/${Plex.machineIdentifier}/details?key=${data.key}`;
            data.sizeGB =
                Math.round(parseInt(data.size, 10) / 10737412.74) / 100;
            data.shortDesc = `<span style="font-size: 0.7em">[${data.sizeGB}GB,${data.videoResolution},${data.videoCodec},${data.audioCodec}${data.audioChannels}]</span>`;
            data.HTML = `<a href="${data.url}" style="color: white;"><img style="width: 5%; height: 5%;" src="${Plex.icon}" style="width: 100%; height: 100%;">${data.title} (${data.year})<br>${data.shortDesc}</a>`;
        }
    },
});
plexSearchPage.register({
    name: "plexSearchPageByNameYear",
    class: {
        routeTemplate:
            "https://${serverUrl}/library/sections/${librarySection}/all?X-Plex-Token=${plexToken}&title=${title}&year=${year}",
    },
});
plexSearchPage.register({
    name: "plexSearchPageByPlexKey",
    class: {
        routeTemplate:
            "https://${serverUrl}/library/metadata/${id}?X-Plex-Token=${plexToken}",
    },
});
plexAPIPage.register({
    name: "plexInventoryPage",
    class: {
        routeTemplate: [
            "https://${serverUrl}/library/sections/${librarySection}/all?X-Plex-Token=${plexToken}&X-Plex-Container-Start=${start}&X-Plex-Container-Size=${size}",
            "https://${serverUrl}/library/sections/*/all?X-Plex-Token=*",
        ],
    },
    schema: {
        count: ["MediaContainer", "size"],
        movies: [
            [
                "Video",
                {
                    title: [".", "title"],
                    year: [".", "year"],
                    id: [".", "ratingKey"],
                    originalTitle: [".", "originalTitle"],
                    renditions: [
                        [
                            "Media",
                            {
                                id: [".", "id"],
                                videoResolution: [".", "videoResolution"],
                                files: [
                                    [
                                        "Part",
                                        {
                                            id: [".", "id"],
                                            file: [".", "file"],
                                        },
                                    ],
                                ],
                            },
                        ],
                    ],
                },
            ],
        ],
    },
    before: {
        async fetch() {
            this.route.args.start ||= 0;
            this.route.args.size ||= 500;
        },
    },
    async process() {
        if (!this.data || !this.data.movies) {
            console.error("[PlexInventory] No data extracted!");
            return;
        }

        const duplicateMovies = this.data.movies.filter((movie) => {
            const non4kRenditions = movie.renditions.filter(
                (rendition) => rendition.videoResolution.toLowerCase() !== "4k",
            );
            return non4kRenditions.length > 1;
        });
        if (duplicateMovies.length > 1) {
            console.log("Investigate movie duplicates", duplicateMovies);
        }
        const inventory = this.data.movies
            .flatMap((movie) =>
                movie.renditions.map((rendition) =>
                    [
                        rendition.files[0].file
                            .replace("/media/Movies", "")
                            .replace(/\/[^/]*$/, "/"),
                        `plex_id: ${movie.id}`,
                    ].join("\t"),
                ),
            )
            .join("\n");
        console.log("Plex Inventory:", inventory);

        // 1. Pagination Calculations
        const currentCount = parseInt(this.data.count, 10);
        const currentStart = parseInt(this.route.args.start, 10) || 0;
        const currentSize = parseInt(this.route.args.size, 10) || 500;

        // If the returned batch size equals the requested size, there's likely more.
        // If it's less, we've hit the last page!
        const hasMore = currentCount === currentSize;
        const nextStart = currentStart + currentSize;

        console.log(
            `🍿 [PlexInventory] Extracted ${currentCount} movies (Start: ${currentStart}). Has more: ${hasMore}`,
        );

        // 2. Conditionally Inject Floating Navigation Button
        const container = document.body || document.documentElement;

        // Only create the button if we haven't reached the last page
        if (container && hasMore && !document.getElementById("ouro-next-btn")) {
            const btn = DOMValue.create("button", {
                id: "ouro-next-btn",
                text: `➡️ Load Next Batch (Start: ${nextStart})`,
                css: {
                    position: "fixed",
                    top: "20px",
                    right: "20px",
                    padding: "12px 20px",
                    backgroundColor: "#00ff66",
                    color: "#0d1111",
                    border: "none",
                    borderRadius: "8px",
                    fontWeight: "bold",
                    fontSize: "14px",
                    cursor: "pointer",
                    zIndex: "2147483647",
                    boxShadow: "0 4px 15px rgba(0,0,0,0.4)",
                    fontFamily: "system-ui, sans-serif",
                    transition: "transform 0.2s ease",
                },
                on: {
                    mouseover: () => btn.css({ transform: "scale(1.05)" }),
                    mouseout: () => btn.css({ transform: "scale(1)" }),
                    click: () => {
                        this.route.args.start = nextStart;
                        btn.e.textContent = "Loading next batch...";
                        btn.css({ backgroundColor: "#ffaa00" });
                        window.location.href = this.route.href;
                    },
                },
                parent: container,
            });
        } else if (!hasMore) {
            console.log(
                `✅ [PlexInventory] Reached the last page (Batch size ${currentCount} < requested size ${currentSize}). No further button rendered.`,
            );
        }
    },
});

// ============================================================================
// Custom Movie JSON File (webdav)
// ============================================================================
JSONPage.register({
    name: "movieJSON",
    class: {
        routeTemplate:
            "http://server:8080/media/${section}/${rating}/${titleLong}/${longTitle}.json",
    },
    async extract() {
        if (this.data && this.data.nodeType === 9) {
            console.info("[Ouro - No JSON file in directory]");
        } else {
            console.info("[Ouro - Found JSON file in directory]");
        }
    },
});
HTMLPage.register({
    name: "movieDirectoryListing",
    class: {
        routeTemplate:
            "http://server:8080/media/${section}/${rating}/${titleLong}/",
    },
    schema: {
        directory: [["li > a", { filename: ".", link: [".", "href"] }]],
    },
    async extract() {
        (this.data.plex ??= {}).id = this.data.directory.reduce(
            (id, file) => id ?? file.filename.match(/^(.+)\.plex$/)?.[1],
            undefined,
        );
        (this.data.yts ??= {}).id = this.data.directory.reduce(
            (id, file) => id ?? file.filename.match(/^(.+)\.yts$/)?.[1],
            undefined,
        );
        (this.data.imdb ??= {}).id = this.data.directory.reduce(
            (id, file) => id ?? file.filename.match(/^(tt.+)\.imdb$/)?.[1],
            undefined,
        );
        (this.data.tmdb ??= {}).id = this.data.directory.reduce(
            (id, file) => id ?? file.filename.match(/^(.+)\.tmdb$/)?.[1],
            undefined,
        );
    },
});

Class({
    name: "MovieGraph",
    kindOf: Graph,
    class: {
        primaryKeys: ["yts_id", "yts_slug", "tmdb_id", "imdb_id"],
        secondaryKeys: ["plex_id"],
        keyTypes: {
            yts_id: Number,
            tmdb_id: Number,
            plex_id: Number,
            imdb_id: String,
            yts_slug: String,
        },
    },
});
Class({
    name: "PlexRecord",
    kindOf: Graph,
    class: {
        primaryKeys: ["plex_id"],
        keyTypes: {
            plex_id: Number,
        },
    },
});

console.groupEnd();

// ============================================================================
// MAIN LOOP
// ============================================================================

Page.start();
