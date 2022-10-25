const http = require("http")
const { readdir, readFile } = require("fs/promises")
const { join } = require("path")

const yaml = require("yaml")

const package = require("./package.json")

const SSL = Boolean(process.env.SSL)
const HOST = process.env.HOST || "localhost"
const PORT = process.env.PORT || 8080
const VERSION = process.env.VERSION || package.version

const WORKDIR = process.env.WORKDIR || "geom"

const objects = []

async function loadObjects() {
    console.log(`> Load objects`)
    const workdir = join(process.cwd(), WORKDIR)
    const files = await readdir(workdir)
    for (let file of files) {
        const filename = join(workdir, file)
        console.log(`\t- ${file}`)
        objects.push({
            filename
        })
    }
}

async function start() {
    console.log(`morgeom v${VERSION}`)

    await loadObjects()

    const server = http.createServer((request, response) => {
        response.writeHead(200, "ok", {
            "Content-Type": "text/html"
        })
        response.write("<h1>hi there</h1>")
        response.end()
    })
    
    server.listen(PORT, HOST, () => {
        console.log(`Server started at http${SSL || ''}://${HOST}:${PORT}/`)
    })
}

start().catch(error => {
    console.error(`\n\t${error}`)
})