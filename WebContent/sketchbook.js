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

function getDescriptionTitle(description, id) {
	var title = description;
	var ix = title.lastIndexOf('\n');
	if (ix>=0)
		title = title.substr(0, ix);
	if (title===undefined || title==null || title.length==0) {
		if (id)
			return "Unnamed ("+id+")";
		else
			return "Unnamed";
	}
	return title;
}
function getSketchTitle(sketch) {
	return getDescriptionTitle(sketch.description, sketch.id);
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

/** sequence class */
function Sequence(id) {
	this.id = id;
	this.description = '';
	this.items = [];
}

Sequence.prototype.getTitle = function() {
	return getDescriptionTitle(this.description);
};

/** to JSON */
Sequence.prototype.marshall = function() {
	var jsequence = { id: this.id, description: this.description, items: [] };
	for (var ix=0; ix<this.items.length; ix++)
	{
		var sitem = this.items[ix];
		jsequence.items.push(JSON.parse(JSON.stringify(sitem)));
	}
	return jsequence;
};
/** unmarshall from standard JSON */
Sequence.prototype.unmarshall = function(jsequence) {
	this.id = jsequence.id;
	if (jsequence.description!==undefined)
		this.description = jsequence.description;
	if (jsequence.items!==undefined) {
		for (var eix=0; eix<jsequence.items.length; eix++) {
			var jsitem = jsequence.items[eix];
			// TODO any more checking??
			this.items.push(jsitem);
		}
	}
};

/** get item by id */
Sequence.prototype.getItemById = function(id) {
	for (var i=0; i<this.items.length; i++) {
		var item = this.items[i];
		if (item.id==id)
			return item;
	}
	return null;
};

// Sketchbook Class/constructor
function Sketchbook() {
	// associative array of Sketches
	this.sketches = new Object();
	this.sequences = new Array();
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
	jstate.sequences = new Array();
	for (var six=0; six<this.sequences.length; six++) {
		jstate.sequences.push(this.sequences[six].marshall());
	}
	return jstate;
};

Sketchbook.prototype.unmarshall = function(jstate) {
	this.nextId = jstate.nextId;
	var jversion = jstate.version;
	if (VERSION!=jversion)
		throw "Wrong file version: "+jversion+", expected "+VERSION;
	for (var jsix=0; jsix<jstate.sketches.length; jsix++) {
		var jsketch = jstate.sketches[jsix];
		var sketch = new Sketch();
		sketch.unmarshall(jsketch);
		if (sketch.id==undefined) {
			sketch.id = this.nextId++;
		}			
		this.sketches[sketch.id] = sketch;
	}
	// unmarshall sequence(s)
	this.sequences = new Array();
	if (jstate.sequences) {
		for (var six=0; six<jstate.sequences.length; six++) {
			var jsequence = jstate.sequences[six];
			var sequence = new Sequence();
			sequence.unmarshall(jsequence);
			if (sequence.id===undefined)
				sequence.id = this.nextId++;
			for (var iix=0; iix<sequence.items.length; iix++)
			{
				var sitem = sequence.items[iix];
				if (sitem.id===undefined)
					sitem.id = this.nextId++;
			}
			this.sequences.push(sequence);
		}
	}
};
/** get element by id */
Sketchbook.prototype.getSequenceById = function(id) {
	for (var i=0; i<this.sequences.length; i++) {
		var sequence = this.sequences[i];
		if (sequence.id==id)
			return sequence;
	}
	return null;
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

/** return action to select a sequence item - not really a model action */
Sketchbook.prototype.selectSequenceItemAction = function(sequenceId, sequenceItem) {
	var action = new Action(this, 'select');
	var selection = { sequenceId: sequenceId, sequence: { items: [] } };
	action.selections = [selection];
	var cloned = JSON.parse(JSON.stringify(sequenceItem));
	selection.sequence.items.push(cloned);
	return action;
};

/** return action to select a sequence- not really a model action */
Sketchbook.prototype.selectSequenceAction = function(sequence) {
	var action = new Action(this, 'select');
	var selection = { sequence: sequence.marshall() };
	action.selections = [selection];
	return action;
};

/** return action to select a sketch as a sequence item - not really a model action */
Sketchbook.prototype.selectSketchAsSequenceItemAction = function(sketchId) {
	var action = new Action(this, 'select');
	var selection = { sequence : { items: [] } };
	action.selections = [selection];
	var sitem = { sketchRef: { sketchId: sketchId } };
	selection.sequence.items.push(sitem);
	return action;
};

/** return action to select a sketch as a sequence item - not really a model action */
Sketchbook.prototype.selectFrameAsSequenceItemAction = function(sketchId, frameId) {
	var action = new Action(this, 'select');
	var selection = { sequence: { items: [] } };
	action.selections = [selection];
	var sitem = { frameRef: { sketchId: sketchId, elementId: frameId } };
	selection.sequence.items.push(sitem);
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

function SetLineWidthAction(sketchbook, width) {
	Action.call(this, sketchbook, 'setLineWidth');
	this.width = width;
	this.elements = [];
}

SetLineWidthAction.prototype = new Action();

SetLineWidthAction.prototype.addElement =  function(sketchId, elementId) {
	this.elements.push({ sketchId: sketchId, elementId : elementId});
};


Sketchbook.prototype.setLineWidthAction = function(width) {
	return new SetLineWidthAction(this, width);
};

function SetFontSizeAction(sketchbook, size) {
	Action.call(this, sketchbook, 'setFontSize');
	this.size = size;
	this.elements = [];
}

SetFontSizeAction.prototype = new Action();

SetFontSizeAction.prototype.addElement =  function(sketchId, elementId) {
	this.elements.push({ sketchId: sketchId, elementId : elementId});
};


Sketchbook.prototype.setFontSizeAction = function(size) {
	return new SetFontSizeAction(this, size);
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

DeleteAction.prototype.addSequenceItem =  function(sequenceId, sequenceItemId) {
	this.items.push({ sequenceId: sequenceId, sequenceItemId : sequenceItemId});
};

DeleteAction.prototype.addSequence =  function(sequenceId) {
	this.items.push({ sequenceId: sequenceId });
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

function NewSequenceAction(sketchbook, sequenceId) {
	Action.call(this, sketchbook, 'newSequence');
	this.sequence = new Sequence(sequenceId);
}
NewSequenceAction.prototype = new Action();

/** for copy, i.e. new with items in it */
NewSequenceAction.prototype.addItems = function(items) {
	for (var ei=0; ei<items.length; ei++) {
		var el = items[ei];
		var newel = JSON.parse(JSON.stringify(el));
		delete newel.id;
		this.sequence.items.push(newel);
	}
};

Sketchbook.prototype.newSequenceAction = function(title) {
	var action = new NewSequenceAction(this, this.nextId++);
	if (title)
		action.sequence.description = title;
	return action;
};

/** action to add (copy of) elements, including optional transformation from/to */
Sketchbook.prototype.addSequenceItemsAction = function(sequenceId, sequenceItems, beforeIndex) {
	var action = new Action(this, 'addSequenceItems');
	action.sequenceId = sequenceId;
	action.sequenceItems =  [];
	action.beforeIndex = beforeIndex;
	for (var ei=0; ei<sequenceItems.length; ei++) {
		var el = sequenceItems[ei];
		var newel = JSON.parse(JSON.stringify(el));
		delete newel.id;
		action.sequenceItems.push(newel);
	}
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
	else if (action.type=='setLineWidth') {
		for (var ei=0; ei<action.elements.length; ei++) {
			var el = action.elements[ei];
			var sketch = this.sketches[el.sketchId];
			if (!sketch) {
				console.log('setLineWidth could not find sketch '+el.sketchId);				
			} else {
				var element = sketch.getElementById(el.elementId);
				if (!element) {
					console.log('setLineWidth could not find element '+elementId+' in sketch '+sketchId);
				}
				else {
					if (element.line) {
						el.undo = { width : element.line.width};
						element.line.width = action.width;
					}
					else {
						console.log('setLineWidth cannot handle non-line element '+elementId+' in sketch '+sketchId);
					}
				}
			}
		}
	}
	else if (action.type=='setFontSize') {
		for (var ei=0; ei<action.elements.length; ei++) {
			var el = action.elements[ei];
			var sketch = this.sketches[el.sketchId];
			if (!sketch) {
				console.log('setFontSize could not find sketch '+el.sketchId);				
			} else {
				var element = sketch.getElementById(el.elementId);
				if (!element) {
					console.log('setFontSize could not find element '+elementId+' in sketch '+sketchId);
				}
				else {
					if (element.text) {
						el.undo = { size : element.text.size };
						element.text.size = action.size;
					}
					else {
						console.log('setFontSize cannot handle non-line element '+elementId+' in sketch '+sketchId);
					}
				}
			}
		}
	}
	else if (action.type=='delete') {
		for (var si=0; si<action.items.length; si++) {
			var item = action.items[si];
			if (item.sketchId) {
				var sketch = this.sketches[item.sketchId];
				if (sketch) {
					if (item.elementId) {
						var done = false;
						for (var i=0; i<sketch.elements.length; i++) {
							var element = sketch.elements[i];
							if (element.id==item.elementId) {
								item.undo = { element : element, atIndex: i };
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
					console.log('delete: cannot find sketch '+item.sketchId);
				}
			} 
			else if (item.sequenceId) {
				var sequence = this.getSequenceById(item.sequenceId);
				if (sequence) {
					if (item.sequenceItemId) {
						var done = false;
						for (var i=0; i<sequence.items.length; i++) {
							var sitem = sequence.items[i];
							if (sitem.id==item.sequenceItemId) {
								item.undo = { sequenceItem: sitem, atIndex: i };
								sequence.items.splice(i, 1);
								done = true;
								console.log('delete sequence '+item.sequenceId+' item '+item.sequenceItemId);
								break;
							}
						}
						if (!done)
							console.log('delete: could not find item '+item.sequenceItemId+' in sequence '+item.sequenceId);						
					}
					else {
						var ix = this.getSequenceIndex(item.sequenceId);
						item.undo = { sequence : sequence, atIndex: ix };
						this.sequences.splice(ix, 1);
						console.log('delete sequence '+item.sequenceId);
					}
				}
				else {
					console.log('delete: cannot find sequence '+item.sequenceId);
				}
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
	else if (action.type=='newSequence') {
		// fix item IDs
		for (var ei=0; ei<action.sequence.items.length; ei++) {
			var el = action.sequence.items[ei];
			if (!el.id)
				el.id = this.nextId++;
		}
		this.sequences.push(action.sequence);
		this.changed = true;
	}
	else if (action.type=='addSequenceItems') {
		var sequence = sketchbook.getSequenceById(action.sequenceId);
		if (sequence!==undefined) {
			if (sequence.items===undefined) {
				sequence.items = [];
			}
			var ix = action.beforeIndex;
			if (ix>sequence.items.length) {
				ix = sequence.items.length;
			}
			for (var ei=0; ei<action.sequenceItems.length; ei++) {
				var el = action.sequenceItems[ei];
				if (!el.id) {
					// only allocate once else causes problems for undo/redo
					el.id = this.nextId++;
				}
			}
			sequence.items = sequence.items.slice(0, ix).concat(action.sequenceItems, sequence.items.slice(ix));
			this.changed = true;		
		}
		else
			console.log('addSequenceItems cannot find sequence '+action.sequenceId);
	}
	else
		throw 'Unknown sketchbook do action '+action.type;
};

Sketchbook.prototype.getSequenceIndex = function(sequenceId) {
	for (var six=0; six<this.sequences.length; six++) {
		var sequence = this.sequences[six];
		if (sequence.id==sequenceId) 
			return six;
	}
	return -1;
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
						console.log('setColor cannot handle non-line/text element '+elementId+' in sketch '+sketchId);
					}
				}
			}
		}
	}
	else if (action.type=='setLineWidth') {
		for (var ei=0; ei<action.elements.length; ei++) {
			var el = action.elements[ei];
			var sketch = this.sketches[el.sketchId];
			if (!sketch) {
				console.log('setLineWidth could not find sketch '+el.sketchId);				
			} else {
				var element = sketch.getElementById(el.elementId);
				if (!element) {
					console.log('setLineWidth could not find element '+elementId+' in sketch '+sketchId);
				}
				else {
					if (element.line) {
						if (el.undo && el.undo.width)
							element.line.width = el.undo.width;
						else
							console.log('setLineWidth undo could not find undo width for '+elementId+' in sketch '+sketchId);
					}
					else {
						console.log('setLineWidth cannot handle non-line element '+elementId+' in sketch '+sketchId);
					}
				}
			}
		}
	}
	else if (action.type=='setFontSize') {
		for (var ei=0; ei<action.elements.length; ei++) {
			var el = action.elements[ei];
			var sketch = this.sketches[el.sketchId];
			if (!sketch) {
				console.log('setFontSize could not find sketch '+el.sketchId);				
			} else {
				var element = sketch.getElementById(el.elementId);
				if (!element) {
					console.log('setFontSize could not find element '+elementId+' in sketch '+sketchId);
				}
				else {
					if (element.text) {
						if (el.undo && el.undo.size)
							element.text.size = el.undo.size;
						else
							console.log('setFontSize undo could not find undo color for '+elementId+' in sketch '+sketchId);
					}
					else {
						console.log('setFontSize cannot handle non-text element '+elementId+' in sketch '+sketchId);
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
					if (item.undo.atIndex && item.undo.atIndex<sketch.elements.length)
						sketch.elements.splice(item.undo.atIndex, 0, item.undo.element);
					else
						sketch.elements.push(item.undo.element);
				}
				else if (item.undo.sequence) {
					if (this.getSequenceIndex(item.undo.sequence.id)>=0)
						console.log('undo delete: sequence '+item.undo.sequence.id+' already present');
					else {
						if (item.undo.atIndex && item.undo.atIndex<this.sequences.length)
							this.sequences.splice(item.undo.atIndex, 0, item.undo.sequence);
						else 
							this.sequences.push(item.undo.sequences);
					}
				} 
				else if (item.undo.sequenceItem) {
					var sequence = this.getSequenceById(item.sequenceId);
					if (!sequence) {
						console.log('undo delete: could not find sequence '+item.sequenceId+' for item '+item.sequenceItemId);
						continue;
					}
					var sitem = sequence.getItemById(item.sequenceItemId);
					if (sitem) {
						console.log('undo delete: item '+item.sequenceItemId+' in sequence '+item.sequenceId+' already present');
						continue;
					}
					if (item.undo.atIndex && item.undo.atIndex<sequence.items.length) 
						sequence.items.splice(item.undo.atIndex, 0, item.undo.sequenceItem);
					else
						sequence.items.push(item.undo.sequenceItem);
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
	else if (action.type=='newSequence') {
		var six = this.getSequenceIndex(action.sequence.id);
		if (six) {
			action.sequences.splice(six, 1);
			this.changed = true;
		}
		else {
			console.log('undo newSketch cannot find sequence '+action.sequence.id);
		}
	}
	else if (action.type=='addSequenceItems') {
		var sequence = sketchbook.getSequenceById(action.sequenceId);
		if (sequence!==undefined && sequence.items!==undefined) {
			for (var ei=0; ei<actions.sequenceItems.length; ei++) {
				var el = actions.sequenceItems[ei];
				if (el.id!==undefined) {
					for (var ix=0; ix<sequence.items.length; ix++) {
						if (sequence.items[ix].id==el.id) {
							sequence.items.splice(ix,1);
							break;
						}
					}
				}
			}
		}
		this.changed = true;
	}
	else
		throw 'Unknown sketchbook undo action '+action.type;
};
