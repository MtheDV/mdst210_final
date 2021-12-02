p5.disableFriendlyErrors = true;

let dcgan;
let canvas;
let density;

let showUI = false;

let generatedImages = [];
let generatedImagesWidth = 128;
let generatedImagesHeight = 128;
let numberOfGeneratedImages = 2;
let generatedImageFrequency = 0.5;
let selectedImageIndex = 0;

let pixelateFactor = 2;
let pixelateFactorMin = 1;
let pixelateFactorMax = 18;
let pixelateNoiseX = 0;

let fft;
let oscillatorMouse;
let oscillatorKeyboard;
let oscillatorKeyboardFreq = 100;
let xOffsetFromFreq = 0;
let maxOscillatorFreq = 400;
let minOscillatorFreq = 100;

let noiseMouseX = 0;
let noiseMouseY = 0;
let noiseMouseXTo = 0;
let noiseMouseYTo = 0;

function preload() {
  dcgan = ml5.DCGAN('manifest.json');
}

async function setup() {
  canvas = createCanvas(755, 720);
  density = pixelDensity();
  background(255);
  fill(0);
  text('Loading DCGAN Generated Images...', 0, 20);
  
  oscillatorMouse = new p5.Oscillator('triangle');
  oscillatorMouse.start();
  oscillatorMouse.amp(0.5, 0.2);
  oscillatorKeyboard = new p5.Oscillator('sine');
  oscillatorKeyboard.start();
  oscillatorKeyboard.amp(0.1, 0.2);
  fft = new p5.FFT();
  
  console.log('Loading DCGAN Generated Images...');
  await generateImages().then(() => {
    console.log('Ready! Generated', generatedImages.length, 'images.');
  });
}

/**
 * Generate images using the DCGAN generator
 * @return {Promise<void>}
 */
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

/**
 * Generate images that will allow for a smooth flow between latents
 * @param from
 * @param to
 * @return {Promise<void>}
 */
async function generateInterpolatedImages(from, to) {
  for (let amt = 0; amt <= 1; amt += generatedImageFrequency) {
    let latent = [];
    for (let i = 0; i < 128; i++) {
      latent[i] = lerp(from[i], to[i], amt);
    }
    await dcgan.generate(addGeneratedImageToImages, latent);
  }
}

/**
 * Add the generated image to the array of images
 * @param err
 * @param result
 */
function addGeneratedImageToImages(err, result) {
  if (err) {
    console.log(err);
    return;
  }
  result.image.resize(generatedImagesWidth, generatedImagesHeight);
  generatedImages.push(result.image);
  console.log('New Image #', generatedImages.length);
}

function draw() {
  background(255);
  
  // MOUSE MOVEMENTS
  noiseMouseX = lerp(noiseMouseX, noiseMouseXTo, 0.01);
  noiseMouseY = lerp(noiseMouseY, noiseMouseYTo, 0.01);
  
  // SOUNDS
  let freq = constrain(map(noiseMouseX, 0, width, minOscillatorFreq, maxOscillatorFreq), minOscillatorFreq, maxOscillatorFreq);
  let amp = constrain(map(noiseMouseY, height, 0, 0, 1), 0, 1);
  
  oscillatorMouse.freq(freq, 0.2);
  oscillatorMouse.amp(amp, 0.3);
  oscillatorKeyboard.amp(amp, 0.1);
  xOffsetFromFreq = oscillatorKeyboard.getFreq();
  
  if (xOffsetFromFreq > maxOscillatorFreq) xOffsetFromFreq = maxOscillatorFreq;
  oscillatorKeyboard.freq(oscillatorKeyboardFreq, 0.4);
  
  // UPDATING PIXELATION BASED ON FREQUENCY
  pixelateFactor = Math.ceil(pixelateFactorMax - map(oscillatorMouse.getFreq(), minOscillatorFreq, maxOscillatorFreq, pixelateFactorMin, pixelateFactorMax));
  if (pixelateFactor > pixelateFactorMax) pixelateFactor = pixelateFactorMax;
  if (pixelateFactor < 1) pixelateFactor = 1;
  
  // IMAGE TRANSITION SPEED BASED ON AMPLITUDE
  selectedImageIndex += oscillatorMouse.getAmp();
  if (selectedImageIndex >= generatedImages.length) {
    selectedImageIndex = 0;
  }
  
  // DRAW GENERATED IMAGES AND APPLY PIXELATION TO THEM
  if (generatedImages.length > 0) {
    let generatedImage = generatedImages[Math.floor(selectedImageIndex)];
    let duplicateGeneratedImage = createImage(width, height)
    generatedImage.loadPixels();
    duplicateGeneratedImage.loadPixels();
    const imageScaleWidth = Math.ceil(width / generatedImage.width);
    const imageScaleHeight = Math.ceil(height / generatedImage.height);
    for (let y = 0; y < generatedImage.height; y += pixelateFactor) {
      for (let x = 0; x < generatedImage.width; x += pixelateFactor) {
        const [red, green, blue, alpha] = getColor(generatedImage, x, y);
        for (let pX = 0; pX < pixelateFactor * imageScaleWidth; ++pX) {
          for (let pY = 0; pY < pixelateFactor * imageScaleHeight; ++pY) {
            const sX = x * imageScaleWidth + pX;
            const sY = y * imageScaleHeight + pY;
            if (sX < width && sY < height)
              writeColor(duplicateGeneratedImage, sX, sY, red, green, blue, alpha);
          }
        }
      }
    }
    duplicateGeneratedImage.updatePixels();
    filter(POSTERIZE, constrain(map(oscillatorKeyboard.getFreq(), minOscillatorFreq, maxOscillatorFreq, 2, 15), 2, 15));
    image(duplicateGeneratedImage, 0, 0);
  }
  
  // DISPLAY UI ELEMENTS FOR INFORMATION
  if (showUI) {
    fill(0);
    text(`Pixel Factor: ${pixelateFactor.toString()}`, 20, 20);
    text(`Oscillator Freq: ${oscillatorMouse.getFreq()}`, 20, 40);
    text(`Oscillator Amp: ${oscillatorMouse.getAmp()}`, 20, 60);
    text(`Keyboard Oscillator Freq: ${oscillatorKeyboard.getFreq()}`, 20, 80);
    text(`Keyboard Oscillator Amp: ${oscillatorKeyboard.getAmp()}`, 20, 100);
  }
}

/**
 * Uses row major to get where a pixels array index will be
 * @param x
 * @param y
 * @param width
 * @return {number}
 */
function getRowMajor(x, y, width) {
  return (x + y * width) * 4;
}

/**
 * Gets the RGBA values at a certain position
 * @param image
 * @param x
 * @param y
 * @return {*[]}
 */
function getColor(image, x, y) {
  let index = getRowMajor(x, y, image.width);
  return [
    image.pixels[index],
    image.pixels[index + 1],
    image.pixels[index + 2],
    image.pixels[index + 3]
  ];
}

/**
 * Writes RGBA colours to a coordinate
 * @param image
 * @param x
 * @param y
 * @param red
 * @param green
 * @param blue
 * @param alpha
 */
function writeColor(image, x, y, red, green, blue, alpha) {
  let index = getRowMajor(x, y, image.width);
  image.pixels[index] = red;
  image.pixels[index + 1] = green;
  image.pixels[index + 2] = blue;
  image.pixels[index + 3] = alpha;
}

function keyPressed() {
  for (let i = 0; i < 10; ++i) {
    if (keyCode - 48 === i) {
      // If a ket from 0 to 9 is pressed, change the keyboard oscillator frequency and mouse coordinates
      oscillatorKeyboardFreq = ((maxOscillatorFreq - minOscillatorFreq) / 10 * i) + 1;
      noiseMouseXTo = ((width / 10) * i) + (Math.random() * (width / 10));
      noiseMouseYTo = (Math.random() * height);
    }
  }
}