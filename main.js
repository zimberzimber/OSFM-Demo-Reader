const MARKS = {
    DEMO_START: "-------OSFM DEMO START------",
    DEMO_SAVE: "------OSFM DEMO SAVE------",
    DEMO_DATA: "------OSFM DEMO DATA------",
    SKIP_DATA: "------OSFM:SKIP:DATA------",
    SKIP_DATA_END: "------OSFM:SKIP:DATA:END------",
    MXCB_LAST: "------MXCB:LAST------",
    MXCB_STOP: "------MXCB:STOP------",
    MXCB_CHUNK_TEMPLATE: "------MXCB:{{CHUNK_SIZE}}:{{counter}}------",
    MXCB_CHUNK: (size, counter) => MARKS.MXCB_CHUNK_TEMPLATE.replace("{{CHUNK_SIZE}}", size).replace("{{counter}}", counter)
}

const ELEMENTS = {
    keyCounter: undefined,
    noSeedCheck: undefined,
    noKeysCheck: undefined,
    noCoordsCheck: undefined,
    jsonTarget: undefined,
    chunkNum: undefined,
    fileContainer: undefined,
}

window.addEventListener("DOMContentLoaded", init)

function init() {
    ELEMENTS.jsonTarget = document.getElementById("json-target")
    ELEMENTS.noSeedCheck = document.getElementById("no-seed-check")
    ELEMENTS.noKeysCheck = document.getElementById("no-keys-check")
    ELEMENTS.noCoordsCheck = document.getElementById("no-coords-check")
    ELEMENTS.keyCounter = document.getElementById("total-key-count")
    ELEMENTS.chunkNum = document.getElementById("chunk-number")
    ELEMENTS.fileContainer = document.getElementById("file-container")
}

var demo = {
    lines: undefined,
    metadata: undefined,
    initialState: undefined,
    parts: [],
}

function FileUploaded(e) {
    var file = e.srcElement.files[0]
    if (file) {
        var reader = new FileReader()
        reader.readAsText(file, "UTF-8")

        reader.onload = OnFileRead
        reader.onerror = (err) => console.error("Failed reading file.", err)
    }
}

const rawConcatRegex = /(?<!-)\n(?!-)/gm

function OnFileRead(e) {
    const split = e.target.result.replaceAll(rawConcatRegex, "").split("\n")

    const markDic = {
        [MARKS.DEMO_START]: split.indexOf(MARKS.DEMO_START),
        [MARKS.DEMO_SAVE]: split.indexOf(MARKS.DEMO_SAVE),
        [MARKS.DEMO_DATA]: split.indexOf(MARKS.DEMO_DATA),
        [MARKS.SKIP_DATA]: split.indexOf(MARKS.SKIP_DATA),
        [MARKS.SKIP_DATA_END]: split.indexOf(MARKS.SKIP_DATA_END),
        [MARKS.MXCB_STOP]: split.indexOf(MARKS.MXCB_STOP)
    }

    const missing = []
    for (const key in markDic)
        if (markDic[key] == -1)
            missing.push(key)

    if (missing.length > 0) {
        console.error("Demo file missing the following keys:\n", missing)
        return
    }

    demo.lines = split

    // Jank
    const metadataSplit = split[markDic[MARKS.DEMO_START] + 1].split("{")
    demo.metadata = {
        name: metadataSplit[0],
        ...Derubify("{" + metadataSplit[1])
    }
}

function Derubify(objectString) {
    return JSON.parse(objectString.replaceAll(":", '"').replaceAll("=>", '":'))
}

function LoadChunk() {
    const num = Math.max(ELEMENTS.chunkNum.valueAsNumber, 1)

    try {
        let obj = FilterObject(GetChunk(num))

        let keyCount = 0
        for (const key in obj)
            keyCount += Object.keys(obj[key].keys).length

        ELEMENTS.keyCounter.textContent = keyCount

        obj = FilterObject(obj)
        ELEMENTS.jsonTarget.innerHTML = jsonViewer(obj)
    } catch (err) {
        console.error(err)
    }
}

function FilterObject(obj) {
    const flags = {
        seed: ELEMENTS.noSeedCheck.checked,
        keys: ELEMENTS.noKeysCheck.checked,
        window_x: ELEMENTS.noCoordsCheck.checked,
        window_y: ELEMENTS.noCoordsCheck.checked,
    }

    if (!flags.seed && !flags.keys && !flags.window_x)
        return obj

    for (const frame in obj) {
        for (const key in obj[frame]) {
            if (flags[key]) {
                delete obj[frame][key]
            }
        }
    }

    return obj
}

function GetChunk(number) {
    const keyLine = demo.lines.indexOf(MARKS.MXCB_CHUNK(demo.metadata.chunk_size, number))

    if (keyLine == -1) {
        console.error("Missing line:", MARKS.MXCB_CHUNK(demo.metadata.chunk_size, number))
        return
    }

    return DecodeStr(demo.lines[keyLine + 1])
}

// https://stackoverflow.com/questions/33643874/gzip-string-in-javascript-using-pako-js
function DecodeStr(str) {
    const iReally = atob(str).split("").map(x => x.charCodeAt(0))
    const dontKnow = pako.inflate(new Uint8Array(iReally))
    const decoded = String.fromCharCode.apply(null, new Uint16Array(dontKnow))

    return Derubify(decoded)
}