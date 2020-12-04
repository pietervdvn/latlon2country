/*
1) Download a list of all countries from wikidata with DowloadCountryCodes
2) Download every relation from the OSM-API
 */

import DownloadCountryCodes from "./DownloadCountryCodes";
import DownloadAllBoundaries from "./DownloadAllBoundaries";
import GeoJsonSlicer from "./GeoJsonSlicer";
import TileOverview, {TileState} from "./TileOverview";
import BuildMergedTiles from "./BuildMergedTiles";
import SimplifyTile from "./SimplifyTiles";
import * as fs from "fs";

new DownloadCountryCodes().PerformOrFromCache(() => "", (countries => {

    const countryCodes = {};
    for (const country of countries.split("\n")) {
        console.log(country);
        const spl = country.split(";")
        countryCodes[spl[1]] = spl[0];
    }

    new DownloadAllBoundaries().OnEveryCountry(countries,
        (geojson, countryName) => {
            let tileOverview: TileOverview = null;
            new GeoJsonSlicer(countryName).PerformOrFromCache(() => geojson, (tileIndex) => {
                    // THis isn't entirely elegant, but it works as the geojson slicer is fully synchronized code, we now the return won't be run before this code
                    tileOverview = new TileOverview(countryCodes[countryName], countryName, tileIndex);
                }
            )
            return tileOverview;
        }
        , (ts) => {
            new BuildMergedTiles().PerformOrFromCache(() => JSON.stringify(ts), (tileOverviewCsv) => {
                const mergedTiles = new TileOverview("MergedTiles", "MergedTiles", tileOverviewCsv, "../data");
                if (!fs.existsSync("../data/Simplified")) {
                    fs.mkdirSync("../data/Simplified");
                }

                /**
                 * TileStates maps the simplified tiles onto a state, e.g.
                 * "x.y.z" --> {
                 *     min_zoom: < the smallest zoom level of containe leaf tiles>
                 *     country: null | the country code(s) for that tile (if simplified)
                 * }
                 */
                const tileStates = {}
                let maxZ = 0;


                for (const tileXYZ of mergedTiles.GetTileOverview()) {

                    const state = mergedTiles.DoesExistT(tileXYZ)
                    if (state === TileState.EXISTS) {
                        new SimplifyTile(tileXYZ).PerformOrFromCache(() => {
                            // We need to read the tile from disk
                            return fs.readFileSync(mergedTiles.GetPath(tileXYZ), {encoding: "utf8"})
                        }, (result) => {
                            const key = `${tileXYZ.z}.${tileXYZ.x}.${tileXYZ.y}`;

                            maxZ = Math.max(maxZ, tileXYZ.z);
                            const parsed = JSON.parse(result);
                            if (parsed.length !== undefined) {
                                // The result is an array with a single value; this means this is a single country
                                tileStates[key] = {
                                    country: parsed[0],
                                    min_zoom: tileXYZ.z
                                }
                            } else {
                                tileStates[key] = {
                                    country: null,
                                    min_zoom: tileXYZ.z
                                }
                            }
                        })
                    }
                }


                for (let z = maxZ - 1; z >= 0; z--) {
                    // Build the sum-tiles for each zoom level
                    for (const tileXYZ of mergedTiles.GetTileOverviewAt(z)) {
                        const key = `${tileXYZ.z}.${tileXYZ.x}.${tileXYZ.y}`;
                        const state = mergedTiles.DoesExistT(tileXYZ);
                        if (state !== TileState.ZOOM_IN_MORE) {
                            continue;
                        }
                        // We grab the states of the four quad-tiles
                        const states: { country?: string, min_zoom: number }[]
                            = [tileStates[`${tileXYZ.z + 1}.${tileXYZ.x * 2}.${tileXYZ.y * 2}`]
                            , tileStates[`${tileXYZ.z + 1}.${tileXYZ.x * 2 + 1}.${tileXYZ.y * 2}`]
                            , tileStates[`${tileXYZ.z + 1}.${tileXYZ.x * 2}.${tileXYZ.y * 2 + 1}`]
                            , tileStates[`${tileXYZ.z + 1}.${tileXYZ.x * 2 + 1}.${tileXYZ.y * 2 + 1}`]]

                        // We determine the zoom level
                        const zoom = Math.min(
                            ...states.map(state => state?.min_zoom ?? 100)
                        )
                        let commonCountry = undefined;
                        for (const state of states) {
                            if (commonCountry === undefined) {
                                commonCountry = state?.country;
                            } else {
                                if (commonCountry !== state?.country) {
                                    commonCountry = null;
                                }
                            }
                        }
                        tileStates[key] = {
                            country: commonCountry ?? null,
                            min_zoom: zoom
                        }

                        fs.writeFileSync("../data/Simplified/" + key + ".json",
                            JSON.stringify(states.map(state => state?.country ?? state?.min_zoom ?? 0))
                        );
                        console.log(`Sum tile ${key} generated`)


                    }
                }
                console.log("All Done!")
            })

        })
}));

//*/

