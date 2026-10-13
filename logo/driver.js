

import { m4trans, m4rotZ, m4scale, m4mul } from "./math.js"
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
    static raw_I_indices = [
        0, 1, 2,
        2, 3, 0,

        4, 5, 6,
        6, 7, 4,

        8, 9, 10,
        10, 11, 8
    ]
}
function get_I_dims() {
    return [7, 12]
}



/**
 * Fetches, reads, and compiles GLSL; sets two global variables; and begins
 * the animation
 */
async function setup() {
    window.gl = document.querySelector('canvas').getContext('webgl2')
    const vs = await fetch('vert.glsl').then(res => res.text())
    const fs = await fetch('frag.glsl').then(res => res.text())
    window.program = compile(vs,fs)
    tick(0) // <- ensure this function is called only once, at the end of setup
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

    // Static Geometry

    const positions = Consts.raw_I_verts;
    const indices = Consts.raw_I_indices;
    const positionBuffer = gl.createBuffer();
    const positionLoc = 0;
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
    
    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Int16Array(indices), gl.STATIC_DRAW);
    
    gl.enableVertexAttribArray(positionLoc)
    // Tell the attribute how to get data out of positionBuffer (ARRAY_BUFFER)
    var size = 2;          // 2 components per iteration
    var type = gl.FLOAT;   // the data is 32bit floats
    var normalize = false; // don't normalize the data
    var stride = 0;        // 0 = just tightly packed around this one attribute 
    var buffer_offset = 0;        // start at the beginning of the buffer
    gl.vertexAttribPointer(
        positionLoc, size, type, normalize, stride, buffer_offset)

    
    // Develop (static) transform from easy-to-define coords to [-1, 1] intent
    const [width, height] = get_I_dims() // scale to maintain aspect ratio but so that all dimensions fit within [-1, 1]
    const max_dim = Math.max(width, height)
    const extent = 0.3;
    const vp_scale = m4scale(2*extent/max_dim, 2*extent/max_dim, 1)
    Consts.input_transform = vp_scale
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

    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.useProgram(program)
    gl.uniform1f(program.uniforms.seconds, seconds)
    gl.uniform1i(program.uniforms.count, count)


    
    // Dynamic transformations generated each frame
    var rot = m4rotZ(seconds*5)
    var pos_delta = [0.2, 0.2]
    var position = m4trans(Math.cos(seconds*3)*pos_delta[0], Math.sin(seconds*2 - 0.1)*pos_delta[1], 0)
    var scale_factor = (Math.sin(seconds*2)**2)*0.6+1;
    var scale = m4scale(scale_factor, scale_factor, 1)

    var aspect_ratio = (gl.canvas.height) / (gl.canvas.width);
    var proj = m4mul(m4scale(aspect_ratio, 1, 1), m4mul(position, m4mul(rot, m4mul(position, m4mul(scale, Consts.input_transform)))))
    gl.uniformMatrix4fv(program.uniforms.proj, false, proj)


    const connection = gl.TRIANGLES
    const length = Consts.raw_I_indices.length
    const type = gl.UNSIGNED_SHORT
    const offset = 0
    gl.drawElements(connection, length, type, offset);
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

// File-level start
window.addEventListener('load', setup)
