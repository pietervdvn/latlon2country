import * as https from "https";

export default class Utils {

    public static Download(url: string, onSuccess: (data: string) => void, onFail?: (msg: string) => void,
                           format = "application/json") {

        if(onFail === undefined){
            onFail = console.error
        }
        const chunks = []
        console.warn("Downloading "+url);
        const req = https.request(url, {
            headers: {"Accept": format, "User-agent":"latlon2country generator (Pietervdvn@posteo.net)"}}, function (res) {
            res.setEncoding('utf8');
            res.on('data', data => {
                chunks.push(data)
            });
        });
        req.on('error', function (e) {
            onFail(e.message)
        });
        req.on("close", 
            () => {
            onSuccess(chunks.join(""))
            }
            )
        req.end();
    }
}
