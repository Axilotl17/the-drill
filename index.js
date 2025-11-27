function startGame() {
    resize()
    populateNodes(nodes)
    genBackground()

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

var bgrMap = []
var nodes = []

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
                "border" : {}
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

            if(j>0){ // checking for existing border northward
                node.border.nx = map[j-1][i].border.sx; // if so adopt that border
                node.border.ny = map[j-1][i].border.sy - 1;
            } else {
                node.border.nx = (Math.random() - 0.5) * noise;
                node.border.ny = -0.5 + (Math.random() - 0.5) * noise;
            }

            node.border.ex = 0.5 + (Math.random() - 0.5) * noise;
            node.border.ey = (Math.random() - 0.5) * noise;

            node.border.sx = (Math.random() - 0.5) * noise;
            node.border.sy = 0.5 + (Math.random() - 0.5) * noise;

            if(i>0){ // checking for existing border westward
                node.border.wx = row[i-1].border.ex - 1;
                node.border.wy = row[i-1].border.ey;
            } else {
                node.border.wx = -0.5 + (Math.random() - 0.5) * noise;
                node.border.wy = (Math.random() - 0.5) * noise;
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
                'layer' : getLayer(j),
                'color' : -1
            }
            row.push(tile)
        }
        bgrMap.push(row)
    }

    const f = 25 // frequency. right now all cluster types are equally frequent.
    
    //starts at landscapeHeight to make room for landscape
    for(let n = landscapeHeight; n<mapLength; n += mapSize/f) { // the above can be changed by modifying a in n += a. 
        genCluster(bgrMap, rand(0, mapSize), Math.round(n), 3, 1, 0)
    }
    for(let n = landscapeHeight; n<mapLength; n += mapSize/f) {
        genCluster(bgrMap, rand(0, mapSize), Math.round(n), 1, 4, 1)
    }
    for(let n = landscapeHeight; n<mapLength; n += mapSize/f) {
        genCluster(bgrMap, rand(0, mapSize), Math.round(n), 1, 1, 2)
    }
    // genCluster(bgrMap, mapSize/2, 30, 1, 1, 0) // debug
    
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

            const tile = bgrMap[j][i]

            tile.palette = "walls"
            tile["color"] = color
        })
    }

    genGrass(bgrMap);

    runForAll((i, j) => {
        bgrMap[j][i].realized = getAreaPts(bgrMap, i, j)
    })
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
    runForVisible((i, j) => {
        let tile = map[j][i]

        if(!("color" in tile)) return; // if not given a color, ignore.

        const points = tile.realized
        bgrctx.beginPath();
        bgrctx.moveTo(points[0], points[1] - scrollPos);

        for (let i = 2; i < points.length; i += 2) {
            const x = points[i];
            const y = points[i + 1] - scrollPos;
            bgrctx.lineTo(x, y);
        }

        bgrctx.closePath();
        let color

        if(tile.color < 0) {
            color = layers[tile.layer].background
        } else {
            color = layers[tile.layer].palettes[tile.palette][tile.color];
        }

        bgrctx.fillStyle = color;
        bgrctx.strokeStyle = color;
        bgrctx.lineCap = "round"
        bgrctx.lineWidth = 1
        bgrctx.fill();
        bgrctx.stroke();
    })

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
    
    //independant of frame speed
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
                (y + (-h/2))* nodeGap, 
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
    bgrctx.arc(tile.i * nodeGap, tile.j * nodeGap - scrollPos, (tile.color+2)*nodeGap/16, 0, 6.2832);
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

function getAreaPts(map, i, j){

    /*
    this function is pure magic. please do not ask how it works.

    the goal is that given a tile on a map, it will list out the points that make up its
    realized border, where realized border is considering all neighbors and the interpolation
    between them.

    the realized border also must consider blank spaces left, where the highest priority color
    (lowest index) fills in the blank space.

    all of the above must also consider "fucky overlap" where 

    x y
    y z

    what do x and z do when the two y's connect diagonally? what if x = z and they also want to
    connect diagonally? again, goes to highest priority color.

    the process of considering each neighbor (nw, n, ne, e, se, s, sw, w) and the effect it
    has has been done by hand, and unless some poor soul wants to try and simplify the pattern
    i won't be doing so.
    */ 

    const points = []
    const node = nodes[j][i]
    const tile = map[j][i]

    const adjNodes = getAdjNodes(nodes, i, j)
    const adjTiles = getAdjNodes(map, i, j)

    // defining all adjacent nodes
    const nwNode = adjNodes.nw, nNode = adjNodes.n, neNode = adjNodes.ne, eNode = adjNodes.e;
    const seNode = adjNodes.se, sNode = adjNodes.s, swNode = adjNodes.sw, wNode = adjNodes.w;

    // defining all adjacent tiles
    const nwTile = adjTiles.nw, nTile = adjTiles.n, neTile = adjTiles.ne, eTile = adjTiles.e;
    const seTile = adjTiles.se, sTile = adjTiles.s, swTile = adjTiles.sw, wTile = adjTiles.w;

    // defining all adjacent tile colors
    const nwTileColor = nwTile?.color, nTileColor = nTile?.color, neTileColor = neTile?.color, eTileColor = eTile?.color;
    const seTileColor = seTile?.color, sTileColor = sTile?.color, swTileColor = swTile?.color, wTileColor = wTile?.color;

    // defining all adjacent tile palettes
    const nwTilePalette = nwTile?.palette, nTilePalette = nTile?.palette, neTilePalette = neTile?.palette, eTilePalette = eTile?.palette;
    const seTilePalette = seTile?.palette, sTilePalette = sTile?.palette, swTilePalette = swTile?.palette, wTilePalette = wTile?.palette;

    // shorthand for target color, palette, and border locations.
    const tc = tile.color;
    const tp = tile.palette;
    const nb = node.border

    // if target tile has color and palette as adjacent node
    const nwSameColor = nwNode && nwTileColor === tc && nwTilePalette === tp;
    const nSameColor  = nNode  && nTileColor  === tc && nTilePalette === tp;
    const neSameColor = neNode && neTileColor === tc && neTilePalette === tp;
    const eSameColor  = eNode  && eTileColor  === tc && eTilePalette === tp;
    const seSameColor = seNode && seTileColor === tc && seTilePalette === tp;
    const sSameColor  = sNode  && sTileColor  === tc && sTilePalette === tp;
    const swSameColor = swNode && swTileColor === tc && swTilePalette === tp;
    const wSameColor  = wNode  && wTileColor  === tc && wTilePalette === tp;

    // if has to fill in blank space, given by the prefix of Diag.
    // considers fucky overlap as well
    const nw_nDiag = !nSameColor && !(nwTileColor === nTileColor && nwTilePalette === nTilePalette) && nwTileColor >= tc && nTileColor >= tc && wTileColor >= tc
    const n_neDiag = !neSameColor && !(nTileColor === neTileColor && nTilePalette === neTilePalette) && nTileColor >= tc && neTileColor >= tc && eTileColor >= tc
    const ne_eDiag = !eSameColor && !(neTileColor === eTileColor && neTilePalette === eTilePalette) && neTileColor >= tc && eTileColor >= tc && nTileColor >= tc
    const e_seDiag = !seSameColor && !(eTileColor === seTileColor && eTilePalette === seTilePalette) && eTileColor >= tc && seTileColor >= tc && sTileColor >= tc
    const se_sDiag = !sSameColor && !(seTileColor === sTileColor && seTilePalette === sTilePalette) && seTileColor >= tc && sTileColor >= tc && eTileColor >= tc
    const s_swDiag = !swSameColor && !(sTileColor === swTileColor && sTilePalette === swTilePalette) && sTileColor >= tc && swTileColor >= tc && wTileColor >= tc
    const sw_wDiag = !wSameColor && !(swTileColor === wTileColor && swTilePalette === wTilePalette) && swTileColor >= tc && wTileColor >= tc && sTileColor >= tc
    const w_nwDiag = !nwSameColor && !(wTileColor === nwTileColor && wTilePalette === nwTilePalette) && wTileColor >= tc && nwTileColor >= tc && nTileColor >= tc

    const sb = {
        "nx" : (node.i + nb.nx) * nodeGap,
        "ny" : (node.j + nb.ny) * nodeGap,
        "ex" : (node.i + nb.ex) * nodeGap,
        "ey" : (node.j + nb.ey) * nodeGap,
        "sx" : (node.i + nb.sx) * nodeGap,
        "sy" : (node.j + nb.sy) * nodeGap,
        "wx" : (node.i + nb.wx) * nodeGap,
        "wy" : (node.j + nb.wy) * nodeGap,
    };

    // how many adjacent nodes have the same color
    const adjCount = Object.keys(adjTiles).filter(key => adjTiles[key].color === tc && adjTiles[key].palette === tp).length

    // checks for trivial case, where surrounded by like colors. just a shortcut to save time. 
    // can't check for trivial case where 0 adjacent like colors, creates errors.
    if(adjCount === 8){
        points.push(
            (nNode.i + nNode.border.wx) * nodeGap, (nNode.j + nNode.border.wy) * nodeGap,
            (nNode.i + nNode.border.ex) * nodeGap, (nNode.j + nNode.border.ey) * nodeGap,
            (eNode.i + eNode.border.nx) * nodeGap, (eNode.j + eNode.border.ny) * nodeGap,
            (eNode.i + eNode.border.sx) * nodeGap, (eNode.j + eNode.border.sy) * nodeGap,
            (sNode.i + sNode.border.ex) * nodeGap, (sNode.j + sNode.border.ey) * nodeGap,
            (sNode.i + sNode.border.wx) * nodeGap, (sNode.j + sNode.border.wy) * nodeGap,
            (wNode.i + wNode.border.sx) * nodeGap, (wNode.j + wNode.border.sy) * nodeGap,
            (wNode.i + wNode.border.nx) * nodeGap, (wNode.j + wNode.border.ny) * nodeGap
        );
        return points;
    }

    /* 
    the following code is an amalgamation of ifs and elses that somehow formulates
    coherent code. it is not understandable, it barely works, and it is slow.  

    i have attempted to comment the first of the two cases, considering the ne and n adjacent nodes.
    the others follow a pattern from those two, so it should in theory be possible to figure out 
    those as well. good luck to you!

    consider this line:
    points.push((nwNode.i + b.ex) * nodeGap, (nwNode.j + b.ey) * nodeGap);
    this adds the nw adj eastern border to the points list.
    */

    // if no fucky overlap between n adj and w adj
    if(!(nTileColor > tc && nTileColor === wTileColor && nTilePalette === wTilePalette)) {
        if (nwSameColor) { // if target node same color as nw adjacent node
            const b = nwNode.border;
            // this if statement is here because ne adj shares a border with w adj, so they would both 
            // add this point. if w adj is adding it, then nw adj won't.
            if (!wSameColor) points.push((nwNode.i + b.sx) * nodeGap, (nwNode.j + b.sy) * nodeGap);
            // but this one goes to just nw adj and NOT n adj, with which it shares the border.
            points.push((nwNode.i + b.ex) * nodeGap, (nwNode.j + b.ey) * nodeGap);
        } else if (nw_nDiag) { // if need to fill blank space...
            const b = nwNode.border;
            // will add the point anyways.
            points.push((nwNode.i + b.ex) * nodeGap, (nwNode.j + b.ey) * nodeGap);
        }
    }

    if (nSameColor) { // if target node same color as n adjacent node
        const b = nNode.border;
        // same thing as before. doesn't add duplicate point if nw adj would add it.
        if (!nwSameColor) points.push((nNode.i + b.wx) * nodeGap, (nNode.j + b.wy) * nodeGap);
        points.push((nNode.i + b.ex) * nodeGap, (nNode.j + b.ey) * nodeGap);
    } else {
        // northern border only added if n adj is different color, regardless of nw adj and ne adj
        points.push(sb.nx, sb.ny);
        //if no fucky overlap...
        if (n_neDiag && !(eTileColor > tc && eTileColor === nTileColor && eTilePalette === nTilePalette)) {
            const b = nNode.border;
            // fill blank space.
            points.push((nNode.i + b.ex) * nodeGap, (nNode.j + b.ey) * nodeGap);
        }
    }

    if(!(eTileColor > tc && eTileColor === nTileColor && eTilePalette === nTilePalette)){
        if (neSameColor) {
            const b = neNode.border;
            if (!nSameColor) points.push((neNode.i + b.wx) * nodeGap, (neNode.j + b.wy) * nodeGap);
            points.push((neNode.i + b.sx) * nodeGap, (neNode.j + b.sy) * nodeGap);
        } else if (ne_eDiag) {
            const b = neNode.border;
            points.push((neNode.i + b.sx) * nodeGap, (neNode.j + b.sy) * nodeGap);
        }
    }

    if (eSameColor) {
        const b = eNode.border;
        if (!neSameColor) points.push((eNode.i + b.nx) * nodeGap, (eNode.j + b.ny) * nodeGap);
        points.push((eNode.i + b.sx) * nodeGap, (eNode.j + b.sy) * nodeGap);
    } else {
        points.push(sb.ex, sb.ey);
        if (e_seDiag && !(sTileColor > tc && sTileColor === eTileColor && sTilePalette === eTilePalette)) {
            const b = eNode.border;
            points.push((eNode.i + b.sx) * nodeGap, (eNode.j + b.sy) * nodeGap);
        }
    }

    if(!(sTileColor > tc && sTileColor === eTileColor && sTilePalette === eTilePalette)) {
        if (seSameColor) {
            const b = seNode.border;
            if (!eSameColor) points.push((seNode.i + b.nx) * nodeGap, (seNode.j + b.ny) * nodeGap);
            points.push((seNode.i + b.wx) * nodeGap, (seNode.j + b.wy) * nodeGap);
        } else if (se_sDiag) {
            const b = seNode.border;
            points.push((seNode.i + b.wx) * nodeGap, (seNode.j + b.wy) * nodeGap);
        }
    }

    if (sSameColor) {
        const b = sNode.border;
        if (!seSameColor) points.push((sNode.i + b.ex) * nodeGap, (sNode.j + b.ey) * nodeGap);
        points.push((sNode.i + b.wx) * nodeGap, (sNode.j + b.wy) * nodeGap);
    } else {
        points.push(sb.sx, sb.sy);
        if (s_swDiag && !(wTileColor > tc && wTileColor === sTileColor && wTilePalette === sTilePalette)) {
            const b = sNode.border;
            points.push((sNode.i + b.wx) * nodeGap, (sNode.j + b.wy) * nodeGap);
        }
    }

    if(!(wTileColor > tc && wTileColor === sTileColor && wTilePalette === sTilePalette)) {
        if (swSameColor) {
            const b = swNode.border;
            if (!sSameColor) points.push((swNode.i + b.ex) * nodeGap, (swNode.j + b.ey) * nodeGap);
            points.push((swNode.i + b.nx) * nodeGap, (swNode.j + b.ny) * nodeGap);
        } else if (sw_wDiag) {
            const b = swNode.border;
            points.push((swNode.i + b.nx) * nodeGap, (swNode.j + b.ny) * nodeGap);
        }
    }

    if (wSameColor) {
        const b = wNode.border;
        if (!swSameColor) points.push((wNode.i + b.sx) * nodeGap, (wNode.j + b.sy) * nodeGap);
        points.push((wNode.i + b.nx) * nodeGap, (wNode.j + b.ny) * nodeGap);
    } else {
        points.push(sb.wx, sb.wy);
        if (w_nwDiag && !(nTileColor > tc && nTileColor === wTileColor && nTilePalette === wTilePalette)) {
            const b = wNode.border;
            points.push((wNode.i + b.nx) * nodeGap, (wNode.j + b.ny) * nodeGap);
        }
    }

    return points;
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

function gameLoop(now) { // game animation loop
    const delta = now - last;
    last = now;
    smoothed = smoothed * 0.9 + delta * 0.1;

    drawMap(bgrMap)

    drawFPS(Math.round(1000/smoothed), Math.round(smoothed))
    drawDrill(bgr.width / 2, nodeGap*20)

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
    runForAll((i, j) => {
        bgrMap[j][i].realized = getAreaPts(bgrMap, i, j)
    })
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
    bgrMap,
    bgrctx,
    drlctx,
})