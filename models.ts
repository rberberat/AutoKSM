export class CharacterDungeonData{
    name: string;
    server: string;
    nw: number;
    soa: number;
    top: number;
    pf: number;
    mists: number;
    dos: number;
    hoa: number;
    sd: number;


    constructor(name: string, server: string, nw: number, soa: number, top: number, pf: number, mists: number, dos: number, hoa: number, sd: number) {
        this.name = name;
        this.server = server;
        this.nw = nw;
        this.soa = soa;
        this.top = top;
        this.pf = pf;
        this.mists = mists;
        this.dos = dos;
        this.hoa = hoa;
        this.sd = sd;
    }

    public hasAllKeysHigherOrEqualThan(level:number) : boolean {
        return this.nw >= level &&
            this.soa >= level &&
            this.top >= level &&
            this.pf >= level &&
            this.mists >= level &&
            this.dos >= level &&
            this.hoa >= level &&
            this.sd >= level;
    }

    public isExplorer() : boolean{
        return this.hasAllKeysHigherOrEqualThan(5);
    }

    public isConqueror() : boolean{
        return this.hasAllKeysHigherOrEqualThan(10);
    }

    public isMaster() : boolean {
        return this.hasAllKeysHigherOrEqualThan(15);
    }

    public toString() : string {
        return `{ Name: ${this.name}; Server: ${this.server}; NW: ${this.nw}; SOA: ${this.soa}; TOP: ${this.top}; PF: ${this.pf}; MISTS: ${this.mists}; DOS: ${this.dos}; HOA: ${this.hoa}; SD: ${this.sd};  }`
    }
}