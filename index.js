const directions = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
const dirCoords = {
    "nw" : [-1, -1],
    "n" : [0, -1],
    "ne" : [1, -1],
    "e": [1, 0],
    "se": [1, 1],
    "s": [0, 1],
    "sw": [-1, 1],
    "w": [-1, 0]
}

function startGame() {
    resize()
    populateNodes(nodes)
    console.log(nodes)
    genBackground()
    updateSections()
    console.log(sections[1])

    requestAnimationFrame(gameLoop);
}

const response = await fetch('./data.json');
const { layers, drills } = await response.json();

const bgr = document.getElementById("background")
const bgrctx = bgr.getContext('2d');
const drl = document.getElementById("drill")
const drlctx = drl.getContext('2d');

var canvWidth
var canvHeight

const mapSize = 60  // in nodes
const landscapeHeight = layers.topsoil.startHeight
const mapLength = 200 // in nodes

let last = performance.now(); // for fps
let smoothed = 16.67; // start near 60fps

const sections = Array.from({ length: mapLength }, () => new Set());
const tiles = []
const nodes = []

var animations = []

var nodeGap 
var scrollPos = 0 // how much scrolled
var drillLast = 0
var drillBitT = 0.2

startGame();

function populateNodes(map){ // generate the nodes on a map
    // in theory only should populate one map and make copies for other layers
    for(let j=0; j<mapLength; j++){
        const noise = 0.2
        const row = []
        for(let i=0; i<mapSize; i++) {
            const node = {
                "i" : i, // the column of the node, int
                "j" : j, // the row of the node, int
            }

            /*
            here i will explain a little bit about how the borders work.

            each node has a border in each cardinal direction.  this value has the same units as
            i and j, yet is often a decimal value. this means to be useful to the canvas it must
            be multiplied by nodeGap, the ultimate scalar. this allows us to just change nodeGap 
            when changing resolution of game and everything else handles itself. 

            each node shares a border with its neighbors. since the borders are added left-right 
            top-down, we only need to check north and west for existing borders when creating a
            node. 

            when creating borders, we start between each node (0.5 or -0.5) then add some random
            value between -noise/2 and +noise/2, (Math.random() - 0.5) * noise. this keeps things
            spicy. 
            */
            let n = {}, e = {}, s = {}, w = {}

            if(j>0){ // checking for existing border northward
                const nsb = map[j-1][i].border.s // norther node southern border
                n.i = nsb.i; // if so adopt that border
                n.j = nsb.j - 1;
            } else {
                n.i = (Math.random() - 0.5) * noise;
                n.j = -0.5 + (Math.random() - 0.5) * noise;
            }

            e.i = 0.5 + (Math.random() - 0.5) * noise;
            e.j = (Math.random() - 0.5) * noise;

            s.i = (Math.random() - 0.5) * noise;
            s.j = 0.5 + (Math.random() - 0.5) * noise;

            if(i>0){ // checking for existing border westward
                const web = row[i-1].border.e // western node eastern border
                w.i = web.i - 1;
                w.j = web.j;
            } else {
                w.i = -0.5 + (Math.random() - 0.5) * noise;
                w.j = (Math.random() - 0.5) * noise;
            }

            node.border = {
                "n" : n,
                "e" : e,
                "s" : s,
                "w" : w
            }

            row.push(node)
        }
        map.push(row)
    }
}

function genBackground() { // places clusters on background
    for(let j=0; j<mapLength; j++){
        const row = []
        for(let i=0; i<mapSize; i++) {
            const tile = {
                'node' : nodes[j][i],
                'layer' : getLayer(j),
                'color' : -1,
                'i' : i,
                'j' : j,
                'spaces' : [],
            }
            row.push(tile)

            const section = {}
            sections[j].add(section)
            tile.section = section
        }
        tiles.push(row)
    }

    const f = 25 // frequency. right now all cluster types are equally frequent.
    
    //starts at landscapeHeight to make room for landscape
    for(let n = landscapeHeight; n<mapLength; n += mapSize/f) { // the above can be changed by modifying a in n += a. 
        genCluster(tiles, rand(0, mapSize), Math.round(n), 3, 1, 0)
    }
    for(let n = landscapeHeight; n<mapLength; n += mapSize/f) {
        genCluster(tiles, rand(0, mapSize), Math.round(n), 1, 4, 1)
    }
    for(let n = landscapeHeight; n<mapLength; n += mapSize/f) {
        genCluster(tiles, rand(0, mapSize), Math.round(n), 1, 1, 2)
    }
    // genCluster(tiles, mapSize/2, 30, 1, 1, 0) // debug
    
    for(let j = landscapeHeight - 3; j<mapLength; j++) {
        const tilePos = [0, 1, mapSize-2, mapSize-1]
        if(Math.random() > 0.5) tilePos.push(2)
        if(Math.random() > 0.5) tilePos.push(mapSize-3)

        tilePos.forEach(i => {
            const r = Math.random()
            let color
            if (r < 0.6) {color = 0
            } else if (r < 0.9){color = 1
            } else color = 2

            const tile = tiles[j][i]

            tile.palette = "walls"
            tile["color"] = color
        })
    }

    genGrass(tiles);
} 

function genSpaces() {
    for(let i = 0; i < mapSize - 1; i++) {
        for(let j = 0; j < mapLength - 1; j++) {
            const space = {
                'i' : i,
                'j' : j,
                'tiles' : {
                    'nw' : tiles[j][i],
                    'ne' : tiles[j][i+1],
                    'se' : tiles[j+1][i+1],
                    'sw' : tiles[j+1][i],
                }
            }


            const nwb = space.tiles.nw.node.border
            const seb = space.tiles.se.node.border

            space.border = {
                'n' : nwb.e,
                'e' : seb.n,
                's' : seb.w,
                'w' : nwb.s
            }

            space.sections = getSpaceSections(space)

            //sections[j].add(...space.sections)

            tiles[j][i].spaces.se = space
            tiles[j][i+1].spaces.sw = space
            tiles[j+1][i+1].spaces.nw = space
            tiles[j+1][i].spaces.ne = space
        }
    }
}

/**
 * 
 * @param {object} map 
 * @param {number} si - starting position i
 * @param {number} sj - starting position j 
 * @param {number} r - radius
 * @param {number} noise - range of variation in nodes
 * @param {number} color 
 */
function genCluster(map, si, sj, r, noise, color) { // generates a cluster on a given map
    let d = r + Math.floor(noise/2) // ensures checks every point noise could generate
    for (let j = sj - d; j <= sj + d; j++) {
        for (let i = si - d; i <= si + d; i++) {
            // skip if outside map
            if (j < landscapeHeight - 3 || j >= mapLength || i < 0 || i >= mapSize) continue;

            // checks distance from starting tile for given tile
            const di = i - si;
            const dj = j - sj;
            const dist = Math.sqrt(di * di + dj * dj);
            const threshold = r + (Math.random() - 0.5) * noise; // circular check 

            const tile = map[j][i]
            if (dist < threshold) {
                tile.layer = getLayer(j)
                tile.palette = "main"
                tile["color"] = color
            }
        }
    }
}

function genGrass(map) {
    const center = Math.round(mapSize/2)
    const layerVariance = 0.2
    const middleMargin = 7

    let d = 0
    for(let i = center; i<mapSize; i++) {
        if(i > center + middleMargin){
            if(d>=0 && Math.random() < layerVariance) d--
            if(d<=0 && Math.random() < layerVariance) d++
        }
        map[landscapeHeight - 3 + d][i].palette = "grass"
        map[landscapeHeight - 3 + d][i]["color"] = 0
        for(let j = landscapeHeight-10; j<landscapeHeight - 3 + d; j++) {
            if(map[j][i].palette === "main" || map[j][i].palette === "walls") {
                delete map[j][i].palette
                map[j][i].color = -1
            }
        }
        for(let j = landscapeHeight - 2 + d; j<landscapeHeight; j++) {
            const r = Math.random()/(j - landscapeHeight + 3 - d)
            const tile = map[j][i]
            if(r>0.6) {
                tile.palette = "grass"
                tile.color = 0
            } else if(r>0.4) {
                tile.palette = "grass"
                tile.color = 1
            } else if (!("palette" in tile)){
                tile.palette = "main"
                tile.color = 3
            }
        }
    }

    d = 0
    for(let i = center; i>=0; i--) {
        if(i < center - middleMargin){
            if(d>=0 && Math.random() < layerVariance) d--
            if(d<=0 && Math.random() < layerVariance) d++
        }
        map[landscapeHeight - 3 + d][i].palette = "grass"
        map[landscapeHeight - 3 + d][i]["color"] = 0
        for(let j = landscapeHeight-10; j<landscapeHeight - 3 + d; j++) {
            if(map[j][i].palette === "main" || map[j][i].palette === "walls") {
                delete map[j][i].palette
                map[j][i].color = -1
            }
        }
        for(let j = landscapeHeight - 2 + d; j<landscapeHeight; j++) {
            const r = Math.random()/(j - landscapeHeight + 3 - d)
            const tile = map[j][i]
            if(r>0.6) {
                tile.palette = "grass"
                tile.color = 0
            } else if(r>0.4) {
                tile.palette = "grass"
                tile.color = 1
            } else if (!("palette" in tile)){
                tile.palette = "main"
                tile.color = 3
            }
        }
    }
}

function drawMap(map){ //draws all visible tiles on given map
    bgrctx.clearRect(0, 0, bgr.width, bgr.height);

    const topNode = Math.max(Math.floor(scrollPos/nodeGap), 0)
    const botNode = Math.min(Math.ceil((scrollPos + bgr.height)/nodeGap) + 1, mapLength) 

    for (let j = topNode; j < botNode; j++) {
        const row = sections[j]

        row.forEach(section => {
            //console.log(section)
            const path = section.path

            bgrctx.beginPath();
            bgrctx.moveTo(path[0][0] * nodeGap, path[0][1] * nodeGap - scrollPos);

            for (let i = 1; i < path.length; i += 1) {
                const x = path[i][0] * nodeGap;
                const y = path[i][1] * nodeGap - scrollPos;
                bgrctx.lineTo(x, y);
            }

            bgrctx.fillStyle = section.color;
            bgrctx.strokeStyle = section.color;
            bgrctx.lineCap = "round"
            bgrctx.lineWidth = 1
            bgrctx.fill();
            bgrctx.closePath();
            bgrctx.stroke();
        })
    }

    // runForAll((i, j) => { // debug
    //     drawNode(map[j][i]);
    // })
}

function drawDrill(x, y, vDrill = 0, vScroll = 1) {
    drlctx.clearRect(0, 0, drl.width, drl.height);

    const a = - Math.tan(vDrill/vScroll)
    const cosa = Math.cos(a)
    const sina = Math.sin(a)

    drlctx.setTransform(cosa, sina, -sina, cosa, x, y)

    const currentDrill = "basic"
    
    const drill = drills[currentDrill]

    drill.parts.forEach(part => drawDrillPart(drill.colors, part))
    drawDrillBit(drill.drillBit, x, y, a, drill.colors)
    drlctx.setTransform(1, 0, 0, 1, 0, 0);
}

/**
 * @param {*} param0 - drillBit object
 * @param {*} x 
 * @param {*} y 
 * @param {*} a 
 */
function drawDrillBit({height, width, thickness, extension, ridgeAngle, ridgeCount, 
    mainColor1, mainColor2, ridgeColor, drillSpeed}, x, y, a, colors) {

    const cosa = Math.cos(a)
    const sina = Math.sin(a)

    const [h, w, th, e] = [height, width, thickness, extension].map(v => v * nodeGap);
    
    drlctx.setTransform(cosa, sina, -sina, cosa, x, y)
    
    const w0 = w*(2*drillBitT % 1)

    drlctx.beginPath()
    drlctx.moveTo(-w/2, 0)
    drlctx.lineTo(w/2-w0, 0)
    if(w0 < w/2){
        drlctx.lineTo(w/2-w0, (2 * w0 * h) / w)
        drlctx.lineTo(0, h)
    } else {
        drlctx.lineTo(w/2-w0, 2* h - ((2 * w0 * h) / w))
    }
    if(2*drillBitT % 2 < 1) {drlctx.fillStyle = colors[mainColor1]
    } else drlctx.fillStyle = colors[mainColor2]
    
    drlctx.fill()

    drlctx.beginPath()
    drlctx.moveTo(w/2, 0)
    drlctx.lineTo(w/2-w0, 0)
    if(w0 > w/2){
        drlctx.lineTo(w/2-w0, 2* h - ((2 * w0 * h) / w))
        drlctx.lineTo(0, h)
    } else {
        drlctx.lineTo(w/2-w0, ((2 * w0 * h) / w))
    }
    if(2*drillBitT % 2 > 1) {drlctx.fillStyle = colors[mainColor1]
    } else drlctx.fillStyle = colors[mainColor2]
    drlctx.fill()

    const cosb = Math.cos(ridgeAngle)
    const sinb = Math.sin(ridgeAngle)

    const l0 = (sinb*w)/(2*cosb)

    const offsets = []
    for(let n = 0; n<ridgeCount;n++) offsets.push(n/ridgeCount)

    offsets.forEach(t0 => {
        const l = h-((drillBitT + t0)% 1)*(h+l0)
        let x1, x2

        if(l > l0) {
            x1 = (h-l)/((2*h/w)*cosb + sinb)
            x2 = (h-l)/((2*h/w)*cosb - sinb)
        } else {
            x1 = (h-l)/((2*h/w)*cosb + sinb)
            x2 = l/sinb
        }

        drlctx.setTransform(cosa, sina, -sina, cosa, x, y)
        drlctx.transform(cosb, -sinb, sinb, cosb, 0, l)

        drlctx.beginPath()
        drlctx.roundRect(-x1-e, -th, x1+x2+2*e, 2*th, 5)
        drlctx.fillStyle = colors[ridgeColor]
        drlctx.fill()
    })
    
    // independant of frame speed
    //drillBitT += drillSpeed * (performance.now() - drillLast)
    //drillLast = performance.now()
}

function drawDrillPart(colors, {type, w, h, r, x=0, y=0, color}){ 
    switch(type) {
        case "rrect" :
            drlctx.beginPath();
            drlctx.fillStyle = colors[color] 
            drlctx.roundRect(
                (x + (-w/2)) * nodeGap, 
                (y + (-h/2)) * nodeGap, 
                w * nodeGap, 
                h * nodeGap, 
                r * nodeGap
            )

            drlctx.fill()
            break;
        case "circle" :
            drlctx.beginPath();
            drlctx.fillStyle = colors[color]
            drlctx.arc(x * nodeGap, y * nodeGap, r * nodeGap, 0, 2 * Math.PI) 
            drlctx.fill()
        break;
    }
}

function drawNode(tile){ // debug
    bgrctx.strokeStyle = "black"
    bgrctx.lineWidth = 1
    bgrctx.beginPath();
    bgrctx.arc(tile.i, tile.j- scrollPos, (tile.color+2)/16, 0, 6.2832);
    bgrctx.stroke();
}

function drawFPS(fps, ms) {
    const text = `${fps} FPS (${ms}ms)`
    const m = 10 // margin inner
    const M = 10 // margin outer
    const w = bgrctx.measureText(text).width + 2*m
    const h = 12 + 2*m
    const x = bgr.width - w - M
    const y = bgr.height - h - M


    bgrctx.fillStyle = "black"
    bgrctx.beginPath();
    bgrctx.roundRect(x, y, w, h, 5)
    bgrctx.fill()

    bgrctx.font = "15px sans-serif";
    bgrctx.fillStyle = "white";
    bgrctx.fillText(text, x + m, y - m + h);
}

function updateSections() {
    runForAll((i, j) => {
        const tile = tiles[j][i];
        Object.assign(tile.section, getTileSection(tile))
    });
}

function getTileSection(tile) {
    const node = tile.node
    const path = Object.values(node.border).map(d => [d.i + node.i, d.j + node.j])
    const color = tile.color < 0 ? layers[tile.layer].background : 
        layers[tile.layer].palettes[tile.palette][tile.color]
    return {
        'color' : color,
        'path' : path
    }
}

function getSpaceSections(space) {
    const highestColors = getHighestColors(space.tiles)

    switch(highestColors.length) {
        case 1: 
        const tile = Object.highestColors.values[0]
        return {
            'palette' : 3
        }
    }
}

function getAllClusters(map) { // UNUSED may use later so not deleting
    const visited = map.map(row => row.map(() => false));
    const clusters = [];

    runForAll((si, sj) => { // si, sj is starting node
        // only start a cluster if this node is an unvisited 1
        if (visited[sj][si] || map[sj][si].color === 0) return;

        const queue = [[si, sj]]; // add the current node to queue
        const cluster = [];

        while (queue.length) {
            const [i, j] = queue.pop();

            if ( // ensuring not visited
                i < 0 || i >= mapSize ||
                j < 0 || j >= mapLength ||
                visited[j][i] ||
                map[j][i].color !== 1 // REMOVE THIS 
            ) continue;

            visited[j][i] = true;
            cluster.push([i, j]);

            // push neighbors to queue
            runForAdjacent((ni, nj) => {
                queue.push([ni, nj]);
            }, i, j);
        }

        clusters.push(cluster);
    });
    return clusters;
}

function getAdjNodes(map, i, j) { // returns list of adjacent nodes
    const adjNodes = { // list of directions`
        "nw" : map[j - 1]?.[i - 1],
        "n"  : map[j - 1]?.[i],
        "ne" : map[j - 1]?.[i + 1],
        "w"  : map[j]?.[i - 1],
        "e"  : map[j]?.[i + 1],
        "sw" : map[j + 1]?.[i - 1],
        "s"  : map[j + 1]?.[i],
        "se" : map[j + 1]?.[i + 1]
    }

    for (const direction in adjNodes) { // purge all nonexisting nodes
        if (adjNodes[direction] === undefined) {
            delete adjNodes[direction];
        }
    }

    return adjNodes
}

function getLayer(j) {
    let layer
    let highestHeight = -1

    for (const key in layers) {
        const height = layers[key].startHeight;
        if (height <= j && height > highestHeight) {
            highestHeight = height;
            layer = key;
        }
    }

    return layer;
}

function runForAll(func, io = 0, jo = 0) { // run for all i, j
    for (let j = jo; j < mapLength; j++) {
        for (let i = io; i < mapSize; i++) {
            func(i, j)
        }
    }
}

function runForVisible(func) { // run for all i, j nodes on screen
    const topNode = Math.max(Math.floor(scrollPos/nodeGap), 0)
    const botNode = Math.min(Math.ceil((scrollPos + bgr.height)/nodeGap) + 1, mapLength) 

    for (let j = topNode; j < botNode; j++) {
        for (let i = 0; i < mapSize; i++) {
            func(i, j)
        }
    }
}

function runForAdjacent(func, io, jo) { // run for adjacent i, j
    for (let j = -1; j < 2; j++) {
        for (let i = -1; i < 2; i++) {
            func(io+i, jo+j);
        }
    }
}

function rand(min, max) { // rand between min/max
    return Math.floor(Math.random()*(max - min + 1)) + min
}

function mod(a, n) {
    return ((a % n) + n) % n;
}

function getHighestColors(obj) {
    const maxValue = Math.max(...Object.values(obj).map(v => v.color));

    const result = {};
    for (const key in obj) {
        if (obj[key].color === maxValue) {
            result[key] = obj[key];
        }
    }
    return result;
}


function gameLoop(now) { // game animation loop
    const delta = now - last;
    last = now;
    smoothed = smoothed * 0.9 + delta * 0.1;

    drawMap(tiles)
    drawFPS(Math.round(1000/smoothed), Math.round(smoothed))
    drawDrill(bgr.width / 2, nodeGap*20, 0.2)

    // for (let i = 0; i < animations.length;) {
    //     const done = animations[i].draw(now);
    //     if (done) {
    //         animations.splice(i, 1);
    //     } else {
    //         i++
    //     }
    // }

    requestAnimationFrame(gameLoop);
}

function resize() { // resize window
    const dpr = window.devicePixelRatio || 1; // idk what this does 

    canvWidth = window.innerWidth * dpr
    canvHeight = window.innerHeight * dpr;

    [bgr, drl].forEach(canv => {
        canv.style.width = window.innerWidth + "px";
        canv.style.height = window.innerHeight + "px";
        canv.width = canvWidth
        canv.height = canvHeight
    })
  nodeGap = bgr.width / (mapSize - 1)
}

window.addEventListener('resize', () => {
    resize()
});
addEventListener("wheel", (e) => {
    const s = 5
    if(scrollPos + e.deltaY/s <= 0){
        scrollPos = 0
    } else {
        scrollPos += e.deltaY/s
    }
})

function debugExpose(obj) {
  for (const [key, value] of Object.entries(obj)) {
    window[key] = value;
  }
}

debugExpose({
    nodes,
    bgr,
    tiles,
    bgrctx,
    drlctx,
    sections,
    getAdjNodes,
    genSpaces,
    getHighestColors,
    getTileSection,
    updateSections,
})
