precision highp float;

#define MAX_DOTS 500            // ≥ dotCount (190 for 2880×1440)

uniform vec2  iResolution;
uniform vec3  dots[MAX_DOTS];   // (x,y,r) in pixels (top‑left origin)
uniform int   dotCount;
uniform float uStrength;

void main() {
    vec2 p = gl_FragCoord.xy;
    p.y = iResolution.y - p.y;  // flip to match JS coords

    float field = 0.0;
    for (int i = 0; i < MAX_DOTS; i++) {
        if (i >= dotCount) break;
        vec3 d = dots[i];
        vec2 dp = p - d.xy;
        field += uStrength * (d.z * d.z) / (dot(dp, dp) + 1.0);
    }
    gl_FragColor = vec4(vec3(step(1.0, field)), 1.0);
}
