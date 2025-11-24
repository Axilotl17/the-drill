const bgr = document.getElementById("background")
const bgrctx = bgr.getContext('2d');

resize()

const mapSize = 20
const mapLength = 10
const mapGap = mapSize/10
const spotGap = (bgr.width / (mapSize+(2*mapGap)))

var bgrMap = []

for(j=0; j<mapLength; j++){
    const noise = .2
    row = []
    for(i=0; i<mapSize; i++) {
        spot = {
            "color" : 0,
            "i" : i,
            "j" : j,
            "x" : spotGap*(i+mapGap+0.5),
            "y" : spotGap*(j+mapGap),
            "border" : {}
        }

        if(j>0){ // checking for existing border northward
            spot.border.nx = bgrMap[j-1][i].border.sx;
            spot.border.ny = bgrMap[j-1][i].border.sy;
        } else {
            spot.border.nx = spot.x + (Math.random() - 0.5) * (noise * spotGap);
            spot.border.ny = spot.y - (0.5 * spotGap) + (Math.random() - 0.5) * (noise * spotGap);
        }

        spot.border.ex = spot.x + (0.5 * spotGap) + (Math.random() - 0.5) * (noise * spotGap);
        spot.border.ey = spot.y + (Math.random() - 0.5) * (noise * spotGap);

        spot.border.sx = spot.x + (Math.random() - 0.5) * (noise * spotGap);
        spot.border.sy = spot.y + (0.5 * spotGap) + (Math.random() - 0.5) * (noise * spotGap);

        if(i>0){ // checking for existing border westward
            spot.border.wx = row[i-1].border.ex;
            spot.border.wy = row[i-1].border.ey;
        } else {
            spot.border.wx = spot.x - (0.5 * spotGap) + (Math.random() - 0.5) * (noise * spotGap);
            spot.border.wy = spot.y + (Math.random() - 0.5) * (noise * spotGap);
        }

        row.push(spot)
    }
    bgrMap.push(row)
}

const li = Math.floor(mapSize / 4);
const ri = Math.floor((3 * mapSize) / 4);
const cj = Math.floor(mapLength / 2);

function bgrNoise(si, sj) {

    const radius = 3
    const noise = 3

    // Local window bounds (+/- 4 from center)
    const r = Math.ceil(radius + noise);
    for (let j = sj - r; j <= sj + r; j++) {
        for (let i = si - r; i <= si + r; i++) {

            // Skip if outside matrix
            if (j < 0 || j >= mapLength || i < 0 || i >= mapSize) continue;

            // Distance check
            const di = i - si;
            const dj = j - sj;
            const dist = Math.sqrt(di * di + dj * dj);

            const threshold = radius + (Math.random() - 0.5)*noise;
            if (dist < threshold) bgrMap[j][i].color = 1;
        }
    }
}

bgrNoise(li, cj);
bgrNoise(ri, cj);

function drawMap(){
    getAllClusters(bgrMap).forEach(cluster => {
        cluster.forEach(([i, j]) => {
            // i = 6
            // j = 7
            points = getAreaPts(bgrMap, i, j)
            bgrctx.beginPath();
            bgrctx.moveTo(points[0][0], points[0][1]);
            points.forEach(([x, y]) => {
                bgrctx.lineTo(x, y);
            })

            bgrctx.closePath();

            bgrctx.fillStyle = "rgba(0, 200, 0, 1)";
            bgrctx.strokeStyle = "black";
            bgrctx.lineWidth = -1;

            bgrctx.fill();
        })
    })
        
    runForAll((i, j) => {
        let spot = bgrMap[j][i]
        drawSpot(spot);
    })
}

function getAllClusters(map) {
    const visited = map.map(row => row.map(() => false));
    const clusters = [];

    runForAll((si, sj) => {
        // Only start a cluster if this cell is an unvisited 1
        if (visited[sj][si] || map[sj][si].color !== 1) return;

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
    spot = map[j][i]
    adjSpots = getAdjSpots(i, j)

    // cache neighbors + colors + borders for speed
    const nw = adjSpots.nw, n = adjSpots.n, ne = adjSpots.ne, e = adjSpots.e;
    const se = adjSpots.se, s = adjSpots.s, sw = adjSpots.sw, w = adjSpots.w;

    const sc = spot.color;

    const cNW = nw && nw.color === sc;
    const cN  = n  && n.color  === sc;
    const cNE = ne && ne.color === sc;
    const cE  = e  && e.color  === sc;
    const cSE = se && se.color === sc;
    const cS  = s  && s.color  === sc;
    const cSW = sw && sw.color === sc;
    const cW  = w  && w.color  === sc;

    const sb = spot.border;

    /* 
    the following code is an amalgamation of ifs and elses that somehow formulates
    coherent code. it is not understandable, it barely works, and it is slow.  
    */

    if (!cNW) {
        if (!cW && cSW) points.push([sb.wx, sb.wy]);
        if (!cN) points.push([sb.nx, sb.ny]);
    } else {
        const b = nw.border;
        if (!cW) points.push([b.sx, b.sy]);
        points.push([b.ex, b.ey]);
        if (cNE && !cN) points.push([sb.nx, sb.ny]);
    }

    if (cN) {
        const b = n.border;
        if (!cNW) points.push([b.wx, b.wy]);
        points.push([b.ex, b.ey]);
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


function drawSpot(spot){
    bgrctx.beginPath();
    bgrctx.arc(spot.x, spot.y, (spot.color+1)*(spotGap/8), 0, 6.2832);
    bgrctx.stroke();
}

function resize() {
    const dpr = window.devicePixelRatio || 1;
    bgr.style.width = window.innerWidth + "px";
    bgr.style.height = window.innerHeight + "px";

    bgr.width = window.innerWidth * dpr;
    bgr.height = window.innerHeight * dpr;
}

function getAdjSpots(i, j) {
    adjSpots = {
        "nw" : bgrMap[j - 1]?.[i - 1],
        "n"  : bgrMap[j - 1]?.[i],
        "ne" : bgrMap[j - 1]?.[i + 1],
        "w"  : bgrMap[j]?.[i - 1],
        "e"  : bgrMap[j]?.[i + 1],
        "sw" : bgrMap[j + 1]?.[i - 1],
        "s"  : bgrMap[j + 1]?.[i],
        "se" : bgrMap[j + 1]?.[i + 1]
    }

    for (const direction in adjSpots) { // purge all nonexisting spots
        if (adjSpots[direction] === undefined) {
            delete adjSpots[direction];
        }
    }

    return adjSpots
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

// runForAll((x, y) => {
    
// })

function gameLoop(now) {
    requestAnimationFrame(gameLoop);
}

window.addEventListener('resize', resize);

drawMap()