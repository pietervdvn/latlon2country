import * as fs from "fs";
import * as turf from "turf";

function lon2tile(lon, zoom) {
    return Math.floor((lon + 180) / 360 * Math.pow(2, zoom));
}

function lat2tile(lat, zoom) {
    return Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom));
}


function Fetch(z, x, y, callback: ((data: any) => void)): void {
    const data = fs.readFileSync(`../data/Simplified/${z}.${x}.${y}.json`, {encoding: "utf8"});
    callback(JSON.parse(data));
}

function determineCountry(lon, lat, z, x, y, callback: ((countries: string[]) => void)): void {

    Fetch(z, x, y, data => {
        if (data.length !== undefined) {
            // This is an array
            // If there is a single element, we have found our country
            if (data.length === 1) {
                return data;
            }

            // The appropriate subtile is determined by zoom level + 1
            const dx = lon2tile(lon, z + 1);
            const dy = lat2tile(lat, z + 1);

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
            }

            // Last case: the next zoom level is given:
            determineCountry(lon, lat, nextZoom, lon2tile(lon, nextZoom), lat2tile(lat, nextZoom), callback)

        }else{
            // We have reached an actual leaf tile with actual geometry
            const geojson = data;
            const countries = [];

            for (const feature of geojson.features) {
                const intersection = turf.intersect(turf.point([lon, lat]), feature)
                if(intersection !== undefined){
                    const country = feature.properties.country;
                    countries.push(country)
                }
            }
            countries.sort();
            callback(countries);
        }


    })

}

function CountryCodeFor(lon, lat, callback: ((countries: string[]) => void)): void {
    determineCountry(lon, lat, 0, 0, 0, callback);
}


function pr(countries) {
    console.log(">>>>>", countries.join(";"))
}

CountryCodeFor(3.2, 51.2, pr)
CountryCodeFor(4.92119, 51.43995, pr)
CountryCodeFor(4.93189, 51.43552, pr)
CountryCodeFor(34.2581, 44.7536, pr)
