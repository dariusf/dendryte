
// A bi-directional map, where values can serve
// as keys, and keys as values

function Bimap () {
	this.k2v = {};
	this.v2k = {};
}

// Both keys and values must have an id field
// that can serve as a string key

Bimap.prototype.put = function(key, value) {
	this.k2v[key.id] = value;
	this.v2k[value.id] = key;
};

Bimap.prototype.get = function(key) {
	if (!this.k2v[key.id]) {
		if (!this.v2k[key.id]) {
			return null;
		}
		else {
			return this.v2k[key.id];
		}
	}
	else {
		return this.k2v[key.id];
	}
};

Bimap.prototype.clear = function() {
	this.v2k = {};
	this.k2v = {};
};
