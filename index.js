const bgr = document.getElementById("background")
const bgrctx = bgr.getContext('2d');

resize()

const mapSize = 10
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

const cx = Math.floor(mapSize / 2);
const cy = Math.floor(mapSize / 2);

function bgrNoise() {

    const radius = 3
    const noise = 1.2

    // Local window bounds (+/- 4 from center)
    const r = Math.ceil(radius + noise);
    for (let y = cy - r; y <= cy + r; y++) {
        for (let x = cx - r; x <= cx + r; x++) {

            // Skip if outside matrix
            if (y < 0 || y >= mapSize || x < 0 || x >= mapSize) continue;

            // Distance check
            const dx = x - cx;
            const dy = y - cy;
            const dist = Math.sqrt(dx * dx + dy * dy);

            const threshold = radius + (Math.random() * noise - noise / 2);
            if (dist < threshold) bgrMap[y][x].color = 1;
        }
    }
}

bgrNoise();

function drawMap(){
    runForAll((i, j) => {
        let spot = bgrMap[j][i]
        drawSpot(spot);
        
        borders = []

        let eSpot = bgrMap[spot.j]?.[spot.i + 1]
        if(eSpot) {
            if(spot.color === eSpot.color && spot.color === 1) {
                borders.push([spot.border.nx, spot.border.ny, eSpot.border.nx, eSpot.border.ny]);
                borders.push([spot.border.sx, spot.border.sy, eSpot.border.sx, eSpot.border.sy]);
            }
        }
 
        let swSpot = bgrMap[spot.j + 1]?.[spot.i - 1]
        if(swSpot) {
            if(spot.color === swSpot.color && spot.color === 1) {
                borders.push([spot.border.sx, spot.border.sy, swSpot.border.ex, swSpot.border.ey]);
                borders.push([spot.border.wx, spot.border.wy, swSpot.border.nx, swSpot.border.ny]);
            }
        }

        let sSpot = bgrMap[spot.j + 1]?.[spot.i]
        if(sSpot) {
            if(spot.color === sSpot.color && spot.color === 1) {
                borders.push([spot.border.ex, spot.border.ey, sSpot.border.ex, sSpot.border.ey]);
                borders.push([spot.border.wx, spot.border.wy, sSpot.border.wx, sSpot.border.wy]);
            }
        }

        let seSpot = bgrMap[spot.j + 1]?.[spot.i + 1]
        if(seSpot) {
            if(spot.color === seSpot.color && spot.color === 1) {
                borders.push([spot.border.ex, spot.border.ey, seSpot.border.nx, seSpot.border.ny]);
                borders.push([spot.border.sx, spot.border.sy, seSpot.border.wx, seSpot.border.wy]);
            }
        }

        bgrctx.beginPath();
        bgrctx.strokeStyle = "black";
        bgrctx.lineWidth = 1;

        borders.forEach(([x1, y1, x2, y2]) => {
            bgrctx.moveTo(x1, y1);
            bgrctx.lineTo(x2, y2);
        })

        bgrctx.stroke();

        // adjSpots.forEach(adjSpot =>{
        //     console.log(adjSpot)
        //     if(spot.color === adjSpot.color && spot.color === 1) {
        //         drawLine(spot.x, spot.y, adjSpot.x, adjSpot.y)
        //     }
        // });
    })
}

function getCluster(map, si, sj, visited) {
    const stack = [[si, sj]];
    const blob = [];

    while (stack.length) {
        const [i, j] = stack.pop();

        // Skip if out of bounds or already visited
        if (
            i < 0 || i >= map.length ||
            j < 0 || j >= map[0].length ||
            visited[i][j] ||
            map[i][j] !== 1
        ) continue;

        visited[i][j] = true;
        blob.push([i, j]);

        // Push neighbors (4-way)
        runForAdjacent((ni, nj) => {
            stack.push(ni, nj)
        }, i, j)
    }
    return blob;
}

function getAllClusters(map) {
    const visited = map.map(row => row.map(() => false));
    const clusters = [];

    runForAll((si, sj) => {

        // Only start a cluster if this cell is an unvisited 1
        if (visited[si][sj] || map[si][sj] !== 1) return;

        const stack = [[si, sj]];
        const cluster = [];

        while (stack.length) {
            const [i, j] = stack.pop();

            if (
                i < 0 || i >= map.length ||
                j < 0 || j >= map[0].length ||
                visited[i][j] ||
                map[i][j] !== 1
            ) continue;

            visited[i][j] = true;
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


function drawSpot(spot){
    bgrctx.beginPath();
    bgrctx.arc(spot.x, spot.y, (spot.color+1)*(spotGap/8), 0, 6.2832);
    bgrctx.stroke();
}

function drawLine(x1, y1, x2, y2, ctx = bgrctx, stroke = 'black', width = 1) {
  // Set line style properties
  ctx.strokeStyle = stroke;
  ctx.lineWidth = width;

  // Begin a new path
  ctx.beginPath();

  // Move to the starting point of the line
  ctx.moveTo(x1, y1);

  // Draw a line to the ending point
  ctx.lineTo(x2, y2);

  // Render the line
  ctx.stroke();
}

function resize() {
    const dpr = window.devicePixelRatio || 1;
    bgr.style.width = window.innerWidth + "px";
    bgr.style.height = window.innerHeight + "px";

    bgr.width = window.innerWidth * dpr;
    bgr.height = window.innerHeight * dpr;
}

function runForAll(func) {
    for (let j = 0; j < mapSize; j++) {
        for (let i = 0; i < mapLength; i++) {
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