import { m4trans, m4rotZ, m4scale, m4mul, m4perspNegZ, m4rotX, m4rotY, m3mul, m3rotY, mul, mag} from "./math.js"

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

class Data {
    static grid = null
    static gridsize = 0
    static faults = 0
    static numVerts = 0

    static canv_width = 0
    static canv_height = 0
}

/**
 * Miscellaneous utility: print buffer data for debugging
 * 
 * targetBuffer: E.g. gl.ARRAY_BUFFER or gl.ELEMENT_ARRAY_BUFFER
 * currentLength: In terms of bytes, so e.g. items*Float32Array.BYTES_PER_ELEMENT
 */
function printBuffer(targetBuffer, currentLength) {
    const arrBuffer = new ArrayBuffer(
        currentLength,
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
            var [x, y] = gridPos(gs, i)
            var d2 = x*x + y*y
            if (d2 <= 1) {
                console.log(`Setting custom z of ${z}`)
                var z = Math.sqrt(1 - d2)
                grid[i] = z
            } else {
                console.log(`D2 was too big: ${d2}`)
            }
        }
    }
    return grid
}

function gridPos(gridsize, index) {
    const xi = index % gridsize
    const yi = Math.floor(index / gridsize)
    
    // indices range from 0 on one edge to N-1 on the other
    // So divide by (N-1) to scale to [0,1] then scale that to [-1, 1]
    const x = 2 * xi / (gridsize - 1) - 1 
    const y = 2 * yi / (gridsize - 1) - 1

    // Values should range from -1 if i = 0, to 1 if i = gridsize-1
    return [x, y] 
}

/**
 * Theoretically we could optimize this by only sending indices and have the vertex shader convert those to xy but idk wanna optimize that at the start
 */
function updateVertexBuffer(gl, gridsize, grid) {
    // Data at every vertex:
    // vec3 (x, y, z)
    // I think that's about it?
    const vertSize = 3
    var vertData = new Array(vertSize*grid.length)
    for (let i = 0; i < grid.length; i++) {
        var [x,y] = gridPos(gridsize, i)
        vertData[i*3 + 0] = x
        vertData[i*3 + 1] = y
        vertData[i*3 + 2] = grid[i]
    }
    Data.numVerts = vertData.length / 3

    Data.gridBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, Data.gridBuffer)
    gl.bufferData(gl.ARRAY_BUFFER,
        new Float32Array(vertData), gl.STATIC_DRAW
    )
    // Next: update pointer

    // printBuffer(gl.ARRAY_BUFFER, vertData.length*Float32Array.BYTES_PER_ELEMENT)
    const positionLoc = 0
    gl.enableVertexAttribArray(positionLoc)
    // Tell the attribute how to get data out of positionBuffer (ARRAY_BUFFER)
    var size = 3;          // 3 components per iteration
    var type = gl.FLOAT;   // the data is 32bit floats
    var normalize = false; // don't normalize the data
    var stride = 0;        // 0 = just tightly packed around this one attribute 
    var buffer_offset = 0;        // start at the beginning of the buffer
    gl.vertexAttribPointer(
        positionLoc, size, type, normalize, stride, buffer_offset) 
}

function projMatrix(seconds) {

    // First transformation, rotate on xy plane
    const PI = 3.141592653589
    var angspeed = 2*PI / (8) // One revolution every 8 seconds
    var xy_rot = m4rotZ(angspeed*seconds)

    // Second transformation, rotate camera down from z-axis to a certain angle, then bring a certain distance away
    var down_tilt = PI/2 * (-0.8)
    var down_rot = m4rotX(down_tilt)
    var cam_dist = 2.5
    var cam_move = m4trans(0, 0, -cam_dist)


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

    return m4listmul([cam_proj, cam_move, down_rot, xy_rot])
    // return m4scale(0.5, 1, 1)
}

function draw(seconds) {
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.useProgram(program)  

    const proj_mat = projMatrix(seconds)
    gl.uniformMatrix4fv(program.uniforms.proj, false, proj_mat)

    gl.drawArrays(gl.LINES, 0, Data.numVerts)
    // console.log("Wow we're gonna draw that's so cool")
}


//// END-OF-FILE BOILERPLATE ////


document.querySelector('#submit').addEventListener('click', event => {
    const gridsize = Number(document.querySelector('#gridsize').value) || 2
    const faults = Number(document.querySelector('#faults').value) || 0
    // TO DO: generate a new gridsize-by-gridsize grid here, then apply faults to it
    console.log(`Hi uh you pressed the button to submit size ${gridsize} grid with ${faults} faults`)
    Data.gridsize = gridsize
    Data.faults = faults
    Data.grid = makeGrid(gridsize, faults)
    updateVertexBuffer(window.gl, Data.gridsize, Data.grid)
});



/*
 * fetches, reads, and compiles glsl; sets two global variables; and begins
 * the animation
 */
async function setup() {
    window.gl = document.querySelector('canvas').getContext('webgl2')
    gl.enable(gl.DEPTH_TEST)
    const vs = await fetch('vs.glsl').then(res => res.text())
    const fs = await fetch('fs.glsl').then(res => res.text())
    window.program = compile(vs,fs)
    window.addEventListener('resize', fillScreen)
    fillScreen()
    console.log("Calling setup")
    tick(0) // <- ensure this function is called only once, at the end of setup

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
    const seconds = milliseconds / 1000
    draw(seconds)
    requestAnimationFrame(tick) // <- only call this here, nowhere else
}

// document.addEventListener('resize', fillScreen)
window.addEventListener('load', event => {
    setup()
    console.log("We called setup, the program should be linked!")
})