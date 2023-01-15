import Utils from "./Utils";
import Step from "./Step";
/*
Downloads the ISO-3166-1 ALPHA2 country codes from Wikidata,
writes them into 
 */

export default class DownloadCountryCodes extends Step {

    // The following entries cause nominatim not to return a country, we skip them for now
    public static readonly CountryBlackList =
        ["United States Minor Outlying Islands", "Saint Helena, Ascension and Tristan da Cunha", "Réunion",
            "French Polynesia", "Norfolk Island",
            "Saint Martin (French part)", "Martinique", "Antarctic Treaty area", "Marshall Islands", "Aruba", "Åland Islands",
            "Bouvet Island", "Cocos (Keeling) Islands", "Curaçao", "Christmas Island", "Isle of Man",
            "Comoros", "Western Sahara", "Jersey", "Guernsey", "Guam",
            "Caribbean Netherlands", "Diego Garcia", "Ceuta and Melilla",
            "Yugoslavia",
            // Duplicate entries:
            "Kingdom of the Netherlands", "Danish Realm", "Sahrawi Arab Democratic Republic"]

    constructor() {
        super("_countries", 'csv')
    }

    public Step(_, done: (countryCodes: string) => void) {
        const query = "https://query.wikidata.org/sparql?query=SELECT%20%3Fitem%20%3FitemLabel%20%3Flabel%20WHERE%20%7B%0A%20%20SERVICE%20wikibase%3Alabel%20%7B%20bd%3AserviceParam%20wikibase%3Alanguage%20%22en%2Cen%22.%20%7D%0A%20%20%3Fitem%20wdt%3AP297%20%3Flabel.%0A%7D%0ALIMIT%20500"
        Utils.Download(query, (data => {
            console.log("Download country codes from wikidata")
            const lines = data.split("\n");
            const codes = []
            const countries = []
            for (const line of lines) {

                // This is a really brittle scraper of the XML...
                const match = line.match(/ *<literal>([A-Z]{2})<\/literal>/)
                if (match !== null) {
                    codes.push(match[1])
                }
                const matchCountry = line.match(/ *<literal xml:lang='en'>(.*)<\/literal>/)
                if (matchCountry !== null) {
                    countries.push(matchCountry[1])
                }

            }

            let csv = [];
            for (let i = 0; i < countries.length; i++) {
                if (DownloadCountryCodes.CountryBlackList.indexOf(countries[i]) >= 0) {
                    continue;
                    // This country is blacklisted for some reason
                }
                csv.push(`${codes[i]};${countries[i]}`);
            }
            csv.sort()

            const result = csv.join("\n")
            done(result)
        }), undefined, "application/xml");
    }
}
