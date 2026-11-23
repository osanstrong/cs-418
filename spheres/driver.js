import { m4trans, m4rotZ, m4scale, m4mul, m4perspNegZ, m4rotX, m4rotY, m3mul, m3rotY, mul, mag, cross, normalize, sub, m3rotX, m3rotZ, add, dot} from "./math.js"

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
    static last_time = 0;

    static light_pos = new Float32Array([15, 5, 60])

    static NUM_PARTICLES = 20
    static WIDTH = 1
    static RADIUS = 0.15 * Data.WIDTH / 2
    static ELAST_WALL = 0.9
    static ELAST_SPHERE = 0.9
    static GRAVITY = 2
    static MAX_DT = 0.1

    static spheres = []
}

/**
 * Class originally built to access data from static arrays, before realizing that's silly and we don't actually need it.
 */
class Sphere {
    constructor(pos, color) {
        this.pos = pos
        this.vel = new Float32Array(3)
        this.col = color
    }

    getPos() {
        return this.pos
    }

    setPos(pos) {
        this.pos = pos
    }

    getVel() {
        return this.vel
    }

    setVel(vel) {
        this.vel = vel
    }

    getColor() {
        return this.col
    }

    getModelMat() {
        let p = this.pos
        return m4mul(m4trans(p[0], p[1], p[2]), m4uscale(Data.RADIUS))
    }

    //// Physics

    updateGravity(dt) {
        this.vel[2] -= Data.GRAVITY * dt
    }

    applyVelocity(dt) {
        for (let i = 0; i < 3; i++) {
            this.pos[i] += this.vel[i] * dt
        }
    }

    /**
     * 
     * @param {*} overlap 
     * @param {*} vel_other 
     * @param {number} w : Corresponds to m_this / (m_this + m_other)
     * @param {*} e 
     * @param {*} other 
     */
    collide(overlap, vel_other, w, e, other) {
        let dir = normalize(overlap)
        
        let v_a = mul(this.vel, dot(normalize(this.vel), dir))
        let v_o = sub(this.vel, v_a)

        let b_a = mul(vel_other, dot(normalize(vel_other), dir))
        let b_o = sub(vel_other, b_a)
        if (mag(vel_other) == 0) {
            b_a.fill(0);
            b_o.fill(0);
        }
        // console.log(`b = ${vel_other} -> b_a=${b_a}, b_o=${b_o}`)
        
        let s = sub(v_a, b_o)
        // console.log(`From v=${this.vel} to s=${s}`)

        this.vel = add(v_o, sub(v_a, mul(s, (1-w)*(1+e))))

        let fudge = 0.0
        this.pos = sub(this.pos, mul(overlap, 1-w + fudge))

        if (w > 0) {
            // If weight is not 0, it means it's another sphere to send back
            // console.log(`Other before: p=${other.getPos()}`)
            let b0 = other.getVel()
            other.setPos(add(other.getPos(), mul(overlap, w + fudge)))
            other.setVel(add(b_o, add(b_a, mul(s, w*(1+e)))))
            // console.log(`Other afer: p=${other.getPos()}`)
            let b1 = other.getVel()
            console.log(`dir: ${dir}`)
            console.log(`dv for other: ${sub(b1, b0)}`)

        }
    }

    checkSpheres(otherspheres) {
        for (let i = 0; i < otherspheres.length; i++) {
            let other = otherspheres[i]
            let dp = sub(this.pos, other.getPos())
            let len = mag(dp)
            let max_len = 2*Data.RADIUS
            let w = 0.5 // Equal for now
            if (len < max_len) {
                this.collide(mul(normalize(dp), len-max_len), other.getVel(), w, Data.ELAST_SPHERE, other)
            }
        }
    }


    checkWalls() {
        if (this.pos[2] - Data.RADIUS < 0) {
            this.collide(new Float32Array([0, 0, this.pos[2]-Data.RADIUS]), new Float32Array(3), 0, Data.ELAST_WALL, null)
        }
    }



    /**
     * 
     * @param {number} dt 
     * @param {list} otherspheres, Specifically spheres which *should* be checked for collisions (i.e. spheres afterwards in index)
     */
    update(dt, otherspheres) {
        // console.log(`Num other spheres: ${otherspheres.length}`)
        this.updateGravity(dt)
        this.applyVelocity(dt)
        this.checkWalls()
        this.checkSpheres(otherspheres)
    }

    //// Generators

    static genRand() {
        const pos = new Float32Array(3)
        const col = new Float32Array(4)

        for (let i = 0; i < 3; i++) pos[i] = (Math.random()-0.5)*(Data.WIDTH - 2*Data.RADIUS);
        pos[2] += 0.5*Data.WIDTH
        for (let i = 0; i < 3; i++) col[i] = Math.random()**0.6;

        col[3] = 0.1


        console.log(`Entry color: ${col}`)

        return new Sphere(pos, col)
    }
}



const PI = 3.141592653589
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

// Updates sphere attribute and element buffers from sphere.json
function updateSphereBuffers(gl, data) {
    //// Attributes
    let attr = data['attributes'][0]
    let nv = attr.length;

    const vertSize = 6
    let f32attr = new Float32Array(nv*vertSize)

    for (let i = 0; i < nv; i++) {
        const vs = vertSize
        let p = attr[i]
        f32attr[i*vs + 0] = p[0]
        f32attr[i*vs + 1] = p[1]
        f32attr[i*vs + 2] = p[2]

        // Unit sphere -> Normal == position, but leaving shaders the same for ease of use
        f32attr[i*vs + 3] = p[0]
        f32attr[i*vs + 4] = p[1]
        f32attr[i*vs + 5] = p[2]
    }
    Data.numVerts = nv

    Data.gridBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, Data.gridBuffer)
    gl.bufferData(gl.ARRAY_BUFFER,
        new Float32Array(f32attr), gl.STATIC_DRAW
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

    //// ELEMENTS

    let elem = data['triangles']
    let nt = elem.length
    let i16elem = new Int16Array(nt*3)

    for (let i = 0; i < nt; i++) {
        let tri = elem[i]
        i16elem[i*3+0] = tri[0]
        i16elem[i*3+1] = tri[1]
        i16elem[i*3+2] = tri[2]
    }
    Data.numTris = nt
    Data.elemBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, Data.elemBuffer)
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, i16elem, gl.STATIC_DRAW)
    
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

    const FROZEN_TIME = 0.0
    var cam_yaw = angspeed*FROZEN_TIME
    let cam_pitch = PI/2 * (0.8)
    let cam_dist = 2.5
    let cam_loc = m4listmul([m4rotZ(cam_yaw), m4rotX(cam_pitch), new Float32Array([0, 0, cam_dist, 1])])

    let cam_posrot = camPosRotMat(cam_loc, cam_yaw, cam_pitch)



    // Second transformation, bring camera down to look at the origin from closer to the xy plane (after rotating, so it's like the camera is spinning around)
    let cam_proj = m4perspNegZ(0.1, cam_dist*2, 1, Data.canv_width, Data.canv_height)

    // Project to final aspect ratio; Shrink in whatever aspect necessary. Happens at end, so that it applies to final x, y
    let aspect_mat
    let [w, h] = [Data.canv_width, Data.canv_height]
    if (w > h) {
        // Wider than it is tall, shrink in width
        aspect_mat = m4scale(h/w, 1, 1)
    } else {
        aspect_mat = m4scale(1, w/h, 1)
    }

    return [m4listmul([cam_proj, cam_posrot]), cam_loc]
    // return m4scale(0.5, 1, 1)
}

function draw(seconds) {
    //// SIMULATE
    let dt = Math.min(seconds - Data.last_time, Data.MAX_DT)
    Data.last_time = seconds
    for (let i = 0; i < Data.spheres.length; i++) {
        let sph = Data.spheres[i]
        sph.update(dt, Data.spheres.slice(i+1))
    }

    //// DRAW 
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.useProgram(program)  

    const [proj_mat, cam_loc] = projMatrixCamLoc(seconds)
    // console.log(`Camera loc: ${cam_loc}`)
    gl.uniform3fv(program.uniforms.u_lightPos, Data.light_pos, 0, 3)
    gl.uniform3fv(program.uniforms.u_camPos, cam_loc, 0, 3)


    const nt = Data.numTris
    for (let i = 0; i < Data.spheres.length; i++){
        let sph = Data.spheres[i]
        let col = sph.getColor()
        gl.uniform4fv(program.uniforms.u_color, sph.getColor(), 0, 4)
        gl.uniformMatrix4fv(program.uniforms.u_proj, false, m4mul(proj_mat, sph.getModelMat()))
        // gl.uniformMatrix4fv(program.uniforms.u_proj, false, proj_mat)
        gl.drawElements(gl.TRIANGLES, nt*3, gl.UNSIGNED_SHORT, 0)
    }

    // gl.drawArrays(gl.LINES, 0, Data.numVerts)
    if (Data.gridsize != 0) {
        const gs = Data.gridsize
        const num_tris = (gs-1)*(gs-1)*2
        gl.drawElements(gl.TRIANGLES, num_tris*3, gl.UNSIGNED_SHORT, 0)
    }
    // console.log("Wow we're gonna draw that's so cool")
}

function resetSpheres() {
    Data.spheres = []
    for (let i = 0; i < Data.NUM_PARTICLES; i++) {
        Data.spheres.push(Sphere.genRand())
    }
}

//// END-OF-FILE BOILERPLATE ////



/*
 * fetches, reads, and compiles glsl; sets two global variables; and begins
 * the animation
 */
async function setup() {
    window.gl = document.querySelector('canvas').getContext('webgl2')
    gl.enable(gl.DEPTH_TEST)
    // gl.enable(gl.CULL_FACE)
    const vs = await fetch('vs.glsl').then(res => res.text())
    const fs = await fetch('fs.glsl').then(res => res.text())
    const sphere_dat = await fetch('sphere.json').then(res => res.json())
    console.log(`Sphere data: ${sphere_dat['attributes'][0]}`)
    updateSphereBuffers(gl, sphere_dat)

    // Add 50 random sphere
    resetSpheres()

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