// Pass‑through vertex shader *with* p5 projection
attribute vec3 aPosition;

uniform mat4 uModelViewMatrix;
uniform mat4 uProjectionMatrix;

void main() {
    gl_Position = uProjectionMatrix * uModelViewMatrix
                * vec4(aPosition, 1.0);
}
