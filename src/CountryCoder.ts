import * as turf from "turf";

export class CountryCoder {

    /* url --> ([callbacks to call] | result) */
    private static readonly cache: Map<string, Promise<any>> = new Map<string, Promise<any>>()
    private readonly _host: string;
    private readonly _downloadFunction: (url: string) => Promise<any>;

    constructor(host: string, downloadFunction?: (url: string) => Promise<any>) {
        this._host = host;
        this._downloadFunction = downloadFunction;
    }

    public async GetCountryCodeAsync(lon: number, lat: number): Promise<string[]> {
        return this.GetCountryCodeForTile(lon, lat, 0, 0, 0);
    }

    public GetCountryCodeFor(lon: number, lat: number, callback: ((countries: string[]) => void)): void {
        this.GetCountryCodeAsync(lon, lat).then(callback)
    }

    private static lon2tile(lon: number, zoom: number): number {
        return Math.floor((lon + 180) / 360 * Math.pow(2, zoom));
    }

    private static lat2tile(lat: number, zoom: number): number {
        return Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom));
    }

    private static FetchJsonXhr(url): Promise<any> {
        return new Promise((accept, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('GET', url, true);
            xhr.responseType = 'json';
            xhr.onload = function () {
                var status = xhr.status;
                if (status === 200) {
                    accept(xhr.response)
                } else {
                    console.error("COULD NOT GET ", url)
                    reject(url)
                }
            };
            xhr.send();
        })
    }

    private async Fetch(z: number, x: number, y: number): Promise<number[] | string[] | any> {
        const path = `${z}.${x}.${y}.json`;
        const url = this._host + "/" + path;
        if (this._downloadFunction !== undefined) {
            return this._downloadFunction(url)
        } else {
            return CountryCoder.FetchJsonXhr(url)
        }
    }

    private async FetchCached(z: number, x: number, y: number): Promise<number[] | string[] | any> {
        const path = `${z}.${x}.${y}.json`;
        let cached = CountryCoder.cache.get(path)
        if (cached !== undefined) {
            return cached
        }
        const promise = this.Fetch(z, x, y)
        CountryCoder.cache.set(path, promise)
        return promise;
    }

    private async GetCountryCodeForTile(lon: number, lat: number, z: number, x: number, y: number): Promise<string[]> {

        const data = await this.FetchCached(z, x, y);

        if (data === undefined) {
            throw `Got undefined for ${z}, ${x}, ${y}`;
        }

        if (data.length === undefined) {
            // We have reached an actual leaf tile with actual geometries
            const geojson: any = data;
            const countries = [];

            for (const feature of geojson.features) {
                const inPolygon = turf.inside(turf.point([lon, lat]), feature);
                if (inPolygon) {
                    const country = feature.properties.country;
                    countries.push(country)
                }
            }
            countries.sort();
            return countries;
        }


        // This is an array either: either for numbers indicating the next zoom level to jump to or a list of country names
        if (data.length === 1) {
            // If there is a single element, we have found our country
            return data;
        }

        // The appropriate subtile is determined by zoom level + 1
        const dx = CountryCoder.lon2tile(lon, z + 1);
        const dy = CountryCoder.lat2tile(lat, z + 1);

        // Determine the quadrant
        // We determine the difference with what 'x' and 'y' would be for the upper left quadrant
        const index = (dx - x * 2) + 2 * (dy - y * 2);
        const state = data[index];
        if (state === 0) {
            // No country defined, probably international waters
            return []
        }
        const nextZoom = Number(state);
        if (isNaN(nextZoom)) {
            // We have found the country!
            return [state];
        }

        // Last case: the next zoom level is given:
        return this.GetCountryCodeForTile(lon, lat, nextZoom, CountryCoder.lon2tile(lon, nextZoom), CountryCoder.lat2tile(lat, nextZoom))


    }


}
