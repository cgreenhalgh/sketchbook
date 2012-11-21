// sketcher2.js

// global state
// Sketchbook
var sketchbook;
// current (editor) sketch
var currentSketch;

// showing index?
var showingIndex;

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

// current (active) tool-related state
var tool;
var toolView;
var toolProject;

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
function onActionSelected(event) {
	var disabled = $(this).hasClass('actionDisabled');
	if (disabled)
		return false;
	var id = $(this).attr('id');
	$('.action').removeClass('actionSelected');
	$(this).addClass('actionSelected');
	// TODO immediate action?
	console.log('Selected action '+id);
	if ('addLineAction'==id) {
		$('#colorProperty').removeClass('propertyDisabled');
	} else {
		$('#colorProperty').addClass('propertyDisabled');		
	}
}

//GUI entry point
function showIndex() {
	// update tab classes
	$('.tab').removeClass('tabselected');
	$('#tabIndex').addClass('tabselected');
	$('.tabview').hide();
	$('#index').show();
	currentSketch = undefined;
	
	// update actions & properties
	$('.property').addClass('propertyDisabled');

	$('.action').addClass('actionDisabled');
	$('#selectAction').removeClass('actionDisabled');
	$('#showAllAction').removeClass('actionDisabled');
	$('#zoomInAction').removeClass('actionDisabled');
	$('#zoomOutAction').removeClass('actionDisabled');
	onActionSelected.call($('#selectAction'));

	
	var max = 0;
	var x = 0;
	var y = 0;
	
	indexProject.layers[0].activate();
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
	
	showingIndex = true;	
	showAll(indexProject);
}

// unmarshall and update interface, e.g. from onLoad
function restoreState(jstate) {
	sketchbook.unmarshall(jstate);
	// TODO
	showIndex();
}

// setup one canvas/project. Return project
function setupCanvas(canvasId) {
	var canvas = document.getElementById(canvasId);
	paper.setup(canvas);
	var project = paper.project;
	// extra layer for highlights
	new paper.Layer();
	project.layers[0].activate();
	return project;
}

// setup paper js (one-time)
function setupPaperjs() {
	paper.setup();

	indexProject = setupCanvas('indexCanvas');
	objectOverviewProject = setupCanvas('objectOverviewCanvas');	
	objectDetailProject = setupCanvas('objectDetailCanvas');
	selectionProject = setupCanvas('selectionCanvas');
	sequences1Project = setupCanvas('sequences1Canvas');
	sequences2Project = setupCanvas('sequences2Canvas');
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
	$(document).on('mouseover', 'div .color', function() {
		$(this).addClass('colorHighlight');
	});
	$(document).on('mouseout', 'div .color', function() {
		$(this).removeClass('colorHighlight');
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

/** get new/current tool */
function getNewTool(project, view) {
	if ($('#addLineAction').hasClass('actionSelected')) {
		if (currentSketch && currentSketch.id)
			return new LineTool(project, sketchbook, currentSketch.id);
	}
	else if ($('#showAllAction').hasClass('actionSelected')) {
		return new ShowAllTool(project);
	}
	else if ($('#zoomInAction').hasClass('actionSelected')) {
		return new ZoomTool(project, true);
	}
	else if ($('#zoomOutAction').hasClass('actionSelected')) {
		return new ZoomTool(project, false);
	}
	else {
		console.log('current active tool unsupported: '+$('.actionSelected').attr('id'));
		return new Tool('unknown', project);
	}
}

/** register events for tool(s) */
function registerMouseEvents() {
	$(document).mousedown(function(ev) {
		// which: 1=left, 2=middle, 3=right
		//console.log('mousedown: '+ev.which+' at '+ev.pageX+','+ev.pageY+' on '+ev.target+' ('+$(ev.target).attr('id')+') = '+(ev.pageX-pageOffsetLeft(ev.target))+','+(ev.pageY-pageOffsetTop(ev.target)));
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
				tool.begin(view2project(toolView, ev.pageX, ev.pageY), v);
			redraw(paper);
		}
		//checkHighlight();
	});
	$(document).mousemove(function(ev) {
		//console.log('mousemove: '+ev.pageX+','+ev.pageY+' on '+ev.target+' = '+(ev.pageX-pageOffsetLeft(ev.target))+','+(ev.pageY-pageOffsetTop(ev.target)));
		if (tool) {
			toolProject.activate();
			tool.move(view2project(toolView, ev.pageX, ev.pageY));
			//if (tool.highlights)
			//	checkHighlight();
			redraw(paper);
		}
		else {
			//checkHighlight();
		}
	});
	$(document).mouseup(function(ev) {
		//console.log('mouseup: '+ev.which+' on '+ev.target);
		toolUp(ev);
		//checkHighlight();
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

	var items = new Array();
	if (sketchbook.sketches[sketchId])
		items = sketchbook.sketches[sketchId].toPaperjs();
	var symbol = new paper.Symbol(new paper.Group(items)); //getCachedSymbol(indexProject, sketchId);
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

/** update display(s) for changed sketch - complete regenerate for now */
function refreshSketchViews(sketchId) {
	if (showingIndex) {
		// rebuilds anyway...
		showIndex();
		return;
	}
	if (currentSketch && currentSketch.id==sketchId) {
		objectDetailProject.activate();
		objectDetailProject.layers[0].removeChildren();
		objectDetailProject.layers[0].activate();
		currentSketch.toPaperjs();

		objectOverviewProject.activate();
		objectOverviewProject.layers[0].removeChildren();
		objectOverviewProject.layers[0].activate();
		currentSketch.toPaperjs();	
		
		redraw(paper);
	}
}

/** show editor for object ID */
function showEditor(sketchId) {
	
	handleTabChange();
	showingIndex = false;	
	
	$('.tab').removeClass('tabselected');
	$('#tab_'+sketchId).addClass('tabselected');
	$('.tabview').hide();

	// update actions & properties
	$('.property').addClass('propertyDisabled');

	$('.action').addClass('actionDisabled');
	$('#showAllAction').removeClass('actionDisabled');
	$('#zoomInAction').removeClass('actionDisabled');
	$('#zoomOutAction').removeClass('actionDisabled');
	$('#selectAction').removeClass('actionDisabled');
	$('#addLineAction').removeClass('actionDisabled');
	//$('#addTextAction').removeClass('actionDisabled');
	//$('#addFrameAction').removeClass('actionDisabled');
	onActionSelected.call($('#selectAction'));
	// TODO check other actions

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
	else if (action.type=='addElement') {
		// TODO
		console.log('handle addElement '+action.element);
		refreshSketchViews(action.sketchId);
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

// GUI entry point
function onColorSelected(event) {
	$('.color').removeClass('colorSelected');
	$(this).addClass('colorSelected');
	var color = $(this).css('background-color');
	// TODO immediate action?
	console.log('Selected color '+color);
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
	
	$('.action').on('click', onActionSelected);
	$('.color').on('click', onColorSelected);
	
	registerHighlightEvents();
	
	registerMouseEvents();
	
	onShowIndex();
	
    $(window).resize(handleResize);
    handleResize();

});
