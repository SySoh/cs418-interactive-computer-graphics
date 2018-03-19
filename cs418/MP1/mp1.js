/***

Based on the sample code provided by the lecture and discussion session. 
I have modified the shader and background color to match the MP requirement.
The main affine transformation is the rotation in Y axis. 

Also, I have added the non-affine transformation which
is a mimic of a "cheering crowd's hand movement". This motion is generated
from the combination of varying parameters of sine and cosine functions.

***/

var gl;
var canvas;
var shaderProgram;
var vertexPositionBuffer;


// Create a place to store vertex colors
var vertexColorBuffer;

var mvMatrix = mat4.create();
var rotAngle = 0;
var lastTime = 0;
var shake_value = 0;

// helper function to set our matrix uniform and pass it to the WebGl engine
function setMatrixUniforms() {
    gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
}

// helper function to convert degree to radian
function degToRad(degrees) {
        return degrees * Math.PI / 180;
}

// initialze webgl context by verifying wheter WebGL rendering is supported or not.
function createGLContext(canvas) {
  var names = ["webgl", "experimental-webgl"];
  var context = null;
  for (var i=0; i < names.length; i++) {
    try {
      context = canvas.getContext(names[i]);
    } catch(e) {}
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

// helper function to load shader info from the provided id using DOM
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

// helper function to initialized the vertex and fragment shader attributes from shader script
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

  shaderProgram.vertexColorAttribute = gl.getAttribLocation(shaderProgram, "aVertexColor");
  gl.enableVertexAttribArray(shaderProgram.vertexColorAttribute);
  shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
  
}

// this function prepares vertex and shader information in to buffer 
// to be drawn by webgl rendering engine. It is clear that "triangleVertices"
// array contains vertices position and "colors" arrays contains color information
// of each vertex.
function setupBuffers() {
  vertexPositionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexPositionBuffer);

  var triangleVertices = [
      -1.0,1.0,0.0,
      -1.0,0.7,0.0,       //v1
      -0.8,0.7,0.0,

      -0.8,0.7,0.0,
      -0.4,1.0,0.0,       //v2
      -1.0,1.0,0.0,

      -0.4,1.0,0.0,
      -0.8,0.7,0.0,       //v3
      -0.4,0.7,0.0,

      -0.8,0.7,0.0,
      -0.8,-0.15,0.0,       //v4
      -0.4,0.7,0.0,

      -0.4,0.7,0.0,
      -0.8,-0.15,0.0,       //v5
      -0.4,0.5,0.0,

      -0.4,0.5,0.0,
      -0.8,-0.15,0.0,       //v6
      -0.4,0.05,0.0,

      -0.4,0.05,0.0,
      -0.8,-0.15,0.0,       //v7
      -0.4,-0.15,0.0,

      -0.4,0.5,0.0,
      -0.4,0.05,0.0,       //v8
      -0.2,0.5,0.0,

      -0.2,0.5,0.0,
      -0.4,0.05,0.0,       //v9
      -0.2,0.05,0.0,

      -0.4,1.0,0.0,
      -0.4,0.7,0.0,       //v10
      0.4,1.0,0.0,

      0.4,1.0,0.0,
      -0.4,0.7,0.0,       //v11
      0.4,0.7,0.0,

      0.4,1.0,0.0,
      0.4,0.7,0.0,       //v12
      0.8,0.7,0.0,

      0.4,1.0,0.0,
      0.8,0.7,0.0,       //v13
      1.0,1.0,0.0,

      1.0,1.0,0.0,
      0.8,0.7,0.0,       //v14
      1.0,0.7,0.0,

      0.8,0.7,0.0,
      0.4,0.7,0.0,       //v15
      0.4,0.5,0.0,

      0.4,0.5,0.0,
      0.4,0.05,0.0,       //v16
      0.8,0.7,0.0,

      0.4,0.05,0.0,
      0.4,-0.15,0.0,       //v17
      0.8,0.7,0.0,

      0.8,0.7,0.0,
      0.4,-0.15,0.0,       //v18
      0.8,-0.15,0.0,

      0.4,0.5,0.0,
      0.2,0.5,0.0,       //v19
      0.2,0.05,0.0,

      0.2,0.05,0.0,
      0.4,0.05,0.0,       //v20
      0.4,0.5,0.0,


      -0.8,-0.25,0.0,
      -0.8,-0.45,0.0,     //lower_1_v1
      -0.65,-0.25,0.0,

      -0.65,-0.25,0.0,
      -0.8,-0.45,0.0,     //lower_1_v2
      -0.65,-0.65,0.0,

      -0.4,-0.25,0.0,
      -0.55,-0.25,0.0,     //lower_2_v1
      -0.55,-0.65,0.0,

      -0.55,-0.65,0.0,
      -0.4,-0.85,0.0,     //lower_2_v2
      -0.4,-0.25,0.0,

      -0.25,-0.25,0.0,
      -0.25,-0.85,0.0,    //lower_3_v1
      -0.1,-0.25,0.0,

      -0.25,-0.85,0.0,
      -0.1,-1.0,0.0,    //lower_3_v2
      -0.1,-0.25,0.0,

      0.1,-0.25,0.0,
      0.1,-1.0,0.0,    //lower_4_v1
      0.25,-0.85,0.0,

      0.25,-0.85,0.0,
      0.25,-0.25,0.0,    //lower_4_v2
      0.1,-0.25,0.0,

      0.4,-0.25,0.0,
      0.4,-0.85,0.0,    //lower_5_v1
      0.55,-0.25,0.0,

      0.55,-0.25,0.0,
      0.4,-0.85,0.0,    //lower_5_v2
      0.55,-0.65,0.0,

      0.8,-0.25,0.0,
      0.65,-0.25,0.0,    //lower_6_v1
      0.65,-0.65,0.0,

      0.65,-0.65,0.0,
      0.8,-0.45,0.0,    //lower_6_v2
      0.8,-0.25,0.0

  ];
    
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(triangleVertices), gl.DYNAMIC_DRAW);
  vertexPositionBuffer.itemSize = 3;
  vertexPositionBuffer.numberOfItems = 96;
    
  vertexColorBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexColorBuffer);
  var colors = [
        0.0, 0.05, 0.3, 1.0,
        0.0, 0.05, 0.3, 1.0,
        0.0, 0.05, 0.3, 1.0,
        0.0, 0.05, 0.3, 1.0,
        0.0, 0.05, 0.3, 1.0,
        0.0, 0.05, 0.3, 1.0,
        0.0, 0.05, 0.3, 1.0,
        0.0, 0.05, 0.3, 1.0,
        0.0, 0.05, 0.3, 1.0,
        0.0, 0.05, 0.3, 1.0,
        0.0, 0.05, 0.3, 1.0,
        0.0, 0.05, 0.3, 1.0,
        0.0, 0.05, 0.3, 1.0,
        0.0, 0.05, 0.3, 1.0,
        0.0, 0.05, 0.3, 1.0,
        0.0, 0.05, 0.3, 1.0,
        0.0, 0.05, 0.3, 1.0,
        0.0, 0.05, 0.3, 1.0,
        0.0, 0.05, 0.3, 1.0,
        0.0, 0.05, 0.3, 1.0,
        0.0, 0.05, 0.3, 1.0,
        0.0, 0.05, 0.3, 1.0,
        0.0, 0.05, 0.3, 1.0,
        0.0, 0.05, 0.3, 1.0,
        0.0, 0.05, 0.3, 1.0,
        0.0, 0.05, 0.3, 1.0,
        0.0, 0.05, 0.3, 1.0,
        0.0, 0.05, 0.3, 1.0,
        0.0, 0.05, 0.3, 1.0,
        0.0, 0.05, 0.3, 1.0,
        0.0, 0.05, 0.3, 1.0,
        0.0, 0.05, 0.3, 1.0,
        0.0, 0.05, 0.3, 1.0,
        0.0, 0.05, 0.3, 1.0,
        0.0, 0.05, 0.3, 1.0,
        0.0, 0.05, 0.3, 1.0,
        0.0, 0.05, 0.3, 1.0,
        0.0, 0.05, 0.3, 1.0,
        0.0, 0.05, 0.3, 1.0,
        0.0, 0.05, 0.3, 1.0,
        0.0, 0.05, 0.3, 1.0,
        0.0, 0.05, 0.3, 1.0,
        0.0, 0.05, 0.3, 1.0,
        0.0, 0.05, 0.3, 1.0,
        0.0, 0.05, 0.3, 1.0,
        0.0, 0.05, 0.3, 1.0,
        0.0, 0.05, 0.3, 1.0,
        0.0, 0.05, 0.3, 1.0,
        0.0, 0.05, 0.3, 1.0,
        0.0, 0.05, 0.3, 1.0,
        0.0, 0.05, 0.3, 1.0,
        0.0, 0.05, 0.3, 1.0,
        0.0, 0.05, 0.3, 1.0,
        0.0, 0.05, 0.3, 1.0,
        0.0, 0.05, 0.3, 1.0,
        0.0, 0.05, 0.3, 1.0,
        0.0, 0.05, 0.3, 1.0,
        0.0, 0.05, 0.3, 1.0,
        0.0, 0.05, 0.3, 1.0,
        0.0, 0.05, 0.3, 1.0,

        1.0, 0.25, 0.0, 1.0,
        1.0, 0.25, 0.0, 1.0,
        1.0, 0.25, 0.0, 1.0,
        1.0, 0.25, 0.0, 1.0,
        1.0, 0.25, 0.0, 1.0,
        1.0, 0.25, 0.0, 1.0,
        1.0, 0.25, 0.0, 1.0,
        1.0, 0.25, 0.0, 1.0,
        1.0, 0.25, 0.0, 1.0,
        1.0, 0.25, 0.0, 1.0,
        1.0, 0.25, 0.0, 1.0,
        1.0, 0.25, 0.0, 1.0,
        1.0, 0.25, 0.0, 1.0,
        1.0, 0.25, 0.0, 1.0,
        1.0, 0.25, 0.0, 1.0,
        1.0, 0.25, 0.0, 1.0,
        1.0, 0.25, 0.0, 1.0,
        1.0, 0.25, 0.0, 1.0,
        1.0, 0.25, 0.0, 1.0,
        1.0, 0.25, 0.0, 1.0,
        1.0, 0.25, 0.0, 1.0,
        1.0, 0.25, 0.0, 1.0,
        1.0, 0.25, 0.0, 1.0,
        1.0, 0.25, 0.0, 1.0,
        1.0, 0.25, 0.0, 1.0,
        1.0, 0.25, 0.0, 1.0,
        1.0, 0.25, 0.0, 1.0,
        1.0, 0.25, 0.0, 1.0,
        1.0, 0.25, 0.0, 1.0,
        1.0, 0.25, 0.0, 1.0,
        1.0, 0.25, 0.0, 1.0,
        1.0, 0.25, 0.0, 1.0,
        1.0, 0.25, 0.0, 1.0,
        1.0, 0.25, 0.0, 1.0,
        1.0, 0.25, 0.0, 1.0,
        1.0, 0.25, 0.0, 1.0,
        1.0, 0.25, 0.0, 1.0,
        1.0, 0.25, 0.0, 1.0,
        1.0, 0.25, 0.0, 1.0,
        1.0, 0.25, 0.0, 1.0,

    ];
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.DYNAMIC_DRAW);
  vertexColorBuffer.itemSize = 4;
  vertexColorBuffer.numItems = 96;  
}

// this function commands the webgl rendering engine to draw the image based on the provided
// vertex and fragment shader that were provided in the buffer.
function draw() { 
  gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);  
  mat4.identity(mvMatrix); // create a 4x4 identity matrix
  mat4.rotateY(mvMatrix, mvMatrix, degToRad(rotAngle));  // perform rotation in Y axis
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexPositionBuffer);  // bind vertex shader for rendering engine
  gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, // setup the position attribute for vertex buffer
                         vertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexColorBuffer);  // bind fragment shader for rendering engine
  gl.vertexAttribPointer(shaderProgram.vertexColorAttribute,  // setup the position attribute for fragment buffer
                            vertexColorBuffer.itemSize, gl.FLOAT, false, 0, 0);
  
  setMatrixUniforms();
  gl.drawArrays(gl.TRIANGLES, 0, vertexPositionBuffer.numberOfItems); // command the engine to draw the triangles
}

// this function will perform the animation effect on the image by first calculate
// the time different to increase the rotation degree and call the non-affaine transformation
// function.
function animate() {
    var timeNow = new Date().getTime();
    if (lastTime !== 0) {
        var elapsed = timeNow - lastTime;    
        rotAngle= (rotAngle+0.5) % 360; // rotation degree increase by 0.5 every timestep
    }
    lastTime = timeNow;

    //perform non-affaine transformation
    do_shaking()
}

// this function will perform the non-affaine transformation on the image by calculating
// and combining the various sine and cosine function on the lower part of images' vertex.
// The goal here is to mimic the cheering crowd hand's movement in the football game.

// Note:
//      vertices on the x-axis will be modified by Sine function with varying period and amplitude.
//      vertices on the y-axis will be modified by Cosine function with varying period and amplitude.
function do_shaking(){
	shake_value += 0.1;
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexPositionBuffer);
    var triangleVertices_shaked = [
       -1.0,1.0,0.0,
      -1.0,0.7,0.0,       //v1
      -0.8,0.7,0.0,

      -0.8,0.7,0.0,
      -0.4,1.0,0.0,       //v2
      -1.0,1.0,0.0,

      -0.4,1.0,0.0,
      -0.8,0.7,0.0,       //v3
      -0.4,0.7,0.0,

      -0.8,0.7,0.0,
      -0.8,-0.15,0.0,       //v4
      -0.4,0.7,0.0,

      -0.4,0.7,0.0,
      -0.8,-0.15,0.0,       //v5
      -0.4,0.5,0.0,

      -0.4,0.5,0.0,
      -0.8,-0.15,0.0,       //v6
      -0.4,0.05,0.0,

      -0.4,0.05,0.0,
      -0.8,-0.15,0.0,       //v7
      -0.4,-0.15,0.0,

      -0.4,0.5,0.0,
      -0.4,0.05,0.0,       //v8
      -0.2,0.5,0.0,

      -0.2,0.5,0.0,
      -0.4,0.05,0.0,       //v9
      -0.2,0.05,0.0,

      -0.4,1.0,0.0,
      -0.4,0.7,0.0,       //v10
      0.4,1.0,0.0,

      0.4,1.0,0.0,
      -0.4,0.7,0.0,       //v11
      0.4,0.7,0.0,

      0.4,1.0,0.0,
      0.4,0.7,0.0,       //v12
      0.8,0.7,0.0,

      0.4,1.0,0.0,
      0.8,0.7,0.0,       //v13
      1.0,1.0,0.0,

      1.0,1.0,0.0,
      0.8,0.7,0.0,       //v14
      1.0,0.7,0.0,

      0.8,0.7,0.0,
      0.4,0.7,0.0,       //v15
      0.4,0.5,0.0,

      0.4,0.5,0.0,
      0.4,0.05,0.0,       //v16
      0.8,0.7,0.0,

      0.4,0.05,0.0,
      0.4,-0.15,0.0,       //v17
      0.8,0.7,0.0,

      0.8,0.7,0.0,
      0.4,-0.15,0.0,       //v18
      0.8,-0.15,0.0,

      0.4,0.5,0.0,
      0.2,0.5,0.0,       //v19
      0.2,0.05,0.0,

      0.2,0.05,0.0,
      0.4,0.05,0.0,       //v20
      0.4,0.5,0.0,


      -0.8+(-0.2*Math.sin(0.7*shake_value))*0.05,-0.25+(-0.75*Math.cos(1.1*shake_value))*0.05,0.0,
      -0.8+(-0.2*Math.sin(0.7*shake_value))*0.05,-0.45+(-0.55*Math.cos(1.1*shake_value))*0.05,0.0,     //lower_1_v1
      -0.65+(-0.35*Math.sin(0.7*shake_value))*0.05,-0.25+(-0.75*Math.cos(1.1*shake_value))*0.05,0.0,

      -0.65+(-0.35*Math.sin(0.7*shake_value))*0.05,-0.25+(-0.75*Math.cos(1.1*shake_value))*0.05,0.0,
      -0.8+(-0.2*Math.sin(0.7*shake_value))*0.05,-0.45+(-0.55*Math.cos(1.1*shake_value))*0.05,0.0,     //lower_1_v2
      -0.65+(-0.35*Math.sin(0.7*shake_value))*0.05,-0.65+(-0.35*Math.cos(1.1*shake_value))*0.05,0.0,

      -0.4+(-0.6*Math.sin(0.65*shake_value))*0.05,-0.25+(-0.75*Math.cos(0.9*shake_value))*0.1,0.0,
      -0.55+(-0.45*Math.sin(0.65*shake_value))*0.05,-0.25+(-0.75*Math.cos(0.9*shake_value))*0.1,0.0,     //lower_2_v1
      -0.55+(-0.45*Math.sin(0.65*shake_value))*0.05,-0.65+(-0.35*Math.cos(0.9*shake_value))*0.1,0.0,

      -0.55+(-0.45*Math.sin(0.65*shake_value))*0.05,-0.65+(-0.35*Math.cos(0.9*shake_value))*0.1,0.0,
      -0.4+(-0.6*Math.sin(0.65*shake_value))*0.05,-0.85+(-0.15*Math.cos(0.9*shake_value))*0.1,0.0,     //lower_2_v2
      -0.4+(-0.6*Math.sin(0.65*shake_value))*0.05,-0.25+(-0.75*Math.cos(0.9*shake_value))*0.1,0.0,

      -0.25+(-0.75*Math.sin(0.6*shake_value))*0.05,-0.25+(-0.75*Math.cos(0.7*shake_value))*0.2,0.0,
      -0.25+(-0.75*Math.sin(0.6*shake_value))*0.05,-0.85+(-0.15*Math.cos(0.7*shake_value))*0.2,0.0,    //lower_3_v1
      -0.1+(-0.9*Math.sin(0.6*shake_value))*0.05,-0.25+(-0.75*Math.cos(0.7*shake_value))*0.2,0.0,

      -0.25+(-0.75*Math.sin(0.6*shake_value))*0.05,-0.85+(-0.15*Math.cos(0.7*shake_value))*0.2,0.0,
      -0.1+(-0.9*Math.sin(0.6*shake_value))*0.05,-1.0+(-0.1*Math.cos(0.7*shake_value))*0.2,0.0,    //lower_3_v2
      -0.1+(-0.9*Math.sin(0.6*shake_value))*0.05,-0.25+(-0.75*Math.cos(0.7*shake_value))*0.2,0.0,

      0.1+(-0.9*Math.sin(0.55*shake_value))*0.05,-0.25+(-0.75*Math.cos(0.7*shake_value))*0.2,0.0,
      0.1+(-0.9*Math.sin(0.55*shake_value))*0.05,-1.0+(-0.1*Math.cos(0.7*shake_value))*0.2,0.0,    //lower_4_v1
      0.25+(-0.9*Math.sin(0.55*shake_value))*0.05,-0.85+(-0.15*Math.cos(0.7*shake_value))*0.2,0.0,

      0.25+(-0.9*Math.sin(0.55*shake_value))*0.05,-0.85+(-0.15*Math.cos(0.7*shake_value))*0.2,0.0,
      0.25+(-0.75*Math.sin(0.55*shake_value))*0.05,-0.25+(-0.75*Math.cos(0.7*shake_value))*0.2,0.0,    //lower_4_v2
      0.1+(-0.9*Math.sin(0.55*shake_value))*0.05,-0.25+(-0.75*Math.cos(0.7*shake_value))*0.2,0.0,

      0.4+(-0.6*Math.sin(0.5*shake_value))*0.05,-0.25+(-0.75*Math.cos(0.9*shake_value))*0.1,0.0,
      0.4+(-0.6*Math.sin(0.5*shake_value))*0.05,-0.85+(-0.15*Math.cos(0.9*shake_value))*0.1,0.0,    //lower_5_v1
      0.55+(-0.45*Math.sin(0.5*shake_value))*0.05,-0.25+(-0.75*Math.cos(0.9*shake_value))*0.1,0.0,

      0.55+(-0.45*Math.sin(0.5*shake_value))*0.05,-0.25+(-0.75*Math.cos(0.9*shake_value))*0.1,0.0,
      0.4+(-0.6*Math.sin(0.5*shake_value))*0.05,-0.85+(-0.15*Math.cos(0.9*shake_value))*0.1,0.0,    //lower_5_v2
      0.55+(-0.45*Math.sin(0.5*shake_value))*0.05,-0.65+(-0.35*Math.cos(0.9*shake_value))*0.1,0.0,

      0.8+(-0.2*Math.sin(0.45*shake_value))*0.05,-0.25+(-0.75*Math.cos(1.1*shake_value))*0.05,0.0,
      0.65+(-0.35*Math.sin(0.45*shake_value))*0.05,-0.25+(-0.75*Math.cos(1.1*shake_value))*0.05,0.0,    //lower_6_v1
      0.65+(-0.35*Math.sin(0.45*shake_value))*0.05,-0.65+(-0.35*Math.cos(1.1*shake_value))*0.05,0.0,

      0.65+(-0.35*Math.sin(0.45*shake_value))*0.05,-0.65+(-0.35*Math.cos(1.1*shake_value))*0.05,0.0,
      0.8+(-0.2*Math.sin(0.45*shake_value))*0.05,-0.45+(-0.55*Math.cos(1.1*shake_value))*0.05,0.0,    //lower_6_v2
      0.8+(-0.2*Math.sin(0.45*shake_value))*0.05,-0.25+(-0.75*Math.cos(1.1*shake_value))*0.05,0.0
    ];

    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(triangleVertices_shaked), gl.DYNAMIC_DRAW);
    vertexPositionBuffer.itemSize = 3;
    vertexPositionBuffer.numberOfItems = 96;
}

// the first function to be called when webpage loaded. It will load canvas element from web browser
// and initialized the required WebGL setup then called the tick function to draw and animate image.
function startup() {
  canvas = document.getElementById("myGLCanvas");
  gl = createGLContext(canvas);
  setupShaders(); 
  setupBuffers();
  gl.clearColor(1.0, 1.0, 1.0, 1.0); //set background color to opaque white
  gl.enable(gl.DEPTH_TEST);
  tick();
}

// helper function which was provided from external library. It provided each frame information
// before the rendering engine draw the image. So, we can modify the shader information before
// rendering each frame. 
function tick() {
    requestAnimFrame(tick);
    draw();
    animate();
}

