const http = require("http")
const { readdir, readFile } = require("fs/promises")
const { join } = require("path")

const _ = require("lodash")
const yaml = require("yaml")

const package = require("./package.json")

const SSL = Boolean(process.env.SSL)
const HOST = process.env.HOST || "localhost"
const PORT = process.env.PORT || 8080
const VERSION = process.env.VERSION || package.version

const WORKDIR = process.env.WORKDIR || "geom"

const objects = []

const config = {
    THREE: {
        source: join(process.cwd(), "js", "three.js")
    }
}

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
            env: {
                SSL,
                HOST,
                PORT,
                VERSION,
                WORKDIR
            },
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
            const result = await handler(request, response)
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
        request => {
            for (let object of objects) {
                console.log(request.url, object.type, object.name)
                if (object.type === "Scene") {
                    if (request.url === `/${object.name}`) {
                        return {
                            headers: {
                                "Content-Type": "application/json"
                            },
                            content: JSON.stringify(object)
                        }
                    } else if (request.url === `/${object.name}/spec`) {
                        return {
                            headers: {
                                "Content-Type": "application/json"
                            },
                            content: JSON.stringify(object)
                        }
                    }
                }
            }
        },
        () => ({
            headers: {
                "Content-Type": "text/plain"
            },
            content: "404 - Not found"
        })
    ))

    server.listen(PORT, HOST, () => {
        console.log(`Server started at http${SSL || ''}://${HOST}:${PORT}/`)
    })
}

start().catch(error => {
    console.error(`\n\t${error}`)
})