import { m4trans, m4rotZ, m4scale, m4mul, m4perspNegZ, m4rotX, m4rotY, m3mul, m3rotY, mul, mag, cross, normalize, sub, m3rotX, m3rotZ} from "./math.js"

/***
 * Multiplies from right to left
 */
function m4listmul(m4list) {
    var right = m4list[m4list.length-1]
    for (let i = m4list.length-2; i >= 0; i--) {
        right = m4mul(m4list[i], right)
    }
    return right
}
function m4uscale(scale) {
    return m4scale(scale, scale, scale)
}

const PI = 3.141592653589
class Data {

    static grid = null
    static gridsize = 0
    static faults = 0
    static numVerts = 0

    static canv_width = 0
    static canv_height = 0

    static light_pos = new Float32Array([0.5, 0.5, 2])

    static last_timestamp = 0

    // Camera info
    static cam_pos = new Float32Array([0, -2.5, 1.5])
    static cam_yaw = 0
    static cam_pitch = PI*0.4 // Pitch up from facng straight down

    static cam_speed = 0.4
    static cam_angspeed = PI*0.5
}

/**
 * Miscellaneous utility: print buffer data for debugging
 * 
 * targetBuffer: E.g. gl.ARRAY_BUFFER or gl.ELEMENT_ARRAY_BUFFER
 * currentLength: In terms of items
 */
function printF32Buffer(targetBuffer, currentLength) {
    const arrBuffer = new ArrayBuffer(
        currentLength*Float32Array.BYTES_PER_ELEMENT,
    );
    gl.getBufferSubData(targetBuffer, 0, new Float32Array(arrBuffer));
    console.log(new Float32Array(arrBuffer))
    // console.log()
}

function fillScreen() {
    let canvas = document.querySelector('canvas')
    document.body.style.margin = '0'
    canvas.style.width = '100%'
    canvas.style.height = '100%'
    canvas.width = canvas.clientWidth
    canvas.height = canvas.clientHeight
    Data.canv_width = canvas.width
    Data.canv_height = canvas.height
    canvas.style.width = ''
    canvas.style.height = ''
    gl.viewport(0,0, canvas.width, canvas.height)
    // TO DO: compute a new projection matrix based on the width/height aspect ratio
}


/**
 * Compiles two shaders, links them together, looks up their uniform locations,
 * and returns the result. Reports any shader errors to the console.
 *
 * @param {string} vs_source - the source code of the vertex shader
 * @param {string} fs_source - the source code of the fragment shader
 * @return {WebGLProgram} the compiled and linked program
 */
function compile(vs_source, fs_source) {
    const vs = gl.createShader(gl.VERTEX_SHADER)
    gl.shaderSource(vs, vs_source)
    gl.compileShader(vs)
    if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(vs))
        throw Error("Vertex shader compilation failed")
    }

    const fs = gl.createShader(gl.FRAGMENT_SHADER)
    gl.shaderSource(fs, fs_source)
    gl.compileShader(fs)
    if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(fs))
        throw Error("Fragment shader compilation failed")
    }

    const program = gl.createProgram()
    gl.attachShader(program, vs)
    gl.attachShader(program, fs)
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error(gl.getProgramInfoLog(program))
        throw Error("Linking failed")
    } else {
        console.log("Linking success!!")
    }
    
    const uniforms = {}
    for(let i=0; i<gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS); i+=1) {
        let info = gl.getActiveUniform(program, i)
        uniforms[info.name] = gl.getUniformLocation(program, info.name)
    }
    program.uniforms = uniforms
    return program
}




/*
 * Requires 2 <= gridsize <= 255
 *
 * Grids stored as one array of length gs*gs; row by row
 * https://cs418.cs.illinois.edu/website/text/make-geom.html#grids
 * 
 * Grid points are assumed to lie on a uniform range from [-1, 1] in both x and y.
 * The x and y of a point may be calculated wth gridPos(gridsize, index).
 * 
 * The grid is initialized with value 0 in each point 
 */
function makeGrid(gridsize, num_faults) {
    const gs = gridsize // Just an alias/shorthand, don't read too much into this
    var grid = new Array(gs*gs).fill(0)

    // If 0 faults, generate hemisphere
    if (num_faults == 0) {
        console.log("No faults!!")
        for (let i = 0; i < gs*gs; i++) {
            var [x, y] = gridXY(gs, i)
            var d2 = x*x + y*y
            if (d2 <= 1) {
                // console.log(`Setting custom z of ${z}`)
                var z = Math.sqrt(1 - d2)
                grid[i] = z
            } else {
                // console.log(`D2 was too big: ${d2}`)
            }
        }
    } else {
        faultGrid(grid, num_faults)
    }
    return grid
}

function pointOnRightSide(lineStart, lineDelta, point) {
    var pointDelta = [point[0] - lineStart[0], point[1] - lineStart[1]]
    var pD = pointDelta, lD = lineDelta
    var cross = (pD[0]*lD[1]) - (pD[1]*lD[0])
    return cross > 0
}

function faultGrid(grid, num_faults) {
    var faultNudge = 1
    for (let f = 0; f < num_faults; f++) {
        var faultPos = [Math.random()*2-1, Math.random()*2-1]
        var ang = 2*PI*Math.random()

        var faultDelta = [Math.cos(ang), Math.sin(ang)]

        for (let i = 0; i < grid.length; i++) {
            var point = gridXY(Data.gridsize, i)
            if (pointOnRightSide(faultPos, faultDelta, point)) {
                grid[i] += faultNudge
            } else {
                grid[i] -= faultNudge
            }
        }
    }

    // Normalize
    var c = 0.5
    var maxZ = Math.max(...grid)
    var minZ = Math.min(...grid)
    for (let i = 0; i < grid.length; i++) {
        grid[i] = c * (grid[i] - 0.5*(maxZ+minZ)) / (maxZ - minZ)
    }
}

function gridXY(gridsize, index) {
    const xi = index % gridsize
    const yi = Math.floor(index / gridsize)
    
    // indices range from 0 on one edge to N-1 on the other
    // So divide by (N-1) to scale to [0,1] then scale that to [-1, 1]
    const x = 2 * xi / (gridsize - 1) - 1 
    const y = 2 * yi / (gridsize - 1) - 1

    // Values should range from -1 if i = 0, to 1 if i = gridsize-1
    return [x, y] 
}

function gridPos(grid, gridsize, index) {
    const [x, y] = gridXY(gridsize, index)
    const z = grid[index]
    const pos = new Float32Array([x, y, z])
    return pos
}

function gridNormal(grid, gridsize, index) {
    const xi = index % gridsize
    const yi = Math.floor(index / gridsize)

    const vi = index
    // West, east, north south
    var wi = (xi == 0) ? vi : vi -1
    var ei = (xi == gridsize-1) ? vi : vi + 1
    var ni = (yi == 0) ? vi : vi - gridsize
    var si = (yi == gridsize-1) ? vi : vi + gridsize

    const w = gridPos(grid, gridsize, wi), e = gridPos(grid, gridsize, ei)
    const n = gridPos(grid, gridsize, ni), s = gridPos(grid, gridsize, si)

    const norm = normalize(cross(sub(n, s), sub(w, e)))
    // console.log(`norm: ${norm}`)
    return norm
}

/**
 * Theoretically we could optimize this by only sending indices and have the vertex shader convert those to xy but idk wanna optimize that at the start
 */
function updateVertexBuffer(gl, gridsize, grid) {
    // Data at every vertex:
    // vec3 (x, y, z)
    // I think that's about it?
    const vertSize = 6
    var vertData = new Array(vertSize*grid.length)
    for (let i = 0; i < grid.length; i++) {
        const vS = vertSize
        var [x,y] = gridXY(gridsize, i)
        vertData[i*vS + 0] = x
        vertData[i*vS + 1] = y
        vertData[i*vS + 2] = grid[i]

        // Calculate normal
        var [u, v, w] = gridNormal(grid, gridsize, i)
        vertData[i*vS + 3] = u
        vertData[i*vS + 4] = v
        vertData[i*vS + 5] = w
        // console.log(`Normal: (${u}, ${v}, ${w})`)
    }
    Data.numVerts = vertData.length / vertSize

    Data.gridBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, Data.gridBuffer)
    gl.bufferData(gl.ARRAY_BUFFER,
        new Float32Array(vertData), gl.STATIC_DRAW
    )
    // Next: update pointer

    // printF32Buffer(gl.ARRAY_BUFFER, vertData.length)
    const float_size = Float32Array.BYTES_PER_ELEMENT
    const num_floats = 6
    const positionLoc = 0
    gl.enableVertexAttribArray(positionLoc)
    // Tell the attribute how to get data out of positionBuffer (ARRAY_BUFFER)
    var size = 3;          // 3 components per iteration
    var type = gl.FLOAT;   // the data is 32bit floats
    var normalize = false; // don't normalize the data
    var stride = num_floats*float_size;        // 0 = just tightly packed around this one attribute 
    var buffer_offset = 0;        // start at the beginning of the buffer
    gl.vertexAttribPointer(
        positionLoc, size, type, normalize, stride, buffer_offset) 
    const normalLoc = 1
    gl.enableVertexAttribArray(normalLoc)
    size = 3
    type = gl.FLOAT
    normalize = false
    stride = num_floats*float_size
    buffer_offset = 3*float_size
    gl.vertexAttribPointer(
        normalLoc, size, type, normalize, stride, buffer_offset)
}

function updateElementBuffer(gl) {
    // https://cs418.cs.illinois.edu/website/text/make-geom.html
    const gs = Data.gridsize
    var elems = new Int16Array((gs-1)*(gs-1)*2 * 3)
    for (let n = 0; n < gs-1; n++) {
        for (let i = 0; i < gs-1; i++) {
            const trinum = n*(gs-1)*2 + i*2
            const ul_i = n*gs + i
            elems[trinum*3 + 0] = ul_i
            elems[trinum*3 + 1] = ul_i + 1
            elems[trinum*3 + 2] = ul_i + gs

            elems[trinum*3 + 3] = ul_i + 1
            elems[trinum*3 + 4] = ul_i + gs + 1
            elems[trinum*3 + 5] = ul_i + gs
        }
    }
    Data.elemBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, Data.elemBuffer)
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, elems, gl.STATIC_DRAW)
}

function camPosRotMat(pos, yaw, pitch) {
    // Apply movement to camera position, then rotate
    var R = m4mul(m4rotX(-pitch), m4rotZ(-yaw))
    var T = m4trans(-pos[0], -pos[1], -pos[2])
    return m4mul(R, T)
}

function projMatrixCamLoc(seconds) {

    // First transformation, rotate on xy plane
    var angspeed = 2*PI / (8) // One revolution every 8 seconds
    var xy_rot = m4rotZ(-angspeed*seconds)

    // Second transformation, rotate camera down from z-axis to a certain angle, then bring a certain distance away
    // var down_tilt = PI/2 * (0.8)
    // var down_rot = m4rotX(-down_tilt)
    // var cam_move = m4trans(0, 0, -cam_dist)
    // Vector of the transformed camera location

    var cam_yaw = angspeed*seconds;
    var cam_pitch = PI/2 * (0.8)
    var cam_dist = 2.5
    var cam_loc = m4listmul([m4rotZ(cam_yaw), m4rotX(cam_pitch), new Float32Array([0, 0, cam_dist, 1])])

    var cam_posrot = camPosRotMat(Data.cam_pos, Data.cam_yaw, Data.cam_pitch)



    // Second transformation, bring camera down to look at the origin from closer to the xy plane (after rotating, so it's like the camera is spinning around)
    var cam_proj = m4perspNegZ(0.1, cam_dist*2, 1.5, Data.canv_width, Data.canv_height)

    // Project to final aspect ratio; Shrink in whatever aspect necessary. Happens at end, so that it applies to final x, y
    var aspect_mat
    var [w, h] = [Data.canv_width, Data.canv_height]
    if (w > h) {
        // Wider than it is tall, shrink in width
        aspect_mat = m4scale(h/w, 1, 1)
    } else {
        aspect_mat = m4scale(1, w/h, 1)
    }

    return [m4listmul([cam_proj, cam_posrot])]
    // return m4scale(0.5, 1, 1)
}

function updateCamPos(dt) {
    // Update direction
    if (keysBeingPressed['ArrowUp']) {
        Data.cam_pitch += Data.cam_angspeed*dt
    }
    if (keysBeingPressed['ArrowDown']) {
        Data.cam_pitch -= Data.cam_angspeed*dt
    }
    if (keysBeingPressed['ArrowLeft']) {
        Data.cam_yaw += Data.cam_angspeed*dt
    }
    if (keysBeingPressed['ArrowRight']) {
        Data.cam_yaw -= Data.cam_angspeed*dt
    }


    // Update position
    var R = m4mul(m4rotZ(Data.cam_yaw),m4rotX(Data.cam_pitch))
    var cam_dir = m4mul(R, new Float32Array([0, 0, -1, 1]))
    // console.log(`Camera direction: ${cam_dir} from pitch of ${Data.cam_pitch} and yaw of ${Data.cam_yaw}`)
    const d_front = m4mul(m4uscale(Data.cam_speed*dt), cam_dir)
    if (keysBeingPressed['s']) {
        console.log(`Moving in direction: ${normalize(d_front)}`)
        Data.cam_pos[0] -= d_front[0]
        Data.cam_pos[1] -= d_front[1]
        Data.cam_pos[2] -= d_front[2]
    } else if (keysBeingPressed['w']) {
        console.log(`Moving in direction: ${normalize(d_front)}`)
        Data.cam_pos[0] += d_front[0]
        Data.cam_pos[1] += d_front[1]
        Data.cam_pos[2] += d_front[2]
    }
    
    const d_side = m4listmul([m4uscale(Data.cam_speed*dt), R, new Float32Array([-1, 0, 0, 1])])
    if (keysBeingPressed['d']) {
        console.log(`Moving in direction: ${normalize(d_side)}`)
        Data.cam_pos[0] -= d_side[0]
        Data.cam_pos[1] -= d_side[1]
        Data.cam_pos[2] -= d_side[2]
    } else if (keysBeingPressed['a']) {
        console.log(`Moving in direction: ${normalize(d_side)}`)
        Data.cam_pos[0] += d_side[0]
        Data.cam_pos[1] += d_side[1]
        Data.cam_pos[2] += d_side[2]
    }


}

function draw(seconds) {
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.useProgram(program)  
    const dt = seconds - Data.last_timestamp
    Data.last_timestamp = seconds
    updateCamPos(dt)


    var cam_posrot = camPosRotMat(Data.cam_pos, Data.cam_yaw, Data.cam_pitch)
    const far_dist = 5
    var proj_mat = m4mul(m4perspNegZ(0.001, far_dist, 1.5, Data.canv_width, Data.canv_height), cam_posrot)
    // const [proj_mat, cam_loc] = projMatrixCamLoc(seconds)
    // console.log(`Camera loc: ${cam_loc}`)
    gl.uniformMatrix4fv(program.uniforms.u_proj, false, proj_mat)
    gl.uniform3fv(program.uniforms.u_lightPos, Data.light_pos, 0, 3)
    gl.uniform3fv(program.uniforms.u_camPos, Data.cam_pos, 0, 3)

    // gl.drawArrays(gl.LINES, 0, Data.numVerts)
    if (Data.gridsize != 0) {
        const gs = Data.gridsize
        const num_tris = (gs-1)*(gs-1)*2
        gl.drawElements(gl.TRIANGLES, num_tris*3, gl.UNSIGNED_SHORT, 0)
    }
    // console.log("Wow we're gonna draw that's so cool")
}


//// END-OF-FILE BOILERPLATE ////


// document.querySelector('#submit').addEventListener('click', event => {
//     const gridsize = Number(document.querySelector('#gridsize').value) || 2
//     const faults = Number(document.querySelector('#faults').value) || 0
//     // TO DO: generate a new gridsize-by-gridsize grid here, then apply faults to it
//     console.log(`Hi uh you pressed the button to submit size ${gridsize} grid with ${faults} faults`)
//     Data.gridsize = gridsize
//     Data.faults = faults
//     Data.grid = makeGrid(gridsize, faults)
//     updateVertexBuffer(window.gl, Data.gridsize, Data.grid)
//     updateElementBuffer(window.gl)
// });



/*
 * fetches, reads, and compiles glsl; sets two global variables; and begins
 * the animation
 */
async function setup() {
    window.keysBeingPressed = {}
    window.addEventListener('keydown', event => keysBeingPressed[event.key] = true)
    window.addEventListener('keyup', event => keysBeingPressed[event.key] = false)

    window.gl = document.querySelector('canvas').getContext('webgl2')
    gl.enable(gl.DEPTH_TEST)
    // gl.enable(gl.CULL_FACE)
    const vs = await fetch('vs.glsl').then(res => res.text())
    const fs = await fetch('fs.glsl').then(res => res.text())
    window.program = compile(vs,fs)
    window.addEventListener('resize', fillScreen)
    fillScreen()
    console.log("Calling setup")
    tick(0) // <- ensure this function is called only once, at the end of setup


    // Set up with default values
    const gridsize = 50
    const faults = 50
    console.log(`Hi uh you pressed the button to submit size ${gridsize} grid with ${faults} faults`)
    Data.gridsize = gridsize
    Data.faults = faults
    Data.grid = makeGrid(gridsize, faults)
    updateVertexBuffer(window.gl, Data.gridsize, Data.grid)
    updateElementBuffer(window.gl)

}

/**
 * Runs the animation using requestAnimationFrame. This is like a loop that
 * runs once per screen refresh, but a loop won't work because we need to let
 * the browser do other things between ticks. Instead, we have a function that
 * requests itself be queued to be run again as its last step.
 * 
 * @param {Number} milliseconds - milliseconds since web page loaded; 
 *        automatically provided by the browser when invoked with
 *        requestAnimationFrame
 */
function tick(milliseconds) {
    var seconds = milliseconds / 1000
    if (keysBeingPressed['p']) {
        seconds = 0
    }
    draw(seconds)
    requestAnimationFrame(tick) // <- only call this here, nowhere else
}

// document.addEventListener('resize', fillScreen)
window.addEventListener('load', event => {
    setup()
    console.log("We called setup, the program should be linked!")
})