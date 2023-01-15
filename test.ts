import {CountryCoder} from "./src/CountryCoder";
import https from "https";
import Utils from "./generator/Utils";

console.log("Testing...")

function pr(countries: string[]) {
    console.log(">>>>>", countries.join(";"))
}

function expects(expected: string) {
    return (countries) => {
        if (countries.join(";") !== expected) {
            console.error("Unexpected country: got ", countries, "expected:", expected)
        } else {
            console.log("[OK] Got " + countries)
        }
    }
}

console.log("Hi world")
const url = "https://raw.githubusercontent.com/pietervdvn/MapComplete-data/main/latlon2country"
const coder = new CountryCoder(url, url =>
    new Promise((resolve, reject) => Utils.Download(url, (result) => resolve(JSON.parse(result)), reject)));
coder.GetCountryCodeFor(3.2, 51.2, expects("BE"))
coder.GetCountryCodeFor(4.92119, 51.43995, expects("BE"))
coder.GetCountryCodeFor(4.93189, 51.43552, expects("NL"))
coder.GetCountryCodeFor(34.2581, 44.7536, expects("RU;UA"))
coder.GetCountryCodeFor(-9.1330343, 38.7351593, expects("PT"))
coder.GetCountryCodeFor(3.1052356,50.7899285, expects("BE"))