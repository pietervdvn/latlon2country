import * as fs from "fs"
import * as turf from "turf";

export enum TileState {

    NOT_DEFINED,
    EXISTS,
    ZOOM_IN_MORE

}

export default class TileOverview {
    public countryCode: string;
    private readonly _countryName: string;
    private readonly _path: string;
    private _tiles: any; /* { z --> {x --> y}} */

    constructor(countryCode: string, countryName: string, csv?: string, path: string = "../data/tiles/") {
        this.countryCode = countryCode;
        this._countryName = countryName;
        this._path = path;
        this._tiles = {};
        if (csv !== undefined && csv !== null) {

            for (const tile of csv.split("\n")) {
                const [z, x, y] = tile.split(";").map(Number);
                this.Add(z, x, y);
            }
        }
        this.AddZoomInMore();
    }

    static Restore(data: any) {
        const overview = new TileOverview(data.countryCode, data._countryName, undefined, data._path);
        overview._tiles = data._tiles;
        return overview;
    }

    Add(z: number, x: number, y: number, state: TileState = TileState.EXISTS): void {
        const dz = this._tiles[z];
        if (dz === undefined) {
            this._tiles[z] = {};
        }
        const dx = this._tiles[z][x];
        if (dx === undefined) {
            this._tiles[z][x] = {}
        }
        this._tiles[z][x][y] = state;
    }

    DoesExist(z: number, x: number, y: number): TileState {
        const dz = this._tiles[z];
        if (dz === undefined) {
            return TileState.NOT_DEFINED;
        }
        const dx = dz[x];
        if (dx === undefined) {
            return TileState.NOT_DEFINED;
        }
        return dx[y] ?? TileState.NOT_DEFINED;
    }

    BreakTile(xyz: { z: number, x: number, y: number }): { z: number, x: number, y: number }[] {
        const z = xyz.z;
        const x = xyz.x;
        const y = xyz.y;

        console.log("Breaking ",z,x,y, this._countryName);
        const status = this.DoesExist(z, x, y);
        if (status !== TileState.EXISTS) {
            throw "Attempting to split a tile which doesn't exist"
        }

        const geojson = this.GetGeoJson({x: x, y: y, z: z})

        this._tiles[z][x][y] = TileState.ZOOM_IN_MORE;

        const results: { z: number, x: number, y: number }[] = [];

        function onNewTile(b: { z: number, x: number, y: number }) {
            results.push(b);
        }
        
        this.Add(z,x,y, TileState.ZOOM_IN_MORE);

        this.IntersectAndWrite({z: z + 1, x: x * 2, y: y * 2}, geojson, onNewTile);
        this.IntersectAndWrite({z: z + 1, x: x * 2 + 1, y: y * 2}, geojson, onNewTile);
        this.IntersectAndWrite({z: z + 1, x: x * 2, y: y * 2 + 1}, geojson, onNewTile);
        this.IntersectAndWrite({z: z + 1, x: x * 2 + 1, y: y * 2 + 1}, geojson, onNewTile);

        return results;

    }

    /**
     * Creates all the 'ZOOM IN MORE'-members
     * @constructor
     */
    public AddZoomInMore() {
        const overview = this.GetTileOverview();
        for (const tileIndex of overview) {
            let x = tileIndex.x;
            let y = tileIndex.y;

            for (let z = tileIndex.z - 1; z >= 0; z--) {
                x = Math.floor(x / 2);
                y = Math.floor(y / 2);

                const oldValue = this.DoesExist(z, x, y);
                if (oldValue === TileState.ZOOM_IN_MORE) {
                    continue;
                }
                // Note: we might overwrite an 'EXISTS' here - this is intentional as 'BuildMergeTiles' needs this
                this.Add(z, x, y, TileState.ZOOM_IN_MORE)
            }


        }

    }

    GetTileOverview(): { z: number, x: number, y: number }[] {
        const result: { z: number, x: number, y: number }[] = []
        for (const z in this._tiles) {
            for (const x in this._tiles[z]) {
                for (const y in this._tiles[z][x]) {
                    if (this._tiles[z][x][y] === TileState.EXISTS) {
                        result.push({z: Number(z), x: Number(x), y: Number(y)})
                    }
                }

            }
        }
        return result;
    }

    GetTileOverviewAt(z: number) {
        const result = []

        for (const x in this._tiles[z]) {
            for (const y in this._tiles[z][x]) {
                result.push({z: z, x: x, y: y})
            }

        }
        return result;
    }

    WriteGeoJson(xyz: { z: number; x: number; y: number }, contents: any) {
        fs.writeFileSync(this.GetPath(xyz), JSON.stringify(contents), {encoding: "utf8"});
    }

    GetGeoJson(xyz: { z: number; x: number; y: number }) {
        return JSON.parse(fs.readFileSync(this.GetPath(xyz), {encoding: "utf8"}))

    }

    private static LeftMostPointOf(xyz: { x: number, y: number, z: number }) {
        return [TileOverview.tile2lon(xyz.x, xyz.z), TileOverview.tile2lat(xyz.y, xyz.z)];
    }

    public static tile2lon(x: number, z: number): number {
        return (x * 360) / Math.pow(2, z) - 180;
    }

    public static tile2lat(y: number, z: number): number {
        var n = Math.PI - 2 * Math.PI * y / Math.pow(2, z);
        return 180 / Math.PI * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
    }


    public static tile2Bounds(xyz: { x: number, y: number, z: number }) {
        // Leftmost point
        const lon0: number = TileOverview.tile2lon(xyz.x, xyz.z);
        const lat0: number = TileOverview.tile2lat(xyz.y, xyz.z);
        // Rightbottom-most point
        const lon1: number = TileOverview.tile2lon(xyz.x + 1, xyz.z);
        const lat1: number = TileOverview.tile2lat(xyz.y + 1, xyz.z);
        return {
            "type": "Polygon",
            "coordinates": [
                [
                    [
                        lon0,
                        lat0
                    ],
                    [
                        lon1,
                        lat0
                    ],
                    [
                        lon1,
                        lat1
                    ],
                    [
                        lon0,
                        lat1
                    ],
                    [
                        lon0,
                        lat0
                    ]
                ]
            ]
        }

    }

    private IntersectAndWrite(bounds: { x: number, y: number, z: number }, geojson: any, onNewTile: (t: { z: number, x: number, y: number }) => void) {
        // @ts-ignore
        const intersection = turf.intersect(geojson, TileOverview.tile2Bounds(bounds));
        const z = bounds.z;
        const x = bounds.x;
        const y = bounds.y;

        if (intersection === undefined) {
            this.Add(z, x, y, TileState.NOT_DEFINED);
            return;
        }

        
        // @ts-ignore
        if (intersection.type === "Point") {
            this.Add(z, x, y, TileState.NOT_DEFINED);
            return;
        }


        fs.writeFileSync(`../data/tiles/${this._countryName}/${z}.${x}.${y}.geojson`,
            JSON.stringify(intersection), {encoding: "utf-8"})
        this.Add(z, x, y);
        onNewTile(bounds);
    }

    GetPath(xyz?: { z: number; x: number; y: number }) {
        const dir = `${this._path}/${this._countryName}/`
        if (xyz === undefined || xyz === null) {
            return dir;
        }
        return `${dir}${xyz.z}.${xyz.x}.${xyz.y}.geojson`;
    }

    DoesExistT(tileXYZ: { z: number; x: number; y: number }) : TileState {
        return this.DoesExist(tileXYZ.z, tileXYZ.x, tileXYZ.y);
    }
}