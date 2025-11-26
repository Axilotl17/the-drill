const bgr = document.getElementById("background")
const bgrctx = bgr.getContext('2d');

const mapSize = 60  // in nodes
const landscapeHeight = 25
const mapLength = 200 // in nodes

var bgrMap = []

var nodeGap
var scrollPos = 0 // how much scrolled

const layers = {
    'topsoil' : {
        'startHeight' : 0,
        'ores' : {
            // 'ore' : 'frequency' perhaps?
        },
        'palattes' : {
            'bg' : ["rgb(122, 90, 58)"],
            'grass' : [
                "rgb(96, 133, 72)",
                "rgb(78, 115, 60)",
                "rgb(115, 150, 85)",
            ],
            'walls' : [
                "rgb(130, 130, 135)",
                "rgb(110, 112, 118)",
                "rgb(95, 98, 104)",
            ],
            'main' : [
                "rgb(132, 100, 72)",
                "rgb(104, 77, 54)",
                "rgb(120, 97, 70)",
            ]
        }
    },
    'nextlayer' : {
        'startHeight' : 100,
        'ores' : {
            // 'ore' : 'frequency' perhaps?
        },
        'background' : "rgb(122, 90, 58)",
        'palattes' : {
            'bg' : ["rgb(90, 90, 92)"],
            'grass' : [
                    "rgb(96, 133, 72)",
                    "rgb(78, 115, 60)",
                    "rgb(115, 150, 85)",
            ],
            'walls' : [
                    "rgb(130, 130, 135)",
                    "rgb(110, 112, 118)",
                    "rgb(95, 98, 104)",
            ],
            'main' : [
                    "rgb(130, 130, 135)",
                    "rgb(110, 112, 118)",
                    "rgb(95, 98, 104)",
            ]
        }
    }
}

var colors = [ // will move and do better. for now is just bg colors
    "rgb(122, 90, 58)", // 0 being default, never called for any node.
    
    "rgb(132, 100, 72)",
    "rgb(104, 77, 54)",
    "rgb(120, 97, 70)",

    "rgb(130, 130, 135)",
    "rgb(110, 112, 118)",
    "rgb(95, 98, 104)",
    
    "rgb(96, 133, 72)",
    "rgb(78, 115, 60)",
    "rgb(115, 150, 85)",
]

resize()
populateNodes(bgrMap)
genBackground()


gameLoop()

function populateNodes(map){ // generate the nodes on a map
    // in theory only should populate one map and make copies for other layers
    for(j=0; j<mapLength; j++){
        const noise = 0.2
        row = []
        for(i=0; i<mapSize; i++) {
            node = {
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
    runForAll((i, j) => {
        const node = bgrMap[j][i]
        node.layer = getLayer(j)
        node.palatte = "bg"
        node.color = 0
    }, 0, landscapeHeight)

    f = 25 // frequency. right now all cluster types are equally frequent.
    
    //starts at landscapeHeight to make room for landscape
    for(n = landscapeHeight; n<mapLength; n += mapSize/f) { // the above can be changed by modifying a in n += a. 
        genCluster(bgrMap, rand(0, mapSize), Math.round(n), 3, 1, 0)
    }
    for(n = landscapeHeight; n<mapLength; n += mapSize/f) {
        genCluster(bgrMap, rand(0, mapSize), Math.round(n), 1, 4, 1)
    }
    for(n = landscapeHeight; n<mapLength; n += mapSize/f) {
        genCluster(bgrMap, rand(0, mapSize), Math.round(n), 1, 1, 2)
    }
    // genCluster(bgrMap, mapSize/2, 30, 1, 1, 0) // debug
    
    for(j = landscapeHeight; j<mapLength; j++) {
        nodes = [0, 1]

        possibleNodes = [2,3,4]
        possibleNodes.forEach((e, k) => {
            if(Math.random / (k+1) > 0.4) nodes.push(e) // reducing frequency as further from edge
        })

        nodes.forEach(i => {
            const r = Math.random()

            if (r < 0.6) {color = 0
            } else if (r < 0.9){color = 1
            } else color = 2

            node = bgrMap[j][i]

            node.layer = getLayer(j)
            node.palatte = "walls"
            node["color"] = color
        })
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
    d = r + Math.floor(noise/2) // ensures checks every point noise could generate
    for (let j = sj - d; j <= sj + d; j++) {
        for (let i = si - d; i <= si + d; i++) {
            // skip if outside map
            if (j < 0 || j >= mapLength || i < 0 || i >= mapSize) continue;

            // checks distance from starting node for given node
            const di = i - si;
            const dj = j - sj;
            const dist = Math.sqrt(di * di + dj * dj);
            const threshold = r + (Math.random() - 0.5) * noise; // circular check 

            const node = map[j][i]
            if (dist < threshold) {
                node.layer = getLayer(j)
                node.palatte = "main"
                node["color"] = color
            }
        }
    }
}

function drawMap(map){ //draws all nodes on given map
    runForVisible((i, j) => {
        let node = map[j][i]

        if(!("color" in node)) return; // if not given a color, ignore.

        const points = getAreaPts(map, i, j) // fuck fuck fuck fuck fuck this function
        bgrctx.beginPath();
        bgrctx.moveTo(points[0][0], points[0][1] - scrollPos); // perhaps make it alternating points instead for speed
        points.forEach(([x, y]) => {
            bgrctx.lineTo(x, y - scrollPos);
        })

        bgrctx.closePath();
        const color = layers[node.layer].palattes[node.palatte][node.color];

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

function drawNode(node){ // debug
    bgrctx.strokeStyle = "black"
    bgrctx.lineWidth = 1
    bgrctx.beginPath();
    bgrctx.arc(node.i * nodeGap, node.j * nodeGap, (node.color+2)*nodeGap/16, 0, 6.2832);
    bgrctx.stroke();
}

function drawBackground() {
    bgrctx.fillStyle = colors[0]
    bgrctx.fillRect(0, Math.max(landscapeHeight*nodeGap - scrollPos, 0 ), bgr.width, bgr.height)
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

    the goal is that given a node on a map, it will list out the points that make up its
    realized border, where realized border is considering all neighbors and the interpolation
    between them.

    the process of considering each neighbor (nw, n, ne, e, se, s, sw, w) and the effect it
    has has been done by hand, and unless some poor soul wants to try and simplify the pattern
    i won't be. 
    */ 

    const points = []
    const node = map[j][i]
    adjNodes = getAdjNodes(map, i, j)

    // cache neighbors + colors + borders for speed
    const nwNode = adjNodes.nw, nNode = adjNodes.n, neNode = adjNodes.ne, eNode = adjNodes.e;
    const seNode = adjNodes.se, sNode = adjNodes.s, swNode = adjNodes.sw, wNode = adjNodes.w;

    //just cardinal as theyre repeated to check for fucky overlap 
    const nNodeColor = nNode?.color, eNodeColor = eNode?.color, sNodeColor = sNode?.color, wNodeColor = wNode?.color;
    const nNodePalatte = nNode?.palatte, eNodePalatte = eNode?.palatte, sNodePalatte = sNode?.palatte, wNodePalatte = wNode?.palatte;

    const nc = node.color;
    const np = node.palatte;

    // all the comparisons, calculated beforehand

    const nwSameColor = nwNode && nwNode.color === nc && nwNode.palatte === np;
    const nSameColor  = nNode  && nNodeColor  === nc && nNode.palatte === np;
    const neSameColor = neNode && neNode.color === nc && neNode.palatte === np;
    const eSameColor  = eNode  && eNodeColor  === nc && eNode.palatte === np;
    const seSameColor = seNode && seNode.color === nc && seNode.palatte === np;
    const sSameColor  = sNode  && sNodeColor  === nc && sNode.palatte === np;
    const swSameColor = swNode && swNode.color === nc && swNode.palatte === np;
    const wSameColor  = wNode  && wNodeColor  === nc && wNode.palatte === np;

    const nb = node.border

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
    const adjCount = Object.keys(adjNodes).filter(key => adjNodes[key].color === nc && adjNodes[key].palatte === np).length

    // checks for trivial case, where surrounded. just a shortcut to save time.
    if(adjCount === 8){
        points.push(
            [(nNode.i + nNode.border.wx) * nodeGap, (nNode.j + nNode.border.wy) * nodeGap],
            [(nNode.i + nNode.border.ex) * nodeGap, (nNode.j + nNode.border.ey) * nodeGap],
            [(eNode.i + eNode.border.nx) * nodeGap, (eNode.j + eNode.border.ny) * nodeGap],
            [(eNode.i + eNode.border.sx) * nodeGap, (eNode.j + eNode.border.sy) * nodeGap],
            [(sNode.i + sNode.border.ex) * nodeGap, (sNode.j + sNode.border.ey) * nodeGap],
            [(sNode.i + sNode.border.wx) * nodeGap, (sNode.j + sNode.border.wy) * nodeGap],
            [(wNode.i + wNode.border.sx) * nodeGap, (wNode.j + wNode.border.sy) * nodeGap],
            [(wNode.i + wNode.border.nx) * nodeGap, (wNode.j + wNode.border.ny) * nodeGap]
        );
        return points;
    }

    // checks for trivial case, where solo.
    if(adjCount === 0) {
        points.push(
            [sb.nx, sb.ny],
            [sb.ex, sb.ey],
            [sb.sx, sb.sy],
            [sb.wx, sb.wy]
        );
    }

    /* 
    the following code is an amalgamation of ifs and elses that somehow formulates
    coherent code. it is not understandable, it barely works, and it is slow.  
    */

    if (nwSameColor && !(nNodeColor > nc && nNodeColor === wNodeColor && nNodePalatte === wNodePalatte)) {
        const b = nwNode.border;
        if (!wSameColor) points.push([(nwNode.i + b.sx) * nodeGap, (nwNode.j + b.sy) * nodeGap]);
        points.push([(nwNode.i + b.ex) * nodeGap, (nwNode.j + b.ey) * nodeGap]);
    }

    if (nSameColor) {
        const b = nNode.border;
        if (!nwSameColor) points.push([(nNode.i + b.wx) * nodeGap, (nNode.j + b.wy) * nodeGap]);
        points.push([(nNode.i + b.ex) * nodeGap, (nNode.j + b.ey) * nodeGap]);
    } else {
        points.push([sb.nx, sb.ny]);
    }

    if (neSameColor && !(eNodeColor > nc && eNodeColor === nNodeColor && eNodePalatte === nNodePalatte)) {
        const b = neNode.border;
        if (!nSameColor) points.push([(neNode.i + b.wx) * nodeGap, (neNode.j + b.wy) * nodeGap]);
        points.push([(neNode.i + b.sx) * nodeGap, (neNode.j + b.sy) * nodeGap]);
    }

    if (eSameColor) {
        const b = eNode.border;
        if (!neSameColor) points.push([(eNode.i + b.nx) * nodeGap, (eNode.j + b.ny) * nodeGap]);
        points.push([(eNode.i + b.sx) * nodeGap, (eNode.j + b.sy) * nodeGap]);
    } else {
        points.push([sb.ex, sb.ey]);
    }

    if (seSameColor && !(sNodeColor > nc && sNodeColor === eNodeColor && sNodePalatte === eNodePalatte)) {
        const b = seNode.border;
        if (!eSameColor) points.push([(seNode.i + b.nx) * nodeGap, (seNode.j + b.ny) * nodeGap]);
        points.push([(seNode.i + b.wx) * nodeGap, (seNode.j + b.wy) * nodeGap]);
    }

    if (sSameColor) {
        const b = sNode.border;
        if (!seSameColor) points.push([(sNode.i + b.ex) * nodeGap, (sNode.j + b.ey) * nodeGap]);
        points.push([(sNode.i + b.wx) * nodeGap, (sNode.j + b.wy) * nodeGap]);
    } else {
        points.push([sb.sx, sb.sy]);
    }

    if (swSameColor && !(wNodeColor > nc && wNodeColor === sNodeColor && wNodePalatte === sNodePalatte)
    ) {
        const b = swNode.border;
        if (!sSameColor) points.push([(swNode.i + b.ex) * nodeGap, (swNode.j + b.ey) * nodeGap]);
        points.push([(swNode.i + b.nx) * nodeGap, (swNode.j + b.ny) * nodeGap]);
    }

    if (wSameColor) {
        const b = wNode.border;
        if (!swSameColor) points.push([(wNode.i + b.sx) * nodeGap, (wNode.j + b.sy) * nodeGap]);
        points.push([(wNode.i + b.nx) * nodeGap, (wNode.j + b.ny) * nodeGap]);
    } else {
        points.push([sb.wx, sb.wy]);
    }

    return points;
}

function getAdjNodes(map, i, j) { // returns list of adjacent nodes
    adjNodes = { // list of directions
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
    topNode = Math.max(Math.floor(scrollPos/nodeGap), 0)
    botNode = Math.min(Math.ceil((scrollPos + bgr.height)/nodeGap), mapLength)

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
    bgrctx.clearRect(0, 0, bgr.width, bgr.height);

    drawMap(bgrMap)
    requestAnimationFrame(gameLoop);
}

function resize() { // resize window
    const dpr = window.devicePixelRatio || 1; // idk what this does 

    bgr.style.width = window.innerWidth + "px";
    bgr.style.height = window.innerHeight + "px";

    bgr.width = window.innerWidth * dpr;
    bgr.height = window.innerHeight * dpr;

    nodeGap = bgr.width / (mapSize - 1)
}

window.addEventListener('resize', resize);
addEventListener("wheel", (e) => {
    scrollPos += e.deltaY/5
})

