// Config
// You have to create a file named key.js and containing the following code
// > const apikey = "INSERT-YOUR-TISSEO-API-KEY-HERE";

const line_url = `https://api.tisseo.fr/v2/lines.json?shortName={NAME}&displayGeometry=1&key=${apikey}`;
const stops_url = `https://api.tisseo.fr/v2/stop_areas.json?lineId={ID}&displayCoordXY=1&key=${apikey}`;
// Config end

const line_input = document.querySelector("input[name=line]");
const submit_btn = document.querySelector("input[type=submit]");

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

line_input.addEventListener("keypress", (e) => {
	if (e.key == "Enter") submit_btn.click();
});

submit_btn.addEventListener("click", (e) => {
	axios
		.get(line_url.replace("{NAME}", line_input.value))
		.then((response) => {
			const line = response.data.lines.line[0];
			clear();
			plotLine(line.geometry[0].wkt, line.bgXmlColor);

			axios.get(stops_url.replace("{ID}", line.id)).then((response) => {
				const stops = response.data.stopAreas.stopArea;
				console.log(stops);
				stops.forEach((stop) => {
					drawPoint(stop.x, stop.y, stop.name, line.bgXmlColor);
				});
			});
		})
		.catch(function (error) {
			console.error(error);
		});
});

function clear() {
	ctx.fillStyle = "#121212";
	ctx.fillRect(0, 0, canvas.width, canvas.height);
}

let minLon = 0;
let maxLon = 0;
let minLat = 0;
let maxLat = 0;

function convertCoordinatesToPixels(coords) {
	const [lon, lat] = coords;
	const x = (lon - minLon) * ((canvas.width - 100) / (maxLon - minLon)) + 50;
	const y = canvas.height - 100 - (lat - minLat) * ((canvas.height - 100) / (maxLat - minLat)) + 50;
	// Without margin
	// const x = (lon - minLon) * (canvas.width / (maxLon - minLon)) + 10;
	// const y = canvas.height - (lat - minLat) * (canvas.height / (maxLat - minLat));
	return [x, y];
}

function drawPoint(x, y, name, color) {
	// Point
	const pixelCoords = convertCoordinatesToPixels([x, y]);
	ctx.beginPath();
	ctx.arc(...pixelCoords, 5, 0, 2 * Math.PI, false);
	ctx.fillStyle = color;
	ctx.fill();

	// Text
	ctx.fillStyle = "rgba(255,255,255,0.5)";
	ctx.textBaseline = "middle";
	ctx.fillText(name, pixelCoords[0] + 10, pixelCoords[1]);
}

function plotLine(wkt, color) {
	const coordinates = wkt.match(/-?\d+\.\d+\s-?\d+\.\d+/g).map((coord) => coord.split(" ").map(parseFloat));

	minLon = Math.min(...coordinates.map((coord) => coord[0]));
	maxLon = Math.max(...coordinates.map((coord) => coord[0]));
	minLat = Math.min(...coordinates.map((coord) => coord[1]));
	maxLat = Math.max(...coordinates.map((coord) => coord[1]));

	// Start drawing the path
	ctx.beginPath();
	ctx.moveTo(...convertCoordinatesToPixels(coordinates[0]));

	// Draw line segments
	for (let i = 1; i < coordinates.length; i++) {
		const pixelCoords = convertCoordinatesToPixels(coordinates[i]);
		ctx.lineTo(...pixelCoords);
	}

	ctx.lineWidth = 2;
	ctx.strokeStyle = color;

	ctx.stroke();
}

// Resize canvas
const side = Math.min(
	window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth,
	window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight
);
canvas.height = side;
canvas.width = side;
