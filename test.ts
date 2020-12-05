import CountryCoder from "./client/countryCoder";

console.log("Testing...")

function pr(countries: string[]) {
    console.log(">>>>>", countries.join(";"))
}

console.log("Hi world")
const coder = new CountryCoder("https://pietervdvn.github.io/latlon2country");
coder.CountryCodeFor(3.2, 51.2, pr)
coder.CountryCodeFor(4.92119, 51.43995, pr)
coder.CountryCodeFor(4.93189, 51.43552, pr)
coder.CountryCodeFor(34.2581, 44.7536, pr)