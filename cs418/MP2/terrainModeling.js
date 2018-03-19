/**
 *  This Javascript will generate the terrain by implementing the Diamond-Square algorithm.
 *
 */

// Temporary array to store vertex, normal and color
var arr_vertex = [];
var arr_normal = [];
var arr_color = [];

// Color for height map
var color1 = [0.6234234, 0.298, 0.1];
var color2 = [0.723523, 0.4231253, 0.1];
var color3 = [0.8234235, 0.553462435, 0.3];

/**
 * Generate Terrain from the provided parameters based on Diamond-Square algorithm.
 *
 * @param {number} n Number of grid length
 * @param {number} minX Minimum value of X
 * @param {number} maxX Maximum value of X
 * @param {number} minY Minimum value of Y
 * @param {number} maxY Maximum value of Y
 * @param {Array} vertexArray Array for vertex vector
 * @param {Array} faceArray Indexed array for vertex vector
 * @param {Array} normalArray Array for normal vector
 * @param {Array} colorArray Array for color vector
 * @return {number} Total number of triangles in the terrain
 */
function generate_terrain(n, minX, maxX, minY, maxY, vertexArray, faceArray, normalArray, colorArray) {
    // Intermediate variable for maximum grid side length
    var map_size = n + 1;
    var deltaX = (maxX - minX) / (map_size - 1);
    var deltaY = (maxY - minY) / (map_size - 1);

    // Initialized both vertex and normal array. The height is stored in Y-axis here.
    for (var i = 0; i <= (map_size - 1); i++) {
        for (var j = 0; j <= (map_size - 1); j++) {
            arr_vertex.push({x: minX + deltaX * j, y: 0, z: minY + deltaY * i});
            arr_normal.push(vec3.create());
        }
    }

    // Initial height value for corners
    var base_height = 300;

    //set initial corner
    arr_vertex[0].y = base_height;
    arr_vertex[map_size - 1].y = base_height;
    arr_vertex[(map_size - 1) + (map_size - 1) * map_size].y = base_height;
    arr_vertex[(map_size - 1) * map_size].y = base_height;

    //recursively calculate average midpoint and set them
    divide(map_size, 300, map_size);

    var numT = 0;

    // Now, we have to calculate index to be used in gl.draw_element() and normal for lightning calculation
    for (var i = 0; i < (map_size - 1); i++) {
        for (var j = 0; j < (map_size - 1); j++) {

            /*
             The idea is to divide the grid row in to pairs of triangle like this.
             3---4---6---8--10
             | \ | \ | \ | \ |
             1---2---5---7---9
             Then, we calculate 'face' of triangle(or index) to sent to GPU.
             */

            // tmp is an index for each vertex
            var tmp = i * map_size + j;

            // Push the index according to the above diagram into face array
            faceArray.push(tmp); //first vertex
            faceArray.push(tmp + 1); //next vertex in same row
            faceArray.push(tmp + map_size); //next vertex in next row


            // Then we calculate normal vector from the three vertices
            var tmp_vec1 = vec3.fromValues(arr_vertex[tmp + 1].x - arr_vertex[tmp].x,
                arr_vertex[tmp + 1].y - arr_vertex[tmp].y, arr_vertex[tmp + 1].z - arr_vertex[tmp].z);

            var tmp_vec2 = vec3.fromValues(arr_vertex[tmp + map_size].x - arr_vertex[tmp].x,
                arr_vertex[tmp + map_size].y - arr_vertex[tmp].y, arr_vertex[tmp + map_size].z - arr_vertex[tmp].z);
            vec3.cross(tmp_vec2, tmp_vec1, tmp_vec2);
            vec3.normalize(tmp_vec2, tmp_vec2);

            // Store calculated normal into array
            vec3.add(arr_normal[tmp], arr_normal[tmp], tmp_vec2);
            vec3.add(arr_normal[tmp + 1], arr_normal[tmp + 1], tmp_vec2);
            vec3.add(arr_normal[tmp + map_size], arr_normal[tmp + map_size], tmp_vec2);

            // Do the same thing with next triangle
            faceArray.push(tmp + 1); //second vertex
            faceArray.push(tmp + 1 + map_size); //neighbor upper vertex in next row
            faceArray.push(tmp + map_size);//neighbor upper-left vertex in next row

            tmp_vec1 = vec3.fromValues(arr_vertex[tmp + 1 + map_size].x - arr_vertex[tmp + 1].x,
                arr_vertex[tmp + 1 + map_size].y - arr_vertex[tmp + 1].y,
                arr_vertex[tmp + 1 + map_size].z - arr_vertex[tmp + 1].z);

            tmp_vec2 = vec3.fromValues(arr_vertex[tmp + map_size].x - arr_vertex[tmp + 1].x,
                arr_vertex[tmp + map_size].y - arr_vertex[tmp + 1].y,
                arr_vertex[tmp + map_size].z - arr_vertex[tmp + 1].z);

            vec3.cross(tmp_vec2, tmp_vec1, tmp_vec2);
            vec3.normalize(tmp_vec2, tmp_vec2);
            vec3.add(arr_normal[tmp + 1], arr_normal[tmp + 1], tmp_vec2);
            vec3.add(arr_normal[tmp + 1 + map_size], arr_normal[tmp + 1 + map_size], tmp_vec2);
            vec3.add(arr_normal[tmp + map_size], arr_normal[tmp + map_size], tmp_vec2);

            //count the number of triangles in the array
            numT += 2;


        }
    }
        // Add color
        for (var j = 0; j < arr_vertex.length; j++) {
            add_color(arr_vertex[j].y)
        }


    // Transfer data from temporary array to appropriated array
    move_data_to_vertex_array(vertexArray);
    move_data_to_normalize_array(normalArray);
    move_data_to_color_array(colorArray);

    return numT;
}


/**
 * Return height value at index(i,j) if (i,j) is within bound. Else, return that of nearest index.
 *
 * @param {number} i Column index
 * @param {number} j Row index
 * @param {number} n Row size to be used in bound issue
 * @return {number} Height value
 */
function get_height(i, j, n) {

    //deal with bound issue
    if (i < 0 || i > n) {
        if (i > 0) i = i % (n + 1);
        else while (i < 0)i += (n + 1);
    }
    if (j < 0 || j > n) {
        if (j > 0) j = j % (n + 1);
        else while (j < 0)j += (n + 1);

    }
    return arr_vertex[i + j * (n + 1)].y;
}

/**
 * Helper function for generate_terrain() to recursively calculate midpoint value of sub-area.
 *
 * @param {number} size Size of sub-area to calculate
 * @param {number} randomness Amount of random value for this midpoint
 * @param {number} n Maximum grid length
 */
function divide(size, randomness, n) {
    var x;
    var y;
    var half = size / 2; // Split area into square part and diamond part

    if (half < 1) return;

    for (y = half; y < n; y += size) {
        for (x = half; x < n; x += size) {
            // Square part
            var t1 = get_height(x - half, y - half, (n - 1)); // lower left vertex
            var t2 = get_height(x + half, y - half, (n - 1)); // lower right vertex
            var t3 = get_height(x + half, y + half, (n - 1)); // upper right vertex
            var t4 = get_height(x - half, y + half, (n - 1)); // upper left vertex
            var avg = (t1 + t2 + t3 + t4) / 4.0;

            if (x >= 0 && x <= (n - 1) && y >= 0 && y <= (n - 1)) {
                arr_vertex[x + y * n].y = avg + Math.random() * randomness;
            }

        }
    }

    for (y = 0; y < n; y += half) {
        for (x = (y + half) % size; x < n; x += size) {
            // Diamond part
            var t1 = get_height(x, y - half, (n - 1)); // Down vertex
            var t2 = get_height(x + half, y, (n - 1)); // Right vertex
            var t3 = get_height(x - half, y, (n - 1)); // Left vertex
            var t4 = get_height(x, y + half, (n - 1)); // Up vertex

            var avg = (t1 + t2 + t3 + t4) / 4.0;

            if (x >= 0 && x <= (n - 1) && y >= 0 && y <= (n - 1)) {
                arr_vertex[x + y * n].y = avg + Math.random() * randomness;
            }

        }
    }

    divide(size / 2, 0.6*randomness , n); // Recursively calculate next sub-area
}

/**
 * Helper function to move data from temporary vertex array to real vertex array
 *
 * @param {Array} vertexArray Real vertex array
 */
function move_data_to_vertex_array(vertexArray) {
    for (var i = 0; i < arr_vertex.length; i++) {
        vertexArray.push(arr_vertex[i].x);
        vertexArray.push(arr_vertex[i].y);
        vertexArray.push(arr_vertex[i].z);
    }
}

/**
 * Helper function to move data from temporary normal array to real normal array
 *
 * @param {Array} normalArray Real normal array
 */
function move_data_to_normalize_array(normalArray) {
    var tmp_vec = vec3.create();
    for (var i = 0; i < arr_normal.length; i++) {
        vec3.normalize(tmp_vec, arr_normal[i]);
        normalArray.push(tmp_vec[0]);
        normalArray.push(tmp_vec[1]);
        normalArray.push(tmp_vec[2]);
    }
}

/**
 * Helper function to move data from temporary color array to real color array
 *
 * @param colorArray Real color array
 */
function move_data_to_color_array(colorArray) {
    for (var i = 0; i < arr_color.length; i++) {
        colorArray.push(arr_color[i][0]);
        colorArray.push(arr_color[i][1]);
        colorArray.push(arr_color[i][2]);
        colorArray.push(1);
    }
}


/**
 * Add appropriate color to temporary color array based on input height value.
 *
 * @param {number} height Height value from target vertex
 */
function add_color(height) {
    if (height > 700) {
        arr_color.push(color1);
    }
    else if (height > 600) {
        arr_color.push(color2);
    }
    else {
        arr_color.push(color3);
    }
}