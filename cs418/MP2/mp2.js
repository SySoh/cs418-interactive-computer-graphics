/***

 Based on the sample code provided by the lecture and discussion session.
 I have implemented the Diamond square algorithm based on the idea from
 http://www.learnopengles.com/android-lesson-eight-an-introduction-to-index-buffer-objects-ibos,
 http://www.playfuljs.com/realistic-terrain-in-130-lines,
 and terrainModeling.js from lecture website.

 For lightning part, I have implemented the Phong lightning model with the help
 of lecture slide and http://learnopengl.com/#!Lighting/Basic-Lighting.

 ***/

var gl;
var canvas;
var shaderProgram;
var vertexShader;
var fragmentShader;
var mvStack = [];

// Create a place to store terrain geometry
var tVertexPositionBuffer;
//Create a place to store normals for shading
var tVertexNormalBuffer;
// Create a place to store the terrain triangles
var tIndexTriBuffer;
// create a place for color
var vertexColorBuffer;

// View parameters(from lecture sample)
var eyePt = vec3.fromValues(100.0, 300.0, 0.0);
var viewDir = vec3.fromValues(0.0, 0.0, 1.0);
var up = vec3.fromValues(0.0, -1.0, 0.0);
var viewPt = vec3.create();

// Quaternion variables for camera tracking, roll and pitch rotation
var quat_camera = quat.create();
var quat_roll = quat.create();
var quat_pitch = quat.create();

// Vector variables for roll and pitch axis
var vec_roll_axis = vec3.fromValues(0.0, 0.0, 1.0);
var vec_pitch_axis = vec3.fromValues(-1.0, 0.0, 0.0);

// Temporary view vector to store the rotated view vector from rotation and movement
var tmp_view = vec3.create();


// keyboard event flag. they will be used in animate()
var row_left = false;
var row_right = false;
var pitch_up = false;
var pitch_down = false;


// Create the normal
var nMatrix = mat3.create();
// Create ModelView matrix
var mvMatrix = mat4.create();
// Create Projection matrix
var pMatrix = mat4.create();


// Light source location
var lightPosEye4 = vec4.fromValues(0.0, -200.0, 0.0, 1.0);
// for animation timing
var lastTime = 0;

/**
 * This function provides mvMatrix stack pop.
 */
function popMatrix() {
    if (mvStack.length) {
        mvMatrix = mvStack.pop();
    }
    else {
        //something is wrong here
        console.log('mvStack is empty; pop failed.');
    }
}

/**
 * This function provides mvMatrix stack push.
 */
function pushMatrix() {
    mvStack.push(mat4.clone(mvMatrix));
}

/**
 *  This function will upload required matrix to webgl rendering engine.
 *  Based on sample code on lecture website.
 */
function setMatrixUniforms() {
    //upload mvMatrix to shader
    gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);

    //upload pMatrix to shader
    gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, false, pMatrix);

    //upload nMatrix to shader
    mat3.fromMat4(nMatrix, mvMatrix);
    mat3.transpose(nMatrix, nMatrix);
    mat3.invert(nMatrix, nMatrix);
    gl.uniformMatrix3fv(shaderProgram.nMatrixUniform, false, nMatrix);
}

/**
 * Convert degree value to radian. This code is from lecture sample.
 *
 * @param {number} degrees A degree value to be converted to radian
 * @return {number} a degree value in radian
 */
function degToRad(degrees) {
    return degrees * Math.PI / 180;
}

/**
 * Initialized webgl context by verifying whether WebGL rendering is supported or not.
 * This code is from lecture sample.
 *
 * @param {gl.canvas} canvas A canvas object from web browser
 * @return {gl} context A webgl context
 */
function createGLContext(canvas) {
    var names = ["webgl", "experimental-webgl"];
    var context = null;
    for (var i = 0; i < names.length; i++) {
        try {
            context = canvas.getContext(names[i]);
        } catch (e) {
        }
        if (context) {
            break;
        }
    }
    if (context) {
        context.viewportWidth = canvas.width;
        context.viewportHeight = canvas.height;
    } else {
        alert("Failed to create WebGL context!");
    }
    return context;
}

/**
 * Load shader data from the provided id using DOM. This code is from lecture sample.
 *
 * @param {String} id An id of target object
 * @return shader The shader data
 */
function loadShaderFromDOM(id) {
    var shaderScript = document.getElementById(id);

    // If we don't find an element with the specified id
    // we do an early exit
    if (!shaderScript) {
        return null;
    }

    // Loop through the children for the found DOM element and
    // build up the shader source code as a string
    var shaderSource = "";
    var currentChild = shaderScript.firstChild;
    while (currentChild) {
        if (currentChild.nodeType === 3) { // 3 corresponds to TEXT_NODE
            shaderSource += currentChild.textContent;
        }
        currentChild = currentChild.nextSibling;
    }

    var shader;
    if (shaderScript.type === "x-shader/x-fragment") {
        shader = gl.createShader(gl.FRAGMENT_SHADER);
    } else if (shaderScript.type === "x-shader/x-vertex") {
        shader = gl.createShader(gl.VERTEX_SHADER);
    } else {
        return null;
    }

    gl.shaderSource(shader, shaderSource);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        alert(gl.getShaderInfoLog(shader));
        return null;
    }
    return shader;
}

/**
 * Initialized the vertex and fragment shader attributes from shader script.
 * Based on the lecture sample and previous MP code.
 */
function setupShaders() {
    vertexShader = loadShaderFromDOM("shader-vs");
    fragmentShader = loadShaderFromDOM("shader-fs");

    shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        alert("Failed to setup shaders");
    }

    gl.useProgram(shaderProgram);

    shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
    gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);

    // Attach normal for lighting calculation
    shaderProgram.vertexNormalAttribute = gl.getAttribLocation(shaderProgram, "aVertexNormal");
    gl.enableVertexAttribArray(shaderProgram.vertexNormalAttribute);

    shaderProgram.vertexColorAttribute = gl.getAttribLocation(shaderProgram, "aVertexColor");
    gl.enableVertexAttribArray(shaderProgram.vertexColorAttribute);

    shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
    shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
    shaderProgram.nMatrixUniform = gl.getUniformLocation(shaderProgram, "uNMatrix");

    // Attach lightning related variables
    shaderProgram.uniformLightPositionLoc = gl.getUniformLocation(shaderProgram, "uLightPosition");
    shaderProgram.uniformAmbientLightColorLoc = gl.getUniformLocation(shaderProgram, "uAmbientLightColor");
    shaderProgram.uniformDiffuseLightColorLoc = gl.getUniformLocation(shaderProgram, "uDiffuseLightColor");
    shaderProgram.uniformSpecularLightColorLoc = gl.getUniformLocation(shaderProgram, "uSpecularLightColor");


}

/**
 *  Generate sample terrain from Diamond-square algorithm and attach necessary buffers to webgl engine.
 *  Based on lecture sample code.
 */
function setupBuffers() {
    // create terrain from Diamond-Square algorithm

    var vTerrain = [];
    var fTerrain = [];
    var nTerrain = [];
    var colors = [];
    var gridN = 255;

    var numT = generate_terrain(gridN, -1000, 1000, -1000, 1000, vTerrain, fTerrain, nTerrain, colors);
    // console.log(fTerrain.length);
    // console.log(colors.length);
    // console.log("Generated ", numT, " triangles");
    tVertexPositionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, tVertexPositionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vTerrain), gl.STATIC_DRAW);
    tVertexPositionBuffer.itemSize = 3;
    tVertexPositionBuffer.numItems = (gridN + 1) * (gridN + 1);

    // Specify normals to be able to do lighting calculations
    tVertexNormalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, tVertexNormalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(nTerrain),
        gl.STATIC_DRAW);
    tVertexNormalBuffer.itemSize = 3;
    tVertexNormalBuffer.numItems = (gridN + 1) * (gridN + 1);


    // Attach color buffer
    vertexColorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexColorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
    vertexColorBuffer.itemSize = 4;
    vertexColorBuffer.numItems = (gridN + 1) * (gridN + 1);

    // Specify faces of the terrain
    tIndexTriBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, tIndexTriBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(fTerrain),
        gl.STATIC_DRAW);
    tIndexTriBuffer.itemSize = 1;
    tIndexTriBuffer.numItems = numT * 3;

}
/**
 * Upload lightning related data to webgl engine. This code is identical to lecture sample code.
 *
 * @param {vec3} loc Vector of light source location
 * @param {vec3} a Vector of ambient lightning color
 * @param {vec3} d Vector of diffuse lightning color
 * @param {vec3} s Vector of specular lightning color
 */
function uploadLightsToShader(loc, a, d, s) {
    gl.uniform3fv(shaderProgram.uniformLightPositionLoc, loc);
    gl.uniform3fv(shaderProgram.uniformAmbientLightColorLoc, a);
    gl.uniform3fv(shaderProgram.uniformDiffuseLightColorLoc, d);
    gl.uniform3fv(shaderProgram.uniformSpecularLightColorLoc, s);
}

/**
 *  this function commands the webgl rendering engine to draw the image based on the provided
 vertex and fragment shader that were provided in the buffer.
 */
function draw() {

    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // We'll use perspective
    mat4.perspective(pMatrix, degToRad(45), gl.viewportWidth / gl.viewportHeight, 0.1, 1000.0);

    var tmp_up = vec3.create();

    // Perform quaternion rotation on up vector
    vec3.transformQuat(tmp_up, up, quat_camera);

    // Perform quaternion rotation on view vector
    vec3.transformQuat(tmp_view, viewDir, quat_camera);

    // Create a new lookat point from quaternion-rotated parameters
    vec3.add(viewPt, eyePt, tmp_view);

    // Generate lookat matrix from new parameters
    mat4.lookAt(mvMatrix, eyePt, viewPt, tmp_up);

    // Preserve mvMatrix for next iteration
    pushMatrix();

    setMatrixUniforms();

    // Set up light parameters
    var Ia = vec3.fromValues(1, 1, 1);
    var Id = vec3.fromValues(1, 1, 1);
    var Is = vec3.fromValues(1, 1, 1);

    // Move light location with the rotation
    var tmp_vec_light = vec3.create();
    tmp_vec_light = vec4.transformMat4(tmp_vec_light, lightPosEye4, mvMatrix);
    // console.log(vec4.str(lightPosEye4));
    var lightPosEye = vec3.fromValues(tmp_vec_light[0], tmp_vec_light[1], tmp_vec_light[2]);
    //vec3.transformMat4(lightPosEye, lightPosEye, mvMatrix);
    uploadLightsToShader(lightPosEye, Ia, Id, Is);

    // Draw terrain
    gl.polygonOffset(0, 0);
    // Bind vertex buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, tVertexPositionBuffer);
    gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, tVertexPositionBuffer.itemSize,
        gl.FLOAT, false, 0, 0);

    // Bind normal buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, tVertexNormalBuffer);
    gl.vertexAttribPointer(shaderProgram.vertexNormalAttribute,
        tVertexNormalBuffer.itemSize,
        gl.FLOAT, false, 0, 0);

    // Bind color buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexColorBuffer);
    gl.vertexAttribPointer(shaderProgram.vertexColorAttribute, vertexColorBuffer.itemSize,
        gl.FLOAT, false, 0, 0);

    // Draw
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, tIndexTriBuffer);
    gl.drawElements(gl.TRIANGLES, tIndexTriBuffer.numItems, gl.UNSIGNED_SHORT, 0);

    popMatrix();
}

/**
 *   Perform the rotation and moving of camera on every frames. It will calculate
 *   calculate the elapsed time and perform the action based on flags.
 * */
function animate() {
    var timeNow = new Date().getTime();
    var elapsed = 0;
    if (lastTime !== 0) {
        elapsed = timeNow - lastTime;
    }
    lastTime = timeNow;

    // If pitch down button is pressing, then we perform the pitch down action
    if (pitch_down) {
        // First set the pitch quaternion a new axis based on stored pitch axis and rotation amount
        quat.setAxisAngle(quat_pitch, vec_pitch_axis, degToRad(120.0 * (elapsed / 1000)));
        // Calculate new camera quaternion
        quat.mul(quat_camera, quat_camera, quat_pitch);
    }
    if (pitch_up) {
        quat.setAxisAngle(quat_pitch, vec_pitch_axis, -degToRad(120.0 * (elapsed / 1000)));
        quat.mul(quat_camera, quat_camera, quat_pitch);
    }
    if (row_left) {
        quat.setAxisAngle(quat_roll, vec_roll_axis, -degToRad(120.0 * (elapsed / 1000)));
        quat.mul(quat_camera, quat_camera, quat_roll);
    }
    if (row_right) {
        quat.setAxisAngle(quat_roll, vec_roll_axis, degToRad(120.0 * (elapsed / 1000)));
        quat.mul(quat_camera, quat_camera, quat_roll);
    }

    // move camera forward every tick
    vec3.scale(tmp_view, tmp_view, 50.0 * (elapsed / 1000));
    vec3.add(eyePt, eyePt, tmp_view);

}

/**
 *  the first function to be called when page loaded. It will load canvas element from web browser
 and initialized the required WebGL setup then called the tick function to draw and animate world.
 */
function startup() {

    // Set Canvas size to match innerbody size
    var jquery_canvas = $('#myGLCanvas');
    var jquery_body = $("#body");
    jquery_canvas.attr('width', jquery_body.innerWidth());
    jquery_canvas.attr('height', jquery_body.innerHeight() - 200);

    // Write instruction text
    jquery_body.append('\<em style="color:red">Up Arrow/W for pitch up<\/em><\/br>');
    jquery_body.append('\<em style="color:red">Down Arrow/S for pitch down<\/em><\/br>');
    jquery_body.append('\<em style="color:red">Left Arrow/A for roll left<\/em><\/br>');
    jquery_body.append('\<em style="color:red">Right Arrow/D for roll right<\/em><\/br>');

    canvas = document.getElementById("myGLCanvas");
    gl = createGLContext(canvas);
    setupShaders();
    setupBuffers();
    gl.clearColor(0.0, 0.0, 0.0, 1.0); //set background color to opaque black
    gl.enable(gl.DEPTH_TEST);

    //add keyboard event handler
    $(function () {
        $(document).keydown(function (event) {
            event.preventDefault();
            if (event.which === 37 || event.which === 65) { //left_arrow or 'A'
                row_left = true;
            }
            else if (event.which === 38 || event.which === 87) { //up_arrow or 'W'
                pitch_up = true;
            }
            else if (event.which === 39 || event.which === 68) { // right_arrow or 'D'
                row_right = true;
            }
            else if (event.which === 40 || event.which === 83) { // down_arrow or 'S'
                pitch_down = true;
            }
            else if (event.which === 116) { // F5 button
                window.location.reload();
            }
        });

        $(document).keyup(function (event) {
            event.preventDefault();
            if (event.which === 37 || event.which === 65) { //left_arrow or 'A'
                row_left = false;
            }
            else if (event.which === 38 || event.which === 87) { //up_arrow or 'W'
                pitch_up = false;
            }
            else if (event.which === 39 || event.which === 68) { // right_arrow or 'D'
                row_right = false;
            }
            else if (event.which === 40 || event.which === 83) { // down_arrow or 'S'
                pitch_down = false;
            }
        });

    });

    tick();
}

/**
 *  helper function which was provided from external library. It provided each frame information
 before the rendering engine draw the image. So, we can modify the shader information before
 rendering each frame.
 */
function tick() {
    requestAnimFrame(tick);
    draw();
    animate();
}
