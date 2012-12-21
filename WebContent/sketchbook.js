// sketchbook.js - sketchbook data model including file format support (for sketcher2)

// Sketch class/constructor
function Sketch(id) {
	this.id = id;
	this.description = '';
	this.elements = [];
	this.background = {};
}

Sketch.prototype.marshall = function() {
	var jsketch = { id : this.id, description: this.description, elements: this.elements, background: this.background };
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
	if (jsketch.background) {
		this.background = jsketch.background;
	}
};

function getSketchTitle(sketch) {
	var title = sketch.description;
	var ix = title.lastIndexOf('\n');
	if (ix>=0)
		title = title.substr(0, ix);
	if (title===undefined || title==null || title.length==0)
		return "Unnamed ("+sketch.id+")";
	return title;
}

Sketch.prototype.getTitle = function() {
	return getSketchTitle(this);
};

/** get element by id */
Sketch.prototype.getElementById = function(id) {
	for (var i=0; i<this.elements.length; i++) {
		var element = this.elements[i];
		if (element.id==id)
			return element;
	}
	return null;
};

/** convert color to paper js color */
function colorToPaperjs(color) {
	return new paper.RgbColor(color.red, color.green, color.blue);
}

/** convert an array of elements to paperjs */
function elementsToPaperjs(elements, sketchbook, images, iconSketchIds) {
	if (iconSketchIds==undefined)
		iconSketchIds = [];
	var items = new Array();
	for (var ix=0; ix<elements.length; ix++) {
		var element = elements[ix];
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
		if (element.icon!==undefined) {
			// copy sketch item(s)
			var sketch = sketchbook.sketches[element.icon.sketchId];
			var group;
			if (!sketch || iconSketchIds.indexOf(element.icon.sketchId)>=0) {
				if (!sketch)
					console.log('cannot find sketch '+element.icon.sketchId+' for icon');
				else
					console.log('found loop of sketches/icons for sketch '+element.icon.sketchId);
				var outline = new paper.Path.Rectangle(new paper.Rectangle(element.icon.x, element.icon.y, element.icon.width, element.icon.height));
				outline.fillColor = 'grey';
				//outline.strokeWidth = 2;
				group = new paper.Group(outline);			
			}
			else {
				var iconItems = sketch.toPaperjs(sketchbook, images, iconSketchIds);
				group = new paper.Group(iconItems);
			}
			group.sketchElementId = element.id;
			group.bounds = new paper.Rectangle(element.icon.x, element.icon.y, element.icon.width, element.icon.height);
			items.push(group);
		}
		if (element.frame!==undefined) {
			var outline = new paper.Path.Rectangle(new paper.Rectangle(element.frame.x, element.frame.y, element.frame.width, element.frame.height));
			// default
			outline.strokeColor = 'grey';
			outline.strokeWidth = 2;
			outline.dashArray = [4, 10];
			var title = new paper.PointText(new paper.Point(element.frame.x+element.frame.width/2, element.frame.y+element.frame.height-16));
			title.content = element.frame.description;
			title.paragraphStyle.justification = 'center';
			// default
			title.characterStyle.fillColor = outline.strokeColor;
			// default
			title.characterStyle.fontSize = 12;
			group = new paper.Group([outline, title]);			
			group.sketchElementId = element.id;
			items.push(group);
		}
		if (element.image!==undefined) {
			var imageId = null;
			for (var iid in images) {
				if (images[iid].dataurl==element.image.dataurl) {
					imageId = iid;
					break;
				} else
					console.log('did not match image '+iid);
			}
			var item = null;
			var bounds = new paper.Rectangle(element.image.x, element.image.y, element.image.width, element.image.height);
			if (!imageId) {
				console.log('Could not find image for dataurl');
				item = new paper.Path.Rectangle(bounds);
				// default
				item.fillColor = 'grey';
			} else {
				item = new paper.Raster(imageId);
				item.bounds = bounds;
			}
			item.sketchElementId = element.id;
			items.push(item);
		}
		if (element.text!==undefined) {
			var text = new paper.PointText(new paper.Point(element.text.x, element.text.y));
			text.content = element.text.content;
			text.characterStyle.fontSize = element.text.size;
			text.paragraphStyle.justification = 'center';
			text.characterStyle.fillColor = colorToPaperjs(element.text.color);
			text.sketchElementId = element.id;
			items.push(text);
		}
	}
	return items;
}

/** convert all elements to paperjs objects (in current/default paperjs project).
 * @return array of items added */
Sketch.prototype.toPaperjs = function(sketchbook, images, iconSketchIds) {
	if (iconSketchIds==undefined)
		iconSketchIds = [];
	else
		iconSketchIds = iconSketchIds.slice(0);
	iconSketchIds.push(this.id);
	return elementsToPaperjs(this.elements, sketchbook, images, iconSketchIds);
};

/** get elementId (if any) for paperJs item */
function getSketchElementId(item) {
	return item.sketchElementId;
}


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

function NewSketchAction(sketchbook, sketchId) {
	Action.call(this, sketchbook, 'newSketch');
	this.sketch = new Sketch(sketchId);
}
NewSketchAction.prototype = new Action();

NewSketchAction.prototype.addElements = function(elements) {
	for (var ei=0; ei<elements.length; ei++) {
		var el = elements[ei];
		var newel = JSON.parse(JSON.stringify(el));
		delete newel.id;
		this.sketch.elements.push(newel);
	}
};

Sketchbook.prototype.newSketchAction = function() {
	var action = new NewSketchAction(this, this.nextId++);
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
	var action = new Action(this, 'addElements');
	action.sketchId = sketchId;
	var color = { red: path.strokeColor.red, green: path.strokeColor.green, blue: path.strokeColor.blue };
	var line = { color: color, width: path.strokeWidth, segments: [] };
	action.elements =  [{ line : line }]; // id?
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

Sketchbook.prototype.addTextAction = function(sketchId, text) {
	var action = new Action(this, 'addElements');
	action.sketchId = sketchId;
	var color = { red: text.fillColor.red, green: text.fillColor.green, blue: text.fillColor.blue };
	var textel = { color: color, size: text.characterStyle.fontSize, content: text.content, x: text.point.x, y: text.point.y };
	action.elements =  [{ text : textel }]; 
	return action;
};

Sketchbook.prototype.addFrameAction = function(sketchId, description, bounds) {
	var action = new Action(this, 'addElements');
	action.sketchId = sketchId;
	var frame = { description: description, x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height };
	action.elements = [{frame : frame}];
	return action;	
};

/** transform {x:, y:} from paperjs fromBounds to paperjs toBounds */
function transformPoint(point, fromBounds, toBounds) {
	return { x: (point.x-fromBounds.left)*toBounds.width/fromBounds.width+toBounds.left,
		y: (point.y-fromBounds.top)*toBounds.height/fromBounds.height+toBounds.top };
}
function transformIcon(icon, fromBounds, toBounds) {
	icon.x = (icon.x-fromBounds.left)*toBounds.width/fromBounds.width+toBounds.left;
	icon.y = (icon.y-fromBounds.top)*toBounds.height/fromBounds.height+toBounds.top;
	icon.width *= toBounds.width / fromBounds.width; 
	icon.height *= toBounds.height / fromBounds.height; 
}
/** action to add (copy of) elements, including optional transformation from/to */
Sketchbook.prototype.addElementsAction = function(sketchId, elements, fromBounds, toBounds) {
	var action = new Action(this, 'addElements');
	action.sketchId = sketchId;
	action.elements =  [];
	for (var ei=0; ei<elements.length; ei++) {
		var el = elements[ei];
		var newel = JSON.parse(JSON.stringify(el));
		if (fromBounds && toBounds) {
			if (newel.line) {
				for (var si=0; si<newel.line.segments.length;si++) {
					var seg = newel.line.segments[si];
					seg.point = transformPoint(seg.point, fromBounds, toBounds);
					seg.handleIn.x *= toBounds.width / fromBounds.width;
					seg.handleIn.y *= toBounds.height / fromBounds.height;
					seg.handleOut.x *= toBounds.width / fromBounds.width;
					seg.handleOut.y *= toBounds.height / fromBounds.height;
				}
			}
			if (newel.icon) {
				transformIcon(newel.icon, fromBounds, toBounds);
			}
			if (newel.frame) {
				transformIcon(newel.frame, fromBounds, toBounds);
			}
			if (newel.image) {
				transformIcon(newel.image, fromBounds, toBounds);
			}
			if (newel.text) {
				newel.text.x = (newel.text.x-fromBounds.left)*toBounds.width/fromBounds.width+toBounds.left;
				newel.text.y = (newel.text.y-fromBounds.top)*toBounds.height/fromBounds.height+toBounds.top;
			}
		}
		delete newel.id;
		action.elements.push(newel);
	}
	return action;
};


/** return action to select a list of elements within a sketch - not really a model action */
Sketchbook.prototype.selectItemsAction = function(defaultSketchId, items) {
	var action = new Action(this, 'select');
	action.selections = [];
	// several elements in the same sketch are one selection
	var defaultSelection = undefined;
	if (defaultSketchId) {
		defaultSelection = { sketchId: defaultSketchId, elements: [] };
	}
	for (var i=0; i<items.length; i++) {
		var item = items[i];
		if (item.selectionRecordId) {
			// selection from selection history!
			var selection = { selectionRecordId: item.selectionRecordId };
			action.selections.push(selection);
			continue;
		}
		var sketchId = item.sketchId;
		if (!sketchId)
			sketchId = defaultSketchId;
		sketch = this.sketches[sketchId];
		if (!sketch) {
			console.log('selectItemsAction sketch '+sketchId+' unknown');
			continue;
		}
		var elementId = getSketchElementId(item);
		if (elementId) {
			var element = sketch.getElementById(elementId);
			if (!element) {
				// Note that this will only work in current sketch state!! 
				// OK for selection from sketch editor view, but not in selection history
				console.log('selectItemsAction sketch '+sketchId+' element '+elementId+' unknown');
				continue;
			}
			// clone element state to avoid problems with subsequent/parallel modifications (delete, etc.)
			var cloned = JSON.parse(JSON.stringify(element));
			if (sketchId==defaultSketchId)
				// element in default
				defaultSelection.elements.push(cloned);
			else {
				// element in sketch
				var selection = { sketchId : sketchId };
				selection.elements = [ cloned ];
				action.selections.push(selection);
			}				
		}
		else if (item.sketchId) {
			// whole sketch?!
			var selection = { sketchId : sketchId };
			selection.sketch = JSON.parse(JSON.stringify(sketch));
			action.selections.push(selection);
		}
		else 
			console.log('selectItemsAction could not find elementId in sketch '+sketchId+' on '+item);
	}
	if (defaultSelection && defaultSelection.elements.length>0)
		action.selections.push(defaultSelection);
	return action;
};

/** return action to select a list of elements within a sketch - not really a model action */
Sketchbook.prototype.selectElementsAction = function(sketchId, elements) {
	var action = new Action(this, 'select');
	var defaultSelection = { sketchId: sketchId, elements: [] };
	action.selections = [defaultSelection];
	for (var i=0; i<elements.length; i++) {
		var el = elements[i];
		// clone element state to avoid problems with subsequent/parallel modifications (delete, etc.)
		var cloned = JSON.parse(JSON.stringify(el));
		defaultSelection.elements.push(cloned);
	}
	return action;
};

/** return action to select a sketch - not really a model action */
Sketchbook.prototype.selectSketchAction = function(sketchId) {
	var action = new Action(this, 'select');
	var selection = { sketchId: sketchId };
	action.selections = [selection];
	sketch = this.sketches[sketchId];
	if (!sketch) {
		console.log('selectSketchAction sketch '+sketchId+' unknown');
	} else {
		selection.sketch = JSON.parse(JSON.stringify(sketch));
		
	}
	return action;
};

function SetColorAction(sketchbook, color) {
	Action.call(this, sketchbook, 'setColor');
	this.color = color;
	this.elements = [];
}

SetColorAction.prototype = new Action();

SetColorAction.prototype.addElement =  function(sketchId, elementId) {
	this.elements.push({ sketchId: sketchId, elementId : elementId});
};


Sketchbook.prototype.setColorAction = function(color) {
	return new SetColorAction(this, color);
};

Sketchbook.prototype.setColorAction = function(color) {
	return new SetColorAction(this, color);
};



function DeleteAction(sketchbook) {
	Action.call(this, sketchbook, 'delete');
	this.items = [];
}

DeleteAction.prototype = new Action();

DeleteAction.prototype.addElement =  function(sketchId, elementId) {
	this.items.push({ sketchId: sketchId, elementId : elementId});
};

DeleteAction.prototype.addSketch =  function(sketchId) {
	this.items.push({ sketchId: sketchId });
};

Sketchbook.prototype.deleteAction = function() {
	return new DeleteAction(this);
};

Sketchbook.prototype.setBackgroundAction = function(sketchId, backgroundSketchId, alpha) {
	var action = new Action(this,'setBackground');
	action.sketchId = sketchId;
	action.background = { sketchId : backgroundSketchId, alpha : alpha };
	return action;
};

Sketchbook.prototype.doAction = function(action) {
	if (action.type=='newSketch') {
		this.sketches[action.sketch.id] = action.sketch;
		// fix element IDs
		for (var ei=0; ei<action.sketch.elements.length; ei++) {
			var el = action.sketch.elements[ei];
			if (!el.id)
				el.id = this.nextId++;
		}
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
	else if (action.type=='addElements') {
		var sketch = sketchbook.sketches[action.sketchId];
		if (sketch!==undefined && action.elements!=undefined) {
			for (var ei=0; ei<action.elements.length; ei++) {
				var el = action.elements[ei];
				if (!el.id)
					// only allocate once else causes problems for undo/redo
					el.id = this.nextId++;
				sketch.elements.push(el);
			}
		}
		this.changed = true;		
	}
	else if (action.type=='select') {
		// no-op
	}
	else if (action.type=='setColor') {
		for (var ei=0; ei<action.elements.length; ei++) {
			var el = action.elements[ei];
			var sketch = this.sketches[el.sketchId];
			if (!sketch) {
				console.log('setColor could not find sketch '+el.sketchId);				
			} else {
				var element = sketch.getElementById(el.elementId);
				if (!element) {
					console.log('setColor could not find element '+elementId+' in sketch '+sketchId);
				}
				else {
					if (element.line) {
						el.undo = { color : element.line.color };
						element.line.color = action.color;
					}
					else if (element.text) {
						el.undo = { color : element.text.color };
						element.text.color = action.color;
					}
					else {
						console.log('setColor cannot handle non-line element '+elementId+' in sketch '+sketchId);
					}
				}
			}
		}
	}
	else if (action.type=='delete') {
		for (var si=0; si<action.items.length; si++) {
			var item = action.items[si];
			var sketch = this.sketches[item.sketchId];
			if (sketch) {
				if (item.elementId) {
					var done = false;
					for (var i=0; i<sketch.elements.length; i++) {
						var element = sketch.elements[i];
						if (element.id==item.elementId) {
							item.undo = { element : element };
							sketch.elements.splice(i, 1);
							done = true;
							console.log('delete sketch '+item.sketchId+' element '+item.elementId);
							break;
						}
					}
					if (!done)
						console.log('delete: could not find element '+item.elementId+' in sketch '+item.sketchId);
				}
				else {
					item.undo = { sketch : sketch };
					delete this.sketches[item.sketchId];
					console.log('delete sketch '+item.sketchId);
				}
			}
			else {
				console.log('delete: cannot find sketch '+sketchId);
			}
		}
	}
	else if (action.type=='setBackground') {
		var sketch = this.sketches[action.sketchId];
		if (sketch) {
			if (sketch.background)
				action.undo = { background : { sketchId: sketch.background.sketchId, alpha: sketch.background.alpha } };
			else
				action.undo = {};
			if (!action.background) {
				delete sketch.background;
			} else {
				sketch.background = { sketchId : action.background.sketchId, alpha : action.background.alpha };
			}
		}
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
	else if (action.type=='addElements') {
		var sketch = sketchbook.sketches[action.sketchId];
		if (sketch!==undefined && action.elements!==undefined) {
			for (var ei=0; ei<actions.elements.length; ei++) {
				var el = actions.elements[ei];
				if (el.id!==undefined) {
					for (var ix=0; ix<sketch.elements.length; ix++) {
						if (sketch.elements[ix].id==el.id) {
							sketch.elements.splice(ix,1);
							break;
						}
					}
				}
			}
		}
		this.changed = true;
	}
	else if (action.type=='select') {
		// no-op
	}
	else if (action.type=='setColor') {
		for (var ei=0; ei<action.elements.length; ei++) {
			var el = action.elements[ei];
			var sketch = this.sketches[el.sketchId];
			if (!sketch) {
				console.log('setColor could not find sketch '+el.sketchId);				
			} else {
				var element = sketch.getElementById(el.elementId);
				if (!element) {
					console.log('setColor could not find element '+elementId+' in sketch '+sketchId);
				}
				else {
					if (element.line) {
						if (el.undo && el.undo.color)
							element.line.color = el.undo.color;
						else
							console.log('setColor undo could not find undo color for '+elementId+' in sketch '+sketchId);
					}
					else if (element.text) {
						if (el.undo && el.undo.color)
							element.text.color = el.undo.color;
						else
							console.log('setColor undo could not find undo color for '+elementId+' in sketch '+sketchId);
					}
					else {
						console.log('setColor cannot handle non-line element '+elementId+' in sketch '+sketchId);
					}
				}
			}
		}
	}
	else if (action.type=='delete') {
		// NB in reverse order
		for (var si=action.items.length-1; si>=0; si--) {
			var item = action.items[si];
			if (item.undo) {
				if (item.undo.sketch) {
					if (!this.sketches[item.undo.sketch.id]) {
						this.sketches[item.undo.sketch.id] = item.undo.sketch;
					} else {
						console.log('undo delete: sketch '+item.undo.sketch.id+' already present');
						continue;
					}
				}
				else if (item.undo.element) {
					var sketch = this.sketches[item.sketchId];
					if (!sketch) {
						console.log('undo delete: could not find sketch '+item.sketchId+' for element '+item.elementId);
						continue;
					}
					var element = sketch.getElementById(item.elementId);
					if (element) {
						console.log('undo delete: element '+item.elementId+' in sketch '+item.sketchId+' already present');
						continue;
					}
					sketch.elements.push(item.undo.element);
				}
			}
		}
	}
	else if (action.type=='setBackground') {
		var sketch = this.sketches[action.sketchId];
		if (sketch) {
			if (action.undo) {
				if (!action.undo.background) {
					delete sketch.background;
				} else {
					sketch.background = { sketchId : action.undo.background.sketchId, alpha : action.undo.background.alpha };
				}
			}
		}
	}

	else
		throw 'Unknown sketchbook undo action '+action.type;
};
