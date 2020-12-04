import DownloadBoundary from "./DownloadBoundary";

export default class DownloadAllBoundaries {

    OnEveryCountry<T>(countries: string,
                      onEveryCountry: (result: string, partName: string) => T,
                      allDone: ((ts: T[]) => void)
    ): void {
        const queue = countries.split("\n")
            .filter(s => s != "")
            .map(c => c.split(";")[1]);
        queue.reverse();
        const totalCount = queue.length;
        const results: T[] = []

        function RunNext() {

            // NOTE:
            // Following countries failed and are downloaded via osm-boundaries
            // San Marino
            // Kosovo
            // Luxembourg
            // Lebanon

            const firstCountry = queue.pop();
            new DownloadBoundary(firstCountry).PerformOrFromCache(() => firstCountry,
                geojson => {
                    console.log((totalCount - queue.length) + "/" + totalCount)
                    const result = onEveryCountry(geojson, firstCountry);
                    results.push(result);

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