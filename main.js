// Config
// You have to create a file named key.js and containing the following code
// > const apikey = "INSERT-YOUR-TISSEO-API-KEY-HERE";

const key = typeof apikey == "string" ? apikey : prompt("Enter your tisseo api key");
const line_url = `https://api.tisseo.fr/v2/lines.json?shortName={NAME}&displayGeometry=1&key=${key}`;
const stops_url = `https://api.tisseo.fr/v2/stop_areas.json?lineId={ID}&displayCoordXY=1&key=${key}`;
// Config end

// DOM Elements
const line_input = document.querySelector("input[name=line]");
const submit_btn = document.querySelector("input[type=submit]");

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

// Utilities
/**
 * Convert SRID coords to canvas coords
 */
class CoordsConverter {
	constructor() {
		this.boundings = [
			[Infinity, Infinity],
			[0, 0],
		];
	}
	reset() {
		this.boundings = [
			[Infinity, Infinity],
			[0, 0],
		];
	}
	updateBounding(coordinates) {
		this.boundings[0][0] = Math.min(this.boundings[0][0], ...coordinates.map((coord) => coord[0]));
		this.boundings[1][0] = Math.max(this.boundings[1][0], ...coordinates.map((coord) => coord[0]));
		this.boundings[0][1] = Math.min(this.boundings[0][1], ...coordinates.map((coord) => coord[1]));
		this.boundings[1][1] = Math.max(this.boundings[1][1], ...coordinates.map((coord) => coord[1]));
	}
	convertCoordinatesToPixels(coords) {
		const [lon, lat] = coords;
		const x = (lon - this.boundings[0][0]) * ((canvas.width - 100) / (this.boundings[1][0] - this.boundings[0][0])) + 50;
		const y = canvas.height - 100 - (lat - this.boundings[0][1]) * ((canvas.height - 100) / (this.boundings[1][1] - this.boundings[0][1])) + 50;
		// Without margin
		// const x = (lon - this.boundings[0][0]) * (canvas.width / (this.boundings[1][0] - this.boundings[0][0])) + 10;
		// const y = canvas.height - (lat - this.boundings[0][1]) * (canvas.height / (this.boundings[1][1] - this.boundings[0][1]));
		return [x, y];
	}
}
/**
 * Find the nearest point in path
 */
class knn_points {
	/**
	 * Knn points constructor
	 * @param {[number, number][]} points
	 */
	constructor(points) {
		self.points = points;
	}

	/**
	 * Closest point to stop
	 * @param {{x:number, y:number}} stop
	 * @returns {{x:number, y:number}}
	 */
	closest(stop) {
		let min_dist = Infinity;
		let best_point = stop;

		self.points.forEach((point) => {
			const distance = Math.sqrt(Math.pow(point[0] - stop[0], 2) + Math.pow(point[1] - stop[1], 2));

			if (distance < min_dist) {
				min_dist = distance;
				best_point = point;
			}
		});

		return { x: best_point[0], y: best_point[1] };
	}
}

const coordsConverter = new CoordsConverter();

line_input.addEventListener("keypress", (e) => {
	if (e.key == "Enter") submit_btn.click();
});

submit_btn.addEventListener("click", (e) => {
	axios
		.get(line_url.replace("{NAME}", line_input.value))
		.then((response) => {
			const line = response.data.lines.line[0];
			const geodata = parse(line.geometry[0].wkt);

			coordsConverter.reset(); // Reset conversion bounding box
			clear(); // Clear canvas

			geodata.geometries.forEach((geometry) => {
				coordsConverter.updateBounding(geometry.coordinates);
			});

			console.log("Number of geometries: ", geodata.geometries.length);

			const allPoints = []; // Used in knn
			geodata.geometries.forEach((geometry) => {
				const coordinates = geometry.coordinates;

				const pixelCoordinates = coordinates.map((coord) => coordsConverter.convertCoordinatesToPixels(coord));
				allPoints.push.apply(allPoints, pixelCoordinates);

				plotLine(pixelCoordinates, line.bgXmlColor);
			});

			const knn = new knn_points(allPoints);

			axios.get(stops_url.replace("{ID}", line.id)).then((response) => {
				const stops = response.data.stopAreas.stopArea;
				stops.forEach((stop) => {
					const closest = knn.closest(coordsConverter.convertCoordinatesToPixels([stop.x, stop.y]));
					drawPoint(closest.x, closest.y, stop.name, line.bgXmlColor);
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

function drawPoint(x, y, name, color) {
	// Point
	ctx.beginPath();
	ctx.arc(x, y, 5, 0, 2 * Math.PI, false);
	ctx.fillStyle = color;
	ctx.fill();

	// Text
	ctx.fillStyle = "rgba(255,255,255,0.5)";
	ctx.textBaseline = "middle";
	ctx.fillText(name, x + 10, y);
}

function plotLine(coordinates, color) {
	// Start drawing the path
	ctx.beginPath();
	ctx.moveTo(...coordinates[0]);

	// Draw line segments
	for (let i = 1; i < coordinates.length; i++) {
		ctx.lineTo(...coordinates[i]);
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
