/**
 * Based on the MP2 code and sample provided by the lecture and discussion session.
 I have implemented the Environment mapping based on the idea from
 1) http://math.hws.edu/graphicsbook/c7/s3.html
 2) https://webglfactory.blogspot.com/2011/05/adding-textures.html
 3) http://webglfundamentals.org/webgl/lessons/webgl-3d-textures.html

 For OBJ loading, I have follow the format explanation in
 1) http://www.martinreddy.net/gfx/3d/OBJ.spec
 */

var gl;
var canvas;

// separate shader program for skybox and teapot
var shaderProgramSkybox;
var shaderProgramTeapot;

// Counter to make sure that the drawing will occur
// after all textures are loaded
var imageLoadCounter = 0;

// Variables for Teapot
var teapotVertexBuffer;
var teapotFaceBuffer;
var teapotNormalBuffer;
var teapotVertex = [];
var teapotFace = [];
var teapotNormal = [];

// Variable for Sky Box
var skyboxVertexBuffer;
var skyboxFaceBuffer;
var skyBoxCubeMap;
var skyboxVertex = [];
var skyboxFace = [];

// Quaternion variables for camera
var quat_camera = quat.create();

// keyboard event flag. they will be used in animate()
var teapotRotLeft = false;
var teapotRotRight = false;
var teapotFlipUp = false;
var teapotFlipDown = false;

var worldRotLeft = false;
var worldRotRight = false;
var worldFlipUp = false;
var worldFlipDown = false;

// Create ModelView matrix
var mvMatrix = mat4.create();

//Create Projection matrix
var pMatrix = mat4.create();

// Create the Normal matrix
var nMatrix = mat3.create();

// This will store the inverse of mvMatrix that applied to skybox
var inverseViewTransform = mat3.create();

var mvMatrixStack = [];

// For animation
var lastTime = 0;
var teapotRotationValue = 0.0;
var teapotFlipValue = 0.0;
var worldRotationValue = 0.0;
var worldFlipValue = 0.0;

// View parameters(from lecture sample)
var eyePt = vec3.fromValues(0.0, 0.0, 0.0);
var viewDir = vec3.fromValues(0.0, 0.0, -1);
var up = vec3.fromValues(0.0, 1.0, 0.0);
var viewPt = vec3.create();

// fixed light source location
// var lightPosEye = vec4.fromValues(0.0, 0.0, 0.0, -5.0);
var lightPosEye = vec4.fromValues(0.25, 0.25, -4.0, 1.0);

// Set up light parameters
var Ia = vec3.fromValues(1, 1, 1);
var Id = vec3.fromValues(1, 1, 1);
var Is = vec3.fromValues(1, 1, 1);


/**
 * This function provides mvMatrix stack pop.
 */
function mvPopMatrix() {
    if (mvMatrixStack.length === 0) {
        throw "Invalid popMatrix!";
    }
    mvMatrix = mvMatrixStack.pop();
}

/**
 * This function provides mvMatrix stack push.
 */
function mvPushMatrix() {
    var copy = mat4.clone(mvMatrix);
    mvMatrixStack.push(copy);
}

/**
 *  This function will upload required matrix to the shaderprogram.
 *  Based on sample code on lecture website.
 *
 *  @Param {gl.ShaderProgram} the shader program to upload uniform maxtrix
 */
function setMatrixUniforms(shaderProgram) {
    uploadModelViewMatrixToShader(shaderProgram);
    uploadProjectionMatrixToShader(shaderProgram);
    uploadNormalMatrixToShader(shaderProgram);
    uploadLightsToShader(shaderProgram, vec3.fromValues(lightPosEye[0], lightPosEye[1], lightPosEye[2]), Ia, Id, Is);

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
 * Load shader data from the provided id using DOM and return the linked shader program.
 * Modified from base code form lecture sample.
 *
 * @param {String} vertexShaderID the string of vertex shader id
 * @param {String} fragmentShaderID the string of vertex shader id
 * @return {gl.shaderProgram} the shader program with requested vertex and fragment shader
 */
function setupShaders(vertexShaderID, fragmentShaderID) {
    var shaderProgram;
    var fragmentShader = loadShaderFromDOM(fragmentShaderID);
    var vertexShader = loadShaderFromDOM(vertexShaderID);

    shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        throw "Link error in program:  " + gl.getProgramInfoLog(shaderProgram);
    }

    shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
    // gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);

    // Attach normal for lighting calculation
    shaderProgram.vertexNormalAttribute = gl.getAttribLocation(shaderProgram, "aVertexNormal");
    // gl.enableVertexAttribArray(shaderProgram.vertexNormalAttribute);

    shaderProgram.vertexColorAttribute = gl.getAttribLocation(shaderProgram, "aVertexColor");
    // gl.enableVertexAttribArray(shaderProgram.vertexColorAttribute);

    shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
    shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
    shaderProgram.nMatrixUniform = gl.getUniformLocation(shaderProgram, "uNMatrix");

    // Attach lightning related variables
    shaderProgram.uniformLightPositionLoc = gl.getUniformLocation(shaderProgram, "uLightPosition");
    shaderProgram.uniformAmbientLightColorLoc = gl.getUniformLocation(shaderProgram, "uAmbientLightColor");
    shaderProgram.uniformDiffuseLightColorLoc = gl.getUniformLocation(shaderProgram, "uDiffuseLightColor");
    shaderProgram.uniformSpecularLightColorLoc = gl.getUniformLocation(shaderProgram, "uSpecularLightColor");

    shaderProgram.skyboxSampler = gl.getUniformLocation(shaderProgram, "uSkyboxSampler");
    shaderProgram.inverseViewTransform = gl.getUniformLocation(shaderProgram, "uInverseViewTransform");

    return shaderProgram;

}


/**
 * Setup the necessary buffer for Skybox drawing
 */
function setupSkyboxBuff() {

    // Both skyboxVertex and skyboxFace data are from HelloTexture.js on course website
    skyboxVertex = [
        // Front face
        -1.0, -1.0, 1.0,
        1.0, -1.0, 1.0,
        1.0, 1.0, 1.0,
        -1.0, 1.0, 1.0,

        // Back face
        -1.0, -1.0, -1.0,
        -1.0, 1.0, -1.0,
        1.0, 1.0, -1.0,
        1.0, -1.0, -1.0,

        // Top face
        -1.0, 1.0, -1.0,
        -1.0, 1.0, 1.0,
        1.0, 1.0, 1.0,
        1.0, 1.0, -1.0,

        // Bottom face
        -1.0, -1.0, -1.0,
        1.0, -1.0, -1.0,
        1.0, -1.0, 1.0,
        -1.0, -1.0, 1.0,

        // Right face
        1.0, -1.0, -1.0,
        1.0, 1.0, -1.0,
        1.0, 1.0, 1.0,
        1.0, -1.0, 1.0,

        // Left face
        -1.0, -1.0, -1.0,
        -1.0, -1.0, 1.0,
        -1.0, 1.0, 1.0,
        -1.0, 1.0, -1.0
    ];

    skyboxVertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, skyboxVertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(skyboxVertex), gl.STATIC_DRAW);

    skyboxFace = [
        0.0, 1.0, 2.0, 0.0, 2.0, 3.0,    // front
        4.0, 5.0, 6.0, 4.0, 6.0, 7.0,    // back
        8.0, 9.0, 10.0, 8.0, 10.0, 11.0,   // top
        12.0, 13.0, 14.0, 12.0, 14.0, 15.0,   // bottom
        16.0, 17.0, 18.0, 16.0, 18.0, 19.0,   // right
        20.0, 21.0, 22.0, 20.0, 22.0, 23.0    // left
    ];

    skyboxFaceBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, skyboxFaceBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(skyboxFace), gl.STATIC_DRAW);

}


/**
 * Setup the necessary buffer for Teapot drawing
 */
function setupTeapotBuff() {

    teapotVertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, teapotVertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(teapotVertex), gl.STATIC_DRAW);

    teapotFaceBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, teapotFaceBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(teapotFace), gl.STATIC_DRAW);

    teapotNormalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, teapotNormalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(teapotNormal), gl.STATIC_DRAW);


}


/**
 * Upload lightning related data to shader program.
 * This code is identical to lecture sample code.
 *
 * @param {gl.shaderProgram} shaderProgram the target shader program to upload light data
 * @param {vec3} loc Vector of light source location
 * @param {vec3} a Vector of ambient lightning color
 * @param {vec3} d Vector of diffuse lightning color
 * @param {vec3} s Vector of specular lightning color
 */
function uploadLightsToShader(shaderProgram, loc, a, d, s) {
    gl.uniform3fv(shaderProgram.uniformLightPositionLoc, loc);
    gl.uniform3fv(shaderProgram.uniformAmbientLightColorLoc, a);
    gl.uniform3fv(shaderProgram.uniformDiffuseLightColorLoc, d);
    gl.uniform3fv(shaderProgram.uniformSpecularLightColorLoc, s);
}

/**
 * Upload mvMatrix data to shader program.
 *
 * @param {gl.shaderProgram} shaderProgram the target shader program to upload light data
 */
function uploadModelViewMatrixToShader(shaderProgram) {
    gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
}

/**
 * Upload pMatrix data to shader program.
 *
 * @param {gl.shaderProgram} shaderProgram the target shader program to upload light data
 */
function uploadProjectionMatrixToShader(shaderProgram) {
    gl.uniformMatrix4fv(shaderProgram.pMatrixUniform,
        false, pMatrix);
}


/**
 * Upload inverseViewTransform matrix data to shader program.
 *
 * @param {gl.shaderProgram} shaderProgram the target shader program to upload light data
 */
function uploadinverseViewTransformMatrixToShader(shaderProgram) {
    gl.uniformMatrix3fv(shaderProgram.inverseViewTransform, false, inverseViewTransform);
}


/**
 * Upload nMatrix data to shader program.
 *
 * @param {gl.shaderProgram} shaderProgram the target shader program to upload light data
 */
function uploadNormalMatrixToShader(shaderProgram) {
    mat3.fromMat4(nMatrix, mvMatrix);
    mat3.transpose(nMatrix, nMatrix);
    mat3.invert(nMatrix, nMatrix);
    gl.uniformMatrix3fv(shaderProgram.nMatrixUniform, false, nMatrix);
}


/**
 *  this function commands the webgl rendering engine to draw the image based on the provided
 vertex and fragment shader that were provided in the buffer.
 */
function draw() {
    // var transformVec = vec3.create();

    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    var tmp_up = vec3.create();
    var tmp_view = vec3.create();


    // Perform quaternion rotation on up vector
    vec3.transformQuat(tmp_up, up, quat_camera);

    // Perform quaternion rotation on view vector
    vec3.transformQuat(tmp_view, viewDir, quat_camera);

    // Create a new lookat point from quaternion-rotated parameters
    vec3.add(viewPt, eyePt, tmp_view);

    // Generate lookat matrix from new parameters
    mat4.lookAt(mvMatrix, eyePt, viewPt, tmp_up);

    if (imageLoadCounter === 6) {

        //draw skybox
        gl.useProgram(shaderProgramSkybox);
        gl.depthMask(false);

        mvPushMatrix();
        gl.enableVertexAttribArray(shaderProgramSkybox.vertexPositionAttribute);
        drawSkybox();
        gl.disableVertexAttribArray(shaderProgramSkybox.vertexPositionAttribute);
        mat3.fromMat4(inverseViewTransform, mvMatrix);
        mvPopMatrix();


        //draw Teapot
        mat3.invert(inverseViewTransform, inverseViewTransform);
        mat3.normalFromMat4(nMatrix, mvMatrix);
        gl.useProgram(shaderProgramTeapot);
        uploadinverseViewTransformMatrixToShader(shaderProgramTeapot);
        gl.depthMask(true);
        gl.enableVertexAttribArray(shaderProgramTeapot.vertexPositionAttribute);
        gl.enableVertexAttribArray(shaderProgramTeapot.vertexNormalAttribute);
        mvPushMatrix();
        drawTeapot();
        mvPopMatrix();
        gl.disableVertexAttribArray(shaderProgramTeapot.vertexPositionAttribute);
        gl.disableVertexAttribArray(shaderProgramTeapot.vertexNormalAttribute);
    }
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

    //Animate the rotation
    if (worldRotLeft) {
        worldRotationValue += 100.0 * (elapsed / 1000);
    }
    if (worldRotRight) {
        worldRotationValue -= 100.0 * (elapsed / 1000);
    }
    if (teapotRotLeft) {
        teapotRotationValue += 100.0 * (elapsed / 1000);
    }
    if (teapotRotRight) {
        teapotRotationValue -= 100.0 * (elapsed / 1000);
    }

    if (worldFlipUp) {
        worldFlipValue += 100.0 * (elapsed / 1000);
    }
    if (worldFlipDown) {
        worldFlipValue -= 100.0 * (elapsed / 1000);
    }
    if (teapotFlipUp) {
        teapotFlipValue += 100.0 * (elapsed / 1000);
    }
    if (teapotFlipDown) {
        teapotFlipValue -= 100.0 * (elapsed / 1000);
    }

}


/**
 * This function will import and parse the teapot obj file into
 * vertex and faces array. It utilizes jquery library.
 */
function importTeapotData() {

    // force synchronized loading
    $.ajaxSetup({async: false});

    $.get('teapot_0.obj', function (data) {
        var textByLine = data.split("\n");

        $.each(textByLine, function (n, elem) {
            var tokens = elem.split(/\s+/); // split on whitespace
            if (tokens[0] === 'v') {
                teapotVertex.push(parseFloat(tokens[1]));
                teapotVertex.push(parseFloat(tokens[2]));
                teapotVertex.push(parseFloat(tokens[3]));
            }
            else if (tokens[0] === 'f') {
                teapotFace.push(parseInt(tokens[1]) - 1); //obj face format start on 1
                teapotFace.push(parseInt(tokens[2]) - 1);
                teapotFace.push(parseInt(tokens[3]) - 1);
            }

        });
    });
    $.ajaxSetup({async: true});
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
    jquery_canvas.attr('height', jquery_body.innerHeight() - 250);

    // Write instruction text
    jquery_body.append('\<p><em style="color:red">Up/W  for  teapot/World  flip  up<\/em><\/br><\/p>');
    jquery_body.append('\<p><em style="color:red">Down/S  for  teapot/World  flip  down<\/em><\/br><\/p>');
    jquery_body.append('\<p><em style="color:red">Left/A  for  teapot/World  roll  left<\/em><\/br><\/p>');
    jquery_body.append('\<p><em style="color:red">Right/D  for  teapot/World  roll  right<\/em><\/br><\/p>');

    importTeapotData();
    calculateNormalTeapot();

    canvas = document.getElementById("myGLCanvas");
    gl = createGLContext(canvas);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.enable(gl.DEPTH_TEST);

    shaderProgramSkybox = setupShaders("shader-vs-skybox", "shader-fs-skybox");
    shaderProgramTeapot = setupShaders("shader-vs-teapot", "shader-fs-teapot");

    gl.useProgram(shaderProgramSkybox);
    mat4.perspective(pMatrix, degToRad(45), gl.viewportWidth / gl.viewportHeight, 0.1, 100.0);
    setMatrixUniforms(shaderProgramSkybox);
    setupSkyBoxCubeMap();
    setupSkyboxBuff();

    gl.useProgram(shaderProgramTeapot);
    // mat4.perspective(pMatrix,degToRad(45), gl.viewportWidth / gl.viewportHeight, 0.1, 100.0);
    setMatrixUniforms(shaderProgramTeapot);
    setupTeapotBuff();
    setupKeyboardEvent();
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


function setupKeyboardEvent() {
    //add keyboard event handler
    $(function () {
        $(document).keydown(function (event) {
            event.preventDefault();
            if (event.which === 37) { //left_arrow
                teapotRotLeft = true;
            }
            if (event.which === 65) { //'A'
                worldRotLeft = true;
                teapotRotLeft = true;
            }
            if (event.which === 39) { // right_arrow
                teapotRotRight = true;
            }
            if (event.which === 68) {// 'D'
                worldRotRight = true;
                teapotRotRight = true;
            }
            if (event.which === 38) { //up_arrow
                teapotFlipUp = true;
            }
            if (event.which === 40) { //down_arrow
                teapotFlipDown = true;
            }
            if (event.which === 87) { //'W'
                worldFlipUp = true;
                teapotFlipUp = true;
            }
            if (event.which === 83) { //'S'
                worldFlipDown = true;
                teapotFlipDown = true;
            }
            if (event.which === 116) { // F5 button
                window.location.reload();
            }
        });

        $(document).keyup(function (event) {
            event.preventDefault();
            event.preventDefault();
            if (event.which === 37) { //left_arrow
                teapotRotLeft = false;
            }
            if (event.which === 65) { //'A'
                worldRotLeft = false;
                teapotRotLeft = false;
            }
            if (event.which === 39) { // right_arrow
                teapotRotRight = false;
            }
            if (event.which === 68) {// 'D'
                worldRotRight = false;
                teapotRotRight = false;
            }
            if (event.which === 38) { //up_arrow
                teapotFlipUp = false;
            }
            if (event.which === 40) { //down_arrow
                teapotFlipDown = false;
            }
            if (event.which === 87) { //'W'
                worldFlipUp = false;
                teapotFlipUp = false;
            }
            if (event.which === 83) { //'S'
                worldFlipDown = false;
                teapotFlipDown = false;
            }
        });

    });
}


/**
 * This function will calculate the per-vertex normal of the teapot model.
 * Follow the basic idea from
 * https://stackoverflow.com/questions/6656358/calculating-normals-in-a-triangle-mesh/6661242#6661242
 *
 */
function calculateNormalTeapot() {

    var tmpFace = [];
    var tmpFaceNormal = [];
    var tmpVertexNormal = [];
    var realVertexNormal = [];

    // Prepare array
    for (i = 0; i < teapotVertex.length; i++) {
        tmpVertexNormal.push(0.0);
    }

    // First we will calculate the per-face normal as in mp2
    for (i = 0; i < teapotFace.length; i += 3) {

        var tmpX = teapotVertex[(teapotFace[i] * 3)];
        var tmpY = teapotVertex[(teapotFace[i] * 3) + 1];
        var tmpZ = teapotVertex[(teapotFace[i] * 3) + 2];
        var v1 = vec3.fromValues(tmpX, tmpY, tmpZ);

        tmpX = teapotVertex[(teapotFace[i + 1] * 3)];
        tmpY = teapotVertex[(teapotFace[i + 1] * 3) + 1];
        tmpZ = teapotVertex[(teapotFace[i + 1] * 3) + 2];
        var v2 = vec3.fromValues(tmpX, tmpY, tmpZ);

        tmpX = teapotVertex[(teapotFace[i + 2] * 3)];
        tmpY = teapotVertex[(teapotFace[i + 2] * 3) + 1];
        tmpZ = teapotVertex[(teapotFace[i + 2] * 3) + 2];
        var v3 = vec3.fromValues(tmpX, tmpY, tmpZ);

        // store this face
        tmpFace.push([(teapotFace[i] * 3), (teapotFace[i + 1] * 3), (teapotFace[i + 2] * 3)]);

        // Then calculate per-face normal (v2-v1)X(v3-v1)
        var tmpVec1 = vec3.create();
        var tmpVec2 = vec3.create();
        var tmpVec3 = vec3.create();

        vec3.subtract(tmpVec1, v2, v1);
        vec3.subtract(tmpVec2, v3, v1);
        vec3.cross(tmpVec3, tmpVec1, tmpVec2);
        vec3.normalize(tmpVec2, tmpVec3);
        tmpFaceNormal.push(tmpVec2);
    }


    // per-vertex normal = normalized of sum of adjacent per-face normal
    for (i = 0; i < tmpFace.length; i++) {
        for (var q = 0; q < 3; q++) {
            tmpVertexNormal[tmpFace[i][q]] += tmpFaceNormal[i][0];
            tmpVertexNormal[tmpFace[i][q] + 1] += tmpFaceNormal[i][1];
            tmpVertexNormal[tmpFace[i][q] + 2] += tmpFaceNormal[i][2];
        }

    }

    // Then normalized them
    for (i = 0; i < tmpVertexNormal.length; i += 3) {

        tmpVec1 = vec3.fromValues(tmpVertexNormal[i], tmpVertexNormal[i + 1], tmpVertexNormal[i + 2]);
        vec3.normalize(tmpVec2, tmpVec1);
        realVertexNormal.push(tmpVec2[0]);
        realVertexNormal.push(tmpVec2[1]);
        realVertexNormal.push(tmpVec2[2]);
    }

    teapotNormal = realVertexNormal;
}


/**
 * This function will setup the texture of skybox. It will also count the number of image
 * loaded to prevent pre-rendering of skybox.
 */
function setupSkyBoxCubeMap() {

    var images = [new Image(), new Image(), new Image(), new Image(), new Image(), new Image()];

    // Start loading image of each side
    images[0].onload = function () {
        console.log('Loaded image number: ' + imageLoadCounter);
        imageLoadCounter += 1;
        skyBoxCubeMap = handleTextureLoadedForSkyBox(
            images,
            skyBoxCubeMap,
            imageLoadCounter
        );

    };
    images[0].src = 'img/positive_x.jpg';

    images[1].onload = function () {
        console.log('Loaded image number: ' + imageLoadCounter);
        imageLoadCounter += 1;
        skyBoxCubeMap = handleTextureLoadedForSkyBox(
            images,
            skyBoxCubeMap,
            imageLoadCounter
        );

    };
    images[1].src = 'img/positive_y.jpg';

    images[2].onload = function () {
        console.log('Loaded image number: ' + imageLoadCounter);
        imageLoadCounter += 1;
        skyBoxCubeMap = handleTextureLoadedForSkyBox(
            images,
            skyBoxCubeMap,
            imageLoadCounter
        );

    };
    images[2].src = 'img/positive_z.jpg';

    images[3].onload = function () {
        console.log('Loaded image number: ' + imageLoadCounter);
        imageLoadCounter += 1;
        skyBoxCubeMap = handleTextureLoadedForSkyBox(
            images,
            skyBoxCubeMap,
            imageLoadCounter
        );

    };
    images[3].src = 'img/negative_x.jpg';

    images[4].onload = function () {
        console.log('Loaded image number: ' + imageLoadCounter);
        imageLoadCounter += 1;
        skyBoxCubeMap = handleTextureLoadedForSkyBox(
            images,
            skyBoxCubeMap,
            imageLoadCounter
        );

    };
    images[4].src = 'img/negative_y.jpg';

    images[5].onload = function () {
        console.log('Loaded image number: ' + imageLoadCounter);
        imageLoadCounter += 1;
        skyBoxCubeMap = handleTextureLoadedForSkyBox(
            images,
            skyBoxCubeMap,
            imageLoadCounter
        );

    };
    images[5].src = 'img/negative_z.jpg';
}


/**
 *  Helper function that will bind image texture into skybox cubemap.
 *
 * @param {Array} image array to be used as texture
 * @param {gl.texture} texture buffer to hold the image textures
 * @param {number} imgLoadCounter to make sure that all images are loaded
 * @return {gl.texture} fully loaded texture cube buffer
 */
function handleTextureLoadedForSkyBox(image, texture, imgLoadCounter) {

    var skyboxSide =
        [gl.TEXTURE_CUBE_MAP_POSITIVE_X,
            gl.TEXTURE_CUBE_MAP_POSITIVE_Y,
            gl.TEXTURE_CUBE_MAP_POSITIVE_Z,
            gl.TEXTURE_CUBE_MAP_NEGATIVE_X,
            gl.TEXTURE_CUBE_MAP_NEGATIVE_Y,
            gl.TEXTURE_CUBE_MAP_NEGATIVE_Z];

    if (imgLoadCounter === 6) {
        texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);
        try {
            for (var cnt = 0; cnt < 6; cnt++) {
                gl.texImage2D(skyboxSide[cnt], 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image[cnt]);
                gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
                gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            }
        } catch (exception) {
            console.log(exception);
        }
        gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
        return texture;
    }

}


/**
 * This function will bind buffer data and draw the skybox cube.
 */
function drawSkybox() {

    mat4.translate(mvMatrix, mvMatrix, [0, 0.0, -1]);
    mat4.rotateY(mvMatrix, mvMatrix, degToRad(worldRotationValue));
    mat4.rotateX(mvMatrix, mvMatrix, degToRad(worldFlipValue));

    setTexture(shaderProgramSkybox);

    gl.bindBuffer(gl.ARRAY_BUFFER, skyboxVertexBuffer);
    gl.vertexAttribPointer(shaderProgramSkybox.vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0);

    setMatrixUniforms(shaderProgramSkybox);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, skyboxFaceBuffer);
    gl.drawElements(gl.TRIANGLES, skyboxFace.length, gl.UNSIGNED_SHORT, 0);

}


/**
 * This function will bind buffer data and draw the teapot.
 */
function drawTeapot() {

    mat4.translate(mvMatrix, mvMatrix, [0.35, -0.75, -5]); // orient the teapot to the correct position
    mat4.rotateY(mvMatrix, mvMatrix, degToRad(teapotRotationValue));
    mat4.rotateX(mvMatrix, mvMatrix, degToRad(teapotFlipValue));
    mat4.scale(mvMatrix, mvMatrix, [0.5, 0.5, 0.5]);
    mat3.normalFromMat4(nMatrix, mvMatrix);

    setTexture(shaderProgramTeapot);

    gl.bindBuffer(gl.ARRAY_BUFFER, teapotVertexBuffer);
    gl.vertexAttribPointer(shaderProgramTeapot.vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, teapotNormalBuffer);
    gl.vertexAttribPointer(shaderProgramTeapot.vertexNormalAttribute, 3, gl.FLOAT, false, 0, 0);

    setMatrixUniforms(shaderProgramTeapot);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, teapotFaceBuffer);
    gl.drawElements(gl.TRIANGLES, teapotFace.length, gl.UNSIGNED_SHORT, 0);
}


/**
 * This function will load the texture data for shader program.
 *
 * @param {gl.shaderProgram} shaderProgram to load the texture data
 */
function setTexture(shaderProgram) {

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, skyBoxCubeMap);
    gl.uniform1i(shaderProgram.skyboxSampler, 0);

}