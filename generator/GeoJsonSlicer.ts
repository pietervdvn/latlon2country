import * as fs from "fs";
import Step from "./Step";
import TileOverview from "./TileOverview";


/***
 * The geojson-slicer takes a world boundary and splits them into smaller parts, so that every part has a max complexity
 *
 * The end result of this step is a CSV-overview of the generated tiles. As a side effect, all the tiles are written into "data/tiles"
 */
export default class GeoJsonSlicer extends Step {
    private _maxComplexity: number;
    private _countryName: string;


    constructor(countryName: string, maxComplexity: number = 300) {
        super(countryName + ".tiles", "csv")
        this._maxComplexity = maxComplexity;
        this._countryName = countryName;
    }


    private Complexity(geojson: any): number {
        if (geojson.type === "Feature") {
            return this.Complexity(geojson.geometry);
        }

        if (geojson.type === "GeometryCollection") {
            let sum = 0;
            for (const sub of geojson.geometries) {
                sum += this.Complexity(sub);
            }
            return sum;
        }

        if (geojson.type === "MultiPolygon") {
            // coordinates is a list of list of coordinates
            let sum = 0;
            for (const containerOuter of geojson.coordinates) {
                for (const container of containerOuter) {
                    sum += container.length;
                }
            }
            return sum;
        } else if (geojson.type === "Polygon") {
            let sum = 0;
            for (const container of geojson.coordinates) {
                sum += container.length;
            }
            return sum;
        } else if (geojson.type === "LineString") {
            let sum = 0;
            for (const container of geojson.coordinates) {
                sum += container.length;
            }
            return sum;
        } else if (geojson.type === "Point") {
            return 0;
        }
        throw "Unknown type " + geojson.type;
    }


    Step(geoJsonString: string, done: (result: string) => void) {
        const tileOverview = new TileOverview(this._countryName, this._countryName);
        
        const parsed = JSON.parse(geoJsonString)
        if(parsed.type === "FeatureCollection"){

            if(parsed.features.length > 1){
                throw "Got a featurecollection with multiple features; only a single feature is supported"
            }

            geoJsonString = JSON.stringify(parsed.features[0])
        }
        
        tileOverview.Add(0, 0, 0);
        const zeroTile = {z: 0, x: 0, y: 0};
        if (!fs.existsSync(tileOverview.GetPath())) {
            fs.mkdirSync(tileOverview.GetPath(), {recursive: true});
        }
        fs.writeFileSync(tileOverview.GetPath(zeroTile), geoJsonString, {encoding: "utf8"});

        const queue = [zeroTile];
        while (queue.length > 0) {
            const tile = queue.pop();
            const geoJSON = tileOverview.GetGeoJson(tile);
            if (this.Complexity(geoJSON) > this._maxComplexity) {
                const newTiles = tileOverview.BreakTile(tile);
                queue.push(...newTiles);
            }
        }


        const overview = tileOverview.GetTileOverview().map(tile => tile.z + ";" + tile.x + ";" + tile.y).join("\n");
        done(overview);
    }
}