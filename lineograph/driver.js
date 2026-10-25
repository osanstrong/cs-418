

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
/**
 * Assembles a set of vertices for the I, and an index buffer
 */
class Consts{
    static raw_I_verts = [
        0, 0,
        7, 0,
        7, 2,
        0, 2,

        2, 2,
        5, 2,
        5, 10,
        2, 10,

        0, 10,
        7, 10,
        7, 12,
        0, 12
    ]
    static raw_I_brokenverts = [
        0, 10,
        7, 0,
        7, 2,
        0, 2,

        2, 2,
        5, 2,
        5, 10,
        2, 10,

        0, 10,
        7, 10,
        7, 12,
        0, 12
    ]
    static raw_I_indices = [
        0, 1, 2,
        2, 3, 0,

        4, 5, 6,
        6, 7, 4,

        8, 9, 10,
        10, 11, 8
    ]
}
function make_I() {
    const raw_I = Consts.raw_I_verts;
    const indices = Consts.raw_I_indices;
    return [raw_I, indices]
}

function get_I_dims() {
    return [7, 12]
}
class Buffers{
    static shape_attrib = null;
    static shape_idx = null
    static tet_offset = 0
    static tet_length = 3*4 // 4 vertices, 3 indices per vertex
    static oct_offset = Buffers.tet_length;
    static oct_length = 3*8

    static load_buffers(gl) {
        Buffers.shape_attrib = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, Buffers.shape_attrib)
        gl.bufferData(gl.ARRAY_BUFFER, 
        Buffers.float_stitch(Shape.attrib_order),
        gl.STATIC_DRAW)
        Buffers.shape_idx = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, Buffers.shape_idx)
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, 
        Buffers.int_stitch([Shape.tri_indices]),
        gl.STATIC_DRAW)
    }
    // Assumes all lists have same number of points, and within a list all points have same number of data
    static float_stitch(lists) {
        var final_array = []
        const num_verts = lists[0].length
        for (let i = 0; i < num_verts; i++) {
            for (const list of lists) {
                final_array.push(...list[i])
            }
        }
        return new Float32Array(final_array);
    }
    static concat_floats(lists) {
        var final_array = []
        for (const list of lists) {
            final_array.push(...list)
        }
        return new Float32Array(final_array);
    }
    static int_stitch(lists) {
        var final_array = []
        const num_verts = lists[0].length
        for (let i = 0; i < num_verts; i++) {
            for (const list of lists) {
                final_array.push(...list[i])
            }
        }
        return new Int16Array(final_array);
    }
    static concat_ints(lists) {
        var final_array = []
        for (const list of lists) {
            final_array.push(...list)
        }
        return new Int16Array(final_array);
    }
}
class Tet{
    static positions = [[1,1,1], [-1,-1,1], [-1,1,-1], [1,-1,-1]]
    static colors = [[1,1,1], [0,0,1], [0,1,0], [1,0,0]]
    static tri_indices = [[0,1,2], [0,2,3], [0,3,1], [1,2,3]]
    static attrib_order = [Tet.positions, Tet.colors]
}
class Oct{
    static positions = [[1,0,0],[0,1,0],[0,0,1],[0,-1,0],[0,0,-1],[-1,0,0]]
    static colors = [[1,0.5,0.5],[0.5,1,0.5],[0.5,0.5,1],[0.5,0,0.5],[0.5,0.5,0],[0,0.5,0.5]]
    static tri_indices = [[0,1,2], [0,2,3], [0,3,4], [0,4,1], [5,1,4], [5,4,3], [5,3,2], [5,2,1]]
    static attrib_order = [Oct.positions, Oct.colors]
}
class Shape{
    static positions = [...Tet.positions, ...Oct.positions]
    static colors = [...Tet.colors, ...Oct.colors]
    static tri_indices = [...Tet.tri_indices, ...Shape.shift(Oct.tri_indices, 4)]
    static attrib_order = [Shape.positions, Shape.colors]
                            
    static shift(verts, offset) {
        var new_verts = []
        for (const vert of verts) {
            var new_vert = vert
            for (let i = 0; i < 3; i++) {
                new_vert[i] = vert[i] + offset;
            } 
            new_verts.push(new_vert)
        }
        return new_verts
    }
    static attrib_order = [Shape.positions, Shape.colors]
}


class Data {
    static move_speed = 0.4


    static x_offset = 0
    static y_offset = 0
    static z_offset = 0

    static last_frame_seconds = 0;
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
    }
    
    const uniforms = {}
    for(let i=0; i<gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS); i+=1) {
        let info = gl.getActiveUniform(program, i)
        uniforms[info.name] = gl.getUniformLocation(program, info.name)
    }
    program.uniforms = uniforms



    // Generate static parts of the geometry
    
    Buffers.load_buffers(gl);

    const float_size = 4;
    const vert_size = 6*float_size;
    const positionLoc = 0;
    gl.enableVertexAttribArray(positionLoc)
    // Tell the attribute how to get data out of positionBuffer (ARRAY_BUFFER)
    var size = 3;          // 2 components per iteration
    var type = gl.FLOAT;   // the data is 32bit floats
    var normalize = false; // don't normalize the data
    var stride = vert_size;        // go this many bytes;     0 = move forward size * sizeof(type) each iteration to get the next position
    var buffer_offset = 0;        // start at the beginning of the buffer
    gl.vertexAttribPointer(
        positionLoc, size, type, normalize, stride, buffer_offset)
    const colorLoc = 1;
    gl.enableVertexAttribArray(colorLoc)
    // Tell the attribute how to get data out of positionBuffer (ARRAY_BUFFER)
    var size = 3;          // 1 component per iteration
    // var type = gl.FLOAT;   // the data is 32bit floats
    // var normalize = false; // don't normalize the data
    var stride = vert_size;        // go this many bytes; 0 = move forward size * sizeof(type) each iteration to get the next position
    var buffer_offset = 3*float_size;        // start 1*4 from the beginning of the buffer
    gl.vertexAttribPointer(
        colorLoc, size, type, normalize, stride, buffer_offset)

    return program
}


/**
 * Clears the screen, sends two uniforms to the GPU, and asks the GPU to draw
 * several points. Note that no geometry is provided; the point locations are
 * computed based on the uniforms in the vertex shader.
 *
 * @param {Number} seconds - the number of seconds since the animation began
 */
function draw(seconds) {
    const count = 6+(seconds*100)%500          // number of vertices to draw

    // gl.clear(gl.COLOR_BUFFER_BIT)
    gl.useProgram(program)
    gl.uniform1f(program.uniforms.seconds, seconds)
    gl.uniform1i(program.uniforms.count, count)


    const TET = 0;
    const OCT = 1;

    var items = []
    var mats = []

    const pi = 3.141592653589 // sorry i remember it faster than remembering a library
    
    
    // Reused code from orbits: The position and rotation that Earth had, frozen at a specific point in time, to which we apply a translation afterwards
    const frozen_time = 10;
    const earth_size = 0.04
    const earth_scale = m4uscale(earth_size)
    const earth_orbdist = 0.25
    const earth_orbrate = 2*pi / 3.5 // Once every "few" seconds
    const earth_rotrate = 2*pi * 2 -  earth_orbrate// "Several" times a second, more than 2 feels wayy too fast
    const earth_rot = m4rotY(earth_rotrate*frozen_time)
    const earth_orbit = m4rotY(frozen_time*earth_orbrate)
    const earth_pos = m3mul(m3rotY(frozen_time*earth_orbrate), new Float32Array([earth_orbdist, 0, 0])) // Separate position from full rotation bc we want axis tilt independent of plane orbit
    const earth_tiltdeg = 23.5
    const earth_axtilt = m4rotX(earth_tiltdeg * (pi/180)) // No axis tilt this time, actually, kinda trippy
    var earth_mat = m4listmul([m4trans(...earth_pos), earth_orbit, earth_rot, earth_scale])
    

    //// NOTE: NEW CODE BELOW ////
    const dt = seconds-Data.last_frame_seconds
    if (keysBeingPressed['q']) Data.z_offset -= Data.move_speed*dt
    if (keysBeingPressed['e']) Data.z_offset += Data.move_speed*dt
    if (keysBeingPressed['a']) Data.x_offset -= Data.move_speed*dt
    if (keysBeingPressed['d']) Data.x_offset += Data.move_speed*dt
    if (keysBeingPressed['s']) Data.y_offset -= Data.move_speed*dt
    if (keysBeingPressed['w']) Data.y_offset += Data.move_speed*dt

    // Apply translation at end
    earth_mat = m4mul(m4trans(Data.x_offset, Data.y_offset, Data.z_offset), earth_mat)


    //// NOTE: NEW CODE ABOVE ////

    items.push(OCT)
    mats.push(earth_mat)

    const scene_scale = 0.8 // option to rescale whole scene at end
    const cam_z = 0.5;
    var proj = m4mul(m4trans(0, -0.1, -cam_z), m4uscale(scene_scale)) //Move this sucker away from the camera; as a stopgap rn instead of actually having a full camera position simulation
    proj = m4mul(m4rotX(0.1*pi), proj)
    proj = m4mul(p, proj) //Apply projection at the end of all transformation

    const connection = gl.TRIANGLES
    const idx_type = gl.UNSIGNED_SHORT

    const tet_length = Tet.tri_indices.length*3
    const oct_length = Oct.tri_indices.length*3
    gl.bindBuffer(gl.ARRAY_BUFFER, Buffers.shape_attrib)
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, Buffers.shape_idx)
    for (let i = 0; i < items.length; i++) {
        const item_type = items[i]
        const item_mat = mats[i]
        var length = 0
        var offset = 0
        
        if (item_type == TET ) {
            length = tet_length
            offset = Buffers.tet_offset
        } else {
            length = oct_length   
            offset = Buffers.oct_offset
        }

        gl.uniformMatrix4fv(program.uniforms.proj, false, m4mul(proj, item_mat))
        gl.drawElements(connection, length, idx_type, offset*2);
    }

    Data.last_frame_seconds = seconds
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

/** Resizes the canvas to completely fill the screen; taken from view-source:https://cs418.cs.illinois.edu/website/code/3d-webgl/7-starburst.html 
 * Reusing the same camera perspective for now because got distracted with setup and took too much time
*/
function fillScreen() {
    let canvas = document.querySelector('canvas')
    document.body.style.margin = '0'
    canvas.style.width = '100vw'
    canvas.style.height = '100vh'
    canvas.width = canvas.clientWidth
    canvas.height = canvas.clientHeight
    canvas.style.width = ''
    canvas.style.height = ''
    if (window.gl) {
        gl.viewport(0,0, canvas.width, canvas.height)
        // Same perspective camera as starburst, orbits doens't need much   
        window.p = m4perspNegZ(0.1, 10, 1.5, canvas.width, canvas.height)
    }
    console.log("resizing!")
}


/**
 * Fetches, reads, and compiles GLSL; sets two global variables; and begins
 * the animation
 */
async function setup() {
    window.keysBeingPressed = {}
    window.addEventListener('keydown', event => keysBeingPressed[event.key] = true)
    window.addEventListener('keyup', event => keysBeingPressed[event.key] = false)
    window.gl = document.querySelector('canvas').getContext('webgl2', {preserveDrawingBuffer:true})
    gl.enable(gl.DEPTH_TEST)
    const vs = await fetch('vert.glsl').then(res => res.text())
    const fs = await fetch('frag.glsl').then(res => res.text())
    window.program = compile(vs,fs)
    window.addEventListener('resize', fillScreen)
    fillScreen()
    gl.clear(gl.COLOR_BUFFER_BIT)
    tick(0) // <- ensure this function is called only once, at the end of setup\

}


// File-level start
window.addEventListener('load', setup)