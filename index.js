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
        const name = file.replace(/\.yaml|\.yml/i, "")
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

async function parseObjects() {
    console.log(`> Parse objects`)
    for (let object of objects) {
        const content = await readFile(object.filename, "utf-8")
        // object.content = Buffer.from(content, "utf-8").toString("base64")
        object.spec = yaml.parse(content)
        object.type = object.spec.type
        console.log(`\t- ${object.file} >>> ${object.spec.type}`)
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