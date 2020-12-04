import Step from "./Step";
import TileOverview, {TileState} from "./TileOverview";
import * as fs from "fs";

export default class BuildMergedTiles extends Step {
    constructor() {
        super("_mergedTiles", "csv");
    }


    Step(input: string, done: (result: string) => void): void {
        const countryTiles = (JSON.parse(input) as any[]).map(TileOverview.Restore);

        // So... What we do here is merge every tile, one by one
        // If a smaller tile arrives on a bigger tile, the bigger tile is split
        console.log("Merging tiles!")
        const tileOverview = new TileOverview("", "MergedTiles", null, "../data/")


        // First of all, we add all the tiles to the tileOverview, from all zoom levels
        // Note that at this stage, some tiles might have subtiles and should be broken
        let maxZ = 0;
        for (const countryTile of countryTiles) {
            const countryOverview = countryTile.GetTileOverview();
            for (const xyz of countryOverview) {
                if (countryTile.DoesExist(xyz.z, xyz.x, xyz.y) !== TileState.EXISTS) {
                    continue;
                }
                tileOverview.Add(xyz.z, xyz.x, xyz.y);
                maxZ = Math.max(maxZ, xyz.z);
            }
        }

        // Zoom in more goes to the 'leaf'-tiles and marks all parent-location as 'Zoom in more'
        tileOverview.AddZoomInMore();

        // At this point,   we know of every tile in the world if it exist, if it is a leaf node or a node to zoom in further
        for (const countryTile of countryTiles) {

            for (let z = 0; z < maxZ /*note: < is sufficient, every tile at zoom level maxZ is by definition a leaf node*/; z++) {


                for (const xy of countryTile.GetTileOverviewAt(z)) {
                    const x = xy.x;
                    const y = xy.y;
                    if (countryTile.DoesExist(z, x, y) !== TileState.EXISTS) {
                        continue;
                    }
                    const state = tileOverview.DoesExist(z, x, y);
                    if (state === TileState.EXISTS) {
                        // Nothing more to do, this is fine!
                        continue;
                    }
                  
                    if (state === TileState.NOT_DEFINED) {
                        throw "This should not happen"
                    }

                    // We have to split this (country) tile
                    countryTile.BreakTile({z: z, x: x, y: y}).forEach(addedTile => {
                        tileOverview.Add(addedTile.z, addedTile.x, addedTile.y);

                    });
                    tileOverview.AddZoomInMore();
                }
            }
        }

        if (!fs.existsSync("../data/MergedTiles")) {
            fs.mkdirSync("../data/MergedTiles")
        }

        console.log("Merging the leaf tiles... This can take a while")
        // At this point, all the leaf tile indices are known
        // Now, we can actually build the leaf tiles by merging the geojson features
        const allTiles = tileOverview.GetTileOverview();
        let count = 0;
        for (const xyz of allTiles) {
            count++;
            if (count % 100 == 0) {
                console.log("Constructed tile ", count + "/" + allTiles.length);
            }
            const features = []
            for (const countryTile of countryTiles) {
                countryTile.AddZoomInMore();
                if (countryTile.DoesExist(xyz.z, xyz.x, xyz.y) === TileState.EXISTS) {
                    let geometry = countryTile.GetGeoJson(xyz);
                    if (geometry.type === "Feature") {
                        geometry.properties.country = countryTile.countryCode;
                    } else if (geometry.type === "Polygon" || geometry.type === "MultiPolygon") {
                        geometry = {
                            type: "Feature",
                            properties: {
                                country: countryTile.countryCode
                            },
                            geometry: geometry
                        }
                    }
                    features.push(geometry)
                }
            }

            if (features.length === 0) {
                continue;
            }

            const geojson = {
                type: "FeatureCollection",
                features: features
            }
            tileOverview.WriteGeoJson(xyz, geojson);
        }


        // AT this point, we are done
        // We write an overview
        const overview = tileOverview.GetTileOverview();
        const csvEntries: string [] = [];
        for (const tile of overview) {
            if (tileOverview.DoesExist(tile.z, tile.x, tile.y) === TileState.EXISTS) {
                csvEntries.push(`${tile.z};${tile.x};${tile.y}`)
            }
        }
        done(csvEntries.join("\n"));
    }

}