
// A bi-directional map, where values can serve
// as keys, and keys as values

function Bimap () {
	this.k2v = {};
	this.v2k = {};
	this.keys = {};
	this.values = {};
}

// Both keys and values must have an id field that
// can serve as a string key
// Keys and values individually must be unique, but a
// key can map to an identical value

Bimap.prototype.put = function(key, value) {
	if (this.contains(key)) {
		throw ("Map already contains key " + key.id);
	}
	if (this.contains(value)) {
		throw ("Map already contains value " + value.id);
	}
	this.k2v[key.id] = value;
	this.v2k[value.id] = key;
	this.keys[key.id] = key;
	this.values[value.id] = value;
};

// A bimap contains a source if it is a valid key or value

Bimap.prototype.contains = function (source) {
	return this.keys[source.id] || this.values[source.id];
}

Bimap.prototype.get = function(source) {
	if (!source || !this.contains(source)) return null;

	var isKey = this.keys[source.id],
		isValue = this.values[source.id];

	if (isKey && isValue) {
		return isKey === source ? isValue : isKey;
	}
	else {
		if (isKey) {
			return this.k2v[source.id];
		} else {
			return this.v2k[source.id];
		}
	}
};

// Keys and values are removed as pairs
// Either keys or values can be used to remove a pair

Bimap.prototype.remove = function(source) {
	if (!source || !this.contains(source)) return null;

	var isKey = this.keys[source.id];

	if (isKey) {
		var value = this.k2v[source.id];
		this.k2v[source.id] = null;
		this.v2k[value.id] = null;
		this.keys[source.id] = null;
		this.values[value.id] = null;
	} else {
		var key = this.v2k[source.id];
		this.v2k[source.id] = null;
		this.k2v[key.id] = null;
		this.values[source.id] = null;
		this.keys[key.id] = null;
	}
};

Bimap.prototype.clear = function() {
	this.v2k = {};
	this.k2v = {};
	this.keys = {};
	this.values = {};
};
