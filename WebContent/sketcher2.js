// sketcher2.js

// global state
// Sketchbook
var sketchbook;
// current (editor) sketch
var currentSketch;

// paperjs projects
// paperjs project for indexCanvas
var indexProject;
// paperjs project for object[sketch]OverviewCanvas
var objectOverviewProject;
//paperjs project for objectDetailCanvas
var objectDetailProject;
//paperjs project for selectionCanvas
var selectionProject;
//paperjs project for sequences1Canvas
var sequences1Project;
//paperjs project for sequences2Canvas
var sequences2Project;
//paperjs project for sequencesViewCanvas
var sequencesViewProject;

// per-sketch interface settings e.g. zoom/centre of drawing areas
var editorSettings = new Object();

var undoActions = new Array();
var redoActions = new Array();

//==============================================================================
// display constants

var INDEX_CELL_SIZE = 100;
var INDEX_CELL_MARGIN = 10;
var INDEX_LABEL_HEIGHT = 20;
var LABEL_FONT_SIZE = 12;
var MIN_SIZE = 10;
var MAX_ZOOM = 2;


//==============================================================================
// symbol (sketch) caches

//==============================================================================
// various internal functions

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

/** clear everything! */
function clearAll() {
	sketchbook = new Sketchbook();
	editorSettings = new Object();
	currentSketch = undefined;

	// remove all items
	clearProject(indexProject);
	clearProject(selectionProject);
	clearProject(objectDetailProject);
	clearProject(objectOverviewProject);

	// remove all extra tabs
	$('.objecttab').remove();
	
	// show index
	onShowIndex();
}

//GUI entry point
function showIndex() {
	// update tab classes
	$('.tab').removeClass('tabselected');
	$('#tabIndex').addClass('tabselected');
	$('.tabview').hide();
	$('#index').show();
	currentSketch = undefined;
	
	var max = 0;
	var x = 0;
	var y = 0;
	
	indexProject.activate();
	indexProject.activeLayer.removeChildren();
	
	for (var sid in sketchbook.sketches) {
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

// unmarshall and update interface, e.g. from onLoad
function restoreState(jstate) {
	sketchbook.unmarshall(jstate);
	// TODO
	showIndex();
}

// setup paper js (one-time)
function setupPaperjs() {
	paper.setup();

	var indexCanvas = document.getElementById('indexCanvas');
	paper.setup(indexCanvas);
	indexProject = paper.project;
	// extra layer for highlights
	new paper.Layer();
	indexProject.layers[0].activate();

	var objectOverviewCanvas = document.getElementById('objectOverviewCanvas');
	paper.setup(objectOverviewCanvas);
	objectOverviewProject = paper.project;
	
	var objectDetailCanvas = document.getElementById('objectDetailCanvas');
	paper.setup(objectDetailCanvas);
	objectDetailProject = paper.project;
	
	var selectionCanvas = document.getElementById('selectionCanvas');
	paper.setup(selectionCanvas);
	selectionProject = paper.project;
	
	var sequences1Canvas = document.getElementById('sequences1Canvas');
	paper.setup(sequences1Canvas);
	sequences1Project = paper.project;
	
	var sequences2Canvas = document.getElementById('sequences2Canvas');
	paper.setup(sequences2Canvas);
	sequences2Project = paper.project;

	var sequencesViewCanvas = document.getElementById('sequencesViewCanvas');
	paper.setup(sequencesViewCanvas);
	sequencesViewProject = paper.project;
}

// register mouse-related events
function registerHighlightEvents() {
	$(document).on('mouseover', 'div .tab', function() {
		$(this).addClass('tabhighlight');
	});
	$(document).on('mouseout', 'div .tab', function() {
		$(this).removeClass('tabhighlight');
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

// scale view to show all of project
function showAll(project) {
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
	if (bounds==null) {
		project.view.zoom = 1;
		project.view.center = new paper.Point(0,0);
		console.log('showAll: bounds is null');
	} else {
		var bw = bounds.width+MIN_SIZE;
		var bh = bounds.height+MIN_SIZE;
		var w = $(project.view._element).width();
		var h = $(project.view._element).height();
		var zoom = Math.min(MAX_ZOOM, w/bw, h/bh);
		console.log('showAll: bounds='+bw+','+bh+', canvas='+w+','+h+', zoom='+zoom+', bounds.center='+bounds.center);
		project.view.zoom = zoom;
		project.view.center = bounds.center;
	}
}
/** title is first line of description, if specified */
function getObjectTitle(sketchId) {
	return sketchbook.sketches[sketchId].getTitle();
}
/** make an index icon in current project for a symbol. 
 * @return Item (Group) representing object in index/selection
 */
function createIndexItem(sketchId, indexProject) {
	// make a visual icon for the object comprising a group with box, scaled view and text label
	// (currently id)
	indexProject.activate();
		
	var symbol = new paper.Symbol(new paper.Group()); //getCachedSymbol(indexProject, sketchId);
	var symbolBounds = symbol.definition.bounds;

	var scale = (symbolBounds) ? Math.min((INDEX_CELL_SIZE-INDEX_LABEL_HEIGHT-INDEX_CELL_MARGIN)/(symbolBounds.width+INDEX_CELL_MARGIN),
			(INDEX_CELL_SIZE-INDEX_LABEL_HEIGHT-INDEX_CELL_MARGIN)/(symbolBounds.height+INDEX_CELL_MARGIN)) : 1;
	var placed = symbol.place();
	//console.log('symbolbounds='+symbolBounds+', placed bounds='+placed.bounds);
	placed.scale(scale);
	// naming this makes the Group creation explode :-(
	//placed.name = ''+sketchId;
	var id = new paper.PointText(new paper.Point());
	id.content = sketchId;
	id.visible = false;
	placed.translate(new paper.Point(INDEX_CELL_SIZE/2-placed.bounds.center.x, (INDEX_CELL_SIZE-INDEX_LABEL_HEIGHT)/2-placed.bounds.center.y));
	var label = new paper.PointText(new paper.Point(INDEX_CELL_SIZE/2, INDEX_CELL_SIZE-INDEX_LABEL_HEIGHT+pt2px(LABEL_FONT_SIZE)));
	var title = getObjectTitle(sketchId);
	label.content = title;
	label.paragraphStyle.justification = 'center';
	label.characterStyle = { fillColor: 'black', fontSize: LABEL_FONT_SIZE };
	
	var box = new paper.Path.Rectangle(new paper.Point(INDEX_CELL_MARGIN/2, INDEX_CELL_MARGIN/2),
			new paper.Point(INDEX_CELL_SIZE-INDEX_CELL_MARGIN/2, INDEX_CELL_SIZE-INDEX_LABEL_HEIGHT-INDEX_CELL_MARGIN/2));
	box.strokeColor = 'grey';		
	var group = new paper.Group([placed, box, label, id]);

	return group;
}

/** show editor for object ID */
function showEditor(sketchId) {
	
	handleTabChange();
	
	$('.tab').removeClass('tabselected');
	$('#tab_'+sketchId).addClass('tabselected');
	$('.tabview').hide();

	// update editor state!
	currentSketch = sketchbook.sketches[sketchId];
	
	objectDetailProject.activate();
	// remove old
	objectDetailProject.activeLayer.removeChildren();
//	clearSymbolCache(objectDetailProject);
	
//	copyDefinition(objectSymbol, objectDetailProject);
	
	objectOverviewProject.activate();
	// remove old
	objectOverviewProject.activeLayer.removeChildren();
//	clearSymbolCache(objectOverviewProject);
	
//	copyDefinition(objectSymbol, objectOverviewProject);
	
	$('#objectTextArea').val(currentSketch.description);
	
	$('#editor').show();		
	// scaling problem workaround
	handleResize();

	// NB set zoom/center after resize workaround
	var settings = editorSettings[sketchId];
	if (settings===undefined) {
		settings = new Object();
		settings.overviewZoom = 1;
		settings.detailZoom = 1;
		settings.overviewCenter = new paper.Point(0,0);
		settings.detailCenter = new paper.Point(0,0);
		editorSettings[sketchId] = settings;
	}
	objectDetailProject.view.zoom = settings.detailZoom;
	objectDetailProject.view.center = settings.detailCenter;
	objectOverviewProject.view.zoom = settings.overviewZoom;
	objectOverviewProject.view.center = settings.overviewCenter;
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
	
		var tabid = 'tab_'+sketchId;
		$('#tabs .footer').before('<div class="tab objecttab" id="'+tabid+'">'+sketch.getTitle()+'</div>');	
			
		var tabfn = function() {
			showEditor(sketchId);
		};
		$('#'+tabid).on('click', tabfn);
		tabfn();
	}
	else if (action.type=='setSketchDescription') {
		var tabid = 'tab_'+action.sketchId;
		$('#'+tabid).html(action.description);
		// TODO fix other occurences, e.g. index, selection history
		
	}
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
function onShowIndex() {
	showIndex();
}

// GUI callback
function onLoad(evt) {

	if (sketchbook.changed)
		onSave();
	
	clearAll();
	
	/** save. 
	 * NB uses propsed/html5 FileSaver API, as supported by 
	 * https://github.com/eligrey/FileSaver.js https://github.com/eligrey/BlobBuilder.js
	 * see also http://eligrey.com/blog/post/saving-generated-files-on-the-client-side */

	if (window.File && window.FileReader && window.FileList && window.Blob) {
		// Great success! All the File APIs are supported.

	    var files = evt.target.files; // FileList object
		if (files.length==0) {
			console.log('no file specified');
			return;
		}
		var f = files[0];
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
	        }
	        catch (err) {
	        	console.log('error parsing JSON state: '+err.message);
	        }
        	restoreState(jstate);
	    };
	
	    // Read in the file
	    reader.readAsText(f);
	}
	else
		console.log('sorry, file apis not supported');
}

// GUI entry point
function onShowSequences() {
	// TODO
}

// GUI entry point 
function onObjectFilterChanges() {
	// TODO
}

// GUI Entry point
function onLoadImage() {
	// TODO
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

//Only executed our code once the DOM is ready.
$(document).ready(function() {

	sketchbook = new Sketchbook();

	// setup paperjs
	setupPaperjs();
	
	// register more GUI callbacks
	$('#loadFile').on('change', onLoad);
	$('#loadImage').on('change', onLoadImage);
	$('#objectTextArea').change(onObjectTextChange);
		
	registerHighlightEvents();
	
	onShowIndex();
	
    $(window).resize(handleResize);
    handleResize();

});
