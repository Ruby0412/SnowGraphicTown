
var grobjects = grobjects || [];


var Firework = undefined;


(function() {
    "use strict";

  
    var shaderProgram = undefined;
    var buffers = undefined;

    
    Firework = function Firework(position, size, color) {
        this.name = 'Firework_group';
        this.position = position || [0,0,0];
        this.size = size || 0.5;
        this.color = [1,1,1];
        this.theta = Math.random()*Math.PI*3;
        this.phi = Math.random()*Math.PI*4;
        this.radius = 0;
        this.t = 0;
        this.h = 0;
    }
    Firework.prototype.init = function(drawingState) {
        var gl=drawingState.gl;
     
        if (!shaderProgram) {
            shaderProgram = twgl.createProgramInfo(gl, ["cube-vs", "cube-fs"]);
        }
        if (!buffers) {
            var arrays = {
                vpos : { numComponents: 3, data: [
                    -.5,-.5,-.5,  .5,-.5,-.5,  .5, .5,-.5,        -.5,-.5,-.5,  .5, .5,-.5, -.5, .5,-.5,    // z = 0
                    -.5,-.5, .5,  .5,-.5, .5,  .5, .5, .5,        -.5,-.5, .5,  .5, .5, .5, -.5, .5, .5,    // z = 1
                    -.5,-.5,-.5,  .5,-.5,-.5,  .5,-.5, .5,        -.5,-.5,-.5,  .5,-.5, .5, -.5,-.5, .5,    // y = 0
                    -.5, .5,-.5,  .5, .5,-.5,  .5, .5, .5,        -.5, .5,-.5,  .5, .5, .5, -.5, .5, .5,    // y = 1
                    -.5,-.5,-.5, -.5, .5,-.5, -.5, .5, .5,        -.5,-.5,-.5, -.5, .5, .5, -.5,-.5, .5,    // x = 0
                     .5,-.5,-.5,  .5, .5,-.5,  .5, .5, .5,         .5,-.5,-.5,  .5, .5, .5,  .5,-.5, .5     // x = 1
                ] },
                vnormal : {numComponents:3, data: [
                    0,0,-1, 0,0,-1, 0,0,-1,     0,0,-1, 0,0,-1, 0,0,-1,
                    0,0,1, 0,0,1, 0,0,1,        0,0,1, 0,0,1, 0,0,1,
                    0,-1,0, 0,-1,0, 0,-1,0,     0,-1,0, 0,-1,0, 0,-1,0,
                    0,1,0, 0,1,0, 0,1,0,        0,1,0, 0,1,0, 0,1,0,
                    -1,0,0, -1,0,0, -1,0,0,     -1,0,0, -1,0,0, -1,0,0,
                    1,0,0, 1,0,0, 1,0,0,        1,0,0, 1,0,0, 1,0,0,
                ]}
            };
            buffers = twgl.createBufferInfoFromArrays(drawingState.gl,arrays);
        }

    };
    Firework.prototype.draw = function(drawingState) {
       
        var t = (drawingState.realtime%5000)/200;
        var delta = drawingState.realtime-this.t;
        this.radius = 35*t;
        this.h = t*t;
        this.t = drawingState.realtime;

        var modelM = twgl.m4.scaling([this.size,this.size,this.size]);
        var shift = twgl.m4.translation([this.radius*Math.tan(this.theta)*Math.sin(this.phi), 
            this.radius*Math.cos(this.phi)-this.h,
            this.radius*Math.tan(this.theta)*Math.tan(this.phi)
            ]);
        twgl.m4.multiply(shift, modelM, modelM);
        shift = twgl.m4.translation(this.position);
        twgl.m4.multiply(shift, modelM, modelM);
        
        var gl = drawingState.gl;
        gl.useProgram(shaderProgram.program);
        twgl.setBuffersAndAttributes(gl,shaderProgram,buffers);
        twgl.setUniforms(shaderProgram,{
            view:drawingState.view, proj:drawingState.proj, lightdir:drawingState.sunDirection,
            cubecolor:this.color, model: modelM });
        twgl.drawBufferInfo(gl, gl.TRIANGLES, buffers);
    };
    Firework.prototype.center = function(drawingState) {
        return this.position;
    }

})();


for (var i = 0; i < 800; i++) {
    grobjects.push(new Firework([-0,90,0],0.1) );
}

