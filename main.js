/**
 * Created by gleicher on 10/9/2015.
 */
/*
this is the "main" file - it gets loaded last - after all the objects are loaded
make sure that twgl is loaded first

it sets up the main function to be called on window.onload

 */

 var isValidGraphicsObject = function (object) {
    if(object.name === undefined) {
        console.log("warning: GraphicsObject missing name field");
        return false;
    }

    if(typeof object.draw !== "function" && typeof object.drawAfter !== "function") {
        console.log("warning: GraphicsObject of type " + object.name + " does not contain either a draw or drawAfter method");
        return false;
    }

    if(typeof object.center !== "function") {
        console.log("warning: GraphicsObject of type " + object.name + " does not contain a center method. ");
        return false;
    }

    if(typeof object.init !== "function") {
        console.log("warning: GraphicsObject of type " + object.name + " does not contain an init method. ");
        return false;
    }

    return true;
 }
window.onload = function() {
    "use strict";

    // set up the canvas and context
    var canvas = document.createElement("canvas");
    canvas.setAttribute("width",512);
    canvas.setAttribute("height",512);
    document.body.appendChild(canvas);

    // make a place to put the drawing controls - a div
    var controls = document.createElement("DIV");
    controls.id = "controls";
    document.body.appendChild(controls);

    // a switch between camera modes
    var uiMode = document.createElement("select");
    uiMode.innerHTML += "<option>ArcBall</option>";
    uiMode.innerHTML += "<option>Drive</option>";
    uiMode.innerHTML += "<option>Fly</option>";
    uiMode.innerHTML += "</select>";
    controls.appendChild(uiMode);

    var resetButton = document.createElement("button");
    resetButton.innerHTML = "Reset View";
    resetButton.onclick = function() {
        // note - this knows about arcball (defined later) since arcball is lifted
        arcball.reset();

        drivePos = [0,.2,5];
        driveTheta = 0;
        driveXTheta = 0;

    }
    controls.appendChild(resetButton);

    // make some checkboxes - using my cheesy panels code
    var checkboxes = makeCheckBoxes([ ["Run",1], ["Examine",0] ]); //

    // a selector for which object should be examined
    var toExamine = document.createElement("select");
    grobjects.forEach(function(obj) {
           toExamine.innerHTML +=  "<option>" + obj.name + "</option>";
        });
    controls.appendChild(toExamine);

    // make some sliders - using my cheesy panels code
    var sliders = makeSliders([["TimeOfDay",0,24,12]]);

    // this could be gl = canvas.getContext("webgl");
    // but twgl is more robust
    var gl = twgl.getWebGLContext(canvas);

    var cubemapTargets = [  // targets for use in some gl functions for working with cubemaps
       gl.TEXTURE_CUBE_MAP_POSITIVE_X, gl.TEXTURE_CUBE_MAP_NEGATIVE_X, 
       gl.TEXTURE_CUBE_MAP_POSITIVE_Y, gl.TEXTURE_CUBE_MAP_NEGATIVE_Y, 
       gl.TEXTURE_CUBE_MAP_POSITIVE_Z, gl.TEXTURE_CUBE_MAP_NEGATIVE_Z 
    ];

    gl.enable(gl.DEPTH_TEST);

    var dynamicCubemap = gl.createTexture(); // Create the texture object for the reflection map
    
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, dynamicCubemap);  // create storage for the reflection map images
    var i;
    for (i = 0; i < 6; i++) {
        gl.texImage2D(cubemapTargets[i], 0, gl.RGBA, 256, 256, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
            //With null as the last parameter, the previous function allocates memory for the texture and fills it with zeros.
    }
    //gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
         // The previous line would sets the minification filter to gl.LINEAR so we wouldn't neet mipmaps,
         // but the quality of the reflections was significantly improved by using mipmpaps.
         // Even though the mipmaps have to be computed in every frame, it seems worth it.
    
    var framebuffer = gl.createFramebuffer();  // crate the framebuffer that will draw to the reflection map
    gl.bindFramebuffer(gl.FRAMEBUFFER,framebuffer);  // select the framebuffer, so we can attach the depth buffer to it
    var depthBuffer = gl.createRenderbuffer();   // renderbuffer for depth buffer in framebuffer
    gl.bindRenderbuffer(gl.RENDERBUFFER, depthBuffer); // so we can create storage for the depthBuffer
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, 256, 256);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depthBuffer);



    // make a fake drawing state for the object initialization
    var drawingState = {
        gl : gl,
        proj : twgl.m4.identity(),
        view : twgl.m4.identity(),
        camera : twgl.m4.identity(),
        sunDirection : [0,1,0]
    }
    

    // information for the cameras
    var lookAt = [0,0,0];
    var lookFrom = [0,10,10];
    var fov = Math.PI/2;

    var projM;
    var cameraM;
    var viewM;

    var arcball = new ArcBall(canvas);

    // for timing
    var realtime = 0
    var lastTime = Date.now();

    // parameters for driving
    var drivePos = [0,.2,5];
    var driveTheta = 0;
    var driveXTheta = 0;

    // cheesy keyboard handling
    var keysdown = {};

    document.body.onkeydown = function(e) {
        var event = window.event ? window.event : e;
        keysdown[event.keyCode] = true;
        e.stopPropagation();
    };
    document.body.onkeyup = function(e) {
        var event = window.event ? window.event : e;
        delete keysdown[event.keyCode];
        e.stopPropagation();
    };

	// figure out the transforms

    function drawReflection() {
        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
        gl.viewport(0,0,256,256);  //match size of the texture images
        projM = twgl.m4.perspective(Math.PI/2, 1, 0.6, 600);

        cameraM = twgl.m4.identity();
        viewM = twgl.m4.scaling([-1,-1,1]);
        
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_CUBE_MAP_NEGATIVE_Z, dynamicCubemap, 0);
        staticDraw();
     
        viewM = twgl.m4.scaling([-1,-1,1]);
        twgl.m4.rotateY(viewM, Math.PI/2, viewM);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_CUBE_MAP_POSITIVE_X, dynamicCubemap, 0);
        staticDraw();

        viewM = twgl.m4.scaling([-1,-1,1]);
        twgl.m4.rotateY(viewM, Math.PI, viewM);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_CUBE_MAP_POSITIVE_Z, dynamicCubemap, 0);
        staticDraw();

        viewM = twgl.m4.scaling([-1,-1,1]);
        twgl.m4.rotateY(viewM, -Math.PI/2, viewM);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_CUBE_MAP_NEGATIVE_X, dynamicCubemap, 0);
        staticDraw();
        
        viewM = twgl.m4.identity();
        twgl.m4.rotateX(viewM,Math.PI/2,viewM);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_CUBE_MAP_NEGATIVE_Y, dynamicCubemap, 0);
        staticDraw();
        
        viewM = twgl.m4.identity();
        twgl.m4.rotateX(viewM,-Math.PI/2,viewM);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_CUBE_MAP_POSITIVE_Y, dynamicCubemap, 0);
        staticDraw();
        
        /* The commented out section below is an alternative way of computing the positive and negative Y images,
           including the x/y flip.  The rotations that are used in this version correspond are the correct rotations
           based on the layout of the six images in a cubemap.   The single rotation used above is equivalent to the
           flip and two rotations used below. */
        
        //mat4.identity(modelview);
        //mat4.scale(modelview,modelview,[-1,-1,1]);
        //mat4.rotateX(modelview,modelview,Math.PI/2);
        //mat4.rotateY(modelview,modelview,Math.PI);
        //gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_CUBE_MAP_NEGATIVE_Y, dynamicCubemap, 0);
        //staticDraw();
        //
        //mat4.identity(modelview);
        //mat4.scale(modelview,modelview,[-1,-1,1]);
        //mat4.rotateX(modelview,modelview,-Math.PI/2);
        //mat4.rotateY(modelview,modelview,Math.PI);
        //gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_CUBE_MAP_POSITIVE_Y, dynamicCubemap, 0);
        //staticDraw();
        
        gl.bindTexture(gl.TEXTURE_CUBE_MAP, dynamicCubemap);
        gl.generateMipmap( gl.TEXTURE_CUBE_MAP );
    };

    function staticDraw(){
        var curTime = Date.now();
        if (checkboxes.Run.checked) {
            realtime += (curTime - lastTime);
        }
        lastTime = curTime;

        // first, let's clear the screen
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.enable(gl.DEPTH_TEST);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        var tod = Number(sliders.TimeOfDay.value);
        var sunAngle = Math.PI * (tod-6)/12;
        var sunDirection = [Math.cos(sunAngle),Math.sin(sunAngle),0];

        // make a real drawing state for drawing
        var drawingState = {
            gl : gl,
            proj : projM,   // twgl.m4.identity(),
            view : viewM,   // twgl.m4.identity(),
            camera : cameraM,
            timeOfDay : tod,
            sunDirection : sunDirection,
            realtime : realtime
        }

        // initialize all of the objects that haven't yet been initialized (that way objects can be added at any point)
        grobjects.forEach(function(obj) { 
            if(!obj.__initialized) {
                if(isValidGraphicsObject(obj)){
                    obj.init(drawingState);
                    obj.__initialized = true;
                }
            }
        });

        grobjects.forEach(function (obj) {
            if(obj.draw) obj.draw(drawingState);
        });

        grobjects.forEach(function (obj) {
            if(obj.drawAfter) obj.drawAfter();
        });

    };

    // the actual draw function - which is the main "loop"
    function draw() {
        // advance the clock appropriately (unless its stopped)
        var curTime = Date.now();
        if (checkboxes.Run.checked) {
            realtime += (curTime - lastTime);
        }
        lastTime = curTime;

        projM = twgl.m4.perspective(fov, 1.6, 0.1, 1000);
        cameraM = twgl.m4.lookAt(lookFrom,lookAt,[0,1,0]);
        viewM = twgl.m4.inverse(cameraM);

        // first, let's clear the screen
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.enable(gl.DEPTH_TEST);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        
        // implement the camera UI
        if (uiMode.value == "ArcBall") {
            viewM = arcball.getMatrix();
            twgl.m4.setTranslation(viewM, [0, 0, -10], viewM);
        } else if (uiMode.value == "Drive") {
            if (keysdown[65]) { driveTheta += .02; }
            if (keysdown[68]) { driveTheta -= .02; }
            if (keysdown[87]) {
                var dz = Math.cos(driveTheta);
                var dx = Math.sin(driveTheta);
                drivePos[0] -= .05*dx;
                drivePos[2] -= .05*dz;
            }
            if (keysdown[83]) {
                var dz = Math.cos(driveTheta);
                var dx = Math.sin(driveTheta);
                drivePos[0] += .05*dx;
                drivePos[2] += .05*dz;
            }

            cameraM = twgl.m4.rotationY(driveTheta);
            twgl.m4.setTranslation(cameraM, drivePos, cameraM);
            viewM = twgl.m4.inverse(cameraM);
        }else if (uiMode.value == "Fly") {

            if (keysdown[65] || keysdown[37]) { 
                driveTheta += .02; 
            }else if (keysdown[68] || keysdown[39]) { 
                driveTheta -= .02; 
            }

            if (keysdown[38]) { driveXTheta += .02; }
            if (keysdown[40]) { driveXTheta -= .02; }

            var dz = Math.cos(driveTheta);
            var dx = Math.sin(driveTheta);
            var dy = Math.sin(driveXTheta);

            if (keysdown[87]) {
                drivePos[0] -= .25*dx;
                drivePos[2] -= .25*dz;
                drivePos[1] += .25 * dy;
            }

            if (keysdown[83]) {
                drivePos[0] += .25*dx;
                drivePos[2] += .25*dz;
                drivePos[1] -= .25 * dy;
            }

            cameraM = twgl.m4.rotationX(driveXTheta);
            twgl.m4.multiply(cameraM, twgl.m4.rotationY(driveTheta), cameraM);
            twgl.m4.setTranslation(cameraM, drivePos, cameraM);
            viewM = twgl.m4.inverse(cameraM);
        }

        // get lighting information
        var tod = Number(sliders.TimeOfDay.value);
        var sunAngle = Math.PI * (tod-6)/12;
        var sunDirection = [Math.cos(sunAngle),Math.sin(sunAngle),0];

        // make a real drawing state for drawing
        var drawingState = {
            gl : gl,
            proj : projM,   // twgl.m4.identity(),
            view : viewM,   // twgl.m4.identity(),
            camera : cameraM,
            timeOfDay : tod,
            sunDirection : sunDirection,
            realtime : realtime
        }

        // initialize all of the objects that haven't yet been initialized (that way objects can be added at any point)
        grobjects.forEach(function(obj) { 
            if(!obj.__initialized) {
                if(isValidGraphicsObject(obj)){
                    obj.init(drawingState);
                    obj.__initialized = true;
                }
            }
        });

        if(!refBox1.__initialized) {
                drawingState.gl.bindTexture(gl.TEXTURE_CUBE_MAP, dynamicCubemap);
                refBox1.init(drawingState);
                refBox1.__initialized = true;
        };

        // now draw all of the objects - unless we're in examine mode
        if (checkboxes.Examine.checked) {
            // get the examined object - too bad this is an array not an object
            var examined = undefined;
            grobjects.forEach(function(obj) { if (obj.name == toExamine.value) {examined=obj;}});
            var ctr = examined.center(drawingState);
            var shift = twgl.m4.translation([-ctr[0],-ctr[1],-ctr[2]]);
            twgl.m4.multiply(shift,drawingState.view,drawingState.view);
            //twgl.m4.multiply(twgl.m4.scaling([3,3,3]),drawingState.view,drawingState.view);

            if(examined.draw) examined.draw(drawingState);
            if(examined.drawAfter) examined.drawAfter(drawingState);
        } else {

            grobjects.forEach(function (obj) {
                if(obj.draw) obj.draw(drawingState);
            });

            grobjects.forEach(function (obj) {
                if(obj.drawAfter) obj.drawAfter();
            });

            if(refBox1.draw) refBox1.draw(drawingState);
        }
    };

    function animate(){
            drawReflection();
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);  // draw to screen
            gl.viewport(0,0,canvas.width,canvas.height);
            draw();
            window.requestAnimationFrame(animate);
    };
    animate();
};
