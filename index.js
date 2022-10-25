const http = require("http")
const { readdir, readFile } = require("fs/promises")
const { join } = require("path")

const _ = require("lodash")
const yaml = require("yaml")

const package = require("./package.json")
const scene = require("./middleware/scene")
const not_found = require("./middleware/not_found")

const SSL = Boolean(process.env.SSL)
const HOST = process.env.HOST || "localhost"
const PORT = process.env.PORT || 8080
const VERSION = process.env.VERSION || package.version

const WORKDIR = process.env.WORKDIR || "geom"

const config = {
    ENV: {
        SSL,
        HOST,
        PORT,
        VERSION,
        WORKDIR
    },
    THREE: {
        source: join(process.cwd(), "js", "three.js")
    }
}

const objects = []

async function loadObjects() {
    console.log(`> Load objects`)
    const cwd = process.cwd()
    const workdir = join(cwd, WORKDIR)
    const files = await readdir(workdir)
    for (let file of files) {
        file = file.replace(/\.yaml$|\.yml$/i, ".yaml")
        const name = file.replace(/\.yaml$/i, "")
        const filename = join(workdir, file)
        console.log(`\t- ${file}`)
        objects.push({
            cwd,
            workdir,
            name,
            file,
            filename
        })
    }
}

async function scan(object) {
    if (!object) return
    if (typeof object !== "object") return
    if (object instanceof Array) {
        for (let sub of object) {
            scan(sub)
        }
        return
    }

    for (let key in object) {
        const value = object[key]
        if (typeof value === "string") {
            if (/^\<([^\>]+)\>$/.test(value)) {
                const file = value.match(/^\<([^\>]+)\>$/).slice(1)[0].replace(/\.yaml$|\.yml$/, ".yaml")
                console.log(`\t\t~ ${key} -> ${file}`)
                object[key] = objects.filter(_object => _object.file = file)[0]
            }
            continue
        }
        scan(value)
    }
}

async function parseObjects() {
    console.log(`> Parse objects`)
    for (let object of objects) {
        const content = await readFile(object.filename, "utf-8")
        // object.content = Buffer.from(content, "utf-8").toString("base64")
        const spec = yaml.parse(content)
        _.merge(object, spec)
        console.log(`\t- ${object.file} >>> ${object.type}`)
    }
}

async function scanObjects() {
    console.log(`> Scan objects`)
    for (let object of objects) {
        console.log(`\t* ${object.name}`)
        scan(object)
    }
}

async function updateConfig() {
    console.log("> Update config")
    for (let object of objects) {
        if (/^[A-Z_]+$/.test(object.type)) {
            console.log(`\t+ ${object.type}`)
            config[object.type] = _.merge(config[object.type], object)
        }
    }
}

function middleware(...handlers) {
    return async (request, response) => {
        for (let handler of handlers) {
            const result = await handler({
                config,
                objects,
                request,
                response,
                handlers
            })
            if (result) {
                const { status, statusText, headers, content } = result
                response.writeHead(status || 200, statusText || "ok", headers || {
                    "Content-Type": "text/html"
                })
                response.write(content)
                response.end()
                return
            }
            if (result === "OK") return
        }
    }
}

async function start() {
    console.log(`morgeom v${VERSION}`)

    await loadObjects()
    await parseObjects()
    await scanObjects()
    await updateConfig()

    const server = http.createServer(middleware(
        scene,
        not_found
    ))

    server.listen(PORT, HOST, () => {
        console.log(`Server started at http${SSL || ''}://${HOST}:${PORT}/`)
    })
}

start().catch(error => {
    console.error(`\n\t${error}`)
})