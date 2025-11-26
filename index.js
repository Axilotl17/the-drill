const bgr = document.getElementById("background")
const bgrctx = bgr.getContext('2d');

const mapSize = 60
const mapLength = 100
var nodeGap

var bgrMap = []

var colors = [
    "rgb(122, 90, 58)",
    "rgba(132, 100, 72, 1)",
    "rgba(104, 77, 54, 1)",
    "rgba(120, 97, 70, 1)",
]

resize()
populateNodes(bgrMap, 40)
genBackground()

var scrollPos = 0
//var topNode = 

gameLoop()

function populateNodes(map){
    for(j=0; j<mapLength; j++){
        const noise = 0.2
        row = []
        for(i=0; i<mapSize; i++) {
            node = {
                "color" : 0,
                "i" : i,
                "j" : j,
                "border" : {}
            }

            if(j>0){ // checking for existing border northward
                node.border.nx = map[j-1][i].border.sx;
                node.border.ny = map[j-1][i].border.sy - nodeGap;
            } else {
                node.border.nx = (Math.random() - 0.5) * (noise * nodeGap);
                node.border.ny = (-0.5 * nodeGap) + (Math.random() - 0.5) * (noise * nodeGap);
            }

            node.border.ex = (0.5 * nodeGap) + (Math.random() - 0.5) * (noise * nodeGap);
            node.border.ey = (Math.random() - 0.5) * (noise * nodeGap);

            node.border.sx = (Math.random() - 0.5) * (noise * nodeGap);
            node.border.sy = (0.5 * nodeGap) + (Math.random() - 0.5) * (noise * nodeGap);

            if(i>0){ // checking for existing border westward
                node.border.wx = row[i-1].border.ex - nodeGap;
                node.border.wy = row[i-1].border.ey;
            } else {
                node.border.wx = (-0.5 * nodeGap) + (Math.random() - 0.5) * (noise * nodeGap);
                node.border.wy = (Math.random() - 0.5) * (noise * nodeGap);
            }

            row.push(node)
        }
        map.push(row)
    }
}

function genBackground() {
    const bgrGroundTop = 0
    for(n = bgrGroundTop; n<mapLength; n+=2) {
        genCluster(bgrMap, rand(0, mapSize), n, 3, 2, 1)
    }
    for(n = bgrGroundTop; n<mapLength; n+=2) {
        genCluster(bgrMap, rand(0, mapSize), n, 2, 3, 2)
    }
    for(n = bgrGroundTop; n<mapLength; n+=4) {
        genCluster(bgrMap, rand(0, mapSize), n, 1, 1, 3)
    }
    //genCluster(bgrMap, mapSize/2, 7, 1, 1, 1)
}  

/**
 * 
 * @param {object} map 
 * @param {number} si - starting position i
 * @param {number} sj - starting position j 
 * @param {number} r - radius
 * @param {number} noise 
 * @param {number} color 
 */

function genCluster(map, si, sj, r, noise, color) {
    for (let j = sj - r; j <= sj + r; j++) {
        for (let i = si - r; i <= si + r; i++) {

            // Skip if outside matrix
            if (j < 0 || j >= mapLength || i < 0 || i >= mapSize) continue;

            // Distance check
            const di = i - si;
            const dj = j - sj;
            const dist = Math.sqrt(di * di + dj * dj);

            const threshold = r + (Math.random() - 0.5)*noise;
            if (dist < threshold) map[j][i]["color"] = color;
        }
    }
}


function drawMap(map){   
    runForAll((i, j) => {
        let node = map[j][i]

        if(node.color===0) return;
        // i = 6
        // j = 7
        points = getAreaPts(map, i, j)
        bgrctx.beginPath();
        bgrctx.moveTo(points[0][0], points[0][1]);
        points.forEach(([x, y]) => {
            bgrctx.lineTo(x, y);
        })

        bgrctx.closePath();

        bgrctx.fillStyle = colors[node.color];
        bgrctx.strokeStyle = colors[node.color]
        bgrctx.lineCap = "round"
        bgrctx.lineWidth = 1
        bgrctx.fill();
        bgrctx.stroke();
    })

    // runForAll((i, j) => {
    //     drawNode(map[j][i]);
    // })
}

function drawNode(node){
    bgrctx.strokeStyle = "black"
    bgrctx.lineWidth = 1
    bgrctx.beginPath();
    bgrctx.arc(node.i * nodeGap, node.j * nodeGap, (node.color+2)*nodeGap/16, 0, 6.2832);
    bgrctx.stroke();
}

function drawBackground() {
    bgrctx.fillStyle = colors[0]
    bgrctx.fillRect(0, Math.max(25*nodeGap - scrollPos, 0 ), bgr.width, bgr.height)
}

// unused
function getAllClusters(map) {
    const visited = map.map(row => row.map(() => false));
    const clusters = [];

    runForAll((si, sj) => {
        // Only start a cluster if this cell is an unvisited 1
        if (visited[sj][si] || map[sj][si].color === 0) return;

        const stack = [[si, sj]];
        const cluster = [];

        while (stack.length) {
            const [i, j] = stack.pop();

            if (
                i < 0 || i >= mapSize ||
                j < 0 || j >= mapLength ||
                visited[j][i] ||
                map[j][i].color !== 1
            ) continue;

            visited[j][i] = true;
            cluster.push([i, j]);

            // Push neighbors properly
            runForAdjacent((ni, nj) => {
                stack.push([ni, nj]);
            }, i, j);
        }

        clusters.push(cluster);
    });
    return clusters;
}

function getAreaPts(map, i, j){
    /*
    this function is pure magic. please do not ask how it works.
    */ 

    const points = []
    const node = map[j][i]
    adjNodes = getAdjNodes(map, i, j)

    // cache neighbors + colors + borders for speed
    const nwNode = adjNodes.nw, nNode = adjNodes.n, neNode = adjNodes.ne, eNode = adjNodes.e;
    const seNode = adjNodes.se, sNode = adjNodes.s, swNode = adjNodes.sw, wNode = adjNodes.w;

    const nNodeColor = nNode?.color, eNodeColor = eNode?.color, sNodeColor = sNode?.color, wNodeColor = wNode?.color;
    
    const nc = node.color;

    const nwSameColor = nwNode && nwNode.color === nc;
    const nSameColor  = nNode  && nNodeColor  === nc;
    const neSameColor = neNode && neNode.color === nc;
    const eSameColor  = eNode  && eNodeColor  === nc;
    const seSameColor = seNode && seNode.color === nc;
    const sSameColor  = sNode  && sNodeColor  === nc;
    const swSameColor = swNode && swNode.color === nc;
    const wSameColor  = wNode  && wNodeColor  === nc;

    const nb = node.border

    const sb = {
        "nx" : (node.i * nodeGap) + nb.nx,
        "ny" : (node.j * nodeGap) + nb.ny,
        "ex" : (node.i * nodeGap) + nb.ex,
        "ey" : (node.j * nodeGap) + nb.ey,
        "sx" : (node.i * nodeGap) + nb.sx,
        "sy" : (node.j * nodeGap) + nb.sy,
        "wx" : (node.i * nodeGap) + nb.wx,
        "wy" : (node.j * nodeGap) + nb.wy,
    };


    /* 
    the following code is an amalgamation of ifs and elses that somehow formulates
    coherent code. it is not understandable, it barely works, and it is slow.  
    */

    if(Object.keys(adjNodes).filter(key => adjNodes[key].color === nc).length === 8){
        points.push(
            [(nNode.i * nodeGap) + nNode.border.wx, (nNode.j * nodeGap) + nNode.border.wy],
            [(nNode.i * nodeGap) + nNode.border.ex, (nNode.j * nodeGap) + nNode.border.ey],
            [(eNode.i * nodeGap) + eNode.border.nx, (eNode.j * nodeGap) + eNode.border.ny],
            [(eNode.i * nodeGap) + eNode.border.sx, (eNode.j * nodeGap) + eNode.border.sy],
            [(sNode.i * nodeGap) + sNode.border.ex, (sNode.j * nodeGap) + sNode.border.ey],
            [(sNode.i * nodeGap) + sNode.border.wx, (sNode.j * nodeGap) + sNode.border.wy],
            [(wNode.i * nodeGap) + wNode.border.sx, (wNode.j * nodeGap) + wNode.border.sy],
            [(wNode.i * nodeGap) + wNode.border.nx, (wNode.j * nodeGap) + wNode.border.ny]
        );
        return points;
    }

    if (nwSameColor && !(nNodeColor > nc && nNodeColor === wNodeColor)) {
        const b = nwNode.border;
        if (!wSameColor) points.push([(nwNode.i * nodeGap) + b.sx, (nwNode.j * nodeGap) + b.sy]);
        points.push([(nwNode.i * nodeGap) + b.ex, (nwNode.j * nodeGap) + b.ey]);
    }

    if (nSameColor) {
        const b = nNode.border;
        if (!nwSameColor) points.push([(nNode.i * nodeGap) + b.wx, (nNode.j * nodeGap) + b.wy]);
        points.push([(nNode.i * nodeGap) + b.ex, (nNode.j * nodeGap) + b.ey]);
    } else {
        points.push([sb.nx, sb.ny]);
    }

    if (neSameColor && !(eNodeColor > nc && eNodeColor === nNodeColor)) {
        const b = neNode.border;
        if (!nSameColor) points.push([(neNode.i * nodeGap) + b.wx, (neNode.j * nodeGap) + b.wy]);
        points.push([(neNode.i * nodeGap) + b.sx, (neNode.j * nodeGap) + b.sy]);
    }

    if (eSameColor) {
        const b = eNode.border;
        if (!neSameColor) points.push([(eNode.i * nodeGap) + b.nx, (eNode.j * nodeGap) + b.ny]);
        points.push([(eNode.i * nodeGap) + b.sx, (eNode.j * nodeGap) + b.sy]);
    } else {
        points.push([sb.ex, sb.ey]);
    }

    if (seSameColor && !(sNodeColor > nc && sNodeColor === eNodeColor)) {
        const b = seNode.border;
        if (!eSameColor) points.push([(seNode.i * nodeGap) + b.nx, (seNode.j * nodeGap) + b.ny]);
        points.push([(seNode.i * nodeGap) + b.wx, (seNode.j * nodeGap) + b.wy]);
    }

    if (sSameColor) {
        const b = sNode.border;
        if (!seSameColor) points.push([(sNode.i * nodeGap) + b.ex, (sNode.j * nodeGap) + b.ey]);
        points.push([(sNode.i * nodeGap) + b.wx, (sNode.j * nodeGap) + b.wy]);
    } else {
        points.push([sb.sx, sb.sy]);
    }

    if (swSameColor && !(wNodeColor > nc && wNodeColor === sNodeColor)) {
        const b = swNode.border;
        if (!sSameColor) points.push([(swNode.i * nodeGap) + b.ex, (swNode.j * nodeGap) + b.ey]);
        points.push([(swNode.i * nodeGap) + b.nx, (swNode.j * nodeGap) + b.ny]);
    }

    if (wSameColor) {
        const b = wNode.border;
        if (!swSameColor) points.push([(wNode.i * nodeGap) + b.sx, (wNode.j * nodeGap) + b.sy]);
        points.push([(wNode.i * nodeGap) + b.nx, (wNode.j * nodeGap) + b.ny]);
    } else {
        points.push([sb.wx, sb.wy]);
    }

    return points;
}


function getAdjNodes(map, i, j) {
    adjNodes = {
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

function runForAll(func) {
    for (let j = 0; j < mapLength; j++) {
        for (let i = 0; i < mapSize; i++) {
            func(i, j)
        }
    }
}

function runForAdjacent(func, io, jo) {
    for (let j = -1; j < 2; j++) {
        for (let i = -1; i < 2; i++) {
            func(io+i, jo+j);
        }
    }
}

function rand(min, max) {
    return Math.floor(Math.random()*(max - min + 1)) + min
}

function gameLoop(now) {
    let w = bgr.width
    let h = bgr.height
    bgrctx.clearRect(0, 0, w, h);

    drawBackground()
    drawMap(bgrMap)
    requestAnimationFrame(gameLoop);
}

function resize() {
    const dpr = window.devicePixelRatio || 1;
    // const d = 3
    // const s = Math.round(Math.pow(10,d) * window.innerWidth * dpr / bgr.width) / Math.pow(10,d)

    // runForAll((i, j) => {
    //     node = bgrMap[j][i]
    //     node.x *= s
    //     node.y *= s

    //     node.border.nx *= s
    //     node.border.ny *= s
    //     node.border.ex *= s
    //     node.border.ey *= s
    //     node.border.sx *= s
    //     node.border.sy *= s
    //     node.border.wx *= s
    //     node.border.wy *= s
        
    // })

    bgr.style.width = window.innerWidth + "px";
    bgr.style.height = window.innerHeight + "px";

    bgr.width = window.innerWidth * dpr;
    bgr.height = window.innerHeight * dpr;

    nodeGap = bgr.width / mapSize
}

window.addEventListener('resize', resize);

