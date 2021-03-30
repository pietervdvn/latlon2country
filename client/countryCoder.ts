import * as turf from "turf";

export default class CountryCoder {
    public static runningFromConsole = false;
    /* url --> ([callbacks to call] | result) */
    private static readonly cache = {}
    private readonly _host: string;

    constructor(host: string) {
        this._host = host;
    }

    lon2tile(lon: number, zoom: number): number {
        return Math.floor((lon + 180) / 360 * Math.pow(2, zoom));
    }

    lat2tile(lat: number, zoom: number): number {
        return Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom));
    }

    Fetch(z: number, x: number, y: number, callback: ((data: any) => void)): void {

        const path = `${z}.${x}.${y}.json`;
        // @ts-ignore
        let cached: { callbacks: ((data: any) => void)[], data: any } = CountryCoder.cache[path];
        if (cached !== undefined) {
            if (cached.data !== null) {
                // O, the data has already arrived!
                callback(cached.data);
            } else {
                // We'll handle this later when the data is there
                cached.callbacks.push(callback);
            }
            // Nothing more to do right now
            return;
        }

        // No cache has been defined at this point -> we define the cache + callbacks store
        cached = {
            data: null,
            callbacks: []
        };
        // @ts-ignore
        CountryCoder.cache[path] = cached;

        const url = this._host + "/" + path;
        cached.callbacks.push(callback);

        const xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        xhr.responseType = 'json';
        xhr.onload = function () {
            var status = xhr.status;
            if (status === 200) {
                cached.data = xhr.response;
                for (const callback of cached.callbacks) {
                    callback(xhr.response);
                }
            } else {
                console.error("COULD NOT GET ", url)
            }
        };
        xhr.send();

    }

    determineCountry(lon: number, lat: number, z: number, x: number, y: number, callback: ((countries: string[]) => void)): void {

        this.Fetch(z, x, y, data => {
            if(data === undefined){
                throw `Got undefined for ${z}, ${x}, ${y}`;
            }
            if (data.length !== undefined) {
                // This is an array
                // If there is a single element, we have found our country
                if (data.length === 1) {
                    callback(data)
                    return;
                }

                // The appropriate subtile is determined by zoom level + 1
                const dx = this.lon2tile(lon, z + 1);
                const dy = this.lat2tile(lat, z + 1);

                // Determine the quadrant
                // We determine the difference with what 'x' and 'y' would be for the upper left quadrant
                const index = (dx - x * 2) + 2 * (dy - y * 2);
                const state = data[index];
                if (state === 0) {
                    // No country defined, probably international waters
                    callback([]);
                }
                const nextZoom = Number(state);
                if (isNaN(nextZoom)) {
                    // We have found the country!
                    callback([state]);
                    return;
                }

                // Last case: the next zoom level is given:
                this.determineCountry(lon, lat, nextZoom, this.lon2tile(lon, nextZoom), this.lat2tile(lat, nextZoom), callback)

            } else {
                // We have reached an actual leaf tile with actual geometries
                const geojson = data;
                const countries = [];

                for (const feature of geojson.features) {
                    const inPolygon = turf.inside(turf.point([lon, lat]), feature);
                    if (inPolygon) {
                        const country = feature.properties.country;
                        countries.push(country)
                    }
                }
                countries.sort();
                callback(countries);
            }


        })

    }

    CountryCodeFor(lon: number, lat: number, callback: ((countries: string[]) => void)): void {
        // We wrap the callback into a try catch, in case something goes wrong
        const safeCallback = (countries) => {
            try {
                callback(countries);
            } catch (e) {
                console.error("Latlon2country: the dev of this website made a call with CountryCodeFor, however, their callback failed with " + e)
            }
        }
        this.determineCountry(lon, lat, 0, 0, 0, safeCallback);
    }

}
