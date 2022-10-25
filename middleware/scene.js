module.exports = ({ request, objects }) => {
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
}