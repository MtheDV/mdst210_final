/**
 * MDST 210 Final Project
 * - Built by Mathew de Vin
 * DCGAN training done on small gradient dataset (~8 hours) (~50 images)
 * with a 128x128px image output
 *
 * To modify the number of latents/images generated, and number of images
 * between each latent/image, modify the `numberOfGeneratedImages` and
 * `generatedImageFrequency` respectively
 *
 * The sliders modify the following values:
 *   1. Image alpha
 *   2. Noise additive speed
 *   3. Image transition speed
 *   4. Minimum posterize value
 *   5. Maximum posterize value
 *   6. Minimum pixelate factor value
 *   7. Maximum pixelate factor value
 *
 * To record the project, press the 'r' key, then press the 'r' key
 * again to stop recording and download the frames
 */

// noprotect
p5.disableFriendlyErrors = true;

// VARIABLES
let dcgan;
let canvas;
let density;

let showUI = false;
let displayGeneratingUI = true;
let totalGeneratedImages = 0;

// Canvas Capture
let capturer;
let fps = 30;
let recordVideo = false;

// Noise
let noiseIndex = 0;

// Generated Images
let generatedImages = [];
let generatedImagesWidth = 128;
let generatedImagesHeight = 128;
let numberOfGeneratedImages = 3;
let generatedImageFrequency = 0.01;
let selectedImageIndex = 0;

// Pixelation
let pixelateFactor = 2;
let pixelateFactorMin = 1;
let pixelateFactorMax = 16;

// Sliders
let alphaSlider;
let noiseIndexAdditiveSlider;
let selectedImageSpeedSlider;
let minPosterizeVal;
let maxPosterizeVal;
let pixelateFactorMinSlider;
let pixelateFactorMaxSlider;

/**
 * Load DCGAN training data
 */
function preload() {
  dcgan = ml5.DCGAN('manifest_online.json');
}

/**
 * Setup canvas, create oscillators, and start generating images
 * @return {Promise<void>}
 */
async function setup() {
  // CANVAS SETUP
  canvas = createCanvas(777, 720);
  density = pixelDensity(1);
  background(255);
  
  // CANVAS CAPTURE
  capturer = new CCapture({ format: 'png', framerate: fps});
  frameRate(fps);
  
  // SLIDERS
  alphaSlider = createSlider(0, 255, 125, 1);
  alphaSlider.position(width + 50, 20);
  
  noiseIndexAdditiveSlider = createSlider(0, 0.1, 0.005, 0.005);
  noiseIndexAdditiveSlider.position(width + 50, 45);
  
  selectedImageSpeedSlider = createSlider(0, 2, 1, 0.5);
  selectedImageSpeedSlider.position(width + 50, 70);
  
  minPosterizeVal = createSlider(2, 255, 2, 1);
  minPosterizeVal.position(width + 50, 110);
  maxPosterizeVal = createSlider(2, 255, 255, 1);
  maxPosterizeVal.position(width + 50, 135);
  
  pixelateFactorMinSlider = createSlider(pixelateFactorMin, pixelateFactorMax, pixelateFactorMin, 1);
  pixelateFactorMinSlider.position(width + 50, 175);
  pixelateFactorMaxSlider = createSlider(pixelateFactorMin, pixelateFactorMax, pixelateFactorMax, 1);
  pixelateFactorMaxSlider.position(width + 50, 200);
  
  // GENERATE IMAGES
  console.log('Loading DCGAN Generated Images...');
  await generateImages().then(() => {
    console.log('Ready! Generated', generatedImages.length, 'images.');
    displayGeneratingUI = false;
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
  totalGeneratedImages++;
  console.log('New Image #', generatedImages.length);
}

function draw() {
  // NOISE VALUE
  noiseIndex += noiseIndexAdditiveSlider.value();
  
  // UPDATING PIXELATION BASED ON NOISE
  pixelateFactor = Math.floor(constrain(pixelateFactorMax - map(noise(noiseIndex), 0, 1, pixelateFactorMinSlider.value(), pixelateFactorMaxSlider.value()), pixelateFactorMinSlider.value(), pixelateFactorMaxSlider.value()));
  
  // IMAGE TRANSITION SPEED
  selectedImageIndex += selectedImageSpeedSlider.value();
  if (selectedImageIndex >= generatedImages.length) {
    selectedImageIndex = 0;
  }
  
  // DRAW GENERATED IMAGES AND APPLY PIXELATION TO THEM FROM PIXELATEFACTOR
  // APPLY POSTERIZE FILTER FOR EFFECT BASED ON NOISE
  if (generatedImages.length > 0) {
    let generatedImage = generatedImages[Math.floor(selectedImageIndex)];
    let duplicateGeneratedImage = createImage(width, height)
    generatedImage.loadPixels();
    duplicateGeneratedImage.loadPixels();
    const imageScaleWidth = Math.ceil(width / generatedImage.width);
    const imageScaleHeight = Math.ceil(height / generatedImage.height);
    for (let y = 0; y < generatedImage.height; y += pixelateFactor) {
      for (let x = 0; x < generatedImage.width; x += pixelateFactor) {
        let [red, green, blue, alpha] = getColor(generatedImage, x, y);
        alpha = alphaSlider.value();
        for (let pX = 0; pX < pixelateFactor * imageScaleWidth; ++pX) {
          for (let pY = 0; pY < pixelateFactor * imageScaleHeight; ++pY) {
            const sX = x * imageScaleWidth + pX;
            const sY = y * imageScaleHeight + pY;
            if (sX < width && sY < height) {
              writeColor(duplicateGeneratedImage, sX, sY, red, green, blue, alpha);
            }
          }
        }
      }
    }
    duplicateGeneratedImage.updatePixels();
    duplicateGeneratedImage.filter(POSTERIZE, constrain(map(noise(noiseIndex), 0, 1, minPosterizeVal.value(), maxPosterizeVal.value()), minPosterizeVal.value(), maxPosterizeVal.value()));
    image(duplicateGeneratedImage, 0, 0);
  }
  
  // DISPLAY UI ELEMENTS FOR INFORMATION
  fill(255);
  noStroke();
  if (showUI || displayGeneratingUI) rect(0, 0, width, 60);
  fill(0);
  if (displayGeneratingUI) {
    text('Loading DCGAN Generated Images...', 20, 20);
    text(`Generated Images ${totalGeneratedImages}/${(numberOfGeneratedImages / generatedImageFrequency)}`, 20, 40);
  }
  if (showUI) {
    text(`Pixel Factor: ${pixelateFactor.toString()}`, 20, 20);
    text(`Noise Index: ${noiseIndex}`, 20, 40);
  }
  
  // CAPTURE FRAME
  capturer.capture(document.getElementById('defaultCanvas0'));
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

/**
 * If the 'r' key is pressed, then start recording. If it is
 * pressed again, stop recording and download frames
 */
function keyPressed() {
  if (keyCode === 82) {
    if (recordVideo) {
      capturer.save();
    } else {
      capturer.stop();
      capturer.start();
    }
    recordVideo = !recordVideo;
  }
}
