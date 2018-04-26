/**
 * Created by gleicher on 10/17/15.
 */
var grobjects = grobjects || [];

var Human = undefined;


(function () {
    "use strict";

    
    var shaderProgram = undefined;
    var cubeBuff = undefined;
    var humanIndex = 0;
	var parts = ['head', 'body', 'arm', 'leg'];

    Human = function Human(name, color, textureUrls) {
        this.name = name || "human"+humanIndex++;
        this.position = [0,0,0];    
		this.color = color || {body: [0.1, 0.1, 0.1],
						head: [0.1, 0.1, 0.1],
						arms: [0.1, 0.1, 0.1],
						legs: [0.1, 0.1, 0.1],};
        this.orientation = Math.random() * 180;
		this.textureUrls = textureUrls;
		this.texes = {};
    }
    Human.prototype.init = function(drawingState) {
        var gl=drawingState.gl;

        // create the shaders once - for all cubes
        if (!shaderProgram) {
            shaderProgram = twgl.createProgramInfo(gl, ["cube-vs", "cube-fs"]);
        }
        if (!cubeBuff) {
            var arrays = twgl.primitives.createCubeVertices(1);
			var cube = {vpos: arrays.position, vnormal: arrays.normal, indices: arrays.indices};
			cubeBuff = twgl.createBufferInfoFromArrays(gl, cube);
        }
		var loadTex = function(gl, url, color) {
			var px = gl.TEXTURE_CUBE_MAP_POSITIVE_X;
			var opt = {target: gl.TEXTURE_CUBE_MAP, 
				cubeFaceOrder: [px + 1, px + 4, px, px + 5, px + 2, px + 3], 
				color: color || [0, 0, 0, 1], 
				src: url};
			return twgl.createTexture(gl, opt, function(err, t, img) {
				twgl.setTextureFromElement(gl, t, img, opt);
			});
		};
		var self = this;
		if (this.textureUrls) {
			parts.forEach(function(part) {
				if (!self[part + 'Tex']) self[part + 'Tex'] = loadTex(gl, self.textureUrls[part] || ("imgs/" + part + "_texture.png"), self.color[part]);
			});
		}
        this.position = [0, 11, 0];
		this.limbAng = 0;
		this.prevState = 0;
        this.state = 0; 
		this.randomWalk = true; 
		this.currStride = Math.random() < 0.5 ? -1 : 1;
        this.wait = getRandomInt(250,750);
        this.lastTime = 0;
    };
    Human.prototype.draw = function(drawingState) {
		if (!drawingState.toFramebuffer)
			advance(this,drawingState);
		var centerMat = twgl.m4.identity();
		twgl.m4.rotateY(centerMat, this.orientation, centerMat);
        twgl.m4.setTranslation(centerMat, this.position, centerMat);
		twgl.m4.multiply(centerMat, twgl.m4.scaling([0.4, 0.4, 0.4]), centerMat);
        var gl = drawingState.gl;
        gl.useProgram(shaderProgram.program);
		if (drawingState.drawShadow)
			twgl.setUniforms(shaderProgram, { view: drawingState.sunView, proj: drawingState.sunProj, 
				depthTexture: drawingState.emptyTexture, drawShadow: 1});
		else 
			twgl.setUniforms(shaderProgram, { view:drawingState.view, proj:drawingState.proj, 
				depthTexture: drawingState.depthTexture, drawShadow: 0});
		twgl.setUniforms(shaderProgram, {lightdir:drawingState.sunDirection, sunView: drawingState.sunView, 
			sunProj: drawingState.sunProj});
			
		var normTrans = twgl.m4.identity();
		var bodyMat = twgl.m4.identity();
		twgl.m4.scale(bodyMat, [1, 2, 0.5], bodyMat);
		twgl.m4.multiply(bodyMat, centerMat, bodyMat);
		twgl.m4.transpose(twgl.m4.inverse(bodyMat, normTrans), normTrans);
		twgl.setUniforms(shaderProgram, {model: bodyMat, normTrans: normTrans, cubecolor: this.color.body});
		if (this.bodyTex) {
			twgl.setUniforms(shaderProgram, {useTexture: 1, uTexture: this.bodyTex});
		}
        twgl.setBuffersAndAttributes(gl,shaderProgram, cubeBuff);
        twgl.drawBufferInfo(gl, gl.TRIANGLES, cubeBuff);
		twgl.setUniforms(shaderProgram, {useTexture: 0});
		var headMat = twgl.m4.translation([0, 1.6, 0]);
		twgl.m4.multiply(headMat, centerMat, headMat);
		twgl.m4.transpose(twgl.m4.inverse(headMat, normTrans), normTrans);
		twgl.setUniforms(shaderProgram, {model: headMat, normTrans: normTrans, cubecolor: this.color.head,});
		if (this.headTex) {
			twgl.setUniforms(shaderProgram, {useTexture: 1, uTexture: this.headTex});
		}
        twgl.drawBufferInfo(gl, gl.TRIANGLES, cubeBuff);
		twgl.setUniforms(shaderProgram, {useTexture: 0});
		
		// draw left arm
		var leftArmMat = twgl.m4.identity();
		twgl.m4.scale(leftArmMat, [0.5, 2, 0.5], leftArmMat);
		twgl.m4.multiply(leftArmMat, twgl.m4.translation([0, -0.75, 0]), leftArmMat);
		twgl.m4.multiply(leftArmMat, twgl.m4.rotationX(this.limbAng), leftArmMat);
		twgl.m4.multiply(leftArmMat, twgl.m4.translation([0.75 + 0.75 / 2, 0.75, 0]), leftArmMat);
		twgl.m4.multiply(leftArmMat, centerMat, leftArmMat);
		twgl.m4.transpose(twgl.m4.inverse(leftArmMat, normTrans), normTrans);
		twgl.setUniforms(shaderProgram, {model: leftArmMat, normTrans: normTrans, cubecolor: this.color.arms});
		if (this.armTex) {
			twgl.setUniforms(shaderProgram, {useTexture: 1, uTexture: this.armTex});
		}
		twgl.drawBufferInfo(gl, gl.TRIANGLES, cubeBuff);
		twgl.setUniforms(shaderProgram, {useTexture: 0});
		
		
		var rightArmMat = twgl.m4.identity();
		twgl.m4.scale(rightArmMat, [0.5, 2, 0.5], rightArmMat);
		twgl.m4.multiply(rightArmMat, twgl.m4.translation([0, -0.75, 0]), rightArmMat);
		twgl.m4.multiply(rightArmMat, twgl.m4.rotationX(-this.limbAng), rightArmMat);
		twgl.m4.multiply(rightArmMat, twgl.m4.translation([-0.75 - 0.75 / 2, 0.75, 0]), rightArmMat);
		twgl.m4.multiply(rightArmMat, centerMat, rightArmMat);
		twgl.m4.transpose(twgl.m4.inverse(rightArmMat, normTrans), normTrans);
		twgl.setUniforms(shaderProgram, {model: rightArmMat, normTrans: normTrans, cubecolor: this.color.arms});
		if (this.armTex) {
			twgl.setUniforms(shaderProgram, {useTexture: 1, uTexture: this.armTex});
		}
		twgl.drawBufferInfo(gl, gl.TRIANGLES, cubeBuff);
		twgl.setUniforms(shaderProgram, {useTexture: 0});
		
		var sign = this.limbAng >= 0 ? 1 : -1;
		
		var leftLegMat = twgl.m4.identity();
		twgl.m4.scale(leftLegMat, [0.5, 3, 0.5], leftLegMat);
		twgl.m4.multiply(leftLegMat, twgl.m4.translation([0, -1, sign * 0.75 / 2]), leftLegMat);
		twgl.m4.multiply(leftLegMat, twgl.m4.rotationX(-this.limbAng), leftLegMat);
		twgl.m4.multiply(leftLegMat, twgl.m4.translation([0.75 / 2, -1, sign * -0.75 / 2]), leftLegMat);
		twgl.m4.multiply(leftLegMat, centerMat, leftLegMat);
		twgl.m4.transpose(twgl.m4.inverse(leftLegMat, normTrans), normTrans);
		twgl.setUniforms(shaderProgram, {model: leftLegMat, normTrans: normTrans, cubecolor: this.color.legs});
		if (this.legTex) {
			twgl.setUniforms(shaderProgram, {useTexture: 1, uTexture: this.legTex});
		}
		twgl.drawBufferInfo(gl, gl.TRIANGLES, cubeBuff);
		twgl.setUniforms(shaderProgram, {useTexture: 0});
		var rightLegMat = twgl.m4.identity();
		twgl.m4.scale(rightLegMat, [0.5, 3, 0.5], rightLegMat);
		twgl.m4.multiply(rightLegMat, twgl.m4.translation([0, -1, -sign * 0.75 / 2]), rightLegMat);
		twgl.m4.multiply(rightLegMat, twgl.m4.rotationX(this.limbAng), rightLegMat);
		twgl.m4.multiply(rightLegMat, twgl.m4.translation([-0.75 / 2, -1, -sign * -0.75 / 2]), rightLegMat);
		twgl.m4.multiply(rightLegMat, centerMat, rightLegMat);
		twgl.m4.transpose(twgl.m4.inverse(rightLegMat, normTrans), normTrans);
		twgl.setUniforms(shaderProgram, {model: rightLegMat, normTrans: normTrans, cubecolor: this.color.legs});
		if (this.legTex) {
			twgl.setUniforms(shaderProgram, {useTexture: 1, uTexture: this.legTex});
		}
		twgl.drawBufferInfo(gl, gl.TRIANGLES, cubeBuff);
		twgl.setUniforms(shaderProgram, {useTexture: 0});
		
    };
    Human.prototype.center = function(drawingState) {
        return this.position;
    }


    var strideSpeed = 1.5/1000;         
    function getRandomInt(min, max) {
        return Math.floor(Math.random() * (max - min)) + min;
    }
    function advance(human, drawingState) {
        if (!human.lastTime) {
            human.lastTime = drawingState.realtime;
            return;
        }
        var delta = Math.min(50, drawingState.realtime - human.lastTime);
        human.lastTime = drawingState.realtime;
        switch (human.state) {
            case 0: 
                if (human.wait > 0) { human.wait -= delta; }
                else if (human.randomWalk) {
					human.wait = 0;
					var rand = Math.random();
					if (rand < 0.05) { 
						human.prevState = 0;
						human.state = 0;
						human.wait = getRandomInt(200, 500);
					} else if (rand < 0.15) { 
						if (!human.jumpTime)
							human.jumpTime = 0;
					} else if (rand < 0.4) { 
						human.dstAng = (Math.random() - 0.5) * 2 * Math.PI;
					} else {
						if (human.prevState != 2)
							human.currStride = Math.random() < 0.5 ? -1 : 1;
						human.prevState = 0;
						human.state = 1;
					}
                } else {
					if (drawingState.keysdown[87]) { 
						if (!human.jumpTime)
							human.state = 1;
					}
				}
                break;
            case 1: 
                if (human.limbAng * human.currStride < 0.5) { 
					var step = human.currStride * delta * strideSpeed;
                    human.position[1] = 2 * Math.cos(human.limbAng + step) + 1;
					var forward = human.currStride * 2 * (Math.sin(human.limbAng + step) - Math.sin(human.limbAng));
					human.position[0] += forward * Math.sin(human.orientation);
					human.position[2] += forward * Math.cos(human.orientation);
					human.limbAng += step;
                } else { 
					human.prevState = 1;
					human.state = 2;
                }
                break;
			case 2: 
				if (human.limbAng * human.currStride >  0) { 
					var step = human.currStride * delta * strideSpeed;
                    human.position[1] = 2 * Math.cos(human.limbAng - step) + 1;
					var forward = human.currStride * 2 * (Math.sin(human.limbAng) - Math.sin(human.limbAng - step));
					human.position[0] += forward * Math.sin(human.orientation);
					human.position[2] += forward * Math.cos(human.orientation);
					human.limbAng -= step;
                } else { 
					human.currStride *= -1;
					human.prevState = 2;
					human.state = 0;
                }
                break;
        }
		if (!human.randomWalk) {
			if (drawingState.keysdown[65]) {
				human.dstAng = 1;
			} else if (drawingState.keysdown[68]) {
				human.dstAng = -1;
			}
			if (drawingState.keysdown[32]) {
				if (!human.jumpTime) {
					human.jumpTime = 50;
				}
			}
		}
		if (human.dstAng) {
			var step = human.dstAng * 0.08;
			human.orientation += step;
			human.dstAng -= step;
			if (Math.abs(human.dstAng) < 0.001) {
				human.dstAng = 0;
			}
		}
		if (human.jumpTime) {
			human.jumpTime--;
            human.position[1] = 0 + 0 / 625 * human.jumpTime * (50 - human.jumpTime);
		}
		if (human.position[0] < -12.5)
			human.position[0] += 25;
		else if (human.position[0] > 12.5)
			human.position[0] -= 25;
		if (human.position[2] < -12.5)
			human.position[2] += 25;
		else if (human.position[2] > 12.5)
			human.position[2] -= 25;
    }
})();



grobjects.push(new Human("grey", {body: [0.7, 0.7, 0.7], head: [1,0,0], arms: [0.7, 0.7, 0.7], legs: [0.7, 0.7, 0.7],}, {}));
grobjects.push(new Human("grey", {body: [0.7, 0.7, 0.7], head: [0,0,1], arms: [0.7, 0.7, 0.7], legs: [0.7, 0.7, 0.7],}, {}));
grobjects.push(new Human("grey", {body: [0.7, 0.7, 0.7], head: [1,0,0], arms: [0.7, 0.7, 0.7], legs: [0.7, 0.7, 0.7],}, {}));
grobjects.push(new Human("grey", {body: [0.7, 0.7, 0.7], head: [0,0,1], arms: [0.7, 0.7, 0.7], legs: [0.7, 0.7, 0.7],}, {}));
grobjects.push(new Human("grey", {body: [0.7, 0.7, 0.7], head: [1,0,0], arms: [0.7, 0.7, 0.7], legs: [0.7, 0.7, 0.7],}, {}));
grobjects.push(new Human("grey", {body: [0.7, 0.7, 0.7], head: [0,0,1], arms: [0.7, 0.7, 0.7], legs: [0.7, 0.7, 0.7],}, {}));
grobjects.push(new Human("grey", {body: [0.7, 0.7, 0.7], head: [1,0,0], arms: [0.7, 0.7, 0.7], legs: [0.7, 0.7, 0.7],}, {}));
grobjects.push(new Human("grey", {body: [0.7, 0.7, 0.7], head: [0,0,1], arms: [0.7, 0.7, 0.7], legs: [0.7, 0.7, 0.7],}, {}));
grobjects.push(new Human("grey", {body: [0.7, 0.7, 0.7], head: [1,0,0], arms: [0.7, 0.7, 0.7], legs: [0.7, 0.7, 0.7],}, {}));
grobjects.push(new Human("grey", {body: [0.7, 0.7, 0.7], head: [0,0,1], arms: [0.7, 0.7, 0.7], legs: [0.7, 0.7, 0.7],}, {}));
grobjects.push(new Human("grey", {body: [0.7, 0.7, 0.7], head: [1,0,0], arms: [0.7, 0.7, 0.7], legs: [0.7, 0.7, 0.7],}, {}));
grobjects.push(new Human("grey", {body: [0.7, 0.7, 0.7], head: [1,0,0], arms: [0.7, 0.7, 0.7], legs: [0.7, 0.7, 0.7],}, {}));
grobjects.push(new Human("grey", {body: [0.7, 0.7, 0.7], head: [1,0,0], arms: [0.7, 0.7, 0.7], legs: [0.7, 0.7, 0.7],}, {}));
grobjects.push(new Human("grey", {body: [0.7, 0.7, 0.7], head: [1,0,0], arms: [0.7, 0.7, 0.7], legs: [0.7, 0.7, 0.7],}, {}));
grobjects.push(new Human("grey", {body: [0.7, 0.7, 0.7], head: [1,0,0], arms: [0.7, 0.7, 0.7], legs: [0.7, 0.7, 0.7],}, {}));
grobjects.push(new Human("grey", {body: [0.7, 0.7, 0.7], head: [1,0,0], arms: [0.7, 0.7, 0.7], legs: [0.7, 0.7, 0.7],}, {}));
grobjects.push(new Human("grey", {body: [0.7, 0.7, 0.7], head: [1,0,0], arms: [0.7, 0.7, 0.7], legs: [0.7, 0.7, 0.7],}, {}));
grobjects.push(new Human("grey", {body: [0.7, 0.7, 0.7], head: [1,0,0], arms: [0.7, 0.7, 0.7], legs: [0.7, 0.7, 0.7],}, {}));
grobjects.push(new Human("grey", {body: [0.7, 0.7, 0.7], head: [1,0,0], arms: [0.7, 0.7, 0.7], legs: [0.7, 0.7, 0.7],}, {}));
grobjects.push(new Human("grey", {body: [0.7, 0.7, 0.7], head: [1,0,0], arms: [0.7, 0.7, 0.7], legs: [0.7, 0.7, 0.7],}, {}));
grobjects.push(new Human("grey", {body: [0.7, 0.7, 0.7], head: [1,0,0], arms: [0.7, 0.7, 0.7], legs: [0.7, 0.7, 0.7],}, {}));
grobjects.push(new Human("grey", {body: [0.7, 0.7, 0.7], head: [1,0,0], arms: [0.7, 0.7, 0.7], legs: [0.7, 0.7, 0.7],}, {}));
grobjects.push(new Human("grey", {body: [0.7, 0.7, 0.7], head: [1,0,0], arms: [0.7, 0.7, 0.7], legs: [0.7, 0.7, 0.7],}, {}));
grobjects.push(new Human("grey", {body: [0.7, 0.7, 0.7], head: [1,0,0], arms: [0.7, 0.7, 0.7], legs: [0.7, 0.7, 0.7],}, {}));
grobjects.push(new Human("grey", {body: [0.7, 0.7, 0.7], head: [1,0,0], arms: [0.7, 0.7, 0.7], legs: [0.7, 0.7, 0.7],}, {}));
grobjects.push(new Human("grey", {body: [0.7, 0.7, 0.7], head: [1,0,0], arms: [0.7, 0.7, 0.7], legs: [0.7, 0.7, 0.7],}, {}));
grobjects.push(new Human("grey", {body: [0.7, 0.7, 0.7], head: [1,0,0], arms: [0.7, 0.7, 0.7], legs: [0.7, 0.7, 0.7],}, {}));
grobjects.push(new Human("grey", {body: [0.7, 0.7, 0.7], head: [1,0,0], arms: [0.7, 0.7, 0.7], legs: [0.7, 0.7, 0.7],}, {}));
grobjects.push(new Human("grey", {body: [0.7, 0.7, 0.7], head: [1,0,0], arms: [0.7, 0.7, 0.7], legs: [0.7, 0.7, 0.7],}, {}));
grobjects.push(new Human("grey", {body: [0.7, 0.7, 0.7], head: [1,0,0], arms: [0.7, 0.7, 0.7], legs: [0.7, 0.7, 0.7],}, {}));
grobjects.push(new Human("grey", {body: [0.7, 0.7, 0.7], head: [1,0,0], arms: [0.7, 0.7, 0.7], legs: [0.7, 0.7, 0.7],}, {}));
grobjects.push(new Human("grey", {body: [0.7, 0.7, 0.7], head: [0,0,1], arms: [0.7, 0.7, 0.7], legs: [0.7, 0.7, 0.7],}, {}));



