// sketchbook.js - sketchbook data model including file format support (for sketcher2)

// Sketch class/constructor
function Sketch(id) {
	this.id = id;
	this.description = '';
	this.elements = [];
}

Sketch.prototype.marshall = function() {
	var jsketch = { id : this.id, description: this.description, elements: this.elements };
	return jsketch;
};

Sketch.prototype.unmarshall = function(jsketch) {
	this.id = jsketch.id;
	if (jsketch.description!==undefined)
		this.description = jsketch.description;
	if (jsketch.elements!==undefined) {
		for (var eix=0; eix<jsketch.elements.length; eix++) {
			var jelement = jsketch.elements[eix];
			// TODO any more checking??
			this.elements.push(jelement);
		}
	}
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

/** convert color to paper js color */
function colorToPaperjs(color) {
	return new paper.RgbColor(color.red, color.green, color.blue);
}
/** convert all elements to paperjs objects (in current/default paperjs project).
 * @return array of items added */
Sketch.prototype.toPaperjs = function() {
	var items = new Array();
	for (var ix=0; ix<this.elements.length; ix++) {
		var element = this.elements[ix];
		if (element.line!==undefined) {
			var path = new paper.Path();
			// preserve id
			path.sketchElementId = element.id;
			items.push(path);
			if (element.line.width)
				path.strokeWidth = element.line.width;
			if (element.line.color)
				path.strokeColor = colorToPaperjs(element.line.color);
			if (element.line.segments) {
				for (var si=0; si<element.line.segments.length; si++) {
					var segment = element.line.segments[si];
					if (segment.point && segment.handleIn && segment.handleOut)
						path.add(new paper.Segment(
								new paper.Point(segment.point.x, segment.point.y),
								new paper.Point(segment.handleIn.x, segment.handleIn.y),
								new paper.Point(segment.handleOut.x, segment.handleOut.y)
								));
				}
			}
		}
	}
	return items;
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

/** return action to add a new line to a sketch, from provided paperjs Path */
Sketchbook.prototype.addLineAction = function(sketchId, path) {
	var action = new Action(this, 'addElement');
	action.sketchId = sketchId;
	var color = { red: path.strokeColor.red, green: path.strokeColor.green, blue: path.strokeColor.blue };
	var line = { color: color, width: path.strokeWidth, segments: [] };
	action.element = { line : line }; // id?
	for (var six=0; six<path.segments.length; six++) {
		var psegment = path.segments[six];
		var segment = { 
			point: { x: psegment.point.x, y: psegment.point.y },
			handleIn: { x: psegment.handleIn.x, y: psegment.handleIn.y },
			handleOut: { x: psegment.handleOut.x, y: psegment.handleOut.y }
		};
		line.segments.push(segment);
	}
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
	else if (action.type=='addElement') {
		var sketch = sketchbook.sketches[action.sketchId];
		if (sketch!==undefined && action.element!=undefined) {
			action.element.id = this.nextId++;
			sketch.elements.push(action.element);
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
	else if (action.type=='addElement') {
		var sketch = sketchbook.sketches[action.sketchId];
		if (sketch!==undefined && action.element!==undefined && action.element.id!==undefined) {
			for (var ix=0; ix<sketch.elements.length; ix++) {
				if (sketch.elements[ix].id==action.element.id) {
					delete sketch.elements[ix];
					break;
				}
			}
		}
		this.changed = true;
	}
	else
		throw 'Unknown sketchbook undo action '+action.type;
};
