import Step from "./Step";
import TileOverview from "./TileOverview";

/**
 * Simplify-tile makes the simplified leaf tile for a given location.
 * The input of the step is the geojson of the tile.
 * IF no simplification can be made, it is copied.
 */
export default class SimplifyTile extends Step {

    private readonly _xyz: { x: number, y: number, z: number };

    constructor(xyz: { x: number, y: number, z: number }) {
        super(`./Simplified/${xyz.z}.${xyz.x}.${xyz.y}`, 'json');
        this._xyz = xyz;
    }

    Step(tileGeoJson: string, done: (result: string) => void): void {

        const geojson = JSON.parse(tileGeoJson);
        if (geojson.features.length === 1) {
            const result = [geojson.features[0].properties.country];
            done(JSON.stringify(result));
            return;
        }

        // Simply copy the tile
        done(tileGeoJson);

    }

}