import * as fs from "fs";

export default abstract class Step {

    public readonly name: string;
    private _format: string;

    constructor(name: string, format: string) {
        this.name = name;
        this._format = format;
    }

    public PerformOrFromCache(input: () => string, done: ((result: string) => void)): void {
        const path = `../data/${this.name}.${this._format}`;
        const alreadyDone = fs.existsSync(path);
        if (alreadyDone) {
            console.log("\r[Cached] " + this.name)
            const result = fs.readFileSync(path, {encoding: "utf8"})
            done(result);
        } else {
            console.log("> " + this.name)
            this.Step(input(), (result) => {
                fs.writeFileSync(path, result, {encoding: "utf8"})
                done(result);
            })
        }
    }

    public abstract Step(input: string, done: ((result: string) => void)): void;

}