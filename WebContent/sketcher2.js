// sketcher2.js
// To do:
// - load/save as zip file with images separate (crashes with large/many images at present!)
// - edit text content, frame title

// - text/shape background color (including alpha?!)
// - toggle fix aspect ratio for image & place
// - mouse scroll button zoom
// - zoom slider for main view
// - toggle auto-zoom/fill for overview window
// - feedback in properties when showing selection vs add item 
// - toggle key-only action mode
// - separate copy / place actions

// - implement undo/redo
// - trap navigate away/close and prompt to save

// - sequences tab...
// -- add sequence as action button
// -- key press handling 
// -- add text into sequence
// -- copy sequence into sequence as ref (=??)
// -- change sequence item channel
// -- multiple views
// -- toggle frame/toFrame
// -- show channel in frame
// -- arrow keys to move through sequence
// -- edit sequence name, sequence text (properties)
// -- move sequence items

// - tidy up selection history
// - edit (move) image position
// - edit (move) line
// - edit line
// - edit (move) frame position
// - edit (move) text position
// - filter in index
// - filter in sequences 1
// - filter in sequences 2
// - frame line width
// - frame text size
// - image/sketch place default zoom size(s)??
// - other element order actions - move to front, move back, move forward
// - image drag n drop
// - image download from URL

// - add versioning support
// ...

// global state
// Sketchbook
var sketchbook;
// current (editor) sketch
var currentSketch;
// current selections view sketch
var currentSequencesSketch;

// showing index?
var showingIndex;
// showing sequences?
var showingSequences;

// paperjs projects
// paperjs project for indexCanvas
var indexProject;
// paperjs project for object[sketch]OverviewCanvas
var objectOverviewProject;
//paperjs project for objectDetailCanvas
var objectDetailProject;
//paperjs project for selectionCanvas
var selectionProject;
//paperjs project for sequencesViewCanvas
var sequencesViewProject;

// per-sketch interface settings e.g. zoom/centre of drawing areas
var editorSettings = new Object();

var undoActions = new Array();
var redoActions = new Array();

// current (active) tool-related state
var tool;
var toolView;
var toolProject;

// selection history - next id
var nextSelectionRecordId = 1;
var selectionRecords = new Object();
var currentSelections = new Array();
var canDeleteSelection = false;

// color(s)
var lastSelectedColorElem = $('#defaultColor');

//imageId -> { url:string, info:{width:, height:}, withImages:[] } 
var images = new Object();
var nextImageId = 1;

//dom id -> frame element 
var sequencesFrames = new Object();

//dom id -> sequence / item
var sequencesItems = new Object();

var animateToInfo;

//property name -> PropertySelect
var propertyEditors = new Object();

//==============================================================================
// display constants

var INDEX_CELL_SIZE = 100;
var INDEX_CELL_MARGIN = 10;
var INDEX_LABEL_HEIGHT = 20;
var LABEL_FONT_SIZE = 12;
var TITLE_FONT_SIZE = 16;
var MIN_SIZE = 10;
var MAX_ZOOM = 10;
var FRAME_TRANSITION_INTERVAL_MS = 50;
var FRAME_TRANSITION_DURATION_S = 0.5;

//==============================================================================
// symbol (sketch) caches

//==============================================================================
// property editor widget(s)

function PropertySelect(name, propertyId) {
	this.name = name;
	this.propertyId = propertyId;
	this.lastSelectedElem = $('#'+propertyId+' .optionDefault');
	var self = this;
	$('#'+propertyId+' .option').on('click', function(ev) { self.onPropertyOptionSelected($(this), ev); });
}

PropertySelect.prototype.onPropertyOptionSelected = function(elem, ev) {
	var id = elem.attr('id');
	console.log('onPropertyOptionSelected '+this.name+' '+id);
	if (!id)
		return;
	$('#'+this.propertyId+' .option').removeClass('optionSelected');
	elem.addClass('optionSelected');
	this.lastSelectedElem = elem;
	var ix = id.indexOf('_');
	if (ix>0)
		id = id.substring(ix+1);
	id = String(id).replace(/_/g, ',');
	console.log('Selected '+this.name+' '+id);
	// override...
	this.onSetValue(id);
};

// called when no longer showing selection value, i.e. new value
PropertySelect.prototype.resetValue = function() {
	$('#'+this.propertyId+' .option').removeClass('optionSelected');
	this.lastSelectedElem.addClass('optionSelected');
};

PropertySelect.prototype.getValue = function() {
	var id = $('#'+this.propertyId+' .optionSelected').attr('id');
	if (!id) {
		console.log('no '+this.name+' selected');
		return null;
	}
	var ix = id.indexOf('_');
	if (ix>0)
		id = id.substring(ix+1);
	return id;
};

PropertySelect.prototype.setValue = function(value) {
	value = String(value).replace(/\,/g, '_');
	$('#'+this.propertyId+' .option').removeClass('optionSelected');
	var sel = $('#'+this.name+'_'+value);
	if (sel.size()>0) {
		console.log('select option '+'#'+this.name+'_'+value);
		sel.addClass('optionSelected');
	}
	else {
		console.log('could not find '+this.name+' value '+value);
	}
};

PropertySelect.prototype.setEnabled = function(enabled) {
	if (enabled)
		$('#'+this.propertyId).removeClass('propertyDisabled');
	else {
		$('#'+this.propertyId).addClass('propertyDisabled');
		this.resetValue();
	}
};

PropertySelect.prototype.onSetValue = function(value) {
	console.log('set property '+this.name+' to '+value);
	// no op
};

// Text as a Property object
function PropertyText(name, propertyId) {
	this.name = name;
	this.propertyId = propertyId;
	this.orphanText = '';
	this.isOrphan = true;
	this.value = '';
	var self = this;
	// (could do on keyup but that might be too much
	var checkfn = function(ev) {
		var value = self.getValue();
		if (value!=self.value) {
			console.log('text change: '+value);
			self.value= value;
			self.onSetValue(value);
		}
	};
	$('#'+this.propertyId+' input').on('change', checkfn);
	$('#'+this.propertyId+' input').on('blur', checkfn);	
}

//called when no longer showing selection value, i.e. new value
PropertyText.prototype.resetValue = function() {
	console.log('text reset, isOrphan='+this.isOrphan+', orphanText='+this.orphanText);
	if (!this.isOrphan) {
		$('#'+this.propertyId+' input').val(this.orphanText);
		this.isOrphan = true;
	}
};
	
PropertyText.prototype.getValue = function() {
	return $('#'+this.propertyId+' input').val();
};

PropertyText.prototype.setValue = function(value) {
	console.log('text set('+value+'), isOrphan='+this.isOrphan+', orphanText='+this.orphanText);
	if (this.isOrphan) {
		this.isOrphan = false;
		this.orphanText = this.getValue();
	}
	this.value = value;
	$('#'+this.propertyId+' input').val(value);
};

PropertyText.prototype.setEnabled = function(enabled) {
	if (enabled)
		$('#'+this.propertyId).removeClass('propertyDisabled');
	else {
		$('#'+this.propertyId).addClass('propertyDisabled');
		this.resetValue();
	}
};

PropertyText.prototype.onSetValue = function(value) {
	// TODO
	console.log('set property '+this.name+' to '+value);
};

function takeOrphanText() {
	if (propertyEditors.text.isOrphan) {
		var text = $('#orphanText').val();
		$('#orphanText').val('');
		return text;
	} else {
		var text = propertyEditors.text.orphanText;
		propertyEditors.text.orphanText = '';
		return text;
	}
}

//==============================================================================
// view stack / breadcrumbs

var BREADCRUMB_TYPE_INDEX = "index";
var BREADCRUMB_TYPE_SEQUENCES = "sequences";
var BREADCRUMB_TYPE_SKETCH = "sketch";

function Breadcrumb(type, sketchId, elementId) {
	this.type = type;
	this.sketchId = sketchId;
	this.elementId = elementId;
}

Breadcrumb.prototype.isIndex = function() {
	return this.type==BREADCRUMB_TYPE_INDEX;
};

Breadcrumb.prototype.isSequences = function() {
	return this.type==BREADCRUMB_TYPE_SEQUENCES;
};

Breadcrumb.prototype.isSketch = function() {
	return this.type==BREADCRUMB_TYPE_SKETCH;
};

Breadcrumb.prototype.toString = function() {
	if (this.type==BREADCRUMB_TYPE_SKETCH)
		return this.type+'('+this.sketchId+')';
	return this.type;
};

// breadcrumb stack
var breadcrumbs = new Array();

function logBreadcrumbs() {
	var s = '';
	for (var b in breadcrumbs) {
		if (s.length>0)
			s += ',';
		else 
			s += '[';
		s += b;		
	}
	s += ']';
	console.log('breadcrumbs: '+breadcrumbs);
}

//==============================================================================
//various internal functions

function animateTo(project, zoom, center) {
	if (animateToInfo && animateToInfo.interval) {
		clearInterval(animateToInfo.interval);
	}
	animateToInfo = { project: project, zoomFrom: project.view.zoom, zoomTo: zoom, centerFrom: project.view.center, centerTo: center,
			timeFrom: new Date().getTime() };
	animateToInfo.interval= setInterval(function() {
		var time = new Date().getTime();
		var elapsed = (time-animateToInfo.timeFrom)/1000.0;
		if (elapsed>FRAME_TRANSITION_DURATION_S) {
			clearInterval(animateToInfo.interval);
			animateToInfo.interval = null;
			elapsed = FRAME_TRANSITION_DURATION_S;
		}
		var a = elapsed/FRAME_TRANSITION_DURATION_S;
		console.log('animate a='+a+' at '+time);//+' '+JSON.stringify(animateToInfo));
		project.view.zoom = a*animateToInfo.zoomTo+(1-a)*animateToInfo.zoomFrom;
		project.view.center = new paper.Point(a*animateToInfo.centerTo.x+(1-a)*animateToInfo.centerFrom.x, 
				a*animateToInfo.centerTo.y+(1-a)*animateToInfo.centerFrom.y);
	}, FRAME_TRANSITION_INTERVAL_MS);
}


/** convert CSS points to screen pixels, see http://stackoverflow.com/questions/279749/detecting-the-system-dpi-ppi-from-js-css */
function pt2px(pt) {
	screenPPI = document.getElementById('ppitest').offsetWidth;
	return pt*screenPPI/72;
}


function clearProject(project) {
	for (var li=0; li<project.layers.length; li++)
		project.layers[li].removeChildren();
	project.symbols = [];
}

function clearImages() {
	images = new Object();
	nextImageId = 1;
	$('#hiddenimages img').remove();
}

/** clear everything! */
function clearAll() {
	sketchbook = new Sketchbook();
	editorSettings = new Object();
	currentSketch = undefined;
	selectionRecords = new Object();
	currentSelectionRecordIds = new Array();
	nextSelectionRecordId = 1;
	
	// remove all items
	clearProject(indexProject);
	clearProject(selectionProject);
	clearProject(objectDetailProject);
	clearProject(objectOverviewProject);

	clearImages();
	
	// remove all extra tabs
	$('.objecttab').remove();
	
	// show index
	onShowIndex();
}
var propertiesShowSelectionFlag = false;
function propertiesShowSelection() {
	return propertiesShowSelectionFlag;
//	var actionId = $('.actionSelected').attr('id');
//	console.log('current action '+actionId);
//	if ('addLineAction'==actionId || 'addFrameAction'==actionId || 'addTextAction'==actionId) {
//		return false;
//	}
//	return true;
}
function parseCssColor(color) {
	var dec = color.match(/^rgb[(](\d\d?\d?),[ ](\d\d?\d?),[ ](\d\d?\d?)[)]$/);
	if (dec && dec.length >= 4) {
		//console.log('color is '+dec[1]+','+dec[2]+','+dec[3]);
		return { red : parseInt(dec[1])/255, green : parseInt(dec[2])/255, blue : parseInt(dec[3])/255 };
	}
	else {
		console.log('could not parse color '+color);
		return null;
	}
}
function parseHexColor(color) {
	var hex = color.match(/^(#)?([0-9a-fA-F][0-9a-fA-F])([0-9a-fA-F][0-9a-fA-F])([0-9a-fA-F][0-9a-fA-F])$/);
	if (hex && hex.length >= 5) {
		console.log('color is '+hex[2]+','+hex[3]+','+hex[4]);
		return { red : parseInt(hex[2],16)/255, green : parseInt(hex[3],16)/255, blue : parseInt(hex[4],16)/255 };
	}
	else {
		console.log('could not parse color '+color);
		return null;
	}
}
function updatePropertiesForCurrentSketch() {
	// background alpha
	if (currentSketch) {
		if (currentSketch.background && currentSketch.background.sketchId)
			$('#backgroundAlphaProperty').removeClass('propertyDisabled');
		else
			$('#backgroundAlphaProperty').addClass('propertyDisabled');
		var alpha = 1;
		if (currentSketch.background && currentSketch.background.alpha)
			alpha = currentSketch.background.alpha;
		$('.alpha').removeClass('alphaSelected');
		$('.alpha').each(function(index, Element) {
			var color = parseCssColor($(this).css('background-color'));
			if (!color)
				return;
			var alpha2 = 1-(color.red*255/256);
			if (Math.abs(alpha-alpha2)<(1/256))
				$(this).addClass('alphaSelected');
		});
	}
}
function hexForColorChannel(value) {
	var s = new Number(value*255).toString(16);
	if (s.length<2)
		s = '0'+s;
	return s;
}
function hexForColor(color) {
	return hexForColorChannel(color.red)+hexForColorChannel(color.green)+hexForColorChannel(color.blue);
}
// black
var DEFAULT_FILL_COLOR = '000000';
//black
var DEFAULT_LINE_COLOR = '000000';
function updatePropertiesForCurrentSelection() {
	var actionId = $('.actionSelected').attr('id');

	if (showingIndex || showingSequences) {
		for (var pname in propertyEditors) {
			var propertyEditor = propertyEditors[pname];
			propertyEditor.resetValue();
			propertyEditor.setEnabled(false);
		}
	}
	else if (!propertiesShowSelection()) {
		// update color to last selected
		var add = actionId.substring(0, 3)=='add';
		for (var pname in propertyEditors) {
			var propertyEditor = propertyEditors[pname];
			propertyEditor.resetValue();
			if (!add)
				propertyEditor.setEnabled(true);
		}
		if (add) {
			propertyEditors.lineColor.setEnabled(actionId=='addLineAction' || actionId=='addCurveAction');
			propertyEditors.fillColor.setEnabled(actionId=='addLineAction');
			propertyEditors.frameStyle.setEnabled(actionId=='addLineAction');
			propertyEditors.textColor.setEnabled(actionId=='addTextAction');
			propertyEditors.lineWidth.setEnabled(actionId=='addLineAction' || actionId=='addCurveAction');
			propertyEditors.textSize.setEnabled(actionId=='addTextAction');
			propertyEditors.text.setEnabled(actionId=='addFrameAction' || actionId=='addTextAction');
		}
	} else {
		// element(s) with color(s)?
		var lineColor = null;
		var fillColor = null;
		var frameStyle = null;
		var textColor = null;
		var lineWidth = null;
		var textSize = null;
		var text = null;
		for (var i=0; i<currentSelections.length; i++) {
			var cs = currentSelections[i];
			if (cs.record.selection.elements) {
				for (var ei=0; ei<cs.record.selection.elements.length; ei++) {
					var el = cs.record.selection.elements[ei];
					if (el.line) {
						if (el.line.lineColor) 
							lineColor = el.line.lineColor;
						else 
							lineColor = DEFAULT_LINE_COLOR;
						if (el.line.lineWidth)
							lineWidth = el.line.lineWidth;
						if (el.line.fillColor)
							fillColor = el.line.fillColor;
						else
							fillColor = DEFAULT_FILL_COLOR;
						if (el.line.frameStyle)
							frameStyle = el.line.frameStyle;
						else
							frameStyle = 'border';
					}
					else if (el.text) {
						if (el.text.textColor) 
							textColor = el.text.textColor;						
						if (el.text.textSize)
							textSize = el.text.textSize;
						if (el.text.content)
							text = el.text.content;
					}
					else if (el.frame) {
						if (el.frame.description)
							text = el.frame.description;
					}
					else if (el.sequence) {
						if (el.sequence.description)
							text = el.sequence.description;
					}
					else if (el.sequenceItem) {
						if (el.sequenceItem.text)
							text = el.sequenceItem.text;
					}
				}
			}
		}
		if (lineColor) {
			propertyEditors.lineColor.setEnabled(true);
			propertyEditors.lineColor.setValue(hexForColor(lineColor));
		}
		else 
			propertyEditors.lineColor.setEnabled(false);
		if (fillColor) {
			propertyEditors.fillColor.setEnabled(true);
			propertyEditors.fillColor.setValue(hexForColor(fillColor));
		}
		else
			propertyEditors.fillColor.setEnabled(false);
		if (frameStyle) {
			propertyEditors.frameStyle.setEnabled(true);
			propertyEditors.frameStyle.setValue(frameStyle);
		}
		else
			propertyEditors.frameStyle.setEnabled(false);
			
		if (textColor) {
			propertyEditors.textColor.setEnabled(true);
			propertyEditors.textColor.setValue(hexForColor(textColor));
		}
		else
			propertyEditors.textColor.setEnabled(false);
		if (lineWidth) {
			propertyEditors.lineWidth.setEnabled(true);
			propertyEditors.lineWidth.setValue(lineWidth);
		}
		else
			propertyEditors.lineWidth.setEnabled(false);
		if (textSize) {
			propertyEditors.textSize.setEnabled(true);
			propertyEditors.textSize.setValue(textSize);
		}
		else
			propertyEditors.textSize.setEnabled(false);
		if (text) {
			propertyEditors.text.setEnabled(true);
			propertyEditors.text.setValue(text);
		}
		else
			propertyEditors.text.setEnabled(false);
	}
}
	
/** called by sketchertools */
function getProperty(name, defaultValue) {
	if (!propertyEditors[name]) {
		console.log('property '+name+' unknown');
		return defaultValue;
	}
	var value = propertyEditors[name].getValue();
	if (value!==null && value!==undefined) {
		console.log('property '+name+' is '+value);
		return value;
	}
	console.log('Could not find property '+name);
	return defaultValue;
}
/** called by sketchertools */
function getLineColor() {
	return '#'+getProperty('lineColor', '000000');
}
/** called by sketchertools */
function getFillColor() {
	return '#'+getProperty('fillColor', '000000');
}
/** called by sketchertools */
function getTextColor() {
	return '#'+getProperty('textColor', '000000');
}

function handleActionSelected(id) {
	var disabled = $('#'+id).hasClass('actionDisabled');
	if (disabled)
		return false;
// instantaneous actions / no toggle
	if (id=='setBackgroundAction') {
		if (currentSelections.length>0 && currentSelections[0].record.selection.sketch && currentSelections[0].record.selection.sketch.id) {
			var sketchId = currentSelections[0].record.selection.sketch.id;
			if (currentSketch && sketchbook.sketches[sketchId]) {
				if (!currentSketch.background || !currentSketch.background.sketchId || currentSketch.background.sketchId!=sketchId) {
					var alpha = (currentSketch.background) ? currentSketch.background.alpha : undefined;
					var action = sketchbook.setBackgroundAction(currentSketch.id, sketchId, alpha);
					doAction(action);
				}
			}
		}
		return;
	}
	else if (id=='clearBackgroundAction') {
		if (currentSketch && currentSketch.background && currentSketch.background.sketchId) {
			var action = sketchbook.setBackgroundAction(currentSketch.id);
			doAction(action);
		}
		return;
	}
	else if (id=='backAction') {
		logBreadcrumbs();
		if (breadcrumbs.length>1) {
			breadcrumbs.pop();
			var breadcrumb = breadcrumbs[breadcrumbs.length-1];
			//console.log('back to '+breadcrumb.type);
			if (breadcrumb.isIndex())
				showIndex(true);
			else if (breadcrumb.isSequences())
				showSequences(true);
			else if (breadcrumb.isSketch()) 
				showEditor(breadcrumb.sketchId, true);
			else 
				console.log('unsupported breadcrumb type '+breadcrumb.type);
		}
		else console.log('no breadcrumb');
		return;
	}
	
	$('.action').removeClass('actionSelected');
	$('#'+id).addClass('actionSelected');
	// TODO immediate action?
	console.log('Selected action '+id);

	if (id=='selectAction') {
		handlePropertiesShowSelected('propertiesShowSelection');
	} 
	else if (id.substr(0,3)=='add') {
		handlePropertiesShowSelected('propertiesShowNew');		
	}
	
	updatePropertiesForCurrentSelection();
	
	if (id=='deleteAction') {
		var action = sketchbook.deleteAction();
		for (var si=0; si<currentSelections.length; si++) {
			var cs = currentSelections[si];
			if (cs.record.selection.sketch && cs.record.selection.sketch.id) {
				// delete sketch
				action.addSketch(cs.record.selection.sketch.id);
			} else if (cs.record.selection.elements) {
				for (var ei=0; ei<cs.record.selection.elements.length; ei++) {
					var element = cs.record.selection.elements[ei];
					if (element.id)
						action.addElement(cs.record.selection.sketchId, element.id);
					console.log('delete element '+cs.record.selection.sketchId+'/'+element.id); //+' - '+JSON.stringify(element));
				}
			}
			else if (cs.record.selection.sequence) {
				if (cs.record.selection.sequence.id)
					action.addSequence(cs.record.selection.sequence.id);
				else if (cs.record.selection.sequence.items) {
					for (var ii=0; ii<cs.record.selection.sequence.items.length; ii++) {
						var sitem = cs.record.selection.sequence.items[ii];
						if (sitem.id)
							action.addSequenceItem(cs.record.selection.sequenceId, sitem.id);
					}
				}
			}
		}
		$('#'+id).removeClass('actionSelected');
		$('#selectAction').addClass('actionSelected');
		updatePropertiesForCurrentSelection();

		canDeleteSelection = false;
		
		if (action.items.length>0)
			doAction(action);
		else {
			console.log('nothing to delete');
		}
	}
	else if (id=='copyAction') {
		// if showing Index view then immediately copy selected sketch(es)
		if (showingIndex) {
			// each current selection -> new sketch
			for (var si=0; si<currentSelections.length; si++) {
				var cs = currentSelections[si];
				var action = sketchbook.newSketchAction();
				if (cs.record.selection.sketch) {
					// copy an entire sketch
					action.sketch.description = cs.record.selection.sketch.description;
					action.addElements(cs.record.selection.sketch.elements);
				} else if (cs.record.selection.elements) {
					// copy elements into a new sketch
					action.addElements(cs.record.selection.elements);
				}
				doAction(action);
			}
			// revert to select
			$('#'+id).removeClass('actionSelected');
			$('#selectAction').addClass('actionSelected');
			updatePropertiesForCurrentSelection();
			return;
		}
		// copy within sketch... uses copy tool
	}
	else if (id=='editAction') {
		for (var si=0; si<currentSelections.length; si++) {
			var cs = currentSelections[si];
			var sketchId = null;
			var elementId = null;
			if (cs.record.selection.sketch && cs.record.selection.sketch.id) {
				sketchId = cs.record.selection.sketch.id;
			}
			else if (cs.record.selection.elements && cs.record.selection.elements.length>0 && cs.record.selection.elements[0].icon) {
				sketchId = cs.record.selection.elements[0].icon.sketchId;
				elementId = cs.record.selection.elements[0].icon.elementId;
			}
			else if (cs.record.selection.sequence && cs.record.selection.sequence.items && cs.record.selection.sequence.items.length>0) {
				if (cs.record.selection.sequence.items[0].sketchRef)
					sketchId = cs.record.selection.sequence.items[0].sketchRef.sketchId;
				else if (cs.record.selection.sequence.items[0].frameRef) {
					sketchId = cs.record.selection.sequence.items[0].frameRef.sketchId;
					elementId = cs.record.selection.sequence.items[0].frameRef.elementId;
				}
			}
			if (sketchId) {
				if (sketchbook.sketches[sketchId]) {
					showEditor(sketchId, false, elementId);
					// TODO element(s) within sketch? i.e. when currentSketch = sketch
					// note: showEditor resets actions
					$('#'+id).removeClass('actionSelected');
					$('#selectAction').addClass('actionSelected');
					updatePropertiesForCurrentSelection();
					return;
				}
				else 
					console.log('Could not find to edit sketch '+sketchId);
			}
		}
	}
}
//GUI entry point
function onActionSelected(event) {
	var id = $(this).attr('id');
	handleActionSelected(id);
}
function handlePropertiesShowSelected(id) {
	if (id=='propertiesShowSelection') {
		if (!$('#propertiesShowSelection').hasClass('propertiesShowDisabled')) {
			$('.propertiesShow').removeClass('propertiesShowSelected');
			$('#propertiesShowSelection').addClass('propertiesShowSelected');
			propertiesShowSelectionFlag = true;
			updatePropertiesForCurrentSelection();
		}
	} else {
		if (!$('#propertiesShowNew').hasClass('propertiesShowDisabled')) {
			$('.propertiesShow').removeClass('propertiesShowSelected');
			$('#propertiesShowNew').addClass('propertiesShowSelected');
			propertiesShowSelectionFlag = false;
			updatePropertiesForCurrentSelection();
		}		
	}
}
//GUI entry point
function onPropertiesShowSelected(event) {
	var id = $(this).attr('id');
	handlePropertiesShowSelected(id);
}

//GUI entry point
function showIndex(noBreadcrumb) {
	if (!noBreadcrumb && !showingIndex) {
		breadcrumbs.push(new Breadcrumb(BREADCRUMB_TYPE_INDEX));
	}
	
	// rebuild index hashtags
	$('#indexHashtags .indexHashtag').remove();
	var hashtags = [];
	for (var sid in sketchbook.sketches) {	
		var sketch = sketchbook.sketches[sid];
		console.log('check sketch description for tags: '+sketch.description);
		if (sketch.description) {
			var re = /([#]\w+)/g;
			var match;
			while (match=re.exec(sketch.description)) {
				console.log('found tag '+match[1]+' in '+match[0]);
				var tag = match[1];
				if (hashtags.indexOf(tag)<0)
					hashtags.push(tag);
			}
		}
	}
	for (var tix=0; tix<hashtags.length; tix++) {
		var tag = hashtags[tix];
		$('#indexHashtagsMarker').after('<input type="button" value="'+tag+'" class="button indexHashtag" onclick="javascript:onObjectFilterTag(\''+tag+'\');"/>');
	}
	// update tab classes
	$('.tab').removeClass('tabselected');
	$('#tabIndex').addClass('tabselected');
	$('.tabview').hide();
	$('#index').show();
	currentSketch = undefined;
	showingSequences = false;
	canDeleteSelection = false;
	showingIndex = true;	

	// update actions & properties
	$('.property').addClass('propertyDisabled');

	$('.action').addClass('actionDisabled');
	$('#selectAction').removeClass('actionDisabled');
	$('#showAllAction').removeClass('actionDisabled');
	$('#zoomInAction').removeClass('actionDisabled');
	$('#zoomOutAction').removeClass('actionDisabled');
	$('#panAction').removeClass('actionDisabled');
	onActionSelected.call($('#selectAction'));

	updateActionsForCurrentSelection();
	updatePropertiesForCurrentSelection();
	
	var max = 0;
	var x = 0;
	var y = 0;
	
	clearProject(indexProject);
	
	var filter = $('#indexFilterText').val();
	console.log('index filter: '+filter);
	
	for (var sid in sketchbook.sketches) {
		
		var sketch = sketchbook.sketches[sid];
		if (filter && (!sketch.description || sketch.description.indexOf(filter)<0)) {
			console.log('skip index item '+sid+' with filter '+filter);
			continue;
		}
		
		var group = createIndexItem(sid, indexProject);
		group.translate(new paper.Point(x*INDEX_CELL_SIZE, y*INDEX_CELL_SIZE));
		console.log('add index item '+sid+' at '+x+','+y+': '+group);
		
		// lay out in an outwards 'square spiral'
		if (x>(-max) && x<max && y==(-max))
			x++;
		else if (x==max && y<max)
			y++;
		else if (y==max && x>(-max))
			x--;
		else if (x==(-max) && y>(-max))
			y--;
		else {
			y--;
			max++;
		}
		indexProject.activeLayer.addChild(group);
	}
		
	// scaling problem workaround
	handleResize();
	
	showAll(indexProject);
}

/** GUI entry from sequences frame div mousedown */
function onSequenceFrameSelected(ev) {
	var id = $(this).attr('id');
	
	$('.sequenceFrame').removeClass('sequenceFrameSelected');
	$('.sequenceObject').removeClass('sequenceFrameSelected');
	$('.sequenceSequence').removeClass('sequenceFrameSelected');
	$('.sequenceItem').removeClass('sequenceFrameSelected');
	$(this).addClass('sequenceFrameSelected');
	
	var fr = sequencesFrames[id];
	if (fr) {
		console.log('selected frame '+fr.sketchId+'/'+fr.elementId);
		
		var sketch = sketchbook.sketches[fr.sketchId];
		if (sketch) {
			if (fr.elementId) {
				var action = sketchbook.selectFrameAsSequenceItemAction(sketch.id, fr.elementId);
				doAction(action);
			}
			else {
				// sketch
				var action = sketchbook.selectSketchAsSequenceItemAction(sketch.id);
				doAction(action);
			}
		}
	}
	else 
		console.log('could not find sequencesFrames '+id);
}
/** update sequences 1 list */
function updateSequences1() {
	var div = $('#sequences1Div');
	div.empty();

	sequencesFrames = new Object();

	for (var si in sketchbook.sketches) {
		var frames = [];
		var sketch = sketchbook.sketches[si];
		for (var ei=0; ei<sketch.elements.length; ei++) {
			var el = sketch.elements[ei];
			if (el.frame)
				frames.push(el);
		}
		var objid = '#seq1_obj'+sketch.id;
		sequencesFrames[objid] = { sketchId: sketch.id };
		div.append('<div id="'+objid+'" class="sequenceObject">Sketch '+sketch.getTitle()+'</div>');
		for (var fi=0; fi<frames.length; fi++) {
			var el = frames[fi];
			var id = objid+'_frame'+el.id;
			sequencesFrames[id] = { frame: el.frame, sketchId: sketch.id, elementId: el.id };
			div.append('<div id="'+id+'" class="sequenceFrame">Frame '+el.frame.description+'</div>');
		}
	}
	// TODO
}

/** get sequenceItems corresponding to current selection - for copy */
function getSelectedSequenceItems() {
	var sequenceItems = [];
	// convert selection to elements to add
	for (var si=0; si<currentSelections.length; si++) {
		var cs = currentSelections[si];
		// TODO sequence -> sequence ref??
		if (cs.record.selection.sequence && cs.record.selection.sequence.items) {
			for (var ii=0; ii<cs.record.selection.sequence.items.length; ii++) {
				var sitem = cs.record.selection.sequence.items[ii];
				// copy
				var c = JSON.parse(JSON.stringify(sitem));
				sequenceItems.push(c);
			}			
		}
	}
	return sequenceItems;
}
/** GUI entry from sequences frame div mousedown */
function onSequenceItemSelected(ev) {
	var id = $(this).attr('id');
	console.log('sequence item '+id+' selected');

	var si = sequencesItems[id];
	if ($('#selectAction').hasClass('actionSelected')) {

		$('.sequenceFrame').removeClass('sequenceFrameSelected');
		$('.sequenceObject').removeClass('sequenceFrameSelected');
		$('.sequenceSequence').removeClass('sequenceFrameSelected');
		$('.sequenceItem').removeClass('sequenceFrameSelected');
		$(this).addClass('sequenceFrameSelected');

		if (si) {
			if (si.sequenceItem) {
				// an item
				var action = sketchbook.selectSequenceItemAction(si.sequenceId, si.sequenceItem);
				doAction(action);
			} else if (si.sequenceId) {
				var six = sketchbook.getSequenceIndex(si.sequenceId);
				if (six>=0) {
					// whole sequence
					var action = sketchbook.selectSequenceAction(sketchbook.sequences[six]);
					doAction(action);
				}
				else {
					console.log('sequence item selected sequence '+si.sequenceId+' - not found');
				}
			}
		}		
	} 
	else if ($('#copyAction').hasClass('actionSelected')) {
		if (si) {
			if (si.sequenceId) {
				var sequence = sketchbook.getSequenceById(si.sequenceId);
				if (sequence) {
					var sequenceItems = getSelectedSequenceItems();
					
					var beforeIndex = 0;
					if (si.sequenceItem) {
						for (; beforeIndex<sequence.items.length; beforeIndex++)
							if (sequence.items[beforeIndex].id==si.sequenceItem.id) {
								beforeIndex++;
								break;
							}
					}
					var action = sketchbook.addSequenceItemsAction(si.sequenceId, sequenceItems, beforeIndex);
					doAction(action);
				}
			}
			else 
				console.log('sequence item copy sequence '+si.sequenceId+' not fonnd');
		}
	}
}
/** get text for a sequence item */
function getSequenceItemText(sitem) {
	var html = '';
	var sketchId = null;
	var elementId = null;
	if (sitem.text)
		html += sitem.text;
	if (sitem.frameRef) {
		sketchId = sitem.frameRef.sketchId;
		elementId = sitem.frameRef.elementId;
	}
	else if (sitem.sketchRef) {
		sketchId = sitem.sketchRef.sketchId;
	}
	else if (sitem.toFrameRef) {
		sketchId = sitem.toFrameRef.sketchId;
		elementId = sitem.toFrameRef.elementId;				
	}
	if (sketchId) {
		var sketch = sketchbook.sketches[sketchId];
		var element = null;
		if (sketch && elementId)
			element = sketch.getElementById(elementId);
		if (elementId) {
			if (element) {
				if (element.frame) 
					html += 'Frame '+element.frame.description+' in ';
				else
					html += 'Non-frame '+element.id+' in ';
			}
			else 
				html += 'Frame '+elementId+' (unknown) in ';
		}
		if (sketch)
			html += 'Sketch '+sketch.getTitle();
		else
			html += 'ketch '+sketchId+' (unknown)';
	}
	if (sitem.sequenceRef) {
		var six = sketchbook.getSequenceIndex(sitem.sequenceRef.sequenceId);
		if (six>=0) 
			html += 'Sequence '+sketchbook.sequences[six].getTitle();
		else
			html += 'Sequence '+sitem.sequenceRef.sequenceId+' (unknown)';
	}
	return html;
}
/** update sequences 1 list */
function updateSequences2() {
	var div = $('#sequences2Div');

	$('#sequences2Div .sequenceSequence').remove();
	$('#sequences2Div .sequenceItem').remove();
	
	sequencesItems = new Object();
	for (var si=0; si<sketchbook.sequences.length; si++) {
		var sequence = sketchbook.sequences[si];

		var objid = '#seq2_seq'+sequence.id;
		sequencesItems[objid] = { sequenceId: sequence.id };
		div.append('<div id="'+objid+'" class="sequenceSequence">Sequence '+sequence.getTitle()+'</div>');
		
		for (var ii=0; ii<sequence.items.length; ii++) {
			var sitem = sequence.items[ii];
			var id = objid+'_item'+sitem.id;
			sequencesItems[id] = { sequenceId: sequence.id, sequenceItem: sitem };
			var html = '<div id="'+id+'" class="sequenceItem">';
			// TODO toFrame
			//if (sitem.toFrameRef) {
			//	html += '<div class="toFrameToggle toFrameActive"></div>';
			//}
			//else {
			//	html += '<div class="toFrameToggle"></div>';
			//}
			// TODO multiple channels
			html += '<div class="channelToggle channelActive">1</div>';
			html += getSequenceItemText(sitem);
			html += '</div>';
			div.append(html);
		}
	}
	
	// TODO

}

//GUI entry point
function showSequences(noBreadcrumb) {
	if (!noBreadcrumb && !showingSequences) {
		breadcrumbs.push(new Breadcrumb(BREADCRUMB_TYPE_SEQUENCES));
	}
	
	// update tab classes
	$('.tab').removeClass('tabselected');
	$('#tabSequences').addClass('tabselected');
	$('.tabview').hide();
	$('#index').hide();
	$('#sequences').show();
	currentSketch = undefined;
	showingIndex = false;	
	canDeleteSelection = false;
	showingSequences = true;	

	// update actions & properties
	$('.property').addClass('propertyDisabled');

	$('.action').addClass('actionDisabled');
	$('#selectAction').removeClass('actionDisabled');
	onActionSelected.call($('#selectAction'));

	updateActionsForCurrentSelection();
	updatePropertiesForCurrentSelection();
	
	updateSequences1();
	updateSequences2();
	clearProject(sequencesViewProject);
	currentSequencesSketch = undefined;

	// scaling problem workaround
	handleResize();
	
}

var ERROR_IMAGE_URL = "error_image.png";

/** load image if not already then call withImage(image) */
function withImage(url, withImage) {
	for (var imageId in images) {
		var image = images[imageId];
		if (image.url==url) {
			var info = image.info;
			if (info) {
				if (withImage)
					withImage(image);
			} else {
				image.withImages.push(withImage);
			}
		}
	}
	// add image
	var imageId = 'image'+(nextImageId++);
	var image = { url: url, withImages: [withImage] };
	images[imageId] = image;
	$('#hiddenimages').append('<img id="'+imageId+'" class="hidden" style="display:none" src="'+url+
            '" title="'+imageId+'"/>');
	console.log('added image '+imageId);
	var triedError = false;
	var onloaded = function(images, proper, broken) {
		if (proper.length>0) {
			var imageel = proper[0];
			console.log('loaded image '+imageId+' ('+imageel.width+'x'+imageel.height+')');
			// image
			image.info = { width: imageel.width, height: imageel.height };
			for (var ici=0; ici<image.withImages.length; ici++) {
				var cb = image.withImages[ici];
				if (cb)
					cb(image);
			}
			image.withImages = [];
		}
		else if (!triedError) {
			console.log('problem loading image '+imageId+' - using error');
			setTimeout(function() {
				$('#'+imageId).prop('src',ERROR_IMAGE_URL);				
				$('#'+imageId).imagesLoaded( onloaded );
			}, 0);
		}
		else
			console.log('BAD BAD BAD problem loading error image!');
	};
//	console.log('image width (immediate) = '+$('#'+imageId).attr('width'));
	$('#'+imageId).imagesLoaded( onloaded );
}


// unmarshall and update interface, e.g. from onLoad
// Merges by default
function restoreState(jstate, mergeFlag) {
	var sketchbook2 = sketchbook;
	if (mergeFlag) {
		sketchbook2 = new Sketchbook();
		try {
			sketchbook2.unmarshall(jstate);
		}
		catch (err) {
        	alert('Sorry, there was a problem reading that file - it is probably not a sketchbook');
			return;
		}
		sketchbook.merge(sketchbook2);
	}
	else {
		try {
			sketchbook.unmarshall(jstate);
		}
		catch (err) {
			alert('Sorry, there was a problem reading that file - it is probably not a sketchbook');
			sketchbook = new Sketchbook();
			return;
		}
	}	
	var num = 0;
	var count = 0;
	var loaded = function(image) {
		count++;
		if (count==num)
			showIndex();
	};
	// load any images...
	for (var si in sketchbook2.sketches) {
		var sketch = sketchbook2.sketches[si];
		for (var ei=0; ei<sketch.elements.length; ei++) {
			var el = sketch.elements[ei];
			if (el.image && el.image.url) {
				num++;
				withImage(el.image.url, loaded);
			}
		}
	}
	if (num==0)
		showIndex();
	// TODO?
}

// setup one canvas/project. Return project
function setupCanvas(canvasId) {
	var canvas = document.getElementById(canvasId);
	paper.setup(canvas);
	var project = paper.project;
	// extra layer for background
	new paper.Layer();
	// extra layer for highlights
	new paper.Layer();
	project.layers[1].activate();
	return project;
}

// setup paper js (one-time)
function setupPaperjs() {
	paper.setup();

	indexProject = setupCanvas('indexCanvas');
	objectOverviewProject = setupCanvas('objectOverviewCanvas');	
	objectDetailProject = setupCanvas('objectDetailCanvas');
	selectionProject = setupCanvas('selectionCanvas');
	sequencesViewProject = setupCanvas('sequencesViewCanvas');
}

// register mouse-related events
function registerHighlightEvents() {
	$(document).on('mouseover', 'div .tab', function() {
		$(this).addClass('tabhighlight');
	});
	$(document).on('mouseout', 'div .tab', function() {
		$(this).removeClass('tabhighlight');
	});
	$(document).on('mouseover', 'div .action', function() {
		$(this).addClass('actionHighlight');
	});
	$(document).on('mouseout', 'div .action', function() {
		$(this).removeClass('actionHighlight');
	});
	$(document).on('mouseover', 'div .propertiesShow', function() {
		$(this).addClass('propertiesShowHighlight');
	});
	$(document).on('mouseout', 'div .propertiesShow', function() {
		$(this).removeClass('propertiesShowHighlight');
	});
	$(document).on('mouseover', 'div #addSequence', function() {
		$(this).addClass('addSequenceHighlight');
	});
	$(document).on('mouseout', 'div #addSequence', function() {
		$(this).removeClass('addSequenceHighlight');
	});
	$(document).on('mouseover', 'div .sequenceObject', function() {
		$(this).addClass('sequenceHighlight');
	});
	$(document).on('mouseout', 'div .sequenceObject', function() {
		$(this).removeClass('sequenceHighlight');
	});
	$(document).on('mouseover', 'div .sequenceFrame', function() {
		$(this).addClass('sequenceHighlight');
	});
	$(document).on('mouseout', 'div .sequenceFrame', function() {
		$(this).removeClass('sequenceHighlight');
	});
	$(document).on('mouseover', 'div .sequenceSequence', function() {
		$(this).addClass('sequenceHighlight');
	});
	$(document).on('mouseout', 'div .sequenceSequence', function() {
		$(this).removeClass('sequenceHighlight');
	});
	$(document).on('mouseover', 'div .sequenceItem', function() {
		$(this).addClass('sequenceHighlight');
	});
	$(document).on('mouseout', 'div .sequenceItem', function() {
		$(this).removeClass('sequenceHighlight');
	});
	$(document).on('mouseover', 'div.option', function() {
		$(this).addClass('optionHighlight');
	});
	$(document).on('mouseout', 'div.option', function() {
		$(this).removeClass('optionHighlight');
	});
	$(document).on('mouseover', 'div .alpha', function() {
		$(this).addClass('alphaHighlight');
	});
	$(document).on('mouseout', 'div .alpha', function() {
		$(this).removeClass('alphaHighlight');
	});
	$(document).on('mouseenter', 'textarea',function() {
		$(this).focus();
	});
	$(document).on('mouseout', 'textarea',function() {
		$(this).blur();
		$('#orphanText').focus();
	});
	$(document).on('mouseenter', 'canvas',function() {
		$('#orphanText').blur();
	});
	$(document).on('mouseout', 'canvas',function() {
		$('#orphanText').focus();
	});
	$(document).on('mouseenter', 'body',function() {
		$('#orphanText').focus();
	});
	$(document).on('mouseenter', 'input[type=text]',function() {
		$(this).focus();
	});
	$(document).on('mouseout', 'input[type=text]',function() {
		$(this).blur();
		$('#orphanText').focus();
	});

}

/** get paperjs project for event target iff it is a canvas.
 * 
 * @return View if found, else null
 */ 
function getProject(target) {
	// for newer paperscript with one view/project
	for (var pi in paper.projects) {
		var p = paper.projects[pi];
		if (p.view && p.view._element===target) {
			//console.log('in project '+p);
			return p;
		}
		//console.log('- not in project '+p);
	}
	return null;
}

//redraw all views 
function redraw(ps) {
	for (var vi in ps.View._views) {
		var v = ps.View._views[vi];
		if (ps===v._scope)
			v.draw();
	}
}


/** helper function to get page offset */
function pageOffsetTop(target) {
	var top = 0;
	while (target) {
		top += target.offsetTop;
		target = target.offsetParent;
	}
	return top;
}
/** helper function to get page offset */
function pageOffsetLeft(target) {
	var left = 0;
	while (target) {
		left += target.offsetLeft;
		target = target.offsetParent;
	}
	return left;
}

/** function to map view pixel position to project coordinates.
 * @return Point */
function view2project(view, pageX, pageY) {
	return view.viewToProject(new paper.Point(pageX-pageOffsetLeft(view._element), pageY-pageOffsetTop(view._element)));
}


/** end of tool */
function toolUp(ev) {
	if (tool) {
		// switch tool
		toolProject.activate();
		var action = tool.end(view2project(toolView, ev.pageX, ev.pageY));
		tool = undefined;
		if (action)
			doAction(action);
		//TODO handleEdit(tool, toolView);
		redraw(paper);
	}	
}
/** check highlight */
function checkHighlight(ev) {
	if (tool && tool.name=='highlight') {
		var p = getProject(ev.target);
		if (p!==tool.project) {
			toolUp(tool);
			tool = null;
		}
	}
	if (!tool) {
		var p = getProject(ev.target);
		if (p && p.view) {
			if ($('#selectAction').hasClass('actionSelected') || 
					($('#orderToBackAction').hasClass('actionSelected') && p!==selectionProject)) {
				tool = new HighlightTool(p);
				toolView = p.view;
				toolProject = p;
				tool.begin(view2project(toolView, ev.pageX, ev.pageY));
			}	
		}

	}
}

/** get new/current tool */
function getNewTool(project, view) {
	if ($('#selectAction').hasClass('actionSelected')) {
		var sketchId = currentSketch ? currentSketch.id : undefined;
		return new SelectTool(project, sketchbook, sketchId);
	}
	if (project!=selectionProject) {
		if ($('#showAllAction').hasClass('actionSelected')) {
			return new ShowAllTool(project);
		}
		else if ($('#zoomInAction').hasClass('actionSelected')) {
			return new ZoomTool(project, true);
		}
		else if ($('#zoomOutAction').hasClass('actionSelected')) {
			return new ZoomTool(project, false);
		}
		else if ($('#panAction').hasClass('actionSelected')) {
			return new PanTool(project);
		}
	}
	if (project==objectOverviewProject || project==objectDetailProject) {
		if ($('#orderToBackAction').hasClass('actionSelected')) {
			if (currentSketch && currentSketch.id)
				return new OrderToBackTool(project, sketchbook, currentSketch.id);
		}
		else if ($('#addLineAction').hasClass('actionSelected')) {
			if (currentSketch && currentSketch.id)
				return new LineTool(project, sketchbook, currentSketch.id);
		}
		else if ($('#addCurveAction').hasClass('actionSelected')) {
			if (currentSketch && currentSketch.id)
				return new LineTool(project, sketchbook, currentSketch.id, true);
		}
		else if ($('#addFrameAction').hasClass('actionSelected')) {
			if (currentSketch && currentSketch.id)
				return new FrameTool(project, sketchbook, currentSketch.id, takeOrphanText());
		}
		else if ($('#addTextAction').hasClass('actionSelected')) {
			if (currentSketch && currentSketch.id)
				return new TextTool(project, sketchbook, currentSketch.id, takeOrphanText());// default
		}
		else if ($('#copyAction').hasClass('actionSelected') || $('#placeAction').hasClass('actionSelected')/* && !showingIndex*/) {
			var sketchId = currentSketch ? currentSketch.id : undefined;
			var elements = [];
			// convert selection to elements to add
			for (var si=0; si<currentSelections.length; si++) {
				var cs = currentSelections[si];
				if (cs.record.selection.sketch) {
					// copy an entire sketch = icon/link ('place')
					// TODO styling
					var icon = { icon: { sketchId: cs.record.selection.sketch.id, x:0, y:0, width:INDEX_CELL_SIZE, height:INDEX_CELL_SIZE } };
					elements.push(icon);
				} else if (cs.record.selection.elements) {
					// copy elements into a new sketch
					for (var ei=0; ei<cs.record.selection.elements.length; ei++) {
						// unless it is a frame from another sketch
						var el = cs.record.selection.elements[ei];
						if (el.frame && sketchId!==cs.record.selection.sketchId) {
							// TODO styling
							var icon = { icon: { sketchId: cs.record.selection.sketchId, elementId: el.id, x:0, y:0, width:INDEX_CELL_SIZE, height:INDEX_CELL_SIZE } };
							elements.push(icon);						
						}
						else
							elements.push(cs.record.selection.elements[ei]);
					}
				}
			}
			return new CopyToSketchTool(project, sketchbook, sketchId, elements, images);
		}
	}
	console.log('current active tool unsupported in this project: '+$('.actionSelected').attr('id'));
	return new Tool('unknown', project);
}

//keyboard handling

/** current key down */
var keyDown;

//some special key codes - from http://www.quirksmode.org/js/keys.html#t00
var KEY_BACKSPACE = 8;
var KEY_TAB = 9;
var KEY_SHIFT = 16;
var KEY_CTRL = 17;
var KEY_CAPSLOCK = 20;
var KEY_PAGEUP = 33;
var KEY_PAGEDOWN = 34;
var KEY_END = 35;
var KEY_HOME = 36;
var KEY_LEFT = 37;
var KEY_UP = 38;
var KEY_RIGHT = 39;
var KEY_DOWN = 40;
var KEY_INSERT = 45;
var KEY_DELETE = 46;
var KEY_NUMLOCK = 144;
var KEY_ENTER = 13;
var KEY_ESCAPE = 27;
var KEY_F1 = 112;
//...
var KEY_F12 = 123;

/** key need special handling - stop propagate? */
function isSpecialKey(which) {
	switch (which) {
	case KEY_BACKSPACE:
	case KEY_CTRL:
/*	case KEY_CAPSLOCK:
	case KEY_PAGEUP:
	case KEY_PAGEDOWN:
	case KEY_END:
	case KEY_HOME:
	case KEY_LEFT:
	case KEY_UP:
	case KEY_RIGHT:
	case KEY_DOWN:
	case KEY_INSERT:
	case KEY_DELETE:
	case KEY_NUMLOCK:
	case KEY_ENTER:
	case KEY_ESCAPE:
*/		return true;
	default:
		if (which>=KEY_F1 && which<=KEY_F12)
			return true;
		return false;
	}
}

var keyFiresTool = false;
var mousePageX, mousePageY;

/** register events for tool(s) */
function registerMouseEvents() {
	// capture document-wide key presses, including special keys
	$(document).keydown(function(ev) {
		if (ev.which==keyDown) {
			//console.log('ignore duplicate keydown for '+ev.which);
			ev.stopPropagation();
			return false;
		}
		keyDown = ev.which;
		// Note: this is not meant to be called multiple times when key is held down, but on Chrome
		// it is being, so that will need some filtering
		//console.log('keydown: '+ev.which+' ctrlKey='+ev.ctrlKey+' special='+isSpecialKey(ev.which));
		console.log('keydown: '+ev.which+' at '+ev.pageX+','+ev.pageY+' on '+ev.target+' ('+$(ev.target).attr('id')+') = '+(ev.pageX-pageOffsetLeft(ev.target))+','+(ev.pageY-pageOffsetTop(ev.target)));
		
		if (keyFiresTool)
			toolUp(ev);
		
		// change tool?
		if (ev.target.tagName && (ev.target.tagName=='TEXTAREA' || ev.target.tagName=='INPUT')) {
			// no
		} else {
			if (ev.which=='Q'.charCodeAt(0))
				handleActionSelected('selectAction');
			else if (ev.which=='V'.charCodeAt(0))
				handleActionSelected('showAllAction');
			else if (ev.which=='Z'.charCodeAt(0))
				handleActionSelected('zoomInAction');
			else if (ev.which=='X'.charCodeAt(0))
				handleActionSelected('zoomOutAction');
			else if (ev.which=='C'.charCodeAt(0))
				handleActionSelected('panAction');
			else if (ev.which=='W'.charCodeAt(0))
				handleActionSelected('orderToBackAction');
			else if (ev.which=='A'.charCodeAt(0))
				handleActionSelected('addLineAction');
			else if (ev.which=='S'.charCodeAt(0))
				handleActionSelected('addTextAction');
			else if (ev.which=='F'.charCodeAt(0))
				handleActionSelected('addFrameAction');
			else if (ev.which=='E'.charCodeAt(0)) {
				handleActionSelected('editAction');
				handleActionSelected('moveAction');
			}
			else if (ev.which=='D'.charCodeAt(0)) {
				handleActionSelected('copyAction');
				handleActionSelected('placeAction');
			}
			else if (ev.which==KEY_DELETE)
				handleActionSelected('deleteAction');
			else if (ev.which==KEY_BACKSPACE)
				handleActionSelected('backAction');
			else
				console.log('key has no action: '+ev.which);
			// more?
		}
		// escape for orphan focus?
		if (ev.which==KEY_ESCAPE) {
			$('#orphanText').focus();
		}
		// stop, e.g. backspace and ctrl-... propagating to browser itself
		if (isSpecialKey(ev.which) || ev.ctrlKey) {
			if (ev.target.tagName && (ev.target.tagName=='TEXTAREA' || ev.target.tagName=='INPUT')) {
				if (ev.which==KEY_BACKSPACE || ev.which=='C'.charCodeAt(0) || ev.which=='V'.charCodeAt(0)) {
					console.log('textarea allowing special key down '+ev.which);
					return true;
				}
				//else
				//	console.log('textarea key '+ev.which+' target tagName = '+ev.target.tagName);

			}
			//else 
			//	console.log('key target tagName = '+ev.target.tagName);
			ev.stopPropagation();
			return false;
		}
	});
	$(document).keyup(function(ev) {
		keyDown = undefined;
		console.log('keyup: '+ev.which);

		if (keyFiresTool)
			toolUp(ev);

		// stop, e.g. backspace and ctrl-... propagating to browser itself
		if (isSpecialKey(ev.which) || ev.ctrlKey) {
			// except some things in text
			if (ev.target.tagName && (ev.target.tagName=='TEXTAREA' || ev.target.tagName=='INPUT')) {
				if (ev.which==KEY_BACKSPACE || ev.which=='C'.charCodeAt(0) || ev.which=='V'.charCodeAt(0)) {
					console.log('textarea allowing special key up '+ev.which);
					return true;
				}
			}
			ev.stopPropagation();
			return false;
		}
	});
	$(document).mousedown(function(ev) {
		// which: 1=left, 2=middle, 3=right
		mousePageX = ev.pageX; mousePageY = ev.pageY;
		console.log('mousedown: '+ev.which+' at '+ev.pageX+','+ev.pageY+' on '+ev.target+' ('+$(ev.target).attr('id')+') = '+(ev.pageX-pageOffsetLeft(ev.target))+','+(ev.pageY-pageOffsetTop(ev.target)));
		toolUp(ev);
		//keyTarget = ev.target;
		var p = getProject(ev.target);
		//var v = getView(keyTarget);
		if (p && p.view) {
			var v = p.view;			
			p.activate();
			//console.log('begin select tool');
			tool = getNewTool(p, v);
			toolView = v;
			toolProject = p;
			if (tool)
				tool.begin(view2project(toolView, ev.pageX, ev.pageY));
			redraw(paper);
		}
		//checkHighlight();
	});
	$(document).mousemove(function(ev) {
		//console.log('mousemove: '+ev.pageX+','+ev.pageY+' on '+ev.target+' = '+(ev.pageX-pageOffsetLeft(ev.target))+','+(ev.pageY-pageOffsetTop(ev.target)));
		if (ev.target.tagName=='CANVAS') {
			// Hmm, mousemove is happening several times a second even when I don't move (as of 30/4/2013)
			// suppress unless ACTUALLY moved...
			if (ev.pageX!==mousePageX || ev.pageY!==mousePageY) {
				console.log('blur orphan text on mousemove');
				$('#orphanText').blur();
			}
		}
		mousePageX = ev.pageX; mousePageY = ev.pageY;
		checkHighlight(ev);
		if (tool) {
			toolProject.activate();
			tool.move(view2project(toolView, ev.pageX, ev.pageY));
			//if (tool.highlights)
			redraw(paper);
		}
	});
	$(document).mouseup(function(ev) {
		//console.log('mouseup: '+ev.which+' on '+ev.target);
		mousePageX = ev.pageX; mousePageY = ev.pageY;
		toolUp(ev);
		checkHighlight(ev);
	});

}

//handle interface (page) resize - work-around for canvas sizing problem
function handleResize() {
	console.log('handle resize');
	for (var vi in paper.View._views) {
		var v = paper.View._views[vi];
		if (v.isVisible()) {
			console.log('canvas:resize to '+$(v._element).width()+","+$(v._element).height());
			// need to force a change or it does some weird partial rescaling
			v.viewSize = new paper.Size(1,1);
			v.viewSize = new paper.Size($(v._element).width(),$(v._element).height());
		}
	}
}

// handle tab change 
function handleTabChange() {
	// TODO
}

function getZoomForBounds(project, bounds) {
	if (!bounds) {
		console.log('showAll: bounds is null');
		return { zoom: 1, center: new paper.Point(0,0) };
	} else {
		var bw = bounds.width+MIN_SIZE;
		var bh = bounds.height+MIN_SIZE;
		var w = $(project.view._element).width();
		var h = $(project.view._element).height();
		var zoom = Math.min(MAX_ZOOM, w/bw, h/bh);
		console.log('showAll: bounds='+bw+','+bh+', canvas='+w+','+h+', zoom='+zoom+', bounds.center='+bounds.center);
		return { zoom: zoom, center: bounds.center };
	}

}

// scale view to show all of project
function getZoomAll(project) {
	// this doesn't seem to work at the moment with my indexProject
	//var bounds = project.activeLayer.bounds;
	var bounds = null;
	for (var ci in project.activeLayer.children) {
		var c = project.activeLayer.children[ci];
		var b = c.bounds;
		if (b) {
			if (bounds==null)
				bounds = b;
			else
				bounds = bounds.unite(b);
		}
	}
	return getZoomForBounds(project, bounds);
}
//scale view to show all of project
function showAll(project) {
	var all = getZoomAll(project);
	project.view.zoom = all.zoom;
	project.view.center = all.center;
}

/** title is first line of description, if specified */
function getObjectTitle(sketchId) {
	return sketchbook.sketches[sketchId].getTitle();
}

function getBounds(layer) {
	// layer.bounds doesn't seem to work with Groups
	if (layer.children.length==0)
		return null;
	var bounds = new paper.Rectangle(layer.bounds);
	for (var ci=0; ci<layer.children.length; ci++) {
		var c = layer.children[ci];
		var b = c.bounds;
		if (b) {
			bounds = bounds.unite(b);
		}
	}
	return bounds;
}

/** create sketch item from elements (sketch optional) */
function createIndexItemFromElements(sketch, elements, indexProject) {
	indexProject.activate();
	var backgroundGroups = [];
	if (sketch)
		backgroundGroups = refreshBackground(sketch);

	var items = elementsToPaperjs(elements, sketchbook, images);
	if (backgroundGroups.length>0) {
		items = backgroundGroups.concat(items);
	}
	// make a visual icon for the object comprising a group with box, scaled view and text label
	// (currently id)
	var children = [];
	if (items.length>0) {
		var group;
		group = new paper.Group(items);
		//var symbol = new paper.Symbol(group); //getCachedSymbol(indexProject, sketchId);
		//var symbolBounds = symbol.definition.bounds;
		// try just a group...
		var symbolBounds = getBounds(group);
	
		var scale = (symbolBounds) ? Math.min((INDEX_CELL_SIZE-INDEX_LABEL_HEIGHT-INDEX_CELL_MARGIN)/(symbolBounds.width+INDEX_CELL_MARGIN),
				(INDEX_CELL_SIZE-INDEX_LABEL_HEIGHT-INDEX_CELL_MARGIN)/(symbolBounds.height+INDEX_CELL_MARGIN)) : 1;
		var placed = group; //symbol.place();
		//console.log('symbolbounds='+symbolBounds+', placed bounds='+placed.bounds);
		placed.scale(scale);
		// naming this makes the Group creation explode :-(
		//placed.name = ''+sketchId;
		placed.translate(new paper.Point(INDEX_CELL_SIZE/2-placed.bounds.center.x, (INDEX_CELL_SIZE-INDEX_LABEL_HEIGHT)/2-placed.bounds.center.y));
		children.push(placed);
	}
	if (sketch) {
		var label = new paper.PointText(new paper.Point(INDEX_CELL_SIZE/2, INDEX_CELL_SIZE-INDEX_LABEL_HEIGHT+pt2px(LABEL_FONT_SIZE)));
		var title = getSketchTitle(sketch);
		label.content = title;
		label.paragraphStyle.justification = 'center';
		label.characterStyle = { fillColor: 'black', fontSize: LABEL_FONT_SIZE };
		children.push(label);
		var box = new paper.Path.Rectangle(new paper.Point(INDEX_CELL_MARGIN/2, INDEX_CELL_MARGIN/2),
				new paper.Point(INDEX_CELL_SIZE-INDEX_CELL_MARGIN/2, INDEX_CELL_SIZE-INDEX_LABEL_HEIGHT-INDEX_CELL_MARGIN/2));
		box.strokeColor = 'grey';
		children.push(box);
		var group = new paper.Group(children);
		return group;
	}
	else if (children.length>0){
		var group = new paper.Group(children);		
		return group;
	}
	else
		return new paper.Group();

}
/** create selection item from sequence items */
function createIndexItemFromSequenceItems(sequenceId, description, sequenceItems, indexProject) {
	indexProject.activate();

	var items = [];
	if (sequenceId) {
		if (!description)
			description = 'Sequence '+sequenceId+' (unnamed)';
		// bounds doesn't seem to work with just text
		var box = new paper.Path.Rectangle(new paper.Point(0, -LABEL_FONT_SIZE), new paper.Point(0, 0));
		items.push(box);
		var title = new paper.PointText(0, 0);
		title.content = description;
		title.paragraphStyle.justification = 'left';
		title.characterStyle = { fillColor: 'gray', fontSize: TITLE_FONT_SIZE };
		items.push(title);
	}
	for (var ix=0; ix<sequenceItems.length; ix++) {
		var sitem = sequenceItems[ix];
		var text = getSequenceItemText(sitem);
		var y = LABEL_FONT_SIZE*4*(ix+1)/3;
		var box = new paper.Path.Rectangle(new paper.Point(0, y-LABEL_FONT_SIZE), new paper.Point(LABEL_FONT_SIZE, y));
		box.strokeColor = '#000000';
		box.fillColor = '#808080';
		items.push(box);
		var item = new paper.PointText(new paper.Point(LABEL_FONT_SIZE*4/3, y));
		item.content = text;
		item.paragraphStyle.justification = 'left';
		item.characterStyle = { fillColor: 'black', fontSize: LABEL_FONT_SIZE };
		items.push(item);
	}
	if (items.length>0) {
		var group;
		group = new paper.Group(items);
		var symbolBounds = getBounds(group);	
		var scale = (symbolBounds) ? Math.min((INDEX_CELL_SIZE-INDEX_LABEL_HEIGHT-INDEX_CELL_MARGIN)/(symbolBounds.width+INDEX_CELL_MARGIN),
				(INDEX_CELL_SIZE-INDEX_LABEL_HEIGHT-INDEX_CELL_MARGIN)/(symbolBounds.height+INDEX_CELL_MARGIN)) : 1;
		group.scale(scale);
		group.translate(new paper.Point(INDEX_CELL_SIZE/2-group.bounds.center.x, (INDEX_CELL_SIZE-INDEX_LABEL_HEIGHT)/2-group.bounds.center.y));
		return group;
	}
	else
		return new paper.Group();

}
/** make an index icon in current project for a symbol. 
 * @return Item (Group) representing object in index/selection
 */
function createIndexItem(sketchId, indexProject) {
	if (sketchbook.sketches[sketchId]) {
		var group = createIndexItemFromElements(sketchbook.sketches[sketchId], sketchbook.sketches[sketchId].elements, indexProject);
		// keep sketchId
		group.sketchId = sketchId;
		
		return group;
	}
	return new paper.Group();
}

function refreshBackgroundRecursive(sketch, stopSketchIds, alpha, groups) {
	if (sketch!=null && alpha>0) {
		stopSketchIds.push(sketch.id);
		if (sketch.background && sketch.background.alpha)
			alpha *= sketch.background.alpha;
		if (!sketch.background || !sketch.background.sketchId || alpha<=0)
			return;
		
		var sketchId = sketch.background.sketchId;
		if (stopSketchIds.indexOf(sketchId)>=0)
			// avoid loops etc.
			return;
		// draw
		sketch = sketchbook.sketches[sketchId];
		if (!sketch) {
			console.log('could not find background sketch '+sketchId);
			return;
		}
		// recurse
		refreshBackgroundRecursive(sketch, stopSketchIds, alpha, groups);
		
		var items = sketch.toPaperjs(sketchbook, images);
		if (items && items.length>0) {
			var group = new paper.Group(items);
			group.opacity = alpha;
			groups.push(group);
		}
	}
}

/** draw background(s) stack */
function refreshBackground(sketch) {
	var stopSketchIds = new Array();
	var alpha = 1;
	var groups = new Array();
	refreshBackgroundRecursive(sketch, stopSketchIds, alpha, groups);
	return groups;
}

/** update display(s) for changed sketch - complete regenerate for now */
function refreshSketchViews(sketchId) {
	if (showingIndex) {
		// rebuilds anyway... (no breadcrumb)
		showIndex(false);
		return;
	}
	if (currentSketch && currentSketch.id==sketchId) {
		objectDetailProject.activate();
		clearProject(objectDetailProject);
		objectDetailProject.layers[0].activate();
		refreshBackground(currentSketch);
		objectDetailProject.layers[1].activate();
		currentSketch.toPaperjs(sketchbook, images);

		objectOverviewProject.activate();
		clearProject(objectOverviewProject);
		objectOverviewProject.layers[0].activate();
		refreshBackground(currentSketch);
		objectOverviewProject.layers[1].activate();
		currentSketch.toPaperjs(sketchbook, images);	
		
		redraw(paper);
	}
}
function updateActionsForCurrentSketch() {
	// clear background
	if (currentSketch && currentSketch.background && currentSketch.background.sketchId)
		$('#clearBackgroundAction').removeClass('actionDisabled');
	else
		$('#clearBackgroundAction').addClass('actionDisabled');
}
function updateActionsForCurrentSelection() {
	if (breadcrumbs.length>1)
		$('#backAction').removeClass('actionDisabled');		
	else
		$('#backAction').addClass('actionDisabled');		
		
	// edit - one thing?!
	$('#editAction').addClass('actionDisabled');		
	if (currentSelections.length==1) {
		// sketch exists?			
		var cs = currentSelections[0];
		var sketchId = null;
		if (cs.record.selection.sketch && cs.record.selection.sketch.id) {
			// selected a (whole) sketch
			sketchId = cs.record.selection.sketch.id;
		}
		else if (cs.record.selection.elements && cs.record.selection.elements.length==1) {
			var el = cs.record.selection.elements[0];
			if (el.icon && el.icon.sketchId)
				// selected a link to a sketch
				sketchId = el.icon.sketchId;
		}
		else if (cs.record.selection.sequence && cs.record.selection.sequence.items && cs.record.selection.sequence.items.length==1) {
			var sitem = cs.record.selection.sequence.items[0];
			if (sitem.sketchRef && sitem.sketchRef.sketchId)
				sketchId = sitem.sketchRef.sketchId;
			else if (sitem.frameRef && sitem.frameRef.sketchId)
				// TODO frame within sketch?
				sketchId = sitem.frameRef.sketchId;
		}
		if (sketchId && sketchbook.sketches[sketchId] && (!currentSketch || currentSketch.id!==sketchId)) 
			// OK to edit
			$('#editAction').removeClass('actionDisabled');
	}
	// TODO move 
	$('#moveAction').addClass('actionDisabled');		
	// copy - any number of things?
	// TODO copy in seqeuences
	var canCopy = false;
	var canPlace = false;
	for (var ix=0; ix<currentSelections.length; ix++) {
		var cs = currentSelections[ix];
		if (showingSequences) {
			if (cs.record.selection.sequence)
				canPlace = true;
		}
		else if (showingIndex) {
			if (cs.record.selection.sketch)
				canCopy = true;
		}
		else if (cs.record.selection.sketch)
			canPlace = true;
		else if (cs.record.selection.elements) {
			// 'place' if frame on a differnt sketch
			if (currentSketch && currentSketch.id!==cs.record.selection.sketchId) {
				for (var ei=0; ei<cs.record.selection.elements.length; ei++) {
					var el = cs.record.selection.elements[ei];
					if (el.frame)
						canPlace = true;
					else 
						canCopy = true;
				}
			}
			else
				canCopy = true;
		}		
	}
	if (canCopy) {
		$('#copyAction').removeClass('actionDisabled');
		$('#placeAction').addClass('actionDisabled');
	}
	else {
		$('#copyAction').addClass('actionDisabled');		
		if (canPlace)
			$('#placeAction').removeClass('actionDisabled');
		else 
			$('#placeAction').addClass('actionDisabled');		
	}
	// delete
	var canDelete = false;
	for (var ix=0; ix<currentSelections.length; ix++) {
		var cs = currentSelections[ix];
		if (showingSequences) {
			if (cs.record.selection.sequence) {
				if (cs.record.selection.sequence.id)
					// real sequence
					canDelete = true;
				else if (cs.record.selection.sequenceId && cs.record.selection.sequence.items){
					for (var ix=0; ix<cs.record.selection.sequence.items.length; ix++) 
						if (cs.record.selection.sequence.items[ix].id)
							canDelete = true;
				}
			}
		}
		else if (showingIndex) {
			if (cs.record.selection.sketch)
				canDelete = true;
		}
		else {
			if (cs.record.selection.elements)
				canDelete = true;
		}
	}
	if (canDelete && canDeleteSelection)
		$('#deleteAction').removeClass('actionDisabled');
	else
		$('#deleteAction').addClass('actionDisabled');		
	// set background
	$('#setBackgroundAction').addClass('actionDisabled');
	if (currentSketch && currentSelections.length==1) {
		var cs = currentSelections[0];
		if (cs.record.selection.sketch && cs.record.selection.sketch.id) {
			var sketchId = cs.record.selection.sketch.id;
			if (sketchId!=currentSketch.id && (!currentSketch.background || sketchId!=currentSketch.background.sketchId)) {
				$('#setBackgroundAction').removeClass('actionDisabled');
			}
		}
	}
}

/** show editor for object ID */
function showEditor(sketchId, noBreadcrumb, elementId) {
	if (!noBreadcrumb && (!currentSketch || currentSketch.id!==sketchId)) {
		console.log('breadcrumb sketch '+sketchId);
		// TODO elementId?
		breadcrumbs.push(new Breadcrumb(BREADCRUMB_TYPE_SKETCH, sketchId));		
	}	
	else 
		console.log('no breadcrumb sketch '+sketchId+', currentSketch.id='+(currentSketch ? currentSketch.id : undefined)+', noBreadcrumb='+noBreadcrumb);
	
	handleTabChange();
	
	var tab = $('#tab_'+sketchId);

	currentSketch = sketchbook.sketches[sketchId];
	
	if (tab.size()==0) {
		// add tab
		var tabid = 'tab_'+sketchId;
		$('#tabs .footer').before('<div class="tab objecttab" id="'+tabid+'">'+currentSketch.getTitle()+'</div>');	
			
		var tabfn = function() {
			showEditor(sketchId);
		};
		$('#'+tabid).on('click', tabfn);
	}
	
	showingIndex = false;	
	showingSequences = false;
	canDeleteSelection = false;
	
	$('.tab').removeClass('tabselected');
	$('#tab_'+sketchId).addClass('tabselected');
	$('.tabview').hide();

	// update actions & properties
	$('.property').addClass('propertyDisabled');

	$('.action').addClass('actionDisabled');
	$('#showAllAction').removeClass('actionDisabled');
	$('#zoomInAction').removeClass('actionDisabled');
	$('#zoomOutAction').removeClass('actionDisabled');
	$('#panAction').removeClass('actionDisabled');
	$('#orderToBackAction').removeClass('actionDisabled');
	$('#selectAction').removeClass('actionDisabled');
	$('#addLineAction').removeClass('actionDisabled');
	$('#addCurveAction').removeClass('actionDisabled');
	$('#addTextAction').removeClass('actionDisabled');
	$('#addFrameAction').removeClass('actionDisabled');
	onActionSelected.call($('#selectAction'));

	updateActionsForCurrentSketch();
	updateActionsForCurrentSelection();
	updatePropertiesForCurrentSelection();
	updatePropertiesForCurrentSketch();

	// update editor state!
	currentSketch = sketchbook.sketches[sketchId];
	
	$('#objectTextArea').val(currentSketch.description);
	
	refreshSketchViews(currentSketch.id);
	
	$('#editor').show();		
	// scaling problem workaround
	handleResize();

	// NB set zoom/center after resize workaround
	var settings = editorSettings[sketchId];
	if (settings===undefined) {
		showAll(objectOverviewProject);
		showAll(objectDetailProject);

		settings = new Object();
		settings.overviewZoom = objectOverviewProject.view.zoom;
		settings.detailZoom = objectDetailProject.view.zoom;
		settings.overviewCenter = objectOverviewProject.view.center;
		settings.detailCenter = objectDetailProject.view.center;
		editorSettings[sketchId] = settings;

	}
	
	if (elementId) {		
		var element = currentSketch.getElementById(elementId);
		if (element && element.frame) {
			var zoom = getZoomForBounds(objectDetailProject, new paper.Rectangle(element.frame.x, element.frame.y, element.frame.width, element.frame.height));
			console.log('Zooming to element '+elementId);
			settings.detailZoom = objectDetailProject.view.zoom = zoom.zoom;
			settings.detailCenter = objectDetailProject.view.center = zoom.center;
		}
		else 
			console.log('could not find frame '+elementId+' to zoom');
	}
	
	objectDetailProject.view.zoom = settings.detailZoom;
	objectDetailProject.view.center = settings.detailCenter;
	objectOverviewProject.view.zoom = settings.overviewZoom;
	objectOverviewProject.view.center = settings.overviewCenter;
}

function moveHistory() {
	// move history along
	for (var ci in selectionProject.activeLayer.children) {
		var c = selectionProject.activeLayer.children[ci];
		c.translate(new paper.Point(INDEX_CELL_SIZE,0));
		console.log('moved '+ci+' '+c+' to '+c.position);
	}
}

/** clear current selection */
function clearCurrentSelection() {
	for (var si=0; si<currentSelections.length; si++) {
		var currentSelection = currentSelections[si];
		for (var ii=0; ii<currentSelection.items.length; ii++) {
			var item = currentSelection.items[ii];
			item.remove();
			console.log('removed selection for '+currentSelection.id);
		}
	}
	currentSelections = new Array();
	canDeleteSelection = true;
}

/** select - array of selections from select action */
function handleSelections(selections) {
	// selection may (currently) be sketch or element (with sketchId) or thing from selection history
	// add to selection history
	var newSelectionRecordIds = new Array();
	for (var si=0; si<selections.length; si++) {
		var selection = selections[si];
		if (selection.selectionRecordId) {
			console.log('Selection from selection history '+selection.selectionRecordId);
			newSelectionRecordIds.push(selection.selectionRecordId);
			canDeleteSelection = false;
		} else {
			moveHistory();
			// either sketch or elements
			var group = undefined;		
			if (selection.sketch) {
				group = createIndexItemFromElements(selection.sketch, selection.sketch.elements, selectionProject);
			} else if (selection.elements) {
				group = createIndexItemFromElements(undefined, selection.elements, selectionProject);
			} else if (selection.sequence) {
				group = createIndexItemFromSequenceItems(selection.sequence.id, selection.sequence.description, selection.sequence.items, selectionProject);
			}
			var selectionRecord = { id : nextSelectionRecordId++, selection : selection };
			group.selectionRecordId = selectionRecord.id;
			selectionRecords[selectionRecord.id] = selectionRecord;
			newSelectionRecordIds.push(selectionRecord.id);
			group.translate(new paper.Point(INDEX_CELL_SIZE/2-group.bounds.center.x, (INDEX_CELL_SIZE-INDEX_LABEL_HEIGHT)/2-group.bounds.center.y));
			selectionRecord.item = group;
		}
	}
	//selectionProject.view.zoom = 1;
	//selectionProject.view.center = new paper.Point($(selectionProject.view._element).width()/2, INDEX_CELL_SIZE/2);
	// remove old selection(s)
	clearCurrentSelection();
	// update current selection
	var showFrame = showingSequences;
	for (var si=0; si<newSelectionRecordIds.length; si++) {
		var id = newSelectionRecordIds[si];
		var selectionRecord = selectionRecords[id];
		if (!selectionRecord) {
			console.log('cannot find selection '+id);
			continue;
		}
		var currentSelection = { id: id, record: selectionRecord };
		currentSelections.push(currentSelection);
		// highlight current selection in selection history
		// addHighlight is from sketchertools.js
		currentSelection.items = [];
		var item = addHighlight(selectionProject, selectionRecord.item);
		item.strokeWidth = 3;
		item.strokeColor = '#808080';
		currentSelection.items.push(item);
		console.log('added history selection for '+currentSelection.id);
		// TODO highlght current selection in object projects and/or index projects??
		// if sequences view, first frame selection, show/zoom to...
		if (showFrame && selectionRecord.selection.sequence && selectionRecord.selection.sequence.items) {
			for (var ii=0; ii<selectionRecord.selection.sequence.items.length; ii++) {
				var sitem = selectionRecord.selection.sequence.items[ii];
				var sketchId = null;
				if (sitem.frameRef && sitem.frameRef.sketchId)
					sketchId = sitem.frameRef.sketchId;
				else if (sitem.sketchRef)
					sketchId = sitem.sketchRef.sketchId;
				if (showFrame && sketchId) {
					var sketch = sketchbook.sketches[sketchId];
					if (sketch) {
						sequencesViewProject.activate();
						showFrame = false; // only once
						var animateToAll = true;
						if (sketch!=currentSequencesSketch) {
							clearProject(sequencesViewProject);
							sequencesViewProject.layers[0].activate();
							refreshBackground(sketch);
							sequencesViewProject.layers[1].activate();
							currentSequencesSketch = sketch;
							currentSequencesSketch.toPaperjs(sketchbook, images);
							showAll(sequencesViewProject);
							animateToAll = false;
						}			
						// frame
						if (sitem.frameRef && sitem.frameRef.elementId) {
							var el = sketch.getElementById(sitem.frameRef.elementId);
							if (el && el.frame) { 
								var bounds = new paper.Rectangle(el.frame.x, el.frame.y, el.frame.width, el.frame.height);
								var w = $(sequencesViewProject.view._element).width();
								var h = $(sequencesViewProject.view._element).height();
								var zoom = Math.min(MAX_ZOOM, w/bounds.width, h/bounds.height);
								//console.log('showAll: bounds='+bw+','+bh+', canvas='+w+','+h+', zoom='+zoom+', bounds.center='+bounds.center);
								animateTo(sequencesViewProject, zoom, bounds.center);
								animateToAll = false;
								//sequencesViewProject.view.zoom = zoom;
								//sequencesViewProject.view.center = bounds.center;
								// zoom 
							}
						}
						if (animateToAll) {
							var all = getZoomAll(sequencesViewProject);
							animateTo(sequencesViewProject, all.zoom, all.center);
						}
					}
				}
			}
		}
	}
	updateActionsForCurrentSelection();
	if (currentSelections.length==0) {
		$('#propertiesShowSelection').addClass('propertiesShowDisabled');
		handlePropertiesShowSelected('propertiesShowNew');
	}
	else {
		$('#propertiesShowSelection').removeClass('propertiesShowDisabled');
		handlePropertiesShowSelected('propertiesShowSelection');		
	}
	updatePropertiesForCurrentSelection();
	redraw(paper);
}
//==============================================================================
// do/undo

function doAction(action) {
	sketchbook.doAction(action);
	undoActions.push(action);
	// handle
	if (action.type=='newSketch') {
		var sketch = action.sketch;
		var sketchId = sketch.id;

		showEditor(sketchId);
	}
	else if (action.type=='setSketchDescription') {
		var tabid = 'tab_'+action.sketchId;
		$('#'+tabid).html(action.description);
		// TODO fix other occurences, e.g. index, selection history
		
	}
	else if (action.type=='addElements') {
		//console.log('handle addElement '+action.element);
		refreshSketchViews(action.sketchId);
		// TODO select it?
	}
	else if (action.type=='setProperties' || action.type=='orderToBack') {
		var sketchIds = [];
		for (var ei=0; ei<action.elements.length; ei++) {
			var element = action.elements[ei];
			if (sketchIds.indexOf(element.sketchId)<0) {
				sketchIds.push(element.sketchId);
				refreshSketchViews(element.sketchId);			
			}
		}
	}
	else if (action.type=='setBackground') {
		console.log('done setBackground: background='+JSON.stringify(currentSketch.background)+', action='+JSON.stringify(action));
		refreshSketchViews(action.sketchId);
		updateActionsForCurrentSketch();
		updatePropertiesForCurrentSketch();
		updatePropertiesForCurrentSelection();
	}
	else if (action.type=='select') {
		//console.log('handle select '+JSON.stringify(action));
		// TODO
		handleSelections(action.selections);
	}
	else if (action.type=='delete') {
		var deletedCurrent = false;
		var sketchIds = [];
		for (var ei=0; ei<action.items.length; ei++) {
			var item = action.items[ei];
			if (item.sketchId) {
				if (sketchIds.indexOf(item.sketchId)<0) {
					sketchIds.push(item.sketchId);
					if (item.elementId)
						refreshSketchViews(item.sketchId);			
					else {
						// delete sketch itself
						if (currentSketch && currentSketch.id==item.sketchId)
							deletedCurrent = true;
						// tabs
						$('#tab_'+item.sketchId).remove();
					}
				}
			}
		}
		// refresh index
		if (deletedCurrent || showingIndex)
			showIndex(true);
		else {
			if (showingSequences)
				updateSequences2();
			updateActionsForCurrentSelection();
		}
	}
	else if (action.type=='newSequence') {
		if (showingSequences)
			updateSequences2();
	}
	else if (action.type=='addSequenceItems') {
		if (showingSequences)
			updateSequences2();
	}
}

/** load image into selection */
function loadImageAndSelect(url) {
	// select as callback/continuation (load may be delayed)
	var select = function(image) {
		// fake a select action for the image
		var element = { image: { url: image.url, x: 0, y: 0, width: image.info.width, height: image.info.height } };
		var selection = { elements: [ element ] };
		var action = new Action(this, 'select');
		action.selections = [ selection ];
		doAction(action);
	};
	withImage(url, select);
}


//===============================================================================
// GUI Entry points from sketcher2.html:
// - onNewObject()
// - onSave()
// - onShowIndex() - show index tab
// - onShowSequences() - show sequences tab
// - onObjectFilterChanges() - change to any of several object filter text fields

// GUI entry point
function onNewObject() {
	$('.tabview').hide();

	var action = sketchbook.newSketchAction();
	doAction(action);
}

//GUI entry point
function onNewSequence() {
	var title = takeOrphanText();
	if (title.length==0 && $('#copyAction').hasClass('actionSelected')) {
		for (var ix=0; ix<currentSelections.length; ix++) {
			var cs = currentSelections[ix];
			if (cs.record.sequence && cs.record.sequence.description) {
				title = 'Copy of '.cs.record.sequence.description;
				break;
			}
		}
	}
	var action = sketchbook.newSequenceAction(title);

	if ($('#copyAction').hasClass('actionSelected')) {
		var sequenceItems = getSelectedSequenceItems();
		action.addItems(sequenceItems);
	}
	doAction(action);
}

// GUI entry point
function onSave() {
	var jstate = sketchbook.marshall();
	var bb = new BlobBuilder();
	bb.append(JSON.stringify(jstate));
	var filename = $('#filenameText').val()+'.json';
	saveAs(bb.getBlob(), filename);
	// OK!
	console.log('saved sketchbook as '+filename);
	sketchbook.changed = false;
}

//GUI entry point
function onClearAll() {
	if (sketchbook.changed)
		onSave();
	
	clearAll();
}	

//GUI entry point
function onShowIndex() {
	showIndex();
}


function readChosenFile(mergeFlag) {
	if (!chosenFile)
		return;
	
	var f = chosenFile;
    console.log('read file: '+escape(f.name)+' ('+(f.type || 'n/a')+') - '+
                  f.size+' bytes, last modified: '+
                  (f.lastModifiedDate ? f.lastModifiedDate.toLocaleDateString() : 'n/a'));
    
    var name = f.name;
    // remove extension
    var ix = name.lastIndexOf('.');
    if (ix>0)
    	name = name.substr(0,ix);
    // remove (..) added by browser on save
    ix = name.lastIndexOf('(');
    if (ix>0)
    	name = name.substr(0,ix).trim();
    $('#filenameText').val(name);
    
    var reader = new FileReader();
    reader.onload = function(evt) {
        // Render thumbnail.
        console.log('file read: '+evt.target.result);
        var jstate = null;
        try {
        	jstate = JSON.parse(evt.target.result);
        	restoreState(jstate, mergeFlag);
        }
        catch (err) {
        	alert('Sorry, there was a problem reading that file - it is probably not a sketchbook');
        	console.log('error parsing JSON state: '+err.message);
        }
    };

    // Read in the file
    reader.readAsText(f);

}
// GUI entry
function onLoad() {
	if (sketchbook.changed)
		onSave();
	
	clearAll();
	
	readChosenFile(false);
}


// GUI entry
function onMerge() {
	readChosenFile(true);	
}

// GUI callback
var chosenFile;
function onChooseFile(evt) {

	/** save. 
	 * NB uses propsed/html5 FileSaver API, as supported by 
	 * https://github.com/eligrey/FileSaver.js https://github.com/eligrey/BlobBuilder.js
	 * see also http://eligrey.com/blog/post/saving-generated-files-on-the-client-side */

	if (window.File && window.FileReader && window.FileList && window.Blob) {
		// Great success! All the File APIs are supported.

	    var files = evt.target.files; // FileList object
		if (files.length==0) {
			console.log('no file specified');
			chosenFile = null;
			return;
		}
		chosenFile = files[0];
	}
	else
		console.log('sorry, file apis not supported');
}

// GUI entry point
function onShowSequences() {
	showSequences();
}

// GUI entry point 
function onObjectFilterChanges() {
	if (showingIndex) {
		console.log('onObjectFilterChanges');
		// reshow, no breadcrumb
		showIndex(true);
	}
	return false;
}
function onObjectFilterClear() {
	$('#indexFilterText').val('');
	onObjectFilterChanges();
}
function onObjectFilterTag(tag) {
	$('#indexFilterText').val(tag);
	onObjectFilterChanges();
}

// GUI Entry point
function onLoadImage(evt) {
	// note - uses html5 apis
	if (window.File && window.FileReader && window.FileList && window.Blob) {
		// Great success! All the File APIs are supported.

	    var files = evt.target.files; // FileList object
		if (files.length==0) {
			console.log('no image file specified');
			return;
		}
		var f = files[0];
	    console.log('read image file: '+escape(f.name)+' ('+(f.type || 'n/a')+') - '+
	                  f.size+' bytes, last modified: '+
	                  (f.lastModifiedDate ? f.lastModifiedDate.toLocaleDateString() : 'n/a'));
	    
	    var reader = new FileReader();
	    reader.onload = function(evt) {
	        //console.log('file read: '+evt.target.result);
	        loadImageAndSelect(evt.target.result);
	    };
	
	    // Read in the file
	    reader.readAsDataURL(f);
	}
	else
		console.log('sorry, file apis not supported');
}

// GUI Entry point
function onLoadImageFromURL() {
	var url = takeOrphanText();
	if (url.length==0) {
		alert('Enter URL in New Text first');
		return;
	}
	console.log('load image url '+url);
	loadImageAndSelect(url);
}

//GUI entry point
/** change to object text (description). Note this is kind of lazy, i.e. not each key press, 
 * but on loss of focus */
function onObjectTextChange() {
	//console.log('objectTextChange');
	var text = $('#objectTextArea').val();
	console.log('objectTextChange: '+text+' (current object '+currentSketch+')');
	if (currentSketch) {
		var action = sketchbook.setSketchDescriptionAction(currentSketch.id, text);
		doAction(action);
	}
}

function onSetProperty(action) {
	for (var i=0; i<currentSelections.length; i++) {
		var cs = currentSelections[i];
		if (cs.record.selection.elements) {
			for (var ei=0; ei<cs.record.selection.elements.length; ei++) {
				var el = cs.record.selection.elements[ei];
				action.addElement(cs.record.selection.sketchId, el.id);
			}
		}
	}
	console.log('setting properties on current selection');
	doAction(action);
}
// property editor entry point
function onSetLineColor(value) {
	var color = parseHexColor(value);
	if (!color)
		return;
	// TODO immediate action?
	// set color of currentSelection?
	if (propertiesShowSelection()) {
		var action = sketchbook.setPropertiesAction();
		action.setLineColor(color);
		onSetProperty(action);
	}
}
//property editor entry point
function onSetFillColor(value) {
	var color = parseHexColor(value);
	if (!color)
		return;
	// TODO immediate action?
	// set color of currentSelection?
	if (propertiesShowSelection()) {
		var action = sketchbook.setPropertiesAction();
		action.setFillColor(color);
		onSetProperty(action);
	}
}
//property editor entry point
function onSetTextColor(value) {
	var color = parseHexColor(value);
	if (!color)
		return;
	// TODO immediate action?
	// set color of currentSelection?
	if (propertiesShowSelection()) {
		var action = sketchbook.setPropertiesAction();
		action.setTextColor(color);
		onSetProperty(action);
	}
}
//property editor entry point
function onSetFrameStyle(value) {
	if (value===undefined || value===null)
		return;
	if (propertiesShowSelection()) {
		var action = sketchbook.setPropertiesAction();
		action.setFrameStyle(value);
		onSetProperty(action);
	}
}
function onSetLineWidth(value) {
	if (!value)
		return;
	if (propertiesShowSelection()) {
		var action = sketchbook.setPropertiesAction();
		action.setLineWidth(value);
		onSetProperty(action);
	}
}
function onSetTextSize(value) {
	if (!value)
		return;
	if (propertiesShowSelection()) {
		var action = sketchbook.setPropertiesAction();
		action.setTextSize(value);
		onSetProperty(action);
	}
}

function onSetText(value) {
	if (!value)
		return;
	if (propertiesShowSelection()) {
		var action = sketchbook.setPropertiesAction();
		action.setText(value);
		onSetProperty(action);
	}
}

function onAlphaSelected(event) {
	$('.alpha').removeClass('alphaSelected');
	$(this).addClass('alphaSelected');
	var color = $(this).css('background-color');
	console.log('Selected alpha '+color);
	// this does /255
	color = parseCssColor(color);
	if (!color)
		return;
	var alpha = 1-(color.red*255/256);
	if (currentSketch) {
		var background = (currentSketch.background) ? currentSketch.background : { };
		var action = sketchbook.setBackgroundAction(currentSketch.id, background.sketchId, alpha);
		doAction(action);
	}
}

//Only executed our code once the DOM is ready.
$(document).ready(function() {

	// trap close/exit
	jQuery(window).bind(
		    "beforeunload", 
		    function() { 
		    	if (sketchbook.changed)
		    		return "Discard changes and leave editor?";
		    	else
		    		return '';
		    }
		);
		
	sketchbook = new Sketchbook();

	// setup paperjs
	setupPaperjs();
	
	// register more GUI callbacks
	$('#loadFile').on('change', onChooseFile);
	$('#loadImage').on('change', onLoadImage);
	$('#objectTextArea').change(onObjectTextChange);
	
	$('.action').on('click', onActionSelected);
	$('.propertiesShow').on('click', onPropertiesShowSelected);
	//$('#colorProperty .option').on('click', onColorSelected);
	$('.alpha').on('click', onAlphaSelected);
	$(document).on('mousedown', '#sequences1Div .sequenceFrame', onSequenceFrameSelected);
	$(document).on('mousedown', '#sequences1Div .sequenceObject', onSequenceFrameSelected);
	$(document).on('mousedown', '#sequences2Div .sequenceSequence', onSequenceItemSelected);
	$(document).on('mousedown', '#sequences2Div .sequenceItem', onSequenceItemSelected);

	registerHighlightEvents();
	
	registerMouseEvents();
	
	propertyEditors.lineColor = new PropertySelect('lineColor', 'lineColorProperty');
	propertyEditors.lineColor.onSetValue = onSetLineColor;
	propertyEditors.textColor = new PropertySelect('textColor', 'textColorProperty');
	propertyEditors.textColor.onSetValue = onSetTextColor;
	propertyEditors.fillColor = new PropertySelect('fillColor', 'fillColorProperty');
	propertyEditors.fillColor.onSetValue = onSetFillColor;
	propertyEditors.lineWidth = new PropertySelect('lineWidth', 'lineWidthProperty');
	propertyEditors.lineWidth.onSetValue = onSetLineWidth;
	propertyEditors.textSize = new PropertySelect('textSize', 'textSizeProperty');
	propertyEditors.textSize.onSetValue = onSetTextSize;
	propertyEditors.text = new PropertyText('text', 'textProperty');
	propertyEditors.text.onSetValue = onSetText;
	propertyEditors.frameStyle = new PropertySelect('frameStyle', 'frameStyleProperty');
	propertyEditors.frameStyle.onSetValue = onSetFrameStyle;

	onShowIndex();
	
    $(window).resize(handleResize);
    handleResize();

});
