// Config
// You have to create a file named key.js and containing the following code
// > const apikey = "INSERT-YOUR-TISSEO-API-KEY-HERE";

const url = `https://api.tisseo.fr/v2/lines.json?shortName={NAME}&displayGeometry=1&key=${apikey}`;
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
		.get(url.replace("{NAME}", line_input.value))
		.then(function (response) {
			const line = response.data.lines.line[0];
			clear();
			plotLine(line.geometry[0].wkt, line.bgXmlColor);
		})
		.catch(function (error) {
			console.error(error);
		});
});

function clear() {
	ctx.fillStyle = "#121212";
	ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function convertCoordinatesToPixels(coords, minLon, maxLon, minLat, maxLat) {
	const [lon, lat] = coords;
	const x = (lon - minLon) * ((canvas.width - 100) / (maxLon - minLon)) + 50;
	const y = canvas.height - 100 - (lat - minLat) * ((canvas.height - 100) / (maxLat - minLat)) + 50;
	// Without margin
	// const x = (lon - minLon) * (canvas.width / (maxLon - minLon)) + 10;
	// const y = canvas.height - (lat - minLat) * (canvas.height / (maxLat - minLat));
	return [x, y];
}

function plotLine(wkt, color) {
	const coordinates = wkt.match(/-?\d+\.\d+\s-?\d+\.\d+/g).map((coord) => coord.split(" ").map(parseFloat));

	const minLon = Math.min(...coordinates.map((coord) => coord[0]));
	const maxLon = Math.max(...coordinates.map((coord) => coord[0]));
	const minLat = Math.min(...coordinates.map((coord) => coord[1]));
	const maxLat = Math.max(...coordinates.map((coord) => coord[1]));

	// Start drawing the path
	ctx.beginPath();
	ctx.moveTo(...convertCoordinatesToPixels(coordinates[0], minLon, maxLon, minLat, maxLat));

	// Draw line segments
	for (let i = 1; i < coordinates.length; i++) {
		const pixelCoords = convertCoordinatesToPixels(coordinates[i], minLon, maxLon, minLat, maxLat);
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
