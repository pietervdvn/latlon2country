import DownloadBoundary from "./DownloadBoundary";
import DownloadCountryCodes from "./DownloadCountryCodes";

export default class DownloadAllBoundaries {

    OnEveryCountry<T>(countries: string,
                      onEveryCountry: (result: string, partName: string) => T,
                      allDone: ((ts: T[]) => void)
    ): void {
        const queue = countries.split("\n")
            .filter(s => s != "")
            .map(c => c.split(";")[1])
            .filter(c => c!== undefined && DownloadCountryCodes.CountryBlackList.indexOf(c) < 0)
        
        queue.reverse();
        const totalCount = queue.length;
        const results: T[] = []

        function RunNext() {

            // NOTE:
            // Following countries failed and are downloaded via osm-boundaries
            // Japan
            // San Marino
            // Kosovo
            // Luxembourg
            // Lebanon

            const firstCountry = queue.pop();
            console.log("NExt target:", firstCountry)
            new DownloadBoundary(firstCountry).PerformOrFromCache(() => firstCountry,
                geojson => {
                    if (geojson !== null) {
                        console.log((totalCount - queue.length) + "/" + totalCount)
                        const result = onEveryCountry(geojson, firstCountry);
                        results.push(result);
                    }

                    if (queue.length > 0) {
                        RunNext();
                    } else {
                        allDone(results);
                    }
                })
        }

        RunNext();
    }

}