import CountryCoder from "./client/countryCoder";
import exp = require("constants");
CountryCoder.runningFromConsole = true;
console.log("Testing...")

function pr(countries: string[]) {
    console.log(">>>>>", countries.join(";"))
}

function expects(expected: string){
    return (countries) => {
        if(countries.join(";") !== expected){
            console.error("Unexpected country: got ", countries, "expected:", expected)
        }else{
            console.log("[OK] Got "+countries)
        }
    }
}

console.log("Hi world")
const coder = new CountryCoder("https://pietervdvn.github.io/latlon2country");
/*
coder.CountryCodeFor(3.2, 51.2, expects("BE"))
coder.CountryCodeFor(4.92119, 51.43995, expects("BE"))
coder.CountryCodeFor(4.93189, 51.43552, expects("NL"))
coder.CountryCodeFor(34.2581, 44.7536, expects("RU;UA"))//*/
coder.CountryCodeFor( -9.1330343,38.7351593, expects("PT"))