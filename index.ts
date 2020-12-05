import CC from "./client/countryCoder"

export default class CountryCoder {

    private readonly cc: CC;

    constructor(host: string) {
        this.cc = new CC(host);
    }

    public GetCountryCodeFor(lon: number, lat: number, callback: ((countries: string[]) => void)): void {
        this.cc.CountryCodeFor(lon, lat, callback)
    }
}