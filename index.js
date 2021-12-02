/**
 * Plan:
 *  - [x] Train model on some of my art that I'll make
 *  - [x] In the setup function, generate a 2d array of many images, interpolating between them
 *  - [?] Allow an audio input that traverses the array based on certain average frequency/pitch being played?
 *  - [x] Display image
 *  - [ ] Have image small, and bounce around the screen/do stuff, and then have the background not refresh
 */
p5.disableFriendlyErrors = true;

let sound;
let analyzer;
let dcgan;
let canvas;
let density;

let generatedImages = [];
let generatedImagesWidth = 128;
let generatedImagesHeight = 128;
let generatedImagesPosition = new p5.Vector(0, 0);
let generatedImagesVelocity = new p5.Vector(0, 0);
let generatedImagesAcceleration = new p5.Vector(0, 0);
let numberOfGeneratedImages = 2;
let generatedImageFrequency = 0.1;
let selectedImageIndex = 0;

function preload() {
  sound = loadSound('assets/wolfgang_amadeus_mozart_the_marriage_of_figaro.mp3');
  dcgan = ml5.DCGAN('manifest.json');
}

async function setup() {
  canvas = createCanvas(755, 720);
  density = pixelDensity();
  background(0);
  fill(255);
  text('Loading DCGAN Generated Images...', 0, 20);
  
  // sound.loop();
  analyzer = new p5.Amplitude();
  analyzer.setInput(sound);
  
  await generateImages().then(() => {
    console.log('ready!');
    console.log(generatedImages.length);
    background(0);
  });
}

async function generateImages() {
  let latents = [];
  for (let i = 0; i < numberOfGeneratedImages; ++i) {
    let latent = [];
    for (let i = 0; i < 128; ++i) {
      latent.push(random(-1, 1));
    }
    latents.push(latent);
  }
  
  let firstLatent = latents[0];
  let previousLatent = latents[0];
  for (let i = 1; i < latents.length; ++i) {
    await generateInterpolatedImages(previousLatent, latents[i]);
    previousLatent = latents[i];
  }
  await generateInterpolatedImages(previousLatent, firstLatent);
}

async function generateInterpolatedImages(from, to) {
  for (let amt = 0; amt <= 1; amt += generatedImageFrequency) {
    let latent = [];
    for (let i = 0; i < 128; i++) {
      latent[i] = lerp(from[i], to[i], amt);
    }
    await dcgan.generate(addGeneratedImageToImages, latent);
  }
}

function addGeneratedImageToImages(err, result) {
  if (err) {
    console.log(err);
    return;
  }
  result.image.resize(generatedImagesWidth, generatedImagesHeight);
  generatedImages.push(result.image);
}

function draw() {
  
  // let rms = analyzer.getLevel() * 5;
  // if (rms > 1) {
  //   rms = 1;
  // }
  // rms = map(rms, 0, 1, 0, numberOfGeneratedImages / generatedImageFrequency);
  // selectedImageIndex = lerp(selectedImageIndex, rms, generatedImageFrequency);
  
  selectedImageIndex += 0.2;
  if (selectedImageIndex >= generatedImages.length) {
    selectedImageIndex = 0;
  }
  
  interactWithMouse(mouseX, mouseY);
  
  updatePosition()
  updateVelocity()
  updateAcceleration()
  
  if (generatedImages.length >= numberOfGeneratedImages / generatedImageFrequency) {
    let generatedImage = generatedImages[Math.floor(selectedImageIndex)];
    let duplicateGeneratedImage = createImage(generatedImage.width, generatedImage.height)
    generatedImage.loadPixels();
    duplicateGeneratedImage.loadPixels();
    for (let y = 0; y < duplicateGeneratedImage.height; y++) {
      for (let x = 0; x < duplicateGeneratedImage.width; x++) {
        const [red, green, blue, alpha] = getColor(generatedImage, x, y);
        writeColor(duplicateGeneratedImage, x, y, red, green, blue, alpha);
      }
    }
    duplicateGeneratedImage.updatePixels();
    if (mouseIsPressed) {
      duplicateGeneratedImage.resize(10, 10);
    }
    image(duplicateGeneratedImage, generatedImagesPosition.x, generatedImagesPosition.y);
  }
}

function keyPressed() {
  if (keyCode === 68) {
    let canvasScreenshot = createImage(width * density, height * density);
    canvasScreenshot.copy(canvas, 0, 0, width, height, 0, 0, width * density, height * density);
    canvasScreenshot.loadPixels();
    for (let y = 0; y < canvasScreenshot.height; y++) {
      for (let x = 0; x < canvasScreenshot.width; x++) {
        if (Math.random() >= 0.5) {
          writeColor(canvasScreenshot, x, y, 255, 0, 0, 255);
        }
      }
    }
    canvasScreenshot.updatePixels();
    image(canvasScreenshot, 0, 0, width, height);
  }
}

function updatePosition() {
  generatedImagesPosition.add(generatedImagesVelocity);
}

function updateVelocity() {
  generatedImagesVelocity.add(generatedImagesAcceleration);
  generatedImagesVelocity.mult(0.95);
}

function updateAcceleration() {
  generatedImagesAcceleration.mult(0);
}

function addAcceleration(xSpeed, ySpeed) {
  generatedImagesAcceleration.add(createVector(xSpeed, ySpeed));
}

function interactWithMouse(mouseX, mouseY) {
  let mouseDist = createVector(mouseX, mouseY).sub(generatedImagesPosition).normalize();
  addAcceleration(mouseDist.x, mouseDist.y);
}

function getRowMajor(x, y, width) {
  return (x + y * width) * 4;
}

function getColor(image, x, y) {
  let index = getRowMajor(x, y, image.width);
  return [
    image.pixels[index],
    image.pixels[index + 1],
    image.pixels[index + 2],
    image.pixels[index + 3]
  ];
}

function writeColor(image, x, y, red, green, blue, alpha) {
  let index = getRowMajor(x, y, image.width);
  image.pixels[index] = red;
  image.pixels[index + 1] = green;
  image.pixels[index + 2] = blue;
  image.pixels[index + 3] = alpha;
}
