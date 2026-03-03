import { loadProject, saveProject, addWall } from "./projectManager.js";

let project;
let currentWallIndex = 0;
let isDirty = false;

document.addEventListener("DOMContentLoaded", () => {
  project = loadProject();
  wireUI();
});

function displayRibs(ribs){ 
const container = document.getElementById("ribOutput");
  if (!container) return;

  if (ribs.length === 0) {
    container.innerHTML = "<p>No ribs calculated.</p>";
    return;}

  const wall = project.walls[currentWallIndex];
  const lastRib = ribs[ribs.length - 1];
  const remaining = wall.length - lastRib.position;

  let html = "<h3>Rib Layout</h3><ul>";

  ribs.forEach(rib => {
    html += `
      <li>
        <strong>Rib ${rib.index}</strong> — 
        ${formatToField(rib.position)} 
        <span style="opacity:0.6;">(${rib.position}")</span>
      </li>`;
  });

  html += "</ul>";

  html += `
    <hr>
    <div>
      <strong>Remaining:</strong> 
      ${formatToField(remaining)} 
      <span style="opacity:0.6;">(${remaining}")</span>
    </div>
  `;

  container.innerHTML = html;
}

function formatToField(inches) {

  const precision = 8; // 1/8" precision

  const totalInches = inches;

  const feet = Math.floor(totalInches / 12);
  const remainingInches = totalInches % 12;

  const wholeInches = Math.floor(remainingInches);
  let fractional = remainingInches - wholeInches;

  // Round to nearest 1/8
  let eighths = Math.round(fractional * precision);

  // Handle rollover like 11 8/8"
  if (eighths === precision) {
    eighths = 0;
    wholeInches += 1;
  }

  // Handle inch rollover like 12"
  let finalFeet = feet;
  let finalInches = wholeInches;

  if (finalInches === 12) {
    finalFeet += 1;
    finalInches = 0;
  }

  // Reduce fraction
  function gcd(a, b) {
    return b ? gcd(b, a % b) : a;
  }

  let fractionStr = "";

  if (eighths > 0) {
    const divisor = gcd(eighths, precision);
    const num = eighths / divisor;
    const den = precision / divisor;
    fractionStr = ` ${num}/${den}`;
  }

  return `${finalFeet}' ${finalInches}${fractionStr}"`;
}

function wireUI() {
  const renderBtn = document.getElementById("renderBtn");
  if (renderBtn) {
    renderBtn.addEventListener("click", handleRender);
  }
}

function handleRender() {

  const wall = project.walls[currentWallIndex];

  wall.length = parseFloat(document.getElementById("wallLength").value);
  wall.panelCoverage = parseFloat(document.getElementById("panelCoverage").value);
  wall.ribSpacing = parseFloat(document.getElementById("ribSpacing").value);
  wall.offset = parseFloat(document.getElementById("offset").value);
  wall.threshold = parseFloat(document.getElementById("threshold").value);

  const ribs = calculateRibs(wall);

  displayRibs(ribs);
  renderSvg(wall, ribs);

}

function calculateRibs(wall) {
  const ribs = [];

  const length = wall.length || 0;
  const spacing = wall.ribSpacing || 0;
  const offset = wall.offset || 0;

  if (spacing <= 0) return ribs;

  let position = offset;
  let index = 1;

  while (position <= length) {
    ribs.push({
      index: index,
      position: parseFloat(position.toFixed(4))
    });

    position += spacing;
    index++;
  }

  return ribs;
}

function renderSvg(wall, ribs) {

  const svg = document.getElementById("wallSvg");
  if (!svg) return;

  svg.innerHTML = ""; // clear previous render

  const wallLength = wall.length;
  const svgWidth = svg.clientWidth;
  const svgHeight = 260;

  svg.setAttribute("viewBox", `0 0 ${svgWidth} ${svgHeight}`);

  const scale = svgWidth / wallLength;
  const panelCoverage = wall.panelCoverage;

  // Shade alternating panels
let panelIndex = 0;

for (let x = 0; x < wall.length; x += panelCoverage) {
  const panelWidth = Math.min(panelCoverage, wall.length - x);
  const panelX = x * scale;

  const panelRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  panelRect.setAttribute("x", panelX);
  panelRect.setAttribute("y", 20);
  panelRect.setAttribute("width", panelWidth * scale);
  panelRect.setAttribute("height", 120);
  panelRect.setAttribute("fill", panelIndex % 2 === 0 ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.06)");

  svg.appendChild(panelRect);

  panelIndex++;
}

  // Draw wall outline
  const wallRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  wallRect.setAttribute("x", 0);
  wallRect.setAttribute("y", 20);
  wallRect.setAttribute("width", wallLength * scale);
  wallRect.setAttribute("height", 120);
  wallRect.setAttribute("class", "wall-outline");

  svg.appendChild(wallRect);
  
  // Draw panel seams
  
for (let x = panelCoverage; x < wall.length; x += panelCoverage) {
  const seamX = x * scale;

  const seamLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
  seamLine.setAttribute("x1", seamX);
  seamLine.setAttribute("y1", 20);
  seamLine.setAttribute("x2", seamX);
  seamLine.setAttribute("y2", 140);
  seamLine.setAttribute("stroke", "#aaa");
  seamLine.setAttribute("stroke-width", "4");
  seamLine.setAttribute("opacity", "0.6");

  svg.appendChild(seamLine);
}

// ----- PANEL DIMENSIONS (TOP) -----

const panelDimY = 10; // above wall

for (let x = 0; x < wall.length; x += panelCoverage) {
  const panelWidth = Math.min(panelCoverage, wall.length - x);

  const startX = x * scale;
  const endX = (x + panelWidth) * scale;

  // Dimension line
  const dimLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
  dimLine.setAttribute("x1", startX);
  dimLine.setAttribute("y1", panelDimY);
  dimLine.setAttribute("x2", endX);
  dimLine.setAttribute("y2", panelDimY);
  dimLine.setAttribute("stroke", "#B0BEC5");
  dimLine.setAttribute("stroke-width", "1.5");

  svg.appendChild(dimLine);

  // Left tick
  const leftTick = document.createElementNS("http://www.w3.org/2000/svg", "line");
  leftTick.setAttribute("x1", startX);
  leftTick.setAttribute("y1", panelDimY - 6);
  leftTick.setAttribute("x2", startX);
  leftTick.setAttribute("y2", panelDimY + 6);
  leftTick.setAttribute("stroke", "#B0BEC5");
  leftTick.setAttribute("stroke-width", "1.5");

  svg.appendChild(leftTick);

  // Right tick
  const rightTick = document.createElementNS("http://www.w3.org/2000/svg", "line");
  rightTick.setAttribute("x1", endX);
  rightTick.setAttribute("y1", panelDimY - 6);
  rightTick.setAttribute("x2", endX);
  rightTick.setAttribute("y2", panelDimY + 6);
  rightTick.setAttribute("stroke", "#B0BEC5");
  rightTick.setAttribute("stroke-width", "1.5");

  svg.appendChild(rightTick);

  // Text label
  const dimText = document.createElementNS("http://www.w3.org/2000/svg", "text");
  dimText.setAttribute("x", (startX + endX) / 2);
  dimText.setAttribute("y", panelDimY - 4);
  dimText.setAttribute("fill", "#CFD8DC");
  dimText.setAttribute("text-anchor", "middle");
  dimText.setAttribute("font-size", "10");

  dimText.textContent = formatToField(panelWidth);

  svg.appendChild(dimText);
}

  // Draw ribs
  ribs.forEach(rib => {
    const xPos = rib.position * scale;

    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", xPos);
    line.setAttribute("y1", 20);
    line.setAttribute("x2", xPos);
    line.setAttribute("y2", 140);
    line.setAttribute("class", "rib-line");

    svg.appendChild(line);
  });
  // ----- TOTAL WALL DIMENSION (BOTTOM) -----

const dimY = 200; // below wall
const dimPadding = 10;
const startX = dimPadding;
const endX = (wallLength * scale) - dimPadding;


// Dimension line
const totalDimLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
totalDimLine.setAttribute("x1", startX);
totalDimLine.setAttribute("y1", dimY);
totalDimLine.setAttribute("x2", endX);
totalDimLine.setAttribute("y2", dimY);
totalDimLine.setAttribute("stroke", "#4FC3F7");
totalDimLine.setAttribute("stroke-width", "2");

svg.appendChild(totalDimLine);

// Left tick
const totalLeftTick = document.createElementNS("http://www.w3.org/2000/svg", "line");
totalLeftTick.setAttribute("x1", startX);
totalLeftTick.setAttribute("y1", dimY - 8);
totalLeftTick.setAttribute("x2", startX);
totalLeftTick.setAttribute("y2", dimY + 8);
totalLeftTick.setAttribute("stroke", "#4FC3F7");
totalLeftTick.setAttribute("stroke-width", "2");

svg.appendChild(totalLeftTick);

// Right tick
const TotalRightTick = document.createElementNS("http://www.w3.org/2000/svg", "line");
TotalRightTick.setAttribute("x1", endX);
TotalRightTick.setAttribute("y1", dimY - 8);
TotalRightTick.setAttribute("x2", endX);
TotalRightTick.setAttribute("y2", dimY + 8);
TotalRightTick.setAttribute("stroke", "#4FC3F7");
TotalRightTick.setAttribute("stroke-width", "2");

svg.appendChild(TotalRightTick);

// Text label
const totalDimText = document.createElementNS("http://www.w3.org/2000/svg", "text");
totalDimText.setAttribute("x", svgWidth / 2);
totalDimText.setAttribute("y", dimY - 10);
totalDimText.setAttribute("fill", "#4FC3F7");
totalDimText.setAttribute("text-anchor", "middle");
totalDimText.setAttribute("font-size", "12");

totalDimText.textContent = formatToField(wallLength);

svg.appendChild(totalDimText);
  
}
