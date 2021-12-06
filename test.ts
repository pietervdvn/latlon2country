import {CountryCoder} from "./src/CountryCoder";

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
const coder = new CountryCoder("https://pietervdvn.github.io/latlon2country");
coder.GetCountryCodeFor(3.2, 51.2, expects("BE"))
coder.GetCountryCodeFor(4.92119, 51.43995, expects("BE"))
coder.GetCountryCodeFor(4.93189, 51.43552, expects("NL"))
coder.GetCountryCodeFor(34.2581, 44.7536, expects("RU;UA"))
coder.GetCountryCodeFor(-9.1330343, 38.7351593, expects("PT"))