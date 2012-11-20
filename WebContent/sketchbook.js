// sketchbook.js - sketchbook data model including file format support (for sketcher2)

// Sketch class/constructor
function Sketch(id) {
	this.id = id;
	this.description = '';
}

Sketch.prototype.marshall = function() {
	var jsketch = { id : this.id, description: this.description };
	return jsketch;
};

Sketch.prototype.unmarshall = function(jsketch) {
	this.id = jsketch.id;
	if (jsketch.description!==undefined)
		this.description = jsketch.description;
};

Sketch.prototype.getTitle = function() {
	var title = this.description;
	var ix = title.lastIndexOf('\n');
	if (ix>=0)
		title = title.substr(0, ix);
	if (title===undefined || title==null || title.length==0)
		return "Unnamed ("+this.id+")";
	return title;
};

// Sketchbook Class/constructor
function Sketchbook() {
	// associative array of Sketches
	this.sketches = new Object();
	this.nextId = 1;
	this.changed = false;
}

// current version string
var VERSION = "sketcher2.0";

Sketchbook.prototype.marshall = function() {
	var jsketches = new Array();	
	var jstate = { version: VERSION, nextId: this.nextId, sketches: jsketches };
	for (var sid in this.sketches) {
		var sketch = this.sketches[sid];
		jsketches.push(sketch.marshall());
	}
	return jstate;
};

Sketchbook.prototype.unmarshall = function(jstate) {
	this.nextId = jstate.nextId;
	var jversion = jstate.version;
	if (VERSION!=jversion)
		throw "Wrong file version: "+jversion+", expected "+VERSION;
	for (var jsix in jstate.sketches) {
		var jsketch = jstate.sketches[jsix];
		var sketch = new Sketch();
		sketch.unmarshall(jsketch);
		if (sketch.id==undefined) {
			sketch.id = this.nextId++;
		}			
		this.sketches[sketch.id] = sketch;
	}
};

//Sketchbook.prototype.newSketch = function() {
//	var sketch = new Sketch(this.nextId++);
//	this.sketches[sketch.id] = sketch;
//	this.changed = true;
//	return sketch;
//};

function Action(sketchbook, type) {
	this.sketchbook;
	this.type = type;
}

Sketchbook.prototype.newSketchAction = function() {
	var action = new Action(this, 'newSketch');
	action.sketch = new Sketch(this.nextId++);
	return action;
};

Sketchbook.prototype.setSketchDescriptionAction = function(sketchId, description) {
	var action = new Action(this, 'setSketchDescription');
	action.sketchId = sketchId;
	action.description = description;
	return action;
};

Sketchbook.prototype.doAction = function(action) {
	if (action.type=='newSketch') {
		this.sketches[action.sketch.id] = action.sketch;
		this.changed = true;
	}
	else if (action.type=='setSketchDescription') {
		var sketch = sketchbook.sketches[action.sketchId];
		if (sketch!==undefined) {
			action.undo = { description: sketch.description };
			sketch.description = action.description;
		}
		this.changed = true;
	}
	else
		throw 'Unknown sketchbook do action '+action.type;
};

Sketchbook.prototype.undoAction = function(action) {
	if (action.type=='newSketch') {
		delete this.sketches[sketch.id];
		this.changed = true;
	}
	else if (action.type=='setSketchDescription') {
		var sketch = sketchbook.sketches[action.sketchId];
		if (sketch!==undefined) {
			sketch.description = action.undo.description; 
		}
		this.changed = true;
	}
	else
		throw 'Unknown sketchbook undo action '+action.type;
};
