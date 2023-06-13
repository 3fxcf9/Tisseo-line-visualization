var numberRegexp = /[-+]?([0-9]*\.[0-9]+|[0-9]+)([eE][-+]?[0-9]+)?/;
// Matches sequences like '100 100' or '100 100 100'.
var tuples = new RegExp("^" + numberRegexp.source + "(\\s" + numberRegexp.source + "){1,}");

/*
 * Parse WKT and return GeoJSON.
 *
 * @param {string} _ A WKT geometry
 * @return {?Object} A GeoJSON geometry object
 */
function parse(input) {
	var parts = input.split(";");
	var _ = parts.pop();
	var srid = (parts.shift() || "").split("=").pop();

	var i = 0;

	function $(re) {
		var match = _.substring(i).match(re);
		if (!match) return null;
		else {
			i += match[0].length;
			return match[0];
		}
	}

	function crs(obj) {
		if (obj && srid.match(/\d+/)) {
			obj.crs = {
				type: "name",
				properties: {
					name: "urn:ogc:def:crs:EPSG::" + srid,
				},
			};
		}

		return obj;
	}

	function white() {
		$(/^\s*/);
	}

	function coords() {
		var list = [];
		var item;
		var pt;
		while ((pt = $(tuples) || $(/^(,)/))) {
			if (pt === ",") {
				list.push(item);
				item = [];
			} else if (!pt.split(/\s/g).some(isNaN)) {
				if (!item) item = [];
				Array.prototype.push.apply(item, pt.split(/\s/g).map(parseFloat));
			}
			white();
		}

		if (item) list.push(item);
		else return null;

		return list.length ? list : null;
	}

	function linestring() {
		if (!$(/^(linestring(\sz)?)/i)) return null;
		white();
		if (!$(/^(\()/)) return null;
		var c = coords();
		if (!c) return null;
		if (!$(/^(\))/)) return null;
		return {
			type: "LineString",
			coordinates: c,
		};
	}

	function geometrycollection() {
		var geometries = [];
		var geometry;

		if (!$(/^(geometrycollection)/i)) return null;
		white();

		if (!$(/^(\()/)) return null;
		while ((geometry = root())) {
			geometries.push(geometry);
			white();
			$(/^(,)/);
			white();
		}
		if (!$(/^(\))/)) return null;

		return {
			type: "GeometryCollection",
			geometries: geometries,
		};
	}

	function root() {
		return linestring() || geometrycollection();
	}

	return crs(root());
}
