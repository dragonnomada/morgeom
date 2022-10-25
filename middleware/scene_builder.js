function getScene(object) {
    return `
        const nodes = []

        const scene = new THREE.Scene();

        const light = new THREE.AmbientLight( 0xffffff ); // soft white light
        scene.add( light );
    `
}

function getCamera(object) {
    return `
        const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );
        camera.position.z = 5;
    `
}

function getRenderer(object) {
    return `
        const renderer = new THREE.WebGLRenderer();
        renderer.setSize( window.innerWidth, window.innerHeight );
        document.body.appendChild( renderer.domElement );
    `
}

function getNodes(object) {
    console.log(object)

    let nodes = ""

    for (let node of object.nodes) {
        const { model } = node
        nodes += `
            {
                const geometry = new THREE.BoxGeometry( ${model.width}, ${model.height}, ${model.depth} );
                const material = new THREE.${model.material.type}( ${JSON.stringify(model.material)} );
                const cube = new THREE.Mesh( geometry, material );
                cube.animate = function () {
                    ${model.animate.join('\n\n')}
                }
                nodes.push( cube )
                scene.add( cube );
            }
        `
    }

    return nodes
}

function getAnimate(object) {
    return `
        function animate() {
            requestAnimationFrame( animate );

            for (let node of nodes) {
                node.animate()
            }

            renderer.render( scene, camera );
        }
        animate();
    `
}

module.exports = ({ config, object }) => {
    console.log(config)
    return {
        content: `
            <!DOCTYPE html>
            <html>
                <head>
                    <meta charset="utf-8">
                    <title>${object.title}</title>
                    <style>
                        ${object.style.join("\n")}
                    </style>
                </head>
                <body>
                    <script src="${config.THREE.source}"></script>
                    <script>
                        ${getScene(object)}    

                        ${getCamera(object)}

                        ${getRenderer(object)}
                        
                        ${getNodes(object)}
                        
                        ${getAnimate(object)}
                    </script>
                </body>
            </html>
        `
    }
}