import Utils from "./Utils";
import Step from "./Step";

/*
Uses nominatim to get the boundary as geojson
 */
export default class DownloadBoundary extends Step {

    constructor(countryName) {
        super(countryName, "geojson");
    }

    private static readonly servers = [
        "https://nominatim.openstreetmap.org/search.php?",
        "https://nominatim.geocoding.ai/search?", 
    ]
    private lastUsedServer = 0;

    Step(input: string, done: (result: string) => void) {
        // input should be the same as the country name
        const countryName = input;

        const server = DownloadBoundary.servers[this.lastUsedServer];
        this.lastUsedServer = (this.lastUsedServer + 1) % DownloadBoundary.length;

        const query = `${server}q=${countryName}&polygon_geojson=1&format=jsonv2`;

        Utils.Download(query, data => {
            const json = JSON.parse(data)[0];
            if (json.category !== "boundary") {
                console.error("THIS IS NOT A BOUNDARY FOR " + countryName);
                return;
            }
            done(JSON.stringify(json.geojson));
        })
    };
}