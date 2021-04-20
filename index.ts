import axios from "axios";
import {CharacterDungeonData} from "./models";
import * as creds from './creds.json';
import {GoogleSpreadsheet, GoogleSpreadsheetWorksheet} from "google-spreadsheet";
import * as jsdom from 'jsdom';

const sheetId = '1NXQK_nx2bU4StkUYClFTcDVuOsZXg8dCq2V3jeIIkP0';
const raiderIOApi = 'https://raider.io/api/v1/characters/profile';

const dungeonIds = {
    nw: 12916,
    soa: 12837,
    top: 12841,
    pf: 13228,
    mists: 13334,
    dos: 13309,
    hoa: 12831,
    sd: 12842
};

function dungeonDataUrl(charId: string, dungeonId: number): string {
    return `https://raider.io/api/characters/mythic-plus-runs?season=season-sl-1&characterId=${charId}&dungeonId=${dungeonId}&role=all&specId=0&mode=scored&affixes=all&date=all`
}

async function setupWorksheet(): Promise<GoogleSpreadsheetWorksheet> {
    const doc = new GoogleSpreadsheet(sheetId);
    await doc.useServiceAccountAuth({client_email: creds.client_email, private_key: creds.private_key})
    await doc.loadInfo()

    const worksheet = doc.sheetsByTitle['KSM'];
    await worksheet.loadHeaderRow();

    return worksheet;
}

async function getDataFromSheet(worksheet: GoogleSpreadsheetWorksheet): Promise<CharacterDungeonData[]> {
    const characters = Array<CharacterDungeonData>();
    const rows = await worksheet.getRows()

    const nameColumn = worksheet.headerValues[0]
    const realmColumn = worksheet.headerValues[2]

    let iter = 0;
    while (rows[iter][nameColumn] != '') {
        const charName = rows[iter][nameColumn];
        const realm = rows[iter][realmColumn];
        const characterDungeonData = new CharacterDungeonData(charName, realm, 0, 0, 0, 0, 0, 0, 0, 0);
        characters.push(characterDungeonData);
        iter++;
    }

    return characters;
}

async function getRioCharacterId(profileUrl: string): Promise<string | null> {
    try {
        const response = await axios.get(profileUrl)
        const dom = new jsdom.JSDOM(response.data);
        const scriptString = dom.window.document.body.querySelector('script')?.textContent;
        if (scriptString != null) {
            let newstring = scriptString.substr(35).slice(0, -6);
            return JSON.parse(newstring).characterDetails.character.id
        }
    } catch (e) {
        console.error('Error: ', e)
        return null;
    }
    return null;
}

async function getRioProfileUrl(cdd: CharacterDungeonData) {
    try {
        const response = await axios.get(raiderIOApi, {
            params: {
                region: 'eu',
                realm: cdd.server,
                name: cdd.name
            }
        })

        if (response.data) {
            return new URL(response.data.profile_url).toString();
        }
    } catch (e) {
        console.error('Error: ', e)
        return null;
    }

    return null
}

async function getHighestTimedKeystoneLevelForDungeon(charId: string, dungeonId: number): Promise<number> {
    const response = await axios.get(dungeonDataUrl(charId, dungeonId))
    if (!response.data) {
        return 0;
    }

    const sortedRuns = (response.data.runs as Array<any>).filter(value => value.summary.num_chests > 0).sort((a, b) => b.summary.mythic_level - a.summary.mythic_level);
    if (sortedRuns.length > 0) {
        return sortedRuns[0].summary.mythic_level;
    }

    return 0;
}

async function getDungeonDataForCDD(cdd: CharacterDungeonData): Promise<void> {
    try {
        const profileUrl = await getRioProfileUrl(cdd);
        if (!profileUrl) {
            return;
        }

        const characterId = await getRioCharacterId(profileUrl);
        if (!characterId) {
            return;
        }

        cdd.nw = await getHighestTimedKeystoneLevelForDungeon(characterId, dungeonIds.nw)
        cdd.soa = await getHighestTimedKeystoneLevelForDungeon(characterId, dungeonIds.soa)
        cdd.top = await getHighestTimedKeystoneLevelForDungeon(characterId, dungeonIds.top)
        cdd.pf = await getHighestTimedKeystoneLevelForDungeon(characterId, dungeonIds.pf)
        cdd.mists = await getHighestTimedKeystoneLevelForDungeon(characterId, dungeonIds.mists)
        cdd.dos = await getHighestTimedKeystoneLevelForDungeon(characterId, dungeonIds.dos)
        cdd.hoa = await getHighestTimedKeystoneLevelForDungeon(characterId, dungeonIds.hoa)
        cdd.sd = await getHighestTimedKeystoneLevelForDungeon(characterId, dungeonIds.sd)

    } catch (e) {
        console.error('Error: ', e)
    }
}

async function writeUpdatedDataToSheet(characters: CharacterDungeonData[], worksheet: GoogleSpreadsheetWorksheet) {
    const rows = await worksheet.getRows()
    const header = worksheet.headerValues;

    const nameColumn = header[0]
    const nwColumn = header[3]
    const soaColumn = header[4]
    const topColumn = header[5]
    const pfColumn = header[6]
    const mistsColumn = header[7]
    const dosColumn = header[8]
    const hoaColumn = header[9]
    const sdColumn = header[10]
    const explorerColumn = header[11]
    const conquerorColumn = header[12]
    const masterColumn = header[13]

    for (const character of characters) {
        const row = rows.find(row => row[nameColumn] == character.name)
        if (row != null) {
            row[nwColumn] = character.nw;
            row[soaColumn] = character.soa;
            row[topColumn] = character.top;
            row[pfColumn] = character.pf;
            row[mistsColumn] = character.mists;
            row[dosColumn] = character.dos;
            row[hoaColumn] = character.hoa;
            row[sdColumn] = character.sd;

            if(character.isExplorer()) {
                row[explorerColumn] = 'Yes'
            } else {
                row[explorerColumn] = 'No'
            }

            if(character.isConqueror()) {
                row[conquerorColumn] = 'Yes'
            } else {
                row[conquerorColumn] = 'No'
            }

            if(character.isMaster()) {
                row[masterColumn] = 'Yes'
            } else {
                row[masterColumn] = 'No'
            }

            await row.save()
        }
    }
}

async function updateDataInKSMSheet() {
    try {
        const worksheet = await setupWorksheet();
        const characterData = await getDataFromSheet(worksheet);

        for (const character of characterData) {
            await getDungeonDataForCDD(character);
        }

        await writeUpdatedDataToSheet(characterData, worksheet);
    } catch (e) {
        console.error(e)
    }
}

updateDataInKSMSheet()

export {};