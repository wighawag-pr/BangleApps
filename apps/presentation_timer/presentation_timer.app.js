let w = g.getWidth();
let h = g.getHeight();
let tTotal = Date.now();
let tStart = tTotal;
let tCurrent = tTotal;
let running = false;
let timeY = 2*h/5;
let displayInterval;
let redrawButtons = true;
let lastSlide = 0;
const iconScale = g.getWidth() / 178; // scale up/down based on Bangle 2 size

// 24 pixel images, scale to watch
// 1 bit optimal, image string, no E.toArrayBuffer()
const pause_img = atob("GBiBAf////////////////wYP/wYP/wYP/wYP/wYP/wYP/wYP/wYP/wYP/wYP/wYP/wYP/wYP/wYP/wYP/wYP////////////////w==");
const play_img = atob("GBjBAP//AAAAAAAAAAAIAAAOAAAPgAAP4AAP+AAP/AAP/wAP/8AP//AP//gP//gP//AP/8AP/wAP/AAP+AAP4AAPgAAOAAAIAAAAAAAAAAA=");
const reset_img = atob("GBiBAf////////////AAD+AAB+f/5+f/5+f/5+cA5+cA5+cA5+cA5+cA5+cA5+cA5+cA5+f/5+f/5+f/5+AAB/AAD////////////w==");

const margin = 0.5; //half a minute tolerance

//dummy default values
var slides = [
  [1.5, 1],
  [2, 2],
  [2.5, 3],
  [3,4]
];

function log_debug(o) {
  //console.log(o);
}

//first must be a number
function readSlides() {
  let csv = require("Storage").read("presentation_timer.csv");
  if(!csv) return;
  let lines = csv.split("\n").filter(e=>e);
  log_debug("Loading "+lines.length+" slides");
  slides = lines.map(line=>{let s=line.split(";");return [+s[0],s[1]];});
}


function timeToText(t) {
  let hrs = Math.floor(t/3600000);
  let mins = Math.floor(t/60000)%60;
  let secs = Math.floor(t/1000)%60;
  let tnth = Math.floor(t/100)%10;
  let text;

  if (hrs === 0)
    text = ("0"+mins).substr(-2) + ":" + ("0"+secs).substr(-2) + "." + tnth;
  else
    text = ("0"+hrs) + ":" + ("0"+mins).substr(-2) + ":" + ("0"+secs).substr(-2);

  //log_debug(text);
  return text;
}

function drawButtons() {
  log_debug("drawButtons()");
  if (!running && tCurrent == tTotal) {
    bigPlayPauseBtn.draw();
  } else if (!running && tCurrent != tTotal) {
    resetBtn.draw();
    smallPlayPauseBtn.draw();
  } else {
    bigPlayPauseBtn.draw();
  }

  redrawButtons = false;
}

//not efficient but damn easy
function findSlide(time) {
  time /= 60000;
  //change colour for the last 30 seconds
  if(time > slides[slides.length-1][0] - margin && bigPlayPauseBtn.color!="#f00") {
    bigPlayPauseBtn.color="#f00";
    drawButtons();
  }
  for(let i=0; i<slides.length; i++) {
    if(slides[i][0] > time)
      return slides[i][1];
  }
  //stop automatically
  if(time > slides[slides.length-1][0] + margin) {
    bigPlayPauseBtn.color="#0ff"; //restore
    stopTimer();
  }
  return /*LANG*/"end!";
}

function dbl_buzz() {
  Bangle.buzz(1000).then(() => {
    (new Promise(resolve=>setTimeout(resolve,500))).then(() => {
      Bangle.buzz(1000);
    });
  })
}

function wait(ms) {
  return (new Promise(resolve=>setTimeout(resolve,ms)));
}

function five_buzz() {
  return Bangle.buzz(500)
  .then(() => wait(300))
  .then(() => Bangle.buzz(500))
  .then(() => wait(300))
  .then(() => Bangle.buzz(500))
  .then(() => wait(300))
  .then(() => Bangle.buzz(500))
  .then(() => wait(300))
  .then(() => Bangle.buzz(500))
}

function drawTime() {
  log_debug("drawTime()");
  let Tt = tCurrent-tTotal;
  let Ttxt = timeToText(Tt);

  let slideNumber = findSlide(Tt);

  if (slideNumber === "end!") {
    five_buzz();
  } else {
    if (lastSlide != slideNumber) {
      lastSlide = slideNumber;
      dbl_buzz();
    }
  }
  
  Ttxt += "\n"+slideNumber;
  // total time
  g.setFont("Vector",38);  // check
  g.setFontAlign(0,0);
  g.clearRect(0, timeY - 42, w, timeY + 42);
  g.setColor(g.theme.fg);
  g.drawString(Ttxt, w/2, timeY);
}

function draw() {
  let last = tCurrent;
  if (running) tCurrent = Date.now();
  g.setColor(g.theme.fg);
  if (redrawButtons) drawButtons();
  drawTime();
}

function startTimer() {
  lastSlide = 0;
  log_debug("startTimer()");
  draw();
  displayInterval = setInterval(draw, 100);
}

function stopTimer() {
  log_debug("stopTimer()");
  if (displayInterval) {
    clearInterval(displayInterval);
    displayInterval = undefined;
  }
}

// BTN stop start
function stopStart() {
  log_debug("stopStart()");

  if (running)
    stopTimer();

  running = !running;
  Bangle.buzz();

  if (running)
    tStart = Date.now() + tStart- tCurrent;  
  tTotal = Date.now() + tTotal - tCurrent;
  tCurrent = Date.now();

  setButtonImages();
  redrawButtons = true;
  if (running) {
    startTimer();
  } else {
    draw();
  }
}

function setButtonImages() {
  if (running) {
    bigPlayPauseBtn.setImage(pause_img);
    smallPlayPauseBtn.setImage(pause_img);
    resetBtn.setImage(reset_img);
  } else {
    bigPlayPauseBtn.setImage(play_img);
    smallPlayPauseBtn.setImage(play_img);
    resetBtn.setImage(reset_img);
  }
}

// lap or reset
function lapReset() {
  log_debug("lapReset()");
  if (!running && tStart != tCurrent) {
    redrawButtons = true;
    Bangle.buzz();
    tStart = tCurrent = tTotal = Date.now();
    g.clearRect(0,24,w,h);
    draw();
  }
}

// simple on screen button class
function BUTTON(name,x,y,w,h,c,f,i) {
  this.name = name;
  this.x = x;
  this.y = y;
  this.w = w;
  this.h = h;
  this.color = c;
  this.callback = f;
  this.img = i;
}

BUTTON.prototype.setImage = function(i) {
  this.img = i;
}

// if pressed the callback
BUTTON.prototype.check = function(x,y) {
  //console.log(this.name + ":check() x=" + x + " y=" + y +"\n");
  
  if (x>= this.x && x<= (this.x + this.w) && y>= this.y && y<= (this.y + this.h)) {
    log_debug(this.name + ":callback\n");
    this.callback();
    return true;
  }
  return false;
};

BUTTON.prototype.draw = function() {
  g.setColor(this.color);
  g.fillRect(this.x, this.y, this.x + this.w, this.y + this.h);
  g.setColor("#000"); // the icons and boxes are drawn black
  if (this.img != undefined) {
    let iw = iconScale * 24;  // the images were loaded as 24 pixels, we will scale
    let ix = this.x + ((this.w - iw) /2);
    let iy = this.y + ((this.h - iw) /2);
    log_debug("g.drawImage(" + ix + "," + iy + "{scale: " + iconScale + "})");
    g.drawImage(this.img, ix, iy, {scale: iconScale}); 
  }
  g.drawRect(this.x, this.y, this.x + this.w, this.y + this.h);
};


var bigPlayPauseBtn = new BUTTON("big",0, 3*h/4 ,w, h/4, "#0ff", stopStart, play_img);
var smallPlayPauseBtn = new BUTTON("small",w/2, 3*h/4 ,w/2, h/4, "#0ff", stopStart, play_img);
var resetBtn = new BUTTON("rst",0, 3*h/4, w/2, h/4, "#ff0", lapReset, pause_img);

bigPlayPauseBtn.setImage(play_img);
smallPlayPauseBtn.setImage(play_img);
resetBtn.setImage(pause_img);


Bangle.on('touch', function(button, xy) {
  var x = xy.x;
  var y = xy.y;

  // adjust for outside the dimension of the screen
  // http://forum.espruino.com/conversations/371867/#comment16406025
  if (y > h) y = h;
  if (y < 0) y = 0;
  if (x > w) x = w;
  if (x < 0) x = 0;

  // not running, and reset
  if (!running && tCurrent == tTotal && bigPlayPauseBtn.check(x, y)) return;

  // paused and hit play
  if (!running && tCurrent != tTotal && smallPlayPauseBtn.check(x, y)) return;

  // paused and press reset
  if (!running && tCurrent != tTotal && resetBtn.check(x, y)) return;

  // must be running
  if (running && bigPlayPauseBtn.check(x, y)) return;
});

// Stop updates when LCD is off, restart when on
Bangle.on('lcdPower',on=>{
  if (on) {
    draw(); // draw immediately, queue redraw
  } else { // stop draw timer
    if (drawTimeout) clearTimeout(drawTimeout);
    drawTimeout = undefined;
  }
});

// Clear the screen once, at startup
g.setTheme({bg:"#000",fg:"#fff",dark:true}).clear();
// above not working, hence using next 2 lines
g.setColor("#000");
g.fillRect(0,0,w,h);

Bangle.loadWidgets();
Bangle.drawWidgets();
readSlides();
draw();
setWatch(() => load(), BTN, { repeat: false, edge: "falling" });
