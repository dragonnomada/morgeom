const scene_builder = require("./scene_builder")

module.exports = options => {
    const { request, objects } = options
    for (let object of objects) {
        console.log(request.url, object.type, object.name)
        if (object.type === "Scene") {
            if (request.url === `/${object.name}`) {
                return scene_builder({ ...options, object })
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
}