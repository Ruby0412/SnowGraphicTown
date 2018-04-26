var refBox = undefined;

(function() {

    var shaderProgram = undefined;
    var buffers = undefined;


    refBox = function refBox(position, size, color) {
        this.name = 'refBox';
        this.position = position || [0,0,0];
        this.size = size || 4;
    };
    refBox.prototype.init = function(drawingState) {
        var gl=drawingState.gl;
        if (!shaderProgram) {
            shaderProgram = twgl.createProgramInfo(gl, ["refBox-vs", "refBox-fs"]);
        }
        if (!buffers) {
           
            buffers = twgl.createBufferInfoFromArrays(drawingState.gl,ball2);
        }
        
        gl.uniform1i(shaderProgram.skybox, 0);
    };
    refBox.prototype.draw = function(drawingState) {
       
        var modelM = twgl.m4.scaling([this.size,this.size,this.size]);
        
        var gl = drawingState.gl;
        gl.useProgram(shaderProgram.program);
        drawingState.inverseViewTransform = twgl.m4.inverse(twgl.m4.multiply(modelM, drawingState.view));
        twgl.setBuffersAndAttributes(gl,shaderProgram,buffers);
        twgl.setUniforms(shaderProgram,{
            view:drawingState.view, proj:drawingState.proj, lightdir:drawingState.sunDirection,
            model: modelM, inverseViewTransform: drawingState.inverseViewTransform});
        twgl.drawBufferInfo(gl, gl.TRIANGLES, buffers);
    };
})();

var refBox1 = new refBox();