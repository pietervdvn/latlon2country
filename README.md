LatLon2Country
==============

LatLon2Country is a reverse geocoder, whose goal is to convert a location (latlon) into the country code in which the
location lies in the browser.

It is specifically designed to work with opening_hours.js and MapComplete and borrows ideas from codegrid.

Usage
-----

Install with npm:

`npm install latlon2country`

Run the code:

`const coder = new CountryCoder("https://pietervdvn.github.io/latlon2country/")
coder.CountryCodeFor(lon, lat)
`

If you want to selfhost the tiles (which is highly recommended), download [tiles.zip](tiles.zip), extract the zip to
your server and point the constructor above to the correct path.

Base architecture
-----------------

The client side downloads tiles with information to determine the country of a point. These tiles are statically
generated by the 'generate'-scripts and are used to determine the country. Note that no country might be returned (e.g.
the international waters), one country might be returned (most of the cases) or _multiple_ countries might be returned (
contested territory). In the latter case, be _very_ careful which one to show!

The code is specifically designed to handle multiple calls efficiently (e.g.: if a 100 points close to each other are
requested at the same moment, these should only cause the correct tiles to downloaded once).


Tile format
-----------

The requested tiles all have the extension '.json'. THey however break down into two types of tiles:

- Leaf tiles
- 'Go Deeper'-tiles

### Leaf tiles

A 'leaf'-tile is a tile with which the actual country can be determined without downloading more tiles.

If the result is uniform accross the tile (most commonly: the tile is completely within a single country), then the tile
will consist of `["country_code"]`

If a border goes trhough the tile, the tile will contain the actual geometries and the leaftile is a standard geojson
file.

The client library will enumerate _all_ the polygons and determine in which polygons the requested points lie. Multiple
countries can be returned.

Note that the geometry-leaf-tiles have a fixed upper bound in size, in order to make processing fast (that is the entire
point of this library)

### Go-Deeper-tiles

THe other are tiles which contain an overview of the next step to take, e.g.

`
z.x.y.json
[ "be", z + 1, z + 5, 0 ]
`

This tile is a single array, which contains the next actions to take for the upper left, upper right, bottom left and
bottom right subtile respectively.

The upper left tile falls completely within belgium (so no more action is needed). To know the country of upper right
one, one should download the appropriate tile at zoomlevel (z + 1). The bottom left tile is split multiple times, and
the biggest subtiles there are way deeper, at 'z + 5' - so we skip all the intermediate layers and fetch the deeper tile
immediately. For the bottom right tile, nothing (0) is defined, meaning international waters.

Note that in some edge cases, _multiple_ country codes are given, e.g.:

[ "RU;UA", ... ]

This would indicate disputed territory, e.g. Crimea which is disputed and claimed by both Russia and Ukraine. The client
returns those in alphabetical order. It is the responsibility of the program using this code to determine the "correct"
country.
