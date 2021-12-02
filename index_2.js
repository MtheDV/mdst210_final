/**
 * Plan:
 *  - Gradients moving up at random speeds
 */
p5.disableFriendlyErrors = true;

let canvas;
let density;
let color1;
let color2;
let color3;
let color4;

let yPos = 0;

async function setup() {
  canvas = createCanvas(755, 720);
  density = pixelDensity();
  
  color1 = color(0, 0, 0);
  color2 = color(50, 115, 254);
  color3 = color(223, 32, 252);
}

function draw() {
  background(0);
  
  yPos -= 10;
  
  for (let i = 0; i < 10; ++i) {
    getColumn(i, width / 10,  20 * i + yPos);
    getColumnInverse(i, width / 10,  height + height / 2 + 20 * i + yPos);
  }
}

function setGradient(x, y, w, h, c1, c2) {
  noFill();
  
  for (let i = y; i <= y + h; i+=1) {
    let inter = map(i, y, y + h, 0, 1);
    let c = lerpColor(c1, c2, inter);
    stroke(c);
    line(x, i, x + w, i);
  }
}

function getColumn(index, columnWidth, y) {
  setGradient(columnWidth * index, y, columnWidth, height / 2, color1, color2);
  setGradient(columnWidth * index, y + height / 2 , columnWidth, height / 2, color2, color3);
  setGradient(columnWidth * index, y + height / 2 * 2, columnWidth, height / 2, color3, color1);
}

function getColumnInverse(index, columnWidth, y) {
  setGradient(columnWidth * index, y, columnWidth, height / 2, color1, color3);
  setGradient(columnWidth * index, y + height / 2 , columnWidth, height / 2, color3, color2);
  setGradient(columnWidth * index, y + height / 2 * 2, columnWidth, height / 2, color2, color1);
}
