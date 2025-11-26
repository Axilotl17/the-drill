const bgr = document.getElementById("background")
const bgrctx = bgr.getContext('2d');

const mapSize = 60
const mapLength = 100
const nodeGap = bgr.width / mapSize

var bgrMap = []

var colors = [
    "rgb(122, 90, 58)",
    "rgba(132, 100, 72, 1)",
    "rgb(104, 77, 54)",
    "rgba(120, 97, 70, 1)",
]

populateNodes(bgrMap, 40)
genBackground()
resize()

var scrollPos = 0
//var topNode = 

gameLoop()

function populateNodes(map){
    for(j=0; j<mapLength; j++){
        const noise = .3
        row = []
        for(i=0; i<mapSize; i++) {
            node = {
                "color" : 0,
                "i" : i,
                "j" : j,
                "x" : nodeGap*i,
                "y" : nodeGap*j,
                "border" : {}
            }

            if(j>0){ // checking for existing border northward
                node.border.nx = nodeGap - map[j-1][i].border.sx;
                node.border.ny = map[j-1][i].border.sy;
            } else {
                node.border.nx = (Math.random() - 0.5) * (noise * nodeGap);
                node.border.ny = (-0.5 * nodeGap) + (Math.random() - 0.5) * (noise * nodeGap);
            }

            node.border.ex = (0.5 * nodeGap) + (Math.random() - 0.5) * (noise * nodeGap);
            node.border.ey = (Math.random() - 0.5) * (noise * nodeGap);

            node.border.sx = (Math.random() - 0.5) * (noise * nodeGap);
            node.border.sy = (0.5 * nodeGap) + (Math.random() - 0.5) * (noise * nodeGap);

            if(i>0){ // checking for existing border westward
                node.border.wx = row[i-1].border.ex;
                node.border.wy = nodeGap - row[i-1].border.ey;
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
    const bgrGroundTop = 30
    // for(n = bgrGroundTop; n<mapLength; n+=2) {
    //     genCluster(bgrMap, rand(0, mapSize), n, 3, 2, 1)
    // }
    // for(n = bgrGroundTop; n<mapLength; n+=2) {
    //     genCluster(bgrMap, rand(0, mapSize), n, 2, 3, 2)
    // }
    // for(n = bgrGroundTop; n<mapLength; n+=4) {
    //     genCluster(bgrMap, rand(0, mapSize), n, 1, 1, 3)
    // }
    genCluster(bgrMap, mapSize/2, 30, 3, 3, 1)
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
        bgrctx.fill();
        //drawNode(node);
    })
}

function drawBackground() {
    bgrctx.fillStyle = colors[0]
    bgrctx.fillRect(0, Math.min(bgr.height/2 - scrollPos), bgr.width, bgr.height)
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
                stack.push([ni, nj]);  // <-- FIXED
            }, i, j);
        }

        clusters.push(cluster);
    });
    return clusters;
}

function getAreaPts(map, i, j){
    const points = []
    node = map[j][i]
    adjNodes = getAdjNodes(map, i, j)

    // cache neighbors + colors + borders for speed
    const nw = adjNodes.nw, n = adjNodes.n, ne = adjNodes.ne, e = adjNodes.e;
    const se = adjNodes.se, s = adjNodes.s, sw = adjNodes.sw, w = adjNodes.w;

    const nc = node.color;

    const cNW = adjNodes.nw && adjNodes.nw.color === nc;
    const cN  = n  && n.color  === nc;
    const cNE = ne && ne.color === nc;
    const cE  = e  && e.color  === nc;
    const cSE = se && se.color === nc;
    const cS  = s  && s.color  === nc;
    const cSW = sw && sw.color === nc;
    const cW  = w  && w.color  === nc;

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

    const nw

    /* 
    the following code is an amalgamation of ifs and elses that somehow formulates
    coherent code. it is not understandable, it barely works, and it is slow.  
    */

    if(Object.keys(adjNodes).filter(key => adjNodes[key].color === nc).length === 8){
        points.push(
            [n.border.wx, n.border.wy],
            [n.border.ex, n.border.ey],
            [e.border.nx, e.border.ny],
            [e.border.sx, e.border.sy],
            [s.border.ex, s.border.ey],
            [s.border.wx, s.border.wy],
            [w.border.sx, w.border.sy],
            [w.border.nx, w.border.ny]
        );
        return points;
    }

    if (!cNW) {
        if (!cW && cSW) points.push([sb.wx, sb.wy]);
        if (!cN) points.push([sb.nx, sb.ny]);
    } else {
        const b = nw.border;
        if (!cW) points.push([(nw.i * nodeGap) + b.sx, b.sy]);
        points.push([(nw.i * nodeGap) + b.ex, (nw.j * nodeGap) + b.ey]);
        if (cNE && !cN) points.push([sb.nx, sb.ny]);
    }

    if (cN) {
        const b = n.border;
        if (!cNW) points.push([(n.i * nodeGap) + b.wx, b.wy]);
        points.push([(n.i * nodeGap) + b.ex, b.ey]);
    }

    if (!cNE) {
        if (!cN && cNW) points.push([sb.nx, sb.ny]);
        if (!cE) points.push([sb.ex, sb.ey]);
    } else {
        const b = ne.border;
        if (!cN) points.push([b.wx, b.wy]);
        points.push([b.sx, b.sy]);
        if (cSE && !cE) points.push([sb.ex, sb.ey]);
    }

    if (cE) {
        const b = e.border;
        if (!cNE) points.push([b.nx, b.ny]);
        points.push([b.sx, b.sy]);
    }

    if (!cSE) {
        if (!cE && cNE) points.push([sb.ex, sb.ey]);
        if (!cS) points.push([sb.sx, sb.sy]);
    } else {
        const b = se.border;
        if (!cE) points.push([b.nx, b.ny]);
        points.push([b.wx, b.wy]);
        if (cSW && !cS) points.push([sb.sx, sb.sy]);
    }

    if (cS) {
        const b = s.border;
        if (!cSE) points.push([b.ex, b.ey]);
        points.push([b.wx, b.wy]);
    }

    if (!cSW) {
        if (!cS && cSE) points.push([sb.sx, sb.sy]);
        if (!cW) points.push([sb.wx, sb.wy]);
    } else {
        const b = sw.border;
        if (!cS) points.push([b.ex, b.ey]);
        points.push([b.nx, b.ny]);
        if (cNW && !cW) points.push([sb.wx, sb.wy]);
    }

    if (cW) {
        const b = w.border;
        if (!cSW) points.push([b.sx, b.sy]);
        points.push([b.nx, b.ny]);
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
    const d = 3
    const s = Math.round(Math.pow(10,d) * window.innerWidth * dpr / bgr.width) / Math.pow(10,d)
    console.log(s)

    runForAll((i, j) => {
        node = bgrMap[j][i]
        node.x *= s
        node.y *= s

        node.border.nx *= s
        node.border.ny *= s
        node.border.ex *= s
        node.border.ey *= s
        node.border.sx *= s
        node.border.sy *= s
        node.border.wx *= s
        node.border.wy *= s
        
    })

    bgr.style.width = window.innerWidth + "px";
    bgr.style.height = window.innerHeight + "px";

    bgr.width = window.innerWidth * dpr;
    bgr.height = window.innerHeight * dpr;
}

window.addEventListener('resize', resize);

